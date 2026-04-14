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

  // tools/importer/import-clinical-trials.js
  var import_clinical_trials_exports = {};
  __export(import_clinical_trials_exports, {
    default: () => import_clinical_trials_default
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

  // tools/importer/parsers/hero.js
  function parse(element, { document }) {
    const prevSibling = element.previousElementSibling;
    const bgPicture = (prevSibling == null ? void 0 : prevSibling.querySelector("picture")) || (prevSibling == null ? void 0 : prevSibling.querySelector(".cmp-container__bg-image")) || (prevSibling == null ? void 0 : prevSibling.querySelector("img"));
    const heading = element.querySelector(".cmp-title h1, h1, .cmp-title h2, h2");
    const description = element.querySelector(".cmp-text p, .cmp-text");
    const cells = [];
    const imgFrag = document.createDocumentFragment();
    imgFrag.appendChild(document.createComment(" field:image "));
    if (bgPicture) {
      const pic = bgPicture.tagName === "PICTURE" ? bgPicture : bgPicture.closest("picture") || bgPicture;
      imgFrag.appendChild(pic);
    }
    cells.push([imgFrag]);
    const textFrag = document.createDocumentFragment();
    textFrag.appendChild(document.createComment(" field:text "));
    if (heading) textFrag.appendChild(heading);
    if (description) textFrag.appendChild(description);
    cells.push([textFrag]);
    const block = WebImporter.Blocks.createBlock(document, { name: "hero", cells });
    applyAnalytics(element, block, document);
    element.replaceWith(block);
    if (prevSibling) prevSibling.remove();
  }

  // tools/importer/parsers/columns.js
  function parse2(element, { document }) {
    const gridRow = element.querySelector(".grid-row") || element;
    const allCols = Array.from(
      gridRow.querySelectorAll('[class*="grid-row__col-with-"]')
    );
    const contentCols = allCols.filter((col) => {
      const widthMatch = col.className.match(/grid-row__col-with-(\d+)/);
      const colWidth = widthMatch ? parseInt(widthMatch[1], 10) : 0;
      const hasContent = col.textContent.trim().length > 0 || col.querySelector("img, picture, video");
      return hasContent && (colWidth > 1 || col.textContent.trim().length > 0);
    });
    if (contentCols.length === 0) {
      const fallbackCols = Array.from(element.children).filter(
        (c) => c.textContent.trim().length > 0
      );
      if (fallbackCols.length === 0) {
        element.replaceWith(document.createTextNode(""));
        return;
      }
      const row2 = fallbackCols.map((col) => {
        const frag = document.createDocumentFragment();
        while (col.firstChild) frag.appendChild(col.firstChild);
        return frag;
      });
      const block2 = WebImporter.Blocks.createBlock(document, { name: "columns", cells: [row2] });
      applyAnalytics(element, block2, document);
      element.replaceWith(block2);
      return;
    }
    contentCols.forEach((col) => {
      const cmpVideo = col.querySelector("[data-video-url]");
      if (!cmpVideo) return;
      const videoUrl = cmpVideo.getAttribute("data-video-url");
      const watchBtn = cmpVideo.querySelector('button[aria-label*="Watch"]') || Array.from(cmpVideo.querySelectorAll("button")).find((b) => b.textContent.includes("Watch"));
      if (watchBtn && videoUrl) {
        const a = document.createElement("a");
        a.href = videoUrl;
        a.textContent = watchBtn.textContent.trim();
        const p = document.createElement("p");
        p.appendChild(a);
        watchBtn.replaceWith(p);
      }
    });
    contentCols.forEach((col) => {
      col.querySelectorAll("img").forEach((img) => {
        var _a;
        if (!img.alt || img.alt === "") {
          const cmpImage = img.closest(".cmp-image");
          const altFromTitle = (cmpImage == null ? void 0 : cmpImage.getAttribute("title")) || (cmpImage == null ? void 0 : cmpImage.getAttribute("data-title"));
          if (altFromTitle) {
            img.alt = altFromTitle;
            return;
          }
          const ariaLabel = img.getAttribute("aria-label") || ((_a = img.closest("[aria-label]")) == null ? void 0 : _a.getAttribute("aria-label"));
          if (ariaLabel) {
            img.alt = ariaLabel;
          }
        }
      });
    });
    const row = contentCols.map((col) => {
      const frag = document.createDocumentFragment();
      while (col.firstChild) frag.appendChild(col.firstChild);
      return frag;
    });
    const cells = [row];
    const block = WebImporter.Blocks.createBlock(document, { name: "columns", cells });
    applyAnalytics(element, block, document);
    element.replaceWith(block);
  }

  // tools/importer/parsers/accordion.js
  function parse3(element, { document }) {
    const items = element.querySelectorAll(
      '.cmp-accordion__item, [class*="accordion__item"]'
    );
    const cells = [];
    items.forEach((item) => {
      const titleEl = item.querySelector(
        ".cmp-accordion__title, .cmp-accordion__button span, .cmp-accordion__header button"
      );
      const panelEl = item.querySelector(
        '.cmp-accordion__panel, [class*="accordion__panel"], [class*="accordion__content"]'
      );
      const summaryText = titleEl ? titleEl.textContent.trim() : "";
      const bodyFrag = document.createDocumentFragment();
      if (panelEl) {
        while (panelEl.firstChild) {
          bodyFrag.appendChild(panelEl.firstChild);
        }
      }
      cells.push([summaryText, bodyFrag]);
    });
    if (cells.length === 0) {
      element.replaceWith(document.createTextNode(""));
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "accordion", cells });
    applyAnalytics(element, block, document);
    element.replaceWith(block);
  }

  // tools/importer/parsers/cta.js
  function parse4(element, { document }) {
    const linkEl = element.querySelector('.button a, a.cmp-button, a[class*="button"]') || element.querySelector("a[href]");
    if (!linkEl) {
      return;
    }
    const href = linkEl.getAttribute("href") || "";
    const linkText = linkEl.textContent.trim().replace(/\s*Opens in.*window\s*/i, "");
    const ariaLabel = linkEl.getAttribute("aria-label") || "";
    const headingEl = element.querySelector('h2, h3, h4, [role="heading"]');
    const descEl = element.querySelector(".cmp-text p, p:not(:has(a))");
    const defaultContent = document.createDocumentFragment();
    if (headingEl) {
      const h = document.createElement(headingEl.tagName === "SPAN" ? "h2" : headingEl.tagName.toLowerCase());
      h.textContent = headingEl.textContent.trim();
      defaultContent.appendChild(h);
    }
    if (descEl) {
      const p2 = document.createElement("p");
      p2.textContent = descEl.textContent.trim();
      defaultContent.appendChild(p2);
    }
    const linkFrag = document.createDocumentFragment();
    const a = document.createElement("a");
    a.href = href;
    a.textContent = linkText;
    if (ariaLabel) a.setAttribute("aria-label", ariaLabel);
    const p = document.createElement("p");
    p.appendChild(a);
    linkFrag.appendChild(p);
    const cells = [[linkFrag]];
    const block = WebImporter.Blocks.createBlock(document, { name: "cta", cells });
    applyAnalytics(element, block, document);
    const wrapper = document.createDocumentFragment();
    wrapper.appendChild(defaultContent);
    wrapper.appendChild(block);
    element.replaceWith(wrapper);
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
  var CLINICAL_TRIALS_SECTIONS = [
    {
      // End hero section (navy-overlap): insert break before the about section grid.
      // After hero parser runs, the overlap-predecessor is replaced and its sibling removed.
      // First .grid.cmp-grid-custom is the "About clinical trials" two-column grid.
      selector: ".grid.cmp-grid-custom",
      position: "before",
      style: "navy-overlap"
    },
    {
      // End about section (no style): insert break before the code-of-conduct container.
      // The full-width container with light-blue background holds image + text columns.
      selector: ".container.cmp-container-full-width.height-default:not(.large-radius):not(.no-bottom-margin)",
      position: "before",
      style: null
    },
    {
      // End code-of-conduct section (light-blue): insert Section Metadata + HR after container.
      selector: ".container.cmp-container-full-width.height-default:not(.large-radius):not(.no-bottom-margin)",
      style: "light-blue"
    },
    {
      // End good-clinical-practice section (no style): insert HR after the .no-bottom-margin grid.
      // This separates the accordion from the final network + IIS columns section.
      selector: ".grid.cmp-grid-custom.no-bottom-margin",
      style: null
    }
  ];
  function getSectionsForTemplate(templateName) {
    if (templateName === "content-series") return CONTENT_SERIES_SECTIONS;
    if (templateName === "leaders-listing") return LEADERS_LISTING_SECTIONS;
    if (templateName === "leader-profile") return LEADER_PROFILE_SECTIONS;
    if (templateName === "clinical-trials") return CLINICAL_TRIALS_SECTIONS;
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

  // tools/importer/import-clinical-trials.js
  var parsers = {
    "hero": parse,
    "columns": parse2,
    "accordion": parse3,
    "cta": parse4
  };
  var PAGE_TEMPLATE = {
    name: "clinical-trials",
    description: "Clinical trials informational page with hero, two-column content grid, full-width image-text section, accordion for additional info, and multi-column bottom sections",
    urls: [
      "https://www.abbvie.com/science/clinical-trials.html"
    ],
    blocks: [
      {
        name: "hero",
        instances: [
          ".container.overlap-predecessor.medium-radius.cmp-container-xx-large"
        ]
      },
      {
        name: "cta",
        instances: [
          ".grid.cmp-grid-custom:not(.no-bottom-margin) .grid-row__col-with-2:last-child"
        ]
      },
      {
        name: "columns",
        instances: [
          ".container.cmp-container-full-width.height-default:not(.large-radius):not(.no-bottom-margin) .grid",
          ".grid.cmp-grid-custom:not(.no-bottom-margin):last-of-type"
        ]
      },
      {
        name: "accordion",
        instances: [
          ".cmp-accordion"
        ]
      }
    ],
    sections: [
      {
        id: "section-1-hero",
        name: "Hero Section",
        selector: [
          ".container.large-radius.cmp-container-full-width.height-default.no-bottom-margin",
          ".container.overlap-predecessor.medium-radius.cmp-container-xx-large"
        ],
        style: "navy-overlap",
        blocks: ["hero"],
        defaultContent: []
      },
      {
        id: "section-2-about",
        name: "About Clinical Trials",
        selector: ".grid.cmp-grid-custom:not(.no-bottom-margin)",
        style: null,
        blocks: ["cta"],
        defaultContent: [
          ".grid.cmp-grid-custom:not(.no-bottom-margin) .grid-row__col-with-8 .cmp-title h2",
          ".grid.cmp-grid-custom:not(.no-bottom-margin) .grid-row__col-with-8 .cmp-text"
        ]
      },
      {
        id: "section-3-code-of-conduct",
        name: "Code of Business Conduct",
        selector: ".container.cmp-container-full-width.height-default:not(.large-radius):not(.no-bottom-margin)",
        style: "light-blue",
        blocks: ["columns"],
        defaultContent: []
      },
      {
        id: "section-4-good-clinical-practice",
        name: "Good Clinical Practice + Accordion",
        selector: ".grid.cmp-grid-custom.no-bottom-margin",
        style: null,
        blocks: ["accordion"],
        defaultContent: [
          ".grid.cmp-grid-custom.no-bottom-margin .cmp-title h2",
          ".grid.cmp-grid-custom.no-bottom-margin .cmp-text",
          ".grid.cmp-grid-custom.no-bottom-margin .button a"
        ]
      },
      {
        id: "section-5-network-and-iis",
        name: "Clinical Trial Network + IIS Program",
        selector: ".grid.cmp-grid-custom:not(.no-bottom-margin):last-of-type",
        style: null,
        blocks: ["columns"],
        defaultContent: []
      }
    ]
  };
  var transformers = [
    transform,
    transform2
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
  var import_clinical_trials_default = {
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
  return __toCommonJS(import_clinical_trials_exports);
})();
