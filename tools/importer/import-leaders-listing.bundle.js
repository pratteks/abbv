var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-leaders-listing.js
  var import_leaders_listing_exports = {};
  __export(import_leaders_listing_exports, {
    default: () => import_leaders_listing_default
  });

  // tools/importer/parsers/utils/analytics.js
  function extractAnalytics(element) {
    if (!element) return {};
    const attrs = {};
    const cmpDataLayer = element.getAttribute("data-cmp-data-layer");
    if (cmpDataLayer) {
      try {
        const layerData = JSON.parse(cmpDataLayer);
        const componentId = Object.keys(layerData)[0];
        if (componentId && layerData[componentId]) {
          const data = layerData[componentId];
          if (data["@type"]) attrs["data-analytics-type"] = data["@type"];
          if (data["dc:title"]) attrs["data-analytics-title"] = data["dc:title"];
          if (data["xdm:linkURL"]) attrs["data-analytics-link"] = data["xdm:linkURL"];
        }
      } catch (e) {
      }
    }
    const track = element.getAttribute("data-track");
    if (track) attrs["data-analytics-track"] = track;
    const trackClick = element.getAttribute("data-track-click");
    if (trackClick) attrs["data-analytics-click"] = trackClick;
    const trackImpression = element.getAttribute("data-track-impression");
    if (trackImpression) attrs["data-analytics-impression"] = trackImpression;
    const analytics = element.getAttribute("data-analytics");
    if (analytics) attrs["data-analytics-label"] = analytics;
    const contentName = element.getAttribute("data-content-name");
    if (contentName) attrs["data-analytics-content-name"] = contentName;
    const contentType = element.getAttribute("data-content-type");
    if (contentType) attrs["data-analytics-content-type"] = contentType;
    const linkType = element.getAttribute("data-link-type");
    if (linkType) attrs["data-analytics-link-type"] = linkType;
    const linkText = element.getAttribute("data-link-text");
    if (linkText) attrs["data-analytics-link-text"] = linkText;
    const componentTitle = element.getAttribute("data-component-title");
    if (componentTitle) attrs["data-analytics-component-title"] = componentTitle;
    return attrs;
  }
  function applyAnalytics(sourceElement, blockElement, document) {
    if (!sourceElement || !blockElement) return;
    const attrs = extractAnalytics(sourceElement);
    const container = sourceElement.closest("[data-cmp-data-layer]");
    if (container && container !== sourceElement) {
      const containerAttrs = extractAnalytics(container);
      Object.keys(containerAttrs).forEach((key) => {
        if (!attrs[key]) attrs[key] = containerAttrs[key];
      });
    }
    Object.keys(attrs).forEach((key) => {
      blockElement.setAttribute(key, attrs[key]);
    });
  }

  // tools/importer/parsers/cards-leader.js
  function parse(element, { document }) {
    if (!element.parentElement) return;
    const allCards = document.querySelectorAll(".cardpagestory");
    if (allCards.length === 0) {
      element.replaceWith(document.createTextNode(""));
      return;
    }
    const cells = [];
    const gridsToRemove = /* @__PURE__ */ new Set();
    allCards.forEach((card) => {
      const grid = card.closest(".grid");
      if (grid) gridsToRemove.add(grid);
      const link = card.querySelector("a[href]");
      const img = card.querySelector("img");
      const nameEl = card.querySelector("h4.card-title") || card.querySelector("h4");
      const descEl = card.querySelector("p.card-description") || card.querySelector("p");
      const ctaEl = card.querySelector(".card-cta") || card.querySelector("span");
      const imgFrag = document.createDocumentFragment();
      imgFrag.appendChild(document.createComment(" field:image "));
      if (img) {
        const p = document.createElement("p");
        const imgEl = document.createElement("img");
        imgEl.src = img.src;
        imgEl.alt = img.alt || "";
        p.appendChild(imgEl);
        imgFrag.appendChild(p);
      }
      const textFrag = document.createDocumentFragment();
      textFrag.appendChild(document.createComment(" field:text "));
      if (nameEl) {
        const p = document.createElement("p");
        const strong = document.createElement("strong");
        strong.textContent = nameEl.textContent.trim();
        p.appendChild(strong);
        textFrag.appendChild(p);
      }
      if (descEl) {
        const p = document.createElement("p");
        p.textContent = descEl.textContent.trim();
        textFrag.appendChild(p);
      }
      if (ctaEl && link) {
        const p = document.createElement("p");
        const a = document.createElement("a");
        a.href = link.href;
        a.textContent = ctaEl.textContent.trim();
        p.appendChild(a);
        textFrag.appendChild(p);
      }
      cells.push([imgFrag, textFrag]);
    });
    if (cells.length === 0) {
      element.replaceWith(document.createTextNode(""));
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-leader", cells });
    applyAnalytics(element, block, document);
    const firstGrid = gridsToRemove.values().next().value;
    if (firstGrid && firstGrid.parentElement) {
      firstGrid.before(block);
      gridsToRemove.forEach((g) => {
        if (g.parentElement) g.remove();
      });
    } else {
      element.replaceWith(block);
    }
  }

  // tools/importer/transformers/abbvie-cleanup.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
      WebImporter.DOMUtils.remove(element, [
        "#onetrust-consent-sdk",
        '[class*="cookie"]',
        ".popup-overlay",
        ".modal-backdrop",
        '[role="dialog"]',
        '[role="alertdialog"]'
      ]);
      WebImporter.DOMUtils.remove(element, [
        "header",
        "footer",
        ".cmp-experiencefragment--footer",
        ".cmp-experiencefragment--header",
        '[class*="experiencefragment--footer"]',
        '[class*="experiencefragment--header"]',
        '[class*="footer-overlap"]',
        "nav.cmp-breadcrumb",
        ".abbvie-breadcrumb",
        ".breadcrumb",
        ".breadcrumb-drop-title",
        '[class*="back-to-top"]',
        ".skip-to-main-content",
        'a[href="#maincontent"]',
        '[class*="sticky-nav"]'
      ]);
      element.querySelectorAll('.cmp-video, [data-abbvie-cmp="video-embed"]').forEach((cmpVideo) => {
        const bcEl = cmpVideo.querySelector("[data-video-id]");
        if (bcEl) {
          const account = bcEl.getAttribute("data-account");
          const player = bcEl.getAttribute("data-player");
          const videoId = bcEl.getAttribute("data-video-id");
          if (account && player && videoId) {
            cmpVideo.setAttribute(
              "data-video-url",
              `https://players.brightcove.net/${account}/${player}_default/index.html?videoId=${videoId}`
            );
          }
        }
        if (!cmpVideo.hasAttribute("data-video-url")) {
          const ytEl = cmpVideo.querySelector('[data-iframesrc*="youtube"]');
          if (ytEl) {
            const src = ytEl.getAttribute("data-iframesrc");
            const match = src && src.match(/embed\/([a-zA-Z0-9_-]+)/);
            if (match) {
              cmpVideo.setAttribute(
                "data-video-url",
                `https://www.youtube.com/watch?v=${match[1]}`
              );
            }
          }
        }
        const overlay = cmpVideo.querySelector(".cmp-video__text-content-outside");
        if (overlay) {
          const titleEl = overlay.querySelector("h1, h2, h3, h4, h5, h6");
          if (titleEl) cmpVideo.setAttribute("data-overlay-title", titleEl.textContent.trim());
          const descEl = overlay.querySelector("p");
          if (descEl) cmpVideo.setAttribute("data-overlay-desc", descEl.textContent.trim());
        }
        const watchBtn = cmpVideo.querySelector('.cmp-video__container-btn-play button, .cmp-video__panel button[class*="play"], .cmp-video__panel .cmp-button');
        if (watchBtn) {
          const btnText = watchBtn.textContent.trim();
          if (btnText) cmpVideo.setAttribute("data-overlay-btn", btnText);
        }
      });
      WebImporter.DOMUtils.remove(element, [
        ".video-js",
        "video-js",
        '[class*="vjs-"]',
        '[class*="bc-player"]',
        ".cmp-video__overlay",
        ".cmp-video__play-btn",
        ".cmp-video__container",
        ".cmp-video__text-content-outside",
        ".cmp-video__video-wrapper"
      ]);
      WebImporter.DOMUtils.remove(element, [
        ".cmp-popup",
        '[class*="warnonthirdparty"]',
        '[class*="warn-on-"]',
        '[class*="gdprocesschange"]',
        ".popup-container"
      ]);
      WebImporter.DOMUtils.remove(element, [
        'img[src*="t.co/i/adsct"]',
        'img[src*="analytics.twitter.com"]',
        'img[src*="bing.com/c.gif"]',
        'img[src*="doubleclick.net"]',
        'img[src*="facebook.com/tr"]',
        'img[src*="ads.linkedin.com"]',
        "noscript",
        "script",
        "link"
      ]);
      element.querySelectorAll("p, div, span").forEach((el) => {
        const text = el.textContent.trim();
        if (text === "No results found" || text === "Change your search criteria." || text === "No results found\nChange your search criteria.") {
          el.remove();
        }
      });
      if (element.style && element.style.overflow === "hidden") {
        element.style.overflow = "scroll";
      }
      element.querySelectorAll('img[src^="blob:"], a[href^="blob:"]').forEach((el) => {
        el.remove();
      });
      WebImporter.DOMUtils.remove(element, [
        'iframe:not([src*="youtube"])'
      ]);
      element.querySelectorAll("[data-cmp-data-layer]").forEach((el) => {
        const raw = el.getAttribute("data-cmp-data-layer");
        if (raw) {
          try {
            const layerData = JSON.parse(raw);
            const componentId = Object.keys(layerData)[0];
            if (componentId && layerData[componentId]) {
              const data = layerData[componentId];
              if (data["@type"]) el.setAttribute("data-analytics-type", data["@type"]);
              if (data["dc:title"]) el.setAttribute("data-analytics-title", data["dc:title"]);
              if (data["xdm:linkURL"]) el.setAttribute("data-analytics-link", data["xdm:linkURL"]);
            }
          } catch (e) {
            console.warn("Malformed data-cmp-data-layer JSON, stripping attribute:", e.message);
          }
          el.removeAttribute("data-cmp-data-layer");
        }
      });
    }
    if (hookName === TransformHook.afterTransform) {
      element.querySelectorAll("*").forEach((el) => {
        const cmpDataLayer = el.getAttribute("data-cmp-data-layer");
        if (cmpDataLayer) {
          try {
            const layerData = JSON.parse(cmpDataLayer);
            const componentId = Object.keys(layerData)[0];
            if (componentId && layerData[componentId]) {
              const data = layerData[componentId];
              if (data["@type"]) el.setAttribute("data-analytics-type", data["@type"]);
              if (data["dc:title"]) el.setAttribute("data-analytics-title", data["dc:title"]);
              if (data["xdm:linkURL"]) el.setAttribute("data-analytics-link", data["xdm:linkURL"]);
            }
          } catch (e) {
          }
          el.removeAttribute("data-cmp-data-layer");
        }
        const track = el.getAttribute("data-track");
        if (track) {
          el.setAttribute("data-analytics-track", track);
          el.removeAttribute("data-track");
        }
        const analytics = el.getAttribute("data-analytics");
        if (analytics) {
          el.setAttribute("data-analytics-label", analytics);
          el.removeAttribute("data-analytics");
        }
        el.removeAttribute("onclick");
        el.removeAttribute("data-abbvie-cmp");
      });
      element.querySelectorAll(".body-unica-32-reg, .body-unica-20-reg, .body-unica-18-reg, .light-font").forEach((span) => {
        if (span.parentElement) {
          span.replaceWith(...span.childNodes);
        }
      });
      element.querySelectorAll('a[href="#maincontent"]').forEach((a) => {
        const p = a.closest("p") || a;
        p.remove();
      });
    }
  }

  // tools/importer/transformers/sections.js
  var TransformHook2 = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  var LANDING_PAGE_SECTIONS = [
    {
      // Hero section: after hero parser, .overlap-predecessor is replaced and its
      // prev sibling (bg image container) is removed. Insert navy-overlap break
      // BEFORE the featured video container so the hero gets its own section.
      selector: ".container.cmp-container-full-width.height-short:not(.no-bottom-margin):not(.medium-radius)",
      position: "before",
      style: "navy-overlap"
    },
    {
      // Separate unstyled content (featured video, cards) from dark quote section
      selector: ".container.semi-transparent-layer",
      fallback: ".container.semi-transparent-layer.large-radius",
      position: "before",
      style: null
    },
    {
      // End dark section after quote
      selector: ".container.semi-transparent-layer",
      fallback: ".container.semi-transparent-layer.large-radius",
      style: "dark"
    },
    {
      // Separate unstyled content (explore, embed, FAQ) from navy CTA
      selector: ".container.medium-radius.cmp-container-full-width.height-short.no-bottom-margin:last-of-type",
      position: "before",
      style: null
    },
    {
      // End navy section after CTA
      selector: ".container.medium-radius.cmp-container-full-width.height-short.no-bottom-margin:last-of-type",
      fallback: null,
      style: "navy"
    }
  ];
  var LEADERS_LISTING_SECTIONS = [
    {
      // Hero section: navy background bar + overlap predecessor with title/paragraph
      selector: ".overlap-predecessor",
      fallback: ".container.large-radius.cmp-container-full-width.height-short.no-bottom-margin",
      style: "navy-overlap"
    }
  ];
  var LEADER_PROFILE_SECTIONS = [
    {
      // Hero section: navy background bar + overlap predecessor with name/title
      selector: ".overlap-predecessor",
      fallback: ".container.medium-radius.cmp-container-full-width.height-short.no-bottom-margin",
      style: "navy-overlap"
    }
  ];
  var CONTENT_SERIES_SECTIONS = [
    {
      // Hero section: .overlap-predecessor is replaced by hero parser,
      // so insert hero section break BEFORE the featured video container
      selector: ".container.cmp-container-full-width.height-short:not(.medium-radius)",
      position: "before",
      style: "navy-overlap"
    },
    {
      // Featured video + video cards section (dark background)
      selector: ".container.cmp-container-full-width.height-short:not(.medium-radius)",
      style: "dark"
    },
    {
      // Dive deeper navigation section (no style, just a section break)
      selector: ".container.no-bottom-margin:not(.cmp-container-full-width):not(.height-short):not(.overlap-predecessor)",
      style: null
    },
    {
      // CTA banner
      selector: ".container.medium-radius.cmp-container-full-width.height-short.no-bottom-margin:last-of-type",
      style: "navy"
    }
  ];
  var SCIENCE_HUB_SECTIONS = [
    // Hero section: .overlap-predecessor replaced by hero parser, prev sibling removed.
    // Insert navy-overlap break BEFORE the teaser (next element after hero block).
    {
      selector: ".teaser.light-theme",
      position: "before",
      style: "navy-overlap"
    },
    // Separate teaser (default content) from dark dashboard section
    {
      selector: ".container.large-radius.cmp-container-full-width.height-default.no-bottom-margin",
      position: "before",
      style: null
    },
    // End dark dashboard + focus areas section
    {
      selector: ".container.large-radius.cmp-container-full-width.height-default.no-bottom-margin",
      style: "dark"
    },
    // Separate video embed from explore section
    {
      selector: ".container.cmp-container-full-width.height-default.no-bottom-margin.no-padding",
      position: "before",
      style: null
    },
    // Separate explore from tenacity section
    {
      selector: ".container.default-radius.cmp-container-xxx-large",
      position: "before",
      style: null
    },
    // Separate tenacity from stories+FAQ section
    {
      selector: ".container.abbvie-container.no-bottom-margin.no-padding:not(.cmp-container-full-width)",
      position: "before",
      style: null
    },
    // Separate stories+FAQ from CTA section
    {
      selector: ".container.cmp-container-full-width.height-default.no-bottom-margin:last-of-type",
      position: "before",
      style: null
    }
  ];
  function getSectionsForTemplate(templateName) {
    if (templateName === "science-hub") return SCIENCE_HUB_SECTIONS;
    if (templateName === "content-series") return CONTENT_SERIES_SECTIONS;
    if (templateName === "leaders-listing") return LEADERS_LISTING_SECTIONS;
    if (templateName === "leader-profile") return LEADER_PROFILE_SECTIONS;
    return LANDING_PAGE_SECTIONS;
  }
  function transform2(hookName, element, payload) {
    if (hookName !== TransformHook2.afterTransform) return;
    const { document } = payload;
    const templateName = payload.template ? payload.template.name : "landing-page";
    const sections = getSectionsForTemplate(templateName);
    sections.forEach(({ selector, fallback, style, position }) => {
      const sectionEl = element.querySelector(selector) || fallback && element.querySelector(fallback);
      if (!sectionEl) return;
      if (position === "before") {
        const hr = document.createElement("hr");
        if (style) {
          const cells = [["style", style]];
          const metaBlock = WebImporter.Blocks.createBlock(document, {
            name: "Section Metadata",
            cells
          });
          sectionEl.before(metaBlock);
          sectionEl.before(hr);
        } else {
          sectionEl.before(hr);
        }
      } else {
        let insertAfter = sectionEl;
        if (style) {
          const cells = [["style", style]];
          const metaBlock = WebImporter.Blocks.createBlock(document, {
            name: "Section Metadata",
            cells
          });
          insertAfter.after(metaBlock);
          insertAfter = metaBlock;
        }
        const hr = document.createElement("hr");
        insertAfter.after(hr);
      }
    });
  }

  // tools/importer/import-leaders-listing.js
  var parsers = {
    "cards-leader": parse
  };
  var PAGE_TEMPLATE = {
    name: "leaders-listing",
    description: "R&D Leaders listing page with hero header and grid of leader profile cards",
    urls: [
      "https://www.abbvie.com/science/our-people/our-rd-leaders.html"
    ],
    blocks: [
      {
        name: "cards-leader",
        instances: [".cardpagestory.card-standard.card-small"]
      }
    ],
    sections: [
      {
        id: "section-1-hero",
        name: "Hero Header",
        selector: [
          ".container.large-radius.cmp-container-full-width.height-short.no-bottom-margin",
          ".container.overlap-predecessor.medium-radius.cmp-container-xx-large"
        ],
        style: "navy-overlap",
        blocks: [],
        defaultContent: [
          ".title.cmp-title-xx-large h1",
          ".text.cmp-text-xx-large p"
        ]
      },
      {
        id: "section-2-leader-cards",
        name: "Leader Profile Cards",
        selector: ".grid.aem-GridColumn.aem-GridColumn--default--12",
        style: null,
        blocks: ["cards-leader"],
        defaultContent: []
      }
    ]
  };
  var transformers = [
    transform,
    ...PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [transform2] : []
  ];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), {
      template: PAGE_TEMPLATE
    });
    transformers.forEach((transformerFn) => {
      try {
        transformerFn.call(null, hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function findBlocksOnPage(document, template) {
    const pageBlocks = [];
    template.blocks.forEach((blockDef) => {
      blockDef.instances.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        if (elements.length === 0) {
          console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
        }
        elements.forEach((element) => {
          pageBlocks.push({
            name: blockDef.name,
            selector,
            element,
            section: blockDef.section || null
          });
        });
      });
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  var import_leaders_listing_default = {
    transform: (payload) => {
      const { document, url, html, params } = payload;
      const main = document.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
      pageBlocks.forEach((block) => {
        const parser = parsers[block.name];
        if (parser) {
          try {
            parser(block.element, { document, url, params });
          } catch (e) {
            console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
          }
        } else {
          console.warn(`No parser found for block: ${block.name}`);
        }
      });
      executeTransformers("afterTransform", main, payload);
      const hr = document.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const path = WebImporter.FileUtils.sanitizePath(
        new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html$/, "")
      );
      return [{
        element: main,
        path,
        report: {
          title: document.title,
          template: PAGE_TEMPLATE.name,
          blocks: pageBlocks.map((b) => b.name)
        }
      }];
    }
  };
  return __toCommonJS(import_leaders_listing_exports);
})();
