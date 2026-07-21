import { useMemo } from 'react';

import { MarkdownContent, ToolDiffViewer } from '../../tools/components';
import { createCachedDiffCalculator } from '../../utils/messageTransforms';

/**
 * Renders a worker's final result text the way ClaudeCodeUI renders assistant
 * output: prose as markdown, and any embedded unified diff as Claude's diff
 * card (ToolDiffViewer — the same primitive the write_file trace card uses).
 *
 * Hermes emits diffs inline, not fenced: a `┊ review diff` marker, an
 * `a/… → b/…` file header, a `@@` hunk, then `+`/`-`/context lines, followed by
 * plain prose. We segment on that shape and reconstruct old/new sides so the
 * viewer can recompute an aligned diff.
 */

const workerDiff = createCachedDiffCalculator();

type Segment =
  | { kind: 'md'; text: string }
  | { kind: 'diff'; file: string; oldContent: string; newContent: string; created: boolean };

const HUNK_RE = /^@@ .* @@/;
const FILE_HEADER_RE = /^\s*(?:a\/)?(\S.*?)\s*(?:→|-->|->)\s*(?:b\/)?(\S.*?)\s*$/;
const MARKER_RE = /^\s*[┊│¦|]\s*review diff\s*$/i;

/** A line that belongs to a unified-diff hunk body (or a blank within it). */
function isDiffBody(line: string): boolean {
  return line === '' || /^[+\- ]/.test(line) || line.startsWith('@@') || line.startsWith('\\');
}

/** Rebuild the pre/post file contents from a unified-diff hunk body. */
function buildOldNew(body: string[]): { oldContent: string; newContent: string; created: boolean } {
  const oldLines: string[] = [];
  const newLines: string[] = [];
  let created = false;
  for (const line of body) {
    if (line.startsWith('@@')) {
      if (/-0,0/.test(line)) created = true;
      continue;
    }
    if (line.startsWith('\\')) continue; // "\ No newline at end of file"
    if (line.startsWith('+')) {
      newLines.push(line.slice(1));
    } else if (line.startsWith('-')) {
      oldLines.push(line.slice(1));
    } else {
      const ctx = line.startsWith(' ') ? line.slice(1) : line;
      oldLines.push(ctx);
      newLines.push(ctx);
    }
  }
  return { oldContent: oldLines.join('\n'), newContent: newLines.join('\n'), created };
}

function parseWorkerResult(raw: string): Segment[] {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const segments: Segment[] = [];
  let buffer: string[] = [];

  const flushProse = () => {
    const text = buffer.join('\n').trim();
    if (text) {
      segments.push({ kind: 'md', text });
    }
    buffer = [];
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const next = lines[i + 1] ?? '';
    const diffStarts =
      MARKER_RE.test(line) || HUNK_RE.test(line) || (FILE_HEADER_RE.test(line) && HUNK_RE.test(next));

    if (!diffStarts) {
      buffer.push(line);
      i += 1;
      continue;
    }

    flushProse();

    let j = i;
    if (MARKER_RE.test(lines[j])) {
      j += 1;
    }

    let file = 'diff';
    const header = lines[j]?.match(FILE_HEADER_RE);
    if (header && HUNK_RE.test(lines[j + 1] ?? '')) {
      file = (header[2] || header[1]).replace(/^[ab]\//, '');
      j += 1;
    }

    const body: string[] = [];
    while (j < lines.length && isDiffBody(lines[j])) {
      if (lines[j] === '' && !isDiffBody(lines[j + 1] ?? 'x')) {
        j += 1;
        break;
      }
      body.push(lines[j]);
      j += 1;
    }
    while (body.length && body[body.length - 1].trim() === '') {
      body.pop();
    }

    const { oldContent, newContent, created } = buildOldNew(body);
    segments.push({ kind: 'diff', file, oldContent, newContent, created });
    i = j;
  }

  flushProse();
  return segments;
}

export default function WorkerResult({ text, emptyLabel }: { text: string | null; emptyLabel: string }) {
  const segments = useMemo(() => (text && text.trim() ? parseWorkerResult(text) : []), [text]);

  if (segments.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-2 text-[13px]">
      {segments.map((seg, i) =>
        seg.kind === 'md' ? (
          <MarkdownContent key={i} content={seg.text} />
        ) : (
          <div key={i} className="max-h-96 overflow-auto">
            <ToolDiffViewer
              filePath={seg.file}
              oldContent={seg.oldContent}
              newContent={seg.newContent}
              createDiff={workerDiff}
              badge={seg.created ? 'New' : 'Diff'}
              badgeColor={seg.created ? 'green' : 'gray'}
            />
          </div>
        ),
      )}
    </div>
  );
}
