/**
 * Decorates the CTA block element.
 * Transforms the block's content into a styled call-to-action component
 * with a heading, description, and action button.
 *
 * @param {HTMLElement} block - The CTA block element to decorate.
 * @returns {void}
 */
import { applyCommonProps } from '../../scripts/utils.js';
import { resolveImageReference } from '../../scripts/scripts.js';

function getCellPicture(row) {
  if (!row) return null;
  resolveImageReference(row.firstElementChild || row);
  return row.querySelector('picture');
}

function readBlock(block, cfgOrder) {
  const cfg = {};
  [...block.children].forEach((row, index) => {
    if (index >= 1) {
      const key = cfgOrder[index - 1];
      if (key === 'iconImage') {
        cfg[key] = getCellPicture(row);
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

function readGlyph(iconFont = '') {
  const trimmed = iconFont.trim();
  if (!trimmed) return null;
  if (trimmed.length === 1) return trimmed;

  const normalized = trimmed
    .replace(/^\\u/i, '')
    .replace(/^u/i, '')
    .replace(/^\\/, '');

  if (/^[0-9a-f]{4,6}$/i.test(normalized)) {
    return String.fromCodePoint(parseInt(normalized, 16));
  }

  return null;
}

function createIconNode(cfg, iconType) {
  if (iconType === 'icon-font') {
    if (!cfg.iconFont) return null;
    const icon = document.createElement('span');
    icon.className = 'cta-custom-icon cta-custom-icon-font';
    icon.setAttribute('aria-hidden', 'true');

    const glyph = readGlyph(cfg.iconFont);
    if (glyph) {
      icon.textContent = glyph;
    } else {
      cfg.iconFont
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .forEach((className) => icon.classList.add(className));
    }

    return icon;
  }

  if (iconType === 'image') {
    if (!cfg.iconImage) return null;
    const picture = cfg.iconImage.cloneNode(true);
    picture.classList.add('cta-custom-icon', 'cta-custom-icon-image');
    return picture;
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
  applyCommonProps(block);
  const cfg = readBlock(block, cfgOrder);
  updateAttributes(block, cfg);
  setIcon(block, cfg);
}
