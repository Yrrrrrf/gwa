export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Item {
  id: string;
  title: string;
  description: string | null;
  status: string;
  tags: string[];
  coordinates: Coordinates | null;
  rating: number | null;
  comment_count: number | null;
  created_at: string;
  updated_at: string;
}
