import { toClassName } from '../../scripts/aem.js';
import { getConfigValue } from '../../scripts/config.js';
import indexUtils from '../../scripts/index-utils.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import { isUniversalEditor } from '../../scripts/utils.js';
import {
  fetchPlaceholders,
  detectLanguage,
} from '../../scripts/placeholders.js';

const DEFAULT_CTA_TEXT = 'Read Story';
const IMAGE_BREAKPOINTS = [
  { media: '(min-width: 1024px)', width: '1200' },
  { media: '(min-width: 744px)', width: '900' },
  { width: '750' },
];
const metadataCache = new Map();

function toDisplayUppercase(value) {
  return `${value || ''}`.trim().toUpperCase();
}

function getAuthoringSource(block) {
  return block.querySelector(':scope > .story-card-authoring-data') || block;
}

function getFieldElement(source, name) {
  return source.querySelector(`[data-aue-prop="${name}"]`);
}

function getFieldText(source, name, fallback = '') {
  return getFieldElement(source, name)?.textContent?.trim() || fallback;
}

function isPathLikeValue(value) {
  return /^(?:\/|https?:\/\/|urn:aemconnection:|content\/)/i.test(
    `${value || ''}`.trim(),
  );
}

function toTrimmedString(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') {
    return `${value}`;
  }
  return '';
}

function buildOpenApiAssetUrl(value) {
  if (!value || typeof value !== 'object') return '';

  const repositoryId = toTrimmedString(
    value['repo:repositoryId'] ?? value.repoRepositoryId ?? value.repositoryId,
  );
  const assetId = toTrimmedString(
    value['repo:assetId'] ?? value.repoAssetId ?? value.assetId,
  );
  const name = toTrimmedString(
    value['repo:name'] ?? value.repoName ?? value.name,
  );

  if (!repositoryId || !assetId || !name) {
    return '';
  }

  const deliveryHost = repositoryId.startsWith('http')
    ? repositoryId
    : `https://${repositoryId}`;
  const safeHost = deliveryHost.replace(/\/+$/, '');
  const nameParts = name.split('.');
  const format = nameParts.length > 1 ? nameParts.pop() : '';
  const seoName = nameParts.join('.') || name;

  return `${safeHost}/adobe/assets/${assetId}/as/${encodeURIComponent(seoName)}${format ? `.${encodeURIComponent(format)}` : ''}`;
}

function extractPathLikeReference(value, depth = 0) {
  if (!value || depth > 3) return '';

  if (typeof value === 'object') {
    const candidate = [
      value?.href,
      value?.path,
      value?.value,
      value?.url,
      value?.reference,
      value?.destination,
      value?.src,
      value?.deliveryUrl,
      value?.deliveryURL,
      value?.fileReference,
      value?.assetPath,
      value?.['repo:path'],
      value?.['repo:assetPath'],
      value?.image,
      value?.asset,
      buildOpenApiAssetUrl(value),
    ]
      .map((entry) => extractPathLikeReference(entry, depth + 1))
      .find(Boolean);

    return candidate || '';
  }

  const normalized = `${value || ''}`.trim();
  if (!normalized) return '';

  if (isPathLikeValue(normalized)) {
    return normalized;
  }

  try {
    return extractPathLikeReference(JSON.parse(normalized), depth + 1);
  } catch {
    return '';
  }
}

function getElementReferenceValue(element) {
  if (!element) return '';

  const attributeNames = [
    'data-aue-value',
    'data-aue-path',
    'data-aue-href',
    'href',
    'data-path',
    'data-value',
    'value',
  ];

  return (
    attributeNames
      .map((attributeName) => element.getAttribute(attributeName))
      .map((attributeValue) => extractPathLikeReference(attributeValue))
      .find(Boolean) || ''
  );
}

function getFieldLink(source, name) {
  const field = getFieldElement(source, name);
  if (!field) return '';

  const linkCandidate = field.querySelector(
    'a[href], [href], [data-path], [data-value], [value], [data-aue-value], [data-aue-path], [data-aue-href]',
  );
  const attributeValue = getElementReferenceValue(linkCandidate) || getElementReferenceValue(field);

  if (attributeValue) {
    return attributeValue;
  }

  return extractPathLikeReference(field.textContent);
}

