/**
 * A single event/activity as returned by the SIB-Utrecht activities API (`api2.sib-utrecht.nl`).
 * Several fields are polymorphic because the API has changed shape over time; use the
 * helper functions in `utils/activity-helpers.ts` to normalise them.
 */
export interface Activity {
  /** Unique numeric identifier for the activity. */
  id: number;
  /** Activity title — either a plain string or an object with a `long` variant. */
  name: string | { long: string };
  /** Optional nested body object that may contain an image URL and/or a description. */
  body?: {
    /** URL of the activity's cover image (nested form). */
    image?: string;
    /** Activity description — either a plain string or an object containing raw HTML. */
    description?: string | { html: string };
  };
  /** ISO 8601 start and end timestamps for the activity (nested form). */
  date?: { start?: string; end?: string };
  /** ISO 8601 timestamp when member sign-up opens, or `null` if not applicable. */
  signup_start?: string | null;
  /** ISO 8601 timestamp when member sign-up closes, or `null` if not applicable. */
  signup_end?: string | null;
  /** Human-readable location of the activity. */
  location?: string;
  /** Maximum number of participants allowed, or `null` for unlimited. */
  max_participants?: number | null;
  /** Number of members currently signed up. */
  current_participants?: number;
  /** Ticket price in euros; `0` indicates the event is free. */
  price?: number;
  /** URL of the activity's cover image (flat form). */
  image_url?: string | null;
  /** Category label assigned to the activity (e.g. "Social", "Sport"). */
  category?: string;
  /** Name of the committee or person organising the activity. */
  organizer?: string;
  /** Whether the sign-up window is currently open. */
  is_signup_open?: boolean;
  /** Whether the activity has reached its maximum participant count. */
  is_full?: boolean;
  /** ISO 8601 timestamp when the activity record was first created. */
  created_at?: string;
  /** ISO 8601 timestamp when the activity record was last modified. */
  updated_at?: string;
  /** ISO 8601 start timestamp (flat form, alternative to `date.start`). */
  start_date?: string;
  /** ISO 8601 end timestamp (flat form, alternative to `date.end`). */
  end_date?: string;
  /** Plain-text or HTML description (flat form, alternative to `body.description`). */
  description?: string;
}

/** Top-level response envelope returned by the SIB-Utrecht events API endpoint. */
export interface ActivityResponse {
  data: {
    /** The list of activity objects returned for the current page/query. */
    events: Activity[];
  };
  /** Optional pagination metadata included when the API returns multiple pages. */
  meta?: {
    /** Total number of activities matching the query across all pages. */
    total: number;
    /** Number of activities included in this response. */
    count: number;
    /** Maximum number of activities returned per page. */
    per_page: number;
    /** The current page number (1-indexed). */
    current_page: number;
    /** Total number of pages available for the current query. */
    total_pages: number;
  };
}
