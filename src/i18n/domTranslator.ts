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
  private hasCatalog = false;
  private observer: MutationObserver | null = null;
  private root: HTMLElement;
  private applying = false;
  private rafId: number | null = null;

  constructor(root: HTMLElement = document.body) {
    this.root = root;
  }

  setCatalog(messages: Record<string, string>) {
    this.messages = messages;
    this.hasCatalog = Object.keys(messages).length > 0;
  }

  start() {
    if (this.observer) return;
    this.observer = new MutationObserver((mutations) => {
      if (this.applying) return;
      // Batch with rAF to avoid thrashing during React commits.
      if (this.rafId !== null) return;
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        const nodes: Node[] = [];
        for (const m of mutations) {
          if (m.type === 'characterData') nodes.push(m.target);
          else m.addedNodes.forEach((n) => nodes.push(n));
          if (m.type === 'attributes' && m.target.nodeType === Node.ELEMENT_NODE) {
            nodes.push(m.target);
          }
        }
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
      for (const t of texts) this.applyText(t);

      // Attributes
      const elements = this.root.querySelectorAll(
        '[placeholder],[title],[aria-label],[alt]'
      );
      elements.forEach((el) => this.applyAttrs(el));
    });
  }

  private translateNodes(nodes: Node[]) {
    // On the default language (empty catalog) there is nothing to apply to
    // newly added nodes; the one-time restore happens via refresh()/translateAll.
    if (!this.hasCatalog) return;
    this.withPaused(() => {
      for (const node of nodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          this.applyText(node as Text);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as Element;
          this.applyAttrs(el);
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          let t = walker.nextNode();
          while (t) {
            this.applyText(t as Text);
            t = walker.nextNode();
          }
          el.querySelectorAll('[placeholder],[title],[aria-label],[alt]').forEach((e) =>
            this.applyAttrs(e)
          );
        }
      }
    });
  }

  private applyText(node: Text) {
    const current = node.nodeValue ?? '';
    if (!current.trim()) return;
    if (shouldSkip(node)) return;

    let original = ORIGINAL_TEXT.get(node);
    if (original === undefined) {
      original = current;
      ORIGINAL_TEXT.set(node, original);
    }

    const key = collapse(original);
    const translation = this.messages[key];

    // Preserve leading / trailing whitespace from the original node.
    const lead = original.match(/^\s*/)?.[0] ?? '';
    const trail = original.match(/\s*$/)?.[0] ?? '';
    const next = translation ? lead + translation + trail : original;

    if (node.nodeValue !== next) node.nodeValue = next;
  }

  private applyAttrs(el: Element) {
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
      if (store[attr] === undefined) store[attr] = current;

      const key = collapse(store[attr]);
      const translation = this.messages[key];
      const next = translation ?? store[attr];
      if (el.getAttribute(attr) !== next) el.setAttribute(attr, next);
    }
  }
}
