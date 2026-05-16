import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation, resolveImageReference } from '../../scripts/scripts.js';
import { fetchPlaceholders } from '../../scripts/placeholders.js';
import {
  shouldRunOutsideAuthorEdit,
  applyCommonProps,
  fetchRssFeed,
  parseRssFeed,
} from '../../scripts/utils.js';

const CAROUSEL_ITEM_FIELDS = new Set([
  'media_image',
  'media_imageAlt',
  'content_caption',
  'content_link',
]);

// Row index map — mirrors field order in _carousel.json (tabs are UI-only, not rows)
// Row  0: totalSlides             (number of sibling blocks to pull in as slides)
// Row  1: carouselType
// Row  2: rssFeedUrl              (dynamic — see fetchRssFeed / createSlidesFromRssFeed)
// Row  3: numberOfItems           (dynamic — caps RSS slide count; 0 = no limit)
// Row  4: autoplay
// Row  5: slideTransitionTime     (autoplay interval in ms)
// Row  6: pauseOnHover            (autoplay)
// Row  7: numberOfSlidesToShow
// Row  8: bypassCarouselOnMobile
// Row  9: startingSlideIndex
// Row 10: centerActiveSlide
// Row 11: enableLooping
// Row 12: enableNextPreviousControls
// Row 13: enableDotNavigation
// Row 14: carouselLabel
// Row 15: previousButtonLabel
// Row 16: nextButtonLabel
// Row 17: playButtonLabel         (autoplay)
// Row 18: pauseButtonLabel        (autoplay)
// Row 19: tablistLabel
// Row 20: itemLabel
// Row 21: classes_carouselVariant (CSS class — no JS handling)
// Row 22: blockId                 (handled by applyCommonProps)
// Row 23: classes_commonCustomClass (handled by applyCommonProps)
// Row 24: language
const ROW = {
  TOTAL_SLIDES: 0,
  CAROUSEL_TYPE: 1,
  RSS_FEED_URL: 2,
  NUMBER_OF_ITEMS: 3,
  AUTOPLAY: 4,
  SLIDE_TRANSITION_TIME: 5,
  PAUSE_ON_HOVER: 6,
  NUMBER_OF_SLIDES_TO_SHOW: 7,
  BYPASS_ON_MOBILE: 8,
  STARTING_SLIDE_INDEX: 9,
  CENTER_ACTIVE_SLIDE: 10,
  ENABLE_LOOPING: 11,
  ENABLE_NEXT_PREV_CONTROLS: 12,
  ENABLE_DOT_NAVIGATION: 13,
  CAROUSEL_LABEL: 14,
  PREV_BUTTON_LABEL: 15,
  NEXT_BUTTON_LABEL: 16,
  PLAY_BUTTON_LABEL: 17,
  PAUSE_BUTTON_LABEL: 18,
  TABLIST_LABEL: 19,
  ITEM_LABEL: 20,
  LANGUAGE: 24,
};

function createSlidesFromRssFeed(responseXml, numberOfItems) {
  const items = parseRssFeed(responseXml, numberOfItems);

  return items.map((item) => {
    const slideSource = document.createElement('div');

    if (item.enclosureUrl && item.enclosureType?.startsWith('image/')) {
      const imageCol = document.createElement('div');
      const img = document.createElement('img');
      img.src = item.enclosureUrl;
      img.alt = item.title;
      imageCol.append(img);
      slideSource.append(imageCol);
    }

    const contentCol = document.createElement('div');
    const link = document.createElement('a');
    link.href = item.link;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('data-warn-on-departure', 'false');

    if (item.pubDate) {
      const dateSpan = document.createElement('span');
      dateSpan.className = 'rsscarousel-slide-date';
      try {
        const d = new Date(item.pubDate);
        dateSpan.textContent = Number.isNaN(d.getTime())
          ? item.pubDate
          : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      } catch {
        dateSpan.textContent = item.pubDate;
      }
      link.append(dateSpan);
    }

    const title = document.createElement('p');
    title.classList.add('rsscarousel-slide-title');
    title.textContent = item.title;
    link.append(title);
    contentCol.append(link);
    slideSource.append(contentCol);

    return slideSource;
  });
}

