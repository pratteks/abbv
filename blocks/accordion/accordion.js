import { resolveImageReference, moveInstrumentation } from '../../scripts/scripts.js';
import decorateExternalLinksUtility, { applyCommonProps } from '../../scripts/utils.js';
/*
 * Accordion Block
 * Recreate an accordion
 * https://www.hlx.live/developer/block-collection/accordion
 */

function getIconImage(row) {
  if (!row) return null;
  resolveImageReference(row.firstElementChild || row);
  return row.querySelector('picture');
}

/**
 * Main accordion properties order:
 * 0: blockHeading
 * 1: expandAllText
 * 2: collapseAllText
 * 3: expandAllIcon
 * 4: collapseAllIcon
 * 5: expandIcon
 * 6: collapseIcon
 * 7: expandAllIconImage
 * 8: collapseAllIconImage
 * 9: expandIconImage
 * 10: collapseIconImage
 * 11: ariaExpandAllLabel
 * 12: ariaCollapseAllLabel
 */
function gteConfigIcons(block) {
  const headingText = block.children[0].textContent.trim();
  const expandAllText = block.children[1].textContent.trim();
  const collapseAllText = block.children[2].textContent.trim();
  const expandAllIcon = `icon-abbvie-${block.children[3].textContent.trim()}`;
  const collapseAllIcon = `icon-abbvie-${block.children[4].textContent.trim()}`;
  const expandIcon = `icon-abbvie-${block.children[5].textContent.trim()}`;
  const collapseIcon = `icon-abbvie-${block.children[6].textContent.trim()}`;
  const expandAllIconImage = getIconImage(block.children[7]);
  const collapseAllIconImage = getIconImage(block.children[8]);
  const expandIconImage = getIconImage(block.children[9]);
  const collapseIconImage = getIconImage(block.children[10]);
  const ariaExpandAllLabel = block.children[11].textContent.trim();
  const ariaCollapseAllLabel = block.children[12].textContent.trim();

  // clean config rows
  [...block.children].forEach((child, index) => {
    if (index <= 12) {
      child.remove();
    }
  });

  return {
    headingText,
    expandAllText,
    collapseAllText,
    expandAllIcon,
    collapseAllIcon,
    expandIcon,
    collapseIcon,
    expandAllIconImage,
    collapseAllIconImage,
    expandIconImage,
    collapseIconImage,
    ariaExpandAllLabel,
    ariaCollapseAllLabel,
  };
}

function decorateHeading(block, headingText) {
  const headingWrapper = document.createElement('div');
  headingWrapper.className = 'accordion-block-heading-wrapper';
  if (headingText) {
    const span = document.createElement('span');
    span.className = 'accordion-block-heading';
    span.textContent = headingText;
    headingWrapper.appendChild(span);
  }
  block.prepend(headingWrapper);
}

function addExpandCollapseAllButton(block, cfg) {
  const headingWrapper = block.querySelector('.accordion-block-heading-wrapper');
  const expandAllBtn = document.createElement('button');
  expandAllBtn.className = 'accordion-expand-all';
  expandAllBtn.type = 'button';

  const textSpan = document.createElement('span');
  textSpan.className = 'accordion-expand-all-text';

  const isImageIcon = block.classList.contains('accordion-icon-image');
  let icon = null;

  if (isImageIcon) {
    expandAllBtn.append(textSpan);
    const buttonWrapper = document.createElement('span');
    buttonWrapper.className = 'accordion-expand-all-wrapper';
    buttonWrapper.appendChild(expandAllBtn);
    if (cfg.expandAllIconImage) {
      cfg.expandAllIconImage.classList.add('accordion-expand-all-image-icon');
      buttonWrapper.appendChild(cfg.expandAllIconImage);
    }
    if (cfg.collapseAllIconImage) {
      cfg.collapseAllIconImage.classList.add('accordion-collapse-all-image-icon');
      buttonWrapper.appendChild(cfg.collapseAllIconImage);
    }
    buttonWrapper.addEventListener('click', (e) => {
      if (e.target !== expandAllBtn && !expandAllBtn.contains(e.target)) {
        expandAllBtn.click();
      }
    });
    headingWrapper.append(buttonWrapper);
  } else {
    icon = document.createElement('i');
    icon.className = 'accordion-expand-all-icon';
    icon.setAttribute('aria-hidden', 'true');
    expandAllBtn.append(textSpan, icon);
    headingWrapper.append(expandAllBtn);
  }

  function updateButtonState(allOpen) {
    textSpan.textContent = allOpen ? cfg.collapseAllText : cfg.expandAllText;
    expandAllBtn.setAttribute('aria-label', allOpen ? cfg.ariaCollapseAllLabel : cfg.ariaExpandAllLabel);
    expandAllBtn.classList.toggle('expanded', allOpen);
    if (icon) {
      icon.className = `accordion-expand-all-icon ${allOpen ? cfg.collapseAllIcon : cfg.expandAllIcon}`;
    }
  }

  let showingCollapse = false;

  expandAllBtn.addEventListener('click', () => {
    const allDetails = block.querySelectorAll('details.accordion-item');
    allDetails.forEach((d) => { d.open = !showingCollapse; });
    showingCollapse = !showingCollapse;
    updateButtonState(showingCollapse);
  });

  // Set initial state based on which items are actually open
  const initialDetails = block.querySelectorAll('details.accordion-item');
  const allInitialOpen = [...initialDetails].every((d) => d.open);
  const noneInitialOpen = [...initialDetails].every((d) => !d.open);
  if (allInitialOpen) showingCollapse = true;
  else if (noneInitialOpen) showingCollapse = false;
  updateButtonState(showingCollapse);

  // Update button only when all open or all closed
  block.addEventListener('toggle', () => {
    const allDetails = block.querySelectorAll('details.accordion-item');
    [...allDetails].forEach((e) => {
      e.firstElementChild.classList.toggle('open', e.open);
    });
    const allOpen = [...allDetails].every((d) => d.open);
    const allClosed = [...allDetails].every((d) => !d.open);
    if (allOpen) showingCollapse = true;
    else if (allClosed) showingCollapse = false;
    updateButtonState(showingCollapse);
  }, true);
}

