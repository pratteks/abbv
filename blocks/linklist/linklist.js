import { getMetadata } from '../../scripts/aem.js';
import indexUtils from '../../scripts/index-utils.js';
import {
  moveInstrumentation,
  resolveImageReference,
} from '../../scripts/scripts.js';
import decorateExternalLinksUtility, {
  createIcon,
  extractIconSource,
  isAuthorEnvironment,
  isEditor,
  isUniversalEditor,
} from '../../scripts/utils.js';

const INDEX_CACHE_KEY = 'abbvie-index-data';
const TAGS_JSON_CACHE_KEY = 'abbvie-tags-json-lookup-v1';
let flatIndexCache = null;

/** In-memory tag id → title (from tags.json); mirrors sessionStorage cache. */
let tagsTitleLookup = null;
/** Single in-flight fetch for tags.json (deduped across blocks). */
let tagsTitleLookupPromise = null;

function parseBool(val, fallback = false) {
  const v = String(val ?? '').toLowerCase();
  if (v === 'true') return true;
  if (v === 'false') return false;
  return fallback;
}

function parseIntSafe(val, fallback) {
  const n = parseInt(String(val ?? '').trim(), 10);
  return Number.isFinite(n) ? n : fallback;
}

function isAuthor() {
  return isEditor() || isAuthorEnvironment();
}

function normalizePath(raw, rootPath = '') {
  if (!raw) return '';
  let p = String(raw).trim();
  try {
    if (p.startsWith('http')) p = new URL(p, window.location.origin).pathname;
  } catch (_e) {
    p = String(raw).trim();
  }
  if (rootPath) {
    const rp = rootPath.replace(/\/$/, '');
    if (p.startsWith(rp)) p = p.slice(rp.length) || '/';
  }
  p = p.replace(/\.html$/i, '').replace(/\/+$/, '');
  return p.startsWith('/') ? p : `/${p}` || '/';
}

function stripContentPrefix(p) {
  let out = p;
  let guard = 0;
  while (out.startsWith('/content/') && guard < 20) {
    out = out.replace(/^\/content\/[^/]+/, '') || '/';
    guard += 1;
  }
  return out.replace(/\/+$/, '') || '/';
}

function alignPath(raw, rootPath) {
  return stripContentPrefix(normalizePath(raw, rootPath));
}

function getFlatIndex() {
  if (flatIndexCache && flatIndexCache.length > 0) return flatIndexCache;
  try {
    const raw = sessionStorage.getItem(INDEX_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.data) && parsed.data.length > 0) {
        flatIndexCache = parsed.data;
        return flatIndexCache;
      }
      if (Array.isArray(parsed) && parsed.length > 0) {
        flatIndexCache = parsed;
        return flatIndexCache;
      }
    }
    const rawApiCache = sessionStorage.getItem(`${INDEX_CACHE_KEY}-raw`);
    if (rawApiCache) {
      const parsed = JSON.parse(rawApiCache);
      if (Array.isArray(parsed?.data) && parsed.data.length > 0) {
        flatIndexCache = parsed.data;
        return flatIndexCache;
      }
    }
    return [];
  } catch (_e) {
    return [];
  }
}

function getTagsJsonFetchUrl() {
  if (isUniversalEditor()) {
    let currentPath = window.location.pathname;
    if (currentPath.endsWith('.html')) {
      currentPath = currentPath.substring(0, currentPath.length - 5);
    }
    return `${currentPath}.resource/tags.json`;
  }
  const base = window.hlx?.codeBasePath ?? '';
  let url = `${base}/tags.json`.replace(/\/{2,}/g, '/');
  if (!url.startsWith('/')) url = `/${url}`;
  return url;
}

function parseStoredTagLookup(raw) {
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object') return null;
    const exact = new Map();
    const lower = new Map();
    Object.entries(obj).forEach(([k, v]) => {
      if (!k || v == null || v === '') return;
      const title = String(v).trim();
      const id = String(k).trim();
      if (!id || !title) return;
      exact.set(id, title);
      lower.set(id.toLowerCase(), title);
    });
    if (!exact.size) return null;
    return { exact, lower };
  } catch (_e) {
    return null;
  }
}

function saveTagLookupToSession(exactMap) {
  try {
    sessionStorage.setItem(
      TAGS_JSON_CACHE_KEY,
      JSON.stringify(Object.fromEntries(exactMap)),
    );
  } catch (_e) {
    /* sessionStorage full or disabled */
  }
}

function buildTagTitleResolver(payload) {
  const exact = new Map();
  const lower = new Map();
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  rows.forEach((row) => {
    const id = row?.tag ?? row?.id;
    const title = row?.title ?? row?.name;
    if (id == null || title == null) return;
    const idStr = String(id).trim();
    const titleStr = String(title).trim();
    if (!idStr || !titleStr) return;
    exact.set(idStr, titleStr);
    lower.set(idStr.toLowerCase(), titleStr);
  });
  return { exact, lower };
}

function resolveTagTitle(tagId, lookup) {
  if (!lookup) return '';
  const t = String(tagId ?? '').trim();
  if (!t) return '';
  return (
    lookup.exact.get(t)
    || lookup.lower.get(t.toLowerCase())
    || ''
  );
}

/**
 * Loads tags.json (same shape as /tags.json on aem.page), caches in sessionStorage,
 * and returns a lookup for tag id → display title.
 */
async function getTagsTitleLookup() {
  if (tagsTitleLookup?.exact?.size) return tagsTitleLookup;

  try {
    const cached = sessionStorage.getItem(TAGS_JSON_CACHE_KEY);
    if (cached) {
      const parsed = parseStoredTagLookup(cached);
      if (parsed) {
        tagsTitleLookup = parsed;
        return tagsTitleLookup;
      }
    }
  } catch (_e) {
    /* ignore */
  }

  if (!tagsTitleLookupPromise) {
    tagsTitleLookupPromise = (async () => {
      const url = getTagsJsonFetchUrl();
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) {
        throw new Error(`tags.json HTTP ${res.status}`);
      }
      const json = await res.json();
      const lookup = buildTagTitleResolver(json);
      if (lookup.exact.size > 0) {
        tagsTitleLookup = lookup;
        saveTagLookupToSession(lookup.exact);
      }
      return lookup;
    })().finally(() => {
      tagsTitleLookupPromise = null;
    });
  }

  const inflight = tagsTitleLookupPromise;
  if (inflight) {
    try {
      const fetched = await inflight;
      if (fetched?.exact?.size) return fetched;
    } catch (_e) {
      /* fall through — titles will use heuristic labels */
    }
  }

  return tagsTitleLookup || { exact: new Map(), lower: new Map() };
}

function indexPath(page) {
  return String(
    page.path ?? page.Path ?? page.url ?? page.URL ?? page.pathname ?? '',
  ).trim();
}

function isHidden(page) {
  return (
    String(
      page.hidefromnavigation ?? page.hideFromNavigation ?? '',
    ).toLowerCase() === 'true'
  );
}

function toMs(val) {
  if (val === null || val === undefined || val === '') return 0;
  const str = String(val).trim();
  const parsed = Date.parse(str);
  if (Number.isFinite(parsed)) return parsed;
  const num = Number(str);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return num < 10_000_000_000 ? num * 1000 : num;
}

function pageTimestamp(page) {
  const pub = page.publishDate
    || page.publicationDate
    || page.published
    || page.publishdate;
  const mod = page.lastModified
    || page.lastmodified
    || page['cq:lastModified']
    || page.lastmod;
  return {
    published: toMs(pub),
    modified: toMs(mod),
  };
}

function isDescendant(pagePath, parentPath, maxDepth) {
  if (!pagePath || !parentPath || parentPath === '/') return false;
  if (pagePath === parentPath) return false;
  const pageParts = pagePath.split('/').filter(Boolean);
  const parentParts = parentPath.split('/').filter(Boolean);
  if (pageParts.length <= parentParts.length) return false;
  const depth = pageParts.length - parentParts.length;
  if (depth > maxDepth) return false;
  return parentParts.every((part, i) => pageParts[i] === part);
}