function getCellText(row) {
  return row?.firstElementChild?.textContent?.trim() || '';
}

function getCellBoolean(row, fallback = false) {
  const val = getCellText(row).toLowerCase();
  if (!val) return fallback;
  if (['true', '1', 'yes', 'on'].includes(val)) return true;
  if (['false', '0', 'no', 'off'].includes(val)) return false;
  return fallback;
}

function updateVerticalNextButtonTitle(block) {
  if (!block.classList.contains('carousel-vertical')) return;
  const nextBtn = block.querySelector('.slide-next');
  if (!nextBtn) return;
  const realSlides = block.querySelectorAll('.carousel-slide:not([data-clone])');
  const count = realSlides.length;
  const activeIndex = parseInt(block.dataset.activeSlide, 10) || 0;
  const nextIndex = (activeIndex + 1) % count;
  const heading = realSlides[nextIndex]?.querySelector('h1, h2, h3, h4, h5, h6');
  const titleText = heading?.textContent?.trim() || '';
  let titleSpan = nextBtn.querySelector('.slide-next-title');
  if (!titleSpan) {
    titleSpan = document.createElement('span');
    titleSpan.className = 'slide-next-title';
    nextBtn.prepend(titleSpan);
  }
  titleSpan.textContent = titleText;
}

function updateActiveSlide(slide) {
  const block = slide.closest('.carousel');
  const slideIndex = parseInt(slide.dataset.slideIndex, 10);
  block.dataset.activeSlide = slideIndex;

  const slides = block.querySelectorAll('.carousel-slide:not([data-clone])');
  slides.forEach((aSlide, idx) => {
    aSlide.setAttribute('aria-hidden', idx !== slideIndex);
    aSlide.querySelectorAll('a').forEach((link) => {
      if (idx !== slideIndex) {
        link.setAttribute('tabindex', '-1');
      } else {
        link.removeAttribute('tabindex');
      }
    });
  });

  const indicators = block.querySelectorAll('.carousel-slide-indicator');
  indicators.forEach((indicator, idx) => {
    indicator.classList.toggle('is-active', idx === slideIndex);
    indicator.querySelector('button')?.classList.toggle('is-active', idx === slideIndex);
    if (idx !== slideIndex) {
      indicator.querySelector('button').removeAttribute('disabled');
    } else {
      indicator.querySelector('button').setAttribute('disabled', 'true');
    }
  });

  updateVerticalNextButtonTitle(block);
}

function getFieldElement(source, name) {
  return source.querySelector(`[data-aue-prop="${name}"]`) || null;
}

function shouldCenterActiveSlide(block) {
  const val = block.dataset.centerActiveSlide;
  if (val !== undefined) return val === 'true';
  return block.classList.contains('carousel-default');
}

export function showSlide(block, slideIndex = 0, behavior = 'smooth') {
  const realSlides = block.querySelectorAll('.carousel-slide:not([data-clone])');
  const count = realSlides.length;
  if (!count) return;

  const isLooping = block.dataset.looping === 'true';
  const allSlides = block.querySelectorAll('.carousel-slide');
  const slidesWrapper = block.querySelector('.carousel-slides');

  let domIndex;
  let logicalIndex;

  if (isLooping) {
    if (slideIndex < 0) {
      domIndex = 0; // last-clone (prepended)
      logicalIndex = count - 1;
    } else if (slideIndex >= count) {
      domIndex = count + 1; // first-clone (appended)
      logicalIndex = 0;
    } else {
      domIndex = slideIndex + 1; // real slides are offset by 1 clone
      logicalIndex = slideIndex;
    }
  } else {
    if (slideIndex < 0) logicalIndex = count - 1;
    else if (slideIndex >= count) logicalIndex = 0;
    else logicalIndex = slideIndex;
    domIndex = logicalIndex;
  }

  const targetSlide = allSlides[domIndex];
  if (!targetSlide) return;

  updateActiveSlide(realSlides[logicalIndex]);

  if (block.classList.contains('carousel-vertical')) {
    const targetTop = targetSlide.getBoundingClientRect().top
      - slidesWrapper.getBoundingClientRect().top
      + slidesWrapper.scrollTop;
    slidesWrapper.scrollTo({ top: Math.max(0, targetTop), left: 0, behavior });
  } else {
    const targetLeft = shouldCenterActiveSlide(block)
      ? targetSlide.offsetLeft - ((slidesWrapper.clientWidth - targetSlide.clientWidth) / 2)
      : targetSlide.offsetLeft;
    slidesWrapper.scrollTo({ top: 0, left: Math.max(0, targetLeft), behavior });
  }
}

