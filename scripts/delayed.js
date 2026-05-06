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

loadDelayedScripts();
