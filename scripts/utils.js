const INTERNAL_EXTERNAL_LINK_WHITELIST = [
  'https://www.abbvie.com',

];

export function isExternalLink(url) {
  try {
    const linkUrl = new URL(url, window.location.origin);
    return (
      linkUrl.origin !== window.location.origin
      && !url.startsWith('/')
      && !INTERNAL_EXTERNAL_LINK_WHITELIST.some((domain) => linkUrl.origin === domain)
    );
  } catch {
    return false;
  }
}

export default function decorateExternalLinksUtility(container) {
  const anchors = container.querySelectorAll('a');
  anchors.forEach((link) => {
    if (isExternalLink(link.href)) {
      link.classList.add('external-link');
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
  });
}

export function isEditor() {
  return window.document.querySelector('.adobe-ue-edit') !== null;
}

export function isAuthorEnvironment() {
  if (window?.location?.origin?.includes('author')) {
    return true;
  }
  return false;
}

/**
 * Detect if running in Universal Editor environment.
 * Checks author origin, UE resource attribute on <html>, and ?aue query param.
 * @returns {boolean} True if running in Universal Editor
 */
export function isUniversalEditor() {
  if (isAuthorEnvironment()) return true;
  if (document.documentElement.hasAttribute('data-aue-resource')) return true;
  try {
    if (new URLSearchParams(window.location.search).has('aue')) return true;
  } catch {
    /* ignore */
  }
  return false;
}

// Prefix-to-attribute mapping — easy to extend with new prefixes
/**
 * Apply common authorable properties from positional rows.
 * Reads 3 consecutive rows starting at startIndex:
 *   startIndex + 0 = blockId (applied as block.id)
 *   startIndex + 1 = language (applied as block lang attribute)
 *   startIndex + 2 = analyticsId (applied as data-analytics-id)
 *
 * Removes the consumed rows from the DOM.
 * Note: classes_commonCustomClass is handled by the framework — no JS needed.
 *
 * @param {Element} block - The block element
 * @param {number} startIndex - Row index where common props start
 */
export function applyCommonProps(block, startIndex) {
  const rows = [...block.children];
  const idRow = rows[startIndex];
  const langRow = rows[startIndex + 1];
  const analyticsRow = rows[startIndex + 2];

  const getText = (row) => row?.querySelector('div')?.textContent?.trim()
    || row?.textContent?.trim() || '';

  const idVal = getText(idRow);
  const langVal = getText(langRow);
  const analyticsVal = getText(analyticsRow);

  if (idVal && idVal !== 'none') block.setAttribute('id', idVal);
  if (langVal && langVal !== 'none') block.setAttribute('lang', langVal);
  if (analyticsVal && analyticsVal !== 'none') {
    block.setAttribute('data-analytics-id', analyticsVal);
  }

  [analyticsRow, langRow, idRow]
    .filter(Boolean)
    .forEach((row) => row.remove());
}

export function isUEEditMode() {
  return document.documentElement.classList.contains('adobe-ue-edit');
}

export function isUEPreviewMode() {
  return document.documentElement.classList.contains('adobe-ue-preview');
}

export function isUEAuthorSurface() {
  return isUEEditMode() || isUEPreviewMode();
}

/**
 * Run on preview + live, but NOT on UE edit mode
 */
export function shouldRunOutsideAuthorEdit() {
  return !isUEEditMode();
}

/**
 * Run only on true site delivery surfaces, NOT in UE edit/preview
 */
export function shouldRunOutsideAllUESurfaces() {
  return !isUEAuthorSurface();
}

/**
 * Helper to add additional classes to an element
 * @param {HTMLElement} element - The element to add classes to
 * @param {string|string[]} classes - Classes to add (string or array)
 */
function addIconClasses(element, classes) {
  if (!classes) return;
  const classesToAdd = Array.isArray(classes)
    ? classes
    : classes.split(/\s+/).filter(Boolean);
  classesToAdd.forEach((cls) => element.classList.add(cls));
}

/**
 * Helper to wrap an element in a container if wrapperClass is provided
 * @param {HTMLElement} element - The element to wrap
 * @param {string} wrapperClass - The class name for the wrapper
 * @returns {HTMLElement} The wrapped element or original element
 */
function wrapIconIfNeeded(element, wrapperClass) {
  if (!wrapperClass) return element;
  const wrapperSpan = document.createElement('span');
  wrapperSpan.className = wrapperClass;
  wrapperSpan.appendChild(element);
  return wrapperSpan;
}

/**
 * Creates an icon element with the Abbvie icon font or image.
 * Supports both font icons and image icons with a consistent API.
 *
 * @param {string|HTMLPictureElement} source - The icon source:
 *   For font icons: icon name in various formats:
 *     - ':clock:' → 'icon-abbvie-clock'
 *     - 'clock' → 'icon-abbvie-clock'
 *     - 'icon-abbvie-clock' → 'icon-abbvie-clock'
 *     - 'icon-clock' → 'icon-abbvie-clock'
 *   For image icons: image URL string or a <picture> element (from extractIconSource)
 *
 * @param {string} type - Icon type (required):
 *   - 'icon-font' - SVG font icon (rendered by decorateIcons via span.icon class)
 *   - 'image'     - Authored image (URL string or cloned <picture> element)
 *   - 'svg'       - Local SVG from /icons/ directory, rendered inline without decorateIcons
 *
 * @param {Object} options - Optional configuration
 * @param {string|string[]} options.additionalClasses - Extra CSS classes to add
 * @param {boolean} options.ariaHidden - Whether to set aria-hidden (default: true)
 * @param {string} options.wrapperClass - Class name for wrapper element (if provided, icon will be wrapped)
 *
 * @returns {HTMLElement} The icon element (or wrapper if wrapperClass is provided)
 *
 * @example
 * // Font icon - simple usage
 * const clockIcon = createIcon('clock', 'icon-font');
 *
 * @example
 * // Font icon with options
 * const chevron = createIcon('chevron-down', 'icon-font', {
 *   additionalClasses: 'my-custom-class'
 * });
 *
 * @example
 * // Font icon with wrapper
 * const plus = createIcon('plus', 'icon-font', {
 *   additionalClasses: 'button-icon',
 *   wrapperClass: 'icon-wrapper'
 * });
 *
 * @example
 * // Image icon
 * const searchIcon = createIcon('/path/to/icon.png', 'image');
 *
 * @example
 * // Image icon with options
 * const searchIcon = createIcon('/path/to/icon.png', 'image', {
 *   additionalClasses: 'search-icon'
 * });
 */
export function createIcon(source, type, options = {}) {
  if (!type || !['icon-font', 'image', 'svg'].includes(type)) {
    throw new Error('createIcon: type must be "icon-font", "image", or "svg"');
  }

  if (!source) return null;

  const {
    additionalClasses = '',
    ariaHidden = true,
    wrapperClass = '',
  } = options;

  // Handle image icons
  if (type === 'image') {
    const iconSpan = document.createElement('span');
    addIconClasses(iconSpan, additionalClasses);

    let pictureEl;
    if (source instanceof Element && source.tagName === 'PICTURE') {
      pictureEl = source.cloneNode(true);
    } else {
      pictureEl = document.createElement('picture');
      const img = document.createElement('img');
      img.src = source;
      pictureEl.appendChild(img);
    }

    const innerImg = pictureEl.querySelector('img');
    if (innerImg) {
      innerImg.alt = '';
      if (ariaHidden) innerImg.setAttribute('aria-hidden', 'true');
    }

    iconSpan.appendChild(pictureEl);
    return wrapIconIfNeeded(iconSpan, wrapperClass);
  }

  // Local SVG from /icons/ — rendered directly as <picture><img>, no decorateIcons needed.
  // Source is used as the exact filename; only colon notation is resolved:
  //   'search'        → /icons/search.svg
  //   'icon-search'   → /icons/icon-search.svg
  //   'abbvie-search' → /icons/abbvie-search.svg
  //   ':search:'      → /icons/search.svg
  if (type === 'svg') {
    const colonMatch = source.trim().match(/^:([a-z0-9-]+):$/i);
    const svgName = colonMatch ? colonMatch[1] : source.trim();

    const codeBasePath = window.hlx?.codeBasePath || '';

    const iconSpan = document.createElement('span');
    addIconClasses(iconSpan, additionalClasses);
    if (ariaHidden) iconSpan.setAttribute('aria-hidden', 'true');

    const pictureEl = document.createElement('picture');
    const img = document.createElement('img');
    img.src = `${codeBasePath}/icons/${svgName}.svg`;
    img.alt = '';
    img.loading = 'lazy';
    pictureEl.appendChild(img);
    iconSpan.appendChild(pictureEl);

    return wrapIconIfNeeded(iconSpan, wrapperClass);
  }

  // icon-font: normalize to 'icon-abbvie-*' — decorateIcons appends the SVG <img> later
  let normalizedClass = source.trim();
  const colonMatch = normalizedClass.match(/^:([a-z0-9-]+):$/i);
  if (colonMatch) {
    normalizedClass = `icon-abbvie-${colonMatch[1]}`;
  } else if (normalizedClass.startsWith('icon-abbvie-')) {
    // already correct
  } else if (normalizedClass.startsWith('icon-')) {
    normalizedClass = `icon-abbvie-${normalizedClass.slice('icon-'.length)}`;
  } else if (!normalizedClass.includes(' ')) {
    normalizedClass = `icon-abbvie-${normalizedClass}`;
  }
  // multi-class (spaces): leave as-is

  const iconSpan = document.createElement('span');
  iconSpan.className = `${normalizedClass}`;
  addIconClasses(iconSpan, additionalClasses);

  if (ariaHidden) {
    iconSpan.setAttribute('aria-hidden', 'true');
  }

  return wrapIconIfNeeded(iconSpan, wrapperClass);
}

/**
 * Extracts an icon source from an authoring cell element.
 * Returns a cloned <picture> element when one is present (preserving all source/srcset variants),
 * an href string for anchor-based references, or plain text as a fallback.
 *
 * @param {Element} cell - The authoring cell to extract from
 * @returns {HTMLPictureElement|string} Cloned picture element, URL string, or empty string
 *
 * @example
 * // Use with createIcon
 * const src = extractIconSource(cells[ROW.SEARCH_IMAGE_ICON]);
 * const icon = createIcon(src, 'image', { additionalClasses: 'search-icon' });
 */
export function extractIconSource(cell) {
  if (!cell) return '';

  const link = cell.querySelector('a[href]');
  if (link) return link.getAttribute('href');

  const picture = cell.querySelector('picture');
  if (picture) return picture.cloneNode(true);

  return cell.textContent?.trim() || '';
}

/**
 * Parses raw RSS XML and returns structured item objects.
 * @param {string} responseXml - Raw XML string from an RSS feed
 * @param {number} [numberOfItems=0] - Max items to return; 0 means no limit
 * @returns {{ title: string, link: string, pubDate: string, enclosureUrl: string, enclosureType: string }[]}
 */
export function parseRssFeed(responseXml, numberOfItems = 0) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(responseXml, 'application/xml');

  if (doc.querySelector('parsererror')) {
    // eslint-disable-next-line no-console
    console.error('Failed to parse RSS feed XML.');
    return [];
  }

  const getText = (item, selector) => item.querySelector(selector)?.textContent?.trim() || '';
  const getAttr = (item, selector, attr) => item.querySelector(selector)?.getAttribute(attr)?.trim() || '';

  const maxItems = numberOfItems > 0 ? numberOfItems : Infinity;
  return [...doc.querySelectorAll('item')]
    .map((item) => ({
      title: getText(item, 'title'),
      link: getText(item, 'link'),
      pubDate: getText(item, 'pubDate'),
      enclosureUrl: getAttr(item, 'enclosure', 'url'),
      enclosureType: getAttr(item, 'enclosure', 'type'),
    }))
    .filter((item) => item.link && item.title)
    .slice(0, maxItems);
}

