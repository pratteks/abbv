import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation, resolveImageReference } from '../../scripts/scripts.js';

/**
 * Parse a video URL to extract provider and video info.
 * @param {string} href - The video URL
 * @returns {object|null} Video info or null
 */
function parseVideoUrl(href) {
  try {
    const url = new URL(href);
    // Brightcove: players.brightcove.net/{account}/{player}_default/index.html?videoId={id}
    if (url.hostname === 'players.brightcove.net') {
      const match = url.pathname.match(/^\/(\d+)\/([^/]+)_default/);
      if (match) {
        return {
          type: 'brightcove',
          account: match[1],
          player: match[2],
          videoId: url.searchParams.get('videoId'),
        };
      }
    }
    // YouTube: youtube-nocookie.com/embed/{id} or youtube.com/watch?v={id}
    if (url.hostname.includes('youtube')) {
      const embedMatch = url.pathname.match(/\/embed\/([^/?]+)/);
      const videoId = embedMatch ? embedMatch[1] : url.searchParams.get('v');
      if (videoId) {
        return { type: 'youtube', videoId };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Build the iframe src URL for a video.
 */
function getPlayerUrl(info) {
  if (info.type === 'brightcove') {
    return `https://players.brightcove.net/${info.account}/${info.player}_default/index.html?videoId=${info.videoId}`;
  }
  return `https://www.youtube.com/embed/${info.videoId}?rel=0`;
}

/**
 * Add video play overlay to a card image container.
 */
function setupVideoCard(imageDiv, videoInfo, btnText, block) {
  block.classList.add('cards-video');
  imageDiv.classList.add('cards-card-video');

  const playBtn = document.createElement('button');
  playBtn.className = 'cards-card-play';
  playBtn.setAttribute('aria-label', btnText || 'Play video');

  const iconSpan = document.createElement('span');
  iconSpan.className = 'cards-card-play-icon';

  const textSpan = document.createElement('span');
  textSpan.className = 'cards-card-play-text';
  textSpan.textContent = btnText || 'Watch';

  playBtn.append(iconSpan, textSpan);

  playBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (imageDiv.classList.contains('playing')) return;
    const iframe = document.createElement('iframe');
    iframe.src = getPlayerUrl(videoInfo);
    iframe.className = 'cards-card-player';
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
    imageDiv.classList.add('playing');
    imageDiv.append(iframe);
  });

  imageDiv.append(playBtn);
}

/**
 * Decorate story variant card body.
 * Restructures flat content into semantic DOM matching the live site:
 *   <p>May 19, 2021 Profile</p>  →  date span + tag span
 *   <h4><a>Title</a></h4>        →  kept as-is
 *   <p>Description</p>           →  kept as-is
 *   <p><a>Read Article</a> 5 Min →  CTA span + timestamp span
 */
function decorateStoryCard(bodyDiv) {
  const children = [...bodyDiv.children];
  const metaP = children[0]; // "May 19, 2021 Profile"
  const ctaP = children[children.length - 1]; // "<a>Read Article</a> 5 Minute Read"
  let href;

  // Parse metadata line: split "May 19, 2021 Profile" into date + tag
  if (metaP && metaP.tagName === 'P') {
    const text = metaP.textContent.trim();
    // Match date pattern followed by category word(s)
    const dateMatch = text.match(/^(.+\d{4})\s+(.+)$/);
    if (dateMatch) {
      const [, dateText, tagText] = dateMatch;
      const metaContainer = document.createElement('div');
      metaContainer.className = 'cards-card-meta';
      const dateSpan = document.createElement('span');
      dateSpan.className = 'cards-card-date';
      dateSpan.textContent = dateText;
      const tagSpan = document.createElement('span');
      tagSpan.className = 'cards-card-tag';
      tagSpan.textContent = tagText;
      metaContainer.append(dateSpan, tagSpan);
      metaP.replaceWith(metaContainer);
    }
  }

  // Parse CTA line: split link text from timestamp text
  if (ctaP && ctaP.tagName === 'P') {
    const link = ctaP.querySelector('a');
    if (link) {
      href = href || link.getAttribute('href');
      const remainingText = ctaP.textContent.replace(link.textContent, '').trim();
      const ctaContainer = document.createElement('div');
      ctaContainer.className = 'cards-card-cta';
      const ctaSpan = document.createElement('span');
      ctaSpan.className = 'cards-card-read';
      ctaSpan.textContent = link.textContent.trim();
      ctaContainer.append(ctaSpan);
      if (remainingText) {
        const timeSpan = document.createElement('span');
        timeSpan.className = 'cards-card-time';
        timeSpan.textContent = remainingText;
        ctaContainer.append(timeSpan);
      }
      ctaP.replaceWith(ctaContainer);
    }
  }

  const titleLink = bodyDiv.querySelector('h4 a');
  if (titleLink) {
    href = href || titleLink.getAttribute('href');
    titleLink.replaceWith(document.createTextNode(titleLink.textContent.trim()));
  }

  return href;
}

export default function decorate(block) {
  const isStory = block.classList.contains('story');
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      resolveImageReference(div);
      const pic = div.querySelector('picture, img');
      if (pic && div.children.length === 1) {
        div.className = 'cards-card-image';
      } else {
        div.className = 'cards-card-body';
      }
    });

    // Check body for video link; if found, set up overlay on image div
    const imageDiv = li.querySelector('.cards-card-image');
    const bodyDiv = li.querySelector('.cards-card-body');
    if (imageDiv && bodyDiv) {
      const videoLink = [...bodyDiv.querySelectorAll('a')]
        .find((a) => parseVideoUrl(a.href));
      if (videoLink) {
        const videoInfo = parseVideoUrl(videoLink.href);
        const btnText = videoLink.textContent.trim();
        videoLink.closest('p')?.remove();
        setupVideoCard(imageDiv, videoInfo, btnText, block);
      }
    }

    // Story variant: restructure body into semantic elements
    if (isStory && bodyDiv) {
      const storyHref = decorateStoryCard(bodyDiv);
      if (storyHref) {
        const wrapper = document.createElement('a');
        wrapper.href = storyHref;
        wrapper.className = 'cards-card-link';
        while (li.firstChild) wrapper.append(li.firstChild);
        li.append(wrapper);
      }
    }

    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });
  block.textContent = '';
  block.append(ul);
}
