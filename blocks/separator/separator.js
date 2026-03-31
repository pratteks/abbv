export default function decorate(block) {
  const wrapper = document.createElement('div');
  wrapper.className = 'abbvie-separator';

  const hr = document.createElement('hr');
  hr.className = 'separator-hr';

  wrapper.appendChild(hr);
  block.appendChild(wrapper);
}
