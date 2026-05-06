export function detectLanguage() {
  const htmlLang = document.documentElement.lang;
  if (htmlLang) return htmlLang.toLowerCase();

  // Example: /fr/some/page.html → "fr"
  const [, maybeLang] = window.location.pathname.split('/');
  if (maybeLang && maybeLang.length === 2) {
    return maybeLang.toLowerCase();
  }
  return 'en';
}

const PLACEHOLDERS_CACHE_PREFIX = 'abbvie-placeholders';
const placeholderFetches = new Map();

function toClassName(value) {
  return `${value || ''}`
    .toLowerCase()
    .replace(/[^0-9a-z]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function toCamelCase(value) {
  return toClassName(value).replace(/-([a-z])/g, (match) => match[1].toUpperCase());
}

function getCacheKey(lang) {
  const normalizedLang = `${lang || 'default'}`.trim().toLowerCase() || 'default';
  return `${PLACEHOLDERS_CACHE_PREFIX}-${normalizedLang}`;
}

function getCachedPlaceholders(cacheKey) {
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (!cached) return null;

    const placeholders = JSON.parse(cached);
    if (
      placeholders
      && typeof placeholders === 'object'
      && !Array.isArray(placeholders)
    ) {
      return placeholders;
    }
  } catch {
    try {
      sessionStorage.removeItem(cacheKey);
    } catch {
      /* sessionStorage may be unavailable */
    }
  }

  return null;
}

function setCachedPlaceholders(cacheKey, placeholders) {
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(placeholders));
  } catch {
    /* sessionStorage may be full or unavailable */
  }
}

function getRowKey(row) {
  return row?.key ?? row?.Key ?? row?.name ?? row?.Name;
}

function getRowValue(row) {
  return row?.text ?? row?.Text ?? row?.value ?? row?.Value;
}

function addPlaceholder(placeholders, key, value) {
  const rawKey = `${key || ''}`.trim();
  if (!rawKey || value == null) return;

  placeholders[rawKey] = `${value}`;

  const camelKey = toCamelCase(rawKey);
  if (camelKey && !Object.prototype.hasOwnProperty.call(placeholders, camelKey)) {
    placeholders[camelKey] = `${value}`;
  }
}

function normalizePlaceholders(payload) {
  const data = payload?.data ?? payload;

  if (Array.isArray(data)) {
    return data.reduce((placeholders, row) => {
      addPlaceholder(placeholders, getRowKey(row), getRowValue(row));
      return placeholders;
    }, {});
  }

  if (data && typeof data === 'object') {
    return Object.entries(data).reduce((placeholders, [key, value]) => {
      addPlaceholder(placeholders, key, value);
      return placeholders;
    }, {});
  }

  return {};
}

/**
 * Load placeholder dictionary for a given language.
 * Defaults to the current page language when no lang is provided.
 * @param {string} [lang]
 * @returns {Promise<Record<string, string>>}
 */
export async function fetchPlaceholders(lang = detectLanguage()) {
  const cacheKey = getCacheKey(lang);
  const cached = getCachedPlaceholders(cacheKey);

  if (cached) {
    return cached;
  }

  if (!placeholderFetches.has(cacheKey)) {
    placeholderFetches.set(cacheKey, (async () => {
      const url = '/placeholders.json';
      const resp = await fetch(url, { cache: 'no-store' });
      if (!resp.ok) {
        return {};
      }

      const placeholders = normalizePlaceholders(await resp.json());
      setCachedPlaceholders(cacheKey, placeholders);

      return placeholders;
    })().catch(() => ({})).finally(() => {
      placeholderFetches.delete(cacheKey);
    }));
  }

  return placeholderFetches.get(cacheKey);
}
