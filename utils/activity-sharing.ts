import { activityDateTimeZone, shouldShowActivityTime } from "@/utils/activity-date";

type ShareableActivity = {
  title: string;
  description: string;
  startTime: number;
  location?: string;
  slug: string;
  allowSignup: boolean;
  externalSignupUrl?: string;
};

const PORTAL_ORIGIN = "https://portal.sib-utrecht.nl";

function formatShareDate(timestamp: number): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: activityDateTimeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).formatToParts(timestamp);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("weekday")} ${value("day")} ${value("month")}`;
}

function formatShareTime(timestamp: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: activityDateTimeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(timestamp);
}

function htmlToWhatsAppText(html: string): string {
  const document = new DOMParser().parseFromString(html, "text/html");
  document.querySelectorAll("script, style").forEach((element) => element.remove());

  function render(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      const content = node.textContent ?? "";
      // Source-code whitespace is collapsed by HTML rendering. Keeping its literal
      // newlines here would duplicate an adjacent <br> in the WhatsApp message.
      return node.parentElement?.closest("pre") ? content : content.replace(/\s+/g, " ");
    }
    if (!(node instanceof HTMLElement)) return "";

    const content = Array.from(node.childNodes, render).join("");
    switch (node.tagName.toLowerCase()) {
      case "strong":
      case "b":
        return `*${content}*`;
      case "em":
      case "i":
        return `_${content}_`;
      case "s":
      case "del":
        return `~${content}~`;
      case "br":
        return "\n";
      case "li":
        return `• ${content.trim()}\n`;
      case "p":
      case "div":
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
      case "blockquote":
      case "pre":
      case "ul":
      case "ol":
        return `${content}\n\n`;
      default:
        return content;
    }
  }

  return Array.from(document.body.childNodes, render).join("");
}

function tidySharedText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Convert the editor's HTML to WhatsApp markup, while also supporting legacy plain Markdown. */
export function descriptionToWhatsAppText(description: string): string {
  const containsHtml = /<\/?[a-z][^>]*>/i.test(description);
  return tidySharedText(containsHtml ? htmlToWhatsAppText(description) : description);
}

function startsWithHeader(description: string): boolean {
  const lines = description.split("\n");
  const firstLine = lines[0]?.trim() ?? "";
  const secondLine = lines[1]?.trim() ?? "";
  const followedByBlankLine = lines.length > 2 && lines[2].trim() === "";

  const firstLineIsBold =
    firstLine.length > 2 && firstLine.startsWith("*") && firstLine.endsWith("*");
  const hasTwoLineHeader = Boolean(firstLine && secondLine.includes("|") && followedByBlankLine);

  return firstLineIsBold || hasTwoLineHeader;
}

function getSignupUrl(activity: ShareableActivity): string | undefined {
  if (activity.externalSignupUrl) {
    try {
      const signupUrl = activity.externalSignupUrl.trim();
      const url = new URL(signupUrl);
      if (url.protocol === "http:" || url.protocol === "https:") return signupUrl;
    } catch {
      // Invalid external signup URLs are not useful in the exported message.
    }
  }

  if (activity.allowSignup) {
    return `${PORTAL_ORIGIN}/activities/${encodeURIComponent(activity.slug)}`;
  }

  return undefined;
}

export function buildActivityShareText(activity: ShareableActivity): string {
  const description = descriptionToWhatsAppText(activity.description);
  const date = formatShareDate(activity.startTime);
  const time = shouldShowActivityTime(activity.startTime)
    ? formatShareTime(activity.startTime)
    : undefined;
  const metadata = [date, time, activity.location?.trim()].filter(Boolean).join(" | ");

  const header = [`*${activity.title.trim()}*`, metadata && `_${metadata}_`]
    .filter(Boolean)
    .join("\n");
  const message = startsWithHeader(description)
    ? description
    : tidySharedText([header, description].filter(Boolean).join("\n\n"));
  const signupUrl = getSignupUrl(activity);

  if (!signupUrl || message.includes(signupUrl)) return message;
  return tidySharedText(`${message}\n\nSignup: ${signupUrl}`);
}
