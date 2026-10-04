import type { RehypePlugin } from '@astrojs/markdown-remark';

// Packt auf Seiten mit `sections: true` im Frontmatter jede H2 mit ihrem Inhalt
// (bis zur nächsten H2) in
//
//   <section class="svc-section"><h2>…</h2><div class="svc-content">…</div></section>
//
// So kann das Layout Überschrift und Text zweispaltig anordnen, ohne JavaScript.
// Die Blöcke am Seitenende (RelatedServices, ScheduleAppointment) bleiben außerhalb.

const STOP_COMPONENTS = new Set(['RelatedServices', 'ScheduleAppointment']);

export const sectionize: RehypePlugin = () => {
  return (tree, file) => {
    const frontmatter = (file.data as { astro?: { frontmatter?: Record<string, unknown> } }).astro?.frontmatter;
    if (!frontmatter?.sections) return;

    const out: any[] = [];
    let content: any = null;

    for (const node of (tree as any).children) {
      const isH2 = node.type === 'element' && node.tagName === 'h2';
      const isStop = node.type === 'mdxJsxFlowElement' && STOP_COMPONENTS.has(node.name);

      if (isH2) {
        content = { type: 'element', tagName: 'div', properties: { className: ['svc-content'] }, children: [] };
        out.push({
          type: 'element',
          tagName: 'section',
          properties: { className: ['svc-section'] },
          children: [node, content],
        });
        continue;
      }
      if (isStop) content = null;

      if (content) content.children.push(node);
      else out.push(node);
    }

    (tree as any).children = out;
  };
};
