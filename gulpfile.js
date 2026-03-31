const gulp = require('gulp');
const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const postcssImport = require('postcss-import');
const postcssCustomMedia = require('postcss-custom-media');
require('dotenv').config();

// Path to tokens.css so custom media (--bp-tablet, etc.) are available to postcss-custom-media
const tokensPath = path.join(__dirname, 'styles', 'tokens.css');

// Resolve and inline @import url('...') for relative paths so path resolution works on all platforms.
// Recursively inlines nested imports; uses visited set to avoid infinite loops on circular imports.
function inlineImports(content, filePath, visited = new Set()) {
  const dir = path.dirname(path.resolve(filePath));
  const resolvedPath = path.resolve(filePath);
  if (visited.has(resolvedPath)) return content;
  visited.add(resolvedPath);

  let result = content;
  const importRegex = /@import\s+url\s*\(\s*['"]([^'"]+)['"]\s*\)\s*;?\s*\n?/g;
  let match;
  // eslint-disable-next-line no-cond-assign
  while ((match = importRegex.exec(result)) !== null) {
    const importPath = match[1].trim();
    if (importPath.startsWith('.')) {
      const resolved = path.resolve(dir, importPath);
      if (fs.existsSync(resolved)) {
        const imported = fs.readFileSync(resolved, 'utf-8');
        const inlined = inlineImports(imported, resolved, visited);
        result = result.replace(match[0], inlined);
        importRegex.lastIndex = 0; // reset after string mutation
      }
    }
  }
  return result;
}

// Function to replace @import statements with the content of the imported files.
// Block CSS: sources under styles/<brand>/blocks/<blockName>/_*.css are written to the same folder.
// Other brand partials under styles/<brand>/_*.css are also written in the same directory.
function replaceImports(filePath) {
  const pathStr = typeof filePath === 'string' ? filePath : (filePath && filePath.path);
  if (!pathStr) return Promise.resolve();
  const absPath = path.isAbsolute(pathStr) ? pathStr : path.resolve(process.cwd(), pathStr);
  let content = fs.readFileSync(absPath, 'utf-8').replace(/\r\n/g, '\n');
  const dir = path.dirname(absPath);
  const baseName = path.basename(absPath).replace(/^_/, '');
  const newFilePath = path.join(dir, baseName);

  // Inline relative @imports manually so path resolution works on Windows and with path spaces
  content = inlineImports(content, absPath);

  // Step 1: Run remaining postcss (dynamic-import, postcss-import for any other imports)
  const pipeline1 = [
    {
      AtRule: {
        'dynamic-import': (node) => {
          if (!node.params || typeof node.params !== 'string' || node.params.length < 3) {
            return;
          }

          const regex = /@dynamic-import[\s\S]*@import/;
          const isInValidImport = regex.test(node?.parent?.source?.input?.css);

          // @dynamic-import should be declared below normal @import
          if (isInValidImport) {
            throw node.error(`@import should be declared on top of the file ${absPath}`);
          }

          // move @dynamic-import file to the top of the file
          node.parent.prepend(`@import ${node.params}`);
          node.remove();
        },
      },
      postcssPlugin: 'postcss-dynamic-import',
    },
    postcssImport(),
  ];

  return postcss(pipeline1)
    .process(content, { from: absPath })
    .then((result1) => {
      // Step 2: Prepend @custom-media so postcss-custom-media can resolve --bp-*
      let contentForCustomMedia = result1.css;
      if (fs.existsSync(tokensPath)) {
        const tokensContent = fs.readFileSync(tokensPath, 'utf-8');
        const customMediaLines = tokensContent
          .split('\n')
          .filter((line) => line.trim().startsWith('@custom-media'));
        if (customMediaLines.length > 0) {
          contentForCustomMedia = `${customMediaLines.join('\n')}\n\n${contentForCustomMedia}`;
        }
      }
      // Step 3: Expand @media (--bp-tablet) etc. to real media queries
      return postcss([postcssCustomMedia()]).process(contentForCustomMedia, { from: newFilePath });
    })
    .then((result2) => {
      fs.mkdirSync(path.dirname(newFilePath), { recursive: true });
      fs.writeFileSync(newFilePath, result2.css, 'utf-8');
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error(`Error processing file ${absPath}:`, error);
      throw error;
    });
}

// Gulp task to process CSS files
function processCSS(filePath) {
  return (done) => {
    replaceImports(filePath)
      .then(() => {
        if (typeof done === 'function') done();
      })
      .catch((err) => {
        if (typeof done === 'function') {
          done(err);
        } else {
          throw err;
        }
      });
  };
}

/**
 * Watch for changes in CSS files and process them
 * - If the file is a partial (starts with an underscore), process it
 * - If the file is not a partial it is a main file, look for the partial file in the same directory
 *   and process them
 */
function watchFiles() {
  // eslint-disable-next-line no-console
  console.log('Starting to watch CSS files in styles directory...');
  const watchPatterns = [
    'blocks/*/*.css',
    'styles/**/_*.css',
    'styles/*/*.css',
  ];

  // Add templates directory to watch patterns only if it exists
  if (fs.existsSync('templates')) {
    watchPatterns.push('templates/**/_*.css', 'templates/*/*.css');
  }

  gulp.watch(watchPatterns).on('change', (filePath) => {
    // eslint-disable-next-line no-console
    console.log('File changed', filePath);
    const fileName = path.basename(filePath);
    if (fileName.startsWith('_')) {
      processCSS(filePath)();
    } else {
      const dir = path.dirname(filePath);
      const directories = fs
        .readdirSync(dir)
        .filter((file) => fs.statSync(path.join(dir, file)).isDirectory());

      directories.forEach((directory) => {
        const newFilePath = path.join(dir, directory, `_${fileName}`);
        if (fs.existsSync(newFilePath)) {
          processCSS(newFilePath)();
        } else {
          // eslint-disable-next-line no-console
          console.log('File does not exist:', newFilePath);
        }
      });
    }
  });
}

function createBrandCSS(done) {
  const brands = process.env.BRANDS ? process.env.BRANDS.split(',') : ['**'];

  const tasks = brands.map(
    (brand) => new Promise((resolve, reject) => {
      // eslint-disable-next-line no-console
      console.log('Processing brand:', brand);
      const srcPatterns = [
        `styles/**/${brand}/_*.css`,
        `styles/${brand}/blocks/**/_*.css`,
      ];

      // Add templates directory to src patterns only if it exists
      if (fs.existsSync('templates')) {
        srcPatterns.push(`templates/**/${brand}/_*.css`);
      }

      const processPromises = [];
      gulp
        .src(srcPatterns)
        .on('data', (file) => {
          processPromises.push(replaceImports(file.path));
        })
        .on('end', () => {
          Promise.all(processPromises).then(resolve).catch(reject);
        })
        .on('error', reject);
    }),
  );

  Promise.all(tasks).then(() => done()).catch(done);
}

// Gulp tasks
gulp.task('default', watchFiles);
gulp.task('createBrandCSS', createBrandCSS);