function parseBoolean(value, fallback = false) {
  const normalized = `${value || ''}`.trim().toLowerCase();
  if (['true', 'yes', 'on', '1'].includes(normalized)) return true;
  if (['false', 'no', 'off', '0'].includes(normalized)) return false;
  return fallback;
}

function getFieldBoolean(source, name, fallback = false) {
  const el = getFieldElement(source, name);
  if (!el) return fallback;
  const value = el.getAttribute('data-aue-value') ?? el.textContent?.trim() ?? '';
  return parseBoolean(value, fallback);
}

function normalizeLang(value) {
  const normalized = `${value || ''}`.trim();
  if (!normalized || normalized === 'lang:none' || normalized === 'none') {
    return '';
  }
  return normalized.startsWith('lang:') ? normalized.substring(5) : normalized;
}

function normalizeSitePath(pathname, rootPath = '') {
  let normalized = pathname || '';
  if (rootPath && normalized.startsWith(rootPath)) {
    normalized = normalized.slice(rootPath.length) || '/';
  }

  normalized = normalized.replace(/\/index\.html$/, '/');
  normalized = normalized.replace(/\.html$/, '');

  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  normalized = normalized.replace(/\/{2,}/g, '/');

  if (normalized !== '/' && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized || '/';
}

function inferSitePathFromAuthorPath(pathname) {
  const normalizedPath = normalizeSitePath(pathname);
  if (!normalizedPath.startsWith('/content/')) {
    return '';
  }

  const segments = normalizedPath.split('/').filter(Boolean);
  if (segments[0] !== 'content') {
    return '';
  }

  if (segments[3] === 'language-masters' && segments.length >= 5) {
    return normalizeSitePath(`/${segments.slice(5).join('/')}`);
  }

  if (segments.length >= 6 && /^[a-z]{2}(?:-[a-z]{2})?$/i.test(segments[4])) {
    return normalizeSitePath(`/${segments.slice(5).join('/')}`);
  }

  if (segments.length >= 5 && /^[a-z]{2}(?:-[a-z]{2})?$/i.test(segments[3])) {
    return normalizeSitePath(`/${segments.slice(4).join('/')}`);
  }

  return '';
}

function normalizeRawReference(reference) {
  return `${reference || ''}`.trim().replace(/^urn:aemconnection:/i, '');
}

function normalizePageReference(reference, rootPath) {
  const normalizedReference = normalizeRawReference(reference);
  if (!normalizedReference) return null;

  try {
    const url = new URL(normalizedReference, window.location.href);
    const authorPath = normalizeSitePath(url.pathname);
    const inferredPath = !rootPath
      ? inferSitePathFromAuthorPath(authorPath)
      : '';
    const path = normalizeSitePath(
      rootPath && authorPath.startsWith(rootPath)
        ? authorPath.slice(rootPath.length) || '/'
        : inferredPath || authorPath,
    );
    const internal = url.origin === window.location.origin
      || !!(rootPath && authorPath.startsWith(rootPath))
      || !!inferredPath
      || authorPath.startsWith('/content/');
    const href = internal
      ? `${path}${url.search}${url.hash}` || path
      : url.href;

    return {
      href,
      path,
      internal,
      htmlHref: internal && path !== '/' ? `${path}.html` : href,
      sourcePath: authorPath,
      sourceHtmlHref:
        internal && authorPath !== '/' ? `${authorPath}.html` : href,
    };
  } catch {
    return null;
  }
}

function cleanDisplayTitle(title) {
  return `${title || ''}`.split('|')[0].trim();
}

function getPropValue(source, names) {
  const keys = Array.isArray(names) ? names : [names];
  return keys.reduce((value, key) => {
    if (value || !source) return value;
    return source[key] ?? source[toClassName(key)] ?? value;
  }, '');
}

function getProp(source, names) {
  return toTrimmedString(getPropValue(source, names));
}

function isDefaultMetaImageReference(reference) {
  const normalized = extractPathLikeReference(reference);
  if (!normalized) return false;

  try {
    const url = new URL(normalized, window.location.href);
    return /\/default-meta-image\.(png|jpe?g|webp|gif|svg)$/i.test(
      url.pathname,
    );
  } catch {
    return /default-meta-image\.(png|jpe?g|webp|gif|svg)$/i.test(normalized);
  }
}

function normalizeStoryImageReference(reference) {
  const normalized = extractPathLikeReference(reference);
  if (!normalized || isDefaultMetaImageReference(normalized)) {
    return '';
  }

  return normalized;
}

function isDynamicMediaUrl(url) {
  return (
    url.hostname.includes('scene7.com')
    || url.pathname.includes('/is/image/')
    || url.pathname.includes('/adobe/assets/')
  );
}

function isOpenApiDeliveryUrl(url) {
  return url.pathname.includes('/adobe/assets/');
}

function isDamAssetUrl(url) {
  return url.pathname.startsWith('/content/dam/');
}

function getStoryImagePreferenceScore(reference) {
  if (!reference) return 0;

  try {
    const url = new URL(reference, window.location.href);
    if (isOpenApiDeliveryUrl(url)) return 4;
    if (isDynamicMediaUrl(url)) return 3;
    if (isDamAssetUrl(url)) return 1;
    return 2;
  } catch {
    return 1;
  }
}

function selectPreferredStoryImage(primary, secondary) {
  const primaryScore = getStoryImagePreferenceScore(primary);
  const secondaryScore = getStoryImagePreferenceScore(secondary);

  if (secondaryScore > primaryScore) {
    return secondary;
  }

  return primary || secondary || '';
}

async function composeReadTime(source) {
  const lang = detectLanguage();
  const placeholders = await fetchPlaceholders(lang);

  const legacy = getProp(source, ['readTime', 'readtime']);
  if (legacy) return legacy;

  const type = getProp(source, ['readWatchTime', 'readwatchtime']);
  const minutes = type === 'watchTime'
    ? getProp(source, ['storyWatchTime', 'storywatchtime'])
    : getProp(source, ['storyReadTime', 'storyreadtime']);
  if (!minutes) return '';

  const label = type === 'watchTime'
    ? placeholders?.['storyCard.minuteWatch'] || 'Minute Watch'
    : placeholders?.['storyCard.minuteRead'] || 'Minute Read';
  return `${minutes} ${label}`;
}

async function buildStoryData(source = {}) {
  const imageReference = getPropValue(source, [
    'cardImage',
    'cardimage',
    'pageImage',
    'pageimage',
    'image',
    'profileImage',
    'profileimage',
    'headshotImage',
    'headshotimage',
    'thumbnail',
  ]);

  return {
    eyebrow: getProp(source, ['eyebrowText', 'eyebrowtext']),
    title: cleanDisplayTitle(getProp(source, ['cardTitle', 'cardtitle'])),
    description: getProp(source, ['cardDescription', 'carddescription']),
    image: normalizeStoryImageReference(imageReference),
    imageAlt: getProp(source, [
      'cardImageAlt',
      'cardimagealt',
      'pageImageAlt',
      'pageimagealt',
    ]),
    ctaText: getProp(source, ['ctaText', 'ctatext']),
    ctaAltText: getProp(source, ['ctaAltText', 'ctaalttext']),
    publicationDate: getProp(source, ['publicationDate', 'publicationdate']),
    readTime: await composeReadTime(source),
  };
}

function mergeStoryData(primary, secondary) {
  const primaryImage = normalizeStoryImageReference(primary.image);
  const secondaryImage = normalizeStoryImageReference(secondary.image);
  const image = selectPreferredStoryImage(primaryImage, secondaryImage);
  const imageAlt = image === primaryImage
    ? primary.imageAlt || secondary.imageAlt || ''
    : secondary.imageAlt || primary.imageAlt || '';

  return {
    eyebrow: primary.eyebrow || secondary.eyebrow || '',
    title: primary.title || secondary.title || '',
    description: primary.description || secondary.description || '',
    image,
    imageAlt,
    ctaText: primary.ctaText || secondary.ctaText || '',
    ctaAltText: primary.ctaAltText || secondary.ctaAltText || '',
    publicationDate: primary.publicationDate || secondary.publicationDate || '',
    readTime: primary.readTime || secondary.readTime || '',
  };
}

function readSequentialConfig(source, rootPath) {
  const rows = [...source.querySelectorAll(':scope > div')];
  const cells = rows.map((row) => row.querySelector(':scope > div') || row);

  if (rows.length <= 4) {
    return {
      id: '',
      customClass: '',
      page: normalizePageReference(
        cells[2]?.querySelector('a[href]')?.getAttribute('href')
          || cells[2]?.textContent?.trim(),
        rootPath,
      ),
      openInNewTab: false,
      hideImage: false,
      language: '',
      legacySizeStyle: cells[0]?.textContent?.trim() || '',
      legacyLayoutStyle: cells[1]?.textContent?.trim() || '',
    };
  }

  const textAt = (index) => cells[index]?.textContent?.trim() || '';
  const linkAt = (index) => cells[index]?.querySelector('a[href]')?.getAttribute('href')
    || textAt(index);

  // Detect extended layout: new model puts overview fields (storyCardVariant,
  // hide* booleans) before the properties tab fields. The page link moves
  // from index 2 (legacy 9-col) to index 8 (extended 15-col). We detect
  // the extended layout when index 0 holds a known storyCardVariant value.
  const firstCell = textAt(0);
  const isExtended = firstCell === 'cardInfo'
    || firstCell === 'storyCardInfo'
    || firstCell === 'leaderInfo'
    || firstCell === 'sidePanel'
    || firstCell === 'relatedContent';

  if (isExtended) {
    return {
      storyCardVariant: textAt(0),
      hidePublicationDate: parseBoolean(textAt(1), false),
      hideReadTime: parseBoolean(textAt(2), false),
      hideRole: parseBoolean(textAt(3), false),
      hideDescription: parseBoolean(textAt(4), false),
      hideImage: parseBoolean(textAt(5), false),
      id: textAt(6),
      customClass: textAt(7),
      page: normalizePageReference(linkAt(8), rootPath),
      openInNewTab: parseBoolean(textAt(9), false),
      ctaLabel: textAt(10),
      language: normalizeLang(textAt(12)),
      legacySizeStyle: '',
      legacyLayoutStyle: '',
    };
  }

  return {
    id: textAt(0),
    customClass: textAt(1),
    page: normalizePageReference(linkAt(2), rootPath),
    openInNewTab: parseBoolean(textAt(3), false),
    hideImage: parseBoolean(textAt(4), false),
    language: normalizeLang(textAt(6)),
    legacySizeStyle: '',
    legacyLayoutStyle: '',
  };
}

function extractLegacyContent(source) {
  const richText = source.querySelector('[data-aue-prop="text"]');
  if (richText) {
    const parts = [...richText.children];
    return {
      eyebrow: parts[0]?.textContent?.trim() || '',
      title: parts[1]?.textContent?.trim() || '',
      description: parts[2]?.textContent?.trim() || '',
      ctaText: parts[3]?.textContent?.trim() || '',
    };
  }

  const rows = [...source.querySelectorAll(':scope > div')];
  if (rows.length !== 4) return {};

  const contentContainer = rows[3]?.querySelector(':scope > div') || rows[3];
  const directChildren = [...(contentContainer?.children || [])];
  const contentSource = directChildren.length === 1 && directChildren[0].children.length
    ? [...directChildren[0].children]
    : directChildren;

  return {
    eyebrow: contentSource[0]?.textContent?.trim() || '',
    title: contentSource[1]?.textContent?.trim() || '',
    description: contentSource[2]?.textContent?.trim() || '',
    ctaText: contentSource[3]?.textContent?.trim() || '',
  };
}

function extractConfig(block, rootPath) {
  const source = getAuthoringSource(block);
  const hasAueProps = source.querySelector('[data-aue-prop]');
  const legacyContent = extractLegacyContent(source);
  const sequentialConfig = readSequentialConfig(source, rootPath);

  if (!hasAueProps) {
    return {
      ...sequentialConfig,
      legacyContent,
    };
  }

  return {
    storyCardVariant:
      getFieldText(source, 'storyCardVariant')
      || getFieldText(source, 'storyCardType')
      || 'cardInfo',
    hidePublicationDate: getFieldBoolean(source, 'hidePublicationDate'),
    hideReadTime: getFieldBoolean(source, 'hideReadTime'),
    hideRole:
      getFieldBoolean(source, 'hideRole')
      || getFieldBoolean(source, 'hideTitle'),
    hideDescription: getFieldBoolean(source, 'hideDescription'),
    id: getFieldText(source, 'id', sequentialConfig.id),
    customClass:
      getFieldText(source, 'customClass')
      || getFieldText(source, 'classes_customClass')
      || sequentialConfig.customClass,
    page:
      normalizePageReference(
        getFieldLink(source, 'page') || getFieldLink(source, 'page-path'),
        rootPath,
      ) || sequentialConfig.page,
    openInNewTab: getFieldElement(source, 'openInNewTab')
      ? getFieldBoolean(source, 'openInNewTab', sequentialConfig.openInNewTab)
      : sequentialConfig.openInNewTab,
    hideImage: getFieldElement(source, 'hideImage')
      ? getFieldBoolean(source, 'hideImage', sequentialConfig.hideImage)
      : sequentialConfig.hideImage,
    ctaLabel:
      getFieldText(source, 'ctaLabel') || getFieldText(source, 'ctaText'),
    language: getFieldElement(source, 'language')
      ? normalizeLang(getFieldText(source, 'language'))
      : sequentialConfig.language,
    legacySizeStyle: getFieldText(
      source,
      'size-style',
      sequentialConfig.legacySizeStyle,
    ),
    legacyLayoutStyle: getFieldText(
      source,
      'standard-style',
      sequentialConfig.legacyLayoutStyle,
    ),
    legacyContent,
  };
}

function getStoryCardData(pageReference) {
  if (!pageReference?.href) return Promise.resolve(null);

  const cacheKey = pageReference.href;
  if (metadataCache.has(cacheKey)) {
    return metadataCache.get(cacheKey);
  }

  const pending = (async () => {
    let indexData = {};
    let valid = false;

    if (pageReference.internal) {
      try {
        const pageProps = await indexUtils.getPageProperties(
          pageReference.path,
        );
        indexData = await buildStoryData(pageProps);
        valid = valid || !!pageProps;
      } catch {
        // Rendering falls back to document metadata when the index is unavailable.
      }
    }

    return {
      valid,
      data: indexData,
    };
  })();

  metadataCache.set(cacheKey, pending);
  return pending;
}

function removeBlock(block) {
  const wrapper = block.parentElement;
  if (
    wrapper?.classList.contains('story-card-wrapper')
    && wrapper.childElementCount === 1
  ) {
    wrapper.remove();
    return;
  }

  block.remove();
}

function createAnalyticsInteractionId(block) {
  const resourcePath = block.dataset.aueResource
    || block.closest('[data-aue-resource]')?.getAttribute('data-aue-resource')
    || `${window.location.pathname}::story-card`;

  // Keep the runtime ID deterministic without needing server-side state.
  const hash = [...resourcePath].reduce((acc, character) => {
    const value = acc * 31 + character.charCodeAt(0);
    return value % 2147483647;
  }, 7);

  return `story-card-${hash.toString(36)}`;
}

function buildAuthorPlaceholder(message) {
  const placeholder = document.createElement('div');
  placeholder.className = 'story-card-placeholder';
  placeholder.setAttribute('role', 'note');

  const title = document.createElement('p');
  title.className = 'story-card-placeholder-title';
  title.textContent = 'Configure Story Card';

  const description = document.createElement('p');
  description.className = 'story-card-placeholder-text';
  description.textContent = message;

  placeholder.append(title, description);
  return placeholder;
}

function getAuthoringMarkupContainer(block) {
  const existing = block.querySelector(':scope > .story-card-authoring-data');
  if (existing) {
    return existing;
  }

  const authoringData = document.createElement('div');
  authoringData.className = 'story-card-authoring-data';
  authoringData.hidden = true;
  authoringData.setAttribute('aria-hidden', 'true');
  authoringData.append(...block.childNodes);
  return authoringData;
}

function replaceRenderedContent(
  block,
  content,
  preserveAuthoringMarkup = false,
) {
  if (!preserveAuthoringMarkup) {
    block.replaceChildren(content);
    return;
  }

  const authoringData = getAuthoringMarkupContainer(block);
  block.replaceChildren(authoringData, content);
}

function parsePublicationDate(value) {
  const normalized = `${value || ''}`.trim();
  if (!normalized) return null;

  const dateOnlyMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day
    ) {
      return {
        date,
        dateTime: normalized,
        timeZone: 'UTC',
      };
    }
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return {
    date,
    dateTime: date.toISOString().split('T')[0],
    timeZone: undefined,
  };
}

