/**
 * Hero Container Block
 *
 * Rotating hero: picks one hero-container item per page load and renders a
 * full-bleed background image/video with an optional text overlay.
 *
 * The container owns both the child-item authoring model and the rendering
 * logic, following the same single-block pattern used by cards/card.
 *
 * Rotation: sessionStorage key `hero-container-{pathname}` stores the current
 * index (starting at 0). Each page load reads it, shows that item, then writes
 * (current + 1) % n so the next visit advances to the following item.
 *
 * DOM structure produced:
 *   hero-container-item
 *     hero-container-item-authoring-data (hidden)
 *     hero-container-bg
 *       picture/img/video              ← background media (position: absolute)
 *       hero-container-title-row       ← title text, overlaid on image (z-index)
 *       hero-container-cta-row         ← CTA button, overlaid on image (z-index)
 *     hero-container-section-outer     ← max-width: 133rem, centered; 12-col grid at desktop
 *       hero-container-section-overlay ← white card; grid-column: 2/span 10 at desktop
 */

import {
  moveInstrumentation,
  resolveImageReference,
} from '../../scripts/scripts.js';
import { shouldRunOutsideAuthorEdit } from '../../scripts/utils.js';

function getAuthoringSource(item) {
  return (
    item.querySelector(':scope > .hero-container-item-authoring-data') || item
  );
}

function getFieldElement(source, name) {
  return source.querySelector(`[data-aue-prop="${name}"]`) || null;
}

function getFieldText(source, name) {
  const el = getFieldElement(source, name);
  if (!el) return '';
  return (el.getAttribute('data-aue-value') ?? el.textContent ?? '').trim();
}

function getFieldLink(source, name) {
  const field = getFieldElement(source, name);
  if (!field) return '';

  return (
    field.querySelector('a[href]')?.getAttribute('href')
    || field.getAttribute('data-aue-href')
    || field.getAttribute('data-aue-value')
    || field.textContent
    || ''
  ).trim();
}

function getFieldContent(field) {
  if (!field) return null;
  const directChildren = [...field.children];
  if (directChildren.length === 1 && directChildren[0].tagName === 'DIV') {
    return directChildren[0];
  }
  return field;
}

function getVideoSrc(cellOrUrl) {
  const href = typeof cellOrUrl === 'string'
    ? cellOrUrl.trim()
    : (cellOrUrl?.querySelector('a')?.href ?? '');
  if (!href) return null;
  if (
    /\.mp4(\?|$)/i.test(href)
    || href.includes('brightcove.net')
    || href.includes('youtube.com/embed')
    || href.includes('vimeo.com')
  ) return href;
  return null;
}