/**
 * Fetches an RSS feed URL and returns the raw XML text.
 * @param {string} feedUrl - The RSS feed URL to fetch
 * @returns {Promise<string|null>} Raw XML string, or null on failure
 */
export async function fetchRssFeed(feedUrl) {
  try {
    const response = await fetch(feedUrl);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    if (error instanceof TypeError) {
      // eslint-disable-next-line no-console
      console.error('Network error - check CORS and URL validity:', error.message);
    } else {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch RSS feed:', error.message);
    }
    return null;
  }
}

const EDS_FOOTER_RETURN_SRC_SESSION_KEY = 'eds-footer-return-src-href';

let footerReturnScrollPageshowRegistered = false;

/**
 * When the user follows a same-tab link in the footer and later returns via
 * history (back button or BFCache), the browser restores scroll/focus on the
 * footer. Remember the page URL on footer link click and scroll to top + focus
 * main when that URL is shown again from history.
 * @param {PageTransitionEvent} pageshowEvent
 */
function restoreScrollAndFocusAfterFooterHistoryReturn(pageshowEvent) {
  let saved;
  try {
    saved = sessionStorage.getItem(EDS_FOOTER_RETURN_SRC_SESSION_KEY);
  } catch {
    return;
  }
  if (!saved) return;

  const navEntry = performance.getEntriesByType?.('navigation')?.[0];
  const fromHistory = pageshowEvent.persisted === true || navEntry?.type === 'back_forward';
  if (!fromHistory) return;
  if (saved !== window.location.href) return;

  try {
    sessionStorage.removeItem(EDS_FOOTER_RETURN_SRC_SESSION_KEY);
  } catch {
    /* ignore */
  }

  window.scrollTo(0, 0);

  const main = document.querySelector('main');
  if (main) {
    if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
    main.focus({ preventScroll: true });
  }
}

