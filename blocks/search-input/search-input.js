import { applyCommonProps } from '../../scripts/utils.js';
import { fetchPlaceholders } from '../../scripts/placeholders.js';

const searchParams = new URLSearchParams(window.location.search);

/**
 * Sanitize input to prevent XSS — strip HTML tags and encode entities.
 * @param {string} str
 * @returns {string}
 */
function sanitize(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export default async function decorate(block) {
  applyCommonProps(block, 3);

  const placeholders = await fetchPlaceholders();
  const rows = [...block.children];

  // Extract authored properties from block rows
  const searchResultsPath = rows[0]?.querySelector('a')?.href
    || rows[0]?.textContent?.trim()
    || window.location.pathname;
  const placeholderDesktop = rows[1]?.textContent?.trim() || 'Search';
  const placeholderMobile = rows[2]?.textContent?.trim() || placeholderDesktop;

  // Clear authored content
  block.innerHTML = '';

  // Build the search form
  const form = document.createElement('form');
  form.method = 'get';
  form.setAttribute('role', 'search');
  form.classList.add('search-input-form');
  form.action = searchResultsPath;

  const inputWrapper = document.createElement('div');
  inputWrapper.classList.add('search-input-field');

  // Generate unique IDs for aria references
  const inputId = `search-input-${Date.now()}`;
  const labelId = `${inputId}-label`;
  const alertId = `${inputId}-alert`;

  const input = document.createElement('input');
  input.type = 'search';
  input.name = 'q';
  input.id = inputId;
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.minLength = 1;
  input.maxLength = 100;
  input.classList.add('search-input-text');
  input.setAttribute('aria-label', placeholderDesktop);
  input.setAttribute('aria-labelledby', labelId);
  input.setAttribute('aria-describedby', alertId);

  const charsetInput = document.createElement('input');
  charsetInput.type = 'hidden';
  charsetInput.name = '_charset_';
  charsetInput.value = 'UTF-8';

  const label = document.createElement('label');
  label.id = labelId;
  label.setAttribute('for', inputId);
  label.classList.add('search-input-label', 'search-input-label-active');
  label.textContent = placeholderDesktop;
  label.dataset.desktopPlaceholder = placeholderDesktop;
  label.dataset.mobilePlaceholder = placeholderMobile;

  // Alert box for validation (i18n from EDS placeholders)
  const errorMessage = placeholders?.searchInputError || 'Please enter a valid search term';
  const alertBox = document.createElement('div');
  alertBox.id = alertId;
  alertBox.classList.add('search-input-alert');
  alertBox.setAttribute('role', 'alert');
  alertBox.setAttribute('aria-live', 'polite');
  const alertText = document.createElement('p');
  alertText.textContent = errorMessage;
  alertBox.append(alertText);

  // Floating label behavior
  input.addEventListener('focus', () => {
    label.classList.add('search-input-label-active');
    label.classList.remove('search-input-label-down');
    // Clear error on re-focus
    alertBox.classList.remove('visible');
    input.classList.remove('search-input-error');
  });

  input.addEventListener('blur', () => {
    if (!input.value) {
      label.classList.remove('search-input-label-active');
      label.classList.add('search-input-label-down');
    }
  });

  // No Results message (i18n)
  const noResultsText = placeholders?.searchNoResults || 'No Results';
  const noResults = document.createElement('div');
  noResults.classList.add('search-input-no-results');
  noResults.textContent = noResultsText;

  // Form submit handler — validation, sanitization, navigation
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const rawValue = input.value;
    const trimmedValue = rawValue.trim();

    // Validate: empty or whitespace-only is invalid
    if (!trimmedValue) {
      alertBox.classList.add('visible');
      input.classList.add('search-input-error');
      input.focus();
      return;
    }

    // Sanitize to prevent XSS
    const safeValue = sanitize(trimmedValue);

    // Build URL with encoded query parameter
    const url = new URL(searchResultsPath, window.location.origin);
    url.searchParams.set('q', safeValue);
    url.searchParams.set('_charset_', charsetInput.value);
    window.location.href = url.toString();
  });

  inputWrapper.append(input, label, alertBox);
  form.append(inputWrapper, charsetInput);
  block.append(form, noResults);

  // Responsive placeholder swap
  const mediaQuery = window.matchMedia('(max-width: 743px)');
  function updatePlaceholder(e) {
    const text = e.matches ? placeholderMobile : placeholderDesktop;
    label.textContent = text;
    input.setAttribute('aria-label', text);
  }
  mediaQuery.addEventListener('change', updatePlaceholder);
  updatePlaceholder(mediaQuery);

  // Pre-fill from URL params
  const q = searchParams.get('q');
  if (q) {
    input.value = q;
    label.classList.add('search-input-label-active');
    label.classList.remove('search-input-label-down');
  }
}
