import {
  buildBlock,
  decorateBlock,
  loadBlock,
  loadCSS,
} from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/*
  This is not a traditional block, so there is no decorate function.
  Instead, links to a /modals/ path are automatically transformed into a modal.
  Other blocks can also use the createModal() and openModal() functions.
  Modal fragments may use data-modal-action="confirm" on a control to finish
  gated flows (e.g. link list: confirm, then navigate).
*/

/**
 * @param {Node[]} contentNodes
 * @param {{ onConfirm?: () => void, modalType?: string }} [opts]
 */
export async function createModal(contentNodes, opts = {}) {
  await loadCSS(`${window.hlx.codeBasePath}/blocks/modal/modal.css`);
  const dialog = document.createElement('dialog');
  const { onConfirm, modalType } = opts;
  if (modalType) {
    dialog.dataset.modalType = modalType;
  }
  const dialogContent = document.createElement('div');
  dialogContent.classList.add('modal-content');
  dialogContent.append(...contentNodes);
  dialog.append(dialogContent);

  if (typeof onConfirm === 'function') {
    dialogContent.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-modal-action="confirm"]');
      if (!trigger) return;
      e.preventDefault();
      onConfirm();
      dialog.close();
    });
  }

  const closeButton = document.createElement('button');
  closeButton.classList.add('close-button');
  closeButton.setAttribute('aria-label', 'Close');
  closeButton.type = 'button';
  closeButton.innerHTML = '<span class="icon icon-close"></span>';
  closeButton.addEventListener('click', () => dialog.close());
  dialog.prepend(closeButton);

  const block = buildBlock('modal', '');
  document.querySelector('main').append(block);
  decorateBlock(block);
  await loadBlock(block);

  // close on click outside the dialog
  dialog.addEventListener('click', (e) => {
    const {
      left, right, top, bottom,
    } = dialog.getBoundingClientRect();
    const { clientX, clientY } = e;
    if (
      clientX < left
      || clientX > right
      || clientY < top
      || clientY > bottom
    ) {
      dialog.close();
    }
  });

  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    block.remove();
  });

  block.innerHTML = '';
  block.append(dialog);

  return {
    block,
    showModal: () => {
      dialog.showModal();
      // reset scroll position
      setTimeout(() => {
        dialogContent.scrollTop = 0;
      }, 0);
      document.body.classList.add('modal-open');
    },
  };
}

/**
 * @param {string} fragmentUrl
 * @param {{ onConfirm?: () => void, modalType?: string }} [options]
 */
export async function openModal(fragmentUrl, options = {}) {
  const path = fragmentUrl.startsWith('http')
    ? new URL(fragmentUrl, window.location).pathname
    : fragmentUrl;

  const fragment = await loadFragment(path);
  if (!fragment) {
    throw new Error(`Modal: fragment not found at ${path}`);
  }
  const { showModal } = await createModal([...fragment.childNodes], options);
  showModal();
}
