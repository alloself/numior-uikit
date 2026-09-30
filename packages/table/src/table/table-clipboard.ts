const QUOTED = /[\t\n\r"]/;

const ENTITIES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

const tsvField = (text: string): string =>
  QUOTED.test(text) ? `"${text.replaceAll('"', '""')}"` : text;

export const tsvOf = (lines: readonly (readonly string[])[]): string =>
  lines.map((cells) => cells.map(tsvField).join('\t')).join('\n');

const htmlText = (text: string): string =>
  text.replaceAll(/[&<>"]/g, (char) => ENTITIES[char] ?? char);

const htmlRow = (cells: readonly string[], tag: 'th' | 'td'): string =>
  `<tr>${cells.map((cell) => `<${tag}>${htmlText(cell)}</${tag}>`).join('')}</tr>`;

export const htmlOf = (
  header: readonly string[] | undefined,
  lines: readonly (readonly string[])[],
): string => {
  const head = header === undefined ? '' : `<thead>${htmlRow(header, 'th')}</thead>`;

  return `<table>${head}<tbody>${lines.map((cells) => htmlRow(cells, 'td')).join('')}</tbody></table>`;
};
