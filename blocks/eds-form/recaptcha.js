export function loadRecaptcha(siteKey) {
  return new Promise((resolve, reject) => {
    if (window.grecaptcha && window.grecaptcha.ready) {
      resolve();
      return;
    }

    if (document.querySelector('script[src*="recaptcha"]')) {
      const checkInterval = setInterval(() => {
        if (window.grecaptcha && window.grecaptcha.ready) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.grecaptcha) {
        window.grecaptcha.ready(() => resolve());
      } else {
        reject(new Error('reCAPTCHA failed to initialize'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load reCAPTCHA API'));

    document.head.appendChild(script);
  });
}

export async function getRecaptchaToken(siteKey, action = 'submit') {
  await loadRecaptcha(siteKey);

  return new Promise((resolve, reject) => {
    window.grecaptcha.ready(() => {
      window.grecaptcha
        .execute(siteKey, { action })
        .then((token) => {
          resolve(token);
        })
        .catch((error) => {
          reject(error);
        });
    });
  });
}
