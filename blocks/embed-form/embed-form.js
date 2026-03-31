import { getConfigValue } from '../../scripts/config.js';
import { isUniversalEditor } from '../../scripts/utils.js';

const HOST = await getConfigValue('aemPublishUrl') || 'https://publish-p157365-e1665798.adobeaemcloud.com';

/**
 * Embed Form Block
 * Renders an AEM adaptive form using its published path
 */
export default function decorate(block) {
  if (!block) {
    return;
  }

  // AEM Published Form Path
  const formLink = block.querySelector('a');

  if (!formLink?.href) {
    return;
  }

  let finalFormPath = '';
  let href = formLink?.href;

  if ((href.startsWith('http://') || href.startsWith('https://')) && (formLink.host !== window.location.host)) {
    finalFormPath = href;
  }

  if (isUniversalEditor()) {
    finalFormPath = href;
  }

  if ((formLink.host === window.location.host) && !isUniversalEditor()) {
    href = formLink.pathname + formLink.search + formLink.hash;
  }

  if (href.startsWith('/content/forms')) {
    if (!href.endsWith('.html')) {
      href = `${href}.html`;
    }

    finalFormPath = `${HOST}${href}`;
  }
  const formUrlObj = new URL(finalFormPath);
  const formUrlHost = formUrlObj.hostname;

  // Container for form
  const formContainer = document.createElement('div');
  formContainer.className = 'embed-form-container';
  block.querySelector(':scope div').replaceWith(formContainer);

  // Load jQuery if missing
  const ensureJQuery = () => new Promise((resolve) => {
    if (window.jQuery) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js';
    script.onload = resolve;
    document.head.appendChild(script);
  });

  // Load and render adaptive form
  const loadAdaptiveForm = () => {
    formContainer.innerHTML = '<div class="embed-form-loading">Loading form...</div>';

    window.jQuery.ajax({
      url: finalFormPath,
      type: 'GET',
      data: isUniversalEditor() ? { wcmmode: 'disabled' } : {},
      success(data) {
        formContainer.innerHTML = data;

        const elements = formContainer.querySelectorAll('script, link');
        elements.forEach((element) => {
          const attr = element.tagName.toLowerCase() === 'script' ? 'src' : 'href';
          const value = element[attr];

          if (value) {
            try {
              const parsedUrl = new URL(value);
              if (parsedUrl.host === window.location.host) {
                element[attr] = `${formUrlObj.protocol}//${formUrlHost}${parsedUrl.pathname}`;
              }
            } catch {
              // ignore invalid URLs
            }
          }
        });

        const scripts = formContainer.querySelectorAll('script');
        scripts.forEach((oldScript) => {
          const newScript = document.createElement('script');
          if (oldScript.src) {
            newScript.src = oldScript.src;
          } else {
            newScript.textContent = oldScript.textContent;
          }
          oldScript.replaceWith(newScript);
        });

        const form = document.querySelector('[data-cmp-path]');
        if (form) {
          form.setAttribute(
            'data-cmp-context-path',
            `${formUrlObj.protocol}//${formUrlHost}`,
          );
        }

        document.dispatchEvent(
          new CustomEvent('adaptiveform:loaded', {
            detail: { finalFormPath, container: formContainer },
          }),
        );
      },

      error(error) {
        formContainer.innerHTML = '<p>Error loading form. Please try again later.</p>';

        document.dispatchEvent(
          new CustomEvent('adaptiveform:error', {
            detail: { finalFormPath, error },
          }),
        );
      },
    });
  };

  ensureJQuery().then(loadAdaptiveForm);
}