function makeConfigCacheHelpers(block) {
  const aueResource = block.getAttribute('data-aue-resource') || '';
  const sessionKey = aueResource ? `linklist-cfg::${aueResource}` : null;

  const readSession = () => {
    if (!sessionKey) return null;
    try {
      const s = sessionStorage.getItem(sessionKey);
      return s ? JSON.parse(s) : null;
    } catch (_e) {
      return null;
    }
  };

  const readDataset = () => {
    if (!block.dataset.linklistConfig) return null;
    try {
      return JSON.parse(block.dataset.linklistConfig);
    } catch (_e) {
      return null;
    }
  };

  const deleteSession = () => {
    if (!sessionKey) return;
    try {
      sessionStorage.removeItem(sessionKey);
    } catch (_e) {
      // sessionStorage may throw when full
    }
  };

  const deleteDataset = () => {
    delete block.dataset.linklistConfig;
  };

  const deleteAll = () => {
    deleteSession();
    deleteDataset();
  };

  const writeAll = (cfg) => {
    const serialised = JSON.stringify(cfg);
    if (sessionKey) {
      try {
        sessionStorage.setItem(sessionKey, serialised);
      } catch (_e) {
        // sessionStorage may throw when full
      }
    }
    block.dataset.linklistConfig = serialised;
  };

  const getBest = () => {
    const s = readSession();
    const d = readDataset();
    if (s && s.linkSource && s.linkSource !== 'custom') return s;
    if (d && d.linkSource && d.linkSource !== 'custom') return d;
    return s || d || null;
  };

  return {
    readSession,
    readDataset,
    getBest,
    writeAll,
    deleteAll,
  };
}

function readParentConfig(block) {
  const { getBest, writeAll, deleteAll } = makeConfigCacheHelpers(block);

  const ueMode = !!block.querySelector(
    ':scope > div [data-aue-prop="linkSource"]',
  );

  const text = (name) => {
    if (ueMode) {
      return (
        [...block.querySelectorAll(`[data-aue-prop="${name}"]`)]
          .find((el) => !el.closest('[data-aue-prop="items"]'))
          ?.textContent?.trim() ?? ''
      );
    }
    return '';
  };

  const link = (name) => {
    if (ueMode) {
      const el = [...block.querySelectorAll(`[data-aue-prop="${name}"]`)].find(
        (e) => !e.closest('[data-aue-prop="items"]'),
      );
      return (
        el?.querySelector('a')?.getAttribute('href')
        || el?.textContent?.trim()
        || ''
      );
    }
    return '';
  };

  if (ueMode) {
    const rawLinkSource = text('linkSource');

    if (!rawLinkSource) {
      const cached = getBest();
      if (cached) {
        const freshEl = (name) => [...block.querySelectorAll(`[data-aue-prop="${name}"]`)].find(
          (e) => !e.closest('[data-aue-prop="items"]'),
        );
        const freshText = (name) => {
          const el = freshEl(name);
          return el != null ? el.textContent.trim() : null;
        };
        const ov = {};
        const ft = (k, v) => {
          if (v !== null) ov[k] = v;
        };
        ft('id', freshText('id'));
        ft('customClass', freshText('customClass'));
        ft('ariaLabel', freshText('ariaLabel'));
        const fv = freshText('variant');
        ft('variant', fv !== null ? fv || 'standard' : null);
        const fl = freshText('language');
        ft('language', fl !== null ? fl || 'lang:none' : null);

        const fpEl = freshEl('parentPage');
        if (fpEl !== null) {
          const fpVal = fpEl.querySelector('a')?.getAttribute('href')
            || fpEl.textContent.trim();
          ov.parentPage = fpVal;
        }

        const vChildDepth = freshText('childDepth');
        ft(
          'childDepth',
          vChildDepth !== null ? parseIntSafe(vChildDepth, 1) : null,
        );
        const vExclude = freshText('excludeCurrentPage');
        ft(
          'excludeCurrentPage',
          vExclude !== null ? parseBool(vExclude, true) : null,
        );
        const vEnableDesc = freshText('enableDescription');
        ft(
          'enableDescription',
          vEnableDesc !== null ? parseBool(vEnableDesc, false) : null,
        );
        const vEnableTags = freshText('enableTags');
        ft(
          'enableTags',
          vEnableTags !== null ? parseBool(vEnableTags, false) : null,
        );
        const vEnableSub = freshText('enableSubtitle');
        ft(
          'enableSubtitle',
          vEnableSub !== null ? parseBool(vEnableSub, false) : null,
        );
        const vEnableDate = freshText('enableDate');
        ft(
          'enableDate',
          vEnableDate !== null ? parseBool(vEnableDate, false) : null,
        );
        const vOrderBy = freshText('orderBy');
        ft('orderBy', vOrderBy !== null ? vOrderBy || 'content-tree' : null);
        const vSortOrder = freshText('sortOrder');
        ft('sortOrder', vSortOrder !== null ? vSortOrder || 'asc' : null);
        const vMaxItems = freshText('maxItems');
        ft('maxItems', vMaxItems !== null ? parseIntSafe(vMaxItems, 25) : null);
        const vLayout = freshText('layout');
        ft('layout', vLayout !== null ? vLayout || 'single-column' : null);
        const vFontIcon = freshText('fontIcon');
        ft('fontIcon', vFontIcon !== null ? vFontIcon : null);

        const merged = { ...cached, ...ov };
        if (!merged.parentPage) {
          deleteAll();
        } else {
          writeAll(merged);
        }
        return merged;
      }
    }

    const freshParentPage = link('parentPage') || text('parentPage');

    const cfg = {
      id: text('id'),
      customClass: text('customClass'),
      ariaLabel: text('ariaLabel'),
      variant: text('variant') || 'standard',
      linkSource: rawLinkSource || 'custom',
      language: text('language') || 'lang:none',
      parentPage: freshParentPage,
      childDepth: parseIntSafe(text('childDepth'), 1),
      excludeCurrentPage: parseBool(text('excludeCurrentPage'), true),
      enableDescription: parseBool(text('enableDescription'), false),
      enableTags: parseBool(text('enableTags'), false),
      enableSubtitle: parseBool(text('enableSubtitle'), false),
      enableDate: parseBool(text('enableDate'), false),
      orderBy: text('orderBy') || 'content-tree',
      sortOrder: text('sortOrder') || 'asc',
      maxItems: parseIntSafe(text('maxItems'), 25),
      layout: text('layout') || 'single-column',
      fontIcon: text('fontIcon') || '',
    };

    if (cfg.parentPage) {
      writeAll(cfg);
    } else {
      deleteAll();
    }
    return cfg;
  }

  // Non-UE: parent fields are sequential doc rows (0-15 props, 16 language, 17 ariaLabel).
  // Older blocks may omit row 17; getConfigRowCount() separates config rows from items.
  const rows = [...block.querySelectorAll(':scope > div')].filter(
    (r) => !r.classList.contains('linklist-item')
      && !r.dataset.aueResource?.includes('linklist-item')
      && !r.hasAttribute('data-aue-prop'),
  );
  const ct = (i) => rows[i]?.textContent?.trim() || '';
  const cl = (i) => rows[i]?.querySelector('a')?.getAttribute('href') || ct(i);

  const linkSourceFromRows = ct(3);
  if (!rows.length || !linkSourceFromRows) {
    const cached = getBest();
    if (cached) return cached;
  }

  const cfg = {
    id: ct(0),
    customClass: ct(1),
    variant: ct(2) || 'standard',
    linkSource: linkSourceFromRows || 'custom',
    parentPage: cl(4),
    childDepth: parseIntSafe(ct(5), 1),
    excludeCurrentPage: parseBool(ct(6), true),
    enableDescription: parseBool(ct(7), false),
    enableTags: parseBool(ct(8), false),
    enableSubtitle: parseBool(ct(9), false),
    enableDate: parseBool(ct(10), false),
    orderBy: ct(11) || 'content-tree',
    sortOrder: ct(12) || 'asc',
    maxItems: parseIntSafe(ct(13), 25),
    layout: ct(14) || 'single-column',
    fontIcon: ct(15) || '',
    language: ct(16) || 'lang:none',
    ariaLabel: ct(17) || '',
  };

  if (cfg.parentPage) {
    writeAll(cfg);
  } else {
    deleteAll();
  }
  return cfg;
}