function bindEvents(block) {
  const slideIndicators = block.querySelector('.carousel-slide-indicators');
  const prevBtn = block.querySelector('.slide-prev');
  const nextBtn = block.querySelector('.slide-next');

  if (slideIndicators) {
    slideIndicators.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', (e) => {
        const slideIndicator = e.currentTarget.parentElement;
        showSlide(block, parseInt(slideIndicator.dataset.targetSlide, 10));
      });
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      showSlide(block, parseInt(block.dataset.activeSlide, 10) - 1);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      showSlide(block, parseInt(block.dataset.activeSlide, 10) + 1);
    });
  }

  const slidesWrapper = block.querySelector('.carousel-slides');

  if (block.dataset.looping === 'true') {
    const isVertical = block.classList.contains('carousel-vertical');
    slidesWrapper.addEventListener('scrollend', () => {
      const allSlides = [...block.querySelectorAll('.carousel-slide')];
      const wrapperCenter = isVertical
        ? slidesWrapper.scrollTop + slidesWrapper.clientHeight / 2
        : slidesWrapper.scrollLeft + slidesWrapper.clientWidth / 2;
      const closest = allSlides.reduce((prev, cur) => {
        const prevDist = isVertical
          ? Math.abs((prev.offsetTop + prev.offsetHeight / 2) - wrapperCenter)
          : Math.abs((prev.offsetLeft + prev.offsetWidth / 2) - wrapperCenter);
        const curDist = isVertical
          ? Math.abs((cur.offsetTop + cur.offsetHeight / 2) - wrapperCenter)
          : Math.abs((cur.offsetLeft + cur.offsetWidth / 2) - wrapperCenter);
        return curDist < prevDist ? cur : prev;
      });
      if (closest.dataset.clone) {
        showSlide(block, parseInt(closest.dataset.slideIndex, 10), 'instant');
      } else {
        updateActiveSlide(closest);
      }
    });
  } else {
    const slideObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) updateActiveSlide(entry.target);
      });
    }, { threshold: 0.5 });
    block.querySelectorAll('.carousel-slide').forEach((slide) => {
      slideObserver.observe(slide);
    });
  }
}

function initAutoplay(block, intervalMs, pauseOnHover, playLabel, pauseLabel, placeholders) {
  let timer = null;
  let playing = true;

  const controlsNav = block.querySelector('.carousel-controls');
  if (!controlsNav) return;

  const playPauseBtn = document.createElement('button');
  playPauseBtn.type = 'button';
  playPauseBtn.className = 'carousel-play-pause';
  const dotsEl = controlsNav.querySelector('.carousel-slide-indicators');
  const nextBtnEl = controlsNav.querySelector('.slide-next');
  controlsNav.insertBefore(playPauseBtn, dotsEl || nextBtnEl || null);

  function tick() {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) + 1);
  }

  function startTimer() {
    clearInterval(timer);
    timer = setInterval(tick, intervalMs);
  }

  function stopTimer() {
    clearInterval(timer);
    timer = null;
  }

  function updateButton() {
    playPauseBtn.setAttribute(
      'aria-label',
      playing
        ? (pauseLabel || placeholders.pauseCarousel || 'Pause')
        : (playLabel || placeholders.playCarousel || 'Play'),
    );
    playPauseBtn.classList.toggle('is-paused', !playing);
  }

  playPauseBtn.addEventListener('click', () => {
    playing = !playing;
    if (playing) startTimer();
    else stopTimer();
    updateButton();
  });

  // Reset timer on manual navigation so the selected slide gets its full display time
  [
    block.querySelector('.slide-prev'),
    block.querySelector('.slide-next'),
    ...block.querySelectorAll('.carousel-slide-indicator button'),
  ].forEach((btn) => {
    btn?.addEventListener('click', () => { if (playing) startTimer(); });
  });

  if (pauseOnHover) {
    block.addEventListener('mouseenter', () => { if (playing) stopTimer(); });
    block.addEventListener('mouseleave', () => { if (playing) startTimer(); });
  }

  updateButton();
  startTimer();
}

