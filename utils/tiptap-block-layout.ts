import { Mark, Extension, type Command } from "@tiptap/react";

const blockTypes = ["paragraph", "heading"];
const alignments = ["left", "center", "right"];
const indentStep = 24;
const maxIndent = 8;

/** Inline styles preserve layout in saved descriptions without editor-specific CSS. */
export const BlockLayout = Extension.create({
  name: "descriptionBlockLayout",
  addGlobalAttributes() {
    return [
      {
        types: blockTypes,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const value = element.style.marginLeft;
              return value.endsWith("px")
                ? Math.min(maxIndent, Math.max(0, Math.round(parseFloat(value) / indentStep)))
                : 0;
            },
            renderHTML: ({ indent }) =>
              indent ? { style: `margin-left: ${indent * indentStep}px` } : {},
          },
          textAlign: {
            default: "left",
            parseHTML: (element) =>
              alignments.includes(element.style.textAlign) ? element.style.textAlign : "left",
            renderHTML: ({ textAlign }) => ({
              style: `text-align: ${alignments.includes(textAlign) ? textAlign : "left"}`,
            }),
          },
        },
      },
    ];
  },
});

export function changeIndent(direction: 1 | -1): Command {
  return (props) => {
    const { state, tr, dispatch, commands } = props;
    // Keep structural nesting for lists; apply a block margin to ordinary text.
    const { $from, from, to } = state.selection;
    let inList = false;
    for (let depth = $from.depth; depth > 0; depth--) {
      if ($from.node(depth).type.name === "listItem") inList = true;
    }
    if (inList)
      return direction === 1
        ? commands.sinkListItem("listItem")
        : commands.liftListItem("listItem");
    let changed = false;
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (node.type.name === "listItem") return false;
      if (!blockTypes.includes(node.type.name)) return;
      const indent = Math.max(0, Math.min(maxIndent, (node.attrs.indent ?? 0) + direction));
      if (indent !== node.attrs.indent) {
        changed = true;
        if (dispatch) tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent });
      }
    });
    return changed;
  };
}

export function alignText(textAlign: "left" | "center" | "right"): Command {
  return ({ state, tr, dispatch }) => {
    let found = false;
    state.doc.nodesBetween(state.selection.from, state.selection.to, (node, pos) => {
      if (!blockTypes.includes(node.type.name)) return;
      found = true;
      if (dispatch) tr.setNodeMarkup(pos, undefined, { ...node.attrs, textAlign });
    });
    return found;
  };
}

export const fontSizes = ["0.875em", "1.25em", "1.5em"];

export const DescriptionFontSize = Mark.create({
  name: "descriptionFontSize",
  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: (element) =>
          fontSizes.includes(element.style.fontSize) ? element.style.fontSize : null,
        renderHTML: ({ size }) => (fontSizes.includes(size) ? { style: `font-size: ${size}` } : {}),
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "span",
        getAttrs: (element) => (fontSizes.includes(element.style.fontSize) ? {} : false),
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", HTMLAttributes, 0];
  },
});