function formatPublicationDate(value) {
  if (!value) return null;

  const parsedDate = parsePublicationDate(value);
  if (!parsedDate) {
    return {
      displayValue: toDisplayUppercase(value),
      dateTime: '',
    };
  }

  return {
    displayValue: new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      ...(parsedDate.timeZone ? { timeZone: parsedDate.timeZone } : {}),
    })
      .format(parsedDate.date)
      .toUpperCase(),
    dateTime: parsedDate.dateTime,
  };
}

function applyBlockOptions(block, config, analyticsId) {
  block.classList.remove(
    'has-image',
    'is-text-only',
    'opens-new-tab',
    'hide-publication-date',
    'hide-read-time',
    'hide-role',
    'hide-description',
  );

  if (config.id) {
    block.id = config.id;
  }

  if (config.customClass) {
    config.customClass
      .split(/\s+/)
      .filter(Boolean)
      .forEach((cls) => {
        block.classList.add(cls);
      });
  }

  if (config.language) {
    block.setAttribute('lang', config.language);
  } else {
    block.removeAttribute('lang');
  }

  if (config.legacySizeStyle) {
    block.classList.add(toClassName(config.legacySizeStyle));
  }

  if (config.legacyLayoutStyle) {
    block.classList.add(toClassName(config.legacyLayoutStyle));
  }

  if (config.hideImage) {
    block.classList.add('is-text-only');
  }

  if (config.hidePublicationDate) block.classList.add('hide-publication-date');
  if (config.hideReadTime) block.classList.add('hide-read-time');
  if (config.hideRole) block.classList.add('hide-role');
  if (config.hideDescription) block.classList.add('hide-description');

  block.dataset.analyticsInteractionId = analyticsId;
  block.dataset.pagePath = config.page?.path || '';
}

