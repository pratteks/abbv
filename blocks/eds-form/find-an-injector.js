import {
  loadGoogleMapsAPI,
  initializeMap,
  getMap,
  updateMapMarkers,
  getMarkers,
} from './maps.js';
import { loadRecaptcha, getRecaptchaToken } from './recaptcha.js';
import { getConfigValue } from '../../scripts/config.js';

const RECAPTCHA_SITE_KEY = await getConfigValue('grecaptchaKey');
const GOOGLE_MAPS_API_KEY = await getConfigValue('gmapsKey');
const PROVIDER_MARKER_PATH = 'M9,26.1C1.4,15.2,0,14,0,10C0,4.5,4.5,0,10,0s10,4.5,10,10'
  + 'c0,4-1.4,5.2-9,16.1c-0.4,0.6-1.1,0.7-1.7,0.3 C9.2,26.3,9.1,26.2,9,26.1z';
const MAP_TOGGLE_ICON_PATH = 'M12 2C8.686 2 6 4.686 6 8c0 4.5 6 12 6 12s6-7.5 6-12'
  + 'c0-3.314-2.686-6-6-6zm0 8.5A2.5 2.5 0 1 1 12 5a2.5 2.5 0 0 1 0 5.5z';

let currentResults = [];

function updatePaginationHeader(totalCount) {
  const paginationHeader = document.querySelector('.pagination-header');
  if (paginationHeader) {
    const displayedCount = Math.min(10, totalCount);
    paginationHeader.textContent = `Showing 1 - ${displayedCount} of ${totalCount}`;
  }
}

export function getMarkerLetter(index) {
  return String.fromCharCode(65 + index);
}

/**
 * Shows loading overlay
 */
export function showLoader() {
  const loader = document.querySelector('.loading-overlay');
  if (loader) loader.style.display = 'flex';
}

/**
 * Hides loading overlay
 */
export function hideLoader() {
  const loader = document.querySelector('.loading-overlay');
  if (loader) loader.style.display = 'none';
}

/**
 * Shows error message
 * @param {string} message - Error message to display
 */
function showError(message) {
  const loadingOverlay = document.querySelector('.loading-overlay');
  const errorDiv = document.querySelector('.fap-main-error');
  const spinner = document.querySelector('.abbv-animation-loading');

  if (spinner) {
    spinner.style.display = 'none';
  }

  if (errorDiv) {
    const errorSpan = errorDiv.querySelector('span');
    if (errorSpan) {
      errorSpan.textContent = message;
    }
    errorDiv.style.display = 'block';
    errorDiv.classList.add('abbv-active');
  }

  if (loadingOverlay) {
    loadingOverlay.style.display = 'flex';
  }

  const closeBtn = errorDiv?.querySelector('.abbv-button-plain');
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.preventDefault();
      if (loadingOverlay) loadingOverlay.style.display = 'none';
      if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.classList.remove('abbv-active');
      }
      if (spinner) spinner.style.display = 'block';
    };
  }
}

