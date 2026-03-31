import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function isImageUrl(url) {
  return url && (url.includes('scene7.com') || /\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i.test(url));
}

function buildPicture(src, alt = '') {
  const picture = document.createElement('picture');
  const sourceWebp = document.createElement('source');
  sourceWebp.srcset = src;
  sourceWebp.type = 'image/webp';
  const sourcePng = document.createElement('source');
  sourcePng.srcset = src;
  sourcePng.type = 'image/png';
  const img = document.createElement('img');
  img.className = 'card-image';
  img.src = src;
  img.alt = alt;
  img.loading = 'lazy';
  picture.append(sourceWebp, sourcePng, img);
  return picture;
}

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);

    // restore image from link if AEM converted picture to text link
    const firstDiv = li.children[0];
    if (firstDiv && !firstDiv.querySelector('picture')) {
      const link = firstDiv.querySelector('a');
      if (link && isImageUrl(link.href)) {
        const picture = buildPicture(link.href, link.textContent || '');
        const p = document.createElement('p');
        p.append(picture);
        firstDiv.replaceChildren(p);
      }
    }

    [...li.children].forEach((div) => {
      if (div.querySelector('picture')) div.className = 'cards-leader-card-image';
      else div.className = 'cards-leader-card-body';
    });

    const bodyDiv = li.querySelector('.cards-leader-card-body');
    const cardLink = bodyDiv?.querySelector('a[href]');
    if (cardLink) {
      const href = cardLink.getAttribute('href');
      const ctaText = cardLink.textContent.trim();
      const ctaReplacement = document.createElement('span');
      ctaReplacement.className = cardLink.className || 'button';
      ctaReplacement.textContent = ctaText;
      cardLink.replaceWith(ctaReplacement);

      const wrapper = document.createElement('a');
      wrapper.href = href;
      wrapper.className = 'cards-leader-card-link';
      while (li.firstChild) wrapper.append(li.firstChild);
      li.append(wrapper);
    }

    ul.append(li);
  });

  ul.querySelectorAll('picture').forEach((pic) => {
    const img = pic.querySelector('img');
    const source = pic.querySelector('source');
    const src = img?.src || source?.srcset || '';
    if (!src) return;
    // preserve external images (Scene7 etc.) as-is
    if (src.startsWith('http') && !src.includes('/media_')) {
      if (!img?.src && source?.srcset) {
        img?.setAttribute('src', source.srcset);
      }
      img?.classList.add('card-image');
      img?.setAttribute('loading', 'lazy');
      return;
    }
    const optimizedPic = createOptimizedPicture(src, img?.alt || '', false, [{ width: '750' }]);
    if (img) moveInstrumentation(img, optimizedPic.querySelector('img'));
    pic.replaceWith(optimizedPic);
  });

  block.textContent = '';
  block.append(ul);
}
