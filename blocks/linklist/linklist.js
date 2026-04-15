import { getMetadata } from '../../scripts/aem.js';
import indexUtils from '../../scripts/index-utils.js';
import {
  moveInstrumentation,
  resolveImageReference,
} from '../../scripts/scripts.js';
import decorateExternalLinksUtility, {
  isAuthorEnvironment,
  isEditor,
} from '../../scripts/utils.js';

const INDEX_CACHE_KEY = 'abbvie-index-data';
let flatIndexCache = null;

// WeakMap to hold per-block ResizeObserver references for carousel cleanup.
const carouselROMap = new WeakMap();

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
      /* quota */
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
        /* quota */
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

  // ── Doc / row-based mode ───────────────────────────────────────────────────
  // Parent block fields (tabs skipped — tab components do not render doc rows):
  //
  // Overview tab:
  //  0:id  1:customClass  2:variant  3:linkSource
  //  4:parentPage  5:childDepth  6:excludeCurrentPage
  //  7:enableDescription  8:enableTags  9:enableSubtitle  10:enableDate
  //  11:orderBy  12:sortOrder  13:maxItems  14:layout  15:fontIcon
  //
  // Accessibility tab:
  //  16:language  17:ariaLabel
  //
  // NOTE: fontIcon (row 15) is conditionally shown in the UE dialog (variant=icons)
  // but always present as a doc row. ariaLabel was moved to the Accessibility tab
  // (row 17) — old blocks without ariaLabel only have 16 config rows.
  // getConfigRowCount() detects which count applies.
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
    // row 17 = ariaLabel; absent on blocks authored before this field was added
    ariaLabel: ct(17) || '',
  };

  if (cfg.parentPage) {
    writeAll(cfg);
  } else {
    deleteAll();
  }
  return cfg;
}

