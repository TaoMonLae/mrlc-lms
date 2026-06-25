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

const mathRunPattern =
  /(\\[a-zA-Z]+(?:\{[^}]+\})*(?:\[[^\]]+\])?(?:\{[^}]+\})*|[A-Za-z](?:\^\{?[-+\w]+\}?|_\{?[-+\w]+\}?|\d)?(?:\s*[+\-*/=<>≤≥×÷]\s*(?:\\[a-zA-Z]+(?:\{[^}]+\})*|[A-Za-z](?:\^\{?[-+\w]+\}?|_\{?[-+\w]+\}?|\d)?|\d+(?:\.\d+)?))+(?:\s*[+\-*/=<>≤≥×÷]\s*(?:[A-Za-z](?:\^\{?[-+\w]+\}?|_\{?[-+\w]+\}?|\d)?|\d+(?:\.\d+)?))*|[A-Za-z](?:\^\{?[-+\w]+\}?|_\{?[-+\w]+\}?|\d)|\d+(?:\.\d+)?\s*[+\-*/=<>≤≥×÷]\s*\d+(?:\.\d+)?)/g;

const superscriptMap: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
};

const subscriptMap: Record<string, string> = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
  '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
};

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
    return katex.renderToString(normalizeLatex(value), {
      displayMode,
      throwOnError: false,
      errorColor: '#dc2626',
    });
  } catch {
    return value;
  }
}

function normalizeLatex(value: string): string {
  let normalized = value
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (digits) => `^{${[...digits].map((d) => superscriptMap[d] ?? d).join('')}}`)
    .replace(/[₀₁₂₃₄₅₆₇₈₉]+/g, (digits) => `_{${[...digits].map((d) => subscriptMap[d] ?? d).join('')}}`)
    .replace(/([A-Za-z])\^([A-Za-z0-9+-]+)/g, '$1^{$2}')
    .replace(/([A-Za-z])_([A-Za-z0-9+-]+)/g, '$1_{$2}');

  // Common classroom shorthand: x2, y3, n10 -> x^{2}, y^{3}, n^{10}.
  // Only transform isolated variable+digit tokens so normal words are untouched.
  normalized = normalized.replace(/\b([A-Za-z])([0-9]+)\b/g, '$1^{$2}');
  return normalized;
}

function splitAutoMath(value: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  for (const match of value.matchAll(mathRunPattern)) {
    const index = match.index ?? 0;
    const token = match[0];
    if (index > lastIndex) segments.push({ kind: 'text', value: value.slice(lastIndex, index) });
    segments.push({ kind: 'inline', value: token });
    lastIndex = index + token.length;
  }
  if (lastIndex < value.length) segments.push({ kind: 'text', value: value.slice(lastIndex) });
  return segments.length ? segments : [{ kind: 'text', value }];
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
          return (
            <React.Fragment key={idx}>
              {splitAutoMath(seg.value).map((autoSeg, autoIdx) => {
                if (autoSeg.kind === 'text') return <span key={autoIdx}>{autoSeg.value}</span>;
                const html = renderLatex(autoSeg.value, false);
                return <span key={autoIdx} className="inline" dangerouslySetInnerHTML={{ __html: html }} />;
              })}
            </React.Fragment>
          );
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
