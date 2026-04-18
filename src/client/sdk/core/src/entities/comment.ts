export interface Comment {
  id: string;
  user_id: string;
  item_id: string;
  rating: number;
  body: string | null;
  created_at: string;
}
