import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  Keyboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type DescriptionAction =
  | "left"
  | "center"
  | "right"
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "bullet"
  | "ordered"
  | "indent"
  | "outdent"
  | "blockquote"
  | "undo"
  | "redo";
const controls = [
  ["bold", "Bold", Bold],
  ["italic", "Italic", Italic],
  ["underline", "Underline", Underline],
  ["strike", "Strikethrough", Strikethrough],
  ["bullet", "Bullet list", List],
  ["ordered", "Numbered list", ListOrdered],
  ["outdent", "Decrease indent", IndentDecrease],
  ["indent", "Increase indent", IndentIncrease],
  ["left", "Align left", AlignLeft],
  ["center", "Align center", AlignCenter],
  ["right", "Align right", AlignRight],
  ["blockquote", "Block quote", Quote],
  ["undo", "Undo", Undo2],
  ["redo", "Redo", Redo2],
] as const;

export function FontSizeControl({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  onChange: (size: string) => void;
}) {
  return (
    <select
      aria-label="Font size"
      title="Font size"
      value={value}
      disabled={disabled}
      className="description-font-size rounded-md border border-input bg-background px-2 text-sm"
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">Default</option>
      <option value="0.875em">Small</option>
      <option value="1.25em">Large</option>
      <option value="1.5em">Extra large</option>
    </select>
  );
}

/** Both editors use the same mobile controls, positioned in the visible viewport. */
export function MobileDescriptionToolbar({
  root,
  name,
  disabled,
  active,
  unavailable = [],
  onAction,
  fontSize = "",
  onFontSizeChange,
}: {
  root: HTMLElement | null;
  name: string;
  disabled: boolean;
  active: Partial<Record<DescriptionAction, boolean>>;
  unavailable?: DescriptionAction[];
  onAction: (action: DescriptionAction) => void;
  fontSize?: string;
  onFontSizeChange?: (size: string) => void;
}) {
  const toolbar = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(
      "(max-width: 767px), (pointer: coarse) and (max-width: 1024px)",
    );
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!root) return;
    const contains = (target: EventTarget | null) =>
      target instanceof Node && (root.contains(target) || toolbar.current?.contains(target));
    const focus = (event: FocusEvent) => setFocused(!!contains(event.target));
    // A swipe can start outside the editor without moving focus. Hiding on
    // pointerdown would strand the toolbar until the editor is refocused.
    let frame = 0;
    const blur = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setFocused(!!contains(document.activeElement)));
    };
    setFocused(root.contains(document.activeElement));
    document.addEventListener("focusin", focus);
    document.addEventListener("focusout", blur);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("focusout", blur);
    };
  }, [root]);

  const visible = mobile && focused && !disabled;
  useLayoutEffect(() => {
    const element = toolbar.current;
    if (!visible || !element) return;
    const viewport = window.visualViewport;
    let frame = 0;
    let settleUntil = 0;
    const place = () => {
      // Absolute page coordinates avoid mobile browsers' inconsistent fixed-position
      // containing viewport while the keyboard pans an already-scrolled page.
      const height = viewport?.height ?? window.innerHeight;
      const width = viewport?.width ?? window.innerWidth;
      const pageTop = viewport?.pageTop ?? window.scrollY;
      const pageLeft = viewport?.pageLeft ?? window.scrollX;
      element.style.width = `${width}px`;
      element.style.maxHeight = `${height}px`;
      element.style.left = `${pageLeft}px`;
      element.style.top = `${pageTop + Math.max(0, height - element.offsetHeight)}px`;
      element.style.visibility = "visible";
    };
    const settle = () => {
      place();
      frame = performance.now() < settleUntil ? requestAnimationFrame(settle) : 0;
    };
    const update = () => {
      place();
      // Keyboard/browser chrome animations can finish after the last resize event.
      // Recheck briefly, without causing React renders on every animation frame.
      settleUntil = performance.now() + 600;
      if (!frame) frame = requestAnimationFrame(settle);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener("scroll", update, { passive: true, capture: true });
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    viewport?.addEventListener("scrollend", update);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      viewport?.removeEventListener("scrollend", update);
    };
  }, [visible]);

  if (!visible) return null;
  return createPortal(
    <div
      ref={toolbar}
      className="description-mobile-toolbar"
      role="group"
      aria-label={`${name} mobile formatting`}
    >
      <span className="sr-only">{name} formatting</span>
      <div className="description-mobile-actions">
        {onFontSizeChange && <FontSizeControl value={fontSize} onChange={onFontSizeChange} />}
        {controls.map(([action, label, Icon]) => (
          <Button
            key={action}
            type="button"
            variant={active[action] ? "secondary" : "ghost"}
            aria-label={label}
            title={label}
            aria-pressed={
              ["undo", "redo", "indent", "outdent"].includes(action) ? undefined : !!active[action]
            }
            disabled={unavailable.includes(action)}
            // Keep the editor focused and the native selection intact on touch/mouse.
            // Keyboard users can still tab here and activate with Enter or Space.
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => onAction(action)}
          >
            <Icon aria-hidden="true" size={20} />
          </Button>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        aria-label="Done editing"
        title="Done editing"
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => {
          root?.blur();
          setFocused(false);
        }}
      >
        <Keyboard aria-hidden="true" size={20} />
      </Button>
    </div>,
    document.body,
  );
}
