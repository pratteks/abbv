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

  // tools/importer/import-landing-page.js
  var import_landing_page_exports = {};
  __export(import_landing_page_exports, {
    default: () => import_landing_page_default
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
    const bgImg = (prevSibling == null ? void 0 : prevSibling.querySelector("img.cmp-container__bg-image")) || (prevSibling == null ? void 0 : prevSibling.querySelector("picture")) || (prevSibling == null ? void 0 : prevSibling.querySelector(".cmp-image img")) || (prevSibling == null ? void 0 : prevSibling.querySelector("img"));
    const heading = element.querySelector(".cmp-title h1, h1, .cmp-title h2, h2");
    const description = element.querySelector(".cmp-text p, .cmp-text");
    const cells = [];
    const imgFrag = document.createDocumentFragment();
    imgFrag.appendChild(document.createComment(" field:image "));
    if (bgImg) {
      if (bgImg.tagName === "PICTURE") {
        imgFrag.appendChild(bgImg);
      } else if (bgImg.tagName === "IMG") {
        const lazySrc = bgImg.getAttribute("data-cmp-src");
        if (lazySrc && (!bgImg.src || bgImg.src === "about:blank")) {
          bgImg.src = lazySrc;
        }
        const p = document.createElement("p");
        p.appendChild(bgImg);
        imgFrag.appendChild(p);
      } else {
        const pic = bgImg.closest("picture") || bgImg;
        imgFrag.appendChild(pic);
      }
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

  // tools/importer/parsers/cards.js
  function parse3(element, { document }) {
    const gridCols = element.querySelectorAll(
      '[class*="grid-row__col-with-3"], [class*="grid-row__col-with-4"], [class*="grid-row__col-with-5"], [class*="grid-row__col-with-6"]'
    );
    const columns = gridCols.length > 0 ? Array.from(gridCols) : Array.from(element.querySelectorAll('[class*="grid-row__col-with-"]')).filter(
      (col) => col.textContent.trim().length > 0
    );
    const cells = [];
    columns.forEach((col) => {
      var _a, _b, _c, _d, _e, _f;
      if (col.textContent.trim().length === 0) return;
      const thumbnail = col.querySelector(".cmp-image__image") || col.querySelector(".cmp-image img") || col.querySelector('img[class*="thumbnail"]') || col.querySelector("img");
      const titleEl = col.querySelector(".cmp-header__text") || col.querySelector(".cmp-header") || col.querySelector(".body-unica-20-reg") || col.querySelector(".cmp-title h3, .cmp-title h2, h3, h2");
      const titleText = (_a = titleEl == null ? void 0 : titleEl.textContent) == null ? void 0 : _a.trim();
      const descEl = col.querySelector(".cmp-text p") || col.querySelector(".body-unica-18-reg") || col.querySelector(".cmp-text");
      const descText = (_b = descEl == null ? void 0 : descEl.textContent) == null ? void 0 : _b.trim();
      const ctaLink = col.querySelector(".cmp-button[href]") || col.querySelector(".button a[href]") || col.querySelector("a.cmp-button");
      const ctaText = ((_d = (_c = ctaLink == null ? void 0 : ctaLink.querySelector(".cmp-button__text")) == null ? void 0 : _c.textContent) == null ? void 0 : _d.trim()) || ((_e = ctaLink == null ? void 0 : ctaLink.textContent) == null ? void 0 : _e.trim());
      const ctaHref = ctaLink == null ? void 0 : ctaLink.getAttribute("href");
      if (!titleText && !descText) return;
      const imgFrag = document.createDocumentFragment();
      imgFrag.appendChild(document.createComment(" field:image "));
      if (thumbnail) {
        const imgSrc = thumbnail.getAttribute("src") || thumbnail.getAttribute("data-cmp-src") || thumbnail.src;
        if (imgSrc && imgSrc !== "about:blank") {
          const p = document.createElement("p");
          const img = document.createElement("img");
          img.src = imgSrc;
          img.alt = thumbnail.getAttribute("alt") || thumbnail.alt || "";
          p.appendChild(img);
          imgFrag.appendChild(p);
        }
      }
      const cmpVideo = col.querySelector("[data-video-url]");
      let videoUrl = (cmpVideo == null ? void 0 : cmpVideo.getAttribute("data-video-url")) || null;
      let watchText = null;
      if (videoUrl) {
        const watchBtn = col.querySelector(".cmp-video__text-content button") || Array.from(col.querySelectorAll("button")).find((b) => b.textContent.includes("Watch"));
        watchText = (_f = watchBtn == null ? void 0 : watchBtn.textContent) == null ? void 0 : _f.trim();
      }
      const textFrag = document.createDocumentFragment();
      textFrag.appendChild(document.createComment(" field:text "));
      if (titleText) {
        const p = document.createElement("p");
        const strong = document.createElement("strong");
        strong.textContent = titleText;
        p.appendChild(strong);
        textFrag.appendChild(p);
      }
      if (descText) {
        const p = document.createElement("p");
        p.textContent = descText;
        textFrag.appendChild(p);
      }
      if (ctaHref) {
        const p = document.createElement("p");
        const a = document.createElement("a");
        a.href = ctaHref;
        a.textContent = ctaText || "Read more";
        p.appendChild(a);
        textFrag.appendChild(p);
      } else if (videoUrl) {
        const p = document.createElement("p");
        const a = document.createElement("a");
        a.href = videoUrl;
        a.textContent = watchText || "Watch";
        p.appendChild(a);
        textFrag.appendChild(p);
      }
      cells.push([imgFrag, textFrag]);
    });
    if (cells.length === 0) {
      element.replaceWith(document.createTextNode(""));
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "cards", cells });
    applyAnalytics(element, block, document);
    element.replaceWith(block);
  }

  // tools/importer/parsers/quote.js
  function parse4(element, { document }) {
    var _a, _b, _c;
    const quoteEl = element.querySelector(".cmp-quote__text") || element.querySelector("blockquote") || element.querySelector("p");
    const authorName = element.querySelector(".author-name, .cmp-quote__author-name");
    const authorTitle = element.querySelector(".author-title, .cmp-quote__author-title");
    const container = element.closest(".container") || element.parentElement;
    let bgPicture = null;
    let bgAlt = "";
    if (container) {
      const bgImg = container.querySelector("img.cmp-container__bg-image") || container.querySelector("img[data-cmp-src]");
      const fallbackImg = !bgImg ? [...container.querySelectorAll("picture, img")].find(
        (el) => !el.closest(".cmp-quote") && el !== element && !element.contains(el)
      ) : null;
      const foundImg = bgImg || fallbackImg;
      if (foundImg) {
        const actualImg = foundImg.tagName === "IMG" ? foundImg : foundImg.querySelector("img");
        bgAlt = (actualImg == null ? void 0 : actualImg.getAttribute("alt")) || "";
        bgPicture = foundImg.tagName === "PICTURE" ? foundImg : foundImg.closest("picture") || foundImg;
        const bgParent = bgPicture.parentElement;
        if (bgParent) {
          bgParent.removeChild(bgPicture);
          if (bgParent.tagName === "P" && !bgParent.childNodes.length) {
            (_a = bgParent.parentElement) == null ? void 0 : _a.removeChild(bgParent);
          }
        }
      }
    }
    const row0 = document.createDocumentFragment();
    row0.appendChild(document.createComment(" field:quoteType "));
    const typeP = document.createElement("p");
    typeP.textContent = "basic";
    row0.appendChild(typeP);
    const row1 = document.createDocumentFragment();
    row1.appendChild(document.createComment(" field:quotation "));
    if (quoteEl) {
      const p = document.createElement("p");
      p.textContent = quoteEl.textContent.trim();
      row1.appendChild(p);
    }
    const row2 = document.createDocumentFragment();
    row2.appendChild(document.createComment(" field:attributionName "));
    const nameText = (_b = authorName == null ? void 0 : authorName.textContent) == null ? void 0 : _b.trim();
    if (nameText) {
      const p = document.createElement("p");
      p.textContent = nameText;
      row2.appendChild(p);
    }
    const row3 = document.createDocumentFragment();
    row3.appendChild(document.createComment(" field:attributionTitle "));
    const titleText = (_c = authorTitle == null ? void 0 : authorTitle.textContent) == null ? void 0 : _c.trim();
    if (titleText) {
      const p = document.createElement("p");
      p.textContent = titleText;
      row3.appendChild(p);
    }
    const row4 = document.createDocumentFragment();
    row4.appendChild(document.createComment(" field:attributionImage "));
    const row5 = document.createDocumentFragment();
    row5.appendChild(document.createComment(" field:quoteFragment "));
    const row6 = document.createDocumentFragment();
    row6.appendChild(document.createComment(" field:backgroundImage "));
    if (bgPicture) {
      const p = document.createElement("p");
      p.appendChild(bgPicture);
      row6.appendChild(p);
    }
    const row7 = document.createDocumentFragment();
    row7.appendChild(document.createComment(" field:backgroundImageAlt "));
    if (bgAlt) {
      const p = document.createElement("p");
      p.textContent = bgAlt;
      row7.appendChild(p);
    }
    const cells = [
      [row0],
      // Row 0: quoteType
      [row1],
      // Row 1: quotation
      [row2],
      // Row 2: attributionName
      [row3],
      // Row 3: attributionTitle
      [row4],
      // Row 4: attributionImage
      [row5],
      // Row 5: quoteFragment
      [row6],
      // Row 6: backgroundImage
      [row7]
      // Row 7: backgroundImageAlt
    ];
    const block = WebImporter.Blocks.createBlock(document, { name: "quote", cells });
    applyAnalytics(element, block, document);
    element.replaceWith(block);
  }

  // tools/importer/parsers/embed.js
  function parse5(element, { document }) {
    let videoUrl = "";
    const ytIframe = element.querySelector('iframe[src*="youtube"], iframe[src*="youtu.be"]');
    if (ytIframe) {
      const src = ytIframe.getAttribute("src") || "";
      const videoIdMatch = src.match(/embed\/([a-zA-Z0-9_-]+)/);
      if (videoIdMatch) {
        videoUrl = `https://www.youtube.com/watch?v=${videoIdMatch[1]}`;
      }
    }
    if (!videoUrl) {
      const ytEl = element.querySelector("[data-youtube-id]");
      if (ytEl) {
        const ytId = ytEl.getAttribute("data-youtube-id");
        if (ytId) videoUrl = `https://www.youtube.com/watch?v=${ytId}`;
      }
    }
    if (!videoUrl) {
      const bcEl = element.querySelector("video-js, [data-video-id]");
      if (bcEl) {
        const videoId = bcEl.getAttribute("data-video-id");
        const account = bcEl.getAttribute("data-account") || "2157889325001";
        if (videoId) {
          videoUrl = `https://players.brightcove.net/${account}/default_default/index.html?videoId=${videoId}`;
        }
      }
    }
    if (!videoUrl) {
      const cmpVideo2 = element.querySelector("[data-video-url]");
      if (cmpVideo2) videoUrl = cmpVideo2.getAttribute("data-video-url");
    }
    if (!videoUrl) {
      const link = element.querySelector('a[href*="youtube"], a[href*="vimeo"], a[href*="brightcove"]');
      if (link) videoUrl = link.href;
    }
    const thumbnail = element.querySelector("picture") || element.querySelector('img.cmp-video__thumbnail, img[class*="thumbnail"]') || element.querySelector(".cmp-image picture") || element.querySelector("img");
    const cmpVideo = element.querySelector("[data-overlay-title]") || element;
    const overlayTitle = cmpVideo.getAttribute("data-overlay-title") || "";
    const overlayDesc = cmpVideo.getAttribute("data-overlay-desc") || "";
    const overlayBtn = cmpVideo.getAttribute("data-overlay-btn") || "";
    const cellFrag = document.createDocumentFragment();
    cellFrag.appendChild(document.createComment(" field:embed_placeholder "));
    if (thumbnail) {
      const pic = thumbnail.tagName === "PICTURE" ? thumbnail : thumbnail.closest("picture") || thumbnail;
      const p = document.createElement("p");
      p.appendChild(pic);
      cellFrag.appendChild(p);
    }
    cellFrag.appendChild(document.createComment(" field:embed_title "));
    if (overlayTitle) {
      const h2 = document.createElement("h2");
      h2.textContent = overlayTitle;
      cellFrag.appendChild(h2);
    }
    cellFrag.appendChild(document.createComment(" field:embed_description "));
    if (overlayDesc) {
      const p = document.createElement("p");
      p.textContent = overlayDesc;
      cellFrag.appendChild(p);
    }
    cellFrag.appendChild(document.createComment(" field:embed_buttonLabel "));
    if (overlayBtn) {
      const p = document.createElement("p");
      p.textContent = overlayBtn;
      cellFrag.appendChild(p);
    }
    cellFrag.appendChild(document.createComment(" field:embed_uri "));
    if (videoUrl) {
      const p = document.createElement("p");
      const link = document.createElement("a");
      link.href = videoUrl;
      link.textContent = videoUrl;
      p.appendChild(link);
      cellFrag.appendChild(p);
    }
    const cells = [[cellFrag]];
    const block = WebImporter.Blocks.createBlock(document, { name: "embed", cells });
    applyAnalytics(element, block, document);
    element.replaceWith(block);
  }

  // tools/importer/parsers/accordion.js
  function parse6(element, { document }) {
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
      const summaryFrag = document.createDocumentFragment();
      summaryFrag.appendChild(document.createComment(" field:summary "));
      if (titleEl) {
        const p = document.createElement("p");
        p.textContent = titleEl.textContent.trim();
        summaryFrag.appendChild(p);
      }
      const bodyFrag = document.createDocumentFragment();
      bodyFrag.appendChild(document.createComment(" field:text "));
      if (panelEl) {
        while (panelEl.firstChild) {
          bodyFrag.appendChild(panelEl.firstChild);
        }
      }
      cells.push([summaryFrag, bodyFrag]);
    });
    if (cells.length === 0) {
      element.replaceWith(document.createTextNode(""));
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "accordion", cells });
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

  // tools/importer/import-landing-page.js
  var parsers = {
    "hero": parse,
    "columns": parse2,
    "cards": parse3,
    "quote": parse4,
    "embed": parse5,
    "accordion": parse6
  };
  var PAGE_TEMPLATE = {
    name: "landing-page",
    description: "Hub landing page for the Our People section with hero, navigation cards to sub-sections, and featured content",
    urls: [
      "https://www.abbvie.com/science/our-people.html"
    ],
    blocks: [
      {
        name: "hero",
        instances: [".container.overlap-predecessor"]
      },
      {
        name: "columns",
        instances: [
          ".container.cmp-container-full-width.height-short:not(.no-bottom-margin):not(.medium-radius) > .cmp-container > .grid:first-child",
          ".container.no-bottom-margin.no-padding > .cmp-container > .grid",
          ".container.medium-radius.cmp-container-full-width.height-short.no-bottom-margin:last-of-type > .cmp-container > .grid"
        ]
      },
      {
        name: "cards",
        instances: [
          ".container.cmp-container-full-width.height-short:not(.no-bottom-margin):not(.medium-radius) > .cmp-container > .grid:not(:first-child)"
        ]
      },
      {
        name: "quote",
        instances: [".container.semi-transparent-layer .cmp-quote"]
      },
      {
        name: "embed",
        instances: [".video.cmp-video-full-width.video-default.aem-GridColumn"]
      },
      {
        name: "accordion",
        instances: [".accordion.cmp-accordion-large"]
      }
    ],
    sections: [
      {
        id: "section-1-hero",
        name: "Hero Section",
        selector: [".container.large-radius.cmp-container-full-width.height-default", ".container.overlap-predecessor.medium-radius"],
        style: "navy-overlap",
        blocks: ["hero"],
        defaultContent: []
      },
      {
        id: "section-2-featured-video",
        name: "Featured Video with Description",
        selector: ".container.cmp-container-full-width.height-short:not(.no-bottom-margin)",
        style: null,
        blocks: ["columns"],
        defaultContent: []
      },
      {
        id: "section-3-video-pairs",
        name: "Video Card Pairs",
        selector: [".grid.cmp-grid-custom.no-bottom-margin", ".grid:not(.cmp-grid-custom):has(.video)"],
        style: null,
        blocks: ["cards"],
        defaultContent: []
      },
      {
        id: "section-5-quote",
        name: "Quote with Background Image",
        selector: ".container.semi-transparent-layer.large-radius",
        style: "dark",
        blocks: ["quote"],
        defaultContent: []
      },
      {
        id: "section-6-explore",
        name: "Explore R&D Community",
        selector: ".container.no-bottom-margin.no-padding",
        style: null,
        blocks: ["columns"],
        defaultContent: []
      },
      {
        id: "section-7-discovery-video",
        name: "Discovery Files Video",
        selector: ".video.cmp-video-full-width.video-default.aem-GridColumn",
        style: null,
        blocks: ["embed"],
        defaultContent: []
      },
      {
        id: "section-8-faq",
        name: "Frequently Asked Questions",
        selector: ".container.default-radius.cmp-container-xxx-large",
        style: null,
        blocks: ["accordion"],
        defaultContent: [".cmp-title.align-center h2"]
      },
      {
        id: "section-9-cta",
        name: "CTA Banner",
        selector: ".container.medium-radius.cmp-container-full-width.height-short.no-bottom-margin:last-of-type",
        style: "navy",
        blocks: ["columns"],
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
  var import_landing_page_default = {
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
  return __toCommonJS(import_landing_page_exports);
})();
