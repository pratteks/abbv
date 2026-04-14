import { resolveImageReference } from '../../scripts/scripts.js';

const DEFAULT_PLAYER = 'default';

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
 * 20 playlistLayout               select     (conditional)
 * 21 enablePlaylistThumbnailMeta  boolean    (conditional)
 * 22 enableAutoplay               boolean
 * 23 enableLoop                   boolean
 * 24 enableCaptions               boolean
 * 25 enableVideoChapters          boolean
 * 26 enableRecommendedVideo       boolean
 * 27 enablePlayerControls         boolean
 * 28 enableSocialShare            boolean
 * 29 enableTranscript             boolean
 * 30 transcriptType               select     (conditional)
 * 31 showTranscriptLabel          text       (conditional)
 * 32 hideTranscriptLabel          text       (conditional)
 * 33 transcriptClickBehavior      select     (conditional)
 * 34 modalHiddenPanelId           text       (conditional)
 * 35 transcriptLink               aem-content(conditional)
 * 36 transcriptButtonIconType     select     (conditional)
 * 37 transcriptShowFontIcon       text       (conditional)
 * 38 transcriptShowImageIcon      reference  (conditional)
 * 39 transcriptHideFontIcon       text       (conditional)
 * 40 transcriptHideImageIcon      reference  (conditional)
 * 41 transcriptLinkIconPosition   select     (conditional)
 * 42 playButtonAriaLabel          text
 * 43 videoCaption                 text
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
  PLAYLIST_LAYOUT: 20,
  ENABLE_PLAYLIST_THUMBNAIL_METADATA: 21,
  ENABLE_AUTOPLAY: 22,
  ENABLE_LOOP: 23,
  ENABLE_CAPTIONS: 24,
  ENABLE_VIDEO_CHAPTERS: 25,
  ENABLE_RECOMMENDED_VIDEO: 26,
  ENABLE_PLAYER_CONTROLS: 27,
  ENABLE_SOCIAL_SHARE: 28,
  ENABLE_TRANSCRIPT: 29,
  TRANSCRIPT_TYPE: 30,
  SHOW_TRANSCRIPT_LABEL: 31,
  HIDE_TRANSCRIPT_LABEL: 32,
  TRANSCRIPT_CLICK_BEHAVIOR: 33,
  MODAL_HIDDEN_PANEL_ID: 34,
  TRANSCRIPT_LINK: 35,
  TRANSCRIPT_BUTTON_ICON_TYPE: 36,
  TRANSCRIPT_SHOW_FONT_ICON: 37,
  TRANSCRIPT_SHOW_IMAGE_ICON: 38,
  TRANSCRIPT_HIDE_FONT_ICON: 39,
  TRANSCRIPT_HIDE_IMAGE_ICON: 40,
  TRANSCRIPT_LINK_ICON_POSITION: 41,
  PLAY_BUTTON_ARIA_LABEL: 42,
  VIDEO_CAPTION: 43,
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
  return row.querySelector('picture');
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
    overlayButtonImageIcon: getCellPicture(rows[ROW.OVERLAY_BUTTON_IMAGE_ICON]),
    iconPosition: getCellText(rows[ROW.ICON_POSITION]) || '',
    playerType: getCellText(rows[ROW.PLAYER_TYPE]) || '',
    accountId: getCellText(rows[ROW.ACCOUNT_ID]) || '',
    playerId: getCellText(rows[ROW.PLAYER_ID]),
    videoId: getCellText(rows[ROW.VIDEO_ID]),
    playlistId: getCellText(rows[ROW.PLAYLIST_ID]),
    defaultPlaylistVideoId: getCellText(rows[ROW.DEFAULT_PLAYLIST_VIDEO_ID]),
    playlistType: getCellText(rows[ROW.PLAYLIST_TYPE]) || '',
    videoContentLayout: getCellText(rows[ROW.VIDEO_CONTENT_LAYOUT]) || '',
    playlistLayout: getCellText(rows[ROW.PLAYLIST_LAYOUT]) || '',
    enablePlaylistThumbnailMetadata: getCellBool(rows[ROW.ENABLE_PLAYLIST_THUMBNAIL_METADATA]),
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
    transcriptShowImageIcon: getCellPicture(rows[ROW.TRANSCRIPT_SHOW_IMAGE_ICON]),
    transcriptHideFontIcon: getCellText(rows[ROW.TRANSCRIPT_HIDE_FONT_ICON]) || '',
    transcriptHideImageIcon: getCellPicture(rows[ROW.TRANSCRIPT_HIDE_IMAGE_ICON]),
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
      script.src = `https://players.brightcove.net/${key}/index.min.js`;
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });
  }
  return bcScripts[key];
}

let playerCount = 0;

