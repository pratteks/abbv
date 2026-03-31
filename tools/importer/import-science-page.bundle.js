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

  // tools/importer/import-science-page.js
  var import_science_page_exports = {};
  __export(import_science_page_exports, {
    default: () => import_science_page_default
  });

  // tools/importer/parsers/hero.js
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
  function parse2(element, { document }) {
    const gridRows = element.querySelectorAll(".grid-row");
    const cells = [];
    if (gridRows.length > 0) {
      gridRows.forEach((row) => {
        const gridCells = row.querySelectorAll(':scope > .grid-cell, :scope > .grid-row__col-with-1, :scope > .grid-row__col-with-2, :scope > .grid-row__col-with-3, :scope > .grid-row__col-with-4, :scope > .grid-row__col-with-5, :scope > [class*="grid-row__col"]');
        if (gridCells.length === 0) return;
        const rowCells = [];
        gridCells.forEach((cell) => {
          resolveLazyImages(cell);
          const frag = document.createDocumentFragment();
          while (cell.firstChild) {
            frag.appendChild(cell.firstChild);
          }
          rowCells.push(frag);
        });
        if (rowCells.length > 0) {
          cells.push(rowCells);
        }
      });
    } else {
      const containers = element.querySelectorAll(":scope > .cmp-container > div, :scope > div > .cmp-container > div");
      if (containers.length >= 2) {
        const rowCells = [];
        containers.forEach((container) => {
          const frag = document.createDocumentFragment();
          while (container.firstChild) {
            frag.appendChild(container.firstChild);
          }
          rowCells.push(frag);
        });
        cells.push(rowCells);
      }
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "columns", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/embed.js
  function parse3(element, { document }) {
    const posterImg = element.querySelector('.cmp-image img, img.cmp-image__image, img[class*="poster"], img[class*="thumbnail"]');
    const brightcoveContainer = element.querySelector('.brightcove-video, [class*="brightcove"]');
    const videoLink = element.querySelector('a[href*="brightcove"], a[href*="video"], .cmp-button[href]');
    let videoUrl = "";
    if (videoLink) {
      videoUrl = videoLink.getAttribute("href") || "";
    } else if (brightcoveContainer) {
      const dataAccount = brightcoveContainer.getAttribute("data-account") || "";
      const dataVideoId = brightcoveContainer.getAttribute("data-video-id") || "";
      if (dataAccount && dataVideoId) {
        videoUrl = "https://players.brightcove.net/" + dataAccount + "/default_default/index.html?videoId=" + dataVideoId;
      }
    }
    const heading = element.querySelector(".cmp-title h2, .cmp-title h3, .cmp-title__text");
    const descText = element.querySelector(".cmp-text p, .cmp-text");
    const buttonLabel = element.querySelector(".cmp-button__text, .cmp-button");
    const buttonText = buttonLabel ? buttonLabel.textContent.trim() : "";
    const contentFrag = document.createDocumentFragment();
    contentFrag.appendChild(document.createComment(" field:embed_placeholder "));
    if (posterImg) {
      contentFrag.appendChild(posterImg);
    }
    contentFrag.appendChild(document.createComment(" field:embed_title "));
    if (heading) {
      contentFrag.appendChild(document.createTextNode(heading.textContent.trim()));
    }
    contentFrag.appendChild(document.createComment(" field:embed_description "));
    if (descText) {
      contentFrag.appendChild(document.createTextNode(descText.textContent.trim()));
    }
    contentFrag.appendChild(document.createComment(" field:embed_buttonLabel "));
    if (buttonText) {
      contentFrag.appendChild(document.createTextNode(buttonText));
    }
    contentFrag.appendChild(document.createComment(" field:embed_uri "));
    if (videoUrl) {
      const link = document.createElement("a");
      link.href = videoUrl;
      link.textContent = videoUrl;
      contentFrag.appendChild(link);
    }
    const cells = [[contentFrag]];
    const block = WebImporter.Blocks.createBlock(document, { name: "embed", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards.js
  function resolveLazyImages2(container, document) {
    container.querySelectorAll("img[data-cmp-src]").forEach((img) => {
      const src = img.getAttribute("src") || "";
      const lazySrc = img.getAttribute("data-cmp-src") || "";
      if (lazySrc && (!src || src.startsWith("data:"))) {
        img.setAttribute("src", lazySrc);
      }
    });
    container.querySelectorAll(".cmp-image[data-cmp-src]").forEach((cmpImage) => {
      const lazySrc = cmpImage.getAttribute("data-cmp-src") || "";
      if (!lazySrc) return;
      let img = cmpImage.querySelector("img");
      if (img) {
        const src = img.getAttribute("src") || "";
        if (!src || src.startsWith("data:")) {
          img.setAttribute("src", lazySrc);
        }
      } else {
        img = document.createElement("img");
        img.setAttribute("src", lazySrc);
        img.setAttribute("alt", cmpImage.getAttribute("data-asset-name") || "");
        cmpImage.appendChild(img);
      }
    });
  }
  function parse4(element, { document }) {
    const dashboardCards = element.querySelectorAll(".dashboardcards");
    if (dashboardCards.length > 0) {
      parseDashboardCards(dashboardCards, element, document);
      return;
    }
    parseStoryCards(element, document);
  }
  function parseDashboardCards(cards, element, document) {
    const cells = [];
    cards.forEach((card) => {
      const facts = card.querySelector(".dashboard-card-facts");
      if (!facts) return;
      const imageEl = facts.querySelector("img.facts-image");
      const imgFrag = document.createDocumentFragment();
      imgFrag.appendChild(document.createComment(" field:image "));
      if (imageEl) {
        const p = document.createElement("p");
        const img = document.createElement("img");
        img.src = imageEl.getAttribute("src") || imageEl.getAttribute("data-cmp-src") || "";
        img.alt = imageEl.getAttribute("alt") || "";
        p.appendChild(img);
        imgFrag.appendChild(p);
      }
      const eyebrow = facts.querySelector(".eyebrow");
      const number = facts.querySelector(".data-point");
      const suffix = facts.querySelector(".data-point-suffix");
      const desc = facts.querySelector(".description");
      const textFrag = document.createDocumentFragment();
      textFrag.appendChild(document.createComment(" field:text "));
      if (eyebrow && eyebrow.textContent.trim()) {
        const p = document.createElement("p");
        const strong = document.createElement("strong");
        strong.textContent = eyebrow.textContent.trim();
        p.appendChild(strong);
        textFrag.appendChild(p);
      }
      const numText = (number ? number.textContent.trim() : "") + (suffix ? suffix.textContent.trim() : "");
      if (numText) {
        const p = document.createElement("p");
        p.textContent = numText;
        textFrag.appendChild(p);
      }
      if (desc && desc.textContent.trim()) {
        const p = document.createElement("p");
        p.textContent = desc.textContent.trim();
        textFrag.appendChild(p);
      }
      cells.push([imgFrag, textFrag]);
    });
    if (cells.length === 0) return;
    let bgImgSrc = null;
    let bgImgEl = null;
    let ancestor = element.parentElement;
    while (ancestor) {
      bgImgEl = ancestor.querySelector(":scope > img.cmp-container__bg-image");
      if (!bgImgEl) {
        for (const child of ancestor.children) {
          if (child.tagName === "IMG" && child.classList.contains("cmp-container__bg-image")) {
            bgImgEl = child;
            break;
          }
        }
      }
      if (bgImgEl) {
        bgImgSrc = bgImgEl.getAttribute("src") || bgImgEl.getAttribute("data-cmp-src") || "";
        bgImgEl.remove();
        break;
      }
      ancestor = ancestor.parentElement;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "Cards", cells });
    element.innerHTML = "";
    element.appendChild(block);
    if (bgImgSrc) {
      const img = document.createElement("img");
      img.src = bgImgSrc;
      const sectionMeta = WebImporter.Blocks.createBlock(document, {
        name: "Section Metadata",
        cells: { background: img }
      });
      element.appendChild(sectionMeta);
    }
  }
  function parseStoryCards(element, document) {
    resolveLazyImages2(element, document);
    const gridCells = element.querySelectorAll('.grid-row > .grid-cell, .grid-row > [class*="grid-row__col"]');
    const cells = [];
    gridCells.forEach((cell) => {
      const img = cell.querySelector(".cmp-image img, img.cmp-image__image");
      const imgFrag = document.createDocumentFragment();
      imgFrag.appendChild(document.createComment(" field:image "));
      if (img) {
        imgFrag.appendChild(img);
      }
      const title = cell.querySelector(".cmp-header__text, .cmp-header");
      const desc = cell.querySelector(".cmp-text p, .cmp-text");
      const ctaLink = cell.querySelector(".cmp-button, a.cmp-button");
      const textFrag = document.createDocumentFragment();
      textFrag.appendChild(document.createComment(" field:text "));
      if (title) {
        const strong = document.createElement("strong");
        strong.textContent = title.textContent.trim();
        const p = document.createElement("p");
        p.appendChild(strong);
        textFrag.appendChild(p);
      }
      if (desc) {
        textFrag.appendChild(desc);
      }
      if (ctaLink) {
        const p = document.createElement("p");
        const a = document.createElement("a");
        a.href = ctaLink.getAttribute("href") || ctaLink.href || "";
        const btnText = ctaLink.querySelector(".cmp-button__text");
        a.textContent = btnText ? btnText.textContent.trim() : ctaLink.textContent.trim();
        p.appendChild(a);
        textFrag.appendChild(p);
      }
      cells.push([imgFrag, textFrag]);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "cards", cells });
    element.replaceWith(block);
  }

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

  // tools/importer/parsers/accordion.js
  function parse5(element, { document }) {
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

  // tools/importer/transformers/abbvie-sections.js
  function transform2(hookName, element, payload) {
    if (hookName !== "afterTransform") return;
    const { template } = payload || {};
    const sections = template && template.sections;
    if (!sections || sections.length < 2) return;
    const document = element.ownerDocument;
    flattenDOM(element);
    console.log(`[sections] afterTransform: flattened to ${element.children.length} direct children`);
    const boundaries = findSectionBoundaries(element, sections);
    console.log(`[sections] found ${boundaries.length} section boundaries`);
    insertSectionBreaks(element, document, boundaries);
  }
  function getBlockNameFromTable(table) {
    if (!table.rows || !table.rows[0]) return null;
    const firstRow = table.rows[0];
    const firstCell = firstRow.cells && firstRow.cells[0];
    if (!firstCell) return null;
    const name = firstCell.textContent.trim().split("\n")[0].trim();
    return name ? name.toLowerCase() : null;
  }
  function flattenDOM(root) {
    let iterations = 0;
    const MAX_ITER = 500;
    while (iterations++ < MAX_ITER) {
      let unwrapped = false;
      const children = Array.from(root.children);
      for (const child of children) {
        if (shouldUnwrap(child)) {
          while (child.firstChild) {
            root.insertBefore(child.firstChild, child);
          }
          child.remove();
          unwrapped = true;
          break;
        }
      }
      if (!unwrapped) break;
    }
    for (const child of Array.from(root.childNodes)) {
      if (child.nodeType === 3 && !child.textContent.trim()) {
        child.remove();
      }
    }
  }
  function shouldUnwrap(el) {
    const tag = el.tagName.toLowerCase();
    if (tag === "table") return false;
    if (tag === "hr") return false;
    if ([
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "p",
      "ul",
      "ol",
      "li",
      "blockquote",
      "pre",
      "img",
      "picture",
      "video",
      "audio",
      "figure",
      "figcaption",
      "a",
      "strong",
      "em",
      "br"
    ].includes(tag)) {
      return false;
    }
    return true;
  }
  function findSectionBoundaries(root, sections) {
    const children = Array.from(root.children);
    const blockTables = [];
    children.forEach((child, idx) => {
      if (child.tagName === "TABLE") {
        const blockName = getBlockNameFromTable(child);
        if (blockName && blockName !== "section metadata" && blockName !== "metadata") {
          blockTables.push({ element: child, name: blockName, pos: idx, claimed: false });
        }
      }
    });
    const blockTableQueues = {};
    blockTables.forEach((bt) => {
      if (!blockTableQueues[bt.name]) blockTableQueues[bt.name] = [];
      blockTableQueues[bt.name].push(bt);
    });
    Object.keys(blockTableQueues).forEach((name) => {
      console.log(`[sections]   block tables: "${name}" x${blockTableQueues[name].length}`);
    });
    const consumedIdx = {};
    const boundaries = [];
    let lastClaimedPos = -1;
    sections.forEach((section, sIdx) => {
      const hasBlocks = section.blocks && section.blocks.length > 0;
      const hasDefaultContent = section.defaultContent && section.defaultContent.length > 0;
      if (!hasBlocks) {
        if (hasDefaultContent || section.style) {
          boundaries.push({
            sectionIdx: sIdx,
            sectionName: section.name,
            anchorElement: null,
            sectionStart: null,
            style: section.style,
            unanchored: true
          });
          console.log(`[sections]   section ${sIdx} (${section.name}): text-only, unanchored`);
        } else {
          console.log(`[sections]   section ${sIdx} (${section.name}): no blocks/content, skipping`);
        }
        return;
      }
      const primaryBlock = section.blocks[0];
      if (!consumedIdx[primaryBlock]) consumedIdx[primaryBlock] = 0;
      const queue = blockTableQueues[primaryBlock] || [];
      const instIdx = consumedIdx[primaryBlock];
      if (instIdx >= queue.length) {
        if (section.style || hasDefaultContent) {
          boundaries.push({
            sectionIdx: sIdx,
            sectionName: section.name,
            anchorElement: null,
            sectionStart: null,
            style: section.style,
            unanchored: true
          });
          console.log(`[sections]   section ${sIdx} (${section.name}): no ${primaryBlock} table, unanchored`);
        } else {
          console.log(`[sections]   section ${sIdx} (${section.name}): no ${primaryBlock} table, skipped`);
        }
        return;
      }
      const candidate = queue[instIdx];
      const remainingBlockTypes = /* @__PURE__ */ new Set();
      for (let j = sIdx + 1; j < sections.length; j++) {
        if (sections[j].blocks && sections[j].blocks.length > 0) {
          remainingBlockTypes.add(sections[j].blocks[0]);
        }
      }
      const hasIntervening = blockTables.some((bt) => !bt.claimed && bt.pos > lastClaimedPos && bt.pos < candidate.pos && remainingBlockTypes.has(bt.name));
      if (hasIntervening) {
        if (section.style || hasDefaultContent) {
          boundaries.push({
            sectionIdx: sIdx,
            sectionName: section.name,
            anchorElement: null,
            sectionStart: null,
            style: section.style,
            unanchored: true
          });
          console.log(`[sections]   section ${sIdx} (${section.name}): skipped ${primaryBlock}[${instIdx}] (intervening), unanchored`);
        } else {
          console.log(`[sections]   section ${sIdx} (${section.name}): skipped ${primaryBlock}[${instIdx}] (intervening)`);
        }
        return;
      }
      candidate.claimed = true;
      consumedIdx[primaryBlock] = instIdx + 1;
      let sectionStart = candidate.element;
      if (hasDefaultContent) {
        let prev = sectionStart.previousElementSibling;
        while (prev) {
          const tag = prev.tagName.toLowerCase();
          if (tag === "table" || tag === "hr") break;
          if ([
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "p",
            "ul",
            "ol",
            "a",
            "img",
            "picture",
            "blockquote",
            "figure"
          ].includes(tag)) {
            sectionStart = prev;
          } else {
            break;
          }
          prev = prev.previousElementSibling;
        }
      }
      boundaries.push({
        sectionIdx: sIdx,
        sectionName: section.name,
        anchorElement: candidate.element,
        sectionStart,
        style: section.style,
        unanchored: false
      });
      lastClaimedPos = candidate.pos;
      console.log(`[sections]   section ${sIdx} (${section.name}): anchored to ${primaryBlock}[${instIdx}] at pos ${candidate.pos}`);
    });
    for (let i = 0; i < boundaries.length; i++) {
      const boundary = boundaries[i];
      if (!boundary.unanchored) continue;
      let prevAnchorPos = -1;
      for (let j = i - 1; j >= 0; j--) {
        if (boundaries[j].anchorElement) {
          prevAnchorPos = children.indexOf(boundaries[j].anchorElement);
          break;
        }
      }
      let startElement = null;
      for (let k = prevAnchorPos + 1; k < children.length; k++) {
        const child = children[k];
        if (child.tagName === "TABLE") continue;
        const tag = child.tagName.toLowerCase();
        if ([
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "p",
          "ul",
          "ol",
          "a",
          "img",
          "picture",
          "blockquote",
          "figure"
        ].includes(tag)) {
          startElement = child;
          break;
        }
      }
      if (startElement) {
        boundary.sectionStart = startElement;
        console.log(`[sections]   section ${boundary.sectionIdx} (${boundary.sectionName}): unanchored, start at <${startElement.tagName.toLowerCase()}>`);
      } else {
        console.warn(`[sections]   section ${boundary.sectionIdx} (${boundary.sectionName}): unanchored, no content \u2014 removed`);
        boundaries.splice(i, 1);
        i--;
      }
    }
    boundaries.sort((a, b) => {
      const posA = children.indexOf(a.sectionStart);
      const posB = children.indexOf(b.sectionStart);
      return posA - posB;
    });
    console.log(`[sections] found ${boundaries.length} section boundaries`);
    return boundaries;
  }
  function insertSectionBreaks(root, document, boundaries) {
    if (boundaries.length === 0) return;
    for (let i = boundaries.length - 1; i >= 1; i--) {
      const boundary = boundaries[i];
      const prevBoundary = boundaries[i - 1];
      if (prevBoundary.style) {
        const sm = WebImporter.Blocks.createBlock(document, {
          name: "Section Metadata",
          cells: { style: prevBoundary.style }
        });
        root.insertBefore(sm, boundary.sectionStart);
      }
      const hr = document.createElement("hr");
      root.insertBefore(hr, boundary.sectionStart);
      console.log(`[sections]   HR before section ${boundary.sectionIdx} (${boundary.sectionName})`);
    }
    const lastBoundary = boundaries[boundaries.length - 1];
    if (lastBoundary.style) {
      const sm = WebImporter.Blocks.createBlock(document, {
        name: "Section Metadata",
        cells: { style: lastBoundary.style }
      });
      root.appendChild(sm);
      console.log(`[sections]   SM(${lastBoundary.style}) appended for last section ${lastBoundary.sectionIdx}`);
    }
  }

  // tools/importer/import-science-page.js
  var parsers = {
    "hero": parse,
    "columns": parse2,
    "embed": parse3,
    "cards": parse4,
    "accordion": parse5
  };
  var PAGE_TEMPLATE = {
    name: "science-page",
    urls: [
      "https://www.abbvie.com/science.html"
    ],
    description: "AbbVie Science landing page with hero, dashboard stats, video embed, content columns, cards, accordion, FAQ CTA band, and footer CTA sections. Note: AbbVie uses Scene7 lazy-loaded images (data-cmp-src) that require resolution during import.",
    blocks: [
      {
        name: "hero",
        instances: [".container.cmp-container-full-width.height-tall"]
      },
      {
        name: "columns",
        instances: [
          ".container.cmp-container-full-width:has(#container-7369813af9)",
          ".container.cmp-container-full-width:has(#container-5ab796dabb)",
          ".container.cmp-container-xxx-large:has(#title-b50438c68d)",
          ".container.cmp-container-full-width.footer-overlap"
        ]
      },
      {
        name: "embed",
        instances: [".container.cmp-container-full-width:has(.brightcove-video)"]
      },
      {
        name: "cards",
        instances: [".grid.cmp-grid-custom .grid-row", ".grid.cmp-grid-full-page-5-v1"]
      },
      {
        name: "accordion",
        instances: ["#accordion-c31e57db88"]
      }
    ],
    sections: [
      {
        id: "section-1",
        name: "Hero",
        selector: [".container.cmp-container-full-width.height-tall", ".container.overlap-predecessor.cmp-container-xx-large"],
        style: "navy-overlap, height-tall",
        blocks: ["hero"],
        defaultContent: []
      },
      {
        id: "section-2",
        name: "At a Glance Text",
        selector: ".teaser.light-theme",
        style: null,
        blocks: [],
        defaultContent: [".teaser.light-theme .cmp-teaser__pretitle", ".teaser.light-theme .cmp-teaser__title", ".teaser.light-theme .cmp-teaser__description"]
      },
      {
        id: "section-3",
        name: "Dashboard Stats",
        selector: ".container.cmp-container-full-width .cmp-grid-full-page-5-v1",
        style: "navy",
        blocks: ["cards"],
        defaultContent: []
      },
      {
        id: "section-4",
        name: "Core Focus Areas",
        selector: ".container.cmp-container-full-width:has(#container-7369813af9)",
        style: "dark",
        blocks: ["columns"],
        defaultContent: []
      },
      {
        id: "section-5",
        name: "R&D Video",
        selector: ".container.cmp-container-full-width:has(.brightcove-video)",
        style: null,
        blocks: ["embed"],
        defaultContent: []
      },
      {
        id: "section-6",
        name: "Explore Our Science",
        selector: ".container.cmp-container-full-width:has(#container-5ab796dabb)",
        style: null,
        blocks: ["columns"],
        defaultContent: []
      },
      {
        id: "section-7",
        name: "Tenacity / Behind the Science",
        selector: ".container.cmp-container-xxx-large:has(#title-b50438c68d)",
        style: null,
        blocks: ["columns"],
        defaultContent: []
      },
      {
        id: "section-8",
        name: "Stories Behind Our Science",
        selector: ".container:has(#container-b38daf1189)",
        style: null,
        blocks: ["cards"],
        defaultContent: ["#title-3311f030ae", "#text-78ba5a63d0"]
      },
      {
        id: "section-9",
        name: "FAQ + CTA Band",
        selector: ".container.cmp-container-full-width:has(#accordion-c31e57db88)",
        style: null,
        blocks: ["accordion"],
        defaultContent: [
          "#title-d188a77aca",
          ".cmp-image:has([data-cmp-src*='Cambridge'])",
          "#title-cta-bold-science",
          ".cmp-text:has(a[href*='research-and-development'])"
        ]
      },
      {
        id: "section-10",
        name: "CTA / Careers",
        selector: ".container.cmp-container-full-width.footer-overlap",
        style: "highlight",
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
        try {
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
        } catch (e) {
          console.warn(`Invalid selector for block "${blockDef.name}": ${selector}`, e.message);
        }
      });
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  var import_science_page_default = {
    /**
     * Main transformation function using the 'one input / multiple outputs' pattern.
     */
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
  return __toCommonJS(import_science_page_exports);
})();
