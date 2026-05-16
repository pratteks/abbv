import { getConfigValue } from '../../scripts/config.js';
import { fetchPlaceholders } from '../../scripts/placeholders.js';

const TIMEZONE = 'America/New_York';

function formatTimestamp(ts, tz) {
  if (!ts) return '';

  const offsetPart = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'longOffset',
  })
    .formatToParts(new Date())
    .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-05:00';
  const offsetSuffix = offsetPart.replace('GMT', '') || '-05:00';

  const normalised = ts.includes('T') && !ts.includes('+') && !ts.endsWith('Z')
    ? `${ts}${offsetSuffix}`
    : ts;

  const date = new Date(normalised);
  if (Number.isNaN(date.getTime())) return '';

  const tzAbbr = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName')?.value ?? '';

  return `${date
    .toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: tz,
    })
    .replace(',', '')
    .toUpperCase()} ${tzAbbr}`;
}

function renderSplitPrice(price, containerEl, ariaLabel) {
  const [integer, fraction] = price.toFixed(2).split('.');
  containerEl.setAttribute('aria-label', ariaLabel);
  containerEl.innerHTML = `<span class="last-trade-decimal" aria-hidden="true">$${integer}</span>`
    + `<span class="last-trade-fraction" aria-hidden="true">.${fraction}</span>`;
}

export default async function decorate(block) {
  const rows = [...block.children].map(
    (row) => row.querySelector('div')?.textContent?.trim() || '',
  );

  const [
    blockId = '',
    sourceLabelRaw = '',
    analyticsInteractionId = '',
    langRaw = '',
  ] = rows;

  const sourceLabel = sourceLabelRaw || 'SOURCE';
  const lang = langRaw.startsWith('lang:') ? langRaw.slice(5).trim() : langRaw;

  if (blockId) block.id = blockId;
  if (lang) block.setAttribute('lang', lang);

  const [stockTickerUrl, stockTickerSiteKey, placeholders] = await Promise.all([
    getConfigValue('stock-ticker-url'),
    getConfigValue('stock-ticker-site-key'),
    fetchPlaceholders(),
  ]);

  const i18n = {
    unavailable: placeholders?.stockTickerDataUnavailable || 'Data Unavailable',
    ariaPrice: placeholders?.stockTickerAriaPrice || 'Current stock price',
    ariaUp: placeholders?.stockTickerAriaUp || 'Up',
    ariaDown: placeholders?.stockTickerAriaDown || 'Down',
    ariaNeutral: placeholders?.stockTickerAriaNeutral || 'Unchanged',
  };

  block.innerHTML = `
    <div class="content-container">
      <div class="data-container">
        <span class="symbol"></span>
        <span class="date"></span>
      </div>
      <div class="trade-container"></div>
      <div class="change-container"></div>
      <div class="source"></div>
    </div>
  `;

  const contentEl = block.querySelector('.content-container');
  const symbolEl = block.querySelector('.symbol');
  const dateEl = block.querySelector('.date');
  const priceEl = block.querySelector('.trade-container');
  const changeEl = block.querySelector('.change-container');
  const sourceEl = block.querySelector('.source');

  function trackAnalytics(eventName, detail = {}) {
    if (!analyticsInteractionId) return;
    try {
      window.adobeDataLayer?.push({
        event: eventName,
        interactionId: analyticsInteractionId,
        ...detail,
      });
    } catch {
      // Analytics failures must never break the block.
    }
  }

  function renderError() {
    contentEl.innerHTML = `<p class="stock-error" role="alert">${i18n.unavailable}</p>`;
  }

  function renderChange(diff, percent) {
    if (diff < 0) {
      const absDiff = Math.abs(diff).toFixed(2);
      const absPct = Math.abs(percent).toFixed(2);
      changeEl.className = 'change-container decimal-red';
      changeEl.setAttribute(
        'aria-label',
        `${i18n.ariaDown} ${absDiff} (${absPct}%)`,
      );
      changeEl.innerHTML = `<span class="down-icon" aria-hidden="true"></span>-${absDiff} (${absPct}%)`;
      return;
    }

    if (diff > 0) {
      const fixedDiff = diff.toFixed(2);
      const fixedPct = percent.toFixed(2);
      changeEl.className = 'change-container decimal-green';
      changeEl.setAttribute(
        'aria-label',
        `${i18n.ariaUp} +${fixedDiff} (+${fixedPct}%)`,
      );
      changeEl.innerHTML = `<span class="up-icon" aria-hidden="true"></span>+${fixedDiff} (+${fixedPct}%)`;
      return;
    }

    changeEl.className = 'change-container decimal-zero';
    changeEl.setAttribute('aria-label', i18n.ariaNeutral);
    changeEl.textContent = '0.00 (0.00%)';
  }

  function renderQuote(quote) {
    const price = Number(quote.lastTradePrice);
    const diff = Number(quote.changeAbsolute);
    const percent = Number(quote.changePercent);

    if (
      !Number.isFinite(price)
      || price <= 0
      || !Number.isFinite(diff)
      || !Number.isFinite(percent)
    ) {
      throw new Error('[StockTicker] Invalid numeric fields in API response.');
    }

    symbolEl.textContent = quote.symbol ?? '--';
    dateEl.textContent = formatTimestamp(quote.date, TIMEZONE);
    renderSplitPrice(price, priceEl, `${i18n.ariaPrice}: $${price.toFixed(2)}`);
    sourceEl.textContent = `${sourceLabel}: ${quote.source ?? 'NYSE'}`;

    renderChange(diff, percent);

    trackAnalytics('stockTickerView', {
      symbol: quote.symbol,
      price,
      change: diff.toFixed(2),
    });
  }

  try {
    if (!stockTickerUrl) throw new Error('[StockTicker] Missing stock-ticker-url config.');

    let fetchUrl = stockTickerUrl;
    if (stockTickerSiteKey) {
      const workerUrl = new URL(stockTickerUrl, window.location.href);
      workerUrl.searchParams.set('siteKey', stockTickerSiteKey);
      fetchUrl = workerUrl.toString();
    }

    const res = await fetch(fetchUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error(`[StockTicker] HTTP ${res.status}`);

    const json = await res.json();
    if (json?.success === false) {
      throw new Error('[StockTicker] API reported failure.');
    }

    const quote = json?.data;
    if (!quote || typeof quote !== 'object') {
      throw new Error('[StockTicker] No quote found in API response.');
    }

    renderQuote(quote);
  } catch {
    renderError();
  }
}
