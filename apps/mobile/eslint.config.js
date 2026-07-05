// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const expoConfigWithoutImportResolvers = expoConfig.map((config) => {
  if (!config.settings?.['import/resolver']) return config;

  const settings = { ...config.settings };
  delete settings['import/resolver'];

  return {
    ...config,
    settings,
  };
});

module.exports = defineConfig([
  expoConfigWithoutImportResolvers,
  {
    ignores: ['dist/*'],
    settings: {
      'import/resolver': {},
    },
    rules: {
      'import/no-unresolved': 'off',
    },
  },
]);
