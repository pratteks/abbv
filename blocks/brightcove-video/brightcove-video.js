import { resolveImageReference } from '../../scripts/scripts.js';
import { createIcon, extractIconSource, applyCommonProps } from '../../scripts/utils.js';
import { fetchPlaceholders } from '../../scripts/placeholders.js';

const DEFAULT_PLAYER = 'default';
const BC_PLAYERS_BASE = 'https://players.brightcove.net';
const BC_API_BASE = 'https://edge.api.brightcove.com/playback/v1/accounts';

/*
 * Row indices — must match the field order in _brightcove-video.json
 * (tabs are skipped; they do not render as rows):
 *
 *  0 projectNumber                text
 *  1 overlayTitle                 text       (brightcoveVideo_ prefix)
 *  2 overlayDescription           richtext   (brightcoveVideo_ prefix)
 *  3 posterType                   select
 *  4 posterImage                  reference  (conditional: posterType=custom)
 *  5 posterAlt                    text       (conditional: posterType=custom)
 *  6 colorOverlay                 text       (conditional: posterType=color)
 *  7 overlayButtonText            text       (brightcoveVideo_ prefix)
 *  8 overlayButtonIconType        select
 *  9 overlayButtonFontIcon        text       (conditional: iconType=icon-font)
 * 10 overlayButtonImageIcon       reference  (conditional: iconType=image)
 * 11 iconPosition                 select
 * 12 playerType                   select
 * 13 accountId                    select
 * 14 playerId                     text       (conditional)
 * 15 videoId                      text       (conditional)
 * 16 playlistId                   text       (conditional)
 * 17 defaultPlaylistVideoId       text       (conditional)
 * 18 playlistType                 select     (conditional)
 * 19 videoContentLayout           select
 * 20 enablePlaylistThumbnailMeta  boolean    (conditional)
 * 21 captionTitle                 text
 * 22 captionDescription           text
 * 23 playButtonAriaLabel          text
 * 24 videoCaption                 text
 * 25 enableAutoplay               boolean
 * 26 enableLoop                   boolean
 * 27 enableCaptions               boolean
 * 28 enableVideoChapters          boolean
 * 29 enableRecommendedVideo       boolean
 * 30 enablePlayerControls         boolean
 * 31 enableSocialShare            boolean
 * 32 enableTranscript             boolean
 * 33 transcriptType               select     (conditional)
 * 34 showTranscriptLabel          text       (conditional)
 * 35 hideTranscriptLabel          text       (conditional)
 * 36 transcriptClickBehavior      select     (conditional)
 * 37 modalHiddenPanelId           text       (conditional)
 * 38 transcriptLink               aem-content(conditional)
 * 39 transcriptButtonIconType     select     (conditional)
 * 40 transcriptShowFontIcon       text       (conditional)
 * 41 transcriptShowImageIcon      reference  (conditional)
 * 42 transcriptHideFontIcon       text       (conditional)
 * 43 transcriptHideImageIcon      reference  (conditional)
 * 44 transcriptLinkIconPosition   select     (conditional)
 */
