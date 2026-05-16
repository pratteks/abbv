import { applyCommonProps } from '../../scripts/utils.js';

/**
 * Row indices matching the xwalk template field order.
 * Spike fields and fields handled externally are listed as comments only.
 */
const ROW = {
  IMAGE: 0,
  // imageAlt — no DOM row; server applies it directly to img.alt from the authored value
  // GET_ALT_FROM_DAM: 1  — spike, no implementation
  IMAGE_IS_DECORATIVE: 2,
  CAPTION: 3,
  // GET_CAPTION_FROM_DAM: 4 — spike, no implementation
  DISPLAY_CAPTION_BELOW: 5,
  ENABLE_LINK: 6,
  TARGET: 7,
  CLICK_BEHAVIOR: 8,
  MODAL_PANEL_ID: 9,
  ENABLE_WARN_ON_LEAVE: 10,
  WARN_ON_LEAVE_PATH: 11,
  LINK_ARIA_LABEL: 12,
  // Row 13: blockId                (handled by applyCommonProps)
  // Row 14: classes_commonCustomClass (handled by framework — no JS needed)
  // Row 15: language               (handled by applyCommonProps)
  // Row 16: analyticsId            (handled by applyCommonProps)
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
 *   (imageAlt — no DOM row; server sets img.alt directly from authored value)
 *   Row 1  – getAltFromDAM           (spike — no implementation)
 *   Row 2  – imageIsDecorative       ("true" → img.alt = "")
 *   Row 3  – caption                 (figcaption text)
 *   Row 4  – getCaptionFromDAM       (spike — no implementation)
 *   Row 5  – displayCaptionBelowImage ("true" → caption-below class on <figure>)
 *   Row 6  – enableLink              ("true" | "false")
 *   Row 7  – target                  (URL / AEM path)
 *   Row 8  – clickBehavior           ("_self" | "_blank" | "modal" | "hidden-panel")
 *   Row 9  – modalPanelId            (ID string)
 *   Row 10 – enableWarnOnLeave       ("true" | "false")
 *   Row 11 – warnOnLeavePath         (AEM path)
 *   Row 12 – linkAriaLabel           (string; conditional on enableLink)
 *   Row 13 – analyticsInteractionId  (string)
 *
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  const rows = [...block.querySelectorAll(':scope > div')];
  const imageRow = rows[ROW.IMAGE];

  // Case 2: image directly authored — picture/img tags already present in DOM
  let picture = imageRow?.querySelector('picture');
  let img = picture?.querySelector('img') ?? imageRow?.querySelector('img');

  // If img was found directly (bare <img>, no <picture> wrapper), create a wrapper
  // so picture is never null when img is set
  if (img && !picture) {
    picture = document.createElement('picture');
    picture.appendChild(img);
  }

  // Case 1: image authored as URL — available as an anchor tag
  if (!img) {
    block.classList.add('hide');
    const anchor = imageRow?.querySelector('a');
    if (!anchor) return;

    img = document.createElement('img');
    img.src = anchor.href;
    img.alt = anchor.textContent?.trim() ?? '';
    img.loading = 'lazy';

    picture = document.createElement('picture');
    picture.appendChild(img);
    block.classList.remove('hide');
  }

  // --- Image config ---
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

  if (imageIsDecorative) img.alt = '';

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

  // --- Apply common props (blockId → id, language → lang, analyticsId) ---
  applyCommonProps(block, 13); // imageAlt is no child row, so common props start at index 13

  // --- Build final DOM ---
  block.innerHTML = '';

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
