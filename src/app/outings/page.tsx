"use client";

import { useState, useEffect, useCallback } from "react";
import { apiJson } from "@/lib/api";
import type { OutingRecord } from "@/types/outing";
import type { Doll } from "@/types/doll";
import { getDollColorStyle } from "@/utils/colors";

function formatDateOnly(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}
function toDateInputValue(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function OutingsPage() {
  const [outings, setOutings] = useState<OutingRecord[]>([]);
  const [dolls, setDolls] = useState<Doll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OutingRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formPlace, setFormPlace] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formComment, setFormComment] = useState("");
  const [formDollIds, setFormDollIds] = useState<string[]>([]);
  const [formImageFiles, setFormImageFiles] = useState<File[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [listVersion, setListVersion] = useState(0);

  const fetchOutings = useCallback(async () => {
    try {
      const list = await apiJson<OutingRecord[]>("/api/outings");
      setOutings(list);
      setListVersion((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "一覧の取得に失敗しました");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([apiJson<OutingRecord[]>("/api/outings").catch(() => []), apiJson<Doll[]>("/api/dolls")])
      .then(([list, dollList]) => {
        if (!cancelled) {
          setOutings(Array.isArray(list) ? list : []);
          setDolls(dollList);
          setListVersion((v) => v + 1);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "読み込みに失敗しました");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!detailId) {
      setDetail(null);
      return;
    }
    apiJson<OutingRecord>(`/api/outings/${detailId}`).then(setDetail).catch(() => setDetail(null));
  }, [detailId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const place = formPlace.trim();
    const date = formDate.trim();
    if (!place || !date) return;
    setSubmitting(true);
    setError(null);
    try {
      if (editingId) {
        await apiJson(`/api/outings/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ place, outing_date: `${date}T00:00:00.000Z`, comment: formComment.trim() || undefined, doll_ids: formDollIds }),
        });
        if (detailId === editingId) {
          const updated = await apiJson<OutingRecord>(`/api/outings/${editingId}`);
          if (updated) setDetail(updated);
        }
        if (formImageFiles.length > 0) {
          try {
            const fd = new FormData();
            formImageFiles.forEach((f) => fd.append("images", f));
            await apiJson(`/api/outings/${editingId}/images`, { method: "POST", body: fd });
            if (detailId === editingId) {
              const updated = await apiJson<OutingRecord>(`/api/outings/${editingId}`);
              if (updated) setDetail(updated);
            }
          } catch (imgErr) {
            setError(imgErr instanceof Error ? imgErr.message : "画像のアップロードに失敗しました");
          }
        }
        setEditingId(null);
        setFormPlace("");
        setFormDate("");
        setFormComment("");
        setFormDollIds([]);
        setFormImageFiles([]);
        setShowForm(false);
        await fetchOutings();
      } else {
        const outing = await apiJson<OutingRecord>("/api/outings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ place, outing_date: `${date}T00:00:00.000Z`, comment: formComment.trim() || undefined, doll_ids: formDollIds }),
        });
        setFormPlace("");
        setFormDate("");
        setFormComment("");
        setFormDollIds([]);
        setFormImageFiles([]);
        setShowForm(false);
        if (formImageFiles.length > 0) {
          try {
            const fd = new FormData();
            formImageFiles.forEach((f) => fd.append("images", f));
            await apiJson(`/api/outings/${outing.id}/images`, { method: "POST", body: fd });
          } catch (imgErr) {
            setError(imgErr instanceof Error ? imgErr.message : "画像のアップロードに失敗しました");
          }
        }
        await fetchOutings();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : editingId ? "更新に失敗しました" : "登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = () => {
    if (!detail) return;
    setFormPlace(detail.place);
    setFormDate(toDateInputValue(detail.outing_date));
    setFormComment(detail.comment ?? "");
    setFormDollIds(detail.doll_ids ?? []);
    setFormImageFiles([]);
    setEditingId(detail.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
  };

  const handleDelete = async () => {
    if (!detailId || !detail) return;
    if (!window.confirm(`「${detail.place}」のお出かけ日記を削除しますか？`)) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiJson(`/api/outings/${detailId}`, { method: "DELETE" });
      setDetailId(null);
      setDetail(null);
      await fetchOutings();
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDoll = (id: string) => {
    setFormDollIds((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  };

  const handleDeleteOutingImage = async (imageUrl: string) => {
    if (!editingId) return;
    if (!window.confirm("この画像を削除しますか？")) return;
    setError(null);
    try {
      const updated = await apiJson<OutingRecord>(`/api/outings/${editingId}/images/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: imageUrl }),
      });
      if (detailId === editingId) setDetail(updated);
      await fetchOutings();
    } catch (e) {
      setError(e instanceof Error ? e.message : "画像の削除に失敗しました");
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-center text-2xl font-bold text-stone-700">お出かけ日記</h1>
        {error && (
          <p className="mb-4 text-center text-sm text-rose-500" role="alert">{error}</p>
        )}

        {showForm ? (
          <section className="mb-6 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-stone-600">{editingId ? "お出かけ日記を編集" : "新しいお出かけを登録"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-600">場所</label>
                <input type="text" value={formPlace} onChange={(e) => setFormPlace(e.target.value)} placeholder="例: 近所の公園" className="w-full rounded-md border border-stone-300 px-3 py-2 text-stone-800" required disabled={submitting} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-600">日付</label>
                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full rounded-md border border-stone-300 px-3 py-2 text-stone-800" required disabled={submitting} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-600">どの家族と（複数可）</label>
                <div className="flex flex-wrap gap-2">
                  {dolls.map((d) => (
                    <label key={d.id} className="inline-flex cursor-pointer items-center gap-1">
                      <input type="checkbox" checked={formDollIds.includes(d.id)} onChange={() => toggleDoll(d.id)} disabled={submitting} className="rounded border-stone-300" />
                      <span className="text-sm" style={getDollColorStyle(d.color)}>{d.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-600">{editingId ? "写真（追加・削除）" : "写真（任意・複数可）"}</label>
                {editingId && detail && detailId === editingId && (detail.image_urls?.length ?? 0) > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {(detail.image_urls ?? []).map((url) => (
                      <div key={url} className="relative group">
                        <img src={url} alt="" className="h-20 w-20 rounded border border-stone-200 object-cover" />
                        <button type="button" onClick={() => handleDeleteOutingImage(url)} disabled={submitting} className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-sm leading-none text-white hover:bg-rose-600 disabled:opacity-50" aria-label="この写真を削除">×</button>
                      </div>
                    ))}
                  </div>
                )}
                <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple onChange={(e) => setFormImageFiles(e.target.files ? Array.from(e.target.files) : [])} className="file:mr-4 file:rounded file:border-0 file:bg-violet-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-violet-600 w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-600" disabled={submitting} />
                {formImageFiles.length > 0 && <p className="mt-1 text-xs text-stone-500">{formImageFiles.length}枚追加予定</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-600">コメント（任意）</label>
                <textarea value={formComment} onChange={(e) => setFormComment(e.target.value)} placeholder="思い出メモ" rows={3} className="w-full rounded-md border border-stone-300 px-3 py-2 text-stone-800" disabled={submitting} />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={submitting} className="rounded-md bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50">{submitting ? (editingId ? "更新中…" : "登録中…") : editingId ? "更新する" : "登録する"}</button>
                <button type="button" onClick={cancelEdit} disabled={submitting} className="rounded-md bg-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-300">キャンセル</button>
              </div>
            </form>
          </section>
        ) : (
          <div className="mb-6">
            <button type="button" onClick={() => { setEditingId(null); setFormPlace(""); setFormDate(""); setFormComment(""); setFormDollIds([]); setFormImageFiles([]); setShowForm(true); }} className="rounded-md bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600">
              新しいお出かけを登録
            </button>
          </div>
        )}

        {detailId && detail ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="outing-detail-title" onClick={(e) => e.target === e.currentTarget && (editingId === detailId ? cancelEdit() : setDetailId(null))}>
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
              {editingId === detailId ? (
                <div className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 id="outing-detail-title" className="text-lg font-semibold text-stone-700">編集</h2>
                    <button type="button" onClick={cancelEdit} disabled={submitting} className="p-1 text-stone-400 hover:text-stone-600" aria-label="キャンセル">×</button>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-stone-600">場所</label>
                      <input type="text" value={formPlace} onChange={(e) => setFormPlace(e.target.value)} placeholder="例: 近所の公園" className="w-full rounded-md border border-stone-300 px-3 py-2 text-stone-800" required disabled={submitting} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-stone-600">日付</label>
                      <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full rounded-md border border-stone-300 px-3 py-2 text-stone-800" required disabled={submitting} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-stone-600">どの家族と（複数可）</label>
                      <div className="flex flex-wrap gap-2">
                        {dolls.map((d) => (
                          <label key={d.id} className="inline-flex cursor-pointer items-center gap-1">
                            <input type="checkbox" checked={formDollIds.includes(d.id)} onChange={() => toggleDoll(d.id)} disabled={submitting} className="rounded border-stone-300" />
                            <span className="text-sm" style={getDollColorStyle(d.color)}>{d.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-stone-600">写真（追加・削除）</label>
                      {detail.image_urls && detail.image_urls.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {detail.image_urls.map((url) => (
                            <div key={url} className="relative group">
                              <img src={url} alt="" className="h-20 w-20 rounded border border-stone-200 object-cover" />
                              <button type="button" onClick={() => handleDeleteOutingImage(url)} disabled={submitting} className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-sm leading-none text-white hover:bg-rose-600 disabled:opacity-50" aria-label="この写真を削除">×</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple onChange={(e) => setFormImageFiles(e.target.files ? Array.from(e.target.files) : [])} className="file:mr-4 file:rounded file:border-0 file:bg-violet-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-violet-600 w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-600" disabled={submitting} />
                      {formImageFiles.length > 0 && <p className="mt-1 text-xs text-stone-500">{formImageFiles.length}枚追加予定</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-stone-600">コメント（任意）</label>
                      <textarea value={formComment} onChange={(e) => setFormComment(e.target.value)} placeholder="思い出メモ" rows={3} className="w-full rounded-md border border-stone-300 px-3 py-2 text-stone-800" disabled={submitting} />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={submitting} className="rounded-md bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50">更新する</button>
                      <button type="button" onClick={cancelEdit} disabled={submitting} className="rounded-md bg-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-300">キャンセル</button>
                    </div>
                  </form>
                </div>
              ) : (
                <>
                  <div className="p-6">
                    <div className="mb-4 flex items-start justify-between">
                      <h2 id="outing-detail-title" className="text-xl font-bold text-stone-700">{detail.place}</h2>
                      <button type="button" onClick={() => setDetailId(null)} className="p-1 text-stone-400 hover:text-stone-600" aria-label="閉じる">×</button>
                    </div>
                    <p className="mb-4 text-stone-500">{formatDateOnly(detail.outing_date)}</p>
                    {detail.dolls && detail.dolls.length > 0 && (
                      <p className="mb-4 text-sm text-stone-600">
                        一緒に: {detail.dolls.map((d, i) => (
                          <span key={d.id}>{i > 0 && "、"}<span style={getDollColorStyle(d.color)}>{d.name}</span></span>
                        ))}
                      </p>
                    )}
                    {detail.comment && <p className="mb-4 whitespace-pre-wrap text-stone-700">{detail.comment}</p>}
                    {(detail.image_urls?.length ?? 0) > 0 && (
                      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {(detail.image_urls ?? []).map((url, i) => (
                          <button key={i} type="button" onClick={() => setSelectedImageUrl(url)} className="block w-full overflow-hidden rounded-lg aspect-square focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2">
                            <img src={url} alt={`${detail.place} ${i + 1}`} className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 border-t border-stone-100 p-6 pt-0">
                    <button type="button" onClick={startEdit} className="flex-1 rounded-md bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:ring-offset-2">編集</button>
                    <button type="button" onClick={handleDelete} disabled={submitting} className="rounded-md bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:ring-offset-2">削除</button>
                    <button type="button" onClick={() => setDetailId(null)} className="rounded-md bg-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2">閉じる</button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}

        {selectedImageUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="画像を拡大表示" onClick={() => setSelectedImageUrl(null)}>
            <button type="button" onClick={() => setSelectedImageUrl(null)} className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-stone-600 hover:bg-white" aria-label="閉じる">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <img src={selectedImageUrl} alt="拡大表示" className="max-h-[90vh] w-auto max-w-full rounded object-contain" onClick={(e) => e.stopPropagation()} />
          </div>
        )}

        <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-stone-600">一覧</h2>
          {loading ? (
            <p className="text-stone-500">読み込み中…</p>
          ) : outings.length === 0 ? (
            <p className="text-stone-500">まだお出かけ日記はありません。</p>
          ) : (
            <ul className="space-y-3">
              {outings.map((o) => (
                <li
                  key={o.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetailId(o.id)}
                  onKeyDown={(e) => e.key === "Enter" && setDetailId(o.id)}
                  className="cursor-pointer rounded-lg border border-stone-200 bg-stone-50 p-4 hover:bg-stone-100"
                >
                  <div className="flex items-center gap-3">
                    {(o.image_urls?.length ?? 0) > 0 && (
                      <img src={`${o.image_urls[0]}?v=${listVersion}`} alt="" className="h-14 w-14 flex-shrink-0 rounded object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-stone-700">{o.place}</p>
                      <p className="text-sm text-stone-500">{formatDateOnly(o.outing_date)}</p>
                      {o.comment && <p className="mt-1 truncate text-sm text-stone-600">{o.comment}</p>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
