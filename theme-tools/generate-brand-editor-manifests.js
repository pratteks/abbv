const fs = require('node:fs').promises;
const path = require('node:path');
const glob = require('glob');

const ROOT = process.cwd();
const BRAND_CONFIG_PATH = path.join(ROOT, 'brand-config.json');
const BASE_MODELS_PATH = path.join(ROOT, 'component-models.json');
const BASE_DEFINITION_PATH = path.join(ROOT, 'component-definition.json');
const BASE_FILTERS_PATH = path.join(ROOT, 'component-filters.json');

async function readJson(filePath, fallback) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return fallback;
  }
}

function getBrandBlockJsonFiles(brand) {
  return glob.sync(`brands/${brand}/blocks/**/*.json`, {
    cwd: ROOT,
    nodir: true,
    ignore: [
      `brands/${brand}/component-*.json`,
      `brands/${brand}/blocks/**/block-config.json`,
    ],
  });
}

function mergeModels(baseModels, fragments) {
  return [
    ...baseModels,
    ...fragments.flatMap((fragment) => fragment.models || []),
  ];
}

function mergeDefinitions(baseDefinitions, fragments) {
  const output = structuredClone(baseDefinitions);
  const blocksGroup = output.groups?.find((group) => group.id === 'blocks');

  if (!blocksGroup) {
    return output;
  }

  blocksGroup.components = [
    ...(blocksGroup.components || []),
    ...fragments.flatMap((fragment) => fragment.definitions || []),
  ];

  return output;
}

function mergeFilters(baseFilters, fragments) {
  return [
    ...baseFilters,
    ...fragments.flatMap((fragment) => fragment.filters || []),
  ];
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function buildBrandManifests() {
  const brandConfig = await readJson(BRAND_CONFIG_PATH, { brands: [] });
  const brands = brandConfig.brands || [];

  if (!brands.length) {
    return;
  }

  const [baseModels, baseDefinitions, baseFilters] = await Promise.all([
    readJson(BASE_MODELS_PATH, []),
    readJson(BASE_DEFINITION_PATH, { groups: [] }),
    readJson(BASE_FILTERS_PATH, []),
  ]);

  await Promise.all(
    brands.map(async (brand) => {
      const blockJsonFiles = getBrandBlockJsonFiles(brand);
      const fragments = await Promise.all(
        blockJsonFiles.map((file) => readJson(path.join(ROOT, file), {})),
      );

      await Promise.all([
        writeJson(
          path.join(ROOT, 'brands', brand, 'component-models.json'),
          mergeModels(baseModels, fragments),
        ),
        writeJson(
          path.join(ROOT, 'brands', brand, 'component-definition.json'),
          mergeDefinitions(baseDefinitions, fragments),
        ),
        writeJson(
          path.join(ROOT, 'brands', brand, 'component-filters.json'),
          mergeFilters(baseFilters, fragments),
        ),
      ]);
    }),
  );
}

buildBrandManifests().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to generate brand editor manifests:', error);
  process.exitCode = 1;
});
