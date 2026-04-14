export default function decorate(block) {
  // Read the author-configured id before clearing the block
  const idCell = block.querySelector(':scope > div > div');
  const idValue = idCell ? idCell.textContent.trim() : '';

  const wrapper = document.createElement('div');
  wrapper.className = 'abbvie-separator';

  if (idValue) wrapper.id = idValue;

  const hr = document.createElement('hr');
  hr.className = 'separator-hr';

  wrapper.appendChild(hr);

  // Clear the raw authored content before appending the decorated markup
  block.innerHTML = '';
  block.appendChild(wrapper);
}
