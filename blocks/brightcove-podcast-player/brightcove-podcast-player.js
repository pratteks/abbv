import { createOptimizedPicture } from '../../scripts/aem.js';
import { resolveImageReference } from '../../scripts/scripts.js';
import { applyCommonProps } from '../../scripts/utils.js';

const DEFAULT_PLAYER = 'default';

/**
 * Brightcove account ID mapping.
 */
const ACCOUNT_MAP = {
  corporate: '2157889325001',
  public: 'public',
  commercial: 'commercial',
};

/*
 * Row indices — must match the field order in _brightcove-podcast-player.json
 * (tabs are skipped; they do not render as rows):
 *
 *  0 videoId               text
 *  1 accountId             select
 *  2 playerId              text
 *  3 podcastTitle           text
 *  4 podcastThumbnail       reference
 *  5 analyticsInteractionId text
 */
const ROW = {
  VIDEO_ID: 0,
  ACCOUNT_ID: 1,
  PLAYER_ID: 2,
  PODCAST_TITLE: 3,
  PODCAST_THUMBNAIL: 4,
  ANALYTICS_INTERACTION_ID: 5,
};

/**
 * Read text from a row's first cell.
 * @param {Element} row
 * @returns {string}
 */
function getCellText(row) {
  return row?.firstElementChild?.textContent?.trim() || '';
}

/**
 * Get a picture element from a row (for reference fields).
 * @param {Element} row
 * @returns {Element|null}
 */
function getCellPicture(row) {
  if (!row) return null;
  resolveImageReference(row.firstElementChild || row);
  return row.querySelector('picture');
}

/**
 * Read all block fields from the rendered table rows.
 * @param {Element} block
 * @returns {object}
 */
function readBlock(block) {
  const rows = [...block.children];
  return {
    videoId: getCellText(rows[ROW.VIDEO_ID]),
    accountId: getCellText(rows[ROW.ACCOUNT_ID]) || 'corporate',
    playerId: getCellText(rows[ROW.PLAYER_ID]),
    podcastTitle: getCellText(rows[ROW.PODCAST_TITLE]),
    podcastThumbnail: getCellPicture(rows[ROW.PODCAST_THUMBNAIL]),
    analyticsInteractionId: getCellText(rows[ROW.ANALYTICS_INTERACTION_ID]),
  };
}

/**
 * Cache of loaded Brightcove SDK scripts (keyed by account/player).
 */
const bcScripts = {};

/**
 * Load the Brightcove Player SDK script for a given account/player.
 * Uses defer attribute for optimal page performance.
 * @param {string} account
 * @param {string} player
 * @returns {Promise}
 */
function loadBrightcoveScript(account, player) {
  const key = `${account}/${player}_default`;
  if (!bcScripts[key]) {
    bcScripts[key] = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://players.brightcove.net/${key}/index.min.js`;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });
  }
  return bcScripts[key];
}

let playerCount = 0;

/**
 * Resolve the Brightcove account ID from the authored value.
 * @param {string} value - Authored account value (corporate/public/commercial or raw ID)
 * @returns {string}
 */
function resolveAccountId(value) {
  const lower = value.toLowerCase();
  return ACCOUNT_MAP[lower] || value;
}

/**
 * Create and initialise the Brightcove <video-js> player in audio-only mode.
 * @param {Element} container
 * @param {object} cfg
 * @param {Element} imgContainer - Thumbnail container for fallback poster
 * @param {Element} titleEl - Title element for fallback name
 */
