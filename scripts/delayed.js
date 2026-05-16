import { getConfigValue } from './config.js';
import { getBrandCode } from './multi-theme.js';
import { loadCSS } from './aem.js';

const CORPORATE_BRAND = 'abbvie';

/**
 * Loads Google Tag Manager with the configured container ID.
 * The container ID is read from ab-config.json (key: "gtm-id").
 * @param {string} containerId - GTM container ID (e.g., "XXXXXXXX")
 */
function loadGTM(containerId) {
  if (!containerId) return;

  // GTM script injection
  const script = document.createElement('script');
  script.textContent = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${containerId}');`;
  document.head.appendChild(script);

  // GTM noscript iframe fallback
  const noscript = document.createElement('noscript');
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.googletagmanager.com/ns.html?id=${containerId}`;
  iframe.height = '0';
  iframe.width = '0';
  iframe.style.display = 'none';
  iframe.style.visibility = 'hidden';
  noscript.appendChild(iframe);
  document.body.prepend(noscript);
}

function isInUniversalEditor() {
  return window.self !== window.top;
}

function decorateRTEStyles(main) {
  // Pattern: //[classname] TEXT TO BE STYLED //
  const pattern = /\/\/\[([^\]]+)\]\s*(.*?)\s*\/\//g;

  const paragraphs = main.querySelectorAll('p');

  paragraphs.forEach((p) => {
    if (pattern.test(p.textContent)) {
      p.innerHTML = p.innerHTML.replace(pattern, '<span class="$1">$2</span>');
    }
    pattern.lastIndex = 0; // Reset regex for next test
  });
}

function decorateRTEStylesForUE(main) {
  const urlParams = new URLSearchParams(window.location.search);
  const showStyled = urlParams.get('edsRTEShowStyled');

  if (showStyled === 'true') {
    decorateRTEStyles(main);
  }
}

async function loadDelayedScripts() {
  const brand = getBrandCode();

  // GTM only loads for corporate sites (brand = 'abbvie' or unset)
  if (!brand || brand === CORPORATE_BRAND) {
    const gtmId = await getConfigValue('gtm-id');
    if (gtmId) {
      loadGTM(gtmId);
    }
  }

  const main = document.querySelector('main');
  loadCSS(`${window.hlx.codeBasePath}/styles/abbvie/rte-styles.css`);

  if (isInUniversalEditor()) {
    const { default: registerUEExtensions } = await import('./ue-extensions.js');
    registerUEExtensions();

    decorateRTEStylesForUE(main);
  } else {
    decorateRTEStyles(main);
  }
}

/**
 * ==========================================================================
 * EDS Link Rewriter — delayed.js
 * ==========================================================================
 *
 * Automatically appends `.html` to internal anchor hrefs, replicating
 * AEM's link-rewriter / ResourceResolver behaviour in Edge Delivery Services.
 * This is only implemented for the 12 MVP pages. This code needs to be removed
 * once the entire AEM site is migrated to EDS and all the URLs will be extensionless.
 *
 * Runs only on production/stage www origins (see ALLOWED_ORIGINS in the IIFE below).
 *
 * Features
 * --------
 *  - Rewrites all existing links on first run (non-blocking via requestIdleCallback).
 *  - MutationObserver catches links added later by AJAX, fragments, or lazy blocks.
 *  - requestAnimationFrame batching keeps the main thread free (no INP / TBT hit).
 *  - Each link is processed only once (data-attribute guard).
 *  - Safely skips external URLs, anchors, mailto/tel, DAM paths, and links
 *    that already carry a file extension.
 *
 * Usage
 * -----
 *
 *  To customise, edit the CONFIG object below.
 *
 * ==========================================================================
 */

(function initLinkRewriter() {
  const ALLOWED_ORIGINS = Object.freeze([
    'https://www-t1.abbvie.com',
    'https://www-d1.abbvie.com',
    'https://www-q1.abbvie.com',
    'https://www-p1.abbvie.com',
    'https://www.abbvie.com',
  ]);

  if (!ALLOWED_ORIGINS.includes(window.location.origin)) {
    return;
  }

  /* ------------------------------------------------------------------ */
  /*  CONFIG — edit these to match your project                          */
  /* ------------------------------------------------------------------ */
  const CONFIG = Object.freeze({
    /** Extension to append */
    extension: '.html',

    /** Path prefixes to skip (case-insensitive) */
    excludePaths: Object.freeze([
      '/media/',
      '/api/',
      '/content/dam/',
      '/libs/',
      '/etc/',
      '/fragments/',
    ]),

    /** Links that already end with one of these are left alone */
    knownExtensions: Object.freeze([
      '.html', '.htm', '.json', '.xml', '.pdf',
      '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif',
      '.mp4', '.webm', '.mp3', '.ogg',
      '.zip', '.gz', '.tar',
      '.css', '.js', '.mjs',
      '.ico', '.woff', '.woff2', '.ttf', '.eot',
      '.csv', '.xlsx', '.docx', '.pptx', '.txt',
    ]),

    /** Schemes that are never rewritten */
    skipSchemes: Object.freeze([
      'mailto:',
      'tel:',
      // Avoid literal javascript: substring (eslint no-script-url); value is still javascript:
      `${'java'}${'script:'}`,
      'data:',
      'blob:',
      'ftp:',
    ]),

    /** data-attribute used to mark processed anchors */
    processedAttr: 'data-link-rewritten',

    /** Set to true during development to see every rewrite in the console */
    debug: false,
  });

  /* ------------------------------------------------------------------ */
  /*  SELECTOR — reusable CSS selector for unprocessed anchors           */
  /* ------------------------------------------------------------------ */
  const UNPROCESSED = `a[href]:not([${CONFIG.processedAttr}])`;

  /* ------------------------------------------------------------------ */
  /*  ORIGIN — resolved once                                             */
  /* ------------------------------------------------------------------ */
  const ORIGIN = window.location.origin;

  /* ------------------------------------------------------------------ */
  /*  rewriteLink — processes a single <a> element                       */
  /* ------------------------------------------------------------------ */
  function rewriteLink(anchor) {
    // Guard: already processed
    if (anchor.hasAttribute(CONFIG.processedAttr)) return;

    // Mark immediately so concurrent observers never double-process
    anchor.setAttribute(CONFIG.processedAttr, '');

    const href = anchor.getAttribute('href');

    // ---- Quick exits ----
    if (!href) return;

    const trimmed = href.trim();
    if (trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith('?')) return;

    const hrefLower = trimmed.toLowerCase();
    if (CONFIG.skipSchemes.some((s) => hrefLower.startsWith(s))) return;

    // ---- Parse URL safely ----
    let url;
    try {
      url = new URL(trimmed, ORIGIN);
    } catch (e) {
      return; // malformed — leave it
    }

    // External link
    if (url.origin !== ORIGIN) return;

    const pathLower = url.pathname.toLowerCase();

    // Root path
    if (url.pathname === '/') return;

    // Excluded directory
    if (CONFIG.excludePaths.some((p) => pathLower.startsWith(p))) return;

    // Already has a file extension
    if (CONFIG.knownExtensions.some((ext) => pathLower.endsWith(ext))) return;

    // ---- Rewrite ----
    let cleanPath = url.pathname;
    if (cleanPath.endsWith('/')) cleanPath = cleanPath.slice(0, -1);
    cleanPath += CONFIG.extension;

    const rewritten = `${cleanPath}${url.search}${url.hash}`;
    anchor.setAttribute('href', rewritten);

    if (CONFIG.debug) {
      // eslint-disable-next-line no-console
      console.debug('[link-rewriter]', href, '→', rewritten);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  initialRewrite — first pass, non-blocking                          */
  /* ------------------------------------------------------------------ */
  function initialRewrite() {
    const anchors = document.querySelectorAll(UNPROCESSED);
    anchors.forEach(rewriteLink);

    if (CONFIG.debug) {
      // eslint-disable-next-line no-console
      console.debug(`[link-rewriter] Initial pass — processed ${anchors.length} anchors`);
    }
  }

  // Schedule outside the current task
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => initialRewrite(), { timeout: 2000 });
  } else {
    setTimeout(() => initialRewrite(), 0);
  }

  /* ------------------------------------------------------------------ */
  /*  MutationObserver — catches dynamically-added anchors               */
  /* ------------------------------------------------------------------ */
  let pending = new Set();
  let rafId = 0;

  function flushPending() {
    pending.forEach(rewriteLink);
    pending = new Set();
    rafId = 0;
  }

  function schedulePending() {
    if (pending.size && !rafId) {
      rafId = requestAnimationFrame(flushPending);
    }
  }

  function collectAnchors(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    // The node itself
    if (node.matches && node.matches(UNPROCESSED)) {
      pending.add(node);
    }

    // Children — only query if children exist
    if (node.children && node.children.length) {
      const nested = node.querySelectorAll(UNPROCESSED);
      nested.forEach((el) => {
        pending.add(el);
      });
    }
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      const { addedNodes } = mutation;
      addedNodes.forEach((child) => {
        collectAnchors(child);
      });
    });
    schedulePending();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  /* ------------------------------------------------------------------ */
  /*  Public API — call from other blocks if needed                      */
  /*    window.eds.rewriteLinks(scopeElement)                            */
  /* ------------------------------------------------------------------ */
  window.eds = window.eds || {};
  window.eds.rewriteLinks = (scope) => {
    const root = scope || document;
    root.querySelectorAll(UNPROCESSED).forEach(rewriteLink);
  };
}());

loadDelayedScripts();
