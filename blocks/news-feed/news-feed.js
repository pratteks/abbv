import { applyCommonProps } from '../../scripts/utils.js';

function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateString;
  }
}

async function fetchFeed(feedUrl) {
  try {
    const response = await fetch(feedUrl);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    const data = await response.text();
    return data;
  } catch (error) {
    if (error instanceof TypeError) {
    // eslint-disable-next-line no-console
      console.error('Network error - check CORS and URL validity:', error.message);
    } else {
    // eslint-disable-next-line no-console
      console.error('Failed to fetch news feed:', error.message);
    }
    return null;
  }
}

function decorateFeed(block, responseXml) {
  const MAX_ITEMS = 3;
  const parser = new DOMParser();
  const doc = parser.parseFromString(responseXml, 'application/xml');

  if (doc.querySelector('parsererror')) {
  // eslint-disable-next-line no-console
    console.error('Failed to parse RSS feed XML.');
    return;
  }

  const getText = (item, selector) => item.querySelector(selector)?.textContent?.trim() || '';
  const items = [...doc.querySelectorAll('item')]
    .map((item) => ({
      link: getText(item, 'link'),
      pubDate: getText(item, 'pubDate'),
      title: getText(item, 'title'),
    }))
    .filter((item) => item.link && item.title)
    .slice(0, MAX_ITEMS);

  if (!items.length) return;

  // Create wrapper structure
  const newsfeed = document.createElement('div');
  newsfeed.className = 'newsfeed';

  const content = document.createElement('div');
  content.className = 'newsfeed-content';

  // Create first news item
  if (items[0]) {
    const newsFeedLeft = document.createElement('div');
    newsFeedLeft.className = 'news-feed';

    const link = document.createElement('a');
    link.className = 'newsfeed-link';
    link.href = items[0].link;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('data-warn-on-departure', 'false');

    const eyebrow = document.createElement('span');
    eyebrow.className = 'newsfeed-rss-eyebrow';
    eyebrow.textContent = formatDate(items[0].pubDate);

    const title = document.createElement('p');
    title.className = 'newsfeed-rss-title';
    title.textContent = items[0].title;

    link.appendChild(eyebrow);
    link.appendChild(title);
    newsFeedLeft.appendChild(link);
    content.appendChild(newsFeedLeft);
  }

  // Create right container for remaining items
  if (items.length > 1) {
    const newsFeedRight = document.createElement('div');
    newsFeedRight.className = 'news-feed-right';

    items.slice(1).forEach((item) => {
      const newsFeedItem = document.createElement('div');
      newsFeedItem.className = 'news-feed';

      const link = document.createElement('a');
      link.className = 'newsfeed__link';
      link.href = item.link;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('data-warn-on-departure', 'false');

      const eyebrow = document.createElement('span');
      eyebrow.className = 'newsfeed-rss-eyebrow';
      eyebrow.textContent = formatDate(item.pubDate);

      const title = document.createElement('p');
      title.className = 'newsfeed-rss-title';
      title.textContent = item.title;

      link.appendChild(eyebrow);
      link.appendChild(title);
      newsFeedItem.appendChild(link);
      newsFeedRight.appendChild(newsFeedItem);
    });

    content.appendChild(newsFeedRight);
  }

  newsfeed.appendChild(content);
  block.replaceChildren(newsfeed);
}

export default async function decorate(block) {
  applyCommonProps(block);
  const feedUrl = block.children[0]?.textContent.trim();
  if (feedUrl) {
    const feedList = await fetchFeed(feedUrl);
    if (feedList) {
      decorateFeed(block, feedList);
    }
  }
}
