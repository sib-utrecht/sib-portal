export interface Activity {
  id: number;
  name: string | { long: string };
  body?: {
    image?: string;
    description?: string | { html: string };
  };
  date: { start: string; end: string };
  signup_start?: string | null;
  signup_end?: string | null;
  location?: string;
  max_participants?: number | null;
  current_participants?: number;
  price?: number;
  image_url?: string | null;
  category?: string;
  organizer?: string;
  is_signup_open?: boolean;
  is_full?: boolean;
  created_at?: string;
  updated_at?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
}

export interface ActivityResponse {
  data: {
    events: Activity[];
  };
  meta?: {
    total: number;
    count: number;
    per_page: number;
    current_page: number;
    total_pages: number;
  };
}
