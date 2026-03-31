# Complete Analytics Requirements & Implementation
## AbbVie GTM/GA4 - Official Documentation + Current Implementation

**Project**: AbbVie Nextgen EDS Migration  
**Document Type**: Unified Analytics Specification  
**Version**: 3.0  
**Last Updated**: December 2026

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [GTM Container Codes](#gtm-container-codes)
3. [Page View Data Layer](#page-view-data-layer)
4. [Enhanced Measurement Events](#enhanced-measurement-events)
5. [Custom Events - Complete Catalog](#custom-events---complete-catalog)
6. [Current Implementation vs Requirements](#current-implementation-vs-requirements)
7. [EDS Migration Roadmap](#eds-migration-roadmap)
8. [Implementation Examples](#implementation-examples)

---

## Executive Summary

### Documentation Sources

This specification consolidates:

✅ **Official GA/GTM Guide** (v2.0, 12/7/2023)
- GTM implementation requirements
- Page view data layer structure  
- Enhanced measurement events
- Custom event specifications

✅ **Tagging Documentation** (Excel)
- Complete event catalog (25+ events)
- Event parameters and examples
- Testing status

✅ **Current Code Implementation** (Analyzed)
- Actual GTM/Adobe Data Layer usage
- Video tracking implementation
- Component data layer attributes

### Key Findings

**GAP ANALYSIS**:
- ❌ **Current**: Only video events pushed to dataLayer
- ✅ **Required**: 25+ custom events needed
- ⚠️ **Missing**: Most user interaction tracking (accordion, carousel, CTA, navigation, etc.)

---

## GTM Container Codes
### Requirement 1: GTM Container Installation

**Official Requirement**:
```html
<!-- Google Tag Manager -->
<script>
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
<!-- End Google Tag Manager -->

### All Affiliate Sites (40+ Regions)

| Container Name | Code | Region |
|---------------|------|--------|
| Affiliate\|Abbvie APAC | GTM-W92QJCT | HK, Singapore, Malaysia |
| Affiliate\|abbvie.at | GTM-K9C974N | Austria |
| Affiliate\|AbbVie.be | GTM-TWPR8CQ | Belgium |
| Affiliate\|abbvie.bg | GTM-NPK7327 | Bulgaria |
| Affiliate\|AbbVie.ca | GTM-M956KJW | Canada |
| Affiliate\|AbbVie.ch | GTM-NJTZZ3G | Switzerland |
| Affiliate\|abbvie.cl | GTM-M3RQ7FR | Chile |
| Affiliate\|abbvie.co.il | GTM-T9P4FBG | Israel |
| Affiliate\|AbbVie.co.jp | GTM-5RNDGHG | Japan |
| Affiliate\|AbbVie.co.kr | GTM-W4TT8RZ | Korea |
| Affiliate\|AbbVie.co.nz | GTM-M9BNXS3 | New Zealand |
| Affiliate\|AbbVie.co.uk | GTM-W6SQTTK | United Kingdom |
| Affiliate\|abbvie.com.ar | GTM-NT5H953 | Argentina |
| Affiliate\|AbbVie.com.au | GTM-KR6MGJS | Australia |
| Affiliate\|AbbVie.com.br | GTM-NZG6M6X | Brazil |
| Affiliate\|AbbVie.com.cn | GTM-KRZ8H53 | China |
| Affiliate\|abbvie.com.co | GTM-KJ93MCF | Colombia |
| Affiliate\|abbvie.com.mx | GTM-K7NCPZ9 | Mexico |
| Affiliate\|AbbVie.com.tr | GTM-K79956F | Turkey |
| Affiliate\|AbbVie.com.tw | GTM-K89SF2M | Taiwan |
| Affiliate\|abbvie.com.uy | GTM-WVTLXKV | Uruguay |
| Affiliate\|AbbVie.cz | GTM-585CZZJ | Czech Republic |
| Affiliate\|AbbVie.de | GTM-5DNKX79 | Germany |
| Affiliate\|AbbVie.dk | GTM-KKDWGDQ | Denmark |
| Affiliate\|AbbVie.es | GTM-PVN8RPC | Spain |
| Affiliate\|abbvie.fi | GTM-W2HPN78 | Finland |
| Affiliate\|abbvie.fr | GTM-5K9K83J | France |
| Affiliate\|abbVie.gr | GTM-NJNK2FS | Greece |
| Affiliate\|abbvie.hu | GTM-TVLPTDM | Hungary |
| Affiliate\|AbbVie.ie | GTM-KN3D4C8 | Ireland |
| Affiliate\|abbvie.in | GTM-MKWGDNSM | India |
| Affiliate\|AbbVie.it | GTM-N4HQQB8 | Italy |
| Affiliate\|AbbVie.nl | GTM-PBX3TCT | Netherlands |
| Affiliate\|AbbVie.no | GTM-NK3DC32 | Norway |
| Affiliate\|abbvie.pl | GTM-PM7MRFX | Poland |
| Affiliate\|AbbVie.pr | GTM-K6VKD8H | Puerto Rico |
| Affiliate\|AbbVie.ru | GTM-NKZFQ8F | Russia |
| Affiliate\|AbbVie.se | GTM-NG5MB7R | Sweden |
| Affiliate\|AbbVie.sk | GTM-WZQ39MW | Slovakia |
| Affiliate\|abbvie.ua | GTM-5ZXD9DM | Ukraine |

**Total**: 40+ GTM containers for global affiliates

---

## Page View Data Layer

### Required Page-Level Variables

**On Every Page Load (Above GTM script):**

```javascript
var dataLayer = dataLayer || [];

dataLayer.push({
    'event': 'page_view',
    'region': 'AMS',                    // Americas, EMEA, APAC
    'country': 'United States',         // Full country name
    'businessUnit': 'Corporate',        // Business unit
    'language': 'English',              // Language
    'siteType': '',                     // Type of site
    'siteCategory': '',                 // Site category
    'audienceCategory': '',             // Audience segment
    'consentStatus': 'Functional Active', // Cookie consent status
    'pageCategory': '',                 // Page grouping
    'pageSubCategory1': '',             // Sub-category level 1
    'pageSubCategory2': '',             // Sub-category level 2
    'conversionPageType': '',           // Conversion type
    'therapeuticArea': '',              // Therapeutic area
    'sessionID': '12345'                // Session identifier
});
```

### Current Implementation

❌ **NOT IMPLEMENTED** - Current AEM site uses Adobe Data Layer for page metadata, not these specific variables

**Migration Required**: Add these page-level variables to EDS

---

## Enhanced Measurement Events

### 1. Page Views

**Event**: `page_view`  
**Trigger**: Page load or browser history state change  
**Implementation**: See Page View Data Layer section above

### 2. Scrolls

**Event**: `scroll`  
**Trigger**: Vertical depth threshold visible  

```javascript
dataLayer.push({
  'event': 'scroll',
  'percent_scrolled': '25' // No % symbol: 25, 50, 75, 90, 100
});
```

**Current Status**: ❌ Not implemented

### 3. Site Search

**Event**: `view_search_results`  
**Trigger**: User performs search on results page  

```javascript
dataLayer.push({
  'event': 'view_search_results',
  'search_term': 'search query'
});
```

**Current Status**: ❌ Not implemented

### 4. Form Interaction

#### Form Start

**Event**: `form_start`  
**Trigger**: User first interacts with form

```javascript
dataLayer.push({
  'event': 'form_start',
  'form_destination': 'destination URL',
  'form_id': 'contact-form',
  'form_length': '5',
  'first_field_id': 'email',
  'first_field_name': 'Email Address',
  'first_field_position': '1',
  'first_field_type': 'email'
});
```

#### Form Submit

**Event**: `form_submit`  
**Trigger**: User submits form

```javascript
dataLayer.push({
  'event': 'form_submit',
  'form_destination': 'destination URL',
  'form_id': 'contact-form',
  'form_length': '5'
});
```

**Current Status**: ❌ Not implemented

### 5. Video Engagement

#### Video Start

**Event**: `video_start`

```javascript
dataLayer.push({
  'event': 'video_start',
  'video_name': 'Video Title',
  'video_url': 'video URL',
  'video_provider': 'youtube|brightcove|html5',
  'video_length': 120, // seconds
  'video_current_time': '0',
  'video_percent': '0',
  'visible': true // boolean
});
```

#### Video Progress

**Event**: `video_progress`  
**Milestones**: 25%, 50%, 75%

```javascript
dataLayer.push({
  'event': 'video_progress',
  'video_name': 'Video Title',
  'video_url': 'video URL',
  'video_provider': 'youtube|brightcove|html5',
  'video_length': 120,
  'video_current_time': 60,
  'video_percent': '50',
  'visible': true
});
```

#### Video Complete

**Event**: `video_complete`

```javascript
dataLayer.push({
  'event': 'video_complete',
  'video_name': 'Video Title',
  'video_url': 'video URL',
  'video_provider': 'youtube|brightcove|html5',
  'video_length': 120,
  'video_current_time': 120,
  'video_percent': '100',
  'visible': true
});
```

**Current Status**: ✅ **IMPLEMENTED** - All 4 video providers tracked

### 6. File Downloads

**Event**: `file_download`  
**Trigger**: Click link to common file extensions

```javascript
dataLayer.push({
  'event': 'file_download',
  'file_name': 'document.pdf',
  'file_extension': 'pdf',
  'link_text': 'Download PDF',
  'link_url': '/path/to/file.pdf'
});
```

**Current Status**: ⚠️ Partially implemented (tracked via GTM auto-detection)

---

## Custom Events - Complete Catalog

### 1. Accordion

**Purpose**: Track accordion interactions  
**Event**: `accordion`

```javascript
dataLayer.push({
  'event': 'accordion',
  'user_action': 'open', // open, close, collapse all, expand all
  'accordion_title': 'clinical trial operations'
});
```

**Examples**:
- `user_action`: open, accordion close, accordion collapse all, accordion expand all
- `accordion_title`: clinical trial operations, if i qualify how long can i receive free medicine

**Current Status**: ❌ Not implemented

---

### 2. Anchor Link

**Purpose**: Track same-page navigation  
**Event**: `anchor_link`

```javascript
dataLayer.push({
  'event': 'anchor_link',
  'link_text': 'K',
  'anchor_link_fragment': 'k-tab'
});
```

**Examples**:
- `link_text`: Learn More, L, K
- `anchor_link_fragment`: section1, lastacaft, k-tab

**Current Status**: ❌ Not implemented

---

### 3. Back to Top

**Purpose**: Track back-to-top button clicks  
**Event**: `back_to_top`

```javascript
dataLayer.push({
  'event': 'back_to_top',
  'percent_scrolled': '25',
  'site_section': 'pipeline'
});
```

**Current Status**: ❌ Not implemented

---

### 4. Card CTA

**Purpose**: Track card CTA clicks  
**Event**: `card_cta`

```javascript
dataLayer.push({
  'event': 'card_cta',
  'card_title': 'myabbvie assist',
  'link_url': 'https://www.abbvie.com/patients/patient-support/patient-assistance.html',
  'event_location': 'body', // body or menu
  'menu_section': 'join us' // if in menu
});
```

**Examples**:
- `event_location`: body, menu|join us, menu|patients, menu|science
- `card_title`: myabbvie assist, patient support

**Current Status**: ❌ Not implemented

---

### 5. Carousel

**Purpose**: Track carousel interactions  
**Event**: `carousel`

```javascript
dataLayer.push({
  'event': 'carousel',
  'user_action': 'arrow-left', // arrow-left, arrow-next, arrow-previous, arrow-right
  'link_url': 'https://www.abbvie.com/who-we-are.html'
});
```

**Current Status**: ❌ Not implemented

---

### 6. Contact

**Purpose**: Track contact link clicks  
**Event**: `contact`

```javascript
dataLayer.push({
  'event': 'contact',
  'link_text': '1-800-222-6885' // or email address
});
```

**Examples**:
- `link_text`: 1-800-222-6885, customerservice@abbvie.com, (800) 225-5162

**Current Status**: ❌ Not implemented

---

### 7. CTA (Call-to-Action)

**Purpose**: Track CTA clicks in body, utility nav, footer  
**Event**: `cta`

```javascript
dataLayer.push({
  'event': 'cta',
  'event_location': 'utility nav', // body, utility nav, footer
  'link_text': 'go to page',
  'link_url': 'www.abbvie.com/science.html'
});
```

**Examples**:
- `event_location`: utility nav, body, footer
- `link_text`: go to page, learn more, contact us

**Current Status**: ❌ Not implemented

---

### 8. Download

**Purpose**: Track file downloads  
**Event**: `download`

```javascript
dataLayer.push({
  'event': 'download',
  'link_url': '/content/dam/abbvie-dotcom/uploads/pdfs/pap/eye-care-application.pdf'
});
```

**Note**: GA4 auto-tracks downloads, but custom implementation recommended

**Current Status**: ⚠️ Auto-tracked by GA4

---

### 9. Exit

**Purpose**: Track external link clicks  
**Event**: `exit`

```javascript
dataLayer.push({
  'event': 'exit',
  'event_location': 'body', // body, footer, utility nav
  'link_text': 'go to page',
  'link_url': 'https://global.allerganaesthetics.com/',
  'page_path': '/who-we-are',
  'site_section': 'Who We Are'
});
```

**Current Status**: ❌ Not implemented

---

### 10. Footer

**Purpose**: Track footer link clicks  
**Event**: `footer`

```javascript
dataLayer.push({
  'event': 'footer',
  'link_text': 'contact us',
  'link_url': 'https://www.abbvie.com/contact-center.html'
});
```

**Examples**:
- `link_text`: contact us, products, patient support

**Current Status**: ❌ Not implemented

---

### 11. Main Navigation

**Purpose**: Track main menu interactions  
**Event**: `main_navigation`

```javascript
dataLayer.push({
  'event': 'main_navigation',
  'menu_details': 'join us', // tab name or card cta
  'link_text': 'search opportunities',
  'link_url': 'careers.abbvie.com/'
});
```

**Examples**:
- `menu_details`: card cta, join us, patients, science, sustainability, who we are
- `link_text`: search opportunities, student programs, products

**Current Status**: ❌ Not implemented

---

### 12. Pipeline

**Purpose**: Track pipeline product interactions  
**Event**: `pipeline`

```javascript
dataLayer.push({
  'event': 'pipeline',
  'product_name': 'abbv-154',
  'user_action': 'share link', // accordion open/close, audio file, share link
  'link_url': 'URL if applicable'
});
```

**Examples**:
- `product_name`: abbv-154, botox®, abbv-951, abbv-599
- `user_action`: accordion open, accordion close, audio file, share link

**Current Status**: ❌ Not implemented

---

### 13. Product

**Purpose**: Track product list interactions  
**Event**: `product`

```javascript
dataLayer.push({
  'event': 'product',
  'product_name': 'actigall',
  'user_action': 'share link', // or download
  'link_url': 'URL if applicable'
});
```

**Examples**:
- `product_name`: actigall, humira, botox_therapeutic, actonel
- `user_action`: accordion close, accordion open, download, share link

**Current Status**: ❌ Not implemented

---

### 14. Related Content

**Purpose**: Track related content clicks  
**Event**: `related_content`

```javascript
dataLayer.push({
  'event': 'related_content',
  'article_title': 'life at abbvie',
  'link_url': 'www.abbvie.com/join-us/life-at-abbvie.html',
  'event_location': 'right rail', // right rail or bottom
  'percent_scrolled': '25',
  'article_read_time': '4 minutes',
  'article_tag': 'Science',
  'article_date': 'March 24, 2022'
});
```

**Current Status**: ❌ Not implemented

---

### 15. Scroll Depth

**Purpose**: Track scroll depth  
**Event**: `scroll depth`  
**Category**: `scroll depth`  
**Action**: `percentage`

```javascript
dataLayer.push({
  'event': 'scroll',
  'percent_scrolled': '25' // 25, 50, 75, 100
});
```

**Current Status**: ❌ Not implemented

---

### 16. Timeline

**Purpose**: Track timeline page interactions  
**Event**: `timeline`

```javascript
dataLayer.push({
  'event': 'timeline',
  'user_action': 'year_selected', // cta, year selected, video open
  'link_text': '2014',
  'link_url': 'URL or video embed URL'
});
```

**Examples**:
- `user_action`: cta, year selected, video open
- `link_text`: 2014, stories.abbvie.com/...

**Current Status**: ❌ Not implemented

---

### 17. Utility Navigation

**Purpose**: Track utility nav interactions  
**Event**: `utility_navigation`

```javascript
dataLayer.push({
  'event': 'utility_navigation',
  'menu_details': 'popular pages', // menu tab
  'link_text': 'patient support',
  'link_url': 'https://www.abbvie.com/patients/patient-support.html'
});
```

**Examples**:
- `menu_details`: popular pages, north america
- `link_text`: search opportunities, patient support, united states, products

**Current Status**: ❌ Not implemented

---

### 18. Video (Interaction)

**Purpose**: Track video progress  
**Event**: `video`  
**Action**: Video interaction type

```javascript
dataLayer.push({
  'event': 'video',
  'video_interaction': 'start', // start, progress 25, progress 50, progress 75, complete
  'video_title': 'our principles'
});
```

**Note**: This is the legacy format. New format uses separate events (video_start, video_progress, video_complete)

**Current Status**: ✅ **IMPLEMENTED** (using new format)

---

## Current Implementation vs Requirements

### ✅ Currently Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| GTM Container | ✅ | Dynamic per-site GTM ID |
| Video Tracking | ✅ | All 4 providers (YouTube, Brightcove, IM, DM) |
| Video Events | ✅ | start, progress (25/50/75), complete, pause |
| Podcast Tracking | ✅ | Brightcove audio tracking |


### ❌ Missing / Not Implemented

| Feature | Priority | Effort |
|---------|----------|--------|
| Page View Variables | High | Medium |
| Scroll Tracking | High | Low |
| Form Tracking | High | Medium |
| Site Search | High | Low |
| Accordion Events | Medium | Low |
| Carousel Events | Medium | Low |
| CTA Tracking | High | Medium |
| Navigation Tracking | High | Medium |
| Footer Tracking | Low | Low |
| Card CTA | Medium | Low |
| Contact Tracking | Low | Low |
| Download Events | Low | Low (auto-tracked) |
| Exit Link Tracking | Medium | Medium |
| Pipeline Events | Low | Medium |
| Product Events | Low | Medium |
| Related Content | Low | Low |
| Timeline Events | Low | Low |
| Utility Nav | Medium | Low |
| Back to Top | Low | Low |
| Anchor Links | Low | Low |

### Summary Statistics

- **Total Required Events**: 25+
- **Currently Implemented**: 1 (video only)
- **Missing**: 24+ events
- **Implementation Gap**: ~96%

---

## EDS Migration Roadmap

### Phase 1: Core Setup (Week 1)

**Priority: Critical**

```javascript
// 1. Initialize data layer with page variables
window.dataLayer = window.dataLayer || [];

dataLayer.push({
  'event': 'page_view',
  'region': getRegion(),
  'country': getCountry(),
  'language': document.documentElement.lang,
  'sessionID': getSessionId(),
  // ... other page variables
});

// 2. Keep existing video tracking
// Already implemented - migrate as-is
```

### Phase 2: Enhanced Measurement (Week 2)

**Priority: High**

1. ✅ Scroll tracking
2. ✅ Form start/submit
3. ✅ Site search
4. ✅ File downloads (verify auto-tracking)

### Phase 3: User Interactions (Week 3-4)

**Priority: High**

1. ✅ CTA tracking (body, utility nav, footer)
2. ✅ Main navigation
3. ✅ Exit links
4. ✅ Footer links

### Phase 4: Component Interactions (Week 5-6)

**Priority: Medium**

1. ✅ Accordion
2. ✅ Carousel  
3. ✅ Card CTA
4. ✅ Utility navigation
5. ✅ Related content

### Phase 5: Specialized Tracking (Week 7-8)

**Priority: Low**

1. ✅ Pipeline interactions
2. ✅ Product interactions
3. ✅ Timeline
4. ✅ Back to top
5. ✅ Anchor links
6. ✅ Contact links

---

## Implementation Examples

### Hero Block with All Tracking

```javascript
export default function decorate(block) {
  const heroTitle = block.querySelector('h1')?.textContent;
  
  // Track impression
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        window.dataLayer.push({
          event: 'component_view',
          component_type: 'hero',
          component_title: heroTitle
        });
        observer.disconnect();
      }
    });
  }, { threshold: 0.5 });
  
  observer.observe(block);
  
  // Track CTA clicks
  block.querySelectorAll('.button').forEach((button, index) => {
    button.addEventListener('click', () => {
      window.dataLayer.push({
        event: 'cta',
        event_location: 'body',
        link_text: button.textContent,
        link_url: button.href
      });
    });
  });
}
```

### Accordion Block with Tracking

```javascript
export default function decorate(block) {
  const items = block.querySelectorAll('.accordion-item');
  
  items.forEach((item) => {
    const button = item.querySelector('.accordion-button');
    
    button.addEventListener('click', () => {
      const isExpanding = !item.classList.contains('active');
      
      window.dataLayer.push({
        event: 'accordion',
        user_action: isExpanding ? 'open' : 'close',
        accordion_title: button.textContent
      });
    });
  });
}
```

### Form Block with Complete Tracking

```javascript
export default function decorate(block) {
  const form = block.querySelector('form');
  if (!form) return;
  
  const formId = form.id || 'unnamed';
  let formStarted = false;
  
  // Track form start (first interaction)
  form.addEventListener('focus', (e) => {
    if (!formStarted) {
      formStarted = true;
      
      const firstField = e.target;
      const formFields = form.querySelectorAll('input, select, textarea');
      
      window.dataLayer.push({
        event: 'form_start',
        form_id: formId,
        form_destination: form.action,
        form_length: formFields.length.toString(),
        first_field_id: firstField.id,
        first_field_name: firstField.name,
        first_field_type: firstField.type,
        first_field_position: Array.from(formFields).indexOf(firstField) + 1
      });
    }
  }, true);
  
  // Track form submit
  form.addEventListener('submit', () => {
    window.dataLayer.push({
      event: 'form_submit',
      form_id: formId,
      form_destination: form.action,
      form_length: form.querySelectorAll('input, select, textarea').length.toString()
    });
  });
}
```

### Navigation with Tracking

```javascript
export default function decorate(block) {
  // Track main nav clicks
  block.querySelectorAll('.nav-item a').forEach((link) => {
    link.addEventListener('click', () => {
      const menuTab = link.closest('[data-menu-section]')?.dataset.menuSection;
      
      window.dataLayer.push({
        event: 'main_navigation',
        menu_details: menuTab || 'main',
        link_text: link.textContent,
        link_url: link.href
      });
    });
  });
  
  // Track utility nav clicks
  block.querySelectorAll('.utility-nav a').forEach((link) => {
    link.addEventListener('click', () => {
      window.dataLayer.push({
        event: 'utility_navigation',
        menu_details: link.closest('[data-menu-title]')?.dataset.menuTitle || '',
        link_text: link.textContent,
        link_url: link.href
      });
    });
  });
}
```

---

## Next Steps

### Immediate Actions

1. ✅ Review this specification with analytics team
2. ✅ Prioritize events based on business needs
3. ✅ Create implementation tickets
4. ✅ Set up GTM workspace for EDS
5. ✅ Begin Phase 1 implementation

### Testing Strategy

1. **GTM Preview Mode**: Test all events
2. **GA4 DebugView**: Verify event parameters
3. **Tag Inspector**: Scan entire site
4. **Real User Testing**: Validate in production

### Documentation Updates

- Update GTM container documentation
- Create event catalog in GTM
- Document custom dimensions/metrics
- Training materials for authors

---

## Appendix


### Official Source Documents

- `AbbVie Corp _ Affiliate Sites _ GA_GTM dL Guide v2.docx` - GA/GTM guide
- `AbbVie Corp _ New Site www.abbvie.com & affiliates Tagging Documentation.xlsx` - Event specs

---

**Document Status**: Complete  
**Implementation Gap**: 96% (24 of 25 events not implemented)  
**Recommended Timeline**: 8 weeks for full implementation
