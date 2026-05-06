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

/**
 * Decorate the block with a lang attribute if a paragraph with "lang:xx" is found
 * The paragraph will be removed from the DOM after processing
 * @param {Element} block The block element to decorate
 */
export function decorateLangAttribute(block) {
  [...block.children].forEach((row) => {
    const p = row.querySelector('[data-aue-prop]') || row.querySelector('p');
    if (p) {
      const val = p.textContent.trim();
      if (val && val !== 'none' && val.startsWith('lang:')) {
        const lang = val.substring(5);
        if (lang && lang !== 'none') {
          block.setAttribute('lang', lang);
        }
        row.remove();
      }
    }
  });
}

// Prefix-to-attribute mapping — easy to extend with new prefixes
const COMMON_PROP_HANDLERS = {
  'lang:': (block, val) => {
    const lang = val.slice(5);
    if (lang && lang !== 'none') block.setAttribute('lang', lang);
  },
  'id:': (block, val) => {
    const id = val.slice(3);
    if (id && id !== 'none') block.setAttribute('id', id);
  },
};

/**
 * Process common authorable properties encoded as prefixed text rows.
 * Supported prefixes: lang:<code>, id:<value>
 *
 * Note: customClass uses classes_ prefix and is handled automatically
 * by the framework — no JS needed.
 *
 * @param {Element} block - The block element
 */
export function applyCommonProps(block) {
  [...block.children].forEach((row) => {
    const p = row.querySelector('[data-aue-prop]') || row.querySelector('p');
    if (!p) return;

    const val = p.textContent.trim();
    if (!val || val === 'none') return;

    const prefix = Object.keys(COMMON_PROP_HANDLERS).find((k) => val.startsWith(k));
    if (prefix) {
      COMMON_PROP_HANDLERS[prefix](block, val);
      row.remove();
    }
  });
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
