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

  // tools/importer/import-community-of-science.js
  var import_community_of_science_exports = {};
  __export(import_community_of_science_exports, {
    default: () => import_community_of_science_default
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
      return colWidth > 1 || col.textContent.trim().length > 0;
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

  // tools/importer/import-community-of-science.js
  var parsers = {
    "hero": parse,
    "columns": parse2
  };
  var PAGE_TEMPLATE = {
    name: "community-of-science",
    description: "Community of Science page with hero, stats highlights, alternating program columns, teaser, programs grid, and CTA",
    urls: [
      "https://www.abbvie.com/science/our-people/community-of-science.html"
    ],
    blocks: [
      {
        name: "hero",
        instances: [".container.overlap-predecessor"]
      },
      {
        name: "columns",
        instances: [
          // Stats highlights (4 dashboard cards in a 5-column grid)
          ".grid.cmp-grid-full-page-5-v1",
          // 5 alternating program rows (image + text, 5:1:5 grid pattern)
          ".container.cmp-container-full-width.height-default:not(.no-bottom-margin):not(.large-radius) > .cmp-container > .grid",
          // Programs grid (image + 4 program descriptions)
          ".grid.aem-GridColumn.aem-GridColumn--default--12",
          // CTA section (image + heading + text + link)
          ".container.cmp-container-full-width.height-default.no-bottom-margin:not(.large-radius):not(.footer-overlap) > .cmp-container > .grid"
        ]
      }
    ]
  };
  var transformers = [
    transform
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
  function insertSectionBreak(document, el, position, style) {
    if (!el) return;
    if (position === "before") {
      if (style) {
        const metaBlock = WebImporter.Blocks.createBlock(document, {
          name: "Section Metadata",
          cells: [["style", style]]
        });
        el.before(metaBlock);
      }
      el.before(document.createElement("hr"));
    } else {
      let ref = el;
      if (style) {
        const metaBlock = WebImporter.Blocks.createBlock(document, {
          name: "Section Metadata",
          cells: [["style", style]]
        });
        ref.after(metaBlock);
        ref = metaBlock;
      }
      ref.after(document.createElement("hr"));
    }
  }
  var import_community_of_science_default = {
    transform: (payload) => {
      var _a, _b, _c, _d, _e, _f, _g;
      const { document, url, html, params } = payload;
      const main = document.body;
      executeTransformers("beforeTransform", main, payload);
      main.querySelectorAll(".cmp-image[data-cmp-src]").forEach((wrapper) => {
        const src = wrapper.getAttribute("data-cmp-src");
        const img = wrapper.querySelector("img");
        if (img && src) {
          img.src = src;
        } else if (!img && src) {
          const newImg = document.createElement("img");
          newImg.src = src;
          newImg.alt = "";
          wrapper.appendChild(newImg);
        }
      });
      main.querySelectorAll("img.cmp-container__bg-image[data-cmp-src]").forEach((img) => {
        const src = img.getAttribute("data-cmp-src");
        if (src) img.src = src;
      });
      const statsContainer = (_a = main.querySelector(".grid.cmp-grid-full-page-5-v1")) == null ? void 0 : _a.closest(".container");
      const altContainer = main.querySelector(
        ".container.cmp-container-full-width.height-default:not(.no-bottom-margin):not(.large-radius)"
      );
      const teaserEl = main.querySelector(".teaser.aem-GridColumn");
      const ctaContainer = main.querySelector(
        ".container.cmp-container-full-width.height-default.no-bottom-margin:not(.large-radius):not(.footer-overlap)"
      );
      if (statsContainer) statsContainer.setAttribute("data-section", "stats");
      if (altContainer) altContainer.setAttribute("data-section", "alternating");
      if (ctaContainer) ctaContainer.setAttribute("data-section", "cta");
      main.querySelectorAll('[data-section="stats"] .dashboardcards').forEach((card) => {
        var _a2, _b2, _c2, _d2, _e2, _f2;
        const eyebrow = (_b2 = (_a2 = card.querySelector(".eyebrow")) == null ? void 0 : _a2.textContent) == null ? void 0 : _b2.trim();
        const dataEl = (_d2 = (_c2 = card.querySelector(".data-point")) == null ? void 0 : _c2.textContent) == null ? void 0 : _d2.trim();
        const suffix = ((_f2 = (_e2 = card.querySelector(".data-point-suffix")) == null ? void 0 : _e2.textContent) == null ? void 0 : _f2.trim()) || "";
        const descEl = card.querySelector(".description");
        const frag = document.createDocumentFragment();
        if (eyebrow) {
          const h = document.createElement("h2");
          h.textContent = eyebrow;
          frag.appendChild(h);
        }
        if (dataEl) {
          const p = document.createElement("p");
          const strong = document.createElement("strong");
          strong.textContent = dataEl + suffix;
          p.appendChild(strong);
          frag.appendChild(p);
        }
        if (descEl) {
          frag.appendChild(descEl.cloneNode(true));
        }
        card.replaceWith(frag);
      });
      if (teaserEl) {
        const pretitle = (_c = (_b = teaserEl.querySelector(".cmp-teaser__pretitle")) == null ? void 0 : _b.textContent) == null ? void 0 : _c.trim();
        const title = (_e = (_d = teaserEl.querySelector(".cmp-teaser__title")) == null ? void 0 : _d.textContent) == null ? void 0 : _e.trim();
        const desc = (_g = (_f = teaserEl.querySelector(".cmp-teaser__description")) == null ? void 0 : _f.textContent) == null ? void 0 : _g.trim();
        const frag = document.createDocumentFragment();
        if (pretitle) {
          const h = document.createElement("h2");
          h.textContent = pretitle;
          frag.appendChild(h);
        }
        if (title) {
          const h = document.createElement("h3");
          h.textContent = title;
          frag.appendChild(h);
        }
        if (desc) {
          const p = document.createElement("p");
          p.textContent = desc;
          frag.appendChild(p);
        }
        teaserEl.replaceWith(frag);
      }
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
      const heroBgContainer = main.querySelector(
        ".container.large-radius.cmp-container-full-width.height-default.no-bottom-margin:not([data-section])"
      );
      if (heroBgContainer && heroBgContainer.textContent.trim().length === 0) {
        heroBgContainer.remove();
      }
      const statsEl = main.querySelector('[data-section="stats"]');
      let statsBgImgSrc = null;
      let statsBgImgAlt = "";
      if (statsEl) {
        const statsBgImg = statsEl.querySelector("img.cmp-container__bg-image");
        if (statsBgImg) {
          statsBgImgSrc = statsBgImg.src;
          statsBgImgAlt = statsBgImg.alt || "";
          const imgWrapper = statsBgImg.closest("p") || statsBgImg;
          imgWrapper.remove();
        }
      }
      const altEl = main.querySelector('[data-section="alternating"]');
      const ctaEl = main.querySelector('[data-section="cta"]');
      if (statsEl) {
        const heroMetaBlock = WebImporter.Blocks.createBlock(document, {
          name: "Section Metadata",
          cells: [["style", "navy-overlap"]]
        });
        statsEl.before(heroMetaBlock);
        statsEl.before(document.createElement("hr"));
      }
      if (statsEl) {
        const cells = [["style", "highlight"]];
        if (statsBgImgSrc) {
          cells.push(["background", statsBgImgSrc]);
          if (statsBgImgAlt) cells.push(["backgroundAlt", statsBgImgAlt]);
        }
        const metaBlock = WebImporter.Blocks.createBlock(document, {
          name: "Section Metadata",
          cells
        });
        statsEl.after(metaBlock);
        const hr2 = document.createElement("hr");
        metaBlock.after(hr2);
      }
      insertSectionBreak(document, altEl, "after", null);
      insertSectionBreak(document, ctaEl, "before", null);
      insertSectionBreak(document, ctaEl, "after", "highlight");
      main.querySelectorAll("[data-section]").forEach((el) => {
        el.removeAttribute("data-section");
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
  return __toCommonJS(import_community_of_science_exports);
})();