function renderAuthorPlaceholder(
  block,
  config,
  analyticsId,
  message,
  preserveAuthoringMarkup = false,
) {
  applyBlockOptions(block, config, analyticsId);
  block.classList.add('is-placeholder', 'is-text-only');
  block.classList.remove('has-image', 'opens-new-tab');
  replaceRenderedContent(
    block,
    buildAuthorPlaceholder(message),
    preserveAuthoringMarkup,
  );
}

function buildDynamicMediaUrl(src, width) {
  const url = new URL(src, window.location.href);
  const openApiDelivery = isOpenApiDeliveryUrl(url);
  const widthParam = openApiDelivery ? 'width' : 'wid';
  const defaultQualityParam = openApiDelivery ? 'max-quality' : 'qlt';

  ['ts', 'dpr'].forEach((param) => url.searchParams.delete(param));

  if (width && !url.searchParams.has(widthParam)) {
    url.searchParams.set(widthParam, width);
  }

  if (openApiDelivery && !url.searchParams.has('auto-format')) {
    url.searchParams.set('auto-format', 'true');
  }

  if (
    !url.searchParams.has('quality')
    && !url.searchParams.has('qlt')
    && !url.searchParams.has('max-quality')
  ) {
    url.searchParams.set(defaultQualityParam, '85');
  }

  return url.toString();
}

