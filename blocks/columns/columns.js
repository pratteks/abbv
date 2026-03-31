import { resolveImageReference } from '../../scripts/scripts.js';
import decorateExternalLinksUtility from '../../scripts/utils.js';

/**
 * Parse a video URL to extract provider and video info.
 * @param {string} href - The video URL
 * @returns {object|null} Video info or null
 */
function parseVideoUrl(href) {
  try {
    const url = new URL(href);
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
 * Decorate the dark stats dashboard (4-col layout inside .section.dark).
 * Restructures flat paragraphs into proper card groups with number+suffix wrappers.
 *
 * Before:  cell > p, p, p, p, p, p, p  (flat paragraphs)
 * After:   cell > .card > [p.eyebrow, .stat-value > (p + p), p.description]
 */
function decorateDashboardCards(block) {
  const section = block.closest('.section');
  if (!section?.classList.contains('dark')) return;

  [...block.querySelectorAll(':scope > div > div')].forEach((cell) => {
    const paragraphs = [...cell.querySelectorAll(':scope > p')];
    if (paragraphs.length < 3) return;

    const hasImage = paragraphs[0]?.querySelector('img');

    // Step 1: Wrap number+suffix pairs into .stat-value divs.
    // Suffix = 1-2 char text following a number-like paragraph.
    // Iterate backwards to avoid index shift issues.
    for (let i = paragraphs.length - 1; i > 0; i -= 1) {
      const text = paragraphs[i].textContent.trim();
      const prevText = paragraphs[i - 1].textContent.trim();
      if (text.length <= 2 && /[\d~$]/.test(prevText) && prevText.length < 10) {
        const wrapper = document.createElement('div');
        wrapper.className = 'stat-value';
        paragraphs[i - 1].before(wrapper);
        wrapper.append(paragraphs[i - 1], paragraphs[i]);
      }
    }

    // Step 2: Split into card groups
    if (hasImage) {
      // Image column: single continuous card — image on top, text below, no separator
      const card = document.createElement('div');
      card.className = 'card card-image';
      [...cell.children].forEach((ch) => card.append(ch));
      cell.append(card);
    } else {
      // Text-only column: find split between card 1 and card 2.
      // After stat-value wrapping, a "description" (long text) marks the end of a card.
      // The next short paragraph after a description is the second eyebrow.
      const elements = [...cell.children];
      let splitIndex = -1;
      let foundDescription = false;

      for (let i = 0; i < elements.length; i += 1) {
        const el = elements[i];
        const isStatValue = el.classList?.contains('stat-value');
        const text = el.textContent?.trim() || '';

        if (!isStatValue && text.length > 30) {
          foundDescription = true;
        } else if (foundDescription && !isStatValue && text.length > 0 && text.length < 30) {
          splitIndex = i;
          break;
        }
      }

      if (splitIndex > 0) {
        const card1 = document.createElement('div');
        card1.className = 'card card-text';
        const card2 = document.createElement('div');
        card2.className = 'card card-text';
        const allElements = [...cell.children];
        allElements.forEach((el, i) => {
          if (i < splitIndex) card1.append(el);
          else card2.append(el);
        });
        cell.append(card1, card2);
      }
    }
  });
}

export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // Whether this block is a 4-column layout — grid and image classes are suppressed in this case
  const isFourCols = block.classList.contains('columns-4-cols');

  // setup image columns and video
  [...block.children].forEach((row) => {
    // Determine at row level whether any column in this row contains a video link.
    // If so, the entire row is treated as a video row and col-grid-block is not applied.
    const rowHasVideo = [...row.querySelectorAll('a')].some((a) => parseVideoUrl(a.href));

    [...row.children].forEach((col, index) => {
      resolveImageReference(col);

      // Apply to the first column of every row, except for 4-column layouts
      if (index === 0 && !isFourCols) {
        col.classList.add('columns-img-grid-col');
      }

      // Apply col-grid-block only when the row contains no video link and is not a 4-column layout
      if (!rowHasVideo && !isFourCols) {
        block.classList.add('col-grid-block');
      }

      const pic = col.querySelector('picture') || col.querySelector('img');

      // Check for video links in column
      const videoLink = [...col.querySelectorAll('a')].find((a) => parseVideoUrl(a.href));

      if (videoLink && pic) {
        const videoInfo = parseVideoUrl(videoLink.href);
        const btnText = videoLink.textContent.trim();

        // Build video overlay: image with dark overlay, title text, and watch button
        block.classList.add('video-block');
        col.classList.add('columns-video-col');

        // Collect title text from non-image, non-link paragraphs
        const titleParagraphs = [...col.querySelectorAll('p')].filter(
          (p) => !p.querySelector('img, picture') && !p.querySelector('a') && p.textContent.trim(),
        );
        const titleText = titleParagraphs.map((p) => p.textContent.trim()).join(' ');

        // Create overlay structure
        const overlay = document.createElement('div');
        overlay.className = 'columns-video-overlay';

        if (titleText) {
          const title = document.createElement('h2');
          title.className = 'columns-video-title';
          title.textContent = titleText;
          overlay.append(title);
        }

        const playBtn = document.createElement('button');
        playBtn.className = 'columns-video-play';
        playBtn.innerHTML = `<span class="columns-video-play-icon"></span>${btnText}`;
        overlay.append(playBtn);

        // Remove original text paragraphs and link
        titleParagraphs.forEach((p) => p.remove());
        const linkParent = videoLink.closest('p') || videoLink;
        linkParent.remove();

        col.append(overlay);

        // Make the column clickable for video playback
        col.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (col.classList.contains('playing')) return;
          const iframe = document.createElement('iframe');
          iframe.src = getPlayerUrl(videoInfo);
          iframe.className = 'columns-video-player';
          iframe.setAttribute('frameborder', '0');
          iframe.setAttribute('allowfullscreen', '');
          iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
          col.classList.add('playing');
          col.append(iframe);
        });
      }
    });
  });

  // Apply section background image from data-background attribute.
  // Reinforces decorateSectionBackgrounds() which may be reset by Author/UE.
  const section = block.closest('.section');
  if (section && section.dataset.background) {
    section.style.backgroundImage = `url('${section.dataset.background}')`;
    section.classList.remove('abbvie-container');
  }

  // Decorate dashboard stat cards (dark 4-col section)
  if (isFourCols) {
    decorateDashboardCards(block);
  }

  // Split attribution paragraphs containing <br> into name + location spans
  // so name line can be styled bold independently of text wrapping
  block.querySelectorAll('.video-block > div > div:not(.columns-video-col) > p:last-child').forEach((p) => {
    const br = p.querySelector('br');
    if (!br) return;
    const nameText = br.previousSibling?.textContent?.trim();
    const locText = br.nextSibling?.textContent?.trim();
    if (nameText && locText) {
      const nameSpan = document.createElement('span');
      nameSpan.className = 'attribution-name';
      nameSpan.textContent = nameText;
      const locSpan = document.createElement('span');
      locSpan.className = 'attribution-location';
      locSpan.textContent = locText;
      p.textContent = '';
      p.append(nameSpan, locSpan);
    }
  });

  // Decorate external links across the entire block
  decorateExternalLinksUtility(block);

  /*
   * Column ratio variants (via block variant name in authoring):
   * - columns (33-67): 1/3 + 2/3 split (AEM col-with-4 + col-with-8)
   * - columns (67-33): 2/3 + 1/3 split
   * - columns (42-58): ~5/12 + 7/12 split (AEM col-with-5 + col-with-7)
   * - columns (58-42): ~7/12 + 5/12 split
   * - columns (25-75): 1/4 + 3/4 split
   * - columns (75-25): 3/4 + 1/4 split
   *
   * These are applied as CSS classes by the block loader:
   * e.g., "columns (33-67)" → block gets class "columns" + variant class "33-67"
   * which the block loader converts to a CSS-safe class.
   *
   * Margin-bottom variants (via the "Margin Bottom" dropdown in UE):
   * - mb-1 through mb-6 and custom-mb-col are applied automatically by EDS
   *   via the classes_marginBottom field (classes_ prefix convention).
   * - No JS handling is required — EDS adds the selected value directly
   *   as a class on the block element at render time.
   */
}
