/*
 * Rinvoq Accordion Block
 * Extends the base accordion with Rinvoq-specific behavior:
 * - Single-expand mode (only one item open at a time)
 * - Custom blade-style expand/collapse with plus/minus icon
 * - Image separator between accordion items
 * - Tooltip support inside accordion content
 * - ARIA attributes for accessibility
 * - Analytics data attributes preservation
 *
 * Source: https://www.rinvoq.com/resources/save-on-rinvoq-costs
 * AEM component: .abbv-accordion.save-rinvoq-accordion.abbv-accordion-single
 *
 * DOM Structure (source):
 *   div.abbv-accordion.save-rinvoq-accordion.abbv-accordion-single
 *     div.abbv-accordion-container
 *       div.abbv-accordion-blade.abbv-accordion-blade-N
 *         div.abbv-accordion-blade-content
 *           div.abbv-accordion-blade-text > h3
 *         div.abbv-accordion-blade-icon > i.i-a
 *         div.abbv-accordion-content > div.rich-text > div.abbv-rich-text
 *
 * Library structure: N rows x 2 cols (title | body)
 * UE Model fields: summary (text), text (richtext)
 * Accessibility: aria-expanded, aria-controls, role="button", role="region"
 */

import { moveInstrumentation } from '../../../scripts/scripts.js';

export default function decorate(block) {
  const accordionId = `accordion-${Math.random().toString(36).slice(2, 9)}`;
  const isSingleExpand = block.classList.contains('single');

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

  // Single-expand mode: close others when one opens
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
      // Update toggled item's ARIA
      if (toggled) {
        const s = toggled.querySelector('summary');
        if (s) {
          s.setAttribute('aria-expanded', String(toggled.open));
          s.classList.toggle('open', toggled.open);
        }
      }
    }, true);
  } else {
    // Multi-expand: add Expand All / Collapse All button
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
