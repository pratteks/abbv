import { fetchDashboardCardData } from '../../scripts/cfUtil.js';
import { getConfigValue } from '../../scripts/config.js';
import { applyCommonProps } from '../../scripts/utils.js';

/*
 * Row indices — must match the field order in _fact-card.json:
 *
 * 0  contentFragment         aem-content
 * 1  hideImage               boolean
 * 2  (classes_cardColor)      — handled by framework, not a row
 * 3  imagePreset             select
 * 4  imageModifiers          text
 * 5  analyticsInteractionId  text
 * 6+ common properties       — handled by framework (blockId, customClass, language)
 */
const ROW = {
  CONTENT_FRAGMENT: 0,
  HIDE_IMAGE: 1,
  IMAGE_PRESET: 2,
  IMAGE_MODIFIERS: 3,
  ANALYTICS_ID: 4,
};

/**
 * Reads a row's first cell content as text.
 */
function getCellText(row) {
  return row?.firstElementChild?.textContent?.trim() || '';
}

/**
 * Normalizes an AEM content path for CF fetching.
 * Strips rootPath prefix and .html extension.
 */
async function normalizePath(rawPath) {
  let path = rawPath;

  if (path.startsWith('http')) {
    try {
      path = new URL(path).pathname;
    } catch (e) {
      // not a valid URL, use as-is
    }
  }

  try {
    const rootPath = await getConfigValue('rootPath');
    if (rootPath && path.startsWith(rootPath)) {
      path = `/${path.substring(rootPath.length)}`;
    }
  } catch (e) {
    // config not available, skip normalization
  }

  return path.replace(/\.html$/, '');
}

/**
 * Fallback: render from generic CF elements structure (model.json format).
 */
function renderCfElementsFallback(card, elements, options = {}) {
  const content = document.createElement('div');
  content.className = 'fact-card-content';

  const entries = Object.entries(elements);
  const plainTexts = [];

  entries.forEach(([, el]) => {
    if (!el.value) return;
    if (typeof el.value === 'string') {
      plainTexts.push(el.value);
    }
  });

  // Map plain text values by position: eyebrow, dataPoint, suffix, description
  const [eyebrow, dataPoint, dataPointSuffix, description] = plainTexts;

  if (eyebrow) {
    const eyebrowEl = document.createElement('div');
    eyebrowEl.className = 'fact-card-eyebrow';
    eyebrowEl.setAttribute('role', 'heading');
    eyebrowEl.setAttribute('aria-level', '2');
    eyebrowEl.textContent = eyebrow;
    content.append(eyebrowEl);
  }

  if (dataPoint) {
    const dataContainer = document.createElement('div');
    dataContainer.className = 'fact-card-data';
    const dataEl = document.createElement('div');
    dataEl.className = 'fact-card-data-point';
    dataEl.textContent = dataPoint;
    dataContainer.append(dataEl);

    if (dataPointSuffix) {
      const suffixEl = document.createElement('div');
      suffixEl.className = 'fact-card-data-suffix';
      suffixEl.textContent = dataPointSuffix;
      dataContainer.append(suffixEl);
    }
    content.append(dataContainer);
  }

  if (description) {
    const descEl = document.createElement('div');
    descEl.className = 'fact-card-description';
    descEl.textContent = description;
    content.append(descEl);
  }

  if (!options.hideImage) {
    entries.forEach(([, el]) => {
      if (el.value && (el[':type']?.startsWith('image') || el.dataType === 'image')) {
        const img = document.createElement('img');
        img.className = 'fact-card-image';
        img.src = el.value;
        img.alt = '';
        img.loading = 'lazy';
        card.prepend(img);
      }
    });
  }

  card.append(content);
}

/**
 * Renders CF fact data into the fact card DOM.
 * Expected CF fields: eyebrow, dataPoint, dataPointSuffix, description, image
 * @param {HTMLElement} card - The card container
 * @param {object} cfData - GraphQL response
 * @param {object} options - hideImage, imageModifiers
 */
