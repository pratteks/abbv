import { exec } from "node:child_process";

const run = (cmd) => new Promise((resolve, reject) => exec(
  cmd,
  (error, stdout) => {
    if (error) reject(error);
    else resolve(stdout);
  }
));

const changeset = await run('git diff --cached --name-only --diff-filter=ACMR');
const modifiedFiles = changeset.split('\n').filter(Boolean);

// check if there are any model files staged
const modifiedPartials = modifiedFiles.filter((file) => file.match(/(^|\/)_.*.json/));
if (modifiedPartials.length > 0) {
  const output = await run('npm run build:json --silent');
  console.log(output);
  await run('git add component-models.json component-definition.json component-filters.json');
}
 
// Check for JS/JSON files that need linting
const jsFiles = modifiedFiles.filter((file) => file.match(/\.(js|json)$/));
const cssFiles = modifiedFiles.filter((file) => file.match(/\.css$/));
 
let lintErrors = false;
 
// Run ESLint on all project files (not just staged)
console.log('\n🔍 Running ESLint on project...');
try {
  await run('npm run lint:js');
  console.log('✅ ESLint passed\n');
} catch (error) {
  console.error('❌ ESLint failed! Fix the errors before committing.\n');
  lintErrors = true;
}
 
// Run Stylelint on staged CSS files only
if (cssFiles.length > 0) {
  console.log('🎨 Running Stylelint on staged CSS files...');
  try {
    await run(`npx stylelint ${cssFiles.join(' ')}`);
    console.log('✅ Stylelint passed\n');
  } catch (error) {
    console.error('❌ Stylelint failed! Fix the errors before committing.\n');
    lintErrors = true;
  }
}
 
// Block commit if there were lint errors
if (lintErrors) {
  console.error('\n🚫 COMMIT BLOCKED: Fix lint errors before committing.\n');
  console.error('Run these commands to fix issues:');
  console.error('  npm run lint:fix    (auto-fix)');
  console.error('  npm run lint        (check issues)\n');
  process.exit(1);
}
 
console.log('✅ All checks passed! Proceeding with commit...\n');
