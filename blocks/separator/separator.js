import { applyCommonProps } from '../../scripts/utils.js';

export default function decorate(block) {
  applyCommonProps(block, 1); // Apply common properties from the first row of the block
  const cells = block.querySelectorAll(':scope > div > div');
  const showLineValue = cells[0] ? cells[0].textContent.trim() : 'false';
  const showLine = showLineValue !== 'false';

  const wrapper = document.createElement('div');
  wrapper.className = 'abbvie-separator';

  if (showLine) {
    const hr = document.createElement('hr');
    hr.className = 'separator-hr';
    wrapper.appendChild(hr);
  }

  block.innerHTML = '';
  block.appendChild(wrapper);
}
