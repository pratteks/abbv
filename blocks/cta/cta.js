/**
 * Decorates the CTA block element.
 * Transforms the block's content into a styled call-to-action component
 * with a heading, description, and action button.
 *
 * @param {HTMLElement} block - The CTA block element to decorate.
 * @returns {void}
 */
import { applyCommonProps, createIcon, extractIconSource } from '../../scripts/utils.js';
import { resolveImageReference } from '../../scripts/scripts.js';

function readBlock(block, cfgOrder) {
  const cfg = {};
  [...block.children].forEach((row, index) => {
    if (index >= 1) {
      const key = cfgOrder[index - 1];
      if (key === 'iconImage') {
        const cell = row.firstElementChild || row;
        resolveImageReference(cell);
        cfg[key] = extractIconSource(cell);
      } else {
        const attrValue = row.textContent.trim();
        if (attrValue) {
          cfg[key] = attrValue;
        }
      }
      row.remove();
    }
  });
  return cfg;
}

const cfgOrder = [
  'ariaLabel',
  'ctaTarget',
  'iconType',
  'iconFont',
  'iconImage',
  'iconPosition',
  'ariaHidden',
]; // maintain the order where the attributes are defined in the content authoring

function updateAttributes(block, cfg) {
  const element = block.querySelector('a');
  if (!element) return;
  if (cfg.ariaLabel) element.setAttribute('aria-label', cfg.ariaLabel);
  if (cfg.ariaHidden) element.setAttribute('aria-hidden', cfg.ariaHidden);
  if (cfg.ctaTarget) element.setAttribute('target', cfg.ctaTarget);
}

function normalizeIconPosition(iconPosition = '') {
  const value = iconPosition.toLowerCase();
  if (['left', 'before', 'start'].includes(value)) return 'left';
  if (['right', 'after', 'end'].includes(value)) return 'right';
  return 'right';
}

function createIconNode(cfg, iconType) {
  if (iconType === 'icon-font') {
    if (!cfg.iconFont) return null;
    return createIcon(cfg.iconFont.trim(), 'icon-font', {
      additionalClasses: ['cta-custom-icon', 'cta-custom-icon-font'],
    });
  }

  if (iconType === 'image') {
    if (!cfg.iconImage) return null;
    return createIcon(cfg.iconImage, 'image', {
      additionalClasses: ['cta-custom-icon', 'cta-custom-icon-image'],
    });
  }

  return null;
}

function clearCustomIcon(link) {
  link.classList.remove('cta-icon-override', 'cta-icon-font', 'cta-icon-image', 'cta-icon-left', 'cta-icon-right');
  link.querySelectorAll('.cta-custom-icon').forEach((node) => node.remove());
}

function setIcon(block, cfg) {
  const links = block.querySelectorAll('a.button');
  if (!links.length) return;

  const iconType = (cfg.iconType || '').toLowerCase();
  links.forEach((link) => clearCustomIcon(link));

  if (!iconType || iconType === 'none') return;

  const position = normalizeIconPosition(cfg.iconPosition);
  const iconNode = createIconNode(cfg, iconType);
  if (!iconNode) return;

  links.forEach((link) => {
    const node = iconNode.cloneNode(true);
    link.classList.add('cta-icon-override', `cta-icon-${position}`);
    link.classList.add(iconType === 'image' ? 'cta-icon-image' : 'cta-icon-font');
    if (position === 'left') {
      link.prepend(node);
    } else {
      link.append(node);
    }
  });
}

export default function decorate(block) {
  applyCommonProps(block, 8); // link,linkText is single row, so startIndex for commonProps is 8
  const cfg = readBlock(block, cfgOrder);
  updateAttributes(block, cfg);
  setIcon(block, cfg);
}