/** Split author / UE strings that pack several tags (newlines, CSV, pipes). */
function expandDelimitedTagStrings(s) {
  const t = String(s ?? '').trim();
  if (!t) return [];
  return t
    .split(/\r\n|\n|\r|,|;|\|/g)
    .map((p) => p.trim())
    .filter((p) => p && p.toLowerCase() !== 'none');
}

/** Index / metadata keys that may carry taxonomy tags (merged for child pages). */
const TAG_PAGE_KEYS = [
  'cq-tags',
  'cq:tags',
  'cqTags',
  'tags',
  'tagNames',
  'categoryTags',
  'brandTags',
  'standardTags',
  'corporateTags',
  'contentTags',
  'xwalk:tags',
];

/** Prefer stable taxonomy ids (for tags.json lookup) over display titles. */
function flattenTagIds(val) {
  if (val == null || val === '') return [];
  if (Array.isArray(val)) {
    return val.flatMap((item) => flattenTagIds(item));
  }
  if (typeof val === 'object' && val !== null) {
    const id = val.tag ?? val.path ?? val.tagID ?? val.id ?? val['cq:tag'];
    if (id != null && String(id).trim()) return [String(id).trim()];
    const title = val.title ?? val.name ?? val.label ?? val.displayName;
    if (title != null && String(title).trim()) return [String(title).trim()];
    return [];
  }
  const s = String(val).trim();
  if (!s) return [];
  if ((s.startsWith('[') && s.endsWith(']')) || (s.startsWith('{') && s.endsWith('}'))) {
    try {
      const parsed = JSON.parse(s);
      return flattenTagIds(parsed);
    } catch (_e) {
      /* fall through */
    }
  }
  const pieces = expandDelimitedTagStrings(s);
  if (pieces.length > 1) {
    return pieces.flatMap((p) => flattenTagIds(p));
  }
  return pieces.length ? [pieces[0]] : [s];
}

function collectPageTagStrings(page) {
  const seen = new Set();
  const parts = [];
  TAG_PAGE_KEYS.forEach((key) => {
    flattenTagIds(page[key]).forEach((piece) => {
      const norm = piece.trim();
      if (!norm || norm.toLowerCase() === 'none') return;
      const dedupe = norm.toLowerCase();
      if (seen.has(dedupe)) return;
      seen.add(dedupe);
      parts.push(norm);
    });
  });
  return parts.join(',');
}

/**
 * Read all category tags from Universal Editor / XWalk markup: every
 * [data-aue-prop="categoryTags"], JSON arrays, data-* JSON, or one chip per child.
 */
function collectCategoryTagsFromDom(root) {
  if (!root) return null;
  const nodes = [...root.querySelectorAll('[data-aue-prop="categoryTags"]')];
  if (!nodes.length) return null;

  const out = [];
  const seen = new Set();

  const pushToken = (t) => {
    expandDelimitedTagStrings(String(t ?? '').trim()).forEach((piece) => {
      const p = piece.trim();
      if (!p || p.toLowerCase() === 'none') return;
      const k = p.toLowerCase();
      if (seen.has(k)) return;
      seen.add(k);
      out.push(p);
    });
  };

  nodes.forEach((el) => {
    const attr = el.getAttribute('data-value')
      ?? el.getAttribute('data-values')
      ?? el.getAttribute('data-tags');
    if (attr) {
      try {
        const parsed = JSON.parse(attr);
        if (Array.isArray(parsed)) {
          parsed.forEach((x) => pushToken(x));
          return;
        }
        if (parsed && typeof parsed === 'object') {
          const oid = parsed.tag ?? parsed.id ?? parsed.path ?? parsed['cq:tag'];
          if (oid) {
            pushToken(oid);
            return;
          }
        }
      } catch (_e) {
        pushToken(attr);
        return;
      }
    }

    const text = el.textContent?.trim() ?? '';
    if (text) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          parsed.forEach((x) => pushToken(x));
          return;
        }
        if (parsed && typeof parsed === 'object') {
          const id = parsed.tag ?? parsed.id ?? parsed.path ?? parsed['cq:tag'];
          if (id) {
            pushToken(id);
            return;
          }
        }
      } catch (_e) {
        /* not JSON */
      }
    }

    const childTexts = [...el.children]
      .map((c) => c.textContent?.trim())
      .filter(Boolean);
    if (childTexts.length > 1) {
      childTexts.forEach((c) => pushToken(c));
      return;
    }
    if (text) pushToken(text);
  });

  return out.length ? out.join(',') : null;
}

function readTagsFromCategoryRow(rowEl) {
  if (!rowEl) return '';
  const fromDom = collectCategoryTagsFromDom(rowEl);
  if (fromDom) return fromDom;
  const kids = [...rowEl.children].filter((c) => c.textContent?.trim());
  if (kids.length > 1) {
    const merged = kids.map((c) => c.textContent.trim()).filter(Boolean).join('\n');
    return merged.toLowerCase() === 'none' ? '' : merged;
  }
  const raw = rowEl.textContent?.trim() || '';
  return raw.toLowerCase() === 'none' ? '' : raw;
}

