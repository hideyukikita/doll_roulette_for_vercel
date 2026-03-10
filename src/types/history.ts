/** 当選履歴（API レスポンス） */
export interface HistoryRecord {
  id: string;
  doll_id: string;
  selected_at: string;
  doll_name: string;
  doll_color?: string;
  doll_image_url?: string | null;
}
