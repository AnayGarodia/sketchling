// CodeMirror 6, bundled rather than pulled from a CDN so the playground works offline and
// the Playwright test isn't hostage to a third-party host. Colours come from the same CSS
// custom properties as the rest of the chrome (site/playground.css), which is what lets one
// theme definition cover both light and dark.
import { basicSetup, EditorView } from "codemirror";
import { keymap } from "@codemirror/view";
import { Prec } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

const theme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "var(--panel)",
    color: "var(--fg)",
    fontSize: "13px",
  },
  ".cm-content": {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    padding: "10px 0",
  },
  ".cm-scroller": { lineHeight: "1.55" },
  ".cm-gutters": {
    backgroundColor: "var(--panel)",
    color: "var(--fg-dim)",
    border: "none",
    paddingRight: "4px",
  },
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "var(--active)" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--fg)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "var(--sel)",
  },
  ".cm-selectionMatch": { backgroundColor: "var(--active)" },
  ".cm-tooltip": {
    backgroundColor: "var(--panel)",
    border: "1px solid var(--edge)",
    color: "var(--fg)",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": { backgroundColor: "var(--sel)", color: "var(--fg)" },
});

const highlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.modifier, tags.controlKeyword, tags.definitionKeyword], color: "var(--syn-keyword)" },
  { tag: [tags.string, tags.special(tags.string), tags.regexp], color: "var(--syn-string)" },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], color: "var(--syn-number)" },
  { tag: [tags.comment, tags.lineComment, tags.blockComment, tags.docComment], color: "var(--syn-comment)", fontStyle: "italic" },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName), tags.propertyName], color: "var(--syn-fn)" },
  { tag: [tags.typeName, tags.className, tags.tagName], color: "var(--syn-type)" },
  { tag: [tags.operator, tags.punctuation, tags.separator], color: "var(--syn-op)" },
]);

export interface EditorOptions {
  doc: string;
  onChange: () => void;
  onRun: () => void;
}

export function createEditor(parent: HTMLElement, opts: EditorOptions): EditorView {
  return new EditorView({
    parent,
    doc: opts.doc,
    extensions: [
      // Prec.highest so Mod-Enter beats basicSetup's own keymap (where Enter inserts a
      // newline and would otherwise swallow the shortcut).
      Prec.highest(
        keymap.of([
          {
            key: "Mod-Enter",
            preventDefault: true,
            run: () => {
              opts.onRun();
              return true;
            },
          },
        ])
      ),
      basicSetup,
      // Scene sources are wide (point arrays, style objects), and a playground pane is
      // narrow — wrapping keeps the whole line readable without a horizontal scrollbar.
      EditorView.lineWrapping,
      // TypeScript syntax rather than plain JS: scenes are .ts files, and type annotations
      // in a pasted example shouldn't highlight as errors.
      javascript({ typescript: true }),
      syntaxHighlighting(highlight),
      theme,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) opts.onChange();
      }),
    ],
  });
}

export function setEditorDoc(view: EditorView, doc: string): void {
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: doc },
    selection: { anchor: 0 },
    scrollIntoView: true,
  });
}
