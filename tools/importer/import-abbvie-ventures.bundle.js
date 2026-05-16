var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
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

  // import-abbvie-ventures.js
  var import_abbvie_ventures_exports = {};
  __export(import_abbvie_ventures_exports, {
    default: () => import_abbvie_ventures_default
  });

  // parsers/hero.js
  function parse(element, { document }) {
    const bgImage = element.querySelector('img.cmp-container__bg-image, img[class*="bg-image"]');
    if (bgImage) {
      const src = bgImage.getAttribute("src") || "";
      const lazySrc = bgImage.getAttribute("data-cmp-src") || "";
      if (lazySrc && (!src || src.startsWith("data:"))) {
        bgImage.setAttribute("src", lazySrc);
      }
    }
    const overlapSibling = element.nextElementSibling && element.nextElementSibling.classList.contains("overlap-predecessor") ? element.nextElementSibling : null;
    const textSource = overlapSibling || element;
    const heading = textSource.querySelector("h1, h2, .cmp-title__text");
    const textEl = textSource.querySelector(".cmp-text p, .cmp-text");
    const cells = [];
    if (bgImage) {
      const imgFrag = document.createDocumentFragment();
      imgFrag.appendChild(document.createComment(" field:image "));
      const p = document.createElement("p");
      p.appendChild(bgImage);
      imgFrag.appendChild(p);
      cells.push([imgFrag]);
    } else {
      cells.push([""]);
    }
    const contentFrag = document.createDocumentFragment();
    contentFrag.appendChild(document.createComment(" field:text "));
    if (heading) contentFrag.appendChild(heading);
    if (textEl) contentFrag.appendChild(textEl);
    cells.push([contentFrag]);
    const block = WebImporter.Blocks.createBlock(document, { name: "hero", cells });
    element.replaceWith(block);
    if (overlapSibling) {
      overlapSibling.remove();
    }
  }

  // parsers/utils/analytics.js
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

  // parsers/accordion.js
  function parse2(element, { document }) {
    const titleHeading = element.querySelector(".cmp-accordion__title-heading");
    const titleHeadingText = titleHeading ? titleHeading.textContent.trim() : "";
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
    if (titleHeadingText) {
      const frag = document.createDocumentFragment();
      const h3 = document.createElement("h3");
      h3.textContent = titleHeadingText;
      frag.appendChild(h3);
      frag.appendChild(block);
      applyAnalytics(element, block, document);
      element.replaceWith(frag);
    } else {
      applyAnalytics(element, block, document);
      element.replaceWith(block);
    }
  }

  // transformers/abbvie-cleanup.js
  var H = { before: "beforeTransform", after: "afterTransform" };
  function transform(hookName, element, payload) {
    if (hookName === H.before) {
      WebImporter.DOMUtils.remove(element, [
        '[id^="onetrust"]',
        ".ot-pc-footer",
        '[class*="cookie"]',
        '[class*="consent"]'
      ]);
      const navAccordions = element.querySelectorAll(
        ".accordion.panelcontainer.cmp-accordion-xx-large.show-tabs-desktop"
      );
      navAccordions.forEach((acc) => acc.remove());
      const teaser = element.querySelector(".teaser.light-theme");
      if (teaser) {
        const document = element.ownerDocument;
        const frag = document.createDocumentFragment();
        const pretitleEl = teaser.querySelector(".cmp-teaser__pretitle");
        if (pretitleEl) {
          const p = document.createElement("p");
          p.textContent = pretitleEl.textContent.trim();
          frag.appendChild(p);
        }
        const titleEl = teaser.querySelector(".cmp-teaser__title");
        if (titleEl) {
          const p = document.createElement("p");
          const sourceP = titleEl.querySelector("p");
          if (sourceP) {
            for (const node of Array.from(sourceP.childNodes)) {
              if (node.nodeType === 3) {
                const text = node.textContent.replace(/\s+/g, " ");
                if (text.trim()) p.appendChild(document.createTextNode(text));
              } else if (node.tagName === "BR") {
                p.appendChild(document.createElement("br"));
              } else if (node.tagName === "SPAN") {
                const em = document.createElement("em");
                em.textContent = node.textContent.trim();
                p.appendChild(em);
              }
            }
          }
          frag.appendChild(p);
        }
        const descEl = teaser.querySelector(".cmp-teaser__description");
        if (descEl) {
          const descP = descEl.querySelector("p");
          if (descP) {
            frag.appendChild(descP);
          }
        }
        teaser.replaceWith(frag);
      }
      element.querySelectorAll("img[data-cmp-src]").forEach((img) => {
        const src = img.getAttribute("src") || "";
        const lazySrc = img.getAttribute("data-cmp-src") || "";
        if (lazySrc && (!src || src.startsWith("data:"))) {
          img.setAttribute("src", lazySrc);
        }
      });
      element.querySelectorAll(".cmp-image[data-cmp-src]").forEach((cmpImage) => {
        const lazySrc = cmpImage.getAttribute("data-cmp-src") || "";
        if (!lazySrc) return;
        const document = element.ownerDocument;
        let img = cmpImage.querySelector("img");
        if (img) {
          const src = img.getAttribute("src") || "";
          if (!src || src.startsWith("data:")) {
            img.setAttribute("src", lazySrc);
          }
        } else {
          img = document.createElement("img");
          img.setAttribute("src", lazySrc);
          img.setAttribute("alt", cmpImage.getAttribute("data-asset-name") || cmpImage.getAttribute("title") || "");
          cmpImage.appendChild(img);
        }
      });
      element.querySelectorAll("img.cmp-container__bg-image").forEach((img) => {
        const container = img.parentElement;
        if (container && container !== element) {
          container.appendChild(img);
        }
      });
      element.querySelectorAll(".cmp-header__text").forEach((el) => {
        const text = el.textContent.trim();
        const textUpper = text.toUpperCase();
        const isInSidebar = el.closest(".grid-row__col-with-2");
        if (textUpper === "PRIORITIES") {
          const document = element.ownerDocument;
          const p = document.createElement("p");
          const strong = document.createElement("strong");
          strong.textContent = textUpper;
          p.appendChild(strong);
          el.replaceWith(p);
        } else if (isInSidebar) {
        } else {
          el.remove();
        }
      });
      element.querySelectorAll(".list-results-none").forEach((el) => el.remove());
      const footerFrag = element.querySelector(".cmp-experiencefragment--footer");
      if (footerFrag) {
        footerFrag.remove();
      }
    }
    if (hookName === H.after) {
      WebImporter.DOMUtils.remove(element, [
        ".cmp-experiencefragment--header",
        ".experiencefragment.sticky-nav",
        "header.nav-bar"
      ]);
      WebImporter.DOMUtils.remove(element, [
        ".cmp-experiencefragment--footer",
        ".footer-overlap"
      ]);
      WebImporter.DOMUtils.remove(element, [
        "noscript",
        "link",
        "iframe",
        ".list-footer-primary",
        ".list-footer-legal",
        ".back-to-top",
        ".cmp-image--abbvie-logo"
      ]);
      element.querySelectorAll('.popup-overlay, [class*="popup"], [class*="modal"]').forEach((el) => {
        const text = el.textContent || "";
        if (text.includes("leave the AbbVie website") || text.includes("You are about to leave")) {
          el.remove();
        }
      });
      element.querySelectorAll("img").forEach((img) => {
        const src = img.getAttribute("src") || "";
        if (src.startsWith("blob:") || src.includes("analytics.twitter.com") || src.includes("t.co/i/adsct") || src.includes("siteimproveanalytics") || src.includes("google.com/pagead") || src.includes("alb.reddit.com") || src.includes("bing.com/c.gif") || src.includes("metrics.brightcove.com")) {
          const parent = img.parentElement;
          img.remove();
          if (parent && parent.tagName === "P" && !parent.textContent.trim() && !parent.querySelector("img, a")) {
            parent.remove();
          }
        }
      });
      element.querySelectorAll("img").forEach((img) => {
        const src = img.getAttribute("src") || "";
        if (src.includes("/icons/footer-")) {
          const li = img.closest("li");
          if (li) li.remove();
        }
      });
      element.querySelectorAll("ul").forEach((ul) => {
        if (ul.children.length === 0) ul.remove();
      });
      element.querySelectorAll("p").forEach((p) => {
        const text = p.textContent.trim();
        if (text === "No results found" || text === "No results foundChange your search criteria." || text.startsWith("No results found")) {
          p.remove();
        }
      });
      element.querySelectorAll("p").forEach((p) => {
        const text = p.textContent.trim();
        if (text.startsWith("Copyright \xA9") || text.startsWith("Unless otherwise specified, all product names")) {
          p.remove();
        }
      });
      element.querySelectorAll(".vjs-modal-dialog, .vjs-control-bar, .vjs-text-track-display").forEach((el) => el.remove());
      element.querySelectorAll("*").forEach((el) => {
        el.removeAttribute("onclick");
        el.removeAttribute("onload");
      });
    }
  }

  // transformers/sections.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
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
  var PARTNER_WITH_US_SECTIONS = [
    {
      // End hero section (navy-overlap): insert break before the main content grid.
      // After hero parser runs, the overlap-predecessor is replaced and its sibling removed.
      // The .grid.cmp-grid-custom contains the sidebar + main content.
      selector: ".grid.cmp-grid-custom",
      position: "before",
      style: "navy-overlap"
    }
  ];
  var ABBVIE_VENTURES_SECTIONS = [
    {
      // End hero section (navy-overlap): insert break before the main content grid.
      selector: ".grid.cmp-grid-custom",
      position: "before",
      style: "navy-overlap"
    },
    {
      // End main content section: insert break before the Related Content cards container.
      selector: ".container.cmp-container-full-width.no-bottom-margin:last-of-type",
      position: "before",
      style: null
    }
  ];
  var EDUCATIONAL_GRANTS_SECTIONS = [
    {
      // End hero section (navy-overlap): insert break before the main content grid.
      selector: ".grid.cmp-grid-custom",
      position: "before",
      style: "navy-overlap"
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
    if (templateName === "clinical-trials") return CLINICAL_TRIALS_SECTIONS;
    if (templateName === "partner-with-us") return PARTNER_WITH_US_SECTIONS;
    if (templateName === "abbvie-ventures") return ABBVIE_VENTURES_SECTIONS;
    if (templateName === "educational-grants") return EDUCATIONAL_GRANTS_SECTIONS;
    return LANDING_PAGE_SECTIONS;
  }
  function transform2(hookName, element, payload) {
    if (hookName !== TransformHook.afterTransform) return;
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

  // import-abbvie-ventures.js
  var parsers = {
    "hero": parse,
    "accordion": parse2
  };
  var PAGE_TEMPLATE = {
    name: "abbvie-ventures",
    description: "AbbVie Ventures page with hero, sidebar with related content/topics, main content with 2 accordion blocks, and related content cards at bottom",
    urls: [
      "https://www.abbvie.com/science/partner-with-us/abbvie-ventures.html"
    ],
    blocks: [
      {
        name: "hero",
        instances: [
          ".container.large-radius.cmp-container-full-width.height-default.no-bottom-margin"
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
        id: "section-2-main",
        name: "Main Content with Sidebar",
        selector: ".grid.cmp-grid-custom:first-of-type",
        style: null,
        blocks: ["accordion"],
        defaultContent: []
      },
      {
        id: "section-3-cards",
        name: "Related Content Cards",
        selector: ".container.cmp-container-full-width.no-bottom-margin:has(.cardpagestory)",
        style: null,
        blocks: ["cards"],
        defaultContent: []
      }
    ]
  };
  var transformers = [
    transform,
    transform2
  ];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = {
      ...payload,
      template: PAGE_TEMPLATE
    };
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
  function convertGridToColumns(document) {
    const grid = document.querySelector(".grid.cmp-grid-custom");
    if (!grid) return;
    const gridRow = grid.querySelector(".grid-row");
    if (!gridRow) return;
    const cols = Array.from(gridRow.children).filter(
      (c) => c.className && c.className.match(/grid-row__col/)
    );
    const contentCols = cols.filter((c) => {
      const w = c.className.match(/grid-row__col-with-(\d+)/);
      const width = w ? parseInt(w[1], 10) : 0;
      const hasContent = c.textContent.trim().length > 0 || c.querySelector("img, picture, video");
      return width > 1 || hasContent;
    });
    if (contentCols.length < 2) return;
    const rowCells = contentCols.map((col) => {
      const frag = document.createDocumentFragment();
      while (col.firstChild) frag.appendChild(col.firstChild);
      return frag;
    });
    rowCells.push(document.createDocumentFragment());
    const block = WebImporter.Blocks.createBlock(document, {
      name: "Columns (cols-8-2-2)",
      cells: [rowCells]
    });
    grid.replaceWith(block);
  }
  function parseRelatedContentCards(document) {
    const containers = document.querySelectorAll(".container.cmp-container-full-width.no-bottom-margin");
    let cardsContainer = null;
    containers.forEach((c) => {
      if (c.querySelector(".cardpagestory.card-standard")) {
        cardsContainer = c;
      }
    });
    if (!cardsContainer) return;
    const cards = cardsContainer.querySelectorAll(".cardpagestory.card-standard");
    if (cards.length === 0) return;
    const cells = [];
    cards.forEach((card) => {
      const link = card.querySelector("a[href]");
      const img = card.querySelector("img");
      const h4 = card.querySelector("h4.card-title") || card.querySelector("h4");
      const imgFrag = document.createDocumentFragment();
      imgFrag.appendChild(document.createComment(" field:image "));
      if (img) {
        const p = document.createElement("p");
        const imgEl = document.createElement("img");
        imgEl.src = img.src || img.getAttribute("data-cmp-src") || "";
        imgEl.alt = img.alt || "";
        p.appendChild(imgEl);
        imgFrag.appendChild(p);
      }
      const textFrag = document.createDocumentFragment();
      textFrag.appendChild(document.createComment(" field:text "));
      if (h4) {
        const p = document.createElement("p");
        const strong = document.createElement("strong");
        strong.textContent = h4.textContent.trim();
        p.appendChild(strong);
        textFrag.appendChild(p);
      }
      if (link) {
        const p = document.createElement("p");
        const a = document.createElement("a");
        a.href = link.href;
        a.textContent = "Learn More";
        p.appendChild(a);
        textFrag.appendChild(p);
      }
      cells.push([imgFrag, textFrag]);
    });
    if (cells.length > 0) {
      const h3 = cardsContainer.querySelector("h3") || cardsContainer.querySelector("h2");
      const headingText = h3 ? h3.textContent.trim() : "Related Content";
      const block = WebImporter.Blocks.createBlock(document, { name: "Cards", cells });
      cardsContainer.innerHTML = "";
      const headingEl = document.createElement("h3");
      headingEl.id = "related-content";
      headingEl.textContent = headingText;
      cardsContainer.appendChild(headingEl);
      cardsContainer.appendChild(block);
    }
  }
  var import_abbvie_ventures_default = {
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
      convertGridToColumns(document);
      parseRelatedContentCards(document);
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
  return __toCommonJS(import_abbvie_ventures_exports);
})();
