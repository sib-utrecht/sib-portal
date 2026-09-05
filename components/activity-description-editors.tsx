import { useEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import DOMPurify from "isomorphic-dompurify";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Quill, { type Range } from "quill";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Underline,
  IndentIncrease,
  IndentDecrease,
  Quote,
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Undo2,
  Redo2,
} from "lucide-react";
import {
  FontSizeControl,
  MobileDescriptionToolbar,
  type DescriptionAction,
} from "@/components/mobile-description-toolbar";
import { Button } from "@/components/ui/button";
import { whatsappPasteHtml } from "@/utils/description-formatting";
import {
  BlockLayout,
  changeIndent,
  alignText,
  DescriptionFontSize,
  fontSizes,
} from "@/utils/tiptap-block-layout";

// Save alignment as inline styles so descriptions render outside Quill too.
Quill.register("formats/align", Quill.import("attributors/style/align"), true);
const sizeStyle = Quill.import("attributors/style/size") as { whitelist: string[] };
sizeStyle.whitelist = fontSizes;
Quill.register("formats/size", sizeStyle, true);

import "quill/dist/quill.snow.css";
import "./activity-description-editors.css";

function initialHtml(value: string) {
  return DOMPurify.sanitize(
    renderToStaticMarkup(<ReactMarkdown rehypePlugins={[rehypeRaw]}>{value}</ReactMarkdown>),
  );
}

type EditorProps = { initial: string; disabled: boolean; onChange: (html: string) => void };