function createProviderListItem(provider, index) {
  const letter = getMarkerLetter(index);
  const name = provider.PartyName;
  const degree = provider.HCPExtension?.DegreeCode || '';
  const fullName = `${name}${degree ? `, ${degree}` : ''}`;

  // Get primary address
  const primaryAddress = provider.PartyAddress?.[0];
  const address = primaryAddress
    ? `${primaryAddress.AddressLine1}`
    : 'Address not available';
  const cityState = primaryAddress
    ? `${primaryAddress.CityName}, ${primaryAddress.StateProvinceCode} ${primaryAddress.PostalCode}`
    : '';

  // Get primary phone
  const primaryPhone = provider.Communication?.[0];
  const phone = (primaryPhone?.CommunicationTypeDescription === 'Telephone'
      && primaryPhone?.CommunicationValueText)
    || '';

  // Get specialty
  const primarySpecialty = provider.Specialty?.find((spec) => spec.BestSpecialtyIndicator === 'YES')
    || provider.Specialty?.[0];
  const specialty = primarySpecialty?.SpecialtyDescription || '';

  // Calculate distance (if available)
  const distance = primaryAddress?.DistanceInMiles || '';
  // Strip the distance to only 2 chars after decimal point
  const updatedMiles = distance?.toString().match(/^\d+(\.\d{0,2})?/);
  const distanceText = updatedMiles?.[0]
    ? `${updatedMiles[0]} mi | `
    : `${parseFloat(distance).toFixed(0)} mi | `;

  return `
    <li class="provider-list-item" title="${letter}|${fullName}">
      <a class="provider-link" href="javascript:void(0);">
        <strong>${fullName}</strong>
      </a>
      <span>${address}</span><br>
      <span>${cityState} </span>
      ${phone ? `<a href="tel:${phone}" class="dr-com-link">${phone}</a>` : ''}
      <span class="miles-to">${distanceText}</span>
      <a class="bbv-icon-directions_car i-b abbv-modal-open directions-to" 
         href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${address} ${cityState}`,
  )}"
         target="_blank">Get Directions</a>
      <button class="abbv-icon-arrow-drop-down i-a abbv-button-plain">Show More</button>
        ${
  specialty
    ? `<p class="more-item hide"><span><strong>Specialty</strong></span><br><span>${specialty}</span><br></p>`
    : ''
}
      <div class="list-marker-container">
        <span>${letter}</span>
        <svg
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 26.1"
          xml:space="preserve"
          fill="#000000"
          stroke="#000000"
        >
          <path
            d="${PROVIDER_MARKER_PATH}"
          ></path>
        </svg>
      </div>
    </li>`;
}

/**
 * Creates the results HTML structure for the find-an-injector form
 * @param {boolean} includeMap - Whether to include the map container
 * @returns {string} HTML string for results section
 */
export function createResultsHTML(showMap) {
  const mapToggleHTML = showMap
    ? `
      <div class="results-utils">
        <button class="fap-toggleMap">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="${MAP_TOGGLE_ICON_PATH}"
              fill="#ffffff"/>
            <rect x="8" y="20" width="8" height="2" rx="1" fill="#ffffff"/>
          </svg>
          Show Map
        </button>
      </div>`
    : '';

  const mapContainerHTML = showMap
    ? `
        <div class="fap-map-container">
          <div class="fap-map" id="provider-map"></div>
        </div>`
    : '';

  const containerClass = showMap
    ? 'results-container map-visible'
    : 'results-container';

  return `
    <div class="find-a-provider-results" style="display: none;">
      ${mapToggleHTML}

      <h3 class="pagination-header">Showing 1 - 10 of 0</h3>

      <div class="${containerClass}" aria-live="polite">
        ${mapContainerHTML}
        <div class="fap-list-container">
          <div class="provider-list">
            <ul class="provider-results-list"></ul>
          </div>
        </div>
      </div>
    </div>`;
}

function displayResults() {
  if (!currentResults.length) return;

  const resultsList = document.querySelector('.provider-results-list');
  if (!resultsList) return;

  resultsList.innerHTML = currentResults
    .map((provider, index) => createProviderListItem(provider, index))
    .join('');

  document.querySelectorAll('.abbv-button-plain').forEach((button) => {
    button.addEventListener('click', function toggleMoreInfo() {
      const moreInfo = this.nextElementSibling;
      if (moreInfo) {
        moreInfo.classList.toggle('hide');
      }
    });
  });

  document.querySelectorAll('.provider-list-item').forEach((item, index) => {
    item.addEventListener('click', function handleProviderClick(e) {
      // Don't trigger on button clicks
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;

      document
        .querySelectorAll('.provider-list-item')
        .forEach((li) => li.classList.remove('abbv-active'));
      this.classList.add('abbv-active');

      // Trigger map marker if available
      if (typeof google !== 'undefined' && window.providerToMarkerMap) {
        const targetMarker = window.providerToMarkerMap.get(index);
        const map = getMap();

        if (targetMarker) {
          // Close any open info windows
          const markers = getMarkers();
          markers.forEach((m) => {
            if (m.infoWindow) {
              m.infoWindow.close();
            }
          });

          // Update the marker's info content to show this specific provider
          const provider = currentResults[index];
          targetMarker.updateInfoContent(provider, index);

          // Open the info window
          targetMarker.infoWindow.open(map, targetMarker);

          // Center map on marker
          map.setCenter(targetMarker.getPosition());
          if (map.getZoom() < 12) {
            map.setZoom(12);
          }
        }
      }
    });
  });
}

/**
 * Handles form submission for find-an-injector
 * @param {FormData} formData - Form data from submission
 */
export async function handleFormSubmission(formData, showMap) {
  showLoader();

  try {
    const recaptchaToken = await getRecaptchaToken(
      RECAPTCHA_SITE_KEY,
      'form_submit',
    );

    // Convert FormData to object
    const formDataObj = {};
    Array.from(formData.entries()).forEach(([key, value]) => {
      if (formDataObj[key]) {
        if (Array.isArray(formDataObj[key])) {
          formDataObj[key].push(value);
        } else {
          formDataObj[key] = [formDataObj[key], value];
        }
      } else {
        formDataObj[key] = value;
      }
    });

    const zipcode = formDataObj['ZIP Code'];
    const searchRadius = parseInt(formDataObj['Mileage Radius'], 10).toString();

    const filters = {};

    const filterElements = document.querySelectorAll('.filter-wrapper');
    filterElements.forEach((filterElement, index) => {
      const filterName = `indication${index}`;
      const checkboxes = filterElement.querySelectorAll(
        'input[type="checkbox"]:checked',
      );
      const radios = filterElement.querySelectorAll(
        'input[type="radio"]:checked',
      );
      const selects = filterElement.querySelectorAll('select');

      const values = [];

      checkboxes.forEach((checkbox) => {
        values.push(checkbox.value);
      });

      radios.forEach((radio) => {
        values.push(radio.value);
      });

      selects.forEach((select) => {
        if (select.value) {
          values.push(select.value);
        }
      });

      filters[filterName] = values.join(',');
    });

    for (let i = filterElements.length; i < 5; i += 1) {
      filters[`indication${i}`] = '';
    }

    const physicianLocatorRequest = {
      PhysicianLocatorRequest: {
        PhysicianLocatorRequestBody: {
          PhysicianAddress: {
            Zip: zipcode,
          },
          SearchRadius: searchRadius,
          TermsConditionsCheck: true,
          RecordsFrom: 1,
          RecordCount: '10',
          GeoCoordinates: {
            Latitude: '',
            Longitude: '',
          },
          Filters: filters,
          SearchUnBranded: 'No',
        },
      },
    };

    const requestPayload = {
      api: 'Apigee',
      apiVersion: 'V2',
      apiEnv: 'prod',
      apiAction: 'PhysicianLocator',
      brandName: 'fm-brandname-botoxplus',
      specialtyName: 'CNS - BOTOX',
      originName: 'originNameMobile',
      token: recaptchaToken,
      payload: JSON.stringify(physicianLocatorRequest),
    };

    let response;
    const endpoint = await getConfigValue('providerLookupApiProxyEndpoint');
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(requestPayload),
      });
    } catch (fetchError) {
      showError('Something went wrong. Please try again later.');
    }

    if (!response || !response.ok) {
      showError('Something went wrong. Please try again later.');
      return;
    }

    const data = await response.json();

    const providers = data.PhysicianLocatorResponse?.PhysicianLocatorResponseBody?.ContentResult
      ?.Party || [];
    const totalCount = parseInt(
      data.PhysicianLocatorResponse?.PhysicianLocatorResponseBody
        ?.ContentResult?.MatchCount,
      10,
    ) || 0;

    if (providers.length === 0) {
      const submitButton = document.querySelector(
        '.find-an-injector .submit-btn',
      );

      const errorMessage = submitButton?.getAttribute('data-error');
      throw new Error(errorMessage);
    }

    currentResults = providers;

    hideLoader();

    const resultsContainer = document.querySelector('.find-a-provider-results');
    const formContainer = document.querySelector('.eds-form form');

    if (resultsContainer && formContainer) {
      resultsContainer.style.display = 'block';

      const resultHeading = resultsContainer.querySelector('h3');
      if (resultHeading) {
        resultHeading.textContent = `Results Found (${totalCount})`;
      }

      updatePaginationHeader(totalCount);

      displayResults();

      if (showMap) {
        setTimeout(async () => {
          await initializeMap();
          if (currentResults.length > 0) {
            updateMapMarkers(currentResults, 0);
          }
        }, 100);
      }

      resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }
  } catch (error) {
    showError(error.message);
  }
}

function clearFieldError(field) {
  const existingError = field.parentNode.querySelector('.field-error');
  if (!existingError) return;
  existingError.style.display = 'none';
}

function displayFieldError(field) {
  const existingError = field.parentNode.querySelector('.field-error');
  if (!existingError) return;
  existingError.style.display = 'block';
}

/**
 * Initializes find-an-injector functionality
 * @param {boolean} enableMap - Whether to enable map functionality
 */
export function initializeFindAnInjector(form, showMap = true) {
  setTimeout(() => {
    const inputsWithMaxlength = document.querySelectorAll(
      'input[data-maxlength]',
    );
    inputsWithMaxlength.forEach((input) => {
      input.addEventListener('input', function enforceMaxLength() {
        const maxLength = parseInt(this.dataset.maxlength, 10);
        if (this.value.length > maxLength) {
          this.value = this.value.slice(0, maxLength);
        }
      });
    });

    if (form) {
      const inputs = form.querySelectorAll('input[required], select[required]');
      inputs.forEach((input) => {
        input.addEventListener('invalid', (e) => {
          e.preventDefault();
          displayFieldError(input);
        });

        input.addEventListener('input', () => {
          if (input.value && input.value.trim()) {
            clearFieldError(input);
            input.style.borderColor = '';
          }
        });

        input.addEventListener('blur', () => {
          if (!input.value || !input.value.trim()) {
            displayFieldError(input);
          } else {
            clearFieldError(input);
            input.style.borderColor = '';
          }
        });
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
      });

      const submitBtn = form.querySelector(
        'button[type="submit"], input[type="submit"], .submit-btn',
      );
      if (submitBtn) {
        submitBtn.addEventListener('click', (e) => {
          e.preventDefault();

          const requiredFields = form.querySelectorAll(
            'input[required], select[required]',
          );
          let isValid = true;

          requiredFields.forEach((field) => {
            if (
              !field.value
              || (field.type === 'checkbox' && !field?.checked)
            ) {
              isValid = false;
              displayFieldError(field);
            } else {
              clearFieldError(field);
            }
          });

          if (isValid) {
            const formData = new FormData(form);
            handleFormSubmission(formData, showMap);
          } else {
            // Scroll to first error
            const firstErrorField = form.querySelector(':invalid');
            if (firstErrorField) {
              firstErrorField.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              });
            }
          }
        });
      }
    }

    const mapToggle = document.querySelector('.fap-toggleMap');
    if (mapToggle && showMap) {
      mapToggle.addEventListener('click', () => {
        const mapContainer = document.querySelector('.fap-map-container');
        const listContainer = document.querySelector('.fap-list-container');
        const resultsContainer = document.querySelector('.results-container');

        if (mapContainer && listContainer && resultsContainer) {
          const isMapVisible = resultsContainer.classList.contains(
            'map-visible',
          );

          if (isMapVisible) {
            resultsContainer.classList.remove('map-visible');
          } else {
            resultsContainer.classList.add('map-visible');
            const map = getMap();
            if (!map) {
              setTimeout(async () => {
                await initializeMap(GOOGLE_MAPS_API_KEY);
                if (currentResults.length > 0) {
                  updateMapMarkers(currentResults, 0);
                }
              }, 100);
            }
          }
        }
      });
    }

    if (showMap) {
      loadGoogleMapsAPI(GOOGLE_MAPS_API_KEY);
    }

    loadRecaptcha(RECAPTCHA_SITE_KEY);
  }, 0);
}

export function createFilter(row, items, indicationIndex) {
  const {
    Label,
    Type,
    default_value: defaultValue,
    error_message: errorMessage,
    optionsColumn,
  } = row;
  const errorAttr = errorMessage ? `data-error="${errorMessage}"` : '';

  const filteredItems = [];
  if (optionsColumn) {
    const indicationName = optionsColumn
      .replace('options[', '')
      .replace(']', '');
    const startIndex = items.findIndex(
      (i) => i['Indication Name'] === indicationName,
    );
    if (startIndex !== -1) {
      filteredItems.push(items[startIndex]);
      for (let i = startIndex + 1; i < items.length; i += 1) {
        const item = items[i];
        if (
          item['Indication Name'].trim() !== ''
          && item['Indication Name'] !== indicationName
        ) {
          break;
        }
        filteredItems.push(item);
      }
    }
  }

  if (Type?.toLowerCase() === 'dropdown') {
    const options = filteredItems
      .map(
        (opt) => `<option value="${opt['Data Value']}" ${
          defaultValue === opt['Data Value'] ? 'selected' : ''
        }>${opt['Display Value']}</option>`,
      )
      .join('');
    return `
      <div class="filter-wrapper">
        <label>${Label}</label>
        <select name="${Label}" ${errorAttr}>
          <option value="">Select an option</option>
          ${options}
        </select>
      </div>`;
  }

  const inputType = Type?.toLowerCase() === 'radio' ? 'radio' : 'checkbox';
  const groupClass = `${inputType}-group`;

  // For radio groups, add a default "None" option to allow deselection
  const defaultOption = inputType === 'radio'
    ? `
      <div class="${inputType}-item">
        <input type="${inputType}" name="${Label}" value="" id="${Label}-none" ${
  !defaultValue ? 'checked' : ''
}>
        <label for="${Label}-none">None</label>
      </div>`
    : '';

  const optionItems = filteredItems
    .map((opt) => {
      const id = `${opt['Display Value']}-${opt['Data Value']}`
        .replace(/\s+/g, '-')
        .toLowerCase();
      return `
      <div class="${inputType}-item">
        <input type="${inputType}" name="${Label}" value="${opt['Data Value']}" id="${id}">
        <label for="${id}">${opt['Display Value']}</label>
      </div>`;
    })
    .join('');

  return `
    <fieldset class="filter-wrapper indication-${indicationIndex} ${groupClass}" ${errorAttr}>
      <legend>${Label}</legend>
      ${defaultOption}
      ${optionItems}
    </fieldset>`;
}

export function processTextWithLinksAndNewlines(text) {
  if (!text) return '';

  let processedText = text.replace(/\\n/g, '<br>');
  processedText = processedText.replace(
    /\[([^|]+)\|\s*([^\]]+)\]/g,
    (match, linkText, url) => {
      const trimmedUrl = url.trim();
      const isRelative = trimmedUrl.startsWith('/');

      if (isRelative) {
        return `<a href="${trimmedUrl}">${linkText}</a>`;
      }
      return `<a href="${trimmedUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
    },
  );

  return processedText;
}

