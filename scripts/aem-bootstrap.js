/**
 * AEM Bootstrap (Path-filtered)
 * -----------------------------
 * Rewrites only AEM-owned relative URLs to AEM Publish
 */

(function aemBootstrap() {
  if (window.AEM_BOOTSTRAPPED) {
    return;
  }
  window.AEM_BOOTSTRAPPED = true;

  const AEM_BASE = 'https://publish-p157365-e1665798.adobeaemcloud.com';

  /**
   * AEM paths that should be rewritten
   * Extend ONLY if needed
   */
  const AEM_PATH_PREFIXES = [
    '/bin/',
    '/content/forms/',
    '/graphql/',
    '/etc.clientlibs/',
    '/abbviecloud/adobe/forms/af/',
    '/abbviecloud/libs/granite/',
  ];

  function isAemPath(url) {
    if (typeof url !== 'string') return false;

    // Ignore absolute URLs
    if (/^(https?:)?\/\//i.test(url)) return false;

    return AEM_PATH_PREFIXES.some((prefix) => url.startsWith(prefix));
  }

  /**
   * Patch fetch()
   */
  const originalFetch = window.fetch;
  if (originalFetch) {
    window.fetch = function fetchWrapper(input, init) {
      let modifiedInput = input;
      if (typeof input === 'string' && isAemPath(input)) {
        modifiedInput = AEM_BASE + input;
      } else if (input instanceof Request && isAemPath(input.url)) {
        modifiedInput = new Request(AEM_BASE + input.url, input);
      }
      return originalFetch.call(this, modifiedInput, init);
    };
  }

  /**
   * Patch XMLHttpRequest
   */
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function openWrapper(method, url, ...rest) {
    let modifiedUrl = url;
    if (isAemPath(url)) {
      modifiedUrl = AEM_BASE + url;
    }
    return originalOpen.apply(this, [method, modifiedUrl, ...rest]);
  };

  /**
   * Patch form submissions
   */
  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (
      form
      && form.tagName === 'FORM'
      && isAemPath(form.action)
    ) {
      form.action = AEM_BASE + form.action;
    }
  });

  // eslint-disable-next-line no-console
  console.info('[AEM] Bootstrap initialized (filtered paths)');
}());
