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

  // tools/importer/import-corporate-leader-profile.js
  var import_corporate_leader_profile_exports = {};
  __export(import_corporate_leader_profile_exports, {
    default: () => import_corporate_leader_profile_default
  });

  // tools/importer/parsers/columns.js
  function resolveLazyImages(container) {
    container.querySelectorAll("img[data-cmp-src]").forEach((img) => {
      const src = img.getAttribute("src") || "";
      const lazySrc = img.getAttribute("data-cmp-src") || "";
      if (lazySrc && (!src || src.startsWith("data:"))) {
        img.setAttribute("src", lazySrc);
      }
    });
  }
  function applyAnalytics(source, target, document) {
    Array.from(source.attributes || []).filter((a) => a.name.startsWith("data-analytics")).forEach((a) => target.setAttribute(a.name, a.value));
  }
  function parse(element, { document }) {
    const gridRows = element.querySelectorAll(".grid-row");
    const cells = [];
    if (gridRows.length > 0) {
      gridRows.forEach((row) => {
        const gridCells = row.querySelectorAll(
          ':scope > .grid-cell, :scope > .grid-row__col-with-1, :scope > .grid-row__col-with-2, :scope > .grid-row__col-with-3, :scope > .grid-row__col-with-4, :scope > .grid-row__col-with-5, :scope > [class*="grid-row__col"]'
        );
        if (gridCells.length === 0) return;
        const allCols = Array.from(gridCells);
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
          const fallbackRow = fallbackCols.map((col) => {
            const frag = document.createDocumentFragment();
            while (col.firstChild) frag.appendChild(col.firstChild);
            return frag;
          });
          const block2 = WebImporter.Blocks.createBlock(document, { name: "columns", cells: [fallbackRow] });
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
        const rowCells = [];
        contentCols.forEach((col) => {
          resolveLazyImages(col);
          const frag = document.createDocumentFragment();
          while (col.firstChild) frag.appendChild(col.firstChild);
          rowCells.push(frag);
        });
        if (rowCells.length > 0) {
          cells.push(rowCells);
        }
      });
    } else {
      const containers = element.querySelectorAll(
        ":scope > .cmp-container > div, :scope > div > .cmp-container > div"
      );
      if (containers.length >= 2) {
        const rowCells = [];
        containers.forEach((container) => {
          const frag = document.createDocumentFragment();
          while (container.firstChild) frag.appendChild(container.firstChild);
          rowCells.push(frag);
        });
        cells.push(rowCells);
      }
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "columns", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/abbvie-cleanup.js
  var H = { before: "beforeTransform", after: "afterTransform" };
  var SCENE7_ALT_MAP = {
    "Microscope image of cells": "https://abbvie.scene7.com/is/image/abbviecorp/science-oncology",
    "the persistence lab story image": "https://abbvie.scene7.com/is/image/abbviecorp/the-persistence-lab-story-image",
    "One Minute Thesis logo -  video": "https://abbvie.scene7.com/is/image/abbviecorp/one-minute-thesis-thumbnail-1",
    "One Minute Thesis logo - video": "https://abbvie.scene7.com/is/image/abbviecorp/one-minute-thesis-thumbnail-1",
    "lab of the future thumbnail": "https://abbvie.scene7.com/is/image/abbviecorp/lab-of-the-future-thumbnail-1",
    "discovery files thumbnail": "https://abbvie.scene7.com/is/image/abbviecorp/discovery-files-thumbnail-1",
    "Cambridge Scientists": "https://abbvie.scene7.com/is/image/abbviecorp/Cambridge%20Scientists",
    "AbbVie logo": "https://abbvie.scene7.com/is/content/abbviecorp/abbvie-logo-header",
    "none": "https://abbvie.scene7.com/is/image/abbviecorp/Cambridge%20Scientists"
  };
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
      const treeWalker = element.ownerDocument.createTreeWalker(
        element,
        4
        /* NodeFilter.SHOW_TEXT */
      );
      let textNode;
      while (textNode = treeWalker.nextNode()) {
        const cleaned = textNode.textContent.replace(/[\u200B\u200C\u200D\uFEFF]/g, "");
        if (cleaned !== textNode.textContent) {
          textNode.textContent = cleaned;
        }
      }
      element.querySelectorAll("[data-cmp-data-layer]").forEach((el) => {
        el.removeAttribute("data-cmp-data-layer");
      });
      element.querySelectorAll('img[src*="scene7.com"]').forEach((img) => {
        const src = img.getAttribute("src") || "";
        try {
          const u = new URL(src);
          if (u.search) {
            img.setAttribute("src", u.origin + u.pathname);
          }
        } catch (e) {
        }
      });
      element.querySelectorAll('img[src^="blob:"]').forEach((img) => {
        let resolved = img.getAttribute("data-cmp-src") || img.getAttribute("data-src") || "";
        if (!resolved) {
          let parent = img.parentElement;
          while (parent && parent !== element) {
            resolved = parent.getAttribute("data-cmp-src") || "";
            if (resolved) break;
            parent = parent.parentElement;
          }
        }
        if (!resolved) {
          const alt = (img.getAttribute("alt") || "").trim();
          resolved = SCENE7_ALT_MAP[alt] || "";
        }
        if (resolved) {
          img.setAttribute("src", resolved);
        } else {
          console.warn("[cleanup] blob: URL with no fallback:", img.getAttribute("src"), "alt:", img.getAttribute("alt"));
        }
      });
      element.querySelectorAll('a[href^="blob:"]').forEach((a) => {
        a.removeAttribute("href");
      });
      element.querySelectorAll("img.cmp-container__bg-image").forEach((img) => {
        const container = img.parentElement;
        if (container && container !== element) {
          container.appendChild(img);
        }
      });
      element.querySelectorAll(".cmp-header__text").forEach((el) => {
        const text = el.textContent.trim().toUpperCase();
        if (text === "PRIORITIES") {
          const document = element.ownerDocument;
          const p = document.createElement("p");
          const strong = document.createElement("strong");
          strong.textContent = text;
          p.appendChild(strong);
          el.replaceWith(p);
        } else {
          el.remove();
        }
      });
      element.querySelectorAll(".list-results-none").forEach((el) => el.remove());
      element.querySelectorAll("*").forEach((el) => {
        if (el.children.length > 2) return;
        const txt = el.textContent.trim().replace(/\s+/g, " ");
        if (/^No results found/.test(txt) || /^Change your search criteria/.test(txt)) {
          el.remove();
        }
      });
      const footerFrag = element.querySelector(".cmp-experiencefragment--footer");
      if (footerFrag) {
        const ctaSection = footerFrag.querySelector(".container.cmp-container-full-width.footer-overlap");
        if (ctaSection) {
          footerFrag.parentNode.insertBefore(ctaSection, footerFrag);
        }
      }
    }
    if (hookName === H.after) {
      WebImporter.DOMUtils.remove(element, [
        ".cmp-experiencefragment--header",
        ".experiencefragment.sticky-nav",
        "header.nav-bar"
      ]);
      const footerFrag = element.querySelector(".cmp-experiencefragment--footer");
      if (footerFrag) {
        footerFrag.remove();
      }
      WebImporter.DOMUtils.remove(element, [
        "noscript",
        "link",
        "iframe",
        ".list-footer-primary",
        ".list-footer-legal"
      ]);
      element.querySelectorAll('.popup-overlay, [class*="popup"], [class*="modal"]').forEach((el) => {
        const text = el.textContent || "";
        if (text.includes("leave the AbbVie website") || text.includes("You are about to leave")) {
          el.remove();
        }
      });
      element.querySelectorAll("img").forEach((img) => {
        const src = img.getAttribute("src") || "";
        if (src.includes("analytics.twitter.com") || src.includes("t.co/i/adsct") || src.includes("siteimproveanalytics") || src.includes("google.com/pagead") || src.includes("alb.reddit.com") || src.includes("bing.com/c.gif") || src.includes("metrics.brightcove.com")) {
          img.remove();
        }
      });
      element.querySelectorAll(".vjs-modal-dialog, .vjs-control-bar, .vjs-text-track-display").forEach((el) => el.remove());
      element.querySelectorAll("*").forEach((el) => {
        el.removeAttribute("onclick");
        el.removeAttribute("onload");
      });
    }
  }

  // tools/importer/transformers/sections.js
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
  var CORPORATE_LEADER_PROFILE_SECTIONS = [
    {
      // Hero section: navy background bar + overlap predecessor with breadcrumb/name/title
      selector: ".overlap-predecessor",
      fallback: ".container.large-radius.cmp-container-full-width.height-short.no-bottom-margin",
      style: "navy-overlap"
    }
  ];
  var PUBLICATIONS_SECTIONS = [
    {
      // Hero section: purple background bar + overlap predecessor with H1/subtitle
      // After overlap-predecessor, insert section break + metadata before the grid content
      selector: ".grid.cmp-grid-custom",
      position: "before",
      style: "purple-overlap"
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
    if (templateName === "publications") return PUBLICATIONS_SECTIONS;
    if (templateName === "science-hub") return SCIENCE_HUB_SECTIONS;
    if (templateName === "content-series") return CONTENT_SERIES_SECTIONS;
    if (templateName === "leaders-listing") return LEADERS_LISTING_SECTIONS;
    if (templateName === "leader-profile") return LEADER_PROFILE_SECTIONS;
    if (templateName === "corporate-leader-profile") return CORPORATE_LEADER_PROFILE_SECTIONS;
    if (templateName === "clinical-trials") return CLINICAL_TRIALS_SECTIONS;
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

  // tools/importer/import-corporate-leader-profile.js
  var parsers = {
    "columns": parse
  };
  var transformers = [
    transform,
    transform2
  ];
  var PAGE_TEMPLATE = {
    name: "corporate-leader-profile",
    description: "Corporate leader profile page under Who We Are / Our Leaders section with hero (breadcrumb, name, title) and two-column bio (headshot + biography text)",
    urls: [
      "https://www.abbvie.com/who-we-are/our-leaders/roopal-thakkar.html",
      "https://www.abbvie.com/who-we-are/our-leaders/latif-akintade.html"
    ],
    blocks: [
      {
        name: "columns",
        instances: [".container.overlap-predecessor .grid .grid-row"]
      }
    ],
    sections: [
      {
        id: "section-1-hero",
        name: "Hero Section (Profile)",
        selector: [
          ".container.large-radius.cmp-container-full-width.height-short.no-bottom-margin",
          ".container.overlap-predecessor.medium-radius.cmp-container-xx-large.align-center"
        ],
        style: "navy-overlap",
        blocks: [],
        defaultContent: [
          ".breadcrumb.abbvie-breadcrumb",
          "#title-4dbb596b7d h1",
          ".text.cmp-text-xx-large .body-unica-32-reg"
        ]
      },
      {
        id: "section-2-bio",
        name: "Biography Section",
        selector: ".container.overlap-predecessor .grid.aem-GridColumn",
        style: null,
        blocks: ["columns"],
        defaultContent: []
      }
    ]
  };
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
  var import_corporate_leader_profile_default = {
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
  return __toCommonJS(import_corporate_leader_profile_exports);
})();