function readItemConfig(itemEl) {
  const imgPropEl = itemEl.querySelector('[data-aue-prop="imageIcon"]');
  // Only resolve when the prop is on a container (not the img itself).
  if (imgPropEl && imgPropEl.tagName?.toLowerCase() !== 'img') {
    resolveImageReference(imgPropEl);
  }

  // UE often omits data-aue-prop on selects/booleans/tags; read doc rows first,
  // then override from data-aue-prop where it exists. V2a = anchor in rows[2]
  // (no categoryTags row); V3/V2b = boolean at rows[2], link in rows[3].
  const rows = [...itemEl.querySelectorAll(':scope > div')];
  const ct = (i) => rows[i]?.textContent?.trim() || '';
  const cl = (i) => rows[i]?.querySelector('a')?.getAttribute('href') || ct(i);
  const ch = (i) => rows[i]?.innerHTML?.trim() || '';

  const isV2a = !!rows[2]?.querySelector('a');

  const isUrlShaped = (s) => {
    const t = String(s || '').trim();
    if (!t) return true;
    return t.startsWith('/') || /^https?:\/\//i.test(t) || t.startsWith('#');
  };
  const cleanLabel = (s) => (isUrlShaped(s) ? '' : String(s).trim());

  // Anchor to fontIcon (text field, always has data-aue-prop in UE, EDS row 9).
  // Any deviation from index 9 means extra rows exist in the UE rendering.
  // Returns 0 in pure EDS mode (no data-aue-prop present at all).
  const fontIconRowIdx = rows.findIndex(
    (r) => r.querySelector('[data-aue-prop="fontIcon"]') !== null,
  );
  const ueShift = fontIconRowIdx >= 0 ? fontIconRowIdx - 9 : 0;

  let docConfig;

  if (!isV2a) {
    const anchorEl = rows[3]?.querySelector('a');
    const resolvedLinkText = cleanLabel(anchorEl?.textContent)
      || cleanLabel(anchorEl?.getAttribute('title'))
      || '';

    const categoryTagsVal = readTagsFromCategoryRow(rows[7 + ueShift]);

    const imageIconSrc = extractIconSource(rows[10 + ueShift]);

    docConfig = {
      id: ct(0),
      customClass: ct(1),
      cookieConsentLink: parseBool(ct(2), false),
      link: cl(3),
      openInNewTab: parseBool(ct(4), false),
      linkText: resolvedLinkText,
      subtitle: ct(5 + ueShift),
      description: ch(6 + ueShift),
      categoryTags: categoryTagsVal,
      iconType: ct(8 + ueShift) || 'none',
      fontIcon: ct(9 + ueShift),
      imageIcon: imageIconSrc,
      iconPosition: ct(11 + ueShift) || 'before',
      iconLink: cl(12 + ueShift),
      enableConfirmationModal: parseBool(ct(13 + ueShift), false),
      confirmationModalType: ct(14 + ueShift) || 'standard',
      modalId: ct(15 + ueShift),
      language: ct(16 + ueShift) || 'lang:none',
      ariaLabel: ct(17 + ueShift),
    };
  } else {
    const anchorEl = rows[2]?.querySelector('a');
    const resolvedLinkText = cleanLabel(ct(5 + ueShift))
      || cleanLabel(anchorEl?.getAttribute('title'))
      || cleanLabel(anchorEl?.textContent)
      || '';
    const imageIconSrc = extractIconSource(rows[10 + ueShift]);

    docConfig = {
      id: ct(0),
      customClass: ct(1),
      cookieConsentLink: parseBool(ct(4), false),
      link: cl(2),
      openInNewTab: parseBool(ct(3), false),
      linkText: resolvedLinkText,
      subtitle: ct(6 + ueShift),
      description: ch(7 + ueShift),
      categoryTags: '',
      iconType: ct(8 + ueShift) || 'none',
      fontIcon: ct(9 + ueShift),
      imageIcon: imageIconSrc,
      iconPosition: ct(11 + ueShift) || 'before',
      iconLink: cl(12 + ueShift),
      enableConfirmationModal: parseBool(ct(13 + ueShift), false),
      confirmationModalType: ct(14 + ueShift) || 'standard',
      modalId: ct(15 + ueShift),
      language: ct(16 + ueShift) || 'lang:none',
      ariaLabel: ct(17 + ueShift),
    };
  }

  const ueText = (name) => {
    const el = itemEl.querySelector(`[data-aue-prop="${name}"]`);
    return el != null ? el.textContent.trim() : null;
  };
  const ueHref = (name) => {
    const el = itemEl.querySelector(`[data-aue-prop="${name}"]`);
    if (!el) return null;
    return el.querySelector('a')?.getAttribute('href') || el.textContent.trim();
  };
  const ueHtml = (name) => {
    const el = itemEl.querySelector(`[data-aue-prop="${name}"]`);
    return el != null ? el.innerHTML.trim() : null;
  };

  const readUeCategoryTags = () => collectCategoryTagsFromDom(itemEl);

  const id = ueText('id') ?? docConfig.id;
  const customClass = ueText('customClass') ?? docConfig.customClass;
  const ariaLabel = ueText('ariaLabel') ?? docConfig.ariaLabel;
  const subtitle = ueText('subtitle') ?? docConfig.subtitle;
  const description = ueHtml('description') ?? docConfig.description;

  const ueLinkTextEl = itemEl.querySelector('[data-aue-prop="linkText"]');
  const linkText = ueLinkTextEl
    ? cleanLabel(ueLinkTextEl.textContent) || docConfig.linkText
    : docConfig.linkText;

  const ueLinkAnchorEl = itemEl.querySelector('[data-aue-prop="link"]');
  const ueLinkHref = ueHref('link');
  const link = ueLinkHref
    ?? (ueLinkAnchorEl
      ? ueLinkAnchorEl.getAttribute('href')
        || ueLinkAnchorEl.closest('a')?.getAttribute('href')
        || docConfig.link
      : docConfig.link);

  // In UE, data-aue-prop="imageIcon" can sit directly on the <img> element inside
  // a <picture> (not on a wrapper), so '[data-aue-prop="imageIcon"] img' finds nothing.
  // Handle both cases: prop on the img itself, or prop on a container around the img.
  const ueImgProp = itemEl.querySelector('[data-aue-prop="imageIcon"]');
  const ueImageIcon = (ueImgProp?.tagName?.toLowerCase() === 'img'
    ? ueImgProp.getAttribute('src')
    : ueImgProp?.querySelector('img')?.getAttribute('src'))
    || ueHref('imageIcon') || null;
  const imageIcon = ueImageIcon || docConfig.imageIcon;

  const categoryTags = readUeCategoryTags() ?? docConfig.categoryTags;

  // In UE, linkText is a separate authored row which shifts all subsequent row indices
  // by +1. Fields below use data-aue-prop lookups to read the correct value regardless.
  const iconType = ueText('iconType') ?? docConfig.iconType;
  const fontIcon = ueText('fontIcon') ?? docConfig.fontIcon;
  const iconPosition = ueText('iconPosition') ?? docConfig.iconPosition;
  const iconLink = ueHref('iconLink') ?? docConfig.iconLink;
  const ueEnableModal = ueText('enableConfirmationModal');
  const enableConfirmationModal = ueEnableModal !== null
    ? parseBool(ueEnableModal, false)
    : docConfig.enableConfirmationModal;
  const confirmationModalType = ueText('confirmationModalType') ?? docConfig.confirmationModalType;
  const modalId = ueText('modalId') ?? docConfig.modalId;

  return {
    ...docConfig,
    id,
    customClass,
    link,
    linkText,
    subtitle,
    description,
    ariaLabel,
    imageIcon,
    categoryTags,
    iconType,
    fontIcon,
    iconPosition,
    iconLink,
    enableConfirmationModal,
    confirmationModalType,
    modalId,
  };
}

function isItemEl(el) {
  if (!el || el.nodeType !== 1) return false;
  return (
    el.classList.contains('linklist-item')
    || el.getAttribute('data-block-name') === 'linklist-item'
    || (el.getAttribute('data-aue-resource') || '').includes('linklist-item')
    || el.getAttribute('data-aue-model') === 'linklist-item'
  );
}

// Row 17 (ariaLabel) was added after launch; legacy blocks have 17 config rows.
// Row 17 with one inner div is still config; multiple inners means first item row.
function getConfigRowCount(block) {
  const allChildren = [...block.children].filter(
    (r) => !r.classList.contains('linklist-item')
      && !r.dataset.aueResource?.includes('linklist-item')
      && !r.hasAttribute('data-aue-prop'),
  );
  const row17 = allChildren[17];
  if (!row17) return 17;
  const innerDivCount = row17.querySelectorAll(':scope > div').length;
  return innerDivCount > 1 ? 17 : 18;
}

function collectItems(block) {
  const direct = [...block.children].filter(isItemEl);
  if (direct.length) return direct;

  const nested = [
    ...block.querySelectorAll(
      '.linklist-item, [data-block-name="linklist-item"], [data-aue-resource*="linklist-item"]',
    ),
  ];
  if (nested.length) return nested;

  const configRowCount = getConfigRowCount(block);

  return [...block.children].slice(configRowCount).filter((el) => {
    if (el.tagName !== 'DIV') return false;
    const innerDivs = [...el.querySelectorAll(':scope > div')];
    if (!innerDivs.length) return false;
    // Drop AEM "ghost" rows: require a link or path-shaped text at V2a/V3 columns.
    if (el.querySelector('a[href]')) return true;
    const div2 = innerDivs[2]?.textContent?.trim() || '';
    const div3 = innerDivs[3]?.textContent?.trim() || '';
    return (
      div2.startsWith('/')
      || div2.startsWith('http')
      || div3.startsWith('/')
      || div3.startsWith('http')
    );
  });
}

