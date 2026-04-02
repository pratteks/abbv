/*
 * Accordion Block
 * Recreate an accordion
 * https://www.hlx.live/developer/block-collection/accordion
 *
 * Brand-specific variants (read from page metadata <meta name="brand">):
 * - Default: base accordion
 * - AbbVie: dynamically loads abbvie/accordion.js + abbvie/accordion.css
 * - Rinvoq: dynamically loads rinvoq/accordion.js + rinvoq/accordion.css
 */

import { moveInstrumentation } from '../../scripts/scripts.js';
import { getMetadata } from '../../scripts/aem.js';

/**
 * Dynamically load a brand-specific CSS file if not already loaded.
 * @param {string} href - path to the CSS file relative to this block folder
 */
function loadBrandCSS(href) {
  const fullHref = `${window.hlx.codeBasePath}/blocks/accordion/${href}`;
  if (!document.querySelector(`link[href="${fullHref}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fullHref;
    document.head.append(link);
  }
}

/* ===================== Default Decorator ===================== */

function decorateDefault(block) {
  [...block.children].forEach((row) => {
    if (!row.children[0] || !row.children[1]) return;
    const label = row.children[0];
    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    summary.append(...label.childNodes);
    summary.firstElementChild.classList.add('accordion-item-label-text');

    const body = row.children[1];
    body.className = 'accordion-item-body';
    body.firstElementChild.classList.add('accordion-item-body-text');

    const details = document.createElement('details');
    moveInstrumentation(row, details);
    details.className = 'accordion-item';
    details.append(summary, body);
    row.replaceWith(details);
  });

  const expandAllBtn = document.createElement('button');
  expandAllBtn.className = 'accordion-expand-all';
  expandAllBtn.type = 'button';
  expandAllBtn.textContent = 'Expand All';
  block.prepend(expandAllBtn);

  expandAllBtn.addEventListener('click', () => {
    const allDetails = block.querySelectorAll('details.accordion-item');
    const allOpen = [...allDetails].every((d) => d.open);
    allDetails.forEach((d) => { d.open = !allOpen; });
    expandAllBtn.classList.toggle('expanded', !allOpen);
    expandAllBtn.textContent = allOpen ? 'Expand All' : 'Collapse All';
  });

  block.addEventListener('toggle', () => {
    const allDetails = block.querySelectorAll('details.accordion-item');
    [...allDetails].forEach((e) => {
      e.firstElementChild.classList.toggle('open', e.open);
    });
    const allOpen = [...allDetails].every((d) => d.open);
    expandAllBtn.textContent = allOpen ? 'Collapse All' : 'Expand All';
    expandAllBtn.classList.toggle('expanded', allOpen);
  }, true);
}

/* ===================== Main Entry ===================== */

export default async function decorate(block) {
  const brand = getMetadata('brand').trim().toLowerCase();

  if (brand === 'rinvoq') {
    block.classList.add('rinvoq');
    loadBrandCSS('rinvoq/accordion.css');
    const { default: decorateRinvoq } = await import('./rinvoq/accordion.js');
    decorateRinvoq(block);
  } else if (brand === 'abbvie') {
    block.classList.add('abbvie');
    loadBrandCSS('abbvie/accordion.css');
    const { default: decorateAbbvie } = await import('./abbvie/accordion.js');
    decorateAbbvie(block);
  } else {
    decorateDefault(block);
  }
}