function buildVideoElement(src) {
  const video = document.createElement('video');
  video.setAttribute('autoplay', '');
  video.setAttribute('muted', '');
  video.setAttribute('loop', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('aria-hidden', 'true');
  video.muted = true;
  const source = document.createElement('source');
  source.src = src;
  source.type = 'video/mp4';
  video.appendChild(source);
  return video;
}

function extractMediaFromCell(cell) {
  if (!cell) return null;

  const source = getFieldContent(cell) || cell;
  const existing = source.querySelector('picture') || source.querySelector('img');
  if (existing) return existing.cloneNode(true);

  const cellClone = source.cloneNode(true);
  resolveImageReference(cellClone.firstElementChild || cellClone);
  const resolved = cellClone.querySelector('picture') || cellClone.querySelector('img');
  if (resolved) return resolved;

  const link = source.querySelector('a');
  if (link?.href && !link.href.startsWith('#')) {
    const img = document.createElement('img');
    img.src = link.href;
    img.alt = link.getAttribute('title') || link.textContent?.trim() || '';
    return img;
  }

  return null;
}

function getItemFields(item) {
  const source = getAuthoringSource(item);
  const cells = [...source.querySelectorAll(':scope > div')];

  if (cells.some((cell) => cell.hasAttribute('data-aue-prop'))) {
    return {
      mediaCell: getFieldElement(source, 'image'),
      altText: getFieldText(source, 'imageAlt'),
      videoUrlText: getFieldText(source, 'videoUrl'),
      textCell: getFieldElement(source, 'text'),
      colorClass: getFieldText(source, 'bgColor').toLowerCase(),
      ctaLabel: getFieldText(source, 'ctaLabel'),
      ctaUrl: getFieldLink(source, 'ctaUrl'),
    };
  }

  return {
    mediaCell: cells[0] ?? null,
    videoUrlText: cells[1]?.textContent?.trim() || '',
    textCell: cells[2] ?? null,
    colorClass: cells[3]?.textContent?.trim().toLowerCase() || '',
    ctaLabel: cells[4]?.textContent?.trim() || '',
    ctaUrl: cells[5]?.querySelector('a')?.getAttribute('href') || cells[5]?.textContent?.trim() || '',
  };
}

function createOverlayRow(className) {
  const row = document.createElement('div');
  row.classList.add('homepage-overlap');
  row.classList.add(className);
  return row;
}

function collectSectionOverlayContent(block) {
  const wrapper = block.closest('.hero-container-wrapper');
  if (!wrapper) return null;

  const overlayContent = document.createElement('div');
  overlayContent.classList.add('hero-container-section-overlay');

  let sibling = wrapper.nextElementSibling;
  while (sibling) {
    const nextSibling = sibling.nextElementSibling;
    overlayContent.append(sibling);
    sibling = nextSibling;
  }

  return overlayContent.children.length ? overlayContent : null;
}

function decorateHeroItem(item) {
  const fields = getItemFields(item);

  let authoringData = item.querySelector(
    ':scope > .hero-container-item-authoring-data',
  );
  if (!authoringData) {
    authoringData = document.createElement('div');
    authoringData.className = 'hero-container-item-authoring-data';
    authoringData.hidden = true;
    authoringData.setAttribute('aria-hidden', 'true');
    while (item.firstChild) authoringData.append(item.firstChild);
  }

  const bgLayer = document.createElement('div');
  bgLayer.classList.add('hero-container-bg');

  const videoSrc = fields.videoUrlText
    ? getVideoSrc(fields.videoUrlText)
    : getVideoSrc(fields.mediaCell);

  if (videoSrc) {
    bgLayer.appendChild(buildVideoElement(videoSrc));
  } else {
    const media = extractMediaFromCell(fields.mediaCell);
    if (media) {
      const img = media.tagName === 'IMG' ? media : media.querySelector('img');
      if (img) {
        img.loading = 'eager';
        img.fetchPriority = 'high';
        if (fields.altText && !img.alt) img.alt = fields.altText;
      }
      bgLayer.appendChild(media);
    }
  }

  // Title and CTA sit inside the bg layer, on top of the image via z-index
  if (fields.textCell?.textContent?.trim()) {
    const titleRow = createOverlayRow('hero-container-title-row');
    const textContent = getFieldContent(fields.textCell) || fields.textCell;
    titleRow.append(
      ...[...textContent.childNodes].map((node) => node.cloneNode(true)),
    );
    bgLayer.append(titleRow);
  }

  if (fields.ctaLabel) {
    const ctaRow = createOverlayRow('hero-container-cta-row');
    const buttonContainer = document.createElement('p');
    buttonContainer.classList.add('button-container');

    const button = document.createElement('a');
    button.classList.add('button');
    button.textContent = fields.ctaLabel;

    if (fields.ctaUrl) {
      button.href = fields.ctaUrl;
    }

    buttonContainer.append(button);
    ctaRow.append(buttonContainer);
    bgLayer.append(ctaRow);
  }

  item.replaceChildren(authoringData, bgLayer);

  return fields.colorClass;
}

export default function decorate(block) {
  const overlayContent = shouldRunOutsideAuthorEdit()
    ? collectSectionOverlayContent(block)
    : null;

  // ── 1. Collect item rows ───────────────────────────────────────────────────
  const rows = [...block.querySelectorAll(':scope > div')];
  if (rows.length === 0) return;

  // ── 2. SessionStorage rotation ─────────────────────────────────────────────
  const storageKey = `hero-container-${window.location.pathname}`;
  const storedIndex = Number.parseInt(
    sessionStorage.getItem(storageKey) ?? '0',
    10,
  );
  const currentIndex = Number.isFinite(storedIndex)
    ? storedIndex % rows.length
    : 0;
  sessionStorage.setItem(storageKey, String((currentIndex + 1) % rows.length));

  let selectedColorClass = '';
  let selectedItem = null;

  // ── 3. Build each item ─────────────────────────────────────────────────────
  rows.forEach((row, index) => {
    const container = document.createElement('div');
    container.classList.add('hero-container-item');
    moveInstrumentation(row, container);
    while (row.firstChild) container.append(row.firstChild);
    row.replaceWith(container);

    const colorClass = decorateHeroItem(container);

    if (index === currentIndex) {
      selectedColorClass = colorClass;
      selectedItem = container;
    } else {
      container.classList.add('hidden');
    }
  });

  // ── 4. Wrap overlay in outer container and append to selected item ──────────
  // hero-container-section-outer owns the max-width + centering + overlap margin
  // hero-container-section-overlay is the white card inside the 12-col grid
  if (selectedItem && overlayContent) {
    const sectionOuter = document.createElement('div');
    sectionOuter.classList.add('hero-container-section-outer');
    sectionOuter.append(overlayContent);
    selectedItem.append(sectionOuter);
  }

  // ── 5. Apply selected item's color class to block ──────────────────────────
  const validColorClasses = ['dark', 'navy', 'purple', 'light'];
  if (selectedColorClass && validColorClasses.includes(selectedColorClass)) {
    block.classList.add(selectedColorClass);
  }
}
