import type { AstroConfig, AstroIntegration } from 'astro';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import micromatch from 'micromatch';
import { entryToSimpleMarkdown } from './entry-to-simple-markdown';

interface DocSet {
  title: string;
  description: string;
  url: string;
  include: string[];
  promote?: string[];
  demote?: string[];
  onlyStructure?: boolean;
  mainSelector?: string; //default "main"
  ignoreSelectors?: string[];
}

interface LlmsConfig {
  title: string;
  description?: string;
  details?: string;
  optionalLinks?: Array<{ label: string; url: string; description?: string }>;
  docSet?: DocSet[];
  notes?: string;
  pageSeparator?: string;
}

interface PluginContext {
  config: LlmsConfig;
  astroConfig: AstroConfig;
  distDir: string;
  pages: { pathname: string }[];
}

/**
 * Astro integration to generate a llms.txt file containing documentation sets.
 * @param configOptions
 * @returns
 */
export default function astroLlmsTxt(configOptions: LlmsConfig): AstroIntegration {
  let astroConfig: AstroConfig;

  return {
    name: 'astro-llms-txt',
    hooks: {
      'astro:config:setup': ({ config }) => {
        astroConfig = config;
      },
      'astro:build:done': async ({ dir, pages }) => {
        if (!configOptions.pageSeparator) {
          configOptions.pageSeparator = '\n\n---\n\n';
        }

        const context: PluginContext = {
          config: configOptions,
          astroConfig,
          distDir: dir.pathname.replace(/\/C:/g, 'C:'),
          pages: pages.map((page) => ({ pathname: page.pathname })),
        };

        const allDocSetsContent = await processAllDocSets(context);
        const llmsTxt = buildLlmsIndex(configOptions, allDocSetsContent, pages, context);

        // read llms.txt from public folder
        const llmsTxtPath = path.join(context.distDir, 'llms.txt');
        const llmsTxtContent = await fs.readFile(llmsTxtPath, 'utf-8');

        // append llmsTxt to llmsTxtContent
        const newLlmsTxt = llmsTxtContent.replace('{generatedLLMS}', llmsTxt);

        await fs.writeFile(llmsTxtPath, newLlmsTxt, 'utf-8');
        console.log('✅ llms.txt generated');

        const llmsTxtContentNew = await fs.readFile(llmsTxtPath, 'utf-8');
      },
    },
  };
}

/**
 * Process all documentation sets defined in the configuration.
 * @param context
 * @returns
 */
async function processAllDocSets(context: PluginContext): Promise<string[]> {
  const lines: string[] = [];
  const { config, astroConfig } = context;

  const collator = new Intl.Collator(astroConfig.i18n?.defaultLocale || 'en');

  for (const set of config.docSet ?? []) {
    await processDocSet({ set, context, collator });
    const url = new URL(set.url, astroConfig.site);
    lines.push(`- [${set.title}](${url}): ${set.description}`);
  }

  return lines;
}

/**
 * Process a single documentation set.
 * @param args
 */
