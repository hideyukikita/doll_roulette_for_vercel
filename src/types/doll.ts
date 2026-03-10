/** かぞく（API レスポンス） */
export interface Doll {
  id: string;
  name: string;
  color: string;
  image_url: string | null;
  is_selected: boolean;
  created_at: string;
  image_urls?: string[];
}

export interface CreateDollBody {
  name: string;
  color: string;
}
