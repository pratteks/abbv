/**
 * Builds the final image src URL by appending preset or smart crop parameters.
 * @param {string} src - Base image URL (query string stripped internally)
 * @param {string} presetType - "image-preset" | "smart-crop" | ""
 * @param {string} imagePreset - Image preset name (e.g. "Feature", "Hero")
 * @param {string} rendition - Smart crop rendition name (e.g. "Square", "Tall")
 * @param {string} modifiers - Raw query string modifiers (e.g. "wid=500&hei=300")
 * @returns {string} Final URL
 */
export function buildImageUrl(src, presetType, imagePreset, rendition, modifiers) {
  const baseUrl = src.includes('?') ? src.split('?')[0] : src;

  if (presetType === 'image-preset' && imagePreset && imagePreset.toLowerCase() !== 'none') {
    // Adobe DM Image Preset format: ?$PresetName$
    const presetParam = `$${imagePreset}$`;
    return modifiers ? `${baseUrl}?${presetParam}&${modifiers}` : `${baseUrl}?${presetParam}`;
  }

  if (presetType === 'smart-crop' && rendition && rendition.toLowerCase() !== 'none') {
    // Smart Crop format: ?smartcrop=RenditionName
    const params = new URLSearchParams({ smartcrop: rendition });
    if (modifiers) {
      modifiers.split('&').forEach((p) => {
        const [k, v] = p.split('=');
        if (k?.trim()) params.set(k.trim(), v?.trim() ?? '');
      });
    }
    return `${baseUrl}?${params.toString()}`;
  }

  return modifiers ? `${baseUrl}?${modifiers}` : baseUrl;
}

/**
 * Row indices matching the xwalk template field order.
 * Spike fields and fields handled externally are listed as comments only.
 */
const ROW = {
  IMAGE: 0,
  PRESET_TYPE: 1,
  IMAGE_PRESET: 2,
  RENDITION: 3,
  IMAGE_MODIFIERS: 4,
  // imageAlt — no DOM row; server applies it directly to img.alt from the authored value
  // GET_ALT_FROM_DAM: 5  — spike, no implementation
  IMAGE_IS_DECORATIVE: 6,
  CAPTION: 7,
  // GET_CAPTION_FROM_DAM: 8 — spike, no implementation
  DISPLAY_CAPTION_BELOW: 9,
  ENABLE_LINK: 10,
  TARGET: 11,
  CLICK_BEHAVIOR: 12,
  MODAL_PANEL_ID: 13,
  ENABLE_WARN_ON_LEAVE: 14,
  WARN_ON_LEAVE_PATH: 15,
  LINK_ARIA_LABEL: 16,
  ANALYTICS_INTERACTION_ID: 17,
};

/**
 * Reads trimmed text from a row's first cell div.
 * @param {Element[]} rows
 * @param {number} index
 * @returns {string}
 */
function getRowText(rows, index) {
  return rows[index]?.querySelector('div')?.textContent?.trim() ?? '';
}

/**
 * Returns true if a boolean row contains "true".
 * @param {Element[]} rows
 * @param {number} index
 * @returns {boolean}
 */
function getRowBool(rows, index) {
  return getRowText(rows, index) === 'true';
}

/**
 * Wraps the picture element in an anchor tag based on link configuration.
 * @param {HTMLPictureElement} picture
 * @param {object} linkConfig
 * @returns {HTMLAnchorElement}
 */
function applyLink(picture, {
  target, clickBehavior, modalPanelId, enableWarnOnLeave, warnOnLeavePath, ariaLabel,
}) {
  const a = document.createElement('a');
  a.href = target;

  if (clickBehavior === 'modal') {
    a.dataset.modal = modalPanelId || '';
    // TODO: Add logic for modal, to be covered as part of modal story development
  } else if (clickBehavior === 'hidden-panel') {
    a.dataset.hiddenPanel = modalPanelId || '';
    // TODO: Add logic for modal, to be covered as part of modal story development
  } else {
    a.target = clickBehavior || '_self';
  }

  if (enableWarnOnLeave && warnOnLeavePath) {
    a.dataset.warnOnLeave = warnOnLeavePath;
    // TODO: Add logic for modal, to be covered as part of modal story development
  }

  if (ariaLabel) a.setAttribute('aria-label', ariaLabel);

  a.appendChild(picture);
  return a;
}

