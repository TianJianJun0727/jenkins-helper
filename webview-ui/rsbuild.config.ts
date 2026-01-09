import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  plugins: [pluginReact()],
  output: {
    filenameHash: false,
    distPath: {
      root: 'dist',
      html: './',
      favicon: './',
      js: './',
      jsAsync: './',
      css: './',
      cssAsync: './',
      svg: './',
      font: './',
      wasm: './',
      image: './',
      media: './',
      assets: './',
    },
  },
  performance: {
    chunkSplit: {
      strategy: 'all-in-one',
    },
  },
});
