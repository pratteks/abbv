import indexUtils from '../../scripts/index-utils.js';
import { createOptimizedPicture } from '../../scripts/aem.js';
import { getConfigValue } from '../../scripts/config.js';

export default async function decorate(block) {
  const children = [...block.children];

  const contentDiv = children?.[3] ?? document.createElement('div');

  const configDivs = children.slice(0, 3);

  let pagePath = null;

  const rootPath = await getConfigValue('rootPath');
  configDivs.forEach((div) => {
    const text = div.textContent.trim();
    const link = div.querySelector('a');

    if (link) {
      pagePath = link.getAttribute('href');
      // strip rootPath and .html extension in author
      pagePath = pagePath.replace(rootPath, '').replace('.html', '');
      if (pagePath === '/index') pagePath = '/';
    } else if (text) {
      block.classList.add(text);
    }
  });

  // Create story card structure with click event
  const cardWrapper = document.createElement('div');
  cardWrapper.className = 'story-card-wrapper';
  cardWrapper.setAttribute('role', 'button');
  cardWrapper.setAttribute('tabindex', '0');

  // Add click event
  const handleClick = () => {
    if (pagePath) {
      window.location.href = pagePath;
    }
  };

  cardWrapper.addEventListener('click', handleClick);
  cardWrapper.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  });

  const card = document.createElement('div');
  card.className = 'story-card-content';
  contentDiv.className = 'story-card-body';

  // Fetch page metadata for image only
  let pageImage;
  let pageImageAlt;

  if (pagePath) {
    try {
      const metadata = await indexUtils.getPageProperties(pagePath);
      if (metadata?.pageImage) {
        pageImage = metadata.pageImage;
        pageImageAlt = metadata.pageImageAlt || '';
      }
    } catch {
      // Ignore metadata lookup failures and render without a fetched image.
    }
  }

  const imageContainer = document.createElement('div');
  imageContainer.className = 'story-card-image';
  const optimizedPicture = createOptimizedPicture(
    pageImage,
    pageImageAlt,
    false,
    [
      { media: '(min-width: 1024px)', width: '2000' },
      { media: '(min-width: 744px)', width: '1024' },
      { width: '750' },
    ],
  );

  imageContainer.appendChild(optimizedPicture);
  card.appendChild(imageContainer);

  block.innerHTML = '';

  if (contentDiv) {
    const rte = contentDiv?.querySelector('div[data-aue-prop="text"]');
    if (rte) {
      if (rte?.children[0]) {
        rte.children[0].classList.add('story-card-eyebrow');
      }
      if (rte?.children[1]) {
        rte.children[1].classList.add('story-card-title');
      }
      if (rte?.children[2]) {
        rte.children[2].classList.add('story-card-description');
      }
      if (rte?.children[3]) {
        rte.children[3].classList.add('story-card-cta');
      }
      card.appendChild(contentDiv);
      block.appendChild(card);
      return;
    }

    const textContent = contentDiv?.children?.[0];
    const eyebrow = textContent?.children?.[0];
    const title = textContent?.children?.[1];
    const description = textContent?.children?.[2];
    const ctaText = textContent?.children?.[3];

    contentDiv.innerHTML = '';

    const textWrapper = document.createElement('div');
    textWrapper.className = 'story-card-text';

    if (eyebrow) {
      eyebrow.classList.add('story-card-eyebrow');
      textWrapper.appendChild(eyebrow);
    }

    if (title) {
      title.classList.add('story-card-title');
      textWrapper.appendChild(title);
    }

    if (description) {
      description.classList.add('story-card-description');
      textWrapper.appendChild(description);
    }

    contentDiv.appendChild(textWrapper);

    if (ctaText) {
      ctaText.classList.add('story-card-cta');
      contentDiv.appendChild(ctaText);
    }
  }
  card.appendChild(contentDiv);
  cardWrapper.appendChild(card);
  block.appendChild(cardWrapper);
}