/**
 * Helper function to load spreadsheet data
 * @param {string} path - Path to spreadsheet
 * @returns {Promise<Response>} Response object
 */
export async function loadSpreadsheet(path) {
  const { isUniversalEditor } = await import('../../scripts/utils.js');

  const iseditor = isUniversalEditor();
  let location;
  location = window.location.origin;
  if (iseditor) {
    const rootPath = (await getConfigValue('rootPath')) || '';
    location = `${location}/${rootPath.slice(0, -1)}.resource/${path
      .replace(`${location}/${rootPath}`, '')
      .replace('.hlx', '')}`;
  } else {
    location = `${path}.json`;
  }
  const resp = await fetch(`${location}`);
  return resp;
}

/**
 * Form Type Handler - Manages different form implementations
 * Centralizes form-type specific logic to avoid scattered conditions
 */
export class FormTypeHandler {
  constructor(block) {
    this.block = block;
    this.isFindAnInjector = block.classList.contains('find-an-injector');
    this.showMap = true;
    this.filterOptions = null;
  }

  /**
   * Initializes form-type specific configuration
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isFindAnInjector) {
      await this.initializeFindAnInjector();
    }
  }

  /**
   * Initializes find-an-injector specific configuration
   * @returns {Promise<void>}
   */
  async initializeFindAnInjector() {
    // Configure showMap from third child element
    const thirdChild = this.block.children?.[2];
    this.showMap = thirdChild
      ? thirdChild.textContent.trim().toLowerCase() !== 'false'
      : true;

    // Load filter options from second link
    const optionsLink = this.block.querySelectorAll('a[href]')?.[1];
    if (optionsLink) {
      const resp = await loadSpreadsheet(optionsLink.href);
      const data = await resp.json();
      this.filterOptions = data.data;

      // Update global filterOptions for backward compatibility
      if (typeof window !== 'undefined') {
        window.filterOptions = this.filterOptions;
      }
    }
  }

