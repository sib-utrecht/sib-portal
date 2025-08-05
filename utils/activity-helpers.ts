import type { Activity } from "../types/activity"

export function getActivityName(activity: Activity): string {
  if (!activity.name) return "Unnamed Activity"

  if (typeof activity.name === "string") {
    return activity.name
  }

  if (typeof activity.name === "object" && activity.name.long) {
    return activity.name.long
  }

  return "Unnamed Activity"
}

export function getActivityDescription(activity: Activity): string {
  // Check direct description field first
  if (activity.description && typeof activity.description === "string") {
    return stripHtml(activity.description)
  }

  // Check nested body.description
  if (activity.body?.description) {
    if (typeof activity.body.description === "string") {
      return stripHtml(activity.body.description)
    }

    if (typeof activity.body.description === "object" && activity.body.description.html) {
      return stripHtml(activity.body.description.html)
    }
  }

  return "No description available"
}

export function getActivityStartDate(activity: Activity): string {
  // Check direct start_date field
  if (activity.start_date) {
    return activity.start_date
  }

  // Check nested date.start
  if (activity.date?.start) {
    return activity.date.start
  }

  return ""
}

export function getActivityEndDate(activity: Activity): string {
  // Check direct end_date field
  if (activity.end_date) {
    return activity.end_date
  }

  // Check nested date.end
  if (activity.date?.end) {
    return activity.date.end
  }

  return ""
}

export function getActivityImage(activity: Activity): string | null {
  // Check direct image_url field
  if (activity.image_url) {
    return activity.image_url
  }

  // Check nested body.image
  if (activity.body?.image) {
    return activity.body.image
  }

  return null
}

// Helper function to strip HTML tags from strings
function stripHtml(html: string): string {
  if (!html) return ""

  // Remove HTML tags
  const stripped = html.replace(/<[^>]*>/g, "")

  // Decode common HTML entities
  const decoded = stripped
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")

  return decoded.trim()
}
