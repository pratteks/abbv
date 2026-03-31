/*
 * Embed Block
 * Show videos and social posts directly on your page
 * https://www.hlx.live/developer/block-collection/embed
 */

import { resolveImageReference } from '../../scripts/scripts.js';

const loadScript = (url, callback, type) => {
  const head = document.querySelector('head');
  const script = document.createElement('script');
  script.src = url;
  if (type) {
    script.setAttribute('type', type);
  }
  script.onload = callback;
  head.append(script);
  return script;
};

const getDefaultEmbed = (url) => `<div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;">
    <iframe src="${url.href}" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;" allowfullscreen=""
      scrolling="no" allow="encrypted-media" title="Content from ${url.hostname}" loading="lazy">
    </iframe>
  </div>`;

const embedYoutube = (url, autoplay) => {
  const usp = new URLSearchParams(url.search);
  const suffix = autoplay ? '&muted=1&autoplay=1' : '';
  let vid = usp.get('v') ? encodeURIComponent(usp.get('v')) : '';
  const embed = url.pathname;
  if (url.origin.includes('youtu.be')) {
    [, vid] = url.pathname.split('/');
  }
  const embedHTML = `<div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;">
      <iframe src="https://www.youtube.com${vid ? `/embed/${vid}?rel=0&v=${vid}${suffix}` : embed}" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen="" scrolling="no" title="Content from Youtube" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>
    </div>`;
  return embedHTML;
};

const embedVimeo = (url, autoplay) => {
  const [, video] = url.pathname.split('/');
  const suffix = autoplay ? '?muted=1&autoplay=1' : '';
  const embedHTML = `<div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;">
      <iframe src="https://player.vimeo.com/video/${video}${suffix}" 
      style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;" 
      frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen  
      title="Content from Vimeo" loading="lazy"></iframe>
    </div>`;
  return embedHTML;
};

const embedTwitter = (url) => {
  if (!url.href.startsWith('https://twitter.com')) {
    url.href = url.href.replace('https://x.com', 'https://twitter.com');
  }
  const embedHTML = `<blockquote class="twitter-tweet"><a href="${url.href}"></a></blockquote>`;
  loadScript('https://platform.twitter.com/widgets.js');
  return embedHTML;
};

const loadEmbed = (block, link, autoplay) => {
  if (block.classList.contains('embed-is-loaded')) {
    return;
  }

  const EMBEDS_CONFIG = [
    {
      match: ['youtube', 'youtu.be'],
      embed: embedYoutube,
    },
    {
      match: ['vimeo'],
      embed: embedVimeo,
    },
    {
      match: ['twitter', 'x.com'],
      embed: embedTwitter,
    },
  ];
  const config = EMBEDS_CONFIG.find((e) => e.match.some((match) => link.includes(match)));
  const url = new URL(link);
  if (config) {
    block.innerHTML = config.embed(url, autoplay);
    block.classList = `block embed embed-${config.match[0]}`;
  } else {
    block.innerHTML = getDefaultEmbed(url);
    block.classList = 'block embed';
  }
  block.classList.add('embed-is-loaded');
};

export default function decorate(block) {
  // Resolve AEM reference links: placeholder image may be an <a> tag
  block.querySelectorAll('p').forEach((p) => resolveImageReference(p));
  const placeholder = block.querySelector('picture') || block.querySelector('img');

  // Find video URL: <a> tag (import/auto-linked) or plain-text URL in a <p> (xwalk)
  const anchor = block.querySelector('a');
  let link = anchor?.href || '';
  if (!link) {
    const urlP = [...block.querySelectorAll('p')].find((p) => {
      const t = p.textContent.trim();
      return /^https?:\/\//.test(t) && !p.querySelector('img, picture');
    });
    if (urlP) link = urlP.textContent.trim();
  }

  // Extract overlay fields — handle both import format (<h2> for title)
  // and AEM xwalk format (all text fields served as <p> in field order)
  const heading = block.querySelector('h2, h3');
  let titleText = '';
  let descText = '';
  let btnLabel = '';

  // Collect text-only <p> elements (no img/picture/a children, not a bare URL)
  const textPs = [...block.querySelectorAll('p')].filter((p) => {
    if (p.querySelector('img, picture, a')) return false;
    const t = p.textContent.trim();
    return t && !/^https?:\/\//.test(t);
  });

  if (heading) {
    // Import format: title is in <h2>, remaining <p> tags are desc/btnLabel
    titleText = heading.textContent.trim();
    descText = textPs[0]?.textContent.trim() || '';
    btnLabel = textPs[1]?.textContent.trim() || '';
  } else {
    // xwalk format: all fields are <p>, ordered by model: title, desc, btnLabel
    titleText = textPs[0]?.textContent.trim() || '';
    descText = textPs[1]?.textContent.trim() || '';
    btnLabel = textPs[2]?.textContent.trim() || '';
  }

  // Fall back to anchor text for button label if it's not a bare URL
  if (!btnLabel && anchor) {
    const anchorText = anchor.textContent.trim();
    if (anchorText && anchorText !== link) btnLabel = anchorText;
  }

  if (!link) {
    // No embed URL — show placeholder image only
    if (placeholder) {
      block.textContent = '';
      const wrapper = document.createElement('div');
      wrapper.className = 'embed-placeholder';
      wrapper.prepend(placeholder);
      block.append(wrapper);
    }
    return;
  }
  block.textContent = '';

  if (placeholder) {
    const wrapper = document.createElement('div');
    wrapper.className = 'embed-placeholder';

    // Build overlay with title, description, and watch button
    const hasOverlay = titleText || descText || btnLabel;
    if (hasOverlay) {
      const overlay = document.createElement('div');
      overlay.className = 'embed-placeholder-overlay';

      if (titleText) {
        const title = document.createElement('h2');
        title.className = 'embed-placeholder-title';
        title.textContent = titleText;
        overlay.append(title);
      }
      if (descText) {
        const desc = document.createElement('p');
        desc.className = 'embed-placeholder-desc';
        desc.textContent = descText;
        overlay.append(desc);
      }
      const playBtn = document.createElement('button');
      playBtn.type = 'button';
      playBtn.className = 'embed-placeholder-watch';
      playBtn.innerHTML = `<span class="embed-placeholder-watch-icon"></span>${btnLabel || 'Play'}`;
      overlay.append(playBtn);

      wrapper.prepend(placeholder);
      wrapper.append(overlay);
    } else {
      wrapper.innerHTML = '<div class="embed-placeholder-play"><button type="button" title="Play"></button></div>';
      wrapper.prepend(placeholder);
    }

    wrapper.addEventListener('click', () => {
      loadEmbed(block, link, false);
    });
    block.append(wrapper);
  } else {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        loadEmbed(block, link);
      }
    });
    observer.observe(block);
  }
}