  /**
   * Creates form-type specific fields
   * @param {Object} field - Field configuration
   * @returns {Promise<HTMLElement|null>} Field element or null
   */
  async createSpecialField(field) {
    if (this.isFindAnInjector) {
      return this.createFindAnInjectorField(field);
    }

    return null; // No special handling needed
  }

  /**
   * Creates find-an-injector specific fields
   * @param {Object} field - Field configuration
   * @returns {Promise<HTMLElement|null>} Field element or null
   */
  async createFindAnInjectorField(field) {
    const {
      category, type, label, help, field: fieldName,
    } = field;
    const { toCamelCase } = await import('../../scripts/aem.js');

    /**
     * Generates a camelCase ID from a name and optional option
     */
    const generateId = (name, option = null) => {
      const id = toCamelCase(name);
      return option ? `${id}-${toCamelCase(option)}` : id;
    };

    /**
     * Creates a help text paragraph with a unique ID
     */
    const writeHelpText = (text, inputId) => {
      const helpText = document.createElement('p');
      helpText.className = 'field-help-text';
      helpText.textContent = text;
      helpText.id = `${inputId}-help`;
      return helpText;
    };

    // Handle filter dropdown
    if (category === 'Filters') {
      try {
        const row = {
          Label: label,
          Type: type,
          errorMessage: field['error-message'] || field.errorMessage,
          optionsColumn: field.options_column,
        };

        const filterHTML = createFilter(row, this.filterOptions, 0);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = filterHTML;
        const filterField = tempDiv.firstElementChild;

        if (help) {
          const helpText = writeHelpText(help, generateId(fieldName));
          filterField.append(helpText);
        }
        return filterField;
      } catch (error) {
        console.warn('Find-an-injector createFilter not available:', error);
        // Return null to let the main form builder handle this as a regular select
        return null;
      }
    }

    return null; // Field not handled by this form type
  }

  /**
   * Finalizes form after creation for form-type specific setup
   * @param {HTMLFormElement} form - The created form
   * @returns {Promise<void>}
   */
  async finalizeForm(form) {
    if (this.isFindAnInjector) {
      await this.finalizeFindAnInjectorForm(form);
    }
  }

  /**
   * Finalizes find-an-injector form with results container
   * @param {HTMLFormElement} form - The created form
   * @returns {Promise<void>}
   */
  async finalizeFindAnInjectorForm(form) {
    const containerHTML = `
    <div class="loading-overlay" style="display: none;">
      <div class="loading">
        <div class="abbv-animation-loading"></div>
        <div class="fap-main-error" style="display: none;">
          <span></span>
          <button class="abbv-button-plain abbv-icon-close i-a"></button>
        </div>
      </div>
    </div>
    ${createResultsHTML(this.showMap)}`;

    this.block.innerHTML = containerHTML;
    const resultsContainer = this.block.querySelector('.find-a-provider-results');
    this.block.insertBefore(form, resultsContainer);

    initializeFindAnInjector(form, this.showMap);
  }
}
