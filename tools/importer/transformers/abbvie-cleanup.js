/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: AbbVie site cleanup.
 * Selectors from captured DOM of https://www.abbvie.com/science.html
 *
 * Removes non-authorable content: header/nav experience fragment, footer experience fragment,
 * accordion navigation panels (not FAQ accordion), cookie/consent overlays, sticky nav,
 * noscript, link, and iframe elements.
 *
 */
const H = { before: 'beforeTransform', after: 'afterTransform' };

// Alt-text → Scene7 URL mapping for images that the browser converts to blob: URLs.
// AbbVie's JS loads Scene7 images via createObjectURL, stripping data-cmp-src before
// the transformer runs. This lookup resolves blob URLs by matching the img alt attribute.
// Derived from migration-work/cleaned.html (source-of-truth for original URLs).
const SCENE7_ALT_MAP = {
  'Microscope image of cells': 'https://abbvie.scene7.com/is/image/abbviecorp/science-oncology',
  'the persistence lab story image': 'https://abbvie.scene7.com/is/image/abbviecorp/the-persistence-lab-story-image',
  'One Minute Thesis logo -  video': 'https://abbvie.scene7.com/is/image/abbviecorp/one-minute-thesis-thumbnail-1',
  'One Minute Thesis logo - video': 'https://abbvie.scene7.com/is/image/abbviecorp/one-minute-thesis-thumbnail-1',
  'lab of the future thumbnail': 'https://abbvie.scene7.com/is/image/abbviecorp/lab-of-the-future-thumbnail-1',
  'discovery files thumbnail': 'https://abbvie.scene7.com/is/image/abbviecorp/discovery-files-thumbnail-1',
  'Cambridge Scientists': 'https://abbvie.scene7.com/is/image/abbviecorp/Cambridge%20Scientists',
  'AbbVie logo': 'https://abbvie.scene7.com/is/content/abbviecorp/abbvie-logo-header',
  'none': 'https://abbvie.scene7.com/is/image/abbviecorp/Cambridge%20Scientists',
};