function TiptapDescription({ initial, disabled, onChange }: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      BlockLayout,
      DescriptionFontSize,
    ],
    content: initial,
    // WhatsApp uses single stars for bold, unlike Markdown's default italic shortcut.
    enableInputRules: false,
    enablePasteRules: false,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: { role: "textbox", "aria-label": "Tiptap description", "aria-multiline": "true" },
      handlePaste: (_view, event) => {
        if (!event.clipboardData) return false;
        const html = whatsappPasteHtml(event.clipboardData);
        if (!html) return false;
        event.preventDefault();
        editor?.chain().focus().insertContent(html).run();
        return true;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });
  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);
  return (
    <div className="description-tiptap rounded-md border border-input">
      <div
        className="description-desktop-toolbar flex flex-wrap gap-1 border-b p-2"
        role="group"
        aria-label="Tiptap formatting"
      >
        <FontSizeControl
          value={editor?.getAttributes("descriptionFontSize").size ?? ""}
          disabled={disabled || !editor}
          onChange={(size) => {
            const chain = editor?.chain().focus();
            if (size) chain?.setMark("descriptionFontSize", { size }).run();
            else chain?.unsetMark("descriptionFontSize").run();
          }}
        />
        {(
          [
            ["Bold", "bold", Bold, () => editor?.chain().focus().toggleBold().run()],
            [
              "Underline",
              "underline",
              Underline,
              () => editor?.chain().focus().toggleUnderline().run(),
            ],
            [
              "Block quote",
              "blockquote",
              Quote,
              () => editor?.chain().focus().toggleBlockquote().run(),
            ],
            ["Italic", "italic", Italic, () => editor?.chain().focus().toggleItalic().run()],
            [
              "Strikethrough",
              "strike",
              Strikethrough,
              () => editor?.chain().focus().toggleStrike().run(),
            ],
            ["Bullets", "bulletList", List, () => editor?.chain().focus().toggleBulletList().run()],
            [
              "Numbered list",
              "orderedList",
              ListOrdered,
              () => editor?.chain().focus().toggleOrderedList().run(),
            ],
          ] as const
        ).map(([label, mark, Icon, action]) => (
          <Button
            key={mark}
            type="button"
            size="icon"
            aria-label={label}
            title={label}
            variant={editor?.isActive(mark) ? "secondary" : "ghost"}
            aria-pressed={editor?.isActive(mark) ?? false}
            disabled={disabled || !editor}
            onPointerDown={(event) => event.preventDefault()}
            onClick={action}
          >
            <Icon aria-hidden="true" size={20} />
          </Button>
        ))}
        {(
          [
            [
              "Decrease indent",
              IndentDecrease,
              () => editor?.chain().focus().command(changeIndent(-1)).run(),
              editor?.can().command(changeIndent(-1)),
            ],
            [
              "Increase indent",
              IndentIncrease,
              () => editor?.chain().focus().command(changeIndent(1)).run(),
              editor?.can().command(changeIndent(1)),
            ],
          ] as const
        ).map(([label, Icon, action, canRun]) => (
          <Button
            key={label}
            type="button"
            size="icon"
            variant="ghost"
            aria-label={label}
            title={label}
            disabled={disabled || !canRun}
            onPointerDown={(event) => event.preventDefault()}
            onClick={action}
          >
            <Icon aria-hidden="true" size={20} />
          </Button>
        ))}
        {(
          [
            ["left", AlignLeft],
            ["center", AlignCenter],
            ["right", AlignRight],
          ] as const
        ).map(([alignment, Icon]) => (
          <Button
            key={alignment}
            type="button"
            size="icon"
            aria-label={`Align ${alignment}`}
            title={`Align ${alignment}`}
            variant={editor?.isActive({ textAlign: alignment }) ? "secondary" : "ghost"}
            aria-pressed={editor?.isActive({ textAlign: alignment }) ?? false}
            disabled={disabled || !editor}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => editor?.chain().focus().command(alignText(alignment)).run()}
          >
            <Icon aria-hidden="true" size={20} />
          </Button>
        ))}
        <Button
          type="button"
          size="icon"
          aria-label="Undo"
          title="Undo"
          onPointerDown={(event) => event.preventDefault()}
          variant="ghost"
          disabled={disabled || !editor?.can().undo()}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <Undo2 aria-hidden="true" size={20} />
        </Button>
        <Button
          type="button"
          size="icon"
          aria-label="Redo"
          title="Redo"
          onPointerDown={(event) => event.preventDefault()}
          variant="ghost"
          disabled={disabled || !editor?.can().redo()}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <Redo2 aria-hidden="true" size={20} />
        </Button>
      </div>
      <EditorContent editor={editor} />
      <MobileDescriptionToolbar
        root={editor?.view.dom ?? null}
        name="Tiptap"
        fontSize={editor?.getAttributes("descriptionFontSize").size ?? ""}
        onFontSizeChange={(size) => {
          const chain = editor?.chain().focus(undefined, { scrollIntoView: false });
          if (size) chain?.setMark("descriptionFontSize", { size }).run();
          else chain?.unsetMark("descriptionFontSize").run();
        }}
        disabled={disabled || !editor}
        active={{
          left: editor?.isActive({ textAlign: "left" }),
          center: editor?.isActive({ textAlign: "center" }),
          right: editor?.isActive({ textAlign: "right" }),
          underline: editor?.isActive("underline"),
          blockquote: editor?.isActive("blockquote"),
          bold: editor?.isActive("bold"),
          italic: editor?.isActive("italic"),
          strike: editor?.isActive("strike"),
          bullet: editor?.isActive("bulletList"),
          ordered: editor?.isActive("orderedList"),
        }}
        unavailable={[
          ...(!editor?.can().command(changeIndent(1)) ? ["indent" as const] : []),
          ...(!editor?.can().command(changeIndent(-1)) ? ["outdent" as const] : []),
          ...(!editor?.can().undo() ? ["undo" as const] : []),
          ...(!editor?.can().redo() ? ["redo" as const] : []),
        ]}
        onAction={(action) => {
          if (!editor) return;
          const chain = editor.chain().focus(undefined, { scrollIntoView: false });
          switch (action) {
            case "left":
            case "center":
            case "right":
              chain.command(alignText(action)).run();
              break;
            case "underline":
              chain.toggleUnderline().run();
              break;
            case "blockquote":
              chain.toggleBlockquote().run();
              break;
            case "indent":
              chain.command(changeIndent(1)).run();
              break;
            case "outdent":
              chain.command(changeIndent(-1)).run();
              break;
            case "bold":
              chain.toggleBold().run();
              break;
            case "italic":
              chain.toggleItalic().run();
              break;
            case "strike":
              chain.toggleStrike().run();
              break;
            case "bullet":
              chain.toggleBulletList().run();
              break;
            case "ordered":
              chain.toggleOrderedList().run();
              break;
            case "undo":
              chain.undo().run();
              break;
            case "redo":
              chain.redo().run();
              break;
          }
        }}
      />
    </div>
  );
}

