import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { sanitizeHtml } from "../lib/sanitizeHtml";

function ToolbarBtn({ onClick, active, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className="min-w-[28px] rounded px-1.5 py-1 text-[13px] font-medium transition-colors"
      style={{
        backgroundColor: active ? "var(--color-accent-purple-soft)" : "transparent",
        color: active ? "var(--color-accent-purple)" : "var(--color-txt-secondary)",
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <span
      className="mx-0.5 h-4 w-px self-center shrink-0"
      style={{ backgroundColor: "var(--color-border)" }}
      aria-hidden
    />
  );
}

function normalize(html) {
  if (!html || html === "<p></p>") return "";
  return html;
}

export default function RichTextEditor({ value = "", onChange, readOnly = false }) {
  // Stored HTML (e.g. task descriptions) is rendered by tiptap/ProseMirror; sanitize
  // it first so any persisted XSS payload is stripped before it ever reaches the DOM.
  const safeValue = sanitizeHtml(value || "");

  const editor = useEditor({
    extensions: [StarterKit],
    content: safeValue,
    editable: !readOnly,
    onUpdate({ editor }) {
      onChange?.(normalize(editor.getHTML()));
    },
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const current = normalize(editor.getHTML());
    const next = normalize(safeValue);
    if (current !== next) {
      editor.commands.setContent(safeValue, false);
    }
  }, [editor, safeValue]);

  return (
    <div
      className="rte-root overflow-hidden rounded-xl"
      style={{
        border: "1px solid var(--color-border)",
        backgroundColor: "var(--color-surface)",
      }}
    >
      {!readOnly && editor && (
        <div
          className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5"
          style={{
            borderColor: "var(--color-border)",
            backgroundColor: "var(--color-surface-muted)",
          }}
        >
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Bold"
          >
            <strong>B</strong>
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="Italic"
          >
            <em>I</em>
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive("strike")}
            title="Strikethrough"
          >
            <s>S</s>
          </ToolbarBtn>
          <Divider />
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            title="Bullet list"
          >
            ≡
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            title="Numbered list"
          >
            1.
          </ToolbarBtn>
          <Divider />
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive("heading", { level: 2 })}
            title="Heading"
          >
            H2
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive("codeBlock")}
            title="Code block"
          >
            {"</>"}
          </ToolbarBtn>
          <Divider />
          <ToolbarBtn
            onClick={() => editor.chain().focus().undo().run()}
            active={false}
            title="Undo"
          >
            ↩
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().redo().run()}
            active={false}
            title="Redo"
          >
            ↪
          </ToolbarBtn>
        </div>
      )}
      <EditorContent editor={editor} className="rte-content" />
    </div>
  );
}