function loadPlayer(container, cfg, imgContainer, titleEl) {
  if (container.querySelector('video-js')) return;

  const account = resolveAccountId(cfg.accountId);
  const player = cfg.playerId || DEFAULT_PLAYER;
  playerCount += 1;
  const playerId = `bcpodcast-${playerCount}`;

  const videoEl = document.createElement('video-js');
  videoEl.id = playerId;
  videoEl.setAttribute('data-account', account);
  videoEl.setAttribute('data-player', player);
  videoEl.setAttribute('data-embed', 'default');
  videoEl.className = 'video-js bcpodcast-player';

  if (cfg.videoId) videoEl.setAttribute('data-video-id', cfg.videoId);

  videoEl.setAttribute('controls', '');

  container.append(videoEl);

  loadBrightcoveScript(account, player).then(() => {
    if (typeof window.bc === 'function') {
      window.bc(videoEl);
    }

    const configure = () => {
      if (typeof window.videojs === 'undefined') {
        requestAnimationFrame(configure);
        return;
      }
      const bcPlayer = window.videojs.getPlayer(playerId);
      if (!bcPlayer) {
        requestAnimationFrame(configure);
        return;
      }
      bcPlayer.ready(function onReady() {
        this.audioOnlyMode(true);
        this.controls(true);

        this.on('loadedmetadata', () => {
          const mediaInfo = this.mediainfo;
          if (!mediaInfo) return;

          // Fallback title: fetch from Brightcove if not authored
          if (!cfg.podcastTitle && titleEl && !titleEl.textContent) {
            if (mediaInfo.name) {
              titleEl.textContent = mediaInfo.name;
              // Update aria-label on player region to match
              const region = container;
              if (region) region.setAttribute('aria-label', mediaInfo.name);
            }
          }

          // Fallback thumbnail: fetch poster from Brightcove if not authored
          if (!cfg.podcastThumbnail && imgContainer && !imgContainer.querySelector('img')) {
            const posterUrl = mediaInfo.poster
              || (mediaInfo.thumbnail && mediaInfo.thumbnail.src)
              || this.poster();
            if (posterUrl) {
              const img = document.createElement('img');
              img.src = posterUrl;
              img.alt = cfg.podcastTitle || mediaInfo.name || 'Podcast thumbnail';
              img.loading = 'lazy';
              imgContainer.append(img);
            }
          }
        });
      });
    };
    configure();
  });
}

export default function decorate(block) {
  applyCommonProps(block);
  const cfg = readBlock(block);

  // Clear block content for rebuild
  block.textContent = '';

  // Language attribute for accessibility
  if (cfg.language) {
    block.setAttribute('lang', cfg.language);
  } else {
    block.removeAttribute('lang');
  }

  // Analytics data attribute
  if (cfg.analyticsInteractionId) {
    block.setAttribute('data-analytics-interaction-id', cfg.analyticsInteractionId);
  }

  // Outer podcast wrapper
  const podcast = document.createElement('div');
  podcast.className = 'bcpodcast-wrapper';

  // Thumbnail
  const imgContainer = document.createElement('div');
  imgContainer.className = 'bcpodcast-thumbnail';

  if (cfg.podcastThumbnail) {
    const pic = cfg.podcastThumbnail.cloneNode(true);
    // Optimise images
    pic.querySelectorAll('img').forEach((img) => {
      const optimized = createOptimizedPicture(img.src, img.alt || cfg.podcastTitle || 'Podcast thumbnail', false, [{ width: '160' }]);
      img.closest('picture').replaceWith(optimized);
    });
    imgContainer.append(pic);
  }
  podcast.append(imgContainer);

  // Info area (title + player)
  const info = document.createElement('div');
  info.className = 'bcpodcast-info';

  // Title
  const title = document.createElement('div');
  title.className = 'bcpodcast-title';
  if (cfg.podcastTitle) title.textContent = cfg.podcastTitle;
  title.setAttribute('role', 'heading');
  title.setAttribute('aria-level', '3');
  info.append(title);

  // Player container
  const playerContainer = document.createElement('div');
  playerContainer.className = 'bcpodcast-player-container';
  playerContainer.setAttribute('role', 'region');
  playerContainer.setAttribute('aria-label', cfg.podcastTitle || 'Podcast player');
  info.append(playerContainer);

  podcast.append(info);
  block.append(podcast);

  // Load Brightcove player when block scrolls into view
  if (cfg.videoId) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          loadPlayer(playerContainer, cfg, imgContainer, title);
        }
      });
    }, { threshold: 0.1 });
    observer.observe(block);
  }
}
