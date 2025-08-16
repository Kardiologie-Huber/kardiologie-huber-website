import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import astroLlmsTxt from './tools/llms-generator/index';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.kardiologie-huber.at',
  integrations: [
    mdx(),
    sitemap(),
    astroLlmsTxt({
      docSet: [
        {
          title: 'Complete site',
          description: 'The full site of time cockpit',
          url: '/llms.txt',
          include: ['**'],
          promote: ['/'],
        },
        // {
        //   title: 'Small site',
        //   description: 'Index of key pages',
        //   url: '/llms-small.txt',
        //   include: ['**'],
        //   onlyStructure: true,
        //   promote: ['/'],
        // },
      ],
      pageSeparator: '\n\n---\n\n',
    }),
  ],
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
