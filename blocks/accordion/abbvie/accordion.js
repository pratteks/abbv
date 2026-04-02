/*
 * AbbVie Accordion Block
 * Extends the base accordion with AbbVie-specific behavior:
 * - ARIA attributes for accessibility (aria-expanded, aria-controls, role)
 * - Analytics data attributes preservation
 * - Keyboard navigation support
 *
 * Source: https://www.abbvie.com/who-we-are/our-principles/positions-views.html
 * AEM component: .accordion.cmp-accordion-xx-large
 */

import { moveInstrumentation } from '../../../scripts/scripts.js';

export default function decorate(block) {
  const accordionId = `accordion-${Math.random().toString(36).slice(2, 9)}`;

  [...block.children].forEach((row, index) => {
    if (!row.children[0] || !row.children[1]) return;

    const label = row.children[0];
    const body = row.children[1];

    // Create summary element for the accordion item label
    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    summary.append(...label.childNodes);
    if (summary.firstElementChild) {
      summary.firstElementChild.classList.add('accordion-item-label-text');
    }

    // Accessibility: ARIA attributes
    const itemId = `${accordionId}-item-${index}`;
    const panelId = `${itemId}-panel`;
    summary.setAttribute('role', 'button');
    summary.setAttribute('aria-expanded', 'false');
    summary.setAttribute('aria-controls', panelId);
    summary.setAttribute('id', itemId);

    // Decorate accordion item body
    body.className = 'accordion-item-body';
    body.setAttribute('id', panelId);
    body.setAttribute('role', 'region');
    body.setAttribute('aria-labelledby', itemId);
    if (body.firstElementChild) {
      body.firstElementChild.classList.add('accordion-item-body-text');
    }

    // Preserve analytics data attributes from source
    const analyticsAttrs = row.dataset;
    Object.keys(analyticsAttrs).forEach((key) => {
      if (key.startsWith('analytics') || key.startsWith('track') || key.startsWith('contentName') || key.startsWith('contentType')) {
        summary.dataset[key] = analyticsAttrs[key];
      }
    });

    // Create details element
    const details = document.createElement('details');
    moveInstrumentation(row, details);
    details.className = 'accordion-item';
    details.append(summary, body);
    row.replaceWith(details);
  });

  // Add Expand All / Collapse All button
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

  // Update ARIA states and button text when individual items are toggled
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
