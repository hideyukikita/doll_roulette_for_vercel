/** お出かけ日記（API レスポンス） */
export interface OutingRecord {
  id: string;
  place: string;
  outing_date: string;
  comment: string | null;
  image_url: string | null;
  created_at: string;
  doll_ids: string[];
  image_urls: string[];
  dolls?: { id: string; name: string; color: string; image_url: string | null }[];
}

export interface CreateOutingBody {
  place: string;
  outing_date: string;
  comment?: string;
  doll_ids: string[];
}
