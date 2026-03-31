# Analytics Implementation Guide for EDS (Edge Delivery Services)

## Migration from AEM to EDS Analytics

This guide provides a comprehensive approach to implementing analytics in Adobe Edge Delivery Services (EDS) blocks, maintaining parity with the existing AEM implementation.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Differences](#architecture-differences)
3. [GTM Integration](#gtm-integration)
4. [Data Layer Implementation](#data-layer-implementation)
5. [Video Analytics](#video-analytics)
6. [Event Tracking Patterns](#event-tracking-patterns)
7. [Block-Level Analytics](#block-level-analytics)
8. [Implementation Examples](#implementation-examples)
9. [Testing & Validation](#testing--validation)
10. [Best Practices](#best-practices)

---

## Overview

### Current AEM Analytics Stack
- Google Tag Manager (GTM)
- Custom video tracking (YouTube, Brightcove, Interactive Media)
- Third-party analytics integrations
- Form and search tracking

### EDS Analytics Approach
- Lightweight, performance-focused
- GTM integration via head.html
- Custom data layer implementation
- Event-driven architecture
- Block-specific tracking modules

---

## Architecture Differences

### AEM (Current)
```
Server-Side Rendering → Sling Models → Data Layer JSON → GTM → Analytics
```

### EDS (Target)
```
Static HTML → JavaScript Decoration → Data Layer → GTM → Analytics
```

### Key Changes:
1. **No server-side model**: All data layer construction happens client-side
2. **Block-based architecture**: Analytics logic lives within individual blocks
3. **Delayed loading**: Analytics scripts load via `delayed.js`
4. **Performance first**: Minimal impact on Core Web Vitals

---

## GTM Integration

### Step 1: Add GTM to head.html

**File**: `head.html`

```html
<script>
  // Google Tag Manager
  (function(w,d,s,l,i){
    w[l]=w[l]||[];
    w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});
    var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
    j.async=true;
    j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
    f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-XXXXXXX');
</script>
```

### Step 2: Add GTM noscript to body

Add to your page template or via block:

```html
<noscript>
  <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
    height="0" width="0" style="display:none;visibility:hidden">
  </iframe>
</noscript>
```

### Step 3: Configure GTM ID by environment

**File**: `scripts/config.js`

```javascript
// Get GTM ID based on environment
export function getGTMId() {
  const { hostname } = window.location;
  
  // Production
  if (hostname.includes('abbvie.com')) {
    return 'GTM-PROD123';
  }
  
  // Stage
  if (hostname.includes('hlx.page')) {
    return 'GTM-STAGE456';
  }
  
  // Dev/Local
  return 'GTM-DEV789';
}

// Initialize GTM dynamically
export function initGTM() {
  const gtmId = getGTMId();
  
  (function(w,d,s,l,i){
    w[l]=w[l]||[];
    w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});
    var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
    j.async=true;
    j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
    f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer',gtmId);
}
```

---

## Data Layer Implementation

### Step 1: Create Data Layer Utility

**File**: `scripts/analytics/datalayer.js`

```javascript
/**
 * Initialize the data layer
 */
export function initDataLayer() {
  window.dataLayer = window.dataLayer || [];
  window.adobeDataLayer = window.adobeDataLayer || [];
}

/**
 * Push event to data layer
 * @param {Object} eventData - Event data object
 */
export function pushToDataLayer(eventData) {
  if (!window.dataLayer) {
    initDataLayer();
  }
  
  window.dataLayer.push(eventData);
  
  // Also push to Adobe Data Layer for compatibility
  if (window.adobeDataLayer) {
    window.adobeDataLayer.push(eventData);
  }
  
  console.log('[Analytics] Event pushed:', eventData);
}

/**
 * Get page data for analytics
 */
export function getPageData() {
  const meta = document.querySelector('meta[name="template"]');
  const template = meta ? meta.content : 'default';
  
  return {
    event: 'page_view',
    page: {
      path: window.location.pathname,
      title: document.title,
      url: window.location.href,
      template,
      language: document.documentElement.lang || 'en',
      referrer: document.referrer,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Track page view
 */
export function trackPageView() {
  const pageData = getPageData();
  pushToDataLayer(pageData);
}

/**
 * Track custom event
 * @param {string} eventName - Name of the event
 * @param {Object} eventProperties - Additional properties
 */
export function trackEvent(eventName, eventProperties = {}) {
  pushToDataLayer({
    event: eventName,
    ...eventProperties,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track click event
 * @param {HTMLElement} element - Clicked element
 * @param {Object} additionalData - Additional tracking data
 */
export function trackClick(element, additionalData = {}) {
  const eventData = {
    event: 'click',
    element: {
      id: element.id || '',
      class: element.className || '',
      text: element.textContent?.trim().substring(0, 100) || '',
      tag: element.tagName.toLowerCase(),
      href: element.href || '',
    },
    ...additionalData,
  };
  
  pushToDataLayer(eventData);
}

/**
 * Track form submission
 * @param {HTMLFormElement} form - Form element
 * @param {Object} formData - Form data object
 */
export function trackFormSubmit(form, formData = {}) {
  pushToDataLayer({
    event: 'form_submit',
    form: {
      id: form.id || '',
      name: form.name || '',
      action: form.action || '',
      method: form.method || 'POST',
    },
    ...formData,
  });
}
```

### Step 2: Initialize Data Layer on Page Load

**File**: `scripts/scripts.js` (add to existing file)

```javascript
import { initDataLayer, trackPageView } from './analytics/datalayer.js';

// Initialize analytics early
initDataLayer();

// Track page view after LCP
await loadLCP(document);
trackPageView();
```

---

## Video Analytics

### Step 1: YouTube Video Analytics

**File**: `scripts/analytics/video-youtube.js`

```javascript
import { pushToDataLayer } from './datalayer.js';

const videoTrackers = new Map();

/**
 * Initialize YouTube video tracking
 */
export function initYouTubeTracking() {
  // Wait for YouTube API
  if (!window.YT) {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    
    window.onYouTubeIframeAPIReady = setupYouTubePlayers;
  } else {
    setupYouTubePlayers();
  }
}

function setupYouTubePlayers() {
  const iframes = document.querySelectorAll('iframe[src*="youtube.com"], iframe[src*="youtube-nocookie.com"]');
  
  iframes.forEach((iframe, index) => {
    const videoId = extractYouTubeVideoId(iframe.src);
    if (!videoId) return;
    
    const player = new YT.Player(iframe, {
      events: {
        onReady: (event) => onPlayerReady(event, videoId, index),
        onStateChange: (event) => onPlayerStateChange(event, videoId, index),
      },
    });
    
    videoTrackers.set(videoId, {
      player,
      index,
      started: false,
      progress: new Set(),
      title: '',
      duration: 0,
    });
  });
}

function extractYouTubeVideoId(url) {
  const regex = /(?:youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)([^?]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function onPlayerReady(event, videoId, index) {
  const tracker = videoTrackers.get(videoId);
  if (!tracker) return;
  
  try {
    tracker.title = event.target.getVideoData().title;
    tracker.duration = event.target.getDuration();
  } catch (e) {
    console.error('Error getting video data:', e);
  }
}

function onPlayerStateChange(event, videoId, index) {
  const tracker = videoTrackers.get(videoId);
  if (!tracker) return;
  
  const player = event.target;
  const state = player.getPlayerState();
  
  // Playing
  if (state === 1 && !tracker.started) {
    tracker.started = true;
    pushToDataLayer({
      event: 'video_start',
      video_name: tracker.title,
      video_id: videoId,
      video_length: tracker.duration,
      video_provider: 'youtube',
    });
    
    // Start progress tracking
    startProgressTracking(player, videoId);
  }
  
  // Ended
  if (state === 0) {
    pushToDataLayer({
      event: 'video_complete',
      video_name: tracker.title,
      video_id: videoId,
      video_length: tracker.duration,
      video_provider: 'youtube',
      percent: '100',
    });
    
    // Reset for replay
    tracker.started = false;
    tracker.progress.clear();
  }
}

function startProgressTracking(player, videoId) {
  const tracker = videoTrackers.get(videoId);
  if (!tracker) return;
  
  const interval = setInterval(() => {
    try {
      const currentTime = player.getCurrentTime();
      const duration = player.getDuration();
      const percent = Math.floor((currentTime / duration) * 100);
      
      // Track at 25%, 50%, 75%
      [25, 50, 75].forEach((milestone) => {
        if (percent >= milestone && !tracker.progress.has(milestone)) {
          tracker.progress.add(milestone);
          pushToDataLayer({
            event: 'video_progress',
            video_name: tracker.title,
            video_id: videoId,
            video_length: duration,
            video_provider: 'youtube',
            percent: milestone.toString(),
          });
        }
      });
      
      // Stop tracking when video ends
      if (player.getPlayerState() === 0) {
        clearInterval(interval);
      }
    } catch (e) {
      clearInterval(interval);
    }
  }, 1000);
}
```

### Step 2: Brightcove Video Analytics

**File**: `scripts/analytics/video-brightcove.js`

```javascript
import { pushToDataLayer } from './datalayer.js';

const brightcoveTrackers = new Map();

/**
 * Initialize Brightcove video tracking
 */
export function initBrightcoveTracking() {
  // Wait for videojs to be loaded
  if (typeof videojs === 'undefined') {
    console.warn('Brightcove/videojs not loaded');
    return;
  }
  
  const videoElements = document.querySelectorAll('video[data-video-id], video-js');
  
  videoElements.forEach((element) => {
    const player = videojs(element);
    const videoId = element.getAttribute('data-video-id') || player.id();
    const isPodcast = element.classList.contains('podcast') || element.id.includes('podcast');
    
    setupBrightcovePlayer(player, videoId, isPodcast);
  });
}

function setupBrightcovePlayer(player, videoId, isPodcast = false) {
  const tracker = {
    started: false,
    progress: new Set(),
    completed: false,
    mediaInfo: null,
    isPodcast,
  };
  
  brightcoveTrackers.set(videoId, tracker);
  
  // Play event
  player.on('play', function() {
    tracker.mediaInfo = player.mediainfo;
    
    if (!tracker.started && tracker.mediaInfo) {
      tracker.started = true;
      
      const eventName = isPodcast ? 'podcast_start' : 'video_start';
      const nameKey = isPodcast ? 'podcast_name' : 'video_name';
      const lengthKey = isPodcast ? 'podcast_length' : 'video_length';
      const idKey = isPodcast ? 'podcast_id' : 'video_id';
      
      pushToDataLayer({
        event: eventName,
        [nameKey]: tracker.mediaInfo.name,
        [lengthKey]: player.duration(),
        [idKey]: tracker.mediaInfo.id,
        video_provider: 'brightcove',
      });
    }
  });
  
  // Time update for progress tracking
  player.on('timeupdate', function() {
    if (!tracker.mediaInfo) return;
    
    const currentTime = player.currentTime();
    const duration = player.duration();
    const percent = Math.floor((currentTime / duration) * 100);
    
    [25, 50, 75].forEach((milestone) => {
      if (percent >= milestone && !tracker.progress.has(milestone)) {
        tracker.progress.add(milestone);
        
        const eventName = isPodcast ? 'podcast_progress' : 'video_progress';
        const nameKey = isPodcast ? 'podcast_name' : 'video_name';
        const lengthKey = isPodcast ? 'podcast_length' : 'video_length';
        const idKey = isPodcast ? 'podcast_id' : 'video_id';
        
        pushToDataLayer({
          event: eventName,
          [nameKey]: tracker.mediaInfo.name,
          [lengthKey]: duration,
          [idKey]: tracker.mediaInfo.id,
          percent: milestone.toString(),
          video_provider: 'brightcove',
        });
      }
    });
  });
  
  // Ended event
  player.on('ended', function() {
    if (!tracker.completed) {
      tracker.completed = true;
      
      const eventName = isPodcast ? 'podcast_complete' : 'video_complete';
      const nameKey = isPodcast ? 'podcast_name' : 'video_name';
      const lengthKey = isPodcast ? 'podcast_length' : 'video_length';
      const idKey = isPodcast ? 'podcast_id' : 'video_id';
      
      pushToDataLayer({
        event: eventName,
        [nameKey]: tracker.mediaInfo.name,
        [lengthKey]: player.duration(),
        [idKey]: tracker.mediaInfo.id,
        percent: '100',
        video_provider: 'brightcove',
      });
      
      // Reset for replay
      tracker.started = false;
      tracker.progress.clear();
      tracker.completed = false;
    }
  });
}
```

### Step 3: Generic HTML5 Video Analytics

**File**: `scripts/analytics/video-html5.js`

```javascript
import { pushToDataLayer } from './datalayer.js';

const videoTrackers = new WeakMap();

/**
 * Initialize HTML5 video tracking
 */
export function initHTML5VideoTracking() {
  const videos = document.querySelectorAll('video:not([data-video-id]):not(.youtube-video)');
  
  videos.forEach((video) => {
    if (videoTrackers.has(video)) return;
    
    const tracker = {
      started: false,
      progress: new Set(),
      completed: false,
      name: video.getAttribute('data-video-name') || video.title || 'Unnamed Video',
    };
    
    videoTrackers.set(video, tracker);
    setupHTML5VideoTracking(video, tracker);
  });
  
  // Watch for dynamically added videos
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.tagName === 'VIDEO') {
          initHTML5VideoTracking();
        }
      });
    });
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
}

function setupHTML5VideoTracking(video, tracker) {
  // Play event
  video.addEventListener('play', function() {
    if (!tracker.started) {
      tracker.started = true;
      
      pushToDataLayer({
        event: 'video_start',
        video_name: tracker.name,
        video_length: video.duration || 0,
        video_provider: 'html5',
      });
    }
  });
  
  // Time update for progress
  video.addEventListener('timeupdate', function() {
    if (!video.duration) return;
    
    const percent = Math.floor((video.currentTime / video.duration) * 100);
    
    [25, 50, 75].forEach((milestone) => {
      if (percent >= milestone && !tracker.progress.has(milestone)) {
        tracker.progress.add(milestone);
        
        pushToDataLayer({
          event: 'video_progress',
          video_name: tracker.name,
          video_length: video.duration,
          percent: milestone.toString(),
          video_provider: 'html5',
        });
      }
    });
  });
  
  // Ended event
  video.addEventListener('ended', function() {
    if (!tracker.completed) {
      tracker.completed = true;
      
      pushToDataLayer({
        event: 'video_complete',
        video_name: tracker.name,
        video_length: video.duration,
        percent: '100',
        video_provider: 'html5',
      });
      
      // Reset for replay
      tracker.started = false;
      tracker.progress.clear();
      tracker.completed = false;
    }
  });
}
```

### Step 4: Initialize All Video Tracking

**File**: `scripts/delayed.js` (add to existing file)

```javascript
import { initYouTubeTracking } from './analytics/video-youtube.js';
import { initBrightcoveTracking } from './analytics/video-brightcove.js';
import { initHTML5VideoTracking } from './analytics/video-html5.js';

// Initialize video analytics
initYouTubeTracking();
initBrightcoveTracking();
initHTML5VideoTracking();
```

---

## Event Tracking Patterns

### 1. Link Tracking

**File**: `scripts/analytics/link-tracking.js`

```javascript
import { pushToDataLayer } from './datalayer.js';

export function initLinkTracking() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link) return;
    
    const href = link.href;
    const text = link.textContent.trim();
    const isExternal = href && !href.includes(window.location.hostname);
    const isDownload = href && /\.(pdf|doc|docx|xls|xlsx|zip)$/i.test(href);
    
    if (isExternal || isDownload) {
      pushToDataLayer({
        event: 'link_click',
        link_url: href,
        link_text: text,
        link_type: isDownload ? 'download' : 'external',
        link_domain: new URL(href).hostname,
      });
    }
  });
}
```

### 2. CTA Button Tracking

```javascript
export function initCTATracking() {
  document.addEventListener('click', (event) => {
    const button = event.target.closest('.button, .cta, [role="button"]');
    if (!button) return;
    
    pushToDataLayer({
      event: 'cta_click',
      cta_text: button.textContent.trim(),
      cta_type: button.classList.contains('primary') ? 'primary' : 'secondary',
      cta_location: getElementLocation(button),
    });
  });
}

function getElementLocation(element) {
  const block = element.closest('[class*="block"]');
  return block ? block.className.split(' ')[0] : 'unknown';
}
```

### 3. Form Tracking

```javascript
export function initFormTracking() {
  const forms = document.querySelectorAll('form');
  
  forms.forEach((form) => {
    // Form start (first interaction)
    let formStarted = false;
    form.addEventListener('focus', () => {
      if (!formStarted) {
        formStarted = true;
        pushToDataLayer({
          event: 'form_start',
          form_id: form.id || form.name || 'unnamed',
        });
      }
    }, true);
    
    // Form submission
    form.addEventListener('submit', (event) => {
      pushToDataLayer({
        event: 'form_submit',
        form_id: form.id || form.name || 'unnamed',
        form_action: form.action,
      });
    });
  });
}
```

### 4. Scroll Depth Tracking

```javascript
export function initScrollTracking() {
  const milestones = [25, 50, 75, 100];
  const tracked = new Set();
  
  function checkScrollDepth() {
    const scrollPercent = Math.floor(
      (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
    );
    
    milestones.forEach((milestone) => {
      if (scrollPercent >= milestone && !tracked.has(milestone)) {
        tracked.add(milestone);
        pushToDataLayer({
          event: 'scroll_depth',
          scroll_depth: milestone,
        });
      }
    });
  }
  
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        checkScrollDepth();
        ticking = false;
      });
      ticking = true;
    }
  });
}
```

---

## Block-Level Analytics

### Example: Hero Block with Analytics

**File**: `blocks/hero/hero.js`

```javascript
import { trackEvent } from '../../scripts/analytics/datalayer.js';

export default function decorate(block) {
  // ... existing decoration code ...
  
  // Track hero impression
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        trackEvent('hero_view', {
          hero_title: block.querySelector('h1')?.textContent,
          hero_position: 'top',
        });
        observer.disconnect();
      }
    });
  }, { threshold: 0.5 });
  
  observer.observe(block);
  
  // Track CTA clicks
  const ctas = block.querySelectorAll('.button');
  ctas.forEach((cta, index) => {
    cta.addEventListener('click', () => {
      trackEvent('hero_cta_click', {
        cta_text: cta.textContent,
        cta_position: index + 1,
        hero_title: block.querySelector('h1')?.textContent,
      });
    });
  });
}
```

### Example: Carousel Block with Analytics

**File**: `blocks/carousel/carousel.js`

```javascript
import { trackEvent } from '../../scripts/analytics/datalayer.js';

export default function decorate(block) {
  // ... existing carousel code ...
  
  let currentSlide = 0;
  const slides = block.querySelectorAll('.carousel-slide');
  
  function updateSlide(newIndex) {
    currentSlide = newIndex;
    
    trackEvent('carousel_slide_change', {
      slide_number: currentSlide + 1,
      slide_total: slides.length,
      slide_title: slides[currentSlide].querySelector('h2')?.textContent,
    });
  }
  
  // Track autoplay status
  if (block.hasAttribute('data-autoplay')) {
    trackEvent('carousel_autoplay_start', {
      slides_count: slides.length,
    });
  }
}
```

### Example: Accordion Block with Analytics

**File**: `blocks/accordion/accordion.js`

```javascript
import { trackEvent } from '../../scripts/analytics/datalayer.js';

export default function decorate(block) {
  const items = block.querySelectorAll('.accordion-item');
  
  items.forEach((item, index) => {
    const button = item.querySelector('.accordion-button');
    
    button.addEventListener('click', () => {
      const isExpanding = !item.classList.contains('active');
      
      trackEvent('accordion_interaction', {
        action: isExpanding ? 'expand' : 'collapse',
        item_title: button.textContent.trim(),
        item_position: index + 1,
      });
    });
  });
}
```

---

## Implementation Examples

### Complete Analytics Setup

**File**: `scripts/analytics/index.js`

```javascript
// Main analytics initialization file
import { initDataLayer, trackPageView } from './datalayer.js';
import { initGTM } from '../config.js';
import { initYouTubeTracking } from './video-youtube.js';
import { initBrightcoveTracking } from './video-brightcove.js';
import { initHTML5VideoTracking } from './video-html5.js';
import { initLinkTracking } from './link-tracking.js';
import { initCTATracking } from './link-tracking.js';
import { initFormTracking } from './link-tracking.js';
import { initScrollTracking } from './link-tracking.js';

/**
 * Initialize all analytics
 */
export function initAnalytics() {
  console.log('[Analytics] Initializing...');
  
  // 1. Initialize data layer
  initDataLayer();
  
  // 2. Initialize GTM
  initGTM();
  
  // 3. Track initial page view
  trackPageView();
  
  // 4. Initialize event tracking
  initLinkTracking();
  initCTATracking();
  initFormTracking();
  initScrollTracking();
  
  // 5. Initialize video tracking (delayed)
  setTimeout(() => {
    initYouTubeTracking();
    initBrightcoveTracking();
    initHTML5VideoTracking();
  }, 3000);
  
  console.log('[Analytics] Initialized successfully');
}
```

**Update**: `scripts/scripts.js`

```javascript
import { initAnalytics } from './analytics/index.js';

// Early initialization
initAnalytics();

// Rest of your existing code...
```

---

## Testing & Validation

### 1. Chrome DevTools Console Testing

```javascript
// Check data layer
console.log(window.dataLayer);

// Check Adobe data layer
console.log(window.adobeDataLayer);

// Test event push
dataLayer.push({
  event: 'test_event',
  test: true
});
```

### 2. Google Tag Assistant

1. Install Chrome extension: "Tag Assistant Legacy"
2. Enable recording
3. Navigate through site
4. Verify GTM tags fire correctly

### 3. GTM Preview Mode

1. In GTM, click "Preview"
2. Enter your EDS site URL
3. Verify events in debugger

### 4. Analytics Debug Script

**File**: `scripts/analytics/debug.js`

```javascript
export function enableAnalyticsDebug() {
  const originalPush = window.dataLayer.push;
  
  window.dataLayer.push = function(...args) {
    console.group('[Analytics Debug]');
    console.log('Event:', args);
    console.trace('Called from:');
    console.groupEnd();
    
    return originalPush.apply(this, args);
  };
  
  console.log('[Analytics] Debug mode enabled');
}

// Enable in dev/stage
if (window.location.hostname.includes('hlx.page') || 
    window.location.hostname === 'localhost') {
  enableAnalyticsDebug();
}
```

---

## Best Practices

### 1. Performance

- Load analytics asynchronously
- Use `delayed.js` for non-critical tracking
- Implement event throttling/debouncing
- Minimize data layer payload size

```javascript
// Debounce example
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

const trackScrollDebounced = debounce(checkScrollDepth, 100);
```

### 2. Data Privacy

```javascript
// Check cookie consent before tracking
export function hasAnalyticsConsent() {
  // Check OneTrust or similar
  const consent = window.OnetrustActiveGroups || '';
  return consent.includes('C0002'); // Performance cookies
}

export function pushToDataLayer(eventData) {
  if (!hasAnalyticsConsent()) {
    console.log('[Analytics] Consent not given, event not tracked');
    return;
  }
  
  window.dataLayer.push(eventData);
}
```

### 3. Error Handling

```javascript
export function trackError(error, context = {}) {
  try {
    pushToDataLayer({
      event: 'error',
      error_message: error.message,
      error_stack: error.stack?.substring(0, 500),
      error_context: context,
    });
  } catch (e) {
    console.error('[Analytics] Failed to track error:', e);
  }
}

// Global error handler
window.addEventListener('error', (event) => {
  trackError(event.error, {
    type: 'global_error',
