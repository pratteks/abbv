/* eslint-disable no-console */
import { isUniversalEditor } from './utils.js';

const CONFIG_KEY = 'config';
const CONFIG_FILE_NAME = 'ab-config.json';

/*
 * Returns the true origin of the current page in the browser.
 * If the page is running in a iframe with srcdoc, the ancestor origin is returned.
 * @returns {String} The true origin
 */
function getOrigin() {
  const { location } = window;
  return location.href === 'about:srcdoc' ? window.parent.location.origin : location.origin;
}

function buildConfigURL() {
  const origin = getOrigin();

  if (isUniversalEditor()) {
    // In Universal Editor, we need to use the current path + .resource/ + the config file
    let currentPath = window.location.pathname;
    // Strip .html extension if present
    if (currentPath.endsWith('.html')) {
      currentPath = currentPath.substring(0, currentPath.length - 5);
    }
    return new URL(`${origin}${currentPath}.resource/${CONFIG_FILE_NAME}`);
  }

  // Default behavior for non-Universal Editor environments
  return new URL(`${origin}/${CONFIG_FILE_NAME}`);
}

const getStoredConfig = () => sessionStorage.getItem(CONFIG_KEY);

const storeConfig = (configJSON) => sessionStorage.setItem(CONFIG_KEY, configJSON);

const getConfig = async () => {
  let configJSON = getStoredConfig();

  if (!configJSON) {
    const fetchGlobalConfig = fetch(buildConfigURL());
    try {
      const response = await fetchGlobalConfig;

      // Extract JSON data from responses
      configJSON = await response.text();
      storeConfig(configJSON);
    } catch (e) {
      console.error('no config loaded', e);
    }
  }

  // merge config and locale config
  const config = JSON.parse(configJSON);

  return config;
};

/**
 * This function retrieves a configuration value for a given environment.
 *
 * @param {string} configParam - The configuration parameter to retrieve.
 * @returns {Promise<string|undefined>} - The value of the configuration parameter, or undefined.
 */
export const getConfigValue = async (configParam) => {
  if (!window.configsPromise) {
    window.configsPromise = getConfig();
  }

  try {
    const configJSON = await window.configsPromise;
    const configElements = configJSON?.data || [];
    const configEntry = configElements.find(
      (c) => c.key === configParam || c.Key === configParam,
    );
    return configEntry?.value ?? configEntry?.Value;
  } catch (e) {
    console.error('Error fetching config value:', e);
    return null;
  }
};

export default getConfigValue;
