import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.kardiologie-huber.at',
  integrations: [mdx()],
  buildOptions: {
    site: 'https://karin112358.github.io/kardiologie-huber-website',
  },
});