/**
 * Decorates the custom-image block.
 *
 * Expected row order (authored via xwalk model):
 *   Row 0  – image                   (reference → <picture><img>)
 *   Row 1  – presetType              ("image-preset" | "smart-crop" | "")
 *   Row 2  – imagePreset             (e.g. "Feature", "Hero")
 *   Row 3  – rendition               (e.g. "Square", "Tall")
 *   Row 4  – imageModifiers          (raw query string)
 *   (imageAlt — no DOM row; server sets img.alt directly from authored value)
 *   Row 5  – getAltFromDAM           (spike — no implementation)
 *   Row 6  – imageIsDecorative       ("true" → img.alt = "")
 *   Row 7  – caption                 (figcaption text)
 *   Row 8  – getCaptionFromDAM       (spike — no implementation)
 *   Row 9  – displayCaptionBelowImage ("true" → caption-below class on <figure>)
 *   Row 10 – enableLink              ("true" | "false")
 *   Row 11 – target                  (URL / AEM path)
 *   Row 12 – clickBehavior           ("_self" | "_blank" | "modal" | "hidden-panel")
 *   Row 13 – modalPanelId            (ID string)
 *   Row 14 – enableWarnOnLeave       ("true" | "false")
 *   Row 15 – warnOnLeavePath         (AEM path)
 *   Row 16 – linkAriaLabel           (string; conditional on enableLink)
 *   Row 17 – analyticsInteractionId  (string)
 *
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  const img = block.querySelector('img');
  if (!img) return;

  const rows = [...block.querySelectorAll(':scope > div')];

  // --- Image config ---
  const presetType = getRowText(rows, ROW.PRESET_TYPE);
  const imagePreset = getRowText(rows, ROW.IMAGE_PRESET);
  const rendition = getRowText(rows, ROW.RENDITION);
  const imageModifiers = getRowText(rows, ROW.IMAGE_MODIFIERS);
  const imageIsDecorative = getRowBool(rows, ROW.IMAGE_IS_DECORATIVE);

  // --- Caption ---
  const caption = getRowText(rows, ROW.CAPTION);
  const displayCaptionBelow = getRowBool(rows, ROW.DISPLAY_CAPTION_BELOW);

  // --- Link ---
  const enableLink = getRowBool(rows, ROW.ENABLE_LINK);
  const target = getRowText(rows, ROW.TARGET);
  const clickBehavior = getRowText(rows, ROW.CLICK_BEHAVIOR) || '_self';
  const modalPanelId = getRowText(rows, ROW.MODAL_PANEL_ID);
  const enableWarnOnLeave = getRowBool(rows, ROW.ENABLE_WARN_ON_LEAVE);
  const warnOnLeavePath = getRowText(rows, ROW.WARN_ON_LEAVE_PATH);
  const linkAriaLabel = getRowText(rows, ROW.LINK_ARIA_LABEL);
  const analyticsInteractionId = getRowText(rows, ROW.ANALYTICS_INTERACTION_ID);

  // --- Build image URL ---
  img.src = buildImageUrl(img.src, presetType, imagePreset, rendition, imageModifiers);
  if (imageIsDecorative) img.alt = '';

  const picture = document.createElement('picture');
  picture.appendChild(img);

  // --- Optionally wrap in link ---
  const imageContent = enableLink && target
    ? applyLink(picture, {
      target,
      clickBehavior,
      modalPanelId,
      enableWarnOnLeave,
      warnOnLeavePath,
      ariaLabel: linkAriaLabel,
    })
    : picture;

  // --- Build final DOM ---
  block.innerHTML = '';

  if (analyticsInteractionId) {
    block.dataset.analyticsInteractionId = analyticsInteractionId;
  }

  if (caption) {
    const figure = document.createElement('figure');
    if (displayCaptionBelow) figure.classList.add('caption-below');

    const figcaption = document.createElement('figcaption');
    figcaption.textContent = caption;

    figure.appendChild(imageContent);
    figure.appendChild(figcaption);
    block.appendChild(figure);
  } else {
    block.appendChild(imageContent);
  }
}
