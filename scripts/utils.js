const INTERNAL_EXTERNAL_LINK_WHITELIST = [
  'https://www.abbvie.com',
  'https://abbv.ie',
  'https://privacy.abbvie',
  'https://careers.abbvie.com',
];

function isExternalLink(url) {
  try {
    const linkUrl = new URL(url, window.location.origin);
    return linkUrl.origin !== window.location.origin
           && !url.startsWith('/')
           && !INTERNAL_EXTERNAL_LINK_WHITELIST.some((domain) => url.startsWith(domain));
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
 * Detect if running in Universal Editor environment
 * Universal Editor loads pages in an iframe within the author environment
 * @returns {boolean} True if running in Universal Editor
 */
export const isUniversalEditor = () => isAuthorEnvironment();

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
