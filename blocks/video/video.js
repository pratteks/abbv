/*
 * Video Block
 * Show a video referenced by a link
 * https://www.hlx.live/developer/block-collection/video
 */

import { resolveImageReference } from '../../scripts/scripts.js';
import { applyCommonProps } from '../../scripts/utils.js';

// const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function getFieldElement(block, name) {
  return block.querySelector(`[data-aue-prop="${name}"]`) || null;
}

function getFieldText(block, name) {
  const field = getFieldElement(block, name);
  if (!field) return '';
  return (field.getAttribute('data-aue-value') ?? field.textContent ?? '').trim();
}

function getFieldBoolean(block, name, fallback = false) {
  const value = getFieldText(block, name).toLowerCase();
  if (!value) return fallback;
  if (['true', '1', 'yes', 'on'].includes(value)) return true;
  if (['false', '0', 'no', 'off'].includes(value)) return false;
  return fallback;
}

function parseBooleanValue(value, fallback = false) {
  const normalized = `${value || ''}`.trim().toLowerCase();
  if (!normalized) return fallback;
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function isBooleanLikeValue(value) {
  const normalized = `${value || ''}`.trim().toLowerCase();
  return ['true', '1', 'yes', 'on', 'false', '0', 'no', 'off'].includes(normalized);
}

// ─────────────────────────────────────────────────────────────────────────────
// Config reader
// ─────────────────────────────────────────────────────────────────────────────

function getVideoConfig(block) {
  const textRows = [...block.querySelectorAll(':scope > div')].filter((row) => row.querySelector(':scope > div'));

  const getText = (row) => row?.querySelector(':scope > div')?.textContent?.trim()
    || row?.textContent?.trim()
    || '';

  let placeholderAlt = '';
  let overlayTitle = '';
  let overlayDescription = '';
  let overlayBtnText = '';
  let videoContentLayout = '';
  let overlayButtonIconType = '';
  let overlayButtonFontIcon = '';

  const get = (i) => (textRows[i] ? getText(textRows[i]) : undefined);

  placeholderAlt = get(2);
  overlayTitle = get(3);
  overlayDescription = get(4);
  overlayBtnText = get(5);
  videoContentLayout = get(6) || 'none';
  overlayButtonIconType = get(7) || '';
  overlayButtonFontIcon = get(8) || '';
  const featureRowValues = textRows
    .map((row) => getText(row))
    .filter(isBooleanLikeValue);
  const featureValues = featureRowValues.slice(-4);

  const hasFeatureFields = !!getFieldElement(block, 'enableAutoplay')
    || !!getFieldElement(block, 'enableCaptions')
    || !!getFieldElement(block, 'enablePlayerControls')
    || !!getFieldElement(block, 'enableFullscreen');

  return {
    placeholderAlt,
    overlayTitle,
    overlayDescription,
    overlayBtnText,
    videoContentLayout,
    overlayButtonIconType: getFieldText(block, 'overlayButtonIconType') || overlayButtonIconType,
    overlayButtonFontIcon: getFieldText(block, 'overlayButtonFontIcon') || overlayButtonFontIcon,
    overlayColor: [...block.classList].find((c) => c.startsWith('video-overlay-')) || 'video-overlay-navy',
    overlayBtnStyle: [...block.classList].find((c) => c.startsWith('video-btn-')) || 'video-btn-outline',
    enableAutoplay: hasFeatureFields
      ? getFieldBoolean(block, 'enableAutoplay', false)
      : parseBooleanValue(featureValues[0], block.classList.contains('autoplay')),
    enableCaptions: hasFeatureFields
      ? getFieldBoolean(block, 'enableCaptions', false)
      : parseBooleanValue(featureValues[1], block.classList.contains('captions')),
    enablePlayerControls: hasFeatureFields
      ? getFieldBoolean(block, 'enablePlayerControls', true)
      : parseBooleanValue(featureValues[2], block.classList.contains('playercontrols')),
    enableFullscreen: hasFeatureFields
      ? getFieldBoolean(block, 'enableFullscreen', true)
      : parseBooleanValue(featureValues[3], true),
  };
}

function buildOverlayButtonIcon(config) {
  if (config.overlayButtonIconType !== 'icon-font' || !config.overlayButtonFontIcon) return null;

  const icon = document.createElement('span');
  icon.className = `video-play-icon icon-abbvie-${config.overlayButtonFontIcon}`;
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}

// ─────────────────────────────────────────────────────────────────────────────
// Placeholder image resolver
// Mirrors the pattern used by brightcove-podcast-player: explicitly call
// resolveImageReference on the row that holds the placeholderImage reference
// field so that EDS converts the content reference into a <picture> element
// before we attempt to clone it.
// ─────────────────────────────────────────────────────────────────────────────

function isEmbedVideoHref(href) {
  if (!href) return false;
  return /youtube\.com|youtu\.be|vimeo\.com/i.test(href);
}

/** Any href used as the block's main video source (embed or file). */
function isVideoSourceHref(href) {
  if (!href) return false;
  if (isEmbedVideoHref(href)) return true;
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(href);
}

function isPosterReferenceHref(href) {
  if (!href || isEmbedVideoHref(href)) return false;
  return /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?|$)/i.test(href)
    || href.includes('scene7.com')
    || href.includes('/is/image/')
    || href.includes('/content/dam/')
    || href.includes('media_');
}

