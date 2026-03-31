export default async function decorate(block) {
  const type = [...block.classList].filter((c) => c !== 'block' && c !== 'header-content').pop();
  block.dataset.type = type || 'menu';
}