function buildPictureElement(src, alt) {
  if (!src) return null;

  try {
    const url = new URL(src, window.location.href);
    if (isDynamicMediaUrl(url)) {
      const picture = document.createElement('picture');
      IMAGE_BREAKPOINTS.forEach((breakpoint, index) => {
        const dmUrl = buildDynamicMediaUrl(src, breakpoint.width);
        if (index < IMAGE_BREAKPOINTS.length - 1) {
          const source = document.createElement('source');
          if (breakpoint.media) {
            source.media = breakpoint.media;
          }
          source.srcset = dmUrl;
          picture.append(source);
          return;
        }

        const image = document.createElement('img');
        image.src = dmUrl;
        image.alt = alt;
        image.loading = 'lazy';
        picture.append(image);
      });
      return picture;
    }
  } catch {
    // Fallback to a regular image element below when the URL cannot be normalized.
  }

  const picture = document.createElement('picture');
  const image = document.createElement('img');
  image.src = src;
  image.alt = alt;
  image.loading = 'lazy';
  picture.append(image);
  return picture;
}

function buildMetaElement(data, config = {}) {
  const meta = document.createElement('div');
  meta.className = 'story-card-meta';

  if (!config.hidePublicationDate) {
    const publicationDate = formatPublicationDate(data.publicationDate);
    if (publicationDate?.displayValue) {
      const time = document.createElement('time');
      time.className = 'story-card-date';
      time.textContent = publicationDate.displayValue;
      if (publicationDate.dateTime) {
        time.dateTime = publicationDate.dateTime;
      }
      meta.append(time);
    }
  }

  if (data.eyebrow) {
    const eyebrow = document.createElement('span');
    eyebrow.className = 'story-card-eyebrow card-eyebrow';
    eyebrow.setAttribute('role', 'heading');
    eyebrow.setAttribute('aria-level', '2');
    eyebrow.textContent = toDisplayUppercase(data.eyebrow);
    meta.append(eyebrow);
  }

  const isCardInfo = config.storyCardVariant === 'cardInfo';
  const isStoryInfo = config.storyCardVariant === 'storyCardInfo';
  const isSidePanelOrRelated = config.storyCardVariant === 'sidePanel'
    || config.storyCardVariant === 'relatedContent';
  const readTimeInCta = (isCardInfo || isSidePanelOrRelated) && !isStoryInfo;
  if (!config.hideReadTime && data.readTime && !readTimeInCta) {
    const readTime = document.createElement('span');
    readTime.className = 'story-card-read-time';
    readTime.textContent = data.readTime;
    meta.append(readTime);
  }

  return meta.childElementCount ? meta : null;
}