function resolvePlaceholderInContainer(container) {
  if (!container || container.querySelector('picture, img')) return;
  const link = [...container.querySelectorAll('a[href]')].find((a) => isPosterReferenceHref(a.href));
  if (link) resolveImageReference(container);
}

function pickPosterNode(block) {
  const propRoot = block.querySelector('[data-aue-prop="placeholderImage"]');
  if (propRoot) {
    const pic = propRoot.querySelector('picture');
    if (pic) return pic;
    const img = propRoot.querySelector('img');
    if (img) return img;
  }
  return block.querySelector('picture') || block.querySelector('img') || null;
}

function resolvePlaceholder(block) {
  const posterField = block.querySelector('[data-aue-prop="placeholderImage"]');
  if (posterField) {
    const target = posterField.matches('a') ? posterField.parentElement : posterField;
    resolvePlaceholderInContainer(target);
  }

  const rows = [...block.querySelectorAll(':scope > div')];
  rows.forEach((row) => {
    const cell = row.querySelector(':scope > div') || row;
    if (cell.querySelector('picture, img')) return;
    if (![...cell.querySelectorAll('a[href]')].some((a) => isPosterReferenceHref(a.href))) return;
    resolveImageReference(cell);
  });

  return pickPosterNode(block);
}

// ─────────────────────────────────────────────────────────────────────────────
// GTM analytics for YouTube — ported from AEM _ytplayer.js
// Attaches a scoped postMessage listener to a single YouTube iframe so each
// block instance tracks independently. Cleans up when the iframe is removed.
// ─────────────────────────────────────────────────────────────────────────────

