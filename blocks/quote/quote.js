import { fetchDashboardCardData } from '../../scripts/cfUtil.js';
import { getConfigValue } from '../../scripts/config.js';
import { loadFragment } from '../fragment/fragment.js';
import { applyCommonProps } from '../../scripts/utils.js';

// Row index map — mirrors field order in _quote.json (tabs are UI-only, not rows)
// Row  0: quoteType
// Row  1: quotation
// Row  2: attributionName
// Row  3: attributionTitle
// Row  4: attributionImage
// Row  5: quoteFragment
// Row  6: backgroundImage
// Row  7: backgroundImageAlt
// Row  8: classes_theme          (CSS class — no JS handling)
// Row  9: classes_contentAlignment (CSS class — no JS handling)
// Row 10: classes_contentWidth   (CSS class — no JS handling)
// Row 11: blockId                (handled by applyCommonProps)
// Row 12: classes_commonCustomClass (handled by applyCommonProps)
// Row 13: language
// Row 14: analyticsInteractionId
const ROW = {
  QUOTE_TYPE: 0,
  QUOTATION: 1,
  ATTRIBUTION_NAME: 2,
  ATTRIBUTION_TITLE: 3,
  ATTRIBUTION_IMAGE: 4,
  QUOTE_FRAGMENT: 5,
  BACKGROUND_IMAGE: 6,
  BACKGROUND_IMAGE_ALT: 7,
  LANGUAGE: 13,
  ANALYTICS_ID: 14,
};

/**
 * Reads a row's first cell content as text.
 * @param {Element} row
 * @returns {string}
 */
function getCellText(row) {
  return row?.firstElementChild?.textContent?.trim() || '';
}

/**
 * Normalizes an AEM content path for EDS delivery.
 * Strips rootPath prefix and .html extension so loadFragment can resolve it.
 * @param {string} rawPath
 * @returns {Promise<string>}
 */
async function normalizePath(rawPath) {
  let path = rawPath;

  // Handle full URLs — extract pathname
  if (path.startsWith('http')) {
    try {
      path = new URL(path).pathname;
    } catch (e) {
      // not a valid URL, use as-is
    }
  }

  // Strip rootPath prefix (e.g. /content/abbvie-nextgen-eds/corporate/...)
  try {
    const rootPath = await getConfigValue('rootPath');
    if (rootPath && path.startsWith(rootPath)) {
      path = `/${path.substring(rootPath.length)}`;
    }
  } catch (e) {
    // config not available, skip normalization
  }

  // Strip .html extension
  return path.replace(/\.html$/, '');
}

/**
 * Decorates a simple imported quote (2-row format: quotation + attribution).
 * Row 0 = quotation richtext, Row 1 = attribution (em name + title paragraph).
 * @param {Element[]} rows - block rows
 * @param {string} lang
 * @returns {HTMLElement}
 */
function decorateSimpleQuote(rows) {
  const blockquote = document.createElement('blockquote');
  // if (lang) blockquote.setAttribute('lang', lang);
  applyCommonProps(blockquote);

  // Row 0: quotation
  const quotationCell = rows[0]?.firstElementChild;
  if (quotationCell && quotationCell.textContent.trim()) {
    const quotation = document.createElement('div');
    quotation.className = 'quote-quotation';
    quotation.append(...quotationCell.childNodes);
    blockquote.append(quotation);
  }

  // Row 1: attribution (name in <em>, title in next <p>)
  const attrCell = rows[1]?.firstElementChild;
  if (attrCell) {
    const em = attrCell.querySelector('em');
    const nameText = em?.textContent?.trim() || '';
    const paragraphs = attrCell.querySelectorAll('p');
    const titleText = paragraphs.length > 1 ? paragraphs[1].textContent.trim() : '';

    if (nameText || titleText) {
      const attribution = document.createElement('div');
      attribution.className = 'quote-attribution';
      const textWrapper = document.createElement('div');
      textWrapper.className = 'quote-attribution-text';

      if (nameText) {
        const nameEl = document.createElement('p');
        nameEl.className = 'quote-attribution-name';
        nameEl.textContent = nameText;
        textWrapper.append(nameEl);
      }
      if (titleText) {
        const titleEl = document.createElement('cite');
        titleEl.className = 'quote-attribution-title';
        titleEl.textContent = titleText;
        textWrapper.append(titleEl);
      }

      attribution.append(textWrapper);
      blockquote.append(attribution);
    }
  }

  return blockquote;
}

/**
 * Decorates the basic (regular) quote mode with inline content.
 * @param {Element[]} rows - all block rows
 * @param {string} lang
 * @returns {HTMLElement}
 */
