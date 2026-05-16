/* eslint-disable */
/* global WebImporter */


import { applyAnalytics } from './utils/analytics.js';
/**
 * Parser: embed
 * Base block: embed
 * Source: https://www.abbvie.com/science/our-people.html
 * Generated: 2026-02-27
 * Updated: 2026-03-13 — Extract overlay title, description, and watch button text
 * Updated: 2026-03-13 — All fields have model-matching field comments for xwalk serving
 *
 * Handles YouTube and Brightcove video embeds.
 * Section 7 contains a YouTube video (45GzoyuWP2I).
 *
 * Library structure: 1 row, 1 column (single cell, all embed_ prefixed fields):
 *   Fields: embed_placeholder (reference), embed_title (text),
 *           embed_description (text), embed_buttonLabel (text), embed_uri (text)
 *
 * UE Model fields: embed_placeholder (reference), embed_placeholderAlt (collapsed),
 *   embed_title (text), embed_description (text), embed_buttonLabel (text), embed_uri (text)
 * Accessibility: Preserves alt text on thumbnail images
 */
export default function parse(element, { document }) {
  let videoUrl = '';

  // Check for YouTube iframe
  const ytIframe = element.querySelector('iframe[src*="youtube"], iframe[src*="youtu.be"]');
  if (ytIframe) {
    const src = ytIframe.getAttribute('src') || '';
    const videoIdMatch = src.match(/embed\/([a-zA-Z0-9_-]+)/);
    if (videoIdMatch) {
      videoUrl = `https://www.youtube.com/watch?v=${videoIdMatch[1]}`;
    }
  }

  // Check for YouTube data attributes
  if (!videoUrl) {
    const ytEl = element.querySelector('[data-youtube-id]');
    if (ytEl) {
      const ytId = ytEl.getAttribute('data-youtube-id');
      if (ytId) videoUrl = `https://www.youtube.com/watch?v=${ytId}`;
    }
  }

  // Check for Brightcove video element
  if (!videoUrl) {
    const bcEl = element.querySelector('video-js, [data-video-id]');
    if (bcEl) {
      const videoId = bcEl.getAttribute('data-video-id');
      const account = bcEl.getAttribute('data-account') || '2157889325001';
      if (videoId) {
        videoUrl = `https://players.brightcove.net/${account}/default_default/index.html?videoId=${videoId}`;
      }
    }
  }

  // Check for video URL stashed by cleanup transformer
  if (!videoUrl) {
    const cmpVideo = element.querySelector('[data-video-url]');
    if (cmpVideo) videoUrl = cmpVideo.getAttribute('data-video-url');
  }

  // Check for direct video link
  if (!videoUrl) {
    const link = element.querySelector('a[href*="youtube"], a[href*="vimeo"], a[href*="brightcove"]');
    if (link) videoUrl = link.href;
  }

  // Find thumbnail/placeholder image
  const thumbnail = element.querySelector('picture')
    || element.querySelector('img.cmp-video__thumbnail, img[class*="thumbnail"]')
    || element.querySelector('.cmp-image picture')
    || element.querySelector('img');

  // Extract overlay text stashed by cleanup transformer
  const cmpVideo = element.querySelector('[data-overlay-title]') || element;
  const overlayTitle = cmpVideo.getAttribute('data-overlay-title') || '';
  const overlayDesc = cmpVideo.getAttribute('data-overlay-desc') || '';
  const overlayBtn = cmpVideo.getAttribute('data-overlay-btn') || '';

  // Build single cell — all fields share embed_ prefix → single group
  const cellFrag = document.createDocumentFragment();

  // Placeholder image (field:embed_placeholder)
  cellFrag.appendChild(document.createComment(' field:embed_placeholder '));
  if (thumbnail) {
    const pic = thumbnail.tagName === 'PICTURE' ? thumbnail : thumbnail.closest('picture') || thumbnail;
    const p = document.createElement('p');
    p.appendChild(pic);
    cellFrag.appendChild(p);
  }

  // Overlay title (field:embed_title)
  cellFrag.appendChild(document.createComment(' field:embed_title '));
  if (overlayTitle) {
    const h2 = document.createElement('h2');
    h2.textContent = overlayTitle;
    cellFrag.appendChild(h2);
  }

  // Overlay description (field:embed_description)
  cellFrag.appendChild(document.createComment(' field:embed_description '));
  if (overlayDesc) {
    const p = document.createElement('p');
    p.textContent = overlayDesc;
    cellFrag.appendChild(p);
  }

  // Button label (field:embed_buttonLabel)
  cellFrag.appendChild(document.createComment(' field:embed_buttonLabel '));
  if (overlayBtn) {
    const p = document.createElement('p');
    p.textContent = overlayBtn;
    cellFrag.appendChild(p);
  }

  // Video URL as link (field:embed_uri)
  cellFrag.appendChild(document.createComment(' field:embed_uri '));
  if (videoUrl) {
    const p = document.createElement('p');
    const link = document.createElement('a');
    link.href = videoUrl;
    link.textContent = videoUrl;
    p.appendChild(link);
    cellFrag.appendChild(p);
  }

  const cells = [[cellFrag]];
  const block = WebImporter.Blocks.createBlock(document, { name: 'embed', cells });

  // Rule 4: Carry analytics from source to block
  applyAnalytics(element, block, document);
  element.replaceWith(block);
}
