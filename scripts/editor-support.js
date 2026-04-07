import { showSlide } from '../blocks/carousel/carousel.js';
import {
  decorateBlock,
  decorateBlocks,
  decorateButtons,
  decorateIcons,
  decorateSections,
  loadBlock,
  loadScript,
  loadSections,
  getMetadata,
} from './aem.js';
import { decorateRichtext } from './editor-support-rte.js';
import { decorateMain } from './scripts.js';

function getEditorBrandCode() {
  const rawBrand = getMetadata('brand') || getMetadata('keywords') || '';
  return rawBrand
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
}

async function manifestExists(path) {
  try {
    const response = await fetch(path, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function replaceEditorManifest(selector, fallbackFile, replacementFile) {
  const script = document.querySelector(selector);
  if (!script) {
    console.warn(`Script with "${fallbackFile}" not found.`);
    return;
  }

  const targetSrc = script.src.replace(/[^/]+$/, replacementFile);
  if (replacementFile === fallbackFile || (await manifestExists(targetSrc))) {
    script.src = targetSrc;
  }
}

function loadEditorManifestEntry({ selector, fallbackFile, replacementFile }) {
  return replaceEditorManifest(selector, fallbackFile, replacementFile);
}

const loadEditorManifests = async () => {
  try {
    const brand = getEditorBrandCode();
    const manifestMap = [
      {
        selector: 'script[src*="component-filters.json"]',
        fallbackFile: 'component-filters.json',
        replacementFile: brand
          ? `brands/${brand}/component-filters.json`
          : 'component-filters.json',
      },
      {
        selector: 'script[src*="component-definition.json"]',
        fallbackFile: 'component-definition.json',
        replacementFile: brand
          ? `brands/${brand}/component-definition.json`
          : 'component-definition.json',
      },
      {
        selector: 'script[src*="component-models.json"]',
        fallbackFile: 'component-models.json',
        replacementFile: brand
          ? `brands/${brand}/component-models.json`
          : 'component-models.json',
      },
    ];

    await Promise.all(manifestMap.map(loadEditorManifestEntry));
  } catch (error) {
    console.error('Error in loadEditorManifests:', error);
  }
};

function getState(block) {
  if (block.matches('.accordion')) {
    return [...block.querySelectorAll('details[open]')].map(
      (details) => details.dataset.aueResource,
    );
  }
  if (block.matches('.carousel')) {
    return block.dataset.activeSlide;
  }
  if (block.matches('.tabs')) {
    const [currentPanel] = block.querySelectorAll(
      '.tabs-panel[aria-hidden="false"]',
    );
    return currentPanel?.dataset.aueResource;
  }

  return null;
}

function setState(block, state) {
  if (block.matches('.accordion')) {
    block.querySelectorAll('details').forEach((details) => {
      details.open = state.includes(details.dataset.aueResource);
    });
  }
  if (block.matches('.carousel')) {
    block.style.display = null;
    showSlide(block, state, 'instant');
  }
  if (block.matches('.tabs')) {
    const tabs = [...block.querySelectorAll('.tabs-panel')];
    const index = tabs.findIndex((tab) => tab.dataset.aueResource === state);
    if (index !== -1) {
      block.querySelectorAll('.tabs-list button')[index]?.click();
    }
  }
}

async function applyChanges(event) {
  // redecorate default content and blocks on patches (in the properties rail)
  const { detail } = event;

  const resource = detail?.request?.target?.resource // update, patch components
    || detail?.request?.target?.container?.resource // update, patch, add to sections
    || detail?.request?.to?.container?.resource; // move in sections
  if (!resource) return false;
  const updates = detail?.response?.updates;
  if (!updates.length) return false;
  const { content } = updates[0];
  if (!content) return false;

  // load dompurify
  await loadScript(`${window.hlx.codeBasePath}/scripts/dompurify.min.js`);

  const sanitizedContent = window.DOMPurify.sanitize(content, {
    USE_PROFILES: { html: true },
  });
  const parsedUpdate = new DOMParser().parseFromString(
    sanitizedContent,
    'text/html',
  );
  const element = document.querySelector(`[data-aue-resource="${resource}"]`);

  if (element) {
    if (element.matches('main')) {
      const newMain = parsedUpdate.querySelector(
        `[data-aue-resource="${resource}"]`,
      );
      newMain.style.display = 'none';
      element.insertAdjacentElement('afterend', newMain);
      decorateMain(newMain);
      decorateRichtext(newMain);
      await loadSections(newMain);
      element.remove();
      newMain.style.display = null;
      // eslint-disable-next-line no-use-before-define
      attachEventListners(newMain);
      return true;
    }

    const block = element.parentElement?.closest('.block[data-aue-resource]')
      || element?.closest('.block[data-aue-resource]');
    if (block) {
      const state = getState(block);
      const blockResource = block.getAttribute('data-aue-resource');
      const newBlock = parsedUpdate.querySelector(
        `[data-aue-resource="${blockResource}"]`,
      );
      if (newBlock) {
        newBlock.style.display = 'none';
        block.insertAdjacentElement('afterend', newBlock);
        decorateButtons(newBlock);
        decorateIcons(newBlock);
        decorateBlock(newBlock);
        decorateRichtext(newBlock);
        await loadBlock(newBlock);
        block.remove();
        setState(newBlock, state);
        newBlock.style.display = null;
        return true;
      }
    } else {
      // sections and default content, may be multiple in the case of richtext
      const newElements = parsedUpdate.querySelectorAll(
        `[data-aue-resource="${resource}"],[data-richtext-resource="${resource}"]`,
      );
      if (newElements.length) {
        const { parentElement } = element;
        if (element.matches('.section')) {
          const [newSection] = newElements;
          newSection.style.display = 'none';
          element.insertAdjacentElement('afterend', newSection);
          decorateButtons(newSection);
          decorateIcons(newSection);
          decorateRichtext(newSection);
          decorateSections(parentElement);
          decorateBlocks(parentElement);
          await loadSections(parentElement);
          element.remove();
          newSection.style.display = null;
        } else {
          element.replaceWith(...newElements);
          decorateButtons(parentElement);
          decorateIcons(parentElement);
          decorateRichtext(parentElement);
        }
        return true;
      }
    }
  }

  return false;
}

function handleSelection(event) {
  const { detail } = event;
  const resource = detail?.resource;

  if (resource) {
    const element = document.querySelector(`[data-aue-resource="${resource}"]`);
    const block = element.parentElement?.closest('.block[data-aue-resource]')
      || element?.closest('.block[data-aue-resource]');

    if (block && block.matches('.accordion')) {
      // close all details
      const details = element.matches('details')
        ? element
        : element.querySelector('details');
      setState(block, [details.dataset.aueResource]);
    }

    if (block && block.matches('.carousel')) {
      const slideIndex = [
        ...block.querySelectorAll('.carousel-slide'),
      ].findIndex((slide) => slide === element);
      setState(block, slideIndex);
    }

    if (block && block.matches('.tabs')) {
      setState(block, element.dataset.aueResource);
    }
  }
}

function attachEventListners(main) {
  [
    'aue:content-patch',
    'aue:content-update',
    'aue:content-add',
    'aue:content-move',
    'aue:content-remove',
    'aue:content-copy',
  ].forEach((eventType) => main?.addEventListener(eventType, async (event) => {
    event.stopPropagation();
    const applied = await applyChanges(event);
    if (!applied) window.location.reload();
  }));

  main?.addEventListener('aue:ui-select', handleSelection);
}

attachEventListners(document.querySelector('main'));

// decorate rich text
// this has to happen after decorateMain(), and everythime decorateBlocks() is called
decorateRichtext();
// in cases where the block decoration is not done in one synchronous iteration we need to listen
// for new richtext-instrumented elements. this happens for example when using experimentation.
const observer = new MutationObserver(() => decorateRichtext());
observer.observe(document, {
  attributeFilter: ['data-richtext-prop'],
  subtree: true,
});

loadEditorManifests();