function decorateBasicQuote(rows) {
  const blockquote = document.createElement('blockquote');
  // if (lang) blockquote.setAttribute('lang', lang);
  applyCommonProps(blockquote);

  // Quotation (richtext)
  const quotationCell = rows[ROW.QUOTATION]?.firstElementChild;
  if (quotationCell && quotationCell.textContent.trim()) {
    const quotation = document.createElement('div');
    quotation.className = 'quote-quotation';
    quotation.append(...quotationCell.childNodes);
    blockquote.append(quotation);
  }

  // Attribution fields
  const nameText = getCellText(rows[ROW.ATTRIBUTION_NAME]);
  const titleText = getCellText(rows[ROW.ATTRIBUTION_TITLE]);
  const picture = rows[ROW.ATTRIBUTION_IMAGE]?.querySelector('picture');

  if (nameText || titleText || picture) {
    const attribution = document.createElement('div');
    attribution.className = 'quote-attribution';

    if (picture) {
      const avatarWrapper = document.createElement('div');
      avatarWrapper.className = 'quote-attribution-image';
      avatarWrapper.append(picture);
      attribution.append(avatarWrapper);
    }

    const textWrapper = document.createElement('div');
    textWrapper.className = 'quote-attribution-text';

    if (nameText) {
      const nameEl = document.createElement('p');
      nameEl.className = 'quote-attribution-name';
      nameEl.textContent = nameText;
      textWrapper.append(nameEl);
    }

    if (titleText) {
      const titleEl = document.createElement('cite');
      titleEl.className = 'quote-attribution-title';
      titleEl.textContent = titleText;
      textWrapper.append(titleEl);
    }

    attribution.append(textWrapper);
    blockquote.append(attribution);
  }

  return blockquote;
}

/**
 * Renders Content Fragment JSON data into a blockquote element.
 * @param {HTMLElement} blockquote
 * @param {object} cfData - CF model JSON response
 */
function renderCFContent(blockquote, cfData) {
  const elements = cfData.elements || {};
  const entries = Object.entries(elements);

  let quoteHtml = '';
  const plainTexts = [];

  entries.forEach(([, el]) => {
    if (!el.value) return;
    if (!quoteHtml && (el[':type'] === 'text/html' || el.dataType === 'html')) {
      quoteHtml = el.value;
    } else if (typeof el.value === 'string' && el.value.length < 200) {
      plainTexts.push(el.value);
    }
  });

  if (quoteHtml) {
    const quotation = document.createElement('div');
    quotation.className = 'quote-quotation';
    quotation.innerHTML = quoteHtml;
    blockquote.append(quotation);
  }

  if (plainTexts.length > 0) {
    const attribution = document.createElement('div');
    attribution.className = 'quote-attribution';
    const textWrapper = document.createElement('div');
    textWrapper.className = 'quote-attribution-text';

    const [cfName, cfTitle] = plainTexts;
    const nameEl = document.createElement('p');
    nameEl.className = 'quote-attribution-name';
    nameEl.textContent = cfName;
    textWrapper.append(nameEl);

    if (cfTitle) {
      const titleEl = document.createElement('cite');
      titleEl.className = 'quote-attribution-title';
      titleEl.textContent = cfTitle;
      textWrapper.append(titleEl);
    }

    attribution.append(textWrapper);
    blockquote.append(attribution);
  }
}

/**
 * Renders dashboard card quote GraphQL data into a blockquote element.
 * @param {HTMLElement} blockquote
 * @param {object} quoteData - GraphQL response from dashboardCardQuoteFragmentByPath
 */
function renderCfQuote(blockquote, quoteData) {
  const item = quoteData?.data?.dashboardCardQuoteFragmentByPath?.item;
  if (!item) return;

  const {
    quoteText,
    attributionName,
    attributionTitle,
    image,
  } = item;

  if (quoteText) {
    const quotation = document.createElement('div');
    quotation.className = 'quote-quotation';
    quotation.textContent = quoteText;
    blockquote.append(quotation);
  }

  if (attributionName || attributionTitle || image) {
    const attribution = document.createElement('div');
    attribution.className = 'quote-attribution';
    const { _publishUrl: publishUrl, altText } = image || {};
    if (publishUrl) {
      const avatarWrapper = document.createElement('div');
      avatarWrapper.className = 'quote-attribution-image';
      const img = document.createElement('img');
      img.src = publishUrl;
      img.alt = altText || attributionName || '';
      avatarWrapper.append(img);
      attribution.append(avatarWrapper);
    }

    const textWrapper = document.createElement('div');
    textWrapper.className = 'quote-attribution-text';

    if (attributionName) {
      const nameEl = document.createElement('p');
      nameEl.className = 'quote-attribution-name';
      nameEl.textContent = attributionName;
      textWrapper.append(nameEl);
    }

    if (attributionTitle) {
      const titleEl = document.createElement('cite');
      titleEl.className = 'quote-attribution-title';
      titleEl.textContent = attributionTitle;
      textWrapper.append(titleEl);
    }

    attribution.append(textWrapper);
    blockquote.append(attribution);
  }
}

