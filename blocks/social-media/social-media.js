import { applyCommonProps } from '../../scripts/utils.js';

export default function decorate(block) {
  applyCommonProps(block);
  [...block.children].forEach((row) => {
    const cells = Array.from(row.children);

    if (cells.length >= 2) {
      const iconCell = cells[0];
      const linkCell = cells[1];

      const iconElement = iconCell.querySelector('img, picture');
      const linkText = linkCell.textContent.trim();

      if (iconElement && linkText) {
        const link = document.createElement('a');
        link.href = linkText;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        const sourceImg = iconElement.tagName === 'IMG'
          ? iconElement
          : iconElement.querySelector('img');

        const img = document.createElement('img');

        if (sourceImg) {
          img.src = sourceImg.src;
          img.alt = sourceImg.alt || '';
        }

        link.appendChild(img);

        row.innerHTML = '';
        row.appendChild(link);
        row.classList.add('social-link-item');
      }
    }
  });
}
