import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.kardiologie-huber.at',
  integrations: [mdx(), sitemap()],
  buildOptions: {
    site: 'https://www.kardiologie-huber.at',
  },
  vite: {
    resolve: {
      alias: {
        '@components': '/src/components',
      },
    },
  },
});
