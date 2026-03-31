module.exports = {
  root: true,
  extends: [
    'airbnb-base',
    'plugin:json/recommended',
    'plugin:xwalk/recommended',
  ],
  env: {
    browser: true,
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    allowImportExportEverywhere: true,
    sourceType: 'module',
    requireConfigFile: false,
  },
  rules: {
    'import/extensions': ['error', { js: 'always' }], // require js file extensions in imports
    'linebreak-style': ['error', 'unix'], // enforce unix linebreaks
    'no-param-reassign': [2, { props: false }], // allow modifying properties of param
  },
  overrides: [
    {
      files: ['theme-tools/**/*.js'],
      rules: {
        'import/no-extraneous-dependencies': 'off',
        'no-await-in-loop': 'off',
        'no-continue': 'off',
        'no-console': ['warn', { allow: ['log', 'warn', 'error', 'info'] }],
        'no-nested-ternary': 'off',
        'no-plusplus': 'off',
        'no-restricted-syntax': 'off',
        'no-unused-vars': 'off',
        'no-use-before-define': 'off',
        'no-shadow': 'off',
        'max-len': 'off',
      },
    },
    {
      files: [
        'gulpfile.js',
        'blocks/eds-form/**/*.js',
        'blocks/stock-ticker/**/*.js',
        'scripts/cfUtil.js',
        'scripts/config.js',
        'scripts/index-utils.js',
        'scripts/utils.js',
      ],
      rules: {
        'no-console': ['warn', { allow: ['log', 'warn', 'error', 'info'] }],
        'no-plusplus': 'off',
        'no-restricted-syntax': 'off',
        'no-await-in-loop': 'off',
        'no-continue': 'off',
        'no-nested-ternary': 'off',
        'no-unused-vars': 'warn',
        'no-use-before-define': 'off',
        'no-shadow': 'warn',
        'max-len': ['warn', { code: 120 }],
        'import/no-extraneous-dependencies': 'off',
        'import/no-named-as-default': 'off',
        'no-unused-expressions': 'off',
      },
    },
    {
      files: ['component-models.json'],
      rules: {
        'xwalk/max-cells': 'off',
        'xwalk/no-orphan-collapsible-fields': 'off',
      },
    },
  ],
};
