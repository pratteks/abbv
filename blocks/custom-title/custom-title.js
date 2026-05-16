import { applyCommonProps } from '../../scripts/utils.js';

/**
 * Decorate — called by EDS for every instance of the custom-title block.
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  applyCommonProps(block, 1); // titleType is not separate child row, so commonProp start index is 1
  // Add BEM class to heading and unwrap any XWALK-injected spans

  const heading = block.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    heading.classList.add('custom-title-heading');
  }
}
