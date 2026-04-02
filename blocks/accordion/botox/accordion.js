/*
 * Botox Accordion Block
 * Source reference: https://www.botoxone.com/faqs
 *
 * BotoxOne's FAQ page reads as a straightforward Q&A list, so this decorator
 * keeps the standard accordion behavior while adding the same accessibility
 * and instrumentation handling used by the other brand decorators.
 */

import { moveInstrumentation } from '../../../scripts/scripts.js';

export default function decorate(block) {
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
      if (
        key.startsWith('analytics')
        || key.startsWith('track')
        || key.startsWith('contentName')
        || key.startsWith('contentType')
      ) {
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
    const allOpen = [...allDetails].every((detail) => detail.open);

    allDetails.forEach((detail) => {
      detail.open = !allOpen;
      const summary = detail.querySelector('summary');
      if (summary) summary.setAttribute('aria-expanded', String(!allOpen));
    });

    expandAllBtn.classList.toggle('expanded', !allOpen);
    expandAllBtn.textContent = allOpen ? 'Expand All' : 'Collapse All';
    expandAllBtn.setAttribute(
      'aria-label',
      allOpen ? 'Expand all accordion items' : 'Collapse all accordion items',
    );
  });

  block.addEventListener(
    'toggle',
    (event) => {
      const detail = event.target.closest('details.accordion-item');
      if (detail) {
        const summary = detail.querySelector('summary');
        if (summary) {
          summary.setAttribute('aria-expanded', String(detail.open));
          summary.classList.toggle('open', detail.open);
        }
      }

      const allDetails = block.querySelectorAll('details.accordion-item');
      const allOpen = [...allDetails].every((item) => item.open);
      expandAllBtn.textContent = allOpen ? 'Collapse All' : 'Expand All';
      expandAllBtn.classList.toggle('expanded', allOpen);
      expandAllBtn.setAttribute(
        'aria-label',
        allOpen ? 'Collapse all accordion items' : 'Expand all accordion items',
      );
    },
    true,
  );
}
