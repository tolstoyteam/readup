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
      // eslint-config-expo 57 enables React Compiler lint rules that flag
      // established patterns in this app. Keep them off during the SDK 57
      // upgrade so we do not change reader/auth behavior mid-migration.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
]);
