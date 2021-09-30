export default {
  input: 'dist/esm/index.js',
  output: [
    {
      file: 'dist/plugin.js',
      format: 'iife',
      name: 'capacitorCBLite',
      globals: {
        '@capacitor/core': 'capacitorExports',
        'pouchdb-browser': 'PouchDB',
      },
      sourcemap: true,
      inlineDynamicImports: true,
    },
    {
      file: 'dist/plugin.cjs.js',
      format: 'cjs',
      sourcemap: true,
      inlineDynamicImports: true,
    },
  ],
  external: [
    '@capacitor/core',
    'pouchdb-browser',
  ],
};