async function buildChildPageItems(cfg, rootPath) {
  const parentRaw = String(cfg.parentPage || '').trim();
  if (!parentRaw) return { items: [], reason: 'no-parent' };

  flatIndexCache = null;
  await indexUtils.getIndexData();
  let flat = getFlatIndex();

  if (!flat.length) {
    try {
      const resp = await fetch('/query-index-en.json');
      if (resp.ok) {
        const data = await resp.json();
        let rows = [];
        if (Array.isArray(data?.data)) rows = data.data;
        else if (Array.isArray(data)) rows = data;
        if (rows.length) {
          flat = rows;
          flatIndexCache = flat;
          try {
            sessionStorage.setItem(
              `${INDEX_CACHE_KEY}-raw`,
              JSON.stringify(data),
            );
          } catch (_e) {
            // sessionStorage may throw when full
          }
        }
      }
    } catch (_e) {
      // Index fetch is optional
    }
  }

  if (!flat.length) return { items: [], reason: 'no-index' };

  const parentAligned = alignPath(parentRaw, rootPath);
  const parentNorm = normalizePath(parentRaw, rootPath);
  let parentVariants = [
    ...new Set([parentAligned, parentNorm].filter(Boolean)),
  ];

  const depth = Math.max(1, Math.min(10, cfg.childDepth || 1));

  const anyDescendantOf = (variants) => flat.some((p) => {
    const ip = normalizePath(indexPath(p), rootPath);
    return variants.some((par) => isDescendant(ip, par, depth));
  });

  if (!anyDescendantOf(parentVariants)) {
    const longest = parentVariants.reduce(
      (a, b) => (a.length >= b.length ? a : b),
      '',
    );
    const parts = longest.split('/').filter(Boolean);
    for (let i = 1; i < parts.length; i += 1) {
      const candidate = `/${parts.slice(i).join('/')}`;
      if (anyDescendantOf([candidate])) {
        parentVariants = [candidate];
        break;
      }
    }
  }

  let currentVariants = [
    ...new Set(
      [
        alignPath(window.location.pathname, rootPath),
        normalizePath(window.location.pathname, rootPath),
      ].filter(Boolean),
    ),
  ];

  const currentInIndex = (variants) => flat.some((p) => {
    const ip = normalizePath(indexPath(p), rootPath);
    return variants.includes(ip);
  });

  if (!currentInIndex(currentVariants)) {
    const longest = currentVariants.reduce(
      (a, b) => (a.length >= b.length ? a : b),
      '',
    );
    const parts = longest.split('/').filter(Boolean);
    for (let i = 1; i < parts.length; i += 1) {
      const candidate = `/${parts.slice(i).join('/')}`;
      if (
        flat.some((p) => normalizePath(indexPath(p), rootPath) === candidate)
      ) {
        currentVariants = [candidate];
        break;
      }
    }
  }

  const qualifies = (page, ignoreHidden = false) => {
    const raw = indexPath(page);
    const variants = [
      ...new Set(
        [alignPath(raw, rootPath), normalizePath(raw, rootPath)].filter(
          Boolean,
        ),
      ),
    ];
    if (!variants.length) return false;
    if (parentVariants.some((p) => variants.includes(p))) return false;
    const underParent = parentVariants.some(
      (parent) => variants.some((v) => isDescendant(v, parent, depth)),
    );
    if (!underParent) return false;
    if (
      cfg.excludeCurrentPage
      && variants.some((v) => currentVariants.includes(v))
    ) return false;
    return ignoreHidden || !isHidden(page);
  };

  let matches = flat.filter((p) => qualifies(p, false));

  const pathOf = (p) => normalizePath(indexPath(p), rootPath);

  const MINOR_WORDS = new Set([
    'a',
    'an',
    'the',
    'and',
    'but',
    'or',
    'nor',
    'for',
    'so',
    'yet',
    'at',
    'by',
    'in',
    'of',
    'on',
    'to',
    'up',
    'as',
    'vs',
  ]);

  function slugToTitle(slug) {
    if (!slug) return '';
    const segment = slug.split('/').filter(Boolean).pop() || slug;
    const words = segment.replace(/[-_]+/g, ' ').trim().split(/\s+/);
    return words
      .map((word, idx) => {
        const lower = word.toLowerCase();
        if (idx === 0 || !MINOR_WORDS.has(lower)) {
          return lower.charAt(0).toUpperCase() + lower.slice(1);
        }
        return lower;
      })
      .join(' ');
  }

  const titleOf = (p) => {
    const fromIndex = String((p.title || p.Title || '').split('|')[0].trim());
    return fromIndex || slugToTitle(pathOf(p));
  };

  const orderBy = String(cfg.orderBy || 'content-tree')
    .toLowerCase()
    .replace(/\s+/g, '-');
  const desc = String(cfg.sortOrder || 'asc').toLowerCase() === 'desc';

  matches.sort((a, b) => {
    let cmp = 0;
    if (orderBy === 'title') {
      cmp = titleOf(a).localeCompare(titleOf(b), undefined, {
        sensitivity: 'base',
      });
    } else if (orderBy === 'last-modified') {
      cmp = pageTimestamp(a).modified - pageTimestamp(b).modified;
    } else if (orderBy === 'published') {
      cmp = pageTimestamp(a).published - pageTimestamp(b).published;
    } else {
      cmp = pathOf(a).localeCompare(pathOf(b));
    }
    return desc ? -cmp : cmp;
  });

  const max = Math.max(1, Math.min(500, cfg.maxItems || 25));
  matches = matches.slice(0, max);

  if (!matches.length) {
    const hiddenCount = flat.filter((p) => qualifies(p, true)).length;
    return {
      items: [],
      reason: hiddenCount > 0 ? 'all-hidden' : 'no-matches',
      debug: {
        parentRaw,
        parentVariants,
        rootPath,
        indexCount: flat.length,
        depth,
        hiddenCount,
        samplePaths: flat.slice(0, 10).map(indexPath).filter(Boolean),
      },
    };
  }

  const pickDateMs = (ts) => ts.published || ts.modified;

  const formatDate = (ms) => new Date(ms).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const items = matches.map((page) => {
    const path = pathOf(page);
    const ts = pageTimestamp(page);
    const dateMs = cfg.enableDate ? pickDateMs(ts) : 0;
    return {
      id: '',
      customClass: '',
      link: path,
      openInNewTab: false,
      cookieConsentLink: false,
      linkText: titleOf(page),
      subtitle: cfg.enableSubtitle
        ? String(page.subtitle || page.subTitle || page.eyebrow || '')
        : '',
      description: (() => {
        if (!cfg.enableDescription || !page.description) return '';
        const escaped = String(page.description)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        return `<p>${escaped}</p>`;
      })(),
      categoryTags: cfg.enableTags ? collectPageTagStrings(page) : '',
      iconType: 'none',
      fontIcon: '',
      imageIcon: '',
      iconPosition: 'before',
      iconLink: '',
      enableConfirmationModal: false,
      confirmationModalType: 'standard',
      modalId: '',
      language: 'lang:none',
      ariaLabel: '',
      dateText: dateMs ? formatDate(dateMs) : '',
      dateIso: dateMs ? new Date(dateMs).toISOString() : '',
    };
  });

  return { items, reason: null };
}