/**
 * Register once: after back/forward (including BFCache restore), optionally
 * reset scroll and focus when the user had left this URL via a footer link.
 */
export function initFooterReturnScrollOnHistoryRestore() {
  if (footerReturnScrollPageshowRegistered) return;
  footerReturnScrollPageshowRegistered = true;
  window.addEventListener('pageshow', (event) => {
    requestAnimationFrame(() => restoreScrollAndFocusAfterFooterHistoryReturn(event));
  });
}

/**
 * Mark sessionStorage when a footer anchor will navigate the same tab, so
 * {@link initFooterReturnScrollOnHistoryRestore} can return the user to the top.
 * @param {Element} footerBlock The decorated footer block element
 */
export function registerFooterSameTabNavigationMark(footerBlock) {
  footerBlock.addEventListener(
    'click',
    (e) => {
      const anchor = e.target.closest?.('a[href]');
      if (!anchor) return;
      if (anchor.target === '_blank') return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const hrefAttr = anchor.getAttribute('href')?.trim() || '';
      if (!hrefAttr || hrefAttr === '#' || hrefAttr.startsWith('#')) return;
      const hrefLower = hrefAttr.toLowerCase();
      if (hrefLower.startsWith('java'.concat('script:'))) return;
      if (hrefLower.startsWith('mailto:') || hrefLower.startsWith('tel:')) return;
      if (anchor.getAttribute('role') === 'button') return;
      if (anchor.classList.contains('ot-sdk-show-settings')) return;

      try {
        sessionStorage.setItem(EDS_FOOTER_RETURN_SRC_SESSION_KEY, window.location.href);
      } catch {
        /* storage unavailable */
      }
    },
    true,
  );
}