function QuillDescription({ initial, disabled, onChange }: EditorProps) {
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<Quill | null>(null);
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const selection = useRef<Range | null>(null);
  const [formats, setFormats] = useState<Record<string, unknown>>({});
  const changeRef = useRef(onChange);
  useEffect(() => {
    changeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    const host = container.current!;
    const element = document.createElement("div");
    host.append(element);
    const quill = new Quill(element, {
      theme: "snow",
      placeholder: "Describe the activity…",
      modules: {
        toolbar: [
          [{ size: [false, ...fontSizes] }],
          ["bold", "italic", "underline", "strike"],
          ["blockquote"],
          [{ align: "" }, { align: "center" }, { align: "right" }],
          [{ indent: "-1" }, { indent: "+1" }],
          [{ list: "bullet" }, { list: "ordered" }],
          ["clean"],
        ],
      },
    });
    instance.current = quill;
    setRoot(quill.root);
    quill.clipboard.dangerouslyPasteHTML(initial);
    quill.history.clear();
    quill.root.setAttribute("role", "textbox");
    quill.root.setAttribute("aria-label", "Quill description");
    quill.root.setAttribute("aria-multiline", "true");
    const onTextChange = () =>
      changeRef.current(quill.getText().trim() ? quill.getSemanticHTML() : "");
    quill.on("text-change", onTextChange);
    const updateSelection = () => {
      const range = quill.getSelection();
      if (range) {
        selection.current = range;
        setFormats(quill.getFormat(range));
      }
    };
    quill.on("editor-change", updateSelection);
    const paste = (event: ClipboardEvent) => {
      if (!quill.isEnabled() || !event.clipboardData) return;
      const html = whatsappPasteHtml(event.clipboardData);
      if (!html) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const range = quill.getSelection(true);
      const delta = quill.clipboard.convert({ html });
      const Delta = Quill.import("delta");
      quill.history.cutoff();
      quill.updateContents(
        new Delta().retain(range.index).delete(range.length).concat(delta),
        "user",
      );
      quill.setSelection(range.index + delta.length(), 0, "silent");
      quill.history.cutoff();
    };
    quill.root.addEventListener("paste", paste, true);
    return () => {
      quill.off("text-change", onTextChange);
      quill.off("editor-change", updateSelection);
      quill.root.removeEventListener("paste", paste, true);
      instance.current = null;
      host.replaceChildren();
    };
  }, [initial]);
  useEffect(() => {
    instance.current?.enable(!disabled);
    container.current
      ?.querySelectorAll<HTMLButtonElement | HTMLSelectElement>(
        ".ql-toolbar button, .ql-toolbar select",
      )
      .forEach((button) => {
        button.disabled = disabled;
      });
  }, [disabled]);
  function format(action: DescriptionAction) {
    const quill = instance.current;
    if (!quill || disabled) return;
    const range = selection.current;
    quill.focus({ preventScroll: true });
    if (range) quill.setSelection(range, "silent");
    if (action === "undo" || action === "redo") {
      quill.history[action]();
    } else {
      const current = quill.getFormat();
      if (action === "bullet" || action === "ordered") {
        quill.format("list", current.list === action ? false : action, "user");
      } else if (action === "indent" || action === "outdent") {
        quill.format("indent", action === "indent" ? "+1" : "-1", "user");
      } else if (action === "left" || action === "center" || action === "right") {
        quill.format("align", action === "left" ? false : action, "user");
      } else {
        quill.format(action, !current[action], "user");
      }
    }
    const next = quill.getSelection();
    if (next) {
      selection.current = next;
      setFormats(quill.getFormat(next));
    }
  }
  return (
    <>
      <div ref={container} className="description-quill" />
      <MobileDescriptionToolbar
        root={root}
        name="Quill"
        fontSize={typeof formats.size === "string" ? formats.size : ""}
        onFontSizeChange={(size) => {
          const quill = instance.current;
          if (!quill || disabled) return;
          const range = selection.current;
          quill.focus({ preventScroll: true });
          if (range) quill.setSelection(range, "silent");
          quill.format("size", size || false, "user");
          setFormats(quill.getFormat());
        }}
        disabled={disabled}
        active={{
          left: !formats.align || formats.align === "left",
          center: formats.align === "center",
          right: formats.align === "right",
          underline: !!formats.underline,
          blockquote: !!formats.blockquote,
          bold: !!formats.bold,
          italic: !!formats.italic,
          strike: !!formats.strike,
          bullet: formats.list === "bullet",
          ordered: formats.list === "ordered",
        }}
        onAction={format}
      />
    </>
  );
}

export function ActivityDescriptionEditors({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (html: string) => void;
}) {
  const [initial] = useState(() => initialHtml(value));
  // Preserve the original string until the user actually edits a draft.
  const [drafts, setDrafts] = useState({ tiptap: value, quill: value });
  const [selected, setSelected] = useState<"tiptap" | "quill">("tiptap");
  function update(key: "tiptap" | "quill", html: string) {
    setDrafts((previous) => ({ ...previous, [key]: html }));
    setSelected(key);
    onChange(html);
  }
  return (
    <fieldset className="space-y-4" disabled={disabled}>
      <legend className="text-sm font-medium">Description</legend>
      <p className="text-sm text-muted-foreground">
        Try both editors. The editor you last change is selected for saving. Paste *bold*, _italic_,
        or ~strikethrough~ to format text automatically.
      </p>
      {(["tiptap", "quill"] as const).map((key) => (
        <section
          key={key}
          className="space-y-2"
          aria-label={`${key === "tiptap" ? "Tiptap" : "Quill"} editor`}
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-medium">{key === "tiptap" ? "Tiptap" : "Quill"}</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="description-editor"
                checked={selected === key}
                onChange={() => {
                  setSelected(key);
                  onChange(drafts[key]);
                }}
              />
              Use this description
            </label>
          </div>
          {key === "tiptap" ? (
            <TiptapDescription
              initial={initial}
              disabled={disabled}
              onChange={(html) => update(key, html)}
            />
          ) : (
            <QuillDescription
              initial={initial}
              disabled={disabled}
              onChange={(html) => update(key, html)}
            />
          )}
        </section>
      ))}
    </fieldset>
  );
}