function getImageAltText(column) {
  const textNodes = [...column.querySelectorAll('p, span')];
  const altSource = textNodes.find((node) => !node.querySelector('a'));
  return altSource?.textContent?.trim() || '';
}

function getDirectFieldElement(source) {
  if (source?.hasAttribute?.('data-aue-prop')) {
    return source;
  }

  return source.querySelector(':scope > [data-aue-prop], :scope > div [data-aue-prop]') || null;
}

function getDirectFieldName(source) {
  const field = getDirectFieldElement(source);
  if (!field) return '';
  return field.getAttribute('data-aue-prop') || '';
}

/* function getFieldLink(source, name) {
  const field = getFieldElement(source, name);
  if (!field) return '';
  return (
    field.querySelector('a[href]')?.getAttribute('href')
    || field.getAttribute('data-aue-href')
    || field.getAttribute('data-aue-value')
    || field.textContent
    || ''
  ).trim();
}

function isCarouselItemSource(source) {
  return !!(
    getFieldElement(source, 'media_image')
    || getFieldElement(source, 'media_imageAlt')
    || getFieldElement(source, 'content_caption')
    || getFieldElement(source, 'content_link')
  );
} */

function isCarouselItemFieldRow(row) {
  return CAROUSEL_ITEM_FIELDS.has(getDirectFieldName(row));
}

function isAuthoringFieldRow(row) {
  return !!getFieldElement(row, 'totalSlides')
    || !!getFieldElement(row, 'carouselType')
    || !!getFieldElement(row, 'rssFeedUrl')
    || !!getFieldElement(row, 'numberOfItems')
    || !!getFieldElement(row, 'autoplay')
    || !!getFieldElement(row, 'slideTransitionTime')
    || !!getFieldElement(row, 'pauseOnHover')
    || !!getFieldElement(row, 'numberOfSlidesToShow')
    || !!getFieldElement(row, 'bypassCarouselOnMobile')
    || !!getFieldElement(row, 'startingSlideIndex')
    || !!getFieldElement(row, 'centerActiveSlide')
    || !!getFieldElement(row, 'enableLooping')
    || !!getFieldElement(row, 'enableNextPreviousControls')
    || !!getFieldElement(row, 'enableDotNavigation')
    || !!getFieldElement(row, 'carouselLabel')
    || !!getFieldElement(row, 'previousButtonLabel')
    || !!getFieldElement(row, 'nextButtonLabel')
    || !!getFieldElement(row, 'playButtonLabel')
    || !!getFieldElement(row, 'pauseButtonLabel')
    || !!getFieldElement(row, 'tablistLabel')
    || !!getFieldElement(row, 'itemLabel')
    || !!getFieldElement(row, 'analyticsInteractionId')
    || !!row.querySelector('[data-aue-prop]');
}

function groupCarouselItemRows(rows) {
  const groupedSources = [];
  let currentItem = null;
  let seenFields = new Set();

  rows.forEach((row) => {
    const fieldName = getDirectFieldName(row);
    if (!CAROUSEL_ITEM_FIELDS.has(fieldName)) {
      if (currentItem) {
        groupedSources.push(currentItem);
        currentItem = null;
        seenFields = new Set();
      }
      if (!isAuthoringFieldRow(row)) {
        groupedSources.push(row);
      }
      return;
    }

    if (!currentItem || seenFields.has(fieldName)) {
      if (currentItem) {
        groupedSources.push(currentItem);
      }
      currentItem = document.createElement('div');
      currentItem.classList.add('carousel-item');
      seenFields = new Set();
    }

    currentItem.append(row);
    seenFields.add(fieldName);
  });

  if (currentItem) {
    groupedSources.push(currentItem);
  }

  return groupedSources;
}

