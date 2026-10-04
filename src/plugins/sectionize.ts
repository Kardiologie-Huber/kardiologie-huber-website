import type { RehypePlugin } from '@astrojs/markdown-remark';

// Packt auf Seiten mit `sections: true` im Frontmatter jede H2 mit ihrem Inhalt
// (bis zur nächsten H2) in
//
//   <section class="svc-section"><h2>…</h2><div class="svc-content">…</div></section>
//
// So kann das Layout Überschrift und Text zweispaltig anordnen, ohne JavaScript.
// Die Blöcke am Seitenende (RelatedServices, ScheduleAppointment) bleiben außerhalb,
// Abschnitte mit Fragen-Block (<div class="faq">) bleiben einspaltig.

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

    // Abschnitte mit Fragen-Block (<div class="faq">) bleiben einspaltig wie bisher:
    // Hülle wieder entfernen, H2 und Inhalt direkt einsetzen.
    const final: any[] = [];
    for (const node of out) {
      const isSection = node.type === 'element' && node.tagName === 'section' && node.properties?.className?.includes('svc-section');
      if (isSection && node.children[1].children.some(isFaqBlock)) {
        final.push(node.children[0], ...node.children[1].children);
      } else {
        final.push(node);
      }
    }

    (tree as any).children = final;
  };
};

function isFaqBlock(node: any): boolean {
  if (node.type === 'element') {
    const cls = node.properties?.className;
    return node.tagName === 'div' && (Array.isArray(cls) ? cls.includes('faq') : String(cls ?? '').split(' ').includes('faq'));
  }
  if (node.type === 'mdxJsxFlowElement' && node.name === 'div') {
    return (node.attributes ?? []).some(
      (a: any) => (a.name === 'class' || a.name === 'className') && String(a.value ?? '').split(' ').includes('faq')
    );
  }
  return false;
}