function tagIdToDisplayLabel(rawId) {
  const trimmed = String(rawId || '').trim();
  if (!trimmed) return '';

  let stripped = trimmed;
  if (stripped.includes('/')) {
    stripped = stripped.split('/').pop() || stripped;
  }
  if (stripped.includes(':')) {
    const colonIdx = stripped.indexOf(':');
    const afterColon = stripped.slice(colonIdx + 1);
    stripped = (afterColon || stripped.slice(0, colonIdx)).trim();
  }

  const spaced = stripped.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  if (!spaced) return '';

  return spaced.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function buildTags(rawTags, tagLookup) {
  let tokens = [];
  if (Array.isArray(rawTags)) {
    tokens = rawTags.flatMap((x) => flattenTagIds(x));
  } else {
    tokens = flattenTagIds(rawTags);
  }
  if (!tokens.length && rawTags != null && rawTags !== '') {
    tokens = String(rawTags)
      .split(/[,;\n\r|]+/)
      .map((t) => t.trim())
      .filter(Boolean);
  }

  if (!tokens.length) return null;

  const labels = [];
  const seenIds = new Set();
  tokens.forEach((rawId) => {
    const id = String(rawId).trim();
    if (!id || id.toLowerCase() === 'none') return;
    const dedupeId = id.toLowerCase();
    if (seenIds.has(dedupeId)) return;
    seenIds.add(dedupeId);
    const resolved = tagLookup && resolveTagTitle(id, tagLookup);
    const label = resolved || tagIdToDisplayLabel(id);
    if (!label) return;
    labels.push(label);
  });

  if (!labels.length) return null;

  const ul = document.createElement('ul');
  ul.className = 'linklist-item-tags';
  ul.setAttribute('aria-label', 'Tags');
  labels.forEach((label) => {
    const li = document.createElement('li');
    li.className = 'linklist-item-tag';
    li.textContent = label;
    ul.append(li);
  });
  return ul;
}

function bindLinkBehavior(anchor, item) {
  if (item.cookieConsentLink) {
    anchor.removeAttribute('href');
    anchor.setAttribute('role', 'button');
    anchor.tabIndex = 0;
    anchor.dataset.cookieConsent = 'true';
    anchor.classList.add('ot-sdk-show-settings');
    const openConsent = (e) => {
      e.preventDefault();
      const w = window;
      if (w.OneTrust?.ToggleInfoDisplay) {
        w.OneTrust.ToggleInfoDisplay();
        return;
      }
      if (w.Optanon?.ToggleInfoDisplay) {
        w.Optanon.ToggleInfoDisplay();
        return;
      }
      w.dispatchEvent(
        new CustomEvent('abbvie:cookie-consent', { bubbles: true }),
      );
    };
    anchor.addEventListener('click', openConsent);
    anchor.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') openConsent(e);
    });
    return;
  }

  if (item.enableConfirmationModal && item.modalId) {
    const dest = anchor.getAttribute('href') || '';
    if (!dest || dest === '#') return;

    if (item.openInNewTab) {
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
    }

    const navigate = () => {
      if (item.openInNewTab) {
        window.open(dest, '_blank', 'noopener,noreferrer');
      } else {
        window.location.assign(dest);
      }
    };

    anchor.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        const { openModal } = await import(
          `${window.hlx.codeBasePath}/blocks/modal/modal.js`
        );
        // XWalk renders modal actions as plain <em>/<strong> links; stamp
        // data-modal-action so shared modal.js delegation matches EDS markup.
        await openModal(item.modalId, {
          onConfirm: navigate,
          modalType: item.confirmationModalType || 'standard',
        });
        const dialog = document.querySelector(
          `.modal dialog[data-modal-type="${item.confirmationModalType || 'standard'}"]`,
        );
        if (dialog) {
          dialog
            .querySelectorAll(
              '.modal-content em a, .modal-content .button.secondary',
            )
            .forEach((btn) => {
              btn.dataset.modalAction = 'cancel';
              btn.addEventListener('click', (ev) => {
                ev.preventDefault();
                dialog.close();
              });
            });
          dialog
            .querySelectorAll(
              '.modal-content strong a, .modal-content .button.primary',
            )
            .forEach((btn) => {
              btn.dataset.modalAction = 'confirm';
            });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(
          'LinkList: modal failed to load, navigating directly',
          err,
        );
        navigate();
      }
    });
    return;
  }

  if (item.openInNewTab) {
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
  }
}

function sanitizeRichtext(raw) {
  if (!raw) return '';

  const ALLOWED_TAGS = new Set([
    'a',
    'b',
    'strong',
    'i',
    'em',
    'u',
    'br',
    'p',
    'ul',
    'ol',
    'li',
    'span',
  ]);
  const ALLOWED_ATTRS = {
    a: ['href', 'target', 'rel', 'aria-label'],
    span: ['class'],
    p: ['class'],
  };

  const doc = new DOMParser().parseFromString(raw, 'text/html');

  function clean(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.cloneNode(false);
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const tag = node.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      const frag = document.createDocumentFragment();
      [...node.childNodes].forEach((child) => {
        const cleaned = clean(child);
        if (cleaned) frag.append(cleaned);
      });
      return frag;
    }

    const el = document.createElement(tag);
    const allowed = ALLOWED_ATTRS[tag] || [];
    allowed.forEach((attr) => {
      if (node.hasAttribute(attr)) {
        let val = node.getAttribute(attr);
        if (tag === 'a' && attr === 'target') val = '_blank';
        if (tag === 'a' && attr === 'rel') val = 'noopener noreferrer';
        el.setAttribute(attr, val);
      }
    });
    if (tag === 'a' && el.getAttribute('target') === '_blank') {
      el.setAttribute('rel', 'noopener noreferrer');
    }
    [...node.childNodes].forEach((child) => {
      const cleaned = clean(child);
      if (cleaned) el.append(cleaned);
    });
    return el;
  }

  const frag = document.createDocumentFragment();
  [...doc.body.childNodes].forEach((child) => {
    const cleaned = clean(child);
    if (cleaned) frag.append(cleaned);
  });

  const wrapper = document.createElement('div');
  wrapper.append(frag);
  return wrapper.innerHTML;
}

function buildListItem(item, variant, tagLookup) {
  const li = document.createElement('li');
  li.className = 'linklist-item';
  if (item.id) li.id = item.id.trim().replace(/\s+/g, '-');
  if (item.customClass) {
    li.classList.add(...item.customClass.split(/\s+/).filter(Boolean));
  }

  const lang = String(item.language || '').replace(/^lang:/, '');
  if (lang && lang !== 'none') li.setAttribute('lang', lang);

  const inner = document.createElement('div');
  inner.className = 'linklist-item-inner';

  const body = document.createElement('div');
  body.className = 'linklist-item-body';

  let iconEl = null;
  if (item.iconType === 'font' && item.fontIcon) {
    iconEl = createIcon(item.fontIcon, 'icon-font', {
      wrapperClass: 'linklist-item-icon linklist-item-icon--font',
    });
  } else if (item.iconType === 'image' && item.imageIcon) {
    iconEl = createIcon(item.imageIcon, 'image', {
      additionalClasses: ['linklist-item-icon', 'linklist-item-icon--image'],
    });
  }

  const mainHref = String(item.link || '').trim();
  const iconHref = String(item.iconLink || '').trim();
  const bothSetAndDiffer = !!mainHref && !!iconHref && mainHref !== iconHref;
  // Effective shared href: prefer mainHref, fall back to iconHref.
  const sharedHref = mainHref || iconHref;
  const shareSingleAnchor = !!iconEl
    && !item.cookieConsentLink
    && !bothSetAndDiffer
    && !!sharedHref
    && sharedHref !== '#';

  const wrapIconLink = (node) => {
    if (!node || item.cookieConsentLink) return node;
    if (shareSingleAnchor) return node;

    // Two-anchor path: icon gets its own href (iconLink preferred, fallback to main).
    const href = iconHref || mainHref;
    if (!href || href === '#') return node;

    const a = document.createElement('a');
    a.className = 'linklist-icon-link';
    a.href = href;

    if (item.openInNewTab) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    a.append(node);
    return a;
  };

  const anchor = document.createElement('a');
  anchor.className = 'linklist-link';
  if (!item.cookieConsentLink) {
    // When sharing, use the resolved sharedHref so a label-only click works
    // even when only iconLink was authored. Otherwise behave as before.
    anchor.href = shareSingleAnchor ? sharedHref : item.link || '#';
  }
  const labelSpan = document.createElement('span');
  labelSpan.className = 'linklist-link-text';
  labelSpan.textContent = item.linkText || '';

  const effectiveIconPosition = item.iconPosition || 'before';
  const isRowsArrows = variant === 'rows-with-arrows';
  // Rows-with-arrows: arrow is the anchor's ::after. An "after" icon must live
  // *inside* the anchor after the label so it sits next to the text, not as a
  // flex sibling past the arrow.
  const iconAfterInsideLink = Boolean(
    iconEl && effectiveIconPosition === 'after' && isRowsArrows,
  );

  // ── footer-legal: move trailing icon outside the anchor when no iconLink ──
  // This prevents the icon from being a clickable area when the author has not
  // set a separate icon destination — the icon is purely decorative in that case.
  const moveIconOutsideAnchor = variant === 'footer-legal'
    && !!iconEl
    && effectiveIconPosition === 'after'
    && !iconHref;

  // Deferred trailing slot — populated below, appended to row after anchor.
  let deferredTrailingSlot = null;

  // Build anchor inner content based on whether we're sharing the anchor.
  if (shareSingleAnchor && iconEl && effectiveIconPosition === 'before') {
    const iconSlot = document.createElement('span');
    iconSlot.className = 'linklist-item-icon-leading';
    iconSlot.setAttribute('aria-hidden', 'true');
    iconSlot.append(iconEl);
    anchor.append(iconSlot, labelSpan);
  } else if (shareSingleAnchor && iconEl && effectiveIconPosition === 'after') {
    anchor.append(labelSpan);
    const iconSlot = document.createElement('span');
    iconSlot.className = 'linklist-item-icon-trailing';
    iconSlot.setAttribute('aria-hidden', 'true');
    iconSlot.append(iconEl);

    if (moveIconOutsideAnchor) {
      // Defer placement — icon will be appended to row after the anchor.
      deferredTrailingSlot = iconSlot;
    } else {
      anchor.append(iconSlot);
    }
  } else {
    anchor.append(labelSpan);
  }

  if (item.ariaLabel) anchor.setAttribute('aria-label', item.ariaLabel);
  bindLinkBehavior(anchor, item);

  const row = document.createElement('div');
  row.className = 'linklist-item-row';

  if (shareSingleAnchor) {
    row.append(anchor);
    // Append the deferred trailing icon outside the anchor for footer-legal
    // items that have no separate iconLink — icon is decorative only.
    if (deferredTrailingSlot) row.append(deferredTrailingSlot);
  } else if (iconAfterInsideLink) {
    row.append(anchor);
    const slot = document.createElement('span');
    slot.className = 'linklist-item-icon-trailing';
    slot.setAttribute('aria-hidden', 'true');
    slot.append(iconEl);
    anchor.append(slot);
  } else {
    if (iconEl && effectiveIconPosition !== 'after') row.append(wrapIconLink(iconEl));
    row.append(anchor);
    if (iconEl && effectiveIconPosition === 'after') {
      row.append(wrapIconLink(iconEl));
    }
  }

  const forceDetailedSlots = variant === 'detailed-list';

  body.append(row);

  if (item.subtitle || forceDetailedSlots) {
    const sub = document.createElement('p');
    sub.className = 'linklist-item-subtitle';
    if (!item.subtitle) sub.classList.add('linklist-item-subtitle--empty');
    sub.textContent = item.subtitle || '';
    body.append(sub);
  }

  if (item.description || forceDetailedSlots) {
    const desc = document.createElement('div');
    desc.className = 'linklist-item-description';
    if (!item.description) desc.classList.add('linklist-item-description--empty');
    desc.innerHTML = item.description ? sanitizeRichtext(item.description) : '';
    body.append(desc);
  }

  if (item.dateText) {
    const time = document.createElement('time');
    time.className = 'linklist-item-date';
    if (item.dateIso) time.setAttribute('datetime', item.dateIso);
    time.textContent = item.dateText;
    body.append(time);
  }

  if (item.categoryTags) {
    const tagsEl = buildTags(item.categoryTags, tagLookup);
    if (tagsEl) body.append(tagsEl);
  }

  inner.append(body);
  li.append(inner);
  return li;
}

