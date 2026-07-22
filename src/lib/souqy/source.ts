/**
 * Round-trip format for persisted Souqy source. The generated files are
 * stored on the storefront row (and in the audit log) as one string with a
 * stable delimiter — human-readable in DB inspection tools, trivially
 * splittable back into files. Shared by the server actions (persist,
 * rollback) and `SouqyMount` (extracting `styles.css` at render time), so
 * the two sides can never disagree on the framing.
 */

export type SouqySourceFiles = {
  'index.tsx': string;
  'theme.ts': string;
  'styles.css'?: string;
};

const SOURCE_DELIM = '\n//=== ';

export function serializeSouqySource(files: Record<string, string>): string {
  return Object.entries(files)
    .map(([name, body]) => `${SOURCE_DELIM}${name} ===\n${body}`)
    .join('');
}

export function parseSouqySource(serialized: string): SouqySourceFiles | null {
  const files: Record<string, string> = {};
  const headers = Array.from(serialized.matchAll(/\n\/\/=== ([\w./-]+) ===\n/g));
  for (const [index, header] of headers.entries()) {
    const name = header[1];
    const bodyStart = (header.index ?? 0) + header[0].length;
    const bodyEnd = headers[index + 1]?.index ?? serialized.length;
    if (name) files[name] = serialized.slice(bodyStart, bodyEnd);
  }
  if (!files['index.tsx'] || !files['theme.ts']) return null;
  return {
    'index.tsx': files['index.tsx'],
    'theme.ts': files['theme.ts'],
    ...('styles.css' in files ? { 'styles.css': files['styles.css'] } : {}),
  };
}

/**
 * Cheap accessor for the render path: pull just the stylesheet out of a
 * persisted source blob. Returns null when the revision predates the Open
 * Design surface or the model shipped no custom CSS.
 */
export function extractSouqyStylesCss(serialized: string | null | undefined): string | null {
  if (!serialized) return null;
  return parseSouqySource(serialized)?.['styles.css'] ?? null;
}
