"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch, apiJson } from "@/lib/api";
import type { Doll } from "@/types/doll";
import { getDollColorStyle } from "@/utils/colors";

const COLOR_OPTIONS: { value: string; label: string }[] = [
  { value: "茶色", label: "茶色" },
  { value: "白", label: "白" },
  { value: "ピンク", label: "ピンク" },
  { value: "グレー", label: "グレー" },
  { value: "青", label: "青" },
  { value: "緑", label: "緑" },
  { value: "黄", label: "黄" },
  { value: "黒", label: "黒" },
  { value: "オレンジ", label: "オレンジ" },
  { value: "えんじ", label: "えんじ" },
  { value: "水色", label: "水色" },
  { value: "ミント", label: "ミント" },
  { value: "紫", label: "紫" },
  { value: "赤", label: "赤" },
  { value: "その他", label: "その他" },
];
const DEFAULT_COLOR = COLOR_OPTIONS[0]?.value ?? "その他";

export default function DollsPage() {
  const [dolls, setDolls] = useState<Doll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(DEFAULT_COLOR);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImageFiles, setEditImageFiles] = useState<File[]>([]);
  const [editImageInputKey, setEditImageInputKey] = useState(0);
  const [listVersion, setListVersion] = useState(0);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const fetchDolls = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await apiJson<Doll[]>("/api/dolls");
      setDolls(list);
      setListVersion((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDolls();
  }, [fetchDolls]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setSubmitting(true);
    setError(null);
    try {
      const doll = await apiJson<Doll>("/api/dolls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, color }),
      });
      if (imageFile) {
        const fd = new FormData();
        fd.append("image", imageFile);
        await apiFetch(`/api/dolls/${doll.id}/image`, { method: "POST", body: fd });
      }
      setName("");
      setColor(DEFAULT_COLOR);
      setImageFile(null);
      await fetchDolls();
    } catch (e) {
      setError(e instanceof Error ? e.message : "登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditStart = (doll: Doll) => {
    setEditingId(doll.id);
    setEditName(doll.name);
    setEditColor(doll.color);
    setEditImageFile(null);
    setEditImageFiles([]);
    setEditImageInputKey((k) => k + 1);
    setError(null);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditName("");
    setEditColor(DEFAULT_COLOR);
    setEditImageFile(null);
    setEditImageFiles([]);
  };

  const handleEditSave = async (id: string) => {
    const trimmedName = editName.trim();
    if (!trimmedName) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiJson(`/api/dolls/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, color: editColor }),
      });
      if (editImageFile) {
        const fd = new FormData();
        fd.append("image", editImageFile);
        await apiFetch(`/api/dolls/${id}/image`, { method: "POST", body: fd });
      }
      if (editImageFiles.length > 0) {
        const fd = new FormData();
        editImageFiles.forEach((f) => fd.append("images", f));
        await apiFetch(`/api/dolls/${id}/images`, { method: "POST", body: fd });
      }
      setEditingId(null);
      setEditName("");
      setEditColor(DEFAULT_COLOR);
      setEditImageFile(null);
      setEditImageFiles([]);
      await fetchDolls();
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDollImage = async (dollId: string, imageUrl: string) => {
    if (!window.confirm("この画像を削除しますか？")) return;
    setError(null);
    try {
      await apiJson(`/api/dolls/${dollId}/images/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: imageUrl }),
      });
      await fetchDolls();
    } catch (e) {
      setError(e instanceof Error ? e.message : "画像の削除に失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("この子を削除しますか？")) return;
    setDeletingId(id);
    setError(null);
    try {
      await apiFetch(`/api/dolls/${id}`, { method: "DELETE" });
      await fetchDolls();
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  };

  const representativeUrl = (d: Doll) => d.image_url ?? d.image_urls?.[0];
  const subUrls = (d: Doll) => (d.image_url ? (d.image_urls ?? []).filter((u) => u !== d.image_url) : (d.image_urls?.slice(1) ?? []));

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <section className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-stone-600">新しい子を追加</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-stone-600">名前</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: くまさん"
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-stone-800 placeholder-stone-400 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                maxLength={255}
                disabled={submitting}
              />
            </div>
            <div>
              <label htmlFor="color" className="mb-1 block text-sm font-medium text-stone-600">色</label>
              <select
                id="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-stone-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                disabled={submitting}
              >
                {COLOR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="image" className="mb-1 block text-sm font-medium text-stone-600">画像（任意）</label>
              <input
                id="image"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="file:mr-4 file:rounded file:border-0 file:bg-violet-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-violet-600 hover:file:bg-violet-100 w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-600"
                disabled={submitting}
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="w-full rounded-md bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "登録中…" : "追加する"}
            </button>
          </form>
        </section>

        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-stone-600">登録済みのかぞくたち</h2>
          {error && (
            <p className="mb-4 text-sm text-rose-500" role="alert">{error}</p>
          )}
          {loading ? (
            <p className="text-stone-500">読み込み中…</p>
          ) : dolls.length === 0 ? (
            <p className="text-stone-500">まだ登録されていません。上のフォームから追加してください。</p>
          ) : (
            <ul className="space-y-3">
              {dolls.map((doll) => (
                <li key={doll.id} className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setDetailId(doll.id)}
                    className="flex w-full min-w-0 items-center gap-3 text-left transition-colors hover:rounded hover:bg-stone-100"
                  >
                    {representativeUrl(doll) && (
                      <img src={`${representativeUrl(doll)}?v=${listVersion}`} alt={doll.name} className="h-10 w-10 flex-shrink-0 rounded object-cover" />
                    )}
                    <span className="font-medium text-stone-700">
                      {doll.name}
                      <span className="ml-2 text-sm font-normal text-stone-500">（{doll.color}）</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {detailId && (() => {
          const doll = dolls.find((d) => d.id === detailId);
          if (!doll) return null;
          const repUrl = representativeUrl(doll);
          const subs = subUrls(doll);
          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="detail-title"
              onClick={(e) => e.target === e.currentTarget && setDetailId(null)}
            >
              <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h2 id="detail-title" className="sr-only">{doll.name}の詳細</h2>
                {editingId === detailId ? (
                  <div className="space-y-4 p-6">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-stone-700">編集</span>
                      <button type="button" onClick={handleEditCancel} disabled={submitting} className="text-stone-400 hover:text-stone-600" aria-label="キャンセル">×</button>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-stone-500">名前</label>
                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full rounded-md border border-stone-300 px-3 py-2 text-stone-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300" maxLength={255} disabled={submitting} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-stone-500">色</label>
                      <select value={editColor} onChange={(e) => setEditColor(e.target.value)} className="w-full rounded-md border border-stone-300 px-3 py-2 text-stone-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300" disabled={submitting}>
                        {COLOR_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-stone-500">代表画像（1枚）</label>
                      {repUrl && (
                        <div className="mb-2 flex flex-wrap gap-2">
                          <div className="relative group">
                            <img src={repUrl} alt="代表" className="h-16 w-16 rounded border border-stone-200 object-cover" />
                            <button type="button" onClick={() => handleDeleteDollImage(doll.id, repUrl)} disabled={submitting} className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs leading-none text-white hover:bg-rose-600 disabled:opacity-50" aria-label="代表画像を削除">×</button>
                          </div>
                        </div>
                      )}
                      <input key={`edit-image-${doll.id}-${editImageInputKey}`} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(e) => setEditImageFile(e.target.files?.[0] ?? null)} className="mb-4 w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-600 file:mr-4 file:rounded file:border-0 file:bg-violet-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-violet-600" disabled={submitting} />
                      <label className="mb-1 block text-xs font-medium text-stone-500">サブ画像（複数）</label>
                      {subs.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-2">
                          {subs.map((url) => (
                            <div key={url} className="relative group">
                              <img src={url} alt="" className="h-16 w-16 rounded border border-stone-200 object-cover" />
                              <button type="button" onClick={() => handleDeleteDollImage(doll.id, url)} disabled={submitting} className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs leading-none text-white hover:bg-rose-600 disabled:opacity-50" aria-label="このサブ画像を削除">×</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple onChange={(e) => setEditImageFiles(e.target.files ? Array.from(e.target.files) : [])} className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-600 file:mr-4 file:rounded file:border-0 file:bg-violet-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-violet-600" disabled={submitting} />
                      {editImageFiles.length > 0 && <p className="mt-1 text-xs text-stone-500">{editImageFiles.length}枚追加予定</p>}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleEditSave(doll.id)} disabled={submitting || !editName.trim()} className="rounded-md bg-violet-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:ring-offset-2 disabled:opacity-50">{submitting ? "保存中…" : "保存"}</button>
                      <button type="button" onClick={handleEditCancel} disabled={submitting} className="rounded-md bg-stone-200 px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2 disabled:opacity-50">キャンセル</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-6">
                      <div className="mb-4 flex items-start justify-between">
                        <div>
                          <p className="text-xl font-semibold text-stone-800">{doll.name}</p>
                          <p className="text-stone-500">{doll.color}</p>
                        </div>
                        <button type="button" onClick={() => setDetailId(null)} className="p-1 text-stone-400 hover:text-stone-600" aria-label="閉じる">×</button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="mb-2 text-xs font-medium text-stone-500">代表画像</p>
                          {repUrl ? (
                            <button type="button" onClick={() => setSelectedImageUrl(repUrl)} className="block w-full rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2">
                              <img src={repUrl} alt={`${doll.name}の代表画像`} className="max-h-48 w-full rounded-lg object-contain" />
                            </button>
                          ) : (
                            <div className="flex h-32 w-full items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-400">画像なし</div>
                          )}
                        </div>
                        <div>
                          <p className="mb-2 text-xs font-medium text-stone-500">サブ画像</p>
                          {subs.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {subs.map((url) => (
                                <button key={url} type="button" onClick={() => setSelectedImageUrl(url)} className="rounded border border-stone-200 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2">
                                  <img src={url} alt="" className="h-20 w-20 rounded object-cover" />
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-stone-400">サブ画像はありません</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 border-t border-stone-100 p-6 pt-0">
                      <button type="button" onClick={() => handleEditStart(doll)} className="flex-1 rounded-md bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:ring-offset-2">編集</button>
                      <button type="button" onClick={async () => { await handleDelete(doll.id); setDetailId(null); }} disabled={deletingId === doll.id} className="rounded-md bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:ring-offset-2 disabled:opacity-50">{deletingId === doll.id ? "削除中…" : "削除"}</button>
                      <button type="button" onClick={() => setDetailId(null)} className="rounded-md bg-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2">閉じる</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {selectedImageUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="画像を拡大表示" onClick={() => setSelectedImageUrl(null)}>
            <button type="button" onClick={() => setSelectedImageUrl(null)} className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-stone-600 hover:bg-white" aria-label="閉じる">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <img src={selectedImageUrl} alt="拡大表示" className="max-h-[90vh] w-auto max-w-full rounded object-contain" onClick={(e) => e.stopPropagation()} />
          </div>
        )}
      </div>
    </div>
  );
}