const ROW = {
  PROJECT_NUMBER: 0,
  OVERLAY_TITLE: 1,
  OVERLAY_DESCRIPTION: 2,
  POSTER_TYPE: 3,
  POSTER_IMAGE: 4,
  POSTER_ALT: 5,
  COLOR_OVERLAY: 6,
  OVERLAY_BUTTON_TEXT: 7,
  OVERLAY_BUTTON_ICON_TYPE: 8,
  OVERLAY_BUTTON_FONT_ICON: 9,
  OVERLAY_BUTTON_IMAGE_ICON: 10,
  ICON_POSITION: 11,
  PLAYER_TYPE: 12,
  ACCOUNT_ID: 13,
  PLAYER_ID: 14,
  VIDEO_ID: 15,
  PLAYLIST_ID: 16,
  DEFAULT_PLAYLIST_VIDEO_ID: 17,
  PLAYLIST_TYPE: 18,
  VIDEO_CONTENT_LAYOUT: 19,
  ENABLE_PLAYLIST_THUMBNAIL_METADATA: 20,
  CAPTION_TITLE: 21,
  CAPTION_DESCRIPTION: 22,
  PLAY_BUTTON_ARIA_LABEL: 23,
  VIDEO_CAPTION: 24,
  ENABLE_AUTOPLAY: 25,
  ENABLE_LOOP: 26,
  ENABLE_CAPTIONS: 27,
  ENABLE_VIDEO_CHAPTERS: 28,
  ENABLE_RECOMMENDED_VIDEO: 29,
  ENABLE_PLAYER_CONTROLS: 30,
  ENABLE_SOCIAL_SHARE: 31,
  ENABLE_TRANSCRIPT: 32,
  TRANSCRIPT_TYPE: 33,
  SHOW_TRANSCRIPT_LABEL: 34,
  HIDE_TRANSCRIPT_LABEL: 35,
  TRANSCRIPT_CLICK_BEHAVIOR: 36,
  MODAL_HIDDEN_PANEL_ID: 37,
  TRANSCRIPT_LINK: 38,
  TRANSCRIPT_BUTTON_ICON_TYPE: 39,
  TRANSCRIPT_SHOW_FONT_ICON: 40,
  TRANSCRIPT_SHOW_IMAGE_ICON: 41,
  TRANSCRIPT_HIDE_FONT_ICON: 42,
  TRANSCRIPT_HIDE_IMAGE_ICON: 43,
  TRANSCRIPT_LINK_ICON_POSITION: 44,
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
 * Read boolean from a row's first cell.
 * @param {Element} row
 * @returns {boolean}
 */
function getCellBool(row) {
  return getCellText(row) === 'true';
}

/**
 * Get a picture element from a row (for reference fields).
 * Resolves AEM image references before extraction.
 * @param {Element} row
 * @returns {Element|null}
 */
function getCellPicture(row) {
  if (!row) return null;
  resolveImageReference(row.firstElementChild || row);
  return row.querySelector('picture') || row.querySelector('img');
}

/**
 * Extract an icon source from a row cell using extractIconSource.
 * Resolves AEM image references before extraction.
 * @param {Element} row
 * @returns {HTMLPictureElement|string}
 */
function getCellIconSource(row) {
  if (!row) return '';
  const cell = row.firstElementChild || row;
  resolveImageReference(cell);
  return extractIconSource(cell);
}

/**
 * Get a link URL from a row (for aem-content fields).
 * Falls back to plain text if no anchor tag is present.
 * @param {Element} row
 * @returns {string}
 */
function getCellLink(row) {
  const link = row?.querySelector('a');
  return link?.getAttribute('href') || getCellText(row);
}

/**
 * Read all block fields from the rendered table rows.
 * Each non-tab model field renders as a <div> row child of the block.
 * @param {Element} block
 * @returns {object}
 */
function readBlock(block) {
  const rows = [...block.children];

  return {
    projectNumber: getCellText(rows[ROW.PROJECT_NUMBER]),
    overlayTitle: getCellText(rows[ROW.OVERLAY_TITLE]),
    overlayDescription: rows[ROW.OVERLAY_DESCRIPTION]?.firstElementChild?.innerHTML?.trim() || '',
    posterType: getCellText(rows[ROW.POSTER_TYPE]) || '',
    posterImage: getCellPicture(rows[ROW.POSTER_IMAGE]),
    posterAlt: getCellText(rows[ROW.POSTER_ALT]),
    colorOverlay: getCellText(rows[ROW.COLOR_OVERLAY]),
    overlayButtonText: getCellText(rows[ROW.OVERLAY_BUTTON_TEXT]) || '',
    overlayButtonIconType: getCellText(rows[ROW.OVERLAY_BUTTON_ICON_TYPE]) || '',
    overlayButtonFontIcon: getCellText(rows[ROW.OVERLAY_BUTTON_FONT_ICON]) || '',
    overlayButtonImageIcon: getCellIconSource(rows[ROW.OVERLAY_BUTTON_IMAGE_ICON]),
    iconPosition: getCellText(rows[ROW.ICON_POSITION]) || '',
    playerType: getCellText(rows[ROW.PLAYER_TYPE]) || '',
    accountId: getCellText(rows[ROW.ACCOUNT_ID]) || '',
    playerId: getCellText(rows[ROW.PLAYER_ID]),
    videoId: getCellText(rows[ROW.VIDEO_ID]),
    playlistId: getCellText(rows[ROW.PLAYLIST_ID]),
    defaultPlaylistVideoId: getCellText(rows[ROW.DEFAULT_PLAYLIST_VIDEO_ID]),
    playlistType: getCellText(rows[ROW.PLAYLIST_TYPE]) || '',
    videoContentLayout: getCellText(rows[ROW.VIDEO_CONTENT_LAYOUT]) || '',
    enablePlaylistThumbnailMetadata: getCellBool(rows[ROW.ENABLE_PLAYLIST_THUMBNAIL_METADATA]),
    captionTitle: getCellText(rows[ROW.CAPTION_TITLE]),
    captionDescription: getCellText(rows[ROW.CAPTION_DESCRIPTION]),
    enableAutoplay: getCellBool(rows[ROW.ENABLE_AUTOPLAY]),
    enableLoop: getCellBool(rows[ROW.ENABLE_LOOP]),
    enableCaptions: getCellBool(rows[ROW.ENABLE_CAPTIONS]),
    enableVideoChapters: getCellBool(rows[ROW.ENABLE_VIDEO_CHAPTERS]),
    enableRecommendedVideo: getCellBool(rows[ROW.ENABLE_RECOMMENDED_VIDEO]),
    enablePlayerControls: getCellText(rows[ROW.ENABLE_PLAYER_CONTROLS]) !== 'false',
    enableSocialShare: getCellBool(rows[ROW.ENABLE_SOCIAL_SHARE]),
    enableTranscript: getCellBool(rows[ROW.ENABLE_TRANSCRIPT]),
    transcriptType: getCellText(rows[ROW.TRANSCRIPT_TYPE]) || '',
    showTranscriptLabel: getCellText(rows[ROW.SHOW_TRANSCRIPT_LABEL]) || '',
    hideTranscriptLabel: getCellText(rows[ROW.HIDE_TRANSCRIPT_LABEL]) || '',
    transcriptClickBehavior: getCellText(rows[ROW.TRANSCRIPT_CLICK_BEHAVIOR]) || '',
    modalHiddenPanelId: getCellText(rows[ROW.MODAL_HIDDEN_PANEL_ID]),
    transcriptLink: getCellLink(rows[ROW.TRANSCRIPT_LINK]),
    transcriptButtonIconType: getCellText(rows[ROW.TRANSCRIPT_BUTTON_ICON_TYPE]) || '',
    transcriptShowFontIcon: getCellText(rows[ROW.TRANSCRIPT_SHOW_FONT_ICON]) || '',
    transcriptShowImageIcon: getCellIconSource(rows[ROW.TRANSCRIPT_SHOW_IMAGE_ICON]),
    transcriptHideFontIcon: getCellText(rows[ROW.TRANSCRIPT_HIDE_FONT_ICON]) || '',
    transcriptHideImageIcon: getCellIconSource(rows[ROW.TRANSCRIPT_HIDE_IMAGE_ICON]),
    transcriptLinkIconPosition: getCellText(rows[ROW.TRANSCRIPT_LINK_ICON_POSITION]) || '',
    playButtonAriaLabel: getCellText(rows[ROW.PLAY_BUTTON_ARIA_LABEL]),
    videoCaption: getCellText(rows[ROW.VIDEO_CAPTION]),
  };
}

/**
 * Cache of loaded Brightcove SDK scripts (keyed by account/player).
 */
const bcScripts = {};

/**
 * Load the Brightcove Player SDK script for a given account/player.
 * @param {string} account
 * @param {string} player
 * @returns {Promise}
 */
function loadBrightcoveScript(account, player) {
  const key = `${account}/${player}_default`;
  if (!bcScripts[key]) {
    bcScripts[key] = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${BC_PLAYERS_BASE}/${key}/index.min.js`;
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });
  }
  return bcScripts[key];
}

const policyKeyCache = {};

/**
 * Fetch and cache the Brightcove policy key for a given account/player.
 * @param {string} account
 * @param {string} player
 * @returns {Promise<string>} policy key
 */
function fetchPolicyKey(account, player) {
  const key = `${account}/${player}`;
  if (!policyKeyCache[key]) {
    policyKeyCache[key] = fetch(
      `${BC_PLAYERS_BASE}/${account}/${player}_default/config.json`,
    )
      .then((r) => r.json())
      .then((config) => {
        const pk = config?.video_cloud?.policy_key;
        if (!pk) throw new Error('No policy key');
        return pk;
      });
  }
  return policyKeyCache[key];
}

let playerCount = 0;

/**
 * Create the icon element for buttons (font icon or image).
 * @param {string} iconType - 'icon-font' or 'image'
 * @param {string} fontIconName - Font icon class name
 * @param {HTMLPictureElement|string} imageIcon - Picture element or URL for image icon
 * @returns {Element|null}
 */
function buildBcIcon(iconType, fontIconName, imageIcon) {
  if (iconType === 'icon-font' && fontIconName) {
    return createIcon(fontIconName, 'icon-font', {
      additionalClasses: ['bcvideo-icon', 'bcvideo-icon-font'],
    });
  }
  if (iconType === 'image' && imageIcon) {
    return createIcon(imageIcon, 'image', {
      additionalClasses: ['bcvideo-icon', 'bcvideo-icon-image'],
    });
  }
  return null;
}

/**
 * Build the overlay play button with icon.
 * @param {object} cfg
 * @returns {Element}
 */
function buildPlayButton(cfg) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'bcvideo-play-btn';

  if (cfg.playButtonAriaLabel) {
    btn.setAttribute('aria-label', cfg.playButtonAriaLabel);
  }

  const icon = buildBcIcon(
    cfg.overlayButtonIconType,
    cfg.overlayButtonFontIcon,
    cfg.overlayButtonImageIcon,
  );

  const textSpan = document.createElement('span');
  textSpan.className = 'bcvideo-play-btn-text';
  textSpan.textContent = cfg.overlayButtonText;

  if (icon && cfg.iconPosition === 'right') {
    icon.classList.add('icon-right');
    btn.append(textSpan, icon);
  } else if (icon) {
    btn.append(icon, textSpan);
  } else {
    btn.append(textSpan);
  }

  return btn;
}

/**
 * Build the overlay element (poster + title + description + play button).
 * @param {object} cfg
 * @returns {Element}
 */
function buildOverlay(cfg) {
  const overlay = document.createElement('div');
  overlay.className = 'bcvideo-overlay';

  // Poster background
  if (cfg.posterType === 'custom' && cfg.posterImage) {
    const posterWrap = document.createElement('div');
    posterWrap.className = 'bcvideo-poster';
    const img = cfg.posterImage.querySelector('img') || cfg.posterImage;
    if (img && cfg.posterAlt) {
      img.setAttribute('alt', cfg.posterAlt);
    }
    posterWrap.append(cfg.posterImage);
    overlay.append(posterWrap);
  } else if (cfg.posterType === 'color' && cfg.colorOverlay) {
    overlay.style.backgroundColor = cfg.colorOverlay;
    overlay.classList.add('bcvideo-overlay-color');
  }
  // posterType === 'brightcove' uses Brightcove's default poster (handled by iframe)

  // Overlay content container
  const overlayContent = document.createElement('div');
  overlayContent.className = 'bcvideo-overlay-content';

  if (cfg.overlayTitle && cfg.videoContentLayout === 'none') {
    const title = document.createElement('div');
    title.className = 'bcvideo-overlay-title';
    title.textContent = cfg.overlayTitle;
    overlayContent.append(title);
  }

  if (cfg.overlayDescription && cfg.videoContentLayout === 'none') {
    const desc = document.createElement('div');
    desc.className = 'bcvideo-overlay-desc';
    desc.innerHTML = cfg.overlayDescription;
    overlayContent.append(desc);
  }

  overlayContent.append(buildPlayButton(cfg));
  overlay.append(overlayContent);

  return overlay;
}

/**
 * Fetch transcript text from Brightcove for a given video.
 * Looks up the policy key, fetches video metadata, and returns
 * the transcript text matching the page language.
 * @param {object} cfg - Block configuration
 * @returns {Promise<string>}
 */
function fetchBrightcoveTranscript(cfg) {
  const account = cfg.accountId;
  const player = cfg.playerId || DEFAULT_PLAYER;
  const apiBase = `${BC_API_BASE}/${account}`;

  const extractTranscript = (video) => {
    const lang = document.documentElement.lang || 'en';
    const matchLang = (t) => t.src_lang?.startsWith(lang);
    const isHttps = (t) => t.src?.startsWith('https');
    const transcripts = video.transcripts || [];
    const entry = transcripts.find((t) => matchLang(t) && isHttps(t))
      || transcripts.find((t) => isHttps(t))
      || transcripts[0];
    if (!entry?.src) throw new Error('No transcript available');
    return fetch(entry.src).then((r) => r.text());
  };

  return fetchPolicyKey(account, player)
    .then((pk) => {
      const headers = { Accept: `application/json;pk=${pk}` };
      // Single video — fetch directly
      if (cfg.playerType !== 'playlist') {
        return fetch(`${apiBase}/videos/${cfg.videoId}`, { headers })
          .then((r) => r.json())
          .then(extractTranscript);
      }
      // Playlist with default video ID — fetch that video
      if (cfg.defaultPlaylistVideoId) {
        return fetch(`${apiBase}/videos/${cfg.defaultPlaylistVideoId}`, { headers })
          .then((r) => r.json())
          .then(extractTranscript);
      }
      // Playlist without default — get first video from playlist
      return fetch(`${apiBase}/playlists/${cfg.playlistId}`, { headers })
        .then((r) => r.json())
        .then((pl) => {
          const firstVideo = (pl.videos || [])[0];
          if (!firstVideo) throw new Error('Empty playlist');
          return extractTranscript(firstVideo);
        });
    })
    .then((text) => text.trim());
}

/**
 * Build the transcript UI.
 * @param {object} cfg
 * @returns {Element}
 */
function buildTranscript(cfg) {
  const wrapper = document.createElement('div');
  wrapper.className = 'bcvideo-transcript';

  const showIcon = buildBcIcon(
    cfg.transcriptButtonIconType,
    cfg.transcriptShowFontIcon,
    cfg.transcriptShowImageIcon,
  );

  const hideIcon = buildBcIcon(
    cfg.transcriptButtonIconType,
    cfg.transcriptHideFontIcon,
    cfg.transcriptHideImageIcon,
  );

  if (cfg.transcriptType === 'custom') {
    // Custom transcript — link to external page, modal, or hidden panel
    const link = document.createElement('a');
    link.className = 'bcvideo-transcript-link';
    link.textContent = cfg.showTranscriptLabel;

    if (showIcon) {
      if (cfg.transcriptLinkIconPosition === 'before') {
        link.prepend(showIcon);
      } else {
        link.append(showIcon);
      }
    }

    if (cfg.transcriptClickBehavior === 'new-tab') {
      link.href = cfg.transcriptLink || '#';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    } else if (cfg.transcriptClickBehavior === 'modal') {
      link.href = '#';
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const modal = document.getElementById(cfg.modalHiddenPanelId);
        if (modal) modal.classList.add('is-open');
      });
    } else if (cfg.transcriptClickBehavior === 'hidden-panel') {
      link.href = '#';
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const panel = document.getElementById(cfg.modalHiddenPanelId);
        if (panel) {
          panel.classList.toggle('is-visible');
          panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    wrapper.append(link);
  } else {
    // Brightcove transcript — toggle panel inline
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'bcvideo-transcript-toggle';
    toggleBtn.setAttribute('aria-expanded', 'false');

    const showLabel = document.createElement('span');
    showLabel.className = 'bcvideo-transcript-show-label';
    showLabel.textContent = cfg.showTranscriptLabel;

    const hideLabel = document.createElement('span');
    hideLabel.className = 'bcvideo-transcript-hide-label';
    hideLabel.textContent = cfg.hideTranscriptLabel;
    hideLabel.hidden = true;
    hideLabel.classList.toggle('hide', true);

    if (cfg.transcriptLinkIconPosition === 'before') {
      if (showIcon) showLabel.prepend(showIcon);
      if (hideIcon) hideLabel.prepend(hideIcon);
    } else {
      if (showIcon) showLabel.append(showIcon);
      if (hideIcon) hideLabel.append(hideIcon);
    }

    toggleBtn.append(showLabel, hideLabel);

    const panel = document.createElement('div');
    panel.className = 'bcvideo-transcript-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Video transcript');

    let transcriptVideoId = '';

    const loadBrightcoveTranscript = () => {
      const currentId = wrapper.dataset.videoId || '';
      if (transcriptVideoId === currentId && panel.textContent) return;
      transcriptVideoId = currentId;
      panel.textContent = 'Loading transcript…';
      const overrideCfg = currentId
        ? { ...cfg, videoId: currentId, playerType: 'single' }
        : cfg;
      fetchBrightcoveTranscript(overrideCfg)
        .then((text) => {
          panel.textContent = text || 'No transcript text available.';
        })
        .catch(() => {
          panel.textContent = 'Transcript could not be loaded.';
        });
    };

    const resetTranscript = () => {
      transcriptVideoId = '';
      panel.textContent = '';
      panel.hidden = true;
      toggleBtn.setAttribute('aria-expanded', 'false');
      showLabel.hidden = false;
      showLabel.classList.remove('hide');
      hideLabel.hidden = true;
      hideLabel.classList.add('hide');
    };

    wrapper.addEventListener('transcript:reset', resetTranscript);

    toggleBtn.addEventListener('click', () => {
      const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      toggleBtn.setAttribute('aria-expanded', String(!expanded));
      showLabel.hidden = !expanded;
      showLabel.classList.toggle('hide', !expanded);
      hideLabel.hidden = expanded;
      hideLabel.classList.toggle('hide', expanded);
      panel.hidden = expanded;
      if (!expanded) loadBrightcoveTranscript();
    });
    wrapper.append(toggleBtn, panel);
  }

  return wrapper;
}

/**
 * Create and insert the Brightcove in-page player using <video-js>.
 * Autoplay and loop are kept as HTML attributes (same as before).
 * Controls and captions will be configured via Brightcove Player API.
 * @param {Element} container - The video container element
 * @param {object} cfg
 */
function loadPlayer(container, cfg, options = {}) {
  const { attemptAutoplay = false, onAutoplayBlocked = null } = options;
  if (container.querySelector('video-js')) return;

  const account = cfg.accountId;
  const player = cfg.playerId || DEFAULT_PLAYER;
  playerCount += 1;
  const playerId = `bcvideo-${playerCount}`;

  // Create <video-js> element (replaces iframe)
  const videoEl = document.createElement('video-js');
  videoEl.id = playerId;
  videoEl.setAttribute('data-account', account);
  videoEl.setAttribute('data-player', player);
  videoEl.setAttribute('data-embed', 'default');
  videoEl.className = 'video-js bcvideo-player';

  // Video / playlist ID — Brightcove only allows one catalog parameter
  if (cfg.playerType === 'playlist') {
    if (cfg.defaultPlaylistVideoId) {
      videoEl.setAttribute('data-video-id', cfg.defaultPlaylistVideoId);
    } else if (cfg.playlistId) {
      videoEl.setAttribute('data-playlist-id', cfg.playlistId);
    }
  } else if (cfg.videoId) {
    videoEl.setAttribute('data-video-id', cfg.videoId);
  }

  // Loop attribute
  if (cfg.enableLoop) videoEl.setAttribute('loop', '');

  // Autoplay via attemptAutoplay
  if (attemptAutoplay) {
    videoEl.setAttribute('autoplay', '');
    videoEl.setAttribute('playsinline', '');
    if (cfg.playerType === 'playlist') {
      videoEl.setAttribute('muted', '');
    }
  }

  // Controls — only add attribute when enabled
  if (cfg.enablePlayerControls) videoEl.setAttribute('controls', '');

  if (cfg.videoCaption) videoEl.setAttribute('title', cfg.videoCaption);

  container.append(videoEl);
  if (!options.preloadOnly) {
    container.classList.add('bcvideo-playing');
  }

  // Load Brightcove SDK, then access the Player API
  loadBrightcoveScript(account, player).then(() => {
    // Manually initialise dynamically-added element
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
        // GTM analytics — ported from AEM _brightcoveplayer.js
        const dl = () => { window.dataLayer = window.dataLayer || []; return window.dataLayer; };
        const PROGRESS_POINTS = [25, 50, 75];
        const progressReached = {};
        let playFired = false;
        let completeFired = false;

        this.on('play', () => {
          if (!playFired && this.mediainfo) {
            playFired = true;
            dl().push({
              event: 'video_start',
              video_name: this.mediainfo.name,
              video_length: this.duration(),
              video_id: this.mediainfo.id,
            });
          }
        });

        this.on('timeupdate', () => {
          if (!this.mediainfo || !this.duration()) return;
          const pct = Math.floor((this.currentTime() / this.duration()) * 100);
          PROGRESS_POINTS.forEach((threshold) => {
            if (pct === threshold && !progressReached[threshold]) {
              progressReached[threshold] = true;
              dl().push({
                event: 'video_progress',
                video_name: this.mediainfo.name,
                video_length: this.duration(),
                video_id: this.mediainfo.id,
                percent: String(threshold),
              });
            }
          });
        });

        this.on('ended', () => {
          if (!completeFired && this.mediainfo) {
            completeFired = true;
            dl().push({
              event: 'video_complete',
              video_name: this.mediainfo.name,
              video_length: this.duration(),
              video_id: this.mediainfo.id,
              percent: '100',
            });
          }
        });

        // Force controls state at runtime
        this.controls(cfg.enablePlayerControls);
        if (this.controlBar && typeof this.controlBar.hide === 'function') {
          if (cfg.enablePlayerControls) this.controlBar.show();
          else this.controlBar.hide();
        }

        if (attemptAutoplay && cfg.playerType !== 'playlist') {
          const playAttempt = this.play();
          if (playAttempt && typeof playAttempt.catch === 'function') {
            playAttempt.catch(() => {
              if (typeof onAutoplayBlocked === 'function') onAutoplayBlocked();
            });
          }
        }
      });
    };
    configure();
  });
}

/**
 * Attempt to play an already-initialized Brightcove player in this container.
 * @param {Element} container
 * @returns {boolean}
 */
function playExistingPlayer(container) {
  const existing = container.querySelector('video-js');
  if (!existing || typeof window.videojs === 'undefined') return false;
  const bcPlayer = window.videojs.getPlayer(existing.id);
  if (!bcPlayer) return false;
  const playAttempt = bcPlayer.play();
  if (playAttempt && typeof playAttempt.catch === 'function') {
    playAttempt.catch(() => {});
  }
  return true;
}

/**
 * Build the video caption element.
 * @param {string} captionText
 * @returns {Element|null}
 */
function buildCaption(cfg) {
  if (!cfg.captionTitle && !cfg.captionDescription) return null;
  const wrapper = document.createElement('div');
  wrapper.className = 'bcvideo-caption';
  if (cfg.captionTitle) {
    const p = document.createElement('p');
    const b = document.createElement('b');
    b.className = 'bcvideo-content-title';
    b.textContent = cfg.captionTitle;
    p.append(b);
    wrapper.append(p);
  }
  if (cfg.captionDescription) {
    const p = document.createElement('p');
    p.className = 'bcvideo-content-desc';
    p.textContent = cfg.captionDescription;
    wrapper.append(p);
  }
  return wrapper;
}

const CARDS_VISIBLE = 6;

function formatDuration(ms) {
  if (!ms) return '';
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function buildPlaylistCards(cfg, block, videoContainer, placeholders) {
  const account = cfg.accountId;
  const player = cfg.playerId || DEFAULT_PLAYER;

  const base = `${BC_API_BASE}/${account}`;
  fetchPolicyKey(account, player)
    .then((pk) => fetch(`${base}/playlists/${cfg.playlistId}`, {
      headers: { Accept: `application/json;pk=${pk}` },
    }))
    .then((r) => r?.json())
    .then((pl) => {
      const videos = pl?.videos || [];
      if (!videos.length) return;

      const container = document.createElement('div');
      container.className = 'video-card-container';

      videos.forEach((video, idx) => {
        const card = document.createElement('div');
        card.className = 'video-card';
        if (idx >= CARDS_VISIBLE) card.classList.add('video-card-hidden');
        card.dataset.videoId = video.id;

        const thumbWrap = document.createElement('div');
        thumbWrap.className = 'thumbnail-wrapper';
        if (video.poster) {
          const img = document.createElement('img');
          img.src = video.poster;
          img.alt = video.name || '';
          img.loading = 'lazy';
          thumbWrap.append(img);
        }
        if (video.duration) {
          const dur = document.createElement('span');
          dur.className = 'video-card-duration';
          dur.textContent = formatDuration(video.duration);
          thumbWrap.append(dur);
        }

        const textWrap = document.createElement('div');
        textWrap.className = 'video-text';
        const h2 = document.createElement('h2');
        h2.textContent = video.name || '';
        textWrap.append(h2);
        if (video.description) {
          const desc = document.createElement('div');
          desc.className = 'video-desc';
          desc.textContent = video.description;
          textWrap.append(desc);
        }

        card.append(thumbWrap, textWrap);

        card.addEventListener('click', () => {
          const el = videoContainer.querySelector('video-js');
          if (!el || typeof window.videojs === 'undefined') return;
          const bcPlayer = window.videojs.getPlayer(el.id);
          if (!bcPlayer) return;
          bcPlayer.catalog.getVideo(video.id, (err, v) => {
            if (err) return;
            bcPlayer.catalog.load(v);
            if (cfg.enableAutoplay) bcPlayer.play();
          });
          const title = block.querySelector('#primaryVideoTitle');
          const desc = block.querySelector('#primaryVideoDesc');
          if (title) title.textContent = video.name || '';
          if (desc) desc.textContent = video.description || '';
          container.querySelectorAll('.video-card')
            .forEach((c) => c.classList.remove('is-active'));
          card.classList.add('is-active');
          const transcript = block.querySelector('.bcvideo-transcript');
          if (transcript) {
            transcript.dataset.videoId = video.id;
            transcript.dispatchEvent(new Event('transcript:reset'));
          }
          block.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        container.append(card);
      });

      const wrapper = document.createElement('div');
      wrapper.className = 'bcvideo-card-wrapper';
      wrapper.append(container);

      if (videos.length) {
        const toggleWrap = document.createElement('div');
        toggleWrap.className = 'video-card-toggle-wrap';
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'video-card-toggle';
        toggleBtn.type = 'button';
        const label = document.createElement('span');
        label.className = 'video-card-toggle-label';
        label.textContent = placeholders.showMore;
        const chev = document.createElement('i');
        chev.className = 'video-card-toggle-chev icon-abbvie-chevron-down';
        chev.setAttribute('aria-hidden', 'true');
        toggleBtn.append(label, chev);
        let expanded = false;

        toggleBtn.addEventListener('click', () => {
          expanded = !expanded;
          container.querySelectorAll('.video-card-hidden')
            .forEach((c) => { c.style.display = expanded ? '' : 'none'; });
          label.textContent = expanded ? placeholders.showLess : placeholders.showMore;
          toggleBtn.classList.toggle('is-expanded', expanded);
        });

        container.querySelectorAll('.video-card-hidden')
          .forEach((c) => { c.style.display = 'none'; });

        if (videos.length > CARDS_VISIBLE) {
          toggleWrap.append(toggleBtn);
        }
        wrapper.append(toggleWrap);
      }

      block.append(wrapper);
    })
    .catch(() => {});
}

async function getPlaceholders() {
  const placeholders = await fetchPlaceholders();
  return {
    showMore: placeholders.showMore || 'SHOW MORE',
    showLess: placeholders.showLess || 'SHOW LESS',
  };
}

export default async function decorate(block) {
  applyCommonProps(block, 45);
  const cfg = readBlock(block);
  const placeholders = await getPlaceholders();
  // Clear block content for rebuild
  block.textContent = '';

  // Add layout classes
  block.classList.add(`bcvideo-player-${cfg.playerType}`);
  block.classList.add(`bcvideo-content-${cfg.videoContentLayout}`);

  if (cfg.playerType === 'playlist') {
    block.classList.add(`bcvideo-playlist-${cfg.playlistType}`);
    if (cfg.enablePlaylistThumbnailMetadata) {
      block.classList.add('bcvideo-playlist-meta');
    }
  }

  // Feature classes
  if (cfg.enableAutoplay) block.classList.add('bcvideo-autoplay');
  if (cfg.enableLoop) block.classList.add('bcvideo-loop');
  if (cfg.enableVideoChapters) block.classList.add('bcvideo-chapters');
  if (cfg.enableSocialShare) block.classList.add('bcvideo-social');

  // Main structure
  const videoContainer = document.createElement('div');
  videoContainer.className = 'bcvideo-container';

  if (cfg.playerType === 'playlist') {
    // Playlist mode — load player immediately, Brightcove handles its own UI
    loadPlayer(videoContainer, cfg, {
      attemptAutoplay: cfg.enableAutoplay,
    });
  } else {
    // Single video — show overlay, load on click
    const overlay = buildOverlay(cfg);
    videoContainer.append(overlay);

    if (cfg.posterType === 'brightcove') {
      videoContainer.classList.add('bcvideo-preload');
      loadPlayer(videoContainer, cfg, { preloadOnly: true });
    }

    overlay.addEventListener('click', () => {
      videoContainer.classList.remove('bcvideo-preload');
      if (cfg.enableAutoplay) {
        if (!playExistingPlayer(videoContainer)) {
          loadPlayer(videoContainer, cfg, { attemptAutoplay: true });
        }
      } else if (!videoContainer.querySelector('video-js')) {
        loadPlayer(videoContainer, cfg);
      }
      videoContainer.classList.add('bcvideo-playing');
      overlay.hidden = true;
    });
  }

  // Build content area (title/description below/beside video)
  const contentArea = document.createElement('div');
  contentArea.className = 'bcvideo-content-area';

  if (cfg.videoContentLayout !== 'none') {
    if (cfg.overlayTitle) {
      const p = document.createElement('p');
      const title = document.createElement('b');
      title.className = 'bcvideo-content-title';
      title.textContent = cfg.overlayTitle;
      p.append(title);
      contentArea.append(p);
    }
    if (cfg.overlayDescription) {
      const desc = document.createElement('div');
      desc.className = 'bcvideo-content-desc';
      desc.innerHTML = cfg.overlayDescription;
      contentArea.append(desc);
    }
  }

  // Build main wrapper
  const mainWrapper = document.createElement('div');
  mainWrapper.className = 'bcvideo-main';

  if (cfg.videoContentLayout === 'left' && contentArea.hasChildNodes() && cfg.playerType !== 'playlist') {
    mainWrapper.append(contentArea, videoContainer);
  } else if (cfg.videoContentLayout === 'right' && contentArea.hasChildNodes() && cfg.playerType !== 'playlist') {
    mainWrapper.append(videoContainer, contentArea);
  } else {
    mainWrapper.append(videoContainer);
    if (cfg.videoContentLayout === 'bottom' && contentArea.hasChildNodes() && cfg.playerType !== 'playlist') {
      mainWrapper.append(contentArea);
    }
  }

  block.append(mainWrapper);

  // Playlist mode — add title/desc from Brightcove metadata below video
  if (cfg.playerType === 'playlist') {
    const primaryTitle = document.createElement('h2');
    primaryTitle.id = 'primaryVideoTitle';
    primaryTitle.className = 'bcvideo-primary-title';

    const primaryDesc = document.createElement('div');
    primaryDesc.id = 'primaryVideoDesc';
    primaryDesc.className = 'bcvideo-primary-desc';

    block.append(primaryTitle, primaryDesc);

    const populateMeta = () => {
      const el = videoContainer.querySelector('video-js');
      if (!el || typeof window.videojs === 'undefined') {
        requestAnimationFrame(populateMeta);
        return;
      }
      const bcPlayer = window.videojs.getPlayer(el.id);
      if (!bcPlayer) {
        requestAnimationFrame(populateMeta);
        return;
      }
      const update = () => {
        const mi = bcPlayer.mediainfo;
        if (mi) {
          primaryTitle.textContent = mi.name || '';
          primaryDesc.textContent = mi.description || '';
          const transcript = block.querySelector('.bcvideo-transcript');
          if (transcript) transcript.dataset.videoId = mi.id || '';
        }
      };
      bcPlayer.ready(() => {
        update();
        bcPlayer.on('loadedmetadata', update);
        bcPlayer.on('playlistitem', update);
      });
    };
    populateMeta();

    if (cfg.playlistType === 'cards' && cfg.playlistId) {
      buildPlaylistCards(cfg, block, videoContainer, placeholders);
    }
  }

  // Video caption (single video only, when captions enabled)
  if (cfg.playerType !== 'playlist' && cfg.enableCaptions) {
    const caption = buildCaption(cfg);
    if (caption) block.append(caption);
  }

  // Transcript
  if (cfg.enableTranscript) {
    block.append(buildTranscript(cfg));
  }
}
