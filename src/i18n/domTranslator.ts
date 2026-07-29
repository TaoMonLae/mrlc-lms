// Whole-app runtime translator.
//
// React renders English source strings into the DOM. This walks the rendered
// DOM and replaces any text node / common attribute whose (whitespace-collapsed)
// value matches a catalog key with its translation. Because it works on the
// rendered output, every page is covered without wrapping each string in t() —
// adding a new .po file translates the entire app.
//
// Originals are remembered per-node so switching back to English (or to another
// language) restores/re-translates from the source text, never from an already
// translated value.

const ORIGINAL_TEXT = new WeakMap<Text, string>();
const ORIGINAL_ATTRS = new WeakMap<Element, Record<string, string>>();

const TRANSLATABLE_ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];

const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE', 'KBD', 'SAMP',
]);

function collapse(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Keep the remembered source when the DOM still contains the value rendered
 * from it. When React writes a genuinely new value into a reused text node or
 * attribute, treat that value as the new source instead of restoring stale
 * content from the first render.
 */
export function reconcileDomTranslationSource(
  current: string,
  rememberedSource: string | undefined,
  renderedRememberedSource: string,
  detectSourceChange: boolean,
): string {
  if (rememberedSource === undefined) return current;
  if (detectSourceChange && current !== renderedRememberedSource) return current;
  return rememberedSource;
}

function shouldSkip(node: Node): boolean {
  let el: Node | null = node;
  while (el && el !== document.body) {
    if (el.nodeType === Node.ELEMENT_NODE) {
      const e = el as Element;
      if (SKIP_TAGS.has(e.tagName)) return true;
      if (e.classList && e.classList.contains('katex')) return true;
      if (e.classList && e.classList.contains('katex-display')) return true;
      if (e.getAttribute && e.getAttribute('data-no-i18n') !== null) return true;
      if ((e as HTMLElement).isContentEditable) return true;
    }
    el = el.parentNode;
  }
  return false;
}

export class DomTranslator {
  private messages: Record<string, string> = {};
  private observer: MutationObserver | null = null;
  private root: HTMLElement;
  private applying = false;
  private rafId: number | null = null;
  private pendingNodes: Node[] = [];

  constructor(root: HTMLElement = document.body) {
    this.root = root;
  }

  setCatalog(messages: Record<string, string>) {
    // React may have committed new source text just before a language switch.
    // Reconcile those queued mutations against the current catalog before
    // replacing it, otherwise refresh() could restore an older source value.
    this.flushPendingSourceChanges();
    this.messages = messages;
  }

  start() {
    if (this.observer) return;
    this.observer = new MutationObserver((mutations) => {
      if (this.applying) return;
      this.pendingNodes.push(...this.mutationNodes(mutations));
      // Batch with rAF to avoid thrashing during React commits.
      if (this.rafId !== null) return;
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        const nodes = this.pendingNodes.splice(0);
        this.translateNodes(nodes);
      });
    });
    this.observer.observe(this.root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: TRANSLATABLE_ATTRS,
    });
    this.translateAll();
  }

  stop() {
    this.observer?.disconnect();
    this.observer = null;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.pendingNodes = [];
  }

  /** Re-run translation across the whole tree (call after a language change). */
  refresh() {
    this.translateAll();
  }

  private withPaused(fn: () => void) {
    this.applying = true;
    this.observer?.disconnect();
    try {
      fn();
    } finally {
      this.observer?.observe(this.root, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: TRANSLATABLE_ATTRS,
      });
      this.applying = false;
    }
  }

  private translateAll() {
    this.withPaused(() => {
      // Text nodes
      const walker = document.createTreeWalker(this.root, NodeFilter.SHOW_TEXT);
      const texts: Text[] = [];
      let n = walker.nextNode();
      while (n) {
        texts.push(n as Text);
        n = walker.nextNode();
      }
      for (const t of texts) this.applyText(t, false);

      // Attributes
      const elements = this.root.querySelectorAll(
        '[placeholder],[title],[aria-label],[alt]'
      );
      elements.forEach((el) => this.applyAttrs(el, false));
    });
  }

  private translateNodes(nodes: Node[]) {
    if (nodes.length === 0) return;
    this.withPaused(() => {
      for (const node of nodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          this.applyText(node as Text, true);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as Element;
          this.applyAttrs(el, true);
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          let t = walker.nextNode();
          while (t) {
            this.applyText(t as Text, true);
            t = walker.nextNode();
          }
          el.querySelectorAll('[placeholder],[title],[aria-label],[alt]').forEach((e) =>
            this.applyAttrs(e, true)
          );
        }
      }
    });
  }

  private mutationNodes(mutations: MutationRecord[]): Node[] {
    const nodes: Node[] = [];
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') nodes.push(mutation.target);
      else mutation.addedNodes.forEach((node) => nodes.push(node));
      if (
        mutation.type === 'attributes'
        && mutation.target.nodeType === Node.ELEMENT_NODE
      ) {
        nodes.push(mutation.target);
      }
    }
    return nodes;
  }

  private flushPendingSourceChanges() {
    if (!this.observer) return;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.pendingNodes.push(...this.mutationNodes(this.observer.takeRecords()));
    const nodes = this.pendingNodes.splice(0);
    this.translateNodes(nodes);
  }

  private renderText(source: string): string {
    const key = collapse(source);
    const translation = this.messages[key];
    const lead = source.match(/^\s*/)?.[0] ?? '';
    const trail = source.match(/\s*$/)?.[0] ?? '';
    return translation ? lead + translation + trail : source;
  }

  private applyText(node: Text, detectSourceChange: boolean) {
    const current = node.nodeValue ?? '';
    if (!current.trim()) return;
    if (shouldSkip(node)) return;

    const remembered = ORIGINAL_TEXT.get(node);
    const original = reconcileDomTranslationSource(
      current,
      remembered,
      remembered === undefined ? current : this.renderText(remembered),
      detectSourceChange,
    );
    if (remembered !== original) ORIGINAL_TEXT.set(node, original);

    const next = this.renderText(original);
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  private applyAttrs(el: Element, detectSourceChange: boolean) {
    if (shouldSkip(el)) return;
    let store = ORIGINAL_ATTRS.get(el);
    for (const attr of TRANSLATABLE_ATTRS) {
      if (!el.hasAttribute(attr)) continue;
      const current = el.getAttribute(attr) ?? '';
      if (!current.trim()) continue;

      if (!store) {
        store = {};
        ORIGINAL_ATTRS.set(el, store);
      }
      const remembered = store[attr];
      const renderedRemembered = remembered === undefined
        ? current
        : this.messages[collapse(remembered)] ?? remembered;
      const original = reconcileDomTranslationSource(
        current,
        remembered,
        renderedRemembered,
        detectSourceChange,
      );
      if (remembered !== original) store[attr] = original;

      const next = this.messages[collapse(original)] ?? original;
      if (el.getAttribute(attr) !== next) el.setAttribute(attr, next);
    }
  }
}
