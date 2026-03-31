import { getConfigValue } from '../../scripts/config.js';

export default async function decorate(block) {
  const pressReleaseUrl = await getConfigValue('pressReleaseUrl');

  const DEFAULT_COUNT = 3;
  const countEl = block.querySelector('[data-aue-prop="numberOfItems"]');

  const feedUrl = pressReleaseUrl?.trim();
  const count = parseInt(countEl?.textContent?.trim(), 10) || DEFAULT_COUNT;

  // -----------------------------------------
  // BASE HTML
  // -----------------------------------------
  block.innerHTML = `
    <div class="press-carousel">
      <div class="press-carousel-track" aria-live="polite"></div>
      <div class="press-carousel-controls">
        <button class="press-arrow press-prev splide__arrow--prev" aria-label="Previous"></button>
        <button class="press-arrow press-next splide__arrow--next" aria-label="Next"></button>
      </div>
    </div>
  `;

  const track = block.querySelector('.press-carousel-track');
  const controls = block.querySelector('.press-carousel-controls');
  const btnPrev = block.querySelector('.press-prev');
  const btnNext = block.querySelector('.press-next');

  // -----------------------------------------
  // FETCH RSS
  // -----------------------------------------
  let xml;
  try {
    const xmlText = await fetch(feedUrl).then((r) => r.text());
    xml = new DOMParser().parseFromString(xmlText, 'text/xml');
  } catch (e) {
    track.innerHTML = '<p style="color:red">Feed could not be loaded.</p>';
    controls.style.display = 'none';
    return;
  }

  // -----------------------------------------
  // GET ITEMS
  // -----------------------------------------
  let items = [...xml.querySelectorAll('item')];

  if (items.length === 0) {
    track.innerHTML = '<p>No press releases available.</p>';
    controls.style.display = 'none';
    return;
  }

  items = items.slice(0, count);

  // -----------------------------------------
  // BUILD SLIDES
  // -----------------------------------------
  items.forEach((item) => {
    const titleEl = item.querySelector('title');
    const linkEl = item.querySelector('link');
    const dateEl = item.querySelector('pubDate');

    const title = titleEl ? titleEl.textContent.trim() : 'Untitled';
    const link = linkEl ? linkEl.textContent.trim() : '#';
    const pubDate = dateEl ? dateEl.textContent : '';

    const dateObj = pubDate ? new Date(pubDate) : null;
    const formattedDate = dateObj
      ? dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'No date available';

    const card = document.createElement('div');
    card.className = 'press-card';

    card.innerHTML = `
      <a href="${link}" target="_blank" rel="noopener noreferrer">
        <div class="press-date">${formattedDate}</div>
        <div class="press-title">${title}</div>
      </a>
    `;

    track.appendChild(card);
  });

  const slides = [...track.children];

  if (slides.length <= 1) {
    controls.style.display = 'none';
    return;
  }

  // -----------------------------------------
  // TRUE INFINITE LOOP → CLONES
  // -----------------------------------------
  const firstClone = slides[0].cloneNode(true);
  const lastClone = slides[slides.length - 1].cloneNode(true);
  firstClone.classList.add('clone');
  lastClone.classList.add('clone');

  firstClone.setAttribute('aria-hidden', 'true');
  lastClone.setAttribute('aria-hidden', 'true');

  track.insertBefore(lastClone, slides[0]);
  track.appendChild(firstClone);

  const allSlides = [...track.children];

  let index = 1; // start at first real slide
  let isTransitioning = false;

  // -----------------------------------------
  // WIDTH CACHING
  // -----------------------------------------
  let cachedSlideWidth = 0;

  function computeSlideWidth() {
    const gap = parseInt(getComputedStyle(track).gap, 10) || 0;
    cachedSlideWidth = allSlides[0].getBoundingClientRect().width + gap;
  }

  function getSlideWidth() {
    return cachedSlideWidth;
  }

  // -----------------------------------------
  // POSITION UPDATE
  // -----------------------------------------
  function updatePosition(animate = true) {
    track.style.transition = animate
      ? 'transform var(--press-slide-speed) var(--press-slide-easing)'
      : 'none';

    track.style.transform = `translateX(-${index * getSlideWidth()}px)`;
  }

  // -----------------------------------------
  // TRANSITION END (LOOP FIX)
  // -----------------------------------------
  track.addEventListener('transitionend', () => {
    isTransitioning = false;

    if (allSlides[index].classList.contains('clone')) {
      if (index === 0) index = slides.length;
      if (index === allSlides.length - 1) index = 1;
      updatePosition(false);
    }
  });

  // -----------------------------------------
  // BUTTON LOGIC (LOCKED DURING TRANSITION)
  // -----------------------------------------
  function next() {
    if (isTransitioning) return;
    index += 1;
    isTransitioning = true;
    updatePosition();
  }

  function prev() {
    if (isTransitioning) return;
    index -= 1;
    isTransitioning = true;
    updatePosition();
  }

  btnNext.addEventListener('click', next);
  btnPrev.addEventListener('click', prev);

  // -----------------------------------------
  // DRAG + SWIPE (LOCK TRANSITION)
  // -----------------------------------------
  let startX = 0;
  let isDragging = false;
  let startTranslate = 0;
  let moved = false;

  function dragStart(e) {
    if (isTransitioning) return;

    isDragging = true;
    moved = false;

    startX = e.touches ? e.touches[0].clientX : e.clientX;
    startTranslate = -index * getSlideWidth();
    track.style.transition = 'none';

    track.style.userSelect = 'none';
    document.body.style.userSelect = 'none';
  }

  function dragMove(e) {
    if (!isDragging) return;

    moved = true;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const delta = x - startX;

    track.style.transform = `translateX(${startTranslate + delta}px)`;
  }

  function dragEnd(e) {
    if (!isDragging) return;

    isDragging = false;

    const endX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const delta = endX - startX;

    track.style.userSelect = '';
    document.body.style.userSelect = '';

    if (moved) e.preventDefault();

    if (delta < -60) next();
    else if (delta > 60) prev();
    else updatePosition();
  }

  track.addEventListener('mousedown', dragStart);
  window.addEventListener('mousemove', dragMove);
  window.addEventListener('mouseup', dragEnd);

  track.addEventListener('touchstart', dragStart, { passive: true });
  track.addEventListener('touchmove', dragMove, { passive: true });
  track.addEventListener('touchend', dragEnd);

  // -----------------------------------------
  // RESIZE → RECACHE WIDTH
  // -----------------------------------------
  window.addEventListener('resize', () => {
    computeSlideWidth();
    updatePosition(false);
  });

  // -----------------------------------------
  // INITIAL SETUP
  // -----------------------------------------
  requestAnimationFrame(() => {
    computeSlideWidth();
    updatePosition(false);
  });
}
