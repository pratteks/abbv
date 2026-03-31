import { getConfigValue } from '../../scripts/config.js';

/**
 * Stock Ticker Block
 * Fetches stock data every 5 minutes and updates UI with price, change, and icons.
 */

// Render price in split format $225 + .09
function renderSplitPrice(price, priceEl) {
  if (!priceEl) return;

  const [integer, fraction] = price.toFixed(2).split('.');

  priceEl.innerHTML = `
      <span class="price">$${integer}</span>
      <span class="fraction">.${fraction}</span>
  `;
}

export default async function decorate(block) {
  const stockTickerUrl = await getConfigValue('stockTickerUrl');

  // ---------------------------------------------------------
  // SAFE TEMPLATE RENDER
  // ---------------------------------------------------------
  block.innerHTML = `
    <div class="stock-wrapper">
      <div class="stock-header">
        <span class="symbol"></span>
        <span class="timestamp"></span>
      </div>

      <div class="trade-container"></div>

      <div class="change">
        <span class="icon"></span>
        <span class="value"></span>
      </div>

      <div class="source">SOURCE: NYSE</div>
    </div>
  `;

  // Cache DOM references (fast + clean)
  const symbolEl = block.querySelector('.symbol');
  const timestampEl = block.querySelector('.timestamp');
  const priceEl = block.querySelector('.trade-container');
  const changeEl = block.querySelector('.change');
  const iconEl = block.querySelector('.change .icon');
  const valueEl = block.querySelector('.change .value');

  // If something failed to render, bail out safely
  if (!symbolEl || !timestampEl || !priceEl || !changeEl || !iconEl || !valueEl) {
    console.warn('Stock Ticker: Missing required DOM elements.');
    return;
  }

  /**
   * Formats timestamp with EST timezone
   */
  function formatTimestamp(ts) {
    if (!ts) return '';
    const date = new Date(ts);

    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York',
    }).replace(',', '');
  }

  /**
   * Fetch stock data from API and safely update UI
   */
  async function fetchStock() {
    try {
      const res = await fetch(stockTickerUrl, { cache: 'no-store' });

      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status}`);
      }

      const data = await res.json();

      // Validate required API fields
      const price = Number(data?.price);
      const prev = Number(data?.previousClose);

      if (Number.isNaN(price) || Number.isNaN(prev)) {
        throw new Error('Invalid API data structure');
      }

      const diff = price - prev;
      const percent = prev ? (diff / prev) * 100 : 0;

      // ---------------------------------------------------------
      // UPDATE UI — WITH Fallbacks
      // ---------------------------------------------------------
      symbolEl.textContent = data?.symbol ?? '--';
      timestampEl.textContent = `${formatTimestamp(data?.timestamp)} EST`;
      renderSplitPrice(price, priceEl);

      // Clear previous icon/color classes
      changeEl.classList.remove('green', 'red');
      iconEl.className = 'icon';

      // ---------------------------------------------------------
      // CHANGE LOGIC
      // ---------------------------------------------------------
      if (diff < 0) {
        changeEl.classList.add('red');
        iconEl.classList.add('down-icon');
        valueEl.textContent = `${diff.toFixed(2)} (${percent.toFixed(2)}%)`;
      } else if (diff > 0) {
        changeEl.classList.add('green');
        iconEl.classList.add('up-icon');
        valueEl.textContent = `+${diff.toFixed(2)} (${percent.toFixed(2)}%)`;
      } else {
        changeEl.classList.add('green');
        iconEl.classList.add('up-icon');
        valueEl.textContent = '0.00 (0.00%)';
      }
    } catch (error) {
      console.error('Stock Ticker Error:', error);
      block.innerHTML = '<p>Error fetching stock data</p>';
    }
  }

  // Initial fetch
  await fetchStock();

  // Poll every 5 minutes
  setInterval(fetchStock, 5 * 60 * 1000);
}