const EMPTY_HINTS = {
  'no-index': {
    author:
      'No site index loaded. Open a preview URL that loads query-index JSON, then reload.',
    visitor: 'No links to display.',
  },
  'no-parent': {
    author: 'Set a Parent Page in the block properties.',
    visitor: 'No links to display.',
  },
  'no-matches': {
    author:
      'No pages matched this Parent Page path. Check the path is correct.',
    visitor: 'No links to display.',
  },
  'all-hidden': {
    author:
      'Pages exist under this parent but all have "hide from navigation" enabled.',
    visitor: 'No links to display.',
  },
};

/**
 * Derives the number of items shown per carousel "page" from the layout class
 * applied to the list element.
 * - single-column        → 1
 * - two-columns-stack    → 2
 * - two-columns-nostack  → 2
 */
/**
 * Returns the number of items visible per carousel "page" at the current
 * viewport width by measuring rendered item width against list width.
 * Called at click-time so it always reflects the live viewport:
 * - single-column       → always 1
 * - two-columns-nostack → always 2
 * - two-columns-stack   → 1 on mobile, 2 on tablet+ (CSS drives item width)
 */
function getLiveCarouselItemsPerPage(list) {
  const firstItem = list.firstElementChild;
  if (!firstItem) return 1;
  const itemW = firstItem.offsetWidth;
  const listW = list.clientWidth;
  if (!itemW || !listW) return 1;
  // Round to nearest integer to absorb sub-pixel differences.
  return Math.max(1, Math.round(listW / itemW));
}