function closeAllExceptCurrent(block) {
  if (!block.classList.contains('allowmultipleopen')) {
    const details = block.querySelectorAll('details.accordion-item');
    details.forEach((detail) => {
      detail.addEventListener('toggle', () => {
        if (detail.open) {
          details.forEach((d) => {
            if (d !== detail) d.open = false;
          });
        }
      });
    });
  }
}

export default function decorate(block) {
  applyCommonProps(block, 13);
  const cfg = gteConfigIcons(block);

  [...block.children].forEach((row) => {
    // decorate accordion item label
    if (!row.children[0] || !row.children[1]) return;
    const label = row.children[0];
    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    summary.append(...label.childNodes);
    if (summary.firstElementChild) {
      summary.firstElementChild.classList.add('accordion-item-label-text');
    }
    // decorate accordion item body
    const body = row.children[1];
    body.className = 'accordion-item-body';
    if (body.firstElementChild) {
      body.firstElementChild.classList.add('accordion-item-body-text');
    }
    const ariaExpandLabel = row.children[3].textContent.trim() || '';
    const ariaCollapseLabel = row.children[4].textContent.trim() || '';

    // decorate accordion item
    const details = document.createElement('details');
    moveInstrumentation(row, details);
    // Use the third column for additional classes on the details element
    details.className = `${row.children[2].textContent.trim().replaceAll(',', '')}`;
    const isImageIcon = block.classList.contains('accordion-icon-image');

    if (details.classList.contains('defaultopen')) {
      if (!isImageIcon) summary.classList.add(cfg.collapseIcon);
      details.setAttribute('open', '');
      details.setAttribute('aria-label', ariaExpandLabel);
    } else {
      if (!isImageIcon) summary.classList.add(cfg.expandIcon);
      summary.setAttribute('aria-label', ariaCollapseLabel);
    }

    if (isImageIcon) {
      if (cfg.expandIconImage) {
        const expandIcon = cfg.expandIconImage.cloneNode(true);
        expandIcon.classList.add('accordion-expand-image-icon');
        summary.appendChild(expandIcon);
      }
      if (cfg.collapseIconImage) {
        const collapseIcon = cfg.collapseIconImage.cloneNode(true);
        collapseIcon.classList.add('accordion-collapse-image-icon');
        summary.appendChild(collapseIcon);
      }
    }

    details.addEventListener('toggle', () => {
      details.setAttribute('aria-label', details.open ? ariaExpandLabel : ariaCollapseLabel);
      if (!isImageIcon) {
        summary.classList.toggle(cfg.collapseIcon, details.open);
        summary.classList.toggle(cfg.expandIcon, !details.open);
      }
    });

    details.append(summary, body);
    row.replaceWith(details);
  });

  // decorate accordion heading
  decorateHeading(block, cfg.headingText);

  // Add Expand All / Collapse All button
  if (block.classList.contains('showexpandcollapseall')) {
    addExpandCollapseAllButton(block, cfg);
  }

  // multiple accordion items open at the same time if "allowmultipleopen" class is present
  closeAllExceptCurrent(block);

  // Decorate external links across the entire block
  decorateExternalLinksUtility(block);
}
