/*
 * Rinvoq Accordion Block
 * Extracted behavior from: https://www.rinvoq.com/resources/save-on-rinvoq-costs
 * AEM component: .abbv-accordion.save-rinvoq-accordion.abbv-accordion-single
 *
 * Source behavior:
 * - Single-expand by default (.abbv-accordion-single)
 * - Toggling via .abbv-active class on blades
 * - PNG-based plus/close icons (not icon-font)
 * - Blade decorative background image frames
 *
 * EDS mapping:
 *   .abbv-accordion-blade        → details.accordion-item
 *   .abbv-accordion-blade-content → summary.accordion-item-label
 *   .abbv-accordion-blade-text    → .accordion-item-label-text
 *   .abbv-accordion-blade-icon    → ::after pseudo on summary
 *   .abbv-accordion-content       → .accordion-item-body
 *
 * Library structure: N rows x 2 cols (title | body)
 * UE Model fields: summary (text), text (richtext)
 * Accessibility: aria-expanded, aria-controls, role="button", role="region"
 */

import { moveInstrumentation } from '../../../scripts/scripts.js';

export default function decorate(block) {
  const accordionId = `accordion-${Math.random().toString(36).slice(2, 9)}`;

  // Rinvoq source uses single-expand by default
  const isSingleExpand = !block.classList.contains('multi');

  [...block.children].forEach((row, index) => {
    if (!row.children[0] || !row.children[1]) return;

    const label = row.children[0];
    const body = row.children[1];

    // Create summary element — blade-style label
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

  // Single-expand mode (default for Rinvoq): close others when one opens
  if (isSingleExpand) {
    block.addEventListener('toggle', (e) => {
      const toggled = e.target.closest('details.accordion-item');
      if (toggled && toggled.open) {
        block.querySelectorAll('details.accordion-item').forEach((d) => {
          if (d !== toggled && d.open) {
            d.open = false;
            const s = d.querySelector('summary');
            if (s) {
              s.setAttribute('aria-expanded', 'false');
              s.classList.remove('open');
            }
          }
        });
      }
      if (toggled) {
        const s = toggled.querySelector('summary');
        if (s) {
          s.setAttribute('aria-expanded', String(toggled.open));
          s.classList.toggle('open', toggled.open);
        }
      }
    }, true);
  } else {
    // Multi-expand: add Expand All / Collapse All
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
}
