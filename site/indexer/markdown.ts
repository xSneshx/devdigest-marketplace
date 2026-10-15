export interface ChangelogSection {
  version: string;
  markdown: string;
}

const VERSION_HEADING = /^##\s+\[?v?(\d+\.\d+\.\d+[^\]\s]*)/;

/** Splits a CHANGELOG on its `## <version>` headings; the section keeps everything below the heading. */
export function splitChangelog(md: string): ChangelogSection[] {
  const sections: ChangelogSection[] = [];
  let current: { version: string; lines: string[] } | undefined;
  const flush = () => {
    if (current) sections.push({ version: current.version, markdown: current.lines.join('\n').trim() });
  };
  for (const line of md.split(/\r?\n/)) {
    const match = VERSION_HEADING.exec(line);
    if (match?.[1]) {
      flush();
      current = { version: match[1], lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  flush();
  return sections;
}

/** Second cell of the table row whose first cell equals `label` (case-insensitive), if any. */
export function compatibilityRow(md: string, label: string): string | undefined {
  const wanted = label.trim().toLowerCase();
  for (const line of md.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    const cells = trimmed
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim());
    if (cells[0]?.toLowerCase() === wanted && cells[1]) return cells[1];
  }
  return undefined;
}
