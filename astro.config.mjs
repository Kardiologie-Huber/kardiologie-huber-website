import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import astroLlmsTxt from './tools/llms-generator/index';
import { targetBlank } from './src/plugins/target-blank';
import { sectionize } from './src/plugins/sectionize';

// https://astro.build/config
export default defineConfig({
  site: 'https://kardiologie-huber.at',
  markdown: {
    rehypePlugins: [[targetBlank, { domain: 'kardiologie-huber.at' }], sectionize],
  },
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
    site: 'https://kardiologie-huber.at',
  },
  vite: {
    resolve: {
      alias: {
        '@components': '/src/components',
      },
    },
  },
});