function isLeaderCard(block) {
  return (
    block.classList.contains('story-cards-grid-item')
    && block.closest('.story-cards')?.classList.contains('leader-cards-grid')
  );
}

function buildCard(block, config, data, analyticsId) {
  const leaderCard = isLeaderCard(block) || config.storyCardVariant === 'leaderInfo';
  const isStoryInfo = config.storyCardVariant === 'storyCardInfo';
  const isSidePanel = config.storyCardVariant === 'sidePanel';
  const isRelatedContent = config.storyCardVariant === 'relatedContent';
  const isCardInfo = config.storyCardVariant === 'cardInfo';

  const panel = document.createElement('div');
  panel.className = 'story-card-panel cardpagestory card-dashboard card-medium';
  if (leaderCard) {
    block.classList.add('is-leader-card');
    panel.classList.add('is-leader-card');
  }
  if (isStoryInfo) {
    block.classList.add('story-card-info');
  }
  if (isCardInfo) {
    block.classList.add('card-info');
  }
  if (isSidePanel) {
    block.classList.add('is-side-panel');
  }
  if (isRelatedContent) {
    block.classList.add('is-related-content');
  }
  if (config.language) {
    panel.lang = config.language;
  }

  const link = document.createElement('a');
  link.className = 'story-card-link';
  link.href = config.page.href;
  link.target = config.openInNewTab ? '_blank' : '_self';
  link.dataset.warnOnDeparture = 'false';
  link.dataset.analyticsInteractionId = analyticsId;
  link.dataset.analyticsTrack = analyticsId;
  link.dataset.analyticsContentType = 'story-card';
  link.dataset.analyticsLinkText = toDisplayUppercase(
    data.ctaText || DEFAULT_CTA_TEXT,
  );
  link.dataset.analyticsComponentTitle = data.title;

  if (config.openInNewTab) {
    link.rel = 'noopener noreferrer';
    block.classList.add('opens-new-tab');
  }

  if (!isStoryInfo && !config.hideImage && data.image) {
    if (!leaderCard && !isSidePanel) {
      panel.classList.add('show-image-hide-desc');
    }
    const figure = document.createElement('div');
    figure.className = 'story-card-image card-image-container';

    const picture = buildPictureElement(
      data.image,
      data.imageAlt || data.title || '',
    );
    if (picture) {
      picture.querySelector('img')?.classList.add('card-image');
      figure.append(picture);
      link.append(figure);
      block.classList.remove('is-text-only');
      block.classList.add('has-image');
    }
  } else {
    block.classList.add('is-text-only');
  }

  const content = document.createElement('div');
  content.className = 'story-card-content card-content-container';
  const contentMain = document.createElement('div');

  const meta = buildMetaElement(data, config);
  if (meta) {
    // For Story Card Info, make eyebrow a link instead of plain text
    if (isStoryInfo && config.page?.href) {
      const eyebrowEl = meta.querySelector('.story-card-eyebrow');
      if (eyebrowEl) {
        const eyebrowLink = document.createElement('a');
        eyebrowLink.href = config.page.href;
        eyebrowLink.className = eyebrowEl.className;
        eyebrowLink.textContent = eyebrowEl.textContent;
        eyebrowLink.setAttribute('role', eyebrowEl.getAttribute('role') || '');
        eyebrowLink.setAttribute(
          'aria-level',
          eyebrowEl.getAttribute('aria-level') || '',
        );
        eyebrowEl.replaceWith(eyebrowLink);
      }
    }
    contentMain.append(meta);
  }

  if (!isStoryInfo) {
    const textContainer = document.createElement('div');
    textContainer.className = 'card-text-container';

    if (!config.hideRole && data.title) {
      const title = document.createElement('h4');
      title.className = 'story-card-title card-title';
      title.textContent = data.title;
      textContainer.append(title);
    }

    const showDescription = !config.hideDescription
      && data.description
      && !block.classList.contains('hide-description');
    if (showDescription) {
      const description = document.createElement('p');
      description.className = 'story-card-description card-description';
      description.textContent = data.description;
      textContainer.append(description);
    }

    if (textContainer.childElementCount) {
      contentMain.append(textContainer);
    }
  }
  content.append(contentMain);

  if (!isStoryInfo) {
    const ctaContainer = document.createElement('div');
    ctaContainer.className = 'story-card-cta-container';

    const cta = document.createElement('span');
    cta.className = 'story-card-cta card-cta';
    cta.textContent = toDisplayUppercase(data.ctaText || DEFAULT_CTA_TEXT);
    if (data.ctaAltText) {
      cta.setAttribute('aria-label', data.ctaAltText);
    }
    ctaContainer.append(cta);

    const readTimeInCta = (config.storyCardVariant === 'cardInfo'
        || isSidePanel
        || isRelatedContent)
      && !leaderCard;
    if (readTimeInCta && !config.hideReadTime && data.readTime) {
      const inlineReadTime = document.createElement('span');
      inlineReadTime.className = 'story-card-read-time story-card-read-time-inline';
      inlineReadTime.textContent = data.readTime;
      ctaContainer.append(inlineReadTime);
    }

    content.append(ctaContainer);
  }

  // Story Card Info: no wrapping link — content sits directly in panel
  if (isStoryInfo) {
    panel.append(content);
    return panel;
  }

  link.append(content);
  panel.append(link);
  return panel;
}