// function extractCarouselItemImage(itemSource) {
//   const imageField = getFieldElement(itemSource, 'media_image');
//   if (!imageField) return null;

//   resolveImageReference(imageField);

//   const picture = imageField.querySelector('picture');
//   if (picture) return picture;

//   const img = imageField.querySelector('img');
//   if (img) return img;

//   const link = imageField.querySelector('a[href]');
//   if (link?.href) {
//     const fallbackImg = document.createElement('img');
//     fallbackImg.src = link.href;
//     fallbackImg.alt = link.getAttribute('title') || link.textContent?.trim() || '';
//     return fallbackImg;
//   }

//   return null;
// }

function buildSlideImage(column) {
  resolveImageReference(column);

  const existingPicture = column.querySelector('picture');
  if (existingPicture) {
    const img = existingPicture.querySelector('img');
    if (img && !img.alt) img.alt = getImageAltText(column);
    return;
  }

  const existingImg = column.querySelector('img');
  if (existingImg) {
    if (!existingImg.alt) existingImg.alt = getImageAltText(column);
    const optimizedPicture = createOptimizedPicture(
      existingImg.src,
      existingImg.alt,
      false,
      [{ width: '1200' }],
    );
    moveInstrumentation(existingImg, optimizedPicture.querySelector('img'));
    existingImg.replaceWith(optimizedPicture);
  }
}

function waitForNestedBlocks(container) {
  const unloaded = [...container.querySelectorAll('.block')].filter(
    (b) => b.dataset.blockStatus !== 'loaded',
  );
  if (!unloaded.length) return Promise.resolve();
  const settled = Promise.all(unloaded.map((b) => new Promise((resolve) => {
    if (b.dataset.blockStatus === 'loaded') {
      resolve();
    } else {
      const mo = new MutationObserver(() => {
        if (b.dataset.blockStatus === 'loaded') { mo.disconnect(); resolve(); }
      });
      mo.observe(b, { attributes: true, attributeFilter: ['data-block-status'] });
    }
  })));
  const timeout = new Promise((resolve) => { setTimeout(resolve, 5000); });
  return Promise.race([settled, timeout]);
}

function createLoopClones(slidesWrapper) {
  const slides = [...slidesWrapper.querySelectorAll('.carousel-slide')];
  if (slides.length < 2) return;

  const lastClone = slides[slides.length - 1].cloneNode(true);
  const firstClone = slides[0].cloneNode(true);

  [lastClone, firstClone].forEach((clone) => {
    clone.dataset.clone = 'true';
    clone.setAttribute('aria-hidden', 'true');
    clone.removeAttribute('id');
  });
  lastClone.dataset.slideIndex = String(slides.length - 1);
  firstClone.dataset.slideIndex = '0';

  slidesWrapper.prepend(lastClone);
  slidesWrapper.append(firstClone);
}

function collectSectionOverlayContent(block) {
  const wrapper = block.closest('.carousel-wrapper');
  if (!wrapper) return null;

  const overlayContent = document.createElement('div');
  overlayContent.classList.add('carousel-slides-content');

  let sibling = wrapper.nextElementSibling;
  while (sibling) {
    const nextSibling = sibling.nextElementSibling;
    overlayContent.append(sibling);
    sibling = nextSibling;
  }

  return overlayContent.children.length ? overlayContent : null;
}

function collectSiblingBlocks(block, count) {
  const wrapper = block.parentElement;
  if (!wrapper) return null;
  const slides = [];
  let sibling = wrapper.nextElementSibling;
  while (sibling && slides.length < count) {
    slides.push(sibling);
    sibling = sibling.nextElementSibling;
  }
  return slides.length ? slides : null;
}

