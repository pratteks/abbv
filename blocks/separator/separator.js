export default function decorate(block) {
  const cells = block.querySelectorAll(':scope > div > div');
  const idValue = cells[0] ? cells[0].textContent.trim() : '';
  const showLineValue = cells[1] ? cells[1].textContent.trim() : 'true';
  const showLine = showLineValue !== 'false';

  const wrapper = document.createElement('div');
  wrapper.className = 'abbvie-separator';

  if (idValue) wrapper.id = idValue;

  if (showLine) {
    const hr = document.createElement('hr');
    hr.className = 'separator-hr';
    wrapper.appendChild(hr);
  }

  block.innerHTML = '';
  block.appendChild(wrapper);
}
