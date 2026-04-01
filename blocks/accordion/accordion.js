/*
 * Accordion Block
 * Recreate an accordion
 * https://www.hlx.live/developer/block-collection/accordion
 *
 * Supports brand-specific variants via a dropdown switcher:
 * - Default: base accordion
 * - AbbVie: ARIA attributes, analytics, Expand All/Collapse All
 * - Rinvoq: single-expand blade cards, plus/minus icons, purple accents
 */

import { moveInstrumentation } from '../../scripts/scripts.js';

const BRANDS = ['default', 'abbvie', 'rinvoq'];

/* ===================== Brand Decorators ===================== */

function decorateAbbvie(block) {
  const accordionId = `accordion-${Math.random().toString(36).slice(2, 9)}`;

  [...block.children].forEach((row, index) => {
    if (!row.children[0] || !row.children[1]) return;

    const label = row.children[0];
    const body = row.children[1];

    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    summary.append(...label.childNodes);
    if (summary.firstElementChild) {
      summary.firstElementChild.classList.add('accordion-item-label-text');
    }

    const itemId = `${accordionId}-item-${index}`;
    const panelId = `${itemId}-panel`;
    summary.setAttribute('role', 'button');
    summary.setAttribute('aria-expanded', 'false');
    summary.setAttribute('aria-controls', panelId);
    summary.setAttribute('id', itemId);

    body.className = 'accordion-item-body';
    body.setAttribute('id', panelId);
    body.setAttribute('role', 'region');
    body.setAttribute('aria-labelledby', itemId);
    if (body.firstElementChild) {
      body.firstElementChild.classList.add('accordion-item-body-text');
    }

    const analyticsAttrs = row.dataset;
    Object.keys(analyticsAttrs).forEach((key) => {
      if (key.startsWith('analytics') || key.startsWith('track') || key.startsWith('contentName') || key.startsWith('contentType')) {
        summary.dataset[key] = analyticsAttrs[key];
      }
    });

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
  expandAllBtn.setAttribute('aria-label', 'Expand all accordion items');
  block.prepend(expandAllBtn);

  expandAllBtn.addEventListener('click', () => {
    const allDetails = block.querySelectorAll('details.accordion-item');
    const allOpen = [...allDetails].every((d) => d.open);
    allDetails.forEach((d) => {
      d.open = !allOpen;
      const s = d.querySelector('summary');
      if (s) s.setAttribute('aria-expanded', String(!allOpen));
    });
    expandAllBtn.classList.toggle('expanded', !allOpen);
    expandAllBtn.textContent = allOpen ? 'Expand All' : 'Collapse All';
    expandAllBtn.setAttribute(
      'aria-label',
      allOpen ? 'Expand all accordion items' : 'Collapse all accordion items',
    );
  });

  block.addEventListener('toggle', (e) => {
    const detail = e.target.closest('details.accordion-item');
    if (detail) {
      const s = detail.querySelector('summary');
      if (s) {
        s.setAttribute('aria-expanded', String(detail.open));
        s.classList.toggle('open', detail.open);
      }
    }
    const allDetails = block.querySelectorAll('details.accordion-item');
    const allOpen = [...allDetails].every((d) => d.open);
    expandAllBtn.textContent = allOpen ? 'Collapse All' : 'Expand All';
    expandAllBtn.classList.toggle('expanded', allOpen);
    expandAllBtn.setAttribute(
      'aria-label',
      allOpen ? 'Collapse all accordion items' : 'Expand all accordion items',
    );
  }, true);
}

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

/* ===================== Brand Switcher ===================== */

async function applyBrandDecorator(block, brand) {
  if (brand === 'rinvoq') {
    const { default: decorateRinvoq } = await import('./rinvoq/accordion.js');
    decorateRinvoq(block);
  } else if (brand === 'abbvie') {
    decorateAbbvie(block);
  } else {
    decorateDefault(block);
  }
}

function detectCurrentBrand(block) {
  if (block.classList.contains('rinvoq')) return 'rinvoq';
  if (block.classList.contains('abbvie')) return 'abbvie';
  return 'default';
}

function createBrandSwitcher(block, originalHTML, currentBrand) {
  const wrapper = document.createElement('div');
  wrapper.className = 'accordion-brand-switcher';

  const label = document.createElement('label');
  label.setAttribute('for', 'accordion-brand-select');
  label.textContent = 'Brand:';
  label.className = 'accordion-brand-switcher-label';

  const select = document.createElement('select');
  select.id = 'accordion-brand-select';
  select.className = 'accordion-brand-switcher-select';

  BRANDS.forEach((brand) => {
    const option = document.createElement('option');
    option.value = brand;
    option.textContent = brand.charAt(0).toUpperCase() + brand.slice(1);
    if (brand === currentBrand) option.selected = true;
    select.append(option);
  });

  select.addEventListener('change', async () => {
    const selected = select.value;

    // Remove old brand classes
    BRANDS.forEach((b) => block.classList.remove(b));

    // Add new brand class (skip for default)
    if (selected !== 'default') {
      block.classList.add(selected);
    }

    // Restore original content rows (remove decorated elements)
    const switcher = block.querySelector('.accordion-brand-switcher');
    block.innerHTML = originalHTML;

    // Re-insert the switcher at the top
    block.prepend(switcher);

    // Re-decorate with the selected brand
    await applyBrandDecorator(block, selected);
  });

  wrapper.append(label, select);
  return wrapper;
}

/* ===================== Main Entry ===================== */

export default async function decorate(block) {
  const currentBrand = detectCurrentBrand(block);

  // Snapshot the original undecorated HTML (content rows only)
  const originalHTML = block.innerHTML;

  // Create and insert brand switcher dropdown
  const switcher = createBrandSwitcher(block, originalHTML, currentBrand);
  block.prepend(switcher);

  // Apply initial brand decoration
  await applyBrandDecorator(block, currentBrand);
}