function setupYouTubeAnalytics(iframe) {
  const dl = () => {
    window.dataLayer = window.dataLayer || [];
    return window.dataLayer;
  };
  const PROGRESS_POINTS = [25, 50, 75];
  const progressReached = {};
  let started = false;
  let completed = false;
  let duration = 0;
  let title = '';

  const idMatch = iframe.src.match(/\/embed\/([^?&]+)/);
  const videoId = idMatch ? idMatch[1] : '';

  function checkProgress(currentTime) {
    if (!duration) return;
    const pct = Math.floor((currentTime / duration) * 100);
    PROGRESS_POINTS.forEach((threshold) => {
      if (pct >= threshold && !progressReached[threshold]) {
        progressReached[threshold] = true;
        dl().push({
          event: 'video_progress',
          video_name: title || videoId,
          video_id: videoId,
          video_length: duration,
          percent: String(threshold),
        });
      }
    });
    if (pct >= 97 && !completed) {
      completed = true;
      dl().push({
        event: 'video_complete',
        video_name: title || videoId,
        video_id: videoId,
        video_length: duration,
      });
    }
  }

  function onMessage(e) {
    if (!e.data || e.source !== iframe.contentWindow) return;
    let obj;
    try {
      obj = JSON.parse(e.data);
    } catch {
      return;
    }
    if (obj.event !== 'infoDelivery' || !obj.info) return;

    const {
      playerState, currentTime, duration: dur, videoData,
    } = obj.info;
    if (dur) duration = dur;
    if (videoData?.title) title = videoData.title;

    if (playerState === 1 && !started) {
      started = true;
      PROGRESS_POINTS.forEach((p) => { progressReached[p] = false; });
      completed = false;
      dl().push({
        event: 'video_start',
        video_name: title || videoId,
        video_id: videoId,
        video_length: duration,
      });
    }
    if (playerState === 0 && !completed) {
      completed = true;
      dl().push({
        event: 'video_complete',
        video_name: title || videoId,
        video_id: videoId,
        video_length: duration,
      });
    }
    if (currentTime != null) checkProgress(currentTime);
  }

  window.addEventListener('message', onMessage);

  const observer = new MutationObserver(() => {
    if (!document.contains(iframe)) {
      window.removeEventListener('message', onMessage);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
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

function embedYoutube(url, options) {
  const {
    background,
    userInitiated,
    enableCaptions,
    enablePlayerControls,
    enableFullscreen,
  } = options;
  const shouldAutoplay = userInitiated;
  const videoId = getYouTubeId(url);
  const params = new URLSearchParams();
  params.set('rel', '0');
  params.set('playsinline', '1');
  params.set('enablejsapi', '1');
  params.set('origin', window.location.origin);
  params.set('controls', enablePlayerControls ? '1' : '0');
  params.set('modestbranding', '1');
  params.set('fs', enableFullscreen ? '1' : '0');
  if (enableCaptions) params.set('cc_load_policy', '1');
  if (shouldAutoplay || background) {
    params.set('autoplay', shouldAutoplay ? '1' : '0');
  }
  if (background) {
    params.set('mute', '1');
  }
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
  iframe.allow = `${shouldAutoplay ? 'autoplay; ' : ''}${enableFullscreen ? 'fullscreen; ' : ''}picture-in-picture; encrypted-media; accelerometer; gyroscope`;
  iframe.allowFullscreen = enableFullscreen;
  iframe.loading = 'lazy';
  iframe.title = 'Content from Youtube';

  iframe.addEventListener('load', () => setupYouTubeAnalytics(iframe), { once: true });

  const wrap = document.createElement('div');
  wrap.className = 'video-player-wrap';
  wrap.append(iframe);
  return wrap;
}

function embedVimeo(url, options) {
  const {
    background,
    userInitiated,
    enablePlayerControls,
    enableFullscreen,
  } = options;
  const shouldAutoplay = userInitiated;
  const videoId = url.pathname.split('/').filter(Boolean).pop();
  const params = new URLSearchParams();
  params.set('api', '1');
  params.set('playsinline', '1');
  params.set('controls', enablePlayerControls ? '1' : '0');
  if (shouldAutoplay || background) params.set('autoplay', shouldAutoplay ? '1' : '0');
  if (background) {
    params.set('background', '1');
    params.set('muted', '1');
    params.set('loop', '1');
  }

  const iframe = document.createElement('iframe');
  iframe.className = 'video-iframe';
  iframe.src = `https://player.vimeo.com/video/${videoId}?${params.toString()}`;
  iframe.allow = `${shouldAutoplay ? 'autoplay; ' : ''}${enableFullscreen ? 'fullscreen; ' : ''}picture-in-picture`;
  iframe.allowFullscreen = enableFullscreen;
  iframe.loading = 'lazy';
  iframe.title = 'Content from Vimeo';

  const wrap = document.createElement('div');
  wrap.className = 'video-player-wrap';
  wrap.append(iframe);
  return wrap;
}

function getNativeVideoElement(source, options) {
  const {
    background,
    userInitiated,
    enablePlayerControls,
    enableFullscreen,
  } = options;
  const shouldAutoplay = userInitiated;
  const video = document.createElement('video');
  video.className = 'video-native';
  video.setAttribute('playsinline', '');
  if (enablePlayerControls) video.setAttribute('controls', '');
  if (shouldAutoplay) video.setAttribute('autoplay', '');
  if (background) {
    video.setAttribute('loop', '');
    video.muted = true;
    video.removeAttribute('controls');
  }
  if (!enableFullscreen) video.setAttribute('controlslist', 'nofullscreen');
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

function loadVideoEmbed(block, link, options, mountPoint) {
  const { userInitiated } = options;
  if (block.dataset.embedLoaded === 'true' || block.dataset.embedLoading === 'true') {
    if (userInitiated) sendYouTubeCommand(block, 'playVideo');
    return;
  }
  block.dataset.embedLoading = 'true';

  const url = new URL(link);
  const isYoutube = link.includes('youtube') || link.includes('youtu.be');
  const isVimeo = link.includes('vimeo');
  let playerWrap;

  if (isYoutube) {
    block.dataset.videoProvider = 'youtube';
    playerWrap = embedYoutube(url, options);
    playerWrap.querySelector('iframe').addEventListener('load', () => {
      block.dataset.embedLoaded = 'true';
      block.dataset.embedLoading = 'false';
      if (userInitiated) {
        sendYouTubeCommand(block, 'playVideo');
      }
    }, { once: true });
  } else if (isVimeo) {
    block.dataset.videoProvider = 'vimeo';
    playerWrap = embedVimeo(url, options);
    playerWrap.querySelector('iframe').addEventListener('load', () => {
      block.dataset.embedLoaded = 'true';
      block.dataset.embedLoading = 'false';
    }, { once: true });
  } else {
    block.dataset.videoProvider = 'native';
    playerWrap = getNativeVideoElement(link, options);
    playerWrap.querySelector('video').addEventListener('canplay', (event) => {
      block.dataset.embedLoaded = 'true';
      block.dataset.embedLoading = 'false';
      if (userInitiated) {
        const playAttempt = event.target.play();
        if (playAttempt?.catch) playAttempt.catch(() => {});
      }
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

  const icon = buildOverlayButtonIcon(config);
  const label = document.createElement('span');
  label.className = 'video-play-label';
  label.textContent = config.overlayBtnText || 'Watch';

  if (icon) btn.append(icon);
  btn.append(label);
  return btn;
}

function buildOverlay(config, onPlay) {
  const overlay = document.createElement('div');
  overlay.className = `video-overlay ${config.overlayColor}`;
  const isOverlayMode = config.videoContentLayout === 'none';

  if (isOverlayMode && config.overlayTitle) {
    const title = document.createElement('p');
    title.className = 'video-overlay-title';
    title.textContent = config.overlayTitle;
    overlay.append(title);
  }

  if (isOverlayMode && config.overlayDescription) {
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

function buildContentArea(config) {
  const area = document.createElement('div');
  area.className = 'video-content-area';

  if (config.overlayTitle) {
    const title = document.createElement('p');
    title.className = 'video-content-title';
    const b = document.createElement('b');
    b.textContent = config.overlayTitle;
    title.append(b);
    area.append(title);
  }

  if (config.overlayDescription) {
    const desc = document.createElement('p');
    desc.className = 'video-content-desc';
    desc.textContent = config.overlayDescription;
    area.append(desc);
  }

  return area;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main decorate
// ─────────────────────────────────────────────────────────────────────────────

export default async function decorate(block) {
  applyCommonProps(block, 14);
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

  const linkEl = [...block.querySelectorAll('a[href]')].find((a) => isVideoSourceHref(a.href));
  const link = linkEl?.href || '';

  // Guard: nothing to build without a video link
  if (!link) return;

  block.textContent = '';

  const layout = config.videoContentLayout || 'none';
  block.classList.add(`video-content-${layout}`);

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

  const videoOptions = {
    background: false,
    userInitiated: false,
    enableCaptions: config.enableCaptions,
    enablePlayerControls: config.enablePlayerControls,
    enableFullscreen: config.enableFullscreen,
  };

  const startPlayback = () => {
    loadVideoEmbed(block, link, {
      ...videoOptions,
      userInitiated: config.enableAutoplay,
    }, media);
  };

  const overlay = buildOverlay(config, startPlayback);
  shell.append(overlay);

  const mainWrapper = document.createElement('div');
  mainWrapper.className = 'video-main';

  if (layout !== 'none') {
    const contentArea = buildContentArea(config);
    if (layout === 'left') {
      mainWrapper.append(contentArea, shell);
    } else if (layout === 'right') {
      mainWrapper.append(shell, contentArea);
    } else {
      mainWrapper.append(shell, contentArea);
    }
  } else {
    mainWrapper.append(shell);
  }

  block.append(mainWrapper);
}