function hasVisibleContent(column) {
  return [...column.childNodes].some((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent.trim();
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    if (node.matches('picture, img')) {
      return false;
    }

    return node.textContent.trim() || node.querySelector('img, picture, video, iframe, a, button');
  });
}

function isRenderableLegacySlideRow(row) {
  const columns = [...row.querySelectorAll(':scope > div')];

  if (!columns.length) {
    return hasVisibleContent(row);
  }

  if (columns.length === 1) {
    return !!columns[0].querySelector('picture, img, video, iframe');
  }

  return columns.some((column) => hasVisibleContent(column));
}

function isRenderableSlideRow(row) {
  if (isCarouselItemFieldRow(row)) {
    return true;
  }

  if (isAuthoringFieldRow(row)) {
    return false;
  }

  return isRenderableLegacySlideRow(row);
}

function appendSlideColumn(slide, column, colIdx) {
  const isImageColumn = colIdx === 0;
  const isContentColumn = !isImageColumn;
  column.classList.add(`carousel-slide-${isImageColumn ? 'image' : 'content'}`);
  if (isImageColumn) {
    buildSlideImage(column);
  }
  if (isContentColumn && !hasVisibleContent(column)) {
    column.hidden = true;
  }
  slide.append(column);
}

function createSlideFromSibling(slide, siblingSection) {
  const contentColumn = document.createElement('div');
  contentColumn.classList.add('carousel-slide-content');
  if (!hasVisibleContent(siblingSection)) {
    contentColumn.hidden = true;
  }
  contentColumn.append(siblingSection);
  slide.append(contentColumn);
}

function createSlide(slideSource, slideIndex, carouselId) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.setAttribute('id', `carousel-${carouselId}-slide-${slideIndex}`);
  slide.classList.add('carousel-slide');

  const isSectionLike = slideSource.classList.contains('section')
    || [...slideSource.classList].some((c) => c.endsWith('-wrapper'));
  if (isSectionLike) {
    createSlideFromSibling(slide, slideSource);
  } else {
    slideSource.querySelectorAll(':scope > div').forEach((column, colIdx) => {
      appendSlideColumn(slide, column, colIdx);
    });
  }

  const labeledBy = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (labeledBy) {
    slide.setAttribute('aria-labelledby', labeledBy.getAttribute('id'));
  }

  return slide;
}

function initVerticalHeight(block, slidesWrapper) {
  const firstSlide = slidesWrapper.querySelector('.carousel-slide:not([data-clone])');
  if (!firstSlide) return;
  const apply = () => {
    const h = firstSlide.getBoundingClientRect().height;
    if (h > 0) block.style.setProperty('--carousel-height', `${h}px`);
  };
  apply();
  requestAnimationFrame(apply);
  window.addEventListener('load', apply, { once: true });
  new ResizeObserver(apply).observe(firstSlide);
}

