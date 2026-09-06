import { useEffect, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import DOMPurify from "isomorphic-dompurify";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
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
import { FontSizeControl, MobileDescriptionToolbar } from "@/components/mobile-description-toolbar";
import { Button } from "@/components/ui/button";
import { whatsappPasteHtml } from "@/utils/description-formatting";
import {
  BlockLayout,
  changeIndent,
  alignText,
  DescriptionFontSize,
} from "@/utils/tiptap-block-layout";

import "./activity-description-editor.css";

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
      attributes: {
        role: "textbox",
        "aria-label": "Activity description",
        "aria-multiline": "true",
      },
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
        aria-label="Description formatting"
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
        name="Description"
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

export function ActivityDescriptionEditor({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (html: string) => void;
}) {
  const [initial] = useState(() => initialHtml(value));
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium">Description</legend>
      <p className="text-sm text-muted-foreground">
        Paste *bold*, _italic_, or ~strikethrough~ to format text automatically.
      </p>
      <TiptapDescription initial={initial} disabled={disabled} onChange={onChange} />
    </fieldset>
  );
}
