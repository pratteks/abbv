import { getConfigValue } from './config.js';

/**
 * Fetches dashboard card data from Content Fragment GraphQL endpoint
 * and returns the raw API response
 *
 * @param {string} path - The content path
 *                        (e.g., "/content/dam/abbvie-dev/dashboard-cards/belonging-&-inclusion")
 * @returns {Promise<Object>} - The raw dashboard card data from the API
 */
export const fetchDashboardCardData = async (path) => {
  try {
    // Get the base URL from configuration
    const cfBaseUrl = await getConfigValue('cfBaseUrl');
    if (!cfBaseUrl) {
      throw new Error('Content Fragment base URL not found in configuration');
    }
    const url = `${cfBaseUrl}${path}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard card data: ${response.status} ${response.statusText}`);
    }

    const cfData = await response.json();

    return cfData;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching dashboard card data:', error);
    throw error;
  }
};

export default fetchDashboardCardData;
