// Liest Frage-Antwort-Paare aus dem MDX-Quelltext einer Seite, damit sie als
// FAQPage-Schema (schema.org) ausgegeben werden können.
//
// Erkannt wird das auf der Website übliche Muster:
//
//   **Frage?**
//   Antwort, auch über mehrere Zeilen oder als Liste
//
// Auf normalen Seiten werden nur Abschnitte berücksichtigt, deren H2 mit
// "Häufige Fragen" beginnt. Auf der FAQ-Seite (allSections) alle Abschnitte.

export interface FaqItem {
  question: string;
  answer: string;
}

function toPlainText(md: string): string {
  return md
    .replace(/\{\s*''\s*\}/g, '') // {''} aus MDX
    .replace(/<a\b[^>]*>(.*?)<\/a>/g, '$1') // HTML-Links -> Text
    .replace(/<[^>]+>/g, '') // übrige Tags
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // Markdown-Links -> Text
    .replace(/\*\*([^*]+)\*\*/g, '$1') // fett
    .replace(/^\s*[-*]\s+(.*)$/gm, '$1,') // Listenpunkte als Aufzählung
    .replace(/,\s*$/, '.') // letzter Listenpunkt
    .replace(/^\s*\d+\.\s+/gm, '') // nummerierte Listen
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractFaq(body: string, allSections = false): FaqItem[] {
  const text = body.replace(/\r\n/g, '\n');
  const sections = text.split(/^## /m).slice(1);
  const items: FaqItem[] = [];

  for (const section of sections) {
    const heading = section.split('\n', 1)[0].trim();
    if (!allSections && !/^(Häufige Fragen|Leben mit)/i.test(heading)) continue;

    const lines = section.split('\n').slice(1);
    let question: string | null = null;
    let answer: string[] = [];

    const flush = () => {
      if (question) {
        const a = toPlainText(answer.join('\n'));
        if (a) items.push({ question: toPlainText(question), answer: a });
      }
      question = null;
      answer = [];
    };

    for (const line of lines) {
      const q = line.match(/^\s*\*\*(.+\?)\*\*\s*$/);
      if (q) {
        flush();
        question = q[1];
      } else if (question) {
        // Layout-Zeilen und reine Link-Zeilen (z. B. "Zur Terminbuchung") überspringen
        if (/^\s*<\/?div/.test(line) || /ScheduleAppointment|LinkButton/.test(line)) continue;
        if (/^\s*(\{''\})?\s*<a\b[^>]*>[^<]*<\/a>\s*$/.test(line)) continue;
        answer.push(line);
      }
    }
    flush();
  }
  return items;
}
