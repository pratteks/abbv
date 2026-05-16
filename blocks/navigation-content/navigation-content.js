import { applyCommonProps } from '../../scripts/utils.js';

export default async function decorate(block) {
  applyCommonProps(block, 11);

  const type = [...block.classList].find((c) => ['logo', 'search', 'language-links'].includes(c));
  block.dataset.type = type || 'navigation-content';

  if (type === 'logo' || type === 'language-links' || type === 'search') {
    // 👉 get first valid content div (skip empty ones)
    const first = [...block.children][0];

    if (!first) return;

    if (type === 'search') {
      const mobilePlaceholderRow = [...block.children].slice(1)
        .find((child) => child.textContent.trim() && !child.querySelector('a'));
      if (mobilePlaceholderRow) {
        block.dataset.searchMobilePlaceholder = mobilePlaceholderRow.textContent.trim();
      }
    }

    // 👉 keep only this div
    block.replaceChildren(first.cloneNode(true));
  }

  const secondCol = block.children[1];
  if (secondCol) {
    const toolsLink = secondCol.querySelector(':scope > div > div > p:nth-of-type(2) > a');
    if (toolsLink) toolsLink.classList.add('navigation-content-preview-tools-link');
  }

  const firstCol = block.children[0];
  if (!firstCol) return;

  const wrapper = firstCol.firstElementChild;
  if (!wrapper) return;

  wrapper
    .querySelector(':scope > p:first-child')
    ?.classList.add('navigation-content-preview-heading');

  wrapper
    .querySelector(':scope > p:nth-of-type(2) > a')
    ?.classList.add('navigation-content-preview-link');
}