let carouselId = 0;
export default async function decorate(block) {
  applyCommonProps(block, 22);
  carouselId += 1;
  block.setAttribute('id', `carousel-${carouselId}`);

  const allRows = [...block.querySelectorAll(':scope > div')];

  // Row  0: totalSlides — number of next sibling blocks to consume as carousel slides
  const totalSlides = parseInt(getCellText(allRows[ROW.TOTAL_SLIDES]), 10) || 0;
  // Row  9: startingSlideIndex — authored as 1-based, convert to 0-based
  const startingSlideRaw = parseInt(getCellText(allRows[ROW.STARTING_SLIDE_INDEX]), 10) || 1;
  const startingSlideIndex = Math.max(0, startingSlideRaw - 1);
  // Row  7: bypassCarouselOnMobile — stack slides as a list on viewports < 744px
  const bypassOnMobile = getCellBoolean(allRows[ROW.BYPASS_ON_MOBILE], false);
  // Row  6: numberOfSlidesToShow — total visible slots (center + partial peeks on each side)
  const slidesToShowText = getCellText(allRows[ROW.NUMBER_OF_SLIDES_TO_SHOW]);
  if (slidesToShowText) {
    const numberOfSlidesToShow = Math.max(1, parseInt(slidesToShowText, 10) || 1);
    block.dataset.slidesToShow = numberOfSlidesToShow;
    block.style.setProperty('--carousel-slides-to-show', numberOfSlidesToShow);
  }
  // Row  9: centerActiveSlide — store as data attribute for showSlide/shouldCenterActiveSlide
  block.dataset.centerActiveSlide = String(getCellBoolean(
    allRows[ROW.CENTER_ACTIVE_SLIDE],
    block.classList.contains('carousel-default'),
  ));
  // Row 11: enableNextPreviousControls — show/hide prev and next arrow buttons (default true)
  const enableNextPrevControls = getCellBoolean(allRows[ROW.ENABLE_NEXT_PREV_CONTROLS], true);
  // Row 12: enableDotNavigation — show/hide dot indicator list (default true)
  const enableDotNav = getCellBoolean(allRows[ROW.ENABLE_DOT_NAVIGATION], true);
  // Row 13: carouselLabel — aria-label for the carousel region
  const carouselLabel = getCellText(allRows[ROW.CAROUSEL_LABEL]);
  // Row 14: previousButtonLabel — aria-label override for the previous arrow button
  const prevButtonLabel = getCellText(allRows[ROW.PREV_BUTTON_LABEL]);
  // Row 15: nextButtonLabel — aria-label override for the next arrow button
  const nextButtonLabel = getCellText(allRows[ROW.NEXT_BUTTON_LABEL]);
  // Row 18: tablistLabel — aria-label for the controls nav element
  const tablistLabel = getCellText(allRows[ROW.TABLIST_LABEL]);
  // Row 19: itemLabel — when true, derive each slide's aria-label from its heading
  const useItemLabel = getCellBoolean(allRows[ROW.ITEM_LABEL], false);
  // Row 10: enableLooping — wrap from last slide back to first
  const enableLooping = getCellBoolean(allRows[ROW.ENABLE_LOOPING], false);
  // Row  3: autoplay — enable auto-advancing slides
  const autoplay = getCellBoolean(allRows[ROW.AUTOPLAY], false);
  // Row  4: slideTransitionTime — auto-advance interval in milliseconds (default 5000)
  const slideTransitionTime = parseInt(getCellText(allRows[ROW.SLIDE_TRANSITION_TIME]), 10) || 5000;
  // Row  5: pauseOnHover — pause autoplay when mouse is over the carousel (default true)
  const pauseOnHover = getCellBoolean(allRows[ROW.PAUSE_ON_HOVER], true);
  // Row 16: playButtonLabel — aria-label for the play button
  const playButtonLabel = getCellText(allRows[ROW.PLAY_BUTTON_LABEL]);
  // Row 17: pauseButtonLabel — aria-label for the pause button
  const pauseButtonLabel = getCellText(allRows[ROW.PAUSE_BUTTON_LABEL]);
  // Row  1: rssFeedUrl — fetch RSS feed when a URL is authored
  const rssFeedUrl = getCellText(allRows[ROW.RSS_FEED_URL]);
  // Row  2: numberOfItems — cap the number of RSS slides (0 = no limit)
  const numberOfItems = parseInt(getCellText(allRows[ROW.NUMBER_OF_ITEMS]), 10) || 0;
  const rssFeedData = rssFeedUrl ? await fetchRssFeed(rssFeedUrl) : null;
  const rssFeedSlides = rssFeedData ? createSlidesFromRssFeed(rssFeedData, numberOfItems) : null;

  const siblingSlides = shouldRunOutsideAuthorEdit()
    ? collectSiblingBlocks(block, totalSlides > 0 ? totalSlides : Infinity)
    : null;
  const overlayContent = (siblingSlides === null && shouldRunOutsideAuthorEdit())
    ? collectSectionOverlayContent(block)
    : null;
  const rows = allRows.filter(isRenderableSlideRow);
  const normalizedRows = rows.some(isCarouselItemFieldRow)
    ? groupCarouselItemRows(rows)
    : rows;
  let slideSources;
  if (rssFeedSlides?.length) {
    slideSources = rssFeedSlides;
  } else if (siblingSlides?.length) {
    slideSources = siblingSlides;
  } else if (overlayContent?.children.length) {
    slideSources = [...overlayContent.children];
  } else {
    slideSources = normalizedRows;
  }
  const isSingleSlide = slideSources.length < 2;

  const placeholders = await fetchPlaceholders();

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', placeholders.carousel || 'Carousel');
  if (carouselLabel) block.setAttribute('aria-label', carouselLabel);

  const container = document.createElement('div');
  container.classList.add('carousel-slides-container');

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carousel-slides');
  block.prepend(slidesWrapper);

  let slideIndicators;
  if (!isSingleSlide) {
    const controlsNav = document.createElement('nav');
    controlsNav.classList.add('carousel-controls');
    controlsNav.setAttribute('aria-label', tablistLabel || placeholders.carouselSlideControls || 'Carousel Slide Controls');

    if (enableNextPrevControls) {
      const prevButton = document.createElement('button');
      prevButton.type = 'button';
      prevButton.className = 'slide-prev';
      prevButton.setAttribute('aria-label', prevButtonLabel || placeholders.previousSlide || 'Previous Slide');
      controlsNav.append(prevButton);
    }

    if (enableDotNav) {
      slideIndicators = document.createElement('ol');
      slideIndicators.classList.add('carousel-slide-indicators');
      controlsNav.append(slideIndicators);
    }

    if (enableNextPrevControls) {
      const nextButton = document.createElement('button');
      nextButton.type = 'button';
      nextButton.className = 'slide-next';
      nextButton.setAttribute('aria-label', nextButtonLabel || placeholders.nextSlide || 'Next Slide');
      controlsNav.append(nextButton);
    }

    block.append(controlsNav);
  }

  slideSources.forEach((slideSource, idx) => {
    const slide = createSlide(slideSource, idx, carouselId);
    if (useItemLabel) {
      const heading = slide.querySelector('h1, h2, h3, h4, h5, h6');
      if (heading?.textContent) slide.setAttribute('aria-label', heading.textContent.trim());
    }
    moveInstrumentation(slideSource, slide);
    slidesWrapper.append(slide);

    if (slideIndicators) {
      const indicator = document.createElement('li');
      indicator.classList.add('carousel-slide-indicator');
      indicator.dataset.targetSlide = idx;
      indicator.innerHTML = `<button type="button" aria-label="${placeholders.showSlide || 'Show Slide'} ${idx + 1} ${placeholders.of || 'of'} ${slideSources.length}"></button>`;
      slideIndicators.append(indicator);
    }
    if (rows.includes(slideSource)) {
      slideSource.remove();
    }
  });

  allRows
    .filter((row) => row.parentElement === block)
    .forEach((row) => row.remove());

  container.append(slidesWrapper);
  block.prepend(container);

  if (!isSingleSlide) {
    (async () => {
      const shouldLoop = block.classList.contains('carousel-default') || enableLooping || autoplay;
      if (shouldLoop) {
        block.dataset.looping = 'true';
        await waitForNestedBlocks(slidesWrapper);
        createLoopClones(slidesWrapper);
      }
      bindEvents(block);
      if (autoplay) {
        initAutoplay(
          block,
          slideTransitionTime,
          pauseOnHover,
          playButtonLabel,
          pauseButtonLabel,
          placeholders,
        );
      }
      requestAnimationFrame(() => showSlide(block, startingSlideIndex, 'instant'));
    })();
  }

  if (block.classList.contains('carousel-vertical')) {
    const nextBtn = block.querySelector('.slide-next');
    if (nextBtn) container.append(nextBtn);
    const controlsNav = block.querySelector('.carousel-controls');
    if (controlsNav) controlsNav.hidden = true;
    initVerticalHeight(block, slidesWrapper);
  }

  if (bypassOnMobile) {
    const mediaQuery = window.matchMedia('(max-width: 743px)');
    const applyBypass = (mq) => { block.classList.toggle('bypass-carousel', mq.matches); };
    applyBypass(mediaQuery);
    mediaQuery.addEventListener('change', applyBypass);
  }
}
