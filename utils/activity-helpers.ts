import he from "he";
import type { Activity } from "../types/activity";

/**
 * Returns the display name for an activity, normalising both the flat string
 * form and the `{ long: string }` object form returned by the API.
 *
 * @param activity - The activity whose name should be resolved.
 * @returns The human-readable activity title, or `"Unnamed Activity"` as a fallback.
 */
export function getActivityName(activity: Activity): string {
  if (!activity.name) return "Unnamed Activity";

  if (typeof activity.name === "string") {
    return activity.name;
  }

  if (typeof activity.name === "object" && activity.name.long) {
    return activity.name.long;
  }

  return "Unnamed Activity";
}

/**
 * Returns a plain-text description for an activity, normalising both the flat
 * `description` field and the nested `body.description` field (which may be a
 * raw HTML string or a `{ html: string }` object).  HTML tags and common
 * entities are stripped before returning.
 *
 * @param activity - The activity whose description should be resolved.
 * @returns Plain-text description, or `"No description available"` as a fallback.
 */
export function getActivityDescription(activity: Activity): string {
  // Check direct description field first
  if (activity.description && typeof activity.description === "string") {
    return stripHtml(activity.description);
  }

  // Check nested body.description
  if (activity.body?.description) {
    if (typeof activity.body.description === "string") {
      return stripHtml(activity.body.description);
    }

    if (typeof activity.body.description === "object" && activity.body.description.html) {
      return stripHtml(activity.body.description.html);
    }
  }

  return "No description available";
}

/**
 * Returns the ISO 8601 start timestamp for an activity, preferring the flat
 * `start_date` field over the nested `date.start` field.
 *
 * @param activity - The activity whose start date should be resolved.
 * @returns ISO 8601 date string, or an empty string when not available.
 */
export function getActivityStartDate(activity: Activity): string {
  // Check direct start_date field
  if (activity.start_date) {
    return activity.start_date;
  }

  // Check nested date.start
  if (activity.date?.start) {
    return activity.date.start;
  }

  return "";
}

/**
 * Returns the ISO 8601 end timestamp for an activity, preferring the flat
 * `end_date` field over the nested `date.end` field.
 *
 * @param activity - The activity whose end date should be resolved.
 * @returns ISO 8601 date string, or an empty string when not available.
 */
export function getActivityEndDate(activity: Activity): string {
  // Check direct end_date field
  if (activity.end_date) {
    return activity.end_date;
  }

  // Check nested date.end
  if (activity.date?.end) {
    return activity.date.end;
  }

  return "";
}

/**
 * Returns the cover image URL for an activity, preferring the flat `image_url`
 * field over the nested `body.image` field.
 *
 * @param activity - The activity whose image URL should be resolved.
 * @returns Image URL string, or `null` when no image is available.
 */
export function getActivityImage(activity: Activity): string | null {
  // Check direct image_url field
  if (activity.image_url) {
    return activity.image_url;
  }

  // Check nested body.image
  if (activity.body?.image) {
    return activity.body.image;
  }

  return null;
}

/**
 * Strips HTML tags from a string and decodes common HTML entities.
 *
 * @param html - Raw HTML string to sanitise.
 * @returns Plain-text string with tags removed and entities decoded.
 */
function stripHtml(html: string): string {
  if (!html) return "";

  // Replace block-level tags with a space so adjacent text isn't concatenated
  const withSpaces = html.replace(
    /<\/?(p|br|div|li|h[1-6]|blockquote|tr|td|th)[^>]*>/gi,
    " ",
  );

  // Remove remaining HTML tags
  const stripped = withSpaces.replace(/<[^>]*>/g, "");

  // Decode all HTML entities (numeric and named)
  const decoded = he.decode(stripped);

  // Collapse multiple whitespace characters into a single space
  return decoded.replace(/\s+/g, " ").trim();
}
