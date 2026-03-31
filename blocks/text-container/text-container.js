/*
 * Text Container block
 * This block allows content authors to create rows of text with one or two columns.
 * configuration can be set by adding a paragraph with the format "class:classname" in any row.
 * class will be added to the block, and the row will be removed from the DOM.
 * Future enhancements may include support for other properties, such as "id:myid".
 */
import { decorateLangAttribute } from '../../scripts/utils.js';

export default function decorate(block) {
  decorateLangAttribute(block);
  // Unwrap extra div wrapper from each row
  [...block.children].forEach((row) => {
    const child = row.querySelector('div');
    if (child && row.children.length === 1) {
      // Move the inner div's children to the row
      while (child.firstChild) {
        const element = child.firstChild;
        if (element.tagName === 'PICTURE') {
          element.classList?.add('text-container-picture');
        } else {
          element.classList?.add('text-container-text');
        }
        row.appendChild(element);
      }
      child.remove();
    }
  });
}