/**
 * Decorates the content fragment quote mode.
 * Tries page fragment loading first, then falls back to AEM CF JSON.
 * @param {Element[]} rows - all block rows
 * @param {string} lang
 * @returns {Promise<HTMLElement|null>}
 */
async function decorateFragmentQuote(rows) {
  // Extract the fragment reference path from the quoteFragment row
  const cell = rows[ROW.QUOTE_FRAGMENT]?.firstElementChild;
  let rawPath = '';

  if (cell) {
    const link = cell.querySelector('a');
    if (link) {
      rawPath = link.getAttribute('href');
    } else {
      const text = cell.textContent.trim();
      if (text && text.startsWith('/')) {
        rawPath = text;
      }
    }
  }

  if (!rawPath) return null;
  const blockquote = document.createElement('blockquote');
  blockquote.className = 'quote-fragment';

  // if (lang) blockquote.setAttribute('lang', lang);
  applyCommonProps(blockquote);

  // Try loading as a page fragment (normalized path)
  try {
    const path = await normalizePath(rawPath);
    const quoteData = await fetchDashboardCardData(path, 'cfBaseUrl');
    renderCfQuote(blockquote, quoteData);
    if (blockquote.childNodes.length > 0) {
      return blockquote;
    }
    const fragment = await loadFragment(path);
    if (fragment) {
      const fragmentSection = fragment.querySelector(':scope .section');
      if (fragmentSection) {
        blockquote.append(...fragmentSection.childNodes);
      }
      return blockquote;
    }
  } catch (e) {
    // page fragment loading failed, try CF fallback
  }

  // Fallback: try AEM Content Fragment JSON endpoint
  try {
    const cfPath = rawPath.replace(/\.html$/, '');
    const resp = await fetch(`${cfPath}.model.json`);
    if (resp.ok) {
      const cfData = await resp.json();
      renderCFContent(blockquote, cfData);
      if (blockquote.childNodes.length > 0) return blockquote;
    }
  } catch (e) {
    // CF JSON fetch failed
  }

  return null;
}

/**
 * Quote Block — supports Regular (inline) and Content Fragment modes
 * with an optional background image.
 * @param {Element} block
 */
export default async function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  // Detect simple imported format (2 rows: quotation + attribution)
  // vs xwalk model (many rows starting with quoteType selector)
  const isSimpleFormat = rows.length <= 2;
  const quoteType = isSimpleFormat ? 'basic' : getCellText(rows[ROW.QUOTE_TYPE]) || 'basic';
  // const lang = isSimpleFormat ? 'en' : getCellText(rows[ROW.LANGUAGE]) || 'en';
  // Background image (shared by both modes)
  let bgPicture = isSimpleFormat ? null : rows[ROW.BACKGROUND_IMAGE]?.querySelector('picture');
  // const bgAlt = isSimpleFormat ? '' : getCellText(rows[ROW.BACKGROUND_IMAGE_ALT]);

  let blockquote = null;
  try {
    if (isSimpleFormat) {
      blockquote = decorateSimpleQuote(rows);
    } else if (quoteType === 'content-fragment') {
      blockquote = await decorateFragmentQuote(rows);
    } else {
      blockquote = decorateBasicQuote(rows);
    }
  } catch (e) {
    // Decoration failed — ensure block is still cleaned up below
  }
  applyCommonProps(blockquote);
  block.textContent = '';

  // Look for background image in preceding default content (imported pattern:
  // the section has a standalone <p><img> before the quote block)
  if (!bgPicture) {
    const wrapper = block.closest('.quote-wrapper');
    const prev = wrapper?.previousElementSibling;
    if (prev?.classList.contains('default-content-wrapper')) {
      const img = prev.querySelector('img');
      if (img && prev.children.length === 1) {
        bgPicture = prev.querySelector('picture') || img;
        // bgAlt = img.getAttribute('alt') || '';
        prev.remove();
      }
    }
  }

  // Add background image if authored
  if (bgPicture) {
    block.classList.add('quote-has-background');
    const bgWrapper = document.createElement('div');
    bgWrapper.className = 'quote-background-image';
    bgWrapper.append(bgPicture);
    block.append(bgWrapper);
  }

  if (blockquote) {
    const quoteDiv = document.createElement('div');
    quoteDiv.classList.add('quote-innercontainer');
    quoteDiv.append(blockquote);
    block.append(quoteDiv);
  }
}
