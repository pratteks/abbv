/*
 * Video Block
 * Show a video referenced by a link
 * https://www.hlx.live/developer/block-collection/video
 */

import { resolveImageReference } from '../../scripts/scripts.js';
import { applyCommonProps } from '../../scripts/utils.js';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// ─────────────────────────────────────────────────────────────────────────────
// Config reader
// ─────────────────────────────────────────────────────────────────────────────

function getVideoConfig(block) {
  const textRows = [...block.querySelectorAll(':scope > div')].filter((row) => {
    const cell = row.querySelector(':scope > div');
    if (!cell) return false;
    if (cell.querySelector('a, picture, img')) return false;
    return cell.textContent.trim().length > 0;
  });

  const getText = (row) => row?.querySelector(':scope > div')?.textContent?.trim()
    || row?.textContent?.trim()
    || '';

  const len = textRows.length;

  let placeholderAlt = '';
  let overlayTitle = '';
  let overlayDescription = '';
  let overlayBtnText = '';

  // CASE 1: Only Title
  const get = (i) => (textRows[i] ? getText(textRows[i]) : undefined);

  if (len >= 4) {
    placeholderAlt = get(0);
    overlayTitle = get(1);
    overlayDescription = get(2);
    overlayBtnText = get(3);
  } else {
    overlayTitle = get(0);
    overlayDescription = get(1);
    overlayBtnText = get(2);
  }

  return {
    placeholderAlt,
    overlayTitle,
    overlayDescription,
    overlayBtnText,
    overlayColor: [...block.classList].find((c) => c.startsWith('video-overlay-')) || 'video-overlay-navy',
    overlayBtnStyle: [...block.classList].find((c) => c.startsWith('video-btn-')) || 'video-btn-outline',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Placeholder image resolver
// Mirrors the pattern used by brightcove-podcast-player: explicitly call
// resolveImageReference on the row that holds the placeholderImage reference
// field so that EDS converts the content reference into a <picture> element
// before we attempt to clone it.
// ─────────────────────────────────────────────────────────────────────────────

function resolvePlaceholder(block) {
  // The placeholderImage reference field renders as a block row whose first
  // cell contains only an <a> or unresolved image reference — no visible text.
  // resolveImageReference replaces that with a proper <picture> element.
  const rows = [...block.querySelectorAll(':scope > div')];
  rows.forEach((row) => {
    const cell = row.querySelector(':scope > div') || row;
    // Only process rows that do not already have a picture/img and are not
    // pure text rows (i.e. the image reference row).
    if (!cell.querySelector('picture, img') && cell.querySelector('a[href*="/content/dam"], a[href*="media_"]')) {
      resolveImageReference(cell);
    }
  });

  // After resolution, find the resulting picture or img anywhere in the block
  return block.querySelector('picture') || block.querySelector('img') || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// YouTube / Vimeo / native embed helpers
// ─────────────────────────────────────────────────────────────────────────────

function getYouTubeId(url) {
  const usp = new URLSearchParams(url.search);
  if (usp.get('v')) return usp.get('v');
  if (url.origin.includes('youtu.be')) return url.pathname.split('/').filter(Boolean)[0] || '';
  if (url.pathname.includes('/embed/')) return url.pathname.split('/embed/')[1]?.split('/')[0] || '';
  return '';
}

function embedYoutube(url, autoplay, background) {
  const videoId = getYouTubeId(url);
  const params = new URLSearchParams();
  params.set('rel', '0');
  params.set('playsinline', '1');
  params.set('enablejsapi', '1');
  params.set('origin', window.location.origin);
  if (autoplay || background) params.set('autoplay', autoplay ? '1' : '0');
  if (background) {
    params.set('mute', '1');
    params.set('controls', '0');
    params.set('disablekb', '1');
    params.set('loop', '1');
    if (videoId) params.set('playlist', videoId);
  }

  const iframe = document.createElement('iframe');
  iframe.className = 'video-iframe';
  iframe.src = videoId
    ? `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`
    : url.href;
  iframe.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope';
  iframe.allowFullscreen = true;
  iframe.loading = 'lazy';
  iframe.title = 'Content from Youtube';

  const wrap = document.createElement('div');
  wrap.className = 'video-player-wrap';
  wrap.append(iframe);
  return wrap;
}

function embedVimeo(url, autoplay, background) {
  const videoId = url.pathname.split('/').filter(Boolean).pop();
  const params = new URLSearchParams();
  params.set('api', '1');
  params.set('playsinline', '1');
  if (autoplay || background) params.set('autoplay', autoplay ? '1' : '0');
  if (background) {
    params.set('background', '1');
    params.set('muted', '1');
    params.set('loop', '1');
  }

  const iframe = document.createElement('iframe');
  iframe.className = 'video-iframe';
  iframe.src = `https://player.vimeo.com/video/${videoId}?${params.toString()}`;
  iframe.allow = 'autoplay; fullscreen; picture-in-picture';
  iframe.allowFullscreen = true;
  iframe.loading = 'lazy';
  iframe.title = 'Content from Vimeo';

  const wrap = document.createElement('div');
  wrap.className = 'video-player-wrap';
  wrap.append(iframe);
  return wrap;
}

function getNativeVideoElement(source, autoplay, background) {
  const video = document.createElement('video');
  video.className = 'video-native';
  video.setAttribute('controls', '');
  if (autoplay) video.setAttribute('autoplay', '');
  if (background) {
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    video.muted = true;
    video.removeAttribute('controls');
  }
  const srcEl = document.createElement('source');
  srcEl.setAttribute('src', source);
  srcEl.setAttribute('type', `video/${source.split('.').pop()}`);
  video.append(srcEl);

  const wrap = document.createElement('div');
  wrap.className = 'video-player-wrap';
  wrap.append(video);
  return wrap;
}

// ─────────────────────────────────────────────────────────────────────────────
// Playback helpers
// ─────────────────────────────────────────────────────────────────────────────

function sendYouTubeCommand(block, func) {
  const iframe = block.querySelector('.video-iframe');
  iframe?.contentWindow?.postMessage(
    JSON.stringify({ event: 'command', func, args: '' }),
    '*',
  );
}

function loadVideoEmbed(block, link, autoplay, background, mountPoint) {
  if (block.dataset.embedLoaded === 'true' || block.dataset.embedLoading === 'true') {
    if (autoplay) sendYouTubeCommand(block, 'playVideo');
    return;
  }
  block.dataset.embedLoading = 'true';

  const url = new URL(link);
  const isYoutube = link.includes('youtube') || link.includes('youtu.be');
  const isVimeo = link.includes('vimeo');
  let playerWrap;

  if (isYoutube) {
    block.dataset.videoProvider = 'youtube';
    playerWrap = embedYoutube(url, autoplay, background);
    playerWrap.querySelector('iframe').addEventListener('load', () => {
      block.dataset.embedLoaded = 'true';
      block.dataset.embedLoading = 'false';
    }, { once: true });
  } else if (isVimeo) {
    block.dataset.videoProvider = 'vimeo';
    playerWrap = embedVimeo(url, autoplay, background);
    playerWrap.querySelector('iframe').addEventListener('load', () => {
      block.dataset.embedLoaded = 'true';
      block.dataset.embedLoading = 'false';
    }, { once: true });
  } else {
    block.dataset.videoProvider = 'native';
    playerWrap = getNativeVideoElement(link, autoplay, background);
    playerWrap.querySelector('video').addEventListener('canplay', () => {
      block.dataset.embedLoaded = 'true';
      block.dataset.embedLoading = 'false';
    }, { once: true });
  }

  mountPoint.append(playerWrap);
}

// ─────────────────────────────────────────────────────────────────────────────
// Overlay builder
// ─────────────────────────────────────────────────────────────────────────────

function buildOverlayButton(config) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `video-play-btn ${config.overlayBtnStyle}`;
  btn.setAttribute('aria-label', `Play video${config.overlayTitle ? `: ${config.overlayTitle}` : ''}`);

  const icon = document.createElement('span');
  icon.className = 'video-play-icon';
  icon.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.className = 'video-play-label';
  label.textContent = config.overlayBtnText || 'Watch';

  btn.append(icon, label);
  return btn;
}

function buildOverlay(config, onPlay) {
  const overlay = document.createElement('div');
  overlay.className = `video-overlay ${config.overlayColor}`;

  if (config.overlayTitle) {
    const title = document.createElement('p');
    title.className = 'video-overlay-title';
    title.textContent = config.overlayTitle;
    overlay.append(title);
  }

  if (config.overlayDescription) {
    const desc = document.createElement('p');
    desc.className = 'video-overlay-description';
    desc.textContent = config.overlayDescription;
    overlay.append(desc);
  }

  const controls = document.createElement('div');
  controls.className = 'video-controls';

  const btn = buildOverlayButton(config);
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    overlay.remove();
    onPlay();
  });

  controls.append(btn);
  overlay.append(controls);
  return overlay;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main decorate
// ─────────────────────────────────────────────────────────────────────────────

export default async function decorate(block) {
  applyCommonProps(block);
  const config = getVideoConfig(block);
  const section = block.closest('.section');

  block.classList.add('video-stage');
  block.dataset.videoState = 'idle';
  block.dataset.embedLoaded = 'false';
  block.dataset.embedLoading = 'false';

  if (section) section.classList.add('video-section');

  // Explicitly resolve the placeholderImage reference field into a <picture>
  // element before querying for it. Without this step, EDS does not convert
  // the content reference link into an image node, so querySelector returns
  // null and the poster is never rendered — matching the brightcove-podcast-player
  // pattern which calls resolveImageReference before reading the thumbnail.
  const rawPlaceholder = resolvePlaceholder(block);

  // Clone before clearing the block so the resolved image node survives the
  // textContent wipe below.
  const placeholderClone = rawPlaceholder ? rawPlaceholder.cloneNode(true) : null;

  const linkEl = block.querySelector('a');
  const link = linkEl?.href || '';

  // Guard: nothing to build without a video link
  if (!link) return;

  block.textContent = '';

  const shell = document.createElement('div');
  shell.className = 'video-shell';

  const media = document.createElement('div');
  media.className = 'video-media';
  shell.append(media);

  if (placeholderClone) {
    const poster = placeholderClone.tagName === 'PICTURE'
      ? placeholderClone
      : (() => {
        const p = document.createElement('picture');
        p.append(placeholderClone);
        return p;
      })();

    // Apply alt text from the Placeholder Alt Text field if provided
    if (config.placeholderAlt) {
      const img = poster.querySelector('img');
      if (img) img.alt = config.placeholderAlt;
    }

    // Add class to inner img for CSS object-fit targeting
    const posterImg = poster.querySelector('img');
    if (posterImg) posterImg.classList.add('video-poster-img');

    poster.classList.add('video-poster');
    media.append(poster);
    block.classList.add('has-poster');
  }

  const autoplay = block.classList.contains('autoplay');

  const startPlayback = () => {
    loadVideoEmbed(block, link, true, false, media);
  };

  if (!autoplay) {
    const overlay = buildOverlay(config, startPlayback);
    shell.append(overlay);
  }

  block.append(shell);

  // Set up lazy-load observer when there is no poster (video loads on scroll),
  // or when autoplay is enabled (video starts on viewport entry).
  if (!placeholderClone || autoplay) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        const playOnLoad = autoplay && !prefersReducedMotion.matches;
        loadVideoEmbed(block, link, playOnLoad, autoplay, media);
      }
    });
    observer.observe(block);
  }
}
