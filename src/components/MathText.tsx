import React, { useMemo } from 'react';
import katex from 'katex';

interface MathTextProps {
  /** Raw text that may contain LaTeX delimited by $...$ (inline) or $$...$$ (block). */
  children?: string;
  text?: string;
  className?: string;
}

type Segment =
  | { kind: 'text'; value: string }
  | { kind: 'inline'; value: string }
  | { kind: 'block'; value: string };

/**
 * Splits a string into plain-text and LaTeX segments.
 * Block math uses $$...$$, inline math uses $...$.
 * A doubled `\$` is treated as a literal dollar sign.
 */
function parseSegments(input: string): Segment[] {
  const segments: Segment[] = [];
  let i = 0;
  let buffer = '';

  const flushText = () => {
    if (buffer) {
      segments.push({ kind: 'text', value: buffer });
      buffer = '';
    }
  };

  while (i < input.length) {
    // Escaped dollar -> literal $
    if (input[i] === '\\' && input[i + 1] === '$') {
      buffer += '$';
      i += 2;
      continue;
    }

    if (input[i] === '$') {
      const isBlock = input[i + 1] === '$';
      const delim = isBlock ? '$$' : '$';
      const start = i + delim.length;
      const end = input.indexOf(delim, start);
      if (end !== -1) {
        flushText();
        segments.push({
          kind: isBlock ? 'block' : 'inline',
          value: input.slice(start, end),
        });
        i = end + delim.length;
        continue;
      }
    }

    buffer += input[i];
    i += 1;
  }

  flushText();
  return segments;
}

function renderLatex(value: string, displayMode: boolean): string {
  try {
    return katex.renderToString(value, {
      displayMode,
      throwOnError: false,
      errorColor: '#dc2626',
    });
  } catch {
    return value;
  }
}

/**
 * Renders text containing LaTeX math. Use $...$ for inline math and $$...$$
 * for block (centered) math. Plain text is rendered as-is.
 */
export function MathText({ children, text, className }: MathTextProps) {
  const source = (text ?? children ?? '') as string;

  const segments = useMemo(() => parseSegments(source), [source]);

  return (
    <span className={className}>
      {segments.map((seg, idx) => {
        if (seg.kind === 'text') {
          return <span key={idx}>{seg.value}</span>;
        }
        const html = renderLatex(seg.value, seg.kind === 'block');
        return (
          <span
            key={idx}
            className={seg.kind === 'block' ? 'block my-2' : 'inline'}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </span>
  );
}

export default MathText;