export function applyStoryCardVariation(containerBlock, storyCard) {
  storyCard.classList.remove('story-cards-grid-item', 'story-cards-wide-item');

  if (containerBlock.classList.contains('story-card-wide')) {
    storyCard.classList.add('story-cards-wide-item');
    return;
  }

  storyCard.classList.add('story-cards-grid-item');
}

export function buildStoryCardItem(row, containerBlock) {
  const li = document.createElement('li');
  const storyCard = document.createElement('div');
  storyCard.className = 'story-card';
  applyStoryCardVariation(containerBlock, storyCard);

  moveInstrumentation(row, storyCard);
  while (row.firstChild) storyCard.append(row.firstChild);

  li.append(storyCard);

  return { li, storyCard };
}

export default async function decorateStoryCard(block) {
  // Note: do NOT call applyCommonProps here — story card uses positional
  // row parsing (readSequentialConfig) that breaks if rows are removed.
  // The id: and lang: values are handled by extractConfig instead.
  const rootPath = await getConfigValue('rootPath');
  const config = extractConfig(block, rootPath);
  const authorMode = isUniversalEditor();
  const analyticsId = createAnalyticsInteractionId(block);

  if (!config.page?.href) {
    if (authorMode) {
      renderAuthorPlaceholder(
        block,
        config,
        analyticsId,
        'Select a story page in the block properties to preview this card.',
        true,
      );
      return;
    }

    removeBlock(block);
    return;
  }

  applyBlockOptions(block, config, analyticsId);

  const storyResponse = await getStoryCardData(config.page);
  const storyData = mergeStoryData(
    storyResponse?.data || {},
    config.legacyContent || {},
  );
  if (config.ctaLabel) storyData.ctaText = config.ctaLabel;

  if (!storyResponse?.valid || !storyData.title) {
    if (authorMode) {
      renderAuthorPlaceholder(
        block,
        config,
        analyticsId,
        'The selected story page could not be resolved yet. Verify the page reference or publish the target page.',
        true,
      );
      return;
    }

    removeBlock(block);
    return;
  }

  block.classList.remove('is-placeholder');
  replaceRenderedContent(
    block,
    buildCard(block, config, storyData, analyticsId),
    authorMode,
  );
}
