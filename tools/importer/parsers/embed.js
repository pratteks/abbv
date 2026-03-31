/* eslint-disable */
/* global WebImporter */

/**
 * Parser: embed
 * Base block: embed
 * Source: https://www.abbvie.com/science.html
 * Generated: 2026-03-22
 *
 * Source DOM structure:
 * .container.cmp-container-full-width:has(.brightcove-video)
 *   > .cmp-container > .cmp-video__container.brightcove-video
 *   Also contains: .cmp-title h2 (heading), .cmp-text p (description), .cmp-button (watch link)
 *
 * Block library: Embed = 1 column, 2 rows (name, content with optional image + URL)
 * UE Model fields: embed_placeholder (reference), embed_placeholderAlt (collapsed - skip),
 *   embed_title, embed_description, embed_buttonLabel, embed_uri
 * All embed_* fields share prefix "embed" = grouped into same cell
 */
export default function parse(element, { document }) {
  // Extract poster/thumbnail image
  const posterImg = element.querySelector('.cmp-image img, img.cmp-image__image, img[class*="poster"], img[class*="thumbnail"]');

  // Extract video URL from Brightcove container or link
  const brightcoveContainer = element.querySelector('.brightcove-video, [class*="brightcove"]');
  const videoLink = element.querySelector('a[href*="brightcove"], a[href*="video"], .cmp-button[href]');
  let videoUrl = '';
  if (videoLink) {
    videoUrl = videoLink.getAttribute('href') || '';
  } else if (brightcoveContainer) {
    const dataAccount = brightcoveContainer.getAttribute('data-account') || '';
    const dataVideoId = brightcoveContainer.getAttribute('data-video-id') || '';
    if (dataAccount && dataVideoId) {
      videoUrl = 'https://players.brightcove.net/' + dataAccount + '/default_default/index.html?videoId=' + dataVideoId;
    }
  }

  // Extract title heading
  const heading = element.querySelector('.cmp-title h2, .cmp-title h3, .cmp-title__text');

  // Extract description
  const descText = element.querySelector('.cmp-text p, .cmp-text');

  // Extract button label
  const buttonLabel = element.querySelector('.cmp-button__text, .cmp-button');
  const buttonText = buttonLabel ? buttonLabel.textContent.trim() : '';

  // Build single cell with all embed_* fields grouped together
  const contentFrag = document.createDocumentFragment();

  // embed_placeholder (image)
  contentFrag.appendChild(document.createComment(' field:embed_placeholder '));
  if (posterImg) {
    contentFrag.appendChild(posterImg);
  }

  // embed_title
  contentFrag.appendChild(document.createComment(' field:embed_title '));
  if (heading) {
    contentFrag.appendChild(document.createTextNode(heading.textContent.trim()));
  }

  // embed_description
  contentFrag.appendChild(document.createComment(' field:embed_description '));
  if (descText) {
    contentFrag.appendChild(document.createTextNode(descText.textContent.trim()));
  }

  // embed_buttonLabel
  contentFrag.appendChild(document.createComment(' field:embed_buttonLabel '));
  if (buttonText) {
    contentFrag.appendChild(document.createTextNode(buttonText));
  }

  // embed_uri (the video URL)
  contentFrag.appendChild(document.createComment(' field:embed_uri '));
  if (videoUrl) {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.textContent = videoUrl;
    contentFrag.appendChild(link);
  }

  const cells = [[contentFrag]];

  const block = WebImporter.Blocks.createBlock(document, { name: 'embed', cells });
  element.replaceWith(block);
}