/**
 * Create the icon element for buttons (font icon or image).
 * @param {string} iconType - 'icon-font' or 'image'
 * @param {string} fontIconName - Font icon class name
 * @param {Element|null} imageIcon - Picture element for image icon
 * @returns {Element|null}
 */
function createIcon(iconType, fontIconName, imageIcon) {
  if (iconType === 'image' && imageIcon) {
    const span = document.createElement('span');
    span.className = 'bcvideo-icon bcvideo-icon-image';
    span.append(imageIcon.cloneNode(true));
    return span;
  }
  if (iconType === 'icon-font' && fontIconName) {
    const span = document.createElement('span');
    span.className = `bcvideo-icon bcvideo-icon-font icon-${fontIconName}`;
    return span;
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

  const icon = createIcon(
    cfg.overlayButtonIconType,
    cfg.overlayButtonFontIcon,
    cfg.overlayButtonImageIcon,
  );

  const textSpan = document.createElement('span');
  textSpan.className = 'bcvideo-play-btn-text';
  textSpan.textContent = cfg.overlayButtonText;

  if (icon && cfg.iconPosition === 'right') {
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
    const title = document.createElement('h2');
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
 * Build the transcript UI.
 * @param {object} cfg
 * @returns {Element}
 */
function buildTranscript(cfg) {
  const wrapper = document.createElement('div');
  wrapper.className = 'bcvideo-transcript';

  const showIcon = createIcon(
    cfg.transcriptButtonIconType,
    cfg.transcriptShowFontIcon,
    cfg.transcriptShowImageIcon,
  );

  const hideIcon = createIcon(
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
        if (panel) panel.classList.toggle('is-visible');
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

    toggleBtn.addEventListener('click', () => {
      const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      toggleBtn.setAttribute('aria-expanded', String(!expanded));
      showLabel.hidden = !expanded;
      showLabel.classList.toggle('hide', !expanded);
      hideLabel.hidden = expanded;
      hideLabel.classList.toggle('hide', expanded);
      panel.hidden = expanded;
    });
    wrapper.append(toggleBtn, panel);
  }

  return wrapper;
}

/**
 * Enforce authored caption settings on Brightcove/video.js UI and tracks.
 * @param {object} player
 * @param {boolean} enableCaptions
 */
function applyCaptionsPolicy(player, enableCaptions) {
  if (!player) return;

  if (player.controlBar && player.controlBar.subsCapsButton) {
    if (enableCaptions) player.controlBar.subsCapsButton.show();
    else player.controlBar.subsCapsButton.hide();
  }

  const applyToTracks = (tracks) => {
    if (!tracks || typeof tracks.length !== 'number') return;
    for (let i = 0; i < tracks.length; i += 1) {
      const track = tracks[i];
      if (track.kind === 'captions' || track.kind === 'subtitles') {
        track.mode = enableCaptions ? 'showing' : 'disabled';
      }
    }
  };

  applyToTracks(player.textTracks && player.textTracks());
  applyToTracks(player.remoteTextTracks && player.remoteTextTracks());
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

  // Video / playlist ID
  if (cfg.playerType === 'playlist') {
    if (cfg.playlistId) videoEl.setAttribute('data-playlist-id', cfg.playlistId);
    if (cfg.defaultPlaylistVideoId) videoEl.setAttribute('data-video-id', cfg.defaultPlaylistVideoId);
  } else if (cfg.videoId) {
    videoEl.setAttribute('data-video-id', cfg.videoId);
  }

  // Autoplay and loop — kept as HTML attributes (same behaviour as before)
  if (cfg.enableAutoplay) videoEl.setAttribute('autoplay', '');
  if (cfg.enableLoop) videoEl.setAttribute('loop', '');

  // Browsers typically require muted inline playback for scripted autoplay.
  if (cfg.enableAutoplay || attemptAutoplay) {
    videoEl.setAttribute('muted', '');
    videoEl.setAttribute('playsinline', '');
  }

  // Controls — only add attribute when enabled
  if (cfg.enablePlayerControls) videoEl.setAttribute('controls', '');

  if (cfg.videoCaption) videoEl.setAttribute('title', cfg.videoCaption);

  container.append(videoEl);
  container.classList.add('bcvideo-playing');

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
        const reapplyCaptions = () => applyCaptionsPolicy(this, cfg.enableCaptions);

        // Force controls state at runtime
        this.controls(cfg.enablePlayerControls);
        if (this.controlBar && typeof this.controlBar.hide === 'function') {
          if (cfg.enablePlayerControls) this.controlBar.show();
          else this.controlBar.hide();
        }

        // Re-apply across lifecycle because Brightcove can attach/reselect tracks after ready.
        reapplyCaptions();
        ['loadstart', 'loadedmetadata', 'loadeddata', 'canplay', 'play', 'beforeplaylistitem', 'playlistitem']
          .forEach((eventName) => this.on(eventName, reapplyCaptions));

        const textTracks = this.textTracks && this.textTracks();
        if (textTracks && typeof textTracks.addEventListener === 'function') {
          textTracks.addEventListener('addtrack', reapplyCaptions);
          textTracks.addEventListener('change', reapplyCaptions);
        }

        const remoteTracks = this.remoteTextTracks && this.remoteTextTracks();
        if (remoteTracks && typeof remoteTracks.addEventListener === 'function') {
          remoteTracks.addEventListener('addtrack', reapplyCaptions);
          remoteTracks.addEventListener('change', reapplyCaptions);
        }

        this.one('dispose', () => {
          if (textTracks && typeof textTracks.removeEventListener === 'function') {
            textTracks.removeEventListener('addtrack', reapplyCaptions);
            textTracks.removeEventListener('change', reapplyCaptions);
          }
          if (remoteTracks && typeof remoteTracks.removeEventListener === 'function') {
            remoteTracks.removeEventListener('addtrack', reapplyCaptions);
            remoteTracks.removeEventListener('change', reapplyCaptions);
          }
        });

        if (cfg.enableAutoplay || attemptAutoplay) {
          this.muted(true);
          this.autoplay('muted');
          const playAttempt = this.play();
          if (playAttempt && typeof playAttempt.catch === 'function') {
            // If autoplay is blocked by browser policy, restore overlay for manual start.
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
function buildCaption(captionText) {
  if (!captionText) return null;
  const caption = document.createElement('p');
  caption.className = 'bcvideo-caption';
  caption.textContent = captionText;
  return caption;
}

export default function decorate(block) {
  const cfg = readBlock(block);

  // Clear block content for rebuild
  block.textContent = '';

  // Add layout classes
  block.classList.add(`bcvideo-player-${cfg.playerType}`);
  block.classList.add(`bcvideo-content-${cfg.videoContentLayout}`);

  if (cfg.playerType === 'playlist') {
    block.classList.add(`bcvideo-playlist-layout-${cfg.playlistLayout}`);
    block.classList.add(`bcvideo-playlist-${cfg.playlistType}`);
    if (cfg.enablePlaylistThumbnailMetadata) {
      block.classList.add('bcvideo-playlist-meta');
    }
  }

  // Feature classes
  if (cfg.enableAutoplay) block.classList.add('bcvideo-autoplay');
  if (cfg.enableLoop) block.classList.add('bcvideo-loop');
  if (cfg.enableCaptions) block.classList.add('bcvideo-captions');
  if (cfg.enableVideoChapters) block.classList.add('bcvideo-chapters');
  if (cfg.enableSocialShare) block.classList.add('bcvideo-social');

  // Main structure
  const videoContainer = document.createElement('div');
  videoContainer.className = 'bcvideo-container';

  // Build overlay (shown before play)
  const overlay = buildOverlay(cfg);
  videoContainer.append(overlay);

  // Click overlay to start video
  overlay.addEventListener('click', () => {
    if (!playExistingPlayer(videoContainer)) {
      loadPlayer(videoContainer, cfg);
    }
    overlay.hidden = true;
  });

  // Autoplay: load player when visible (via IntersectionObserver)
  if (cfg.enableAutoplay) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          overlay.hidden = true;
          loadPlayer(videoContainer, cfg, {
            attemptAutoplay: true,
            onAutoplayBlocked: () => {
              overlay.hidden = false;
              videoContainer.classList.remove('bcvideo-playing');
            },
          });
        }
      });
    }, { threshold: 0.5 });
    observer.observe(videoContainer);
  }

  // Build content area (title/description below/beside video)
  const contentArea = document.createElement('div');
  contentArea.className = 'bcvideo-content-area';

  if (cfg.videoContentLayout !== 'none') {
    if (cfg.overlayTitle) {
      const title = document.createElement('h3');
      title.className = 'bcvideo-content-title';
      title.textContent = cfg.overlayTitle;
      contentArea.append(title);
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

  if (cfg.videoContentLayout === 'left') {
    mainWrapper.append(contentArea, videoContainer);
  } else if (cfg.videoContentLayout === 'right') {
    mainWrapper.append(videoContainer, contentArea);
  } else {
    mainWrapper.append(videoContainer);
    if (cfg.videoContentLayout === 'bottom') {
      mainWrapper.append(contentArea);
    }
  }

  block.append(mainWrapper);

  // Video caption
  const caption = buildCaption(cfg.videoCaption);
  if (caption) block.append(caption);

  // Transcript
  if (cfg.enableTranscript) {
    block.append(buildTranscript(cfg));
  }
}