async function processDocSet(args: { context: PluginContext; collator: Intl.Collator; set: DocSet }): Promise<void> {
  const { context, collator, set } = args;
  const { distDir, pages, config } = context;

  const matches = pages.map((p) => p.pathname).filter((pn) => set.include.some((pat) => micromatch.isMatch(pn, pat)));

  const sorted = matches.sort((a, b) => {
    const pa = prioritizePathname(a, set.promote, set.demote);
    const pb = prioritizePathname(b, set.promote, set.demote);
    return collator.compare(pa, pb);
  });

  const entries: string[] = [];

  for (const pn of sorted) {
    const htmlPath = path.join(distDir, pn.replace(/\/$/, ''), 'index.html');
    try {
      await fs.access(htmlPath);
      const entry = await buildEntryFromHtml(htmlPath, set.mainSelector, set.ignoreSelectors, set.onlyStructure ?? false);
      entries.push(entry);
    } catch (e) {
      //console.warn(`❌ File not found: ${htmlPath} - ${e}`);
    }
  }

  const outPath = path.join(distDir, set.url.replace(/^\//, ''));
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  const content = entries.join(config.pageSeparator);
  await fs.writeFile(outPath, content, 'utf-8');
  console.log(`✅ DocSet "${set.title}" generated at ${outPath}`);
}

/**
 * Build a single entry from an HTML file.
 * @param htmlPath
 * @param onlyStructure
 * @returns
 */
async function buildEntryFromHtml(
  htmlPath: string,
  mainSelector: string = 'main',
  ignoreSelectors: string[] = [],
  onlyStructure: boolean
): Promise<string> {
  const html = await fs.readFile(htmlPath, 'utf-8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const main = doc.querySelector(mainSelector);
  if (!main) throw new Error(`Missing main selector <${mainSelector}>`);

  const h1 = main.querySelector('h1');
  const title = h1?.textContent?.trim() ?? 'Untitled';
  if (h1) h1.remove();

  const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim();

  const markdown = await entryToSimpleMarkdown(main.innerHTML.trim(), ['h1', 'footer', 'header', ...ignoreSelectors], onlyStructure);

  const parts = [`# ${title}\n`];
  if (metaDesc) parts.push(`> ${metaDesc}`);
  parts.push(markdown.trim());

  return parts.join('\n\n');
}

/**
 * Build the final llms.txt index content.
 * @param opts Configuration options for the index.
 * @param docSetsLines Lines representing documentation sets.
 * @returns The formatted llms.txt content.
 */
function buildLlmsIndex(opts: LlmsConfig, docSetsLines: string[], pages: { pathname: string }[], context: PluginContext): string {
  const lines: string[] = [];

  if (docSetsLines.length) {
    lines.push('## Documentation Sets\n\n' + docSetsLines.join('\n'));
  }

  const sortedPages = pages
    .map((p) => ({
      pathname: p.pathname,
      title: p.pathname
        .split('/')
        .filter((p) => p !== '')
        .slice(0, -1)
        .join('/')
        .replace(/^de/, 'German Pages'),
      file: p.pathname.split('/')[p.pathname.split('/').length - 2],
    }))
    .sort((a, b) => {
      const compare = a.title.replace(/^German Pages/g, 'ZZZ').localeCompare(b.title.replace(/^German Pages/g, 'ZZZ'));
      if (compare === 0) {
        return a.pathname.localeCompare(b.pathname);
      }
      return compare;
    });

  if (pages.length) {
    lines.push('\n## Pages\n');
    let prevTitle = '';

    for (const page of sortedPages) {
      try {
        // read frontmatter from page.pathname using sync method
        // const frontmatter = fsSync.readFileSync(filePath, 'utf-8');
        // const frontmatterJson = frontmatter.match(/^---[\s\S]*?---/)?.[0];
        // const frontmatterObj = frontmatterJson ? JSON.parse(frontmatterJson) : {};

        // console.log('frontmatterJson', frontmatterJson);
        // const title = frontmatterObj.title;
        // const description = frontmatterObj.description;
        // const abstract = frontmatterObj.abstract;
        const html = fsSync.readFileSync(context.distDir + '/' + page.pathname + 'index.html', 'utf-8');
        const dom = new JSDOM(html);
        const doc = dom.window.document;
        const title = doc.querySelector('meta[name="title"]')?.getAttribute('content')?.trim() ?? page.pathname;
        const description = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ?? '';

        if (page.title !== prevTitle) {
          const pageParts = page.title.split('/');
          const header = pageParts[pageParts.length - 1].split('-').join(' ');
          // capitalize first letter of each word
          const capitalizedHeader = header
            .split(' ')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          lines.push(`\n##${'#'.repeat(pageParts.length)} ${capitalizedHeader}\n`);
          prevTitle = page.title;
        }

        lines.push(`- [${title}](${new URL(page.pathname, context.astroConfig.site)}): ${description}`);
      } catch (e) {
        //console.warn(`❌ Could not read file: ${page.pathname} - ${e}`);
      }
    }
  }

  if (opts.notes) {
    lines.push('\n## Notes\n\n' + opts.notes);
  }

  if (opts.optionalLinks?.length) {
    lines.push(
      '\n## Optional\n\n' + opts.optionalLinks.map((l) => `- [${l.label}](${l.url})${l.description ? `: ${l.description}` : ''}`).join('\n')
    );
  }

  return lines.filter(Boolean).join('\n');
}

/**
 * Prioritize a pathname based on promotion and demotion patterns.
 * @param id
 * @param promote
 * @param demote
 * @returns
 */
function prioritizePathname(id: string, promote: string[] = [], demote: string[] = []) {
  const demoted = demote.findIndex((expr) => micromatch.isMatch(id, expr));
  const promoted = demoted > -1 ? -1 : promote.findIndex((expr) => micromatch.isMatch(id, expr));
  const prefixLength = (promoted > -1 ? promote.length - promoted : 0) + demote.length - demoted - 1;
  return '_'.repeat(prefixLength) + id;
}
