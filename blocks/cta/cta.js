/**
 * Decorates the CTA block element.
 * Transforms the block's content into a styled call-to-action component
 * with a heading, description, and action button.
 *
 * @param {HTMLElement} block - The CTA block element to decorate.
 * @returns {void}
 */
const attributeList = ['aria-label']; // maintain the order where the attributes are defined in the content authoring

function updateAttributes(block, attributes) {
  const element = block.querySelector('a');
  [...block.children].forEach((row, index) => {
    if (index >= 1) {
      const attrValue = row.textContent.trim();
      if (attrValue) {
        element.setAttribute(attributes[index - 1], `${attrValue}`);
      }
      row.remove();
    }
  });
}

export default function decorate(block) {
  updateAttributes(block, attributeList);
  if (block.classList.contains('newtab')) {
    [...block.children].forEach((row) => {
      const link = row.querySelector('a');
      if (link) link.setAttribute('target', '_blank');
    });
  }
}