function readItemConfig(itemEl) {
  const imgPropEl = itemEl.querySelector('[data-aue-prop="imageIcon"]');
  if (imgPropEl) resolveImageReference(imgPropEl);

  // ── Unified reading strategy ───────────────────────────────────────────────
  // AEM Universal Editor only attaches data-aue-prop to a subset of field
  // types (text, richtext, aem-content). Select, boolean, aem-tag, and
  // reference fields often render as plain divs with no data-aue-prop, even
  // in the author instance. This means we cannot rely solely on the UE prop
  // path — it silently returns '' for iconType, fontIcon, categoryTags etc.
  //
  // Strategy: ALWAYS parse the sequential doc-mode rows first (works in both
  // author and local preview), then OVERRIDE with data-aue-prop values for
  // the fields that reliably have them (id, customClass, linkText, subtitle,
  // description, ariaLabel). This gives consistent results everywhere.
  //
  // Doc-mode layout versions (detected by div[2] anchor presence):
  //
  // V3 / V2b — div[2] has NO anchor (cookieConsentLink boolean at [2]):
  //  0:id  1:customClass  2:cookieConsentLink  3:link  4:openInNewTab
  //  5:linkText  6:subtitle  7:description  8:categoryTags
  //  9:iconType  10:fontIcon  11:imageIcon  12:iconPosition  13:iconLink
  //  14:enableConfirmationModal  15:confirmationModalType  16:modalId
  //  17:language  18:ariaLabel
  //  (V2b = 18 divs, ariaLabel row may be absent — ct(18) returns '' safely)
  //
  // V2a — div[2] HAS anchor (link field at [2], no categoryTags row):
  //  0:id  1:customClass  2:link  3:openInNewTab  4:cookieConsentLink
  //  5:linkText  6:subtitle  7:description
  //  8:iconType  9:fontIcon  10:imageIcon  11:iconPosition  12:iconLink
  //  13:enableConfirmationModal  14:confirmationModalType  15:modalId
  //  16:language  17:ariaLabel
  //
  // categoryTags detection: AEM tag paths always contain ':' and '/'
  // (e.g. "corporate:abbvie-com-2/category-types/media"). We scan divs 7-9
  // so items missing the description row are handled correctly.
  const rows = [...itemEl.querySelectorAll(':scope > div')];
  const ct = (i) => rows[i]?.textContent?.trim() || '';
  const cl = (i) => rows[i]?.querySelector('a')?.getAttribute('href') || ct(i);
  const ch = (i) => rows[i]?.innerHTML?.trim() || '';

  const isV2a = !!rows[2]?.querySelector('a');

  let docConfig;

  if (!isV2a) {
    // V3 / V2b path
    const anchorEl = rows[3]?.querySelector('a');
    const resolvedLinkText = ct(5)
      || anchorEl?.getAttribute('title')
      || anchorEl?.textContent?.trim()
      || '';

    // Content-aware categoryTags detection: scan divs 7-9 for AEM tag path.
    // AEM taxonomy paths always contain both ':' and '/' e.g.
    // "corporate:abbvie-com-2/category-types/media".
    // If no tag is found, check whether div[8] is a known iconType value
    // ('font', 'image', 'none') — if so, categoryTags row is absent and
    // iconType sits at [8], so tagsIdx should be 7 (iconTypeIdx = 8).
    // Otherwise fall back to tagsIdx=8 (categoryTags present but empty).
    const ICON_TYPE_VALUES = new Set(['font', 'image', 'none']);
    const tagsSearch = (() => {
      for (let i = 7; i <= 9; i += 1) {
        const val = ct(i);
        if (val && val.includes(':') && val.includes('/')) {
          return { idx: i, val };
        }
      }
      // No tag signature found — if div[8] is a known iconType value,
      // the categoryTags row is absent and tagsIdx should be 7
      const div8 = ct(8).toLowerCase();
      if (ICON_TYPE_VALUES.has(div8)) {
        return { idx: 7, val: '' };
      }
      // categoryTags row present but empty
      return { idx: 8, val: ct(8) };
    })();

    const tagsIdx = tagsSearch.idx;
    const categoryTagsVal = tagsSearch.val.toLowerCase() === 'none' ? '' : tagsSearch.val;
    // description is at div[7] only when tagsIdx > 7
    const descriptionVal = tagsIdx > 7 ? ch(7) : '';

    // All fields after categoryTags cascade from tagsIdx
    const iconTypeIdx = tagsIdx + 1;
    const fontIconIdx = tagsIdx + 2;
    const imageIconIdx = tagsIdx + 3;
    const iconPositionIdx = tagsIdx + 4;
    const iconLinkIdx = tagsIdx + 5;
    const enableConfModalIdx = tagsIdx + 6;
    const confModalTypeIdx = tagsIdx + 7;
    const modalIdIdx = tagsIdx + 8;
    const languageIdx = tagsIdx + 9;
    const ariaLabelIdx = tagsIdx + 10;

    const imageIconSrc = rows[imageIconIdx]?.querySelector('img')?.getAttribute('src')
      || cl(imageIconIdx);

    docConfig = {
      id: ct(0),
      customClass: ct(1),
      cookieConsentLink: parseBool(ct(2), false),
      link: cl(3),
      openInNewTab: parseBool(ct(4), false),
      linkText: resolvedLinkText,
      subtitle: ct(6),
      description: descriptionVal,
      categoryTags: categoryTagsVal,
      iconType: ct(iconTypeIdx) || 'none',
      fontIcon: ct(fontIconIdx),
      imageIcon: imageIconSrc,
      iconPosition: ct(iconPositionIdx) || 'before',
      iconLink: cl(iconLinkIdx),
      enableConfirmationModal: parseBool(ct(enableConfModalIdx), false),
      confirmationModalType: ct(confModalTypeIdx) || 'standard',
      modalId: ct(modalIdIdx),
      language: ct(languageIdx) || 'lang:none',
      ariaLabel: ct(ariaLabelIdx),
    };
  } else {
    // V2a path — link at [2], no categoryTags row
    const anchorEl = rows[2]?.querySelector('a');
    const resolvedLinkText = ct(5)
      || anchorEl?.getAttribute('title')
      || anchorEl?.textContent?.trim()
      || '';
    const imageIconSrc = rows[10]?.querySelector('img')?.getAttribute('src') || cl(10);

    docConfig = {
      id: ct(0),
      customClass: ct(1),
      cookieConsentLink: parseBool(ct(4), false),
      link: cl(2),
      openInNewTab: parseBool(ct(3), false),
      linkText: resolvedLinkText,
      subtitle: ct(6),
      description: ch(7),
      categoryTags: '',
      iconType: ct(8) || 'none',
      fontIcon: ct(9),
      imageIcon: imageIconSrc,
      iconPosition: ct(11) || 'before',
      iconLink: cl(12),
      enableConfirmationModal: parseBool(ct(13), false),
      confirmationModalType: ct(14) || 'standard',
      modalId: ct(15),
      language: ct(16) || 'lang:none',
      ariaLabel: ct(17),
    };
  }

  // ── UE prop overrides ──────────────────────────────────────────────────────
  // Only override fields that reliably have data-aue-prop in the author DOM:
  // text, richtext, and aem-content fields. Select/boolean/aem-tag/reference
  // fields often render without data-aue-prop so we keep the doc-mode values.
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

  // Apply UE overrides only when the prop element actually exists (non-null)
  const id = ueText('id') ?? docConfig.id;
  const customClass = ueText('customClass') ?? docConfig.customClass;
  const ariaLabel = ueText('ariaLabel') ?? docConfig.ariaLabel;
  const subtitle = ueText('subtitle') ?? docConfig.subtitle;
  const description = ueHtml('description') ?? docConfig.description;

  // linkText: in author DOM the link anchor carries data-aue-prop="linkText"
  // instead of a separate div — extract text from it
  const ueLinkTextEl = itemEl.querySelector(
    '[data-aue-prop="linkText"], [data-aue-prop="link"]',
  );
  const linkText = ueLinkTextEl
    ? ueLinkTextEl.textContent.trim() || docConfig.linkText
    : docConfig.linkText;

  // link href: the anchor with data-aue-prop="linkText" also carries the href
  const ueLinkHref = ueHref('link');
  const link = ueLinkHref
    ?? (ueLinkTextEl
      ? ueLinkTextEl.getAttribute('href')
        || ueLinkTextEl.closest('a')?.getAttribute('href')
        || docConfig.link
      : docConfig.link);

  // imageIcon: reference fields may resolve via resolveImageReference()
  const ueImageIcon = itemEl
    .querySelector('[data-aue-prop="imageIcon"] img')
    ?.getAttribute('src') || ueHref('imageIcon');
  const imageIcon = ueImageIcon ?? docConfig.imageIcon;

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

// Returns the number of parent-block config rows for this block instance.
// The ariaLabel field (row 17) was added to the model later — blocks authored
// before that change only have 16 config rows (rows 0–15 + language at 16
// but no ariaLabel). We detect this by checking whether the candidate row[17]
// looks like a config row (single inner div) or an item row (multiple inner divs).
function getConfigRowCount(block) {
  const allChildren = [...block.children].filter(
    (r) => !r.classList.contains('linklist-item')
      && !r.dataset.aueResource?.includes('linklist-item')
      && !r.hasAttribute('data-aue-prop'),
  );
  const row17 = allChildren[17];
  if (!row17) return 17;
  // An item always has multiple inner child divs; a config row has exactly one
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
    // A real item must have a link anchor, or a path/URL at the expected
    // link position (div[2] for V2a, div[3] for V3/V2b).
    // This filters out ghost rows AEM sometimes appends after items.
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
            /* quota */
          }
        }
      }
    } catch (_e) {
      /* network errors are non-fatal */
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

  // Date display is independent of sort order — always show the published
  // date, falling back to last modified if published is not available.
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
      categoryTags: cfg.enableTags
        ? String(
          page['cq-tags']
              || page['cq:tags']
              || page.cqTags
              || page.tags
              || page.tagNames
              || page.categoryTags
              || '',
        )
        : '',
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

function buildFontIcon(fontIcon) {
  if (!fontIcon) return null;
  const raw = fontIcon.trim();
  let cls;
  const colonMatch = raw.match(/^:([a-z0-9-]+):$/i);
  if (colonMatch) {
    cls = `icon-abbvie-${colonMatch[1]}`;
  } else if (raw.startsWith('icon-abbvie-')) {
    cls = raw;
  } else if (raw.startsWith('icon-')) {
    cls = `icon-abbvie-${raw.slice('icon-'.length)}`;
  } else if (!raw.includes(' ')) {
    cls = `icon-abbvie-${raw}`;
  } else {
    cls = raw;
  }
  const wrap = document.createElement('span');
  wrap.className = 'linklist-item-icon linklist-item-icon--font';
  wrap.setAttribute('aria-hidden', 'true');
  const inner = document.createElement('span');
  inner.className = cls;
  wrap.append(inner);
  return wrap;
}

function buildImageIcon(src) {
  if (!src) return null;
  const wrap = document.createElement('span');
  wrap.className = 'linklist-item-icon linklist-item-icon--image';
  const img = document.createElement('img');
  img.src = src;
  img.alt = '';
  img.setAttribute('role', 'presentation');
  wrap.append(img);
  return wrap;
}

function buildTags(rawTags) {
  const tags = rawTags
    .split(',')
    .map((t) => {
      const trimmed = t.trim();
      const stripped = trimmed.includes('/')
        ? trimmed.split('/').pop()
        : trimmed.replace(/^[^:]+:/, '');
      return stripped.replace(/-/g, ' ').trim();
    })
    .filter((label) => label && label.toLowerCase() !== 'none');

  if (!tags.length) return null;

  const ul = document.createElement('ul');
  ul.className = 'linklist-item-tags';
  ul.setAttribute('aria-label', 'Tags');
  tags.forEach((label) => {
    const li = document.createElement('li');
    li.className = 'linklist-item-tag';
    li.textContent = label.charAt(0).toUpperCase() + label.slice(1);
    ul.append(li);
  });
  return ul;
}

function bindLinkBehavior(anchor, item) {
  // ── Cookie Consent ──────────────────────────────────────────────────────
  if (item.cookieConsentLink) {
    // Convert anchor to button-like element — no navigation occurs
    anchor.removeAttribute('href');
    anchor.setAttribute('role', 'button');
    anchor.tabIndex = 0; // restore tab stop lost when href removed
    anchor.dataset.cookieConsent = 'true';
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

  // ── Confirmation Modal ───────────────────────────────────────────────────
  if (item.enableConfirmationModal && item.modalId) {
    const dest = anchor.getAttribute('href') || '';
    if (!dest || dest === '#') return;

    // Set target upfront so right-click → open in new tab works correctly
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
      // Stop propagation so the document-level autolinkModals handler does
      // not also open the modal without our onConfirm callback.
      e.stopPropagation();
      try {
        const { openModal } = await import(
          `${window.hlx.codeBasePath}/blocks/modal/modal.js`
        );
        // openModal loads the fragment and calls createModal internally.
        // createModal wires [data-modal-action="confirm"] clicks to onConfirm.
        // However, XWalk plain.html renders EDS buttons as <em> (secondary)
        // and <strong> (primary) anchors with no data-modal-action attributes.
        // We post-process the rendered dialog to stamp the correct actions
        // onto the buttons so createModal's delegation fires correctly.
        await openModal(item.modalId, {
          onConfirm: navigate,
          modalType: item.confirmationModalType || 'standard',
        });
        // After openModal renders, find the dialog and stamp button actions.
        // Primary button (<strong> anchor) = Confirm → triggers onConfirm.
        // Secondary button (<em> anchor) = Cancel → closes dialog.
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

  // ── Standard open in new tab ─────────────────────────────────────────────
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

function buildListItem(item, variant) {
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
    iconEl = buildFontIcon(item.fontIcon);
  } else if (item.iconType === 'image' && item.imageIcon) {
    iconEl = buildImageIcon(item.imageIcon);
  }

  const wrapIconLink = (node) => {
    if (!node || !item.iconLink || item.cookieConsentLink) return node;
    const a = document.createElement('a');
    a.className = 'linklist-icon-link';
    a.href = item.iconLink;
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
    anchor.href = item.link || '#';
  }
  anchor.textContent = item.linkText || item.link || '';
  if (item.ariaLabel) anchor.setAttribute('aria-label', item.ariaLabel);
  bindLinkBehavior(anchor, item);

  const row = document.createElement('div');
  row.className = 'linklist-item-row';

  const effectiveIconPosition = variant === 'icons' ? 'after' : item.iconPosition || 'before';

  if (iconEl && effectiveIconPosition !== 'after') row.append(wrapIconLink(iconEl));
  row.append(anchor);
  if (iconEl && effectiveIconPosition === 'after') row.append(wrapIconLink(iconEl));

  body.append(row);

  if (item.subtitle) {
    const sub = document.createElement('p');
    sub.className = 'linklist-item-subtitle';
    sub.textContent = item.subtitle;
    body.append(sub);
  }

  if (item.description) {
    const desc = document.createElement('div');
    desc.className = 'linklist-item-description';
    desc.innerHTML = sanitizeRichtext(item.description);
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
    const tagsEl = buildTags(item.categoryTags);
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

export default async function decorate(block) {
  const rootPath = getMetadata('root-path') || '';

  if (carouselROMap.has(block)) {
    carouselROMap.get(block).disconnect();
    carouselROMap.delete(block);
  }

  const cfg = readParentConfig(block);

  // In the author instance, id and customClass may have data-aue-prop on their
  // inner elements even when ueMode is false (partial prop rendering). Always
  // do a fresh DOM read for these two so the latest authored values are used.
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

  // Use dynamic config row count to correctly hide config rows vs item rows
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
    if (variant !== 'icons' || !cfg.fontIcon) return item;
    return {
      ...item,
      iconType: 'font',
      fontIcon: cfg.fontIcon,
    };
  };

  if (src === 'child-pages') {
    childPageResult.items.forEach((data) => {
      list.append(buildListItem(applyBlockIcon(data), variant));
    });
  } else {
    itemEls.forEach((el, i) => {
      if (!itemConfigs[i]) return;
      const li = buildListItem(applyBlockIcon(itemConfigs[i]), variant);
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

  if (variant === 'carousel' && list.children.length > 0) {
    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'linklist-carousel-prev';
    prev.setAttribute('aria-label', 'Scroll links left');

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'linklist-carousel-next';
    next.setAttribute('aria-label', 'Scroll links right');

    const scrollAmt = () => Math.min(list.clientWidth * 0.85, 320);
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

    const syncControls = () => {
      const overflows = list.scrollWidth > list.clientWidth + 1;
      controls.style.display = overflows ? '' : 'none';
    };

    requestAnimationFrame(syncControls);

    const ro = new ResizeObserver(syncControls);
    ro.observe(list);
    carouselROMap.set(block, ro);
  }
}