export default function transform(hookName, element, payload) {
  if (hookName === H.before) {
    // Remove cookie consent / OneTrust overlays (from captured DOM: .ot-pc-footer, #onetrust-*)
    WebImporter.DOMUtils.remove(element, [
      '[id^="onetrust"]',
      '.ot-pc-footer',
      '[class*="cookie"]',
      '[class*="consent"]',
    ]);

    // Remove navigation accordion panels that are NOT the FAQ accordion
    // From captured DOM: accordion-5a41404cb9 and accordion-e3c9cd55f0 are nav accordions
    // accordion-c31e57db88 is the FAQ accordion (keep it)
    const navAccordions = element.querySelectorAll(
      '.accordion.panelcontainer.cmp-accordion-xx-large.show-tabs-desktop',
    );
    navAccordions.forEach((acc) => acc.remove());

    // Extract teaser component as structured paragraphs for the "At a Glance" section.
    // CSS expects: p1=pretitle (uppercase), p2=title with <em> for blue accent, p3=description
    // Styled via main > .section.navy-overlap + .section
    const teaser = element.querySelector('.teaser.light-theme');
    if (teaser) {
      const document = element.ownerDocument;
      const frag = document.createDocumentFragment();

      // Pretitle: "AbbVie Science"
      const pretitleEl = teaser.querySelector('.cmp-teaser__pretitle');
      if (pretitleEl) {
        const p = document.createElement('p');
        p.textContent = pretitleEl.textContent.trim();
        frag.appendChild(p);
      }

      // Title: "At a glance: <em>R&D highlights</em>"
      // Source DOM has <p>At a glance:<br><span>R&D highlights</span></p>
      const titleEl = teaser.querySelector('.cmp-teaser__title');
      if (titleEl) {
        const p = document.createElement('p');
        const sourceP = titleEl.querySelector('p');
        if (sourceP) {
          for (const node of Array.from(sourceP.childNodes)) {
            if (node.nodeType === 3) {
              // Text node — preserve (e.g. "At a glance:")
              const text = node.textContent.replace(/\s+/g, ' ');
              if (text.trim()) p.appendChild(document.createTextNode(text));
            } else if (node.tagName === 'BR') {
              p.appendChild(document.createElement('br'));
            } else if (node.tagName === 'SPAN') {
              // Wrap span content in <em> for blue accent color
              const em = document.createElement('em');
              em.textContent = node.textContent.trim();
              p.appendChild(em);
            }
          }
        }
        frag.appendChild(p);
      }

      // Description paragraph
      const descEl = teaser.querySelector('.cmp-teaser__description');
      if (descEl) {
        const descP = descEl.querySelector('p');
        if (descP) {
          frag.appendChild(descP);
        }
      }

      teaser.replaceWith(frag);
    }

    // Resolve lazy-loaded Scene7 images: copy data-cmp-src → src
    // AbbVie uses data-cmp-src for deferred loading; during headless import
    // these images have no src attribute and would be lost.
    element.querySelectorAll('img[data-cmp-src]').forEach((img) => {
      const src = img.getAttribute('src') || '';
      const lazySrc = img.getAttribute('data-cmp-src') || '';
      if (lazySrc && (!src || src.startsWith('data:'))) {
        img.setAttribute('src', lazySrc);
      }
    });
    // Also resolve data-cmp-src on .cmp-image containers (AbbVie stores
    // Scene7 URL on the wrapper div, not the img itself in some patterns)
    element.querySelectorAll('.cmp-image[data-cmp-src]').forEach((cmpImage) => {
      const lazySrc = cmpImage.getAttribute('data-cmp-src') || '';
      if (!lazySrc) return;
      const document = element.ownerDocument;
      let img = cmpImage.querySelector('img');
      if (img) {
        const src = img.getAttribute('src') || '';
        if (!src || src.startsWith('data:')) {
          img.setAttribute('src', lazySrc);
        }
      } else {
        img = document.createElement('img');
        img.setAttribute('src', lazySrc);
        img.setAttribute('alt', cmpImage.getAttribute('data-asset-name') || cmpImage.getAttribute('title') || '');
        cmpImage.appendChild(img);
      }
    });

    // Strip zero-width characters from all text nodes (U+200B, U+200C, U+200D, U+FEFF)
    // Source CMS content may contain invisible Unicode characters that break rendering
    const treeWalker = element.ownerDocument.createTreeWalker(element, 4 /* NodeFilter.SHOW_TEXT */);
    let textNode;
    while ((textNode = treeWalker.nextNode())) {
      const cleaned = textNode.textContent.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
      if (cleaned !== textNode.textContent) {
        textNode.textContent = cleaned;
      }
    }

    // Strip data-cmp-data-layer attributes early (before parsers can preserve them)
    // These contain unescaped HTML (<p> tags, bare &) that cause XML serialization failures
    element.querySelectorAll('[data-cmp-data-layer]').forEach((el) => {
      el.removeAttribute('data-cmp-data-layer');
    });

    // Strip query parameters from Scene7 image URLs
    // ts (cache buster) and dpr (device pixel ratio) are rendering hints not needed
    element.querySelectorAll('img[src*="scene7.com"]').forEach((img) => {
      const src = img.getAttribute('src') || '';
      try {
        const u = new URL(src);
        if (u.search) {
          img.setAttribute('src', u.origin + u.pathname);
        }
      } catch (e) { /* ignore invalid URLs */ }
    });

    // Replace blob: URLs — AbbVie's JS converts Scene7 images to blob: via createObjectURL
    // Strategy: 1) check data-cmp-src on img, 2) check ancestor .cmp-image, 3) alt-text lookup
    element.querySelectorAll('img[src^="blob:"]').forEach((img) => {
      let resolved = img.getAttribute('data-cmp-src') || img.getAttribute('data-src') || '';
      // Check ancestor .cmp-image container for data-cmp-src
      if (!resolved) {
        let parent = img.parentElement;
        while (parent && parent !== element) {
          resolved = parent.getAttribute('data-cmp-src') || '';
          if (resolved) break;
          parent = parent.parentElement;
        }
      }
      // Fallback: alt-text → Scene7 URL mapping
      if (!resolved) {
        const alt = (img.getAttribute('alt') || '').trim();
        resolved = SCENE7_ALT_MAP[alt] || '';
      }
      if (resolved) {
        img.setAttribute('src', resolved);
      } else {
        console.warn('[cleanup] blob: URL with no fallback:', img.getAttribute('src'), 'alt:', img.getAttribute('alt'));
      }
    });
    // Also fix blob: URLs in link hrefs (video links)
    element.querySelectorAll('a[href^="blob:"]').forEach((a) => {
      a.removeAttribute('href');
    });

    // Move container background images to END of their container
    // so they appear AFTER the cards table (not between text and cards)
    element.querySelectorAll('img.cmp-container__bg-image').forEach((img) => {
      const container = img.parentElement;
      if (container && container !== element) {
        container.appendChild(img);
      }
    });

    // Preserve "PRIORITIES" label from .cmp-header__text before removing tab headers.
    // The Core Focus Areas section has a .cmp-header__text with "PRIORITIES" that should
    // become a styled paragraph, not be discarded with navigation tab headers.
    element.querySelectorAll('.cmp-header__text').forEach((el) => {
      const text = el.textContent.trim().toUpperCase();
      if (text === 'PRIORITIES') {
        const document = element.ownerDocument;
        const p = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = text;
        p.appendChild(strong);
        el.replaceWith(p);
      } else {
        el.remove();
      }
    });

    // Remove "No results found" / "Change your search criteria" search result placeholders.
    // AbbVie uses .list-results-none divs AND <span class="empty-results-title"> /
    // <span class="empty-results-quote"> elements inside filter/search components.
    element.querySelectorAll('.list-results-none').forEach((el) => el.remove());
    element.querySelectorAll('*').forEach((el) => {
      if (el.children.length > 2) return;
      const txt = el.textContent.trim().replace(/\s+/g, ' ');
      if (/^No results found/.test(txt) || /^Change your search criteria/.test(txt)) {
        el.remove();
      }
    });

    // Extract CTA section from footer BEFORE parsers run
    // (parsers replace .footer-overlap with a columns table, making it unfindable later)
    const footerFrag = element.querySelector('.cmp-experiencefragment--footer');
    if (footerFrag) {
      const ctaSection = footerFrag.querySelector('.container.cmp-container-full-width.footer-overlap');
      if (ctaSection) {
        footerFrag.parentNode.insertBefore(ctaSection, footerFrag);
      }
    }
  }

  if (hookName === H.after) {
    // Remove header experience fragment (from captured DOM: .cmp-experiencefragment--header)
    // and sticky nav wrapper
    WebImporter.DOMUtils.remove(element, [
      '.cmp-experiencefragment--header',
      '.experiencefragment.sticky-nav',
      'header.nav-bar',
    ]);

    // Remove footer experience fragment (from captured DOM: .cmp-experiencefragment--footer)
    // CTA section (.footer-overlap) was already extracted in beforeTransform
    const footerFrag = element.querySelector('.cmp-experiencefragment--footer');
    if (footerFrag) {
      footerFrag.remove();
    }

    // Remove remaining non-authorable elements
    WebImporter.DOMUtils.remove(element, [
      'noscript',
      'link',
      'iframe',
      '.list-footer-primary',
      '.list-footer-legal',
    ]);

    // Remove popup/modal dialogs (warn-on-departure, disclaimer modals)
    element.querySelectorAll('.popup-overlay, [class*="popup"], [class*="modal"]').forEach((el) => {
      // Keep actual content modals if present, only remove departure warnings
      const text = el.textContent || '';
      if (text.includes('leave the AbbVie website') || text.includes('You are about to leave')) {
        el.remove();
      }
    });

    // Remove tracking pixels (1x1 images from analytics services)
    element.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src') || '';
      if (src.includes('analytics.twitter.com') ||
          src.includes('t.co/i/adsct') ||
          src.includes('siteimproveanalytics') ||
          src.includes('google.com/pagead') ||
          src.includes('alb.reddit.com') ||
          src.includes('bing.com/c.gif') ||
          src.includes('metrics.brightcove.com')) {
        img.remove();
      }
    });

    // Remove Brightcove video player chrome (captions settings, modal dialogs etc.)
    element.querySelectorAll('.vjs-modal-dialog, .vjs-control-bar, .vjs-text-track-display').forEach((el) => el.remove());

    // Clean data attributes (preserving analytics per CLAUDE.md Rule 4)
    element.querySelectorAll('*').forEach((el) => {
      el.removeAttribute('onclick');
      el.removeAttribute('onload');
    });
  }
}