export default async function decorate(block) {
  const rootPath = getMetadata('root-path') || '';

  const cfg = readParentConfig(block);

  if (String(cfg.variant || '').toLowerCase() === 'detailed-list') {
    cfg.enableSubtitle = true;
    cfg.enableDescription = true;
  }

  if (block.querySelector(':scope > div [data-aue-prop]')) {
    const freshProp = (name) => {
      const el = [...block.querySelectorAll(`[data-aue-prop="${name}"]`)].find(
        (e) => !e.closest('[data-aue-prop="items"]'),
      );
      return el != null ? el.textContent.trim() : null;
    };
    const fId = freshProp('id');
    const fCc = freshProp('customClass');
    if (fId !== null) cfg.id = fId;
    if (fCc !== null) cfg.customClass = fCc;
  }

  const src = String(cfg.linkSource || 'custom')
    .toLowerCase()
    .replace(/\s+/g, '-');

  const itemEls = src !== 'child-pages' ? collectItems(block) : [];
  const itemConfigs = itemEls.map((el) => readItemConfig(el));

  let childPageResult = { items: [], reason: null, debug: null };
  if (src === 'child-pages') {
    if (!cfg.parentPage) {
      childPageResult = { items: [], reason: 'no-parent' };
    } else {
      childPageResult = await buildChildPageItems(cfg, rootPath);
    }
  }

  if (cfg.id) {
    block.id = cfg.id.trim().replace(/\s+/g, '-');
  } else {
    block.removeAttribute('id');
  }

  const prevCustomClass = block.dataset.linklistPrevCustomClass || '';
  if (prevCustomClass) {
    prevCustomClass
      .split(/\s+/)
      .filter(Boolean)
      .forEach((c) => block.classList.remove(c));
  }
  if (cfg.customClass) {
    block.classList.add(...cfg.customClass.split(/\s+/).filter(Boolean));
  }
  block.dataset.linklistPrevCustomClass = cfg.customClass || '';

  const prevVariant = block.dataset.linklistPrevVariant || '';
  if (prevVariant) block.classList.remove(`linklist--${prevVariant}`);

  const variant = String(cfg.variant || 'standard')
    .toLowerCase()
    .replace(/\s+/g, '-');
  block.classList.add(`linklist--${variant}`);
  block.dataset.linklistPrevVariant = variant;

  block.dataset.linkSource = src;
  block.dataset.layout = cfg.layout || 'single-column';

  block.removeAttribute('lang');
  const lang = (cfg.language || '').replace(/^lang:/, '');
  if (lang && lang !== 'none') block.setAttribute('lang', lang);

  const configRowCount = getConfigRowCount(block);

  [...block.children].forEach((child, idx) => {
    if (child.querySelector('[data-aue-prop]') || isItemEl(child)) {
      child.style.display = 'none';
      return;
    }
    if (
      idx >= configRowCount
      && child.tagName === 'DIV'
      && child.querySelector(':scope > div')
    ) {
      child.style.display = 'none';
      return;
    }
    child.remove();
  });

  // Remove any previously-rendered carousel controls (re-decoration).
  block
    .querySelectorAll(':scope > .linklist-carousel-controls')
    .forEach((el) => el.remove());

  const nav = document.createElement('nav');
  nav.className = 'linklist-nav';
  nav.setAttribute('aria-label', cfg.ariaLabel.trim() || 'Links');

  const list = document.createElement('ul');
  list.className = 'linklist-items';
  list.classList.add(
    `linklist-layout--${String(cfg.layout || 'single-column')
      .toLowerCase()
      .replace(/\s+/g, '-')}`,
  );

  const applyBlockIcon = (item) => {
    if (variant !== 'icons') return item;
    if (!cfg.fontIcon) return item;
    return {
      ...item,
      iconType: 'font',
      fontIcon: cfg.fontIcon,
    };
  };

  const tagLookup = await getTagsTitleLookup();

  // Lazily load the site index if any custom item is missing linkText —
  // we'll try to resolve a title from the index for those items.
  const itemsNeedingTitle = src !== 'child-pages'
    && itemConfigs.some(
      (item) => item
        && !String(item.linkText || '').trim()
        && !item.cookieConsentLink
        && String(item.link || '').trim(),
    );

  if (itemsNeedingTitle && getFlatIndex().length === 0) {
    try {
      await indexUtils.getIndexData();
    } catch (_e) {
      /* fall through — items without titles will be hidden */
    }
    if (getFlatIndex().length === 0) {
      try {
        const resp = await fetch('/query-index-en.json');
        if (resp.ok) {
          const data = await resp.json();
          let rows = [];
          if (Array.isArray(data?.data)) {
            rows = data.data;
          } else if (Array.isArray(data)) {
            rows = data;
          }
          if (rows.length) {
            flatIndexCache = rows;
            try {
              sessionStorage.setItem(
                `${INDEX_CACHE_KEY}-raw`,
                JSON.stringify(data),
              );
            } catch (_e) {
              /* sessionStorage may throw when full */
            }
          }
        }
      } catch (_e) {
        /* index fetch is optional */
      }
    }
  }

  // Resolve a page title from the site index for an internal link path.
  // Returns '' for external links or paths not in the index.
  const resolveTitleFromIndex = (link) => {
    const raw = String(link || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) {
      try {
        const u = new URL(raw);
        if (u.origin !== window.location.origin) return '';
      } catch (_e) {
        return '';
      }
    }
    const flat = getFlatIndex();
    if (!flat.length) return '';

    const titleOf = (page) => String(
      (page.title || page.Title || page.navtitle || '').split('|')[0].trim(),
    );

    const stripHost = String(raw).replace(/^https?:\/\/[^/]+/, '');
    const cleanTail = (s) => s.replace(/\.html$/i, '').replace(/\/+$/, '') || '/';
    const baseClean = cleanTail(stripHost);

    const segs = baseClean.split('/').filter(Boolean);
    const trailingVariants = [];
    for (let i = 0; i < segs.length; i += 1) {
      trailingVariants.push(`/${segs.slice(i).join('/')}`);
    }

    const exactVariants = [
      ...new Set(
        [
          alignPath(raw, rootPath),
          normalizePath(raw, rootPath),
          ...trailingVariants,
        ].filter(Boolean),
      ),
    ];

    const exact = flat.find((p) => {
      const ip = normalizePath(indexPath(p), rootPath);
      return exactVariants.includes(ip);
    });
    if (exact) return titleOf(exact);

    const slug = segs[segs.length - 1];
    if (slug) {
      const slugMatches = flat.filter((p) => {
        const ip = normalizePath(indexPath(p), rootPath);
        return ip.split('/').filter(Boolean).pop() === slug;
      });
      if (slugMatches.length === 1) return titleOf(slugMatches[0]);
    }

    return '';
  };

  // Backfill missing linkText from the page's index title where possible.
  // After this, the renderability filter applies as before — items with no
  // resolvable title (e.g. external link with empty linkText) stay hidden.
  if (src !== 'child-pages') {
    itemConfigs.forEach((item) => {
      if (!item) return;
      if (String(item.linkText || '').trim()) return;
      if (item.cookieConsentLink) return;
      const title = resolveTitleFromIndex(item.link);
      if (title) item.linkText = title;
    });
  }

  const isItemRenderable = (item) => {
    if (!item) return false;

    if (src === 'icons') {
      return true;
    }
    const hasLinkText = !!String(item.linkText || '').trim();
    const hasLink = !!String(item.link || '').trim();
    const hasContent = hasLinkText && hasLink;
    if (!hasContent) return false;

    if (item.cookieConsentLink) return true;
    return !!String(item.link || '').trim();
  };

  if (src === 'child-pages') {
    childPageResult.items.forEach((data) => {
      const enriched = applyBlockIcon(data);
      if (!isItemRenderable(enriched)) return;
      list.append(buildListItem(enriched, variant, tagLookup));
    });
  } else {
    itemEls.forEach((el, i) => {
      if (!itemConfigs[i]) return;
      const enriched = applyBlockIcon(itemConfigs[i]);
      if (!isItemRenderable(enriched)) {
        return;
      }
      const li = buildListItem(enriched, variant, tagLookup);
      moveInstrumentation(el, li);
      list.append(li);
    });
  }

  decorateExternalLinksUtility(list);
  list.querySelectorAll('a.external-link').forEach((a) => {
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = ', external link, opens in a new window';
    a.append(sr);
  });

  nav.append(list);

  if (list.children.length === 0) {
    const inAuthor = isAuthor();
    const empty = document.createElement('p');
    empty.className = 'linklist-empty';
    empty.setAttribute('role', 'status');

    if (src === 'child-pages') {
      const hint = EMPTY_HINTS[childPageResult.reason] || EMPTY_HINTS['no-matches'];
      empty.textContent = inAuthor ? hint.author : hint.visitor;
    } else {
      empty.textContent = inAuthor
        ? 'No Link List Items found. Add items by clicking the + button.'
        : 'No links to display.';
    }

    if (inAuthor) empty.classList.add('linklist-empty--hint');
    nav.append(empty);

    if (src === 'child-pages' && inAuthor && childPageResult.debug) {
      const det = document.createElement('details');
      det.className = 'linklist-empty-details';
      const sum = document.createElement('summary');
      sum.textContent = 'Debug info (authors only)';
      const pre = document.createElement('pre');
      pre.textContent = JSON.stringify(childPageResult.debug, null, 2);
      det.append(sum, pre);
      nav.append(det);
    }
  }

  block.append(nav);

  // ─── Carousel controls ───────────────────────────────────────────────────────
  if (variant === 'carousel' && list.children.length > 0) {
    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'linklist-carousel-prev';
    prev.setAttribute('aria-label', 'Scroll links left');

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'linklist-carousel-next';
    next.setAttribute('aria-label', 'Scroll links right');

    // scrollAmt reads item width at click-time so it naturally returns the
    // correct page width for the current viewport (1 item on mobile for stack,
    // 2 items on tablet+ for stack, always 2 for nostack, always 1 for single).
    const scrollAmt = () => {
      const firstItem = list.firstElementChild;
      if (!firstItem) return list.clientWidth;
      return firstItem.offsetWidth * getLiveCarouselItemsPerPage(list);
    };

    prev.addEventListener('click', () => {
      list.scrollBy({ left: -scrollAmt(), behavior: 'smooth' });
    });
    next.addEventListener('click', () => {
      list.scrollBy({ left: scrollAmt(), behavior: 'smooth' });
    });

    const controls = document.createElement('div');
    controls.className = 'linklist-carousel-controls';
    controls.append(prev, next);
    block.append(controls);

    // Controls visibility: hide when all items fit on a single page.
    // For two-columns-nostack the minimum meaningful count is always > 2.
    // For two-columns-stack it depends on viewport, so use > 1 (safe for
    // mobile where 1 item fills a page; redundant controls on tablet with
    // exactly 2 items are acceptable — they simply scroll nowhere).
    // For single-column > 1 is the existing behaviour.
    const isNoStack = list.classList.contains('linklist-layout--two-columns-nostack');
    const minItemsToShowControls = isNoStack ? 3 : 2;
    controls.style.display = list.children.length >= minItemsToShowControls ? '' : 'none';
  }
}