function renderCfFactCard(card, cfData, options = {}) {
  const item = cfData?.data?.dashboardCardFactFragmentByPath?.item
    || cfData?.data?.dashboardCardByPath?.item
    || cfData?.item
    || null;

  if (!item) {
    // Fallback: try generic elements approach (like quote CF fallback)
    const elements = cfData?.elements || {};
    if (Object.keys(elements).length > 0) {
      renderCfElementsFallback(card, elements, options);
      return;
    }
    return;
  }

  const {
    eyebrow,
    dataPoint,
    dataPointSuffix,
    description,
    image,
  } = item;

  // Image (if available and not hidden)
  if (image && !options.hideImage) {
    const { _authorUrl: dynamicUrl } = image;
    if (dynamicUrl) {
      let src = dynamicUrl;
      // Apply image preset (Smart Crop rendition)
      if (options.imagePreset) {
        const separator = src.includes('?') ? '&' : '?';
        src = `${src}${separator}$${options.imagePreset}$`;
      }
      // Apply additional image modifiers (width, quality, etc.)
      if (options.imageModifiers) {
        const separator = src.includes('?') ? '&' : '?';
        src = `${src}${separator}${options.imageModifiers}`;
      }
      const img = document.createElement('img');
      img.className = 'fact-card-image';
      img.src = src;
      img.alt = eyebrow || '';
      img.loading = 'lazy';
      card.append(img);
    }
  }

  // Content container
  const content = document.createElement('div');
  content.className = 'fact-card-content';

  if (eyebrow) {
    const eyebrowEl = document.createElement('div');
    eyebrowEl.className = 'fact-card-eyebrow';
    eyebrowEl.setAttribute('role', 'heading');
    eyebrowEl.setAttribute('aria-level', '2');
    eyebrowEl.textContent = eyebrow;
    content.append(eyebrowEl);
  }

  if (dataPoint) {
    const dataContainer = document.createElement('div');
    dataContainer.className = 'fact-card-data';

    const dataEl = document.createElement('div');
    dataEl.className = 'fact-card-data-point';
    dataEl.textContent = dataPoint;
    dataContainer.append(dataEl);

    if (dataPointSuffix) {
      const suffixEl = document.createElement('div');
      suffixEl.className = 'fact-card-data-suffix';
      suffixEl.textContent = dataPointSuffix;
      dataContainer.append(suffixEl);
    }

    content.append(dataContainer);
  }

  if (description) {
    const descEl = document.createElement('div');
    descEl.className = 'fact-card-description';
    // Description may be HTML or plain text
    if (description.includes('<')) {
      descEl.innerHTML = description;
    } else {
      descEl.textContent = description;
    }
    content.append(descEl);
  }

  card.append(content);
}

/**
 * Fact Card Block — sources content from a Content Fragment.
 * Follows same CF fetching pattern as the quote block.
 * @param {Element} block
 */
export default async function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  // Apply common properties (id, language) from _common-properties.json
  applyCommonProps(block);

  // Re-read rows after common props removed their rows
  const remainingRows = [...block.children];

  // Extract CF path
  const cfCell = remainingRows[ROW.CONTENT_FRAGMENT]?.firstElementChild;
  let rawPath = '';
  if (cfCell) {
    const link = cfCell.querySelector('a');
    if (link) {
      rawPath = link.getAttribute('href');
    } else {
      const text = cfCell.textContent.trim();
      if (text && text.startsWith('/')) {
        rawPath = text;
      }
    }
  }

  // Extract config options
  const hideImage = getCellText(remainingRows[ROW.HIDE_IMAGE]).toLowerCase() === 'true';
  const imagePreset = getCellText(remainingRows[ROW.IMAGE_PRESET]);
  const imageModifiers = getCellText(remainingRows[ROW.IMAGE_MODIFIERS]);
  const analyticsId = getCellText(remainingRows[ROW.ANALYTICS_ID]);

  // Clear block content
  block.textContent = '';

  // Apply analytics tracking
  if (analyticsId) {
    block.setAttribute('data-analytics-id', analyticsId);
  }

  if (!rawPath) return;

  // Build card container
  const card = document.createElement('div');
  card.className = 'fact-card-inner';

  const options = { hideImage, imagePreset, imageModifiers };

  // Fetch CF data (same pattern as quote block)
  try {
    const path = await normalizePath(rawPath);
    const cfData = await fetchDashboardCardData(`${path}?8`, 'cfFactsBaseUrl');
    renderCfFactCard(card, cfData, options);
    if (card.childNodes.length > 0) {
      block.append(card);
      return;
    }
  } catch (e) {
    // GraphQL fetch failed, try model.json fallback
  }

  // Fallback: try AEM Content Fragment JSON endpoint
  try {
    const cfPath = rawPath.replace(/\.html$/, '');
    const resp = await fetch(`${cfPath}.model.json`);
    if (resp.ok) {
      const cfData = await resp.json();
      renderCfFactCard(card, cfData, options);
      if (card.childNodes.length === 0) {
        // Try elements fallback
        const elements = cfData?.elements || {};
        renderCfElementsFallback(card, elements, options);
      }
      if (card.childNodes.length > 0) {
        block.append(card);
      }
    }
  } catch (e) {
    // CF JSON fetch failed
  }
}
