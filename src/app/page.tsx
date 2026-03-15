"use client";

import { useState, useEffect, useRef } from "react";
import { apiJson, apiFetch } from "@/lib/api";
import type { Doll } from "@/types/doll";
import type { HistoryRecord } from "@/types/history";
import { getDollColorStyle } from "@/utils/colors";
import RouletteWheel from "@/components/RouletteWheel";

const RESULT_DISPLAY_MS = 3000;
const SPINNING_MESSAGES = ["誰が出るかな？", "ゆちゅきと寝たいなぁ", "楽しみ！！", "マックのポテト、、、"];
const SPINNING_RARE_PROB = 0.05;
const RESULT_MESSAGES = ["おめでとう！", "今日はパーティー！", "お外連れてって！"];

function pickSpinningMessage(): string {
  return Math.random() < SPINNING_RARE_PROB ? SPINNING_MESSAGES[3] : SPINNING_MESSAGES[Math.floor(Math.random() * 3)];
}
function pickResultMessage(): string {
  return RESULT_MESSAGES[Math.floor(Math.random() * RESULT_MESSAGES.length)];
}

export default function RoulettePage() {
  const [dolls, setDolls] = useState<Doll[]>([]);
  const [histories, setHistories] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Doll | null>(null);
  const [luckySecond, setLuckySecond] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showingResult, setShowingResult] = useState(false);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [wheelDolls, setWheelDolls] = useState<Doll[]>([]);
  const [spinningMessage, setSpinningMessage] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [deletingHistoryId, setDeletingHistoryId] = useState<string | null>(null);
  const [detailHistoryId, setDetailHistoryId] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultRef = useRef<Doll | null>(null);

  const remaining = dolls.filter((d) => !d.is_selected).length;
  const total = dolls.length;
  const unselectedDolls = dolls.filter((d) => !d.is_selected);
  const displayWheelDolls = wheelDolls.length > 0 ? wheelDolls : unselectedDolls;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      apiJson<Doll[]>("/api/dolls"),
      apiJson<HistoryRecord[]>("/api/histories?limit=20"),
    ])
      .then(([list, hist]) => {
        if (!cancelled) {
          setDolls(list);
          setHistories(hist);
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
    return () => {
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    };
  }, []);

  const handleSpin = async () => {
    if (spinning || total === 0) return;
    if (resultTimeoutRef.current) {
      clearTimeout(resultTimeoutRef.current);
      resultTimeoutRef.current = null;
    }
    setError(null);
    setResult(null);
    resultRef.current = null;
    setLuckySecond(false);
    setAllDone(false);
    setShowingResult(false);
    setWinnerId(null);
    setWheelDolls([]);
    setSpinningMessage(pickSpinningMessage());
    setSpinning(true);
    try {
      const res = await apiJson<{ allDone?: true; doll?: Doll; luckySecond?: boolean }>("/api/roulette/spin", { method: "POST" });
      if (res.allDone) {
        setAllDone(true);
        setSpinning(false);
        const [list, hist] = await Promise.all([
          apiJson<Doll[]>("/api/dolls"),
          apiJson<HistoryRecord[]>("/api/histories?limit=20"),
        ]);
        setDolls(list);
        setHistories(hist);
        return;
      }
      if (!res.doll) throw new Error("不正な結果");
      const winner = res.doll;
      const currentWheelDolls = dolls.filter((d) => !d.is_selected);
      setWheelDolls(currentWheelDolls.length > 0 ? currentWheelDolls : [winner]);
      setWinnerId(winner.id);
      setLuckySecond(res.luckySecond === true);
      setResult(winner);
      resultRef.current = winner;
    } catch (e) {
      setError(e instanceof Error ? e.message : "ルーレットに失敗しました");
      setSpinning(false);
    }
  };

  const handleSpinComplete = () => {
    setSpinning(false);
    setResultMessage(pickResultMessage());
    setShowingResult(true);
    Promise.all([
      apiJson<Doll[]>("/api/dolls"),
      apiJson<HistoryRecord[]>("/api/histories?limit=20"),
    ]).then(([list, hist]) => {
      setDolls(list);
      setHistories(hist);
    });
    if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    resultTimeoutRef.current = setTimeout(() => {
      resultTimeoutRef.current = null;
      resultRef.current = null;
      setShowingResult(false);
      setResult(null);
      setLuckySecond(false);
      setWinnerId(null);
      setWheelDolls([]);
    }, RESULT_DISPLAY_MS);
  };

  const handleReset = async () => {
    if (resetting) return;
    if (!window.confirm("全員の選択状態と当選履歴をリセットしますか？\n（全員がまた選ばれるようになります）")) return;
    setResetting(true);
    setError(null);
    setHistories([]);
    setAllDone(false);
    setResult(null);
    resultRef.current = null;
    setLuckySecond(false);
    setShowingResult(false);
    setWinnerId(null);
    setWheelDolls([]);
    try {
      const resetRes = await apiFetch("/api/reset", { method: "POST" });
      const bodyText = await resetRes.text();
      if (!resetRes.ok) {
        let msg = "リセットに失敗しました";
        try {
          const data = JSON.parse(bodyText) as { error?: string };
          if (data.error && data.error.trim()) msg = data.error;
        } catch {
          if (bodyText.trim()) msg = bodyText;
        }
        setError(msg);
        return;
      }
      if (resultTimeoutRef.current) {
        clearTimeout(resultTimeoutRef.current);
        resultTimeoutRef.current = null;
      }
      setDolls((prev) => prev.map((d) => ({ ...d, is_selected: false })));
      const [list, hist] = await Promise.all([
        apiJson<Doll[]>("/api/dolls"),
        apiJson<HistoryRecord[]>("/api/histories?limit=20"),
      ]);
      setDolls(list);
      setHistories(hist);
    } catch (e) {
      setError(e instanceof Error ? e.message : "リセットに失敗しました");
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteHistory = async (id: string) => {
    if (!window.confirm("この当選結果を削除しますか？\n（その子はルーレットに戻ります）")) return;
    setDeletingHistoryId(id);
    setError(null);
    try {
      await apiJson(`/api/histories/${id}`, { method: "DELETE" });
      const [list, hist] = await Promise.all([
        apiJson<Doll[]>("/api/dolls"),
        apiJson<HistoryRecord[]>("/api/histories?limit=20"),
      ]);
      setDolls(list);
      setHistories(hist);
    } catch (e) {
      setError(e instanceof Error ? e.message : "履歴の削除に失敗しました");
    } finally {
      setDeletingHistoryId(null);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
        <p className="text-stone-500">読み込み中…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-center text-2xl font-bold text-stone-700">かぞくたちルーレット</h1>
        <section className="mb-6 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-lg text-stone-600">
              残り <span className="font-bold text-violet-500">{remaining}</span> 人 / 全 <span className="font-bold text-stone-700">{total}</span> 人
            </p>
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting || spinning || total === 0}
              className="rounded-md bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-600 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2"
            >
              {resetting ? "リセット中…" : "リセット"}
            </button>
          </div>
        </section>
        <section className="mb-6 rounded-lg border border-stone-200 bg-white p-8 shadow-sm">
          {error && (
            <p className="mb-4 text-center text-sm text-rose-500" role="alert">
              {error}
            </p>
          )}
          {total === 0 ? (
            <p className="py-8 text-center text-stone-500">かぞくを登録してね</p>
          ) : remaining === 0 && !showingResult ? (
            <p className="py-8 text-center text-stone-500">全員一周したよ！リセットしてね</p>
          ) : (
            <>
              <div className="mb-6 flex min-h-[320px] flex-col items-center justify-center">
                {(showingResult || (result && !spinning)) && (result || resultRef.current) ? (
                  <div className="text-center">
                    {(() => {
                      const displayResult = result || resultRef.current;
                      if (!displayResult) return null;
                      return luckySecond ? (
                        <div
                          className="inline-block rounded-2xl border-4 border-amber-300 bg-amber-50 px-6 py-4 animate-pulse"
                          style={{ boxShadow: "0 0 20px rgba(253, 230, 138, 0.5)" }}
                        >
                          <p className="mb-1 text-2xl font-black text-amber-600">二回目！</p>
                          <div className="flex flex-wrap items-center justify-center gap-3">
                            {displayResult.image_url && (
                              <img src={displayResult.image_url} alt={displayResult.name} className="h-24 w-24 rounded object-cover" />
                            )}
                            <p className="inline-block rounded px-3 py-1 text-xl font-bold" style={getDollColorStyle(displayResult.color)}>
                              当選: {displayResult.name}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-center gap-3">
                          {displayResult.image_url && (
                            <img src={displayResult.image_url} alt={displayResult.name} className="h-24 w-24 rounded object-cover" />
                          )}
                          <p className="inline-block rounded px-3 py-1 text-2xl font-bold" style={getDollColorStyle(displayResult.color)}>
                            当選: {displayResult.name}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                ) : allDone ? (
                  <p className="text-2xl font-bold text-amber-600">全員一周したよ！</p>
                ) : (
                  <RouletteWheel
                    key={displayWheelDolls.map((d) => d.id).join(",")}
                    dolls={displayWheelDolls}
                    winnerId={spinning ? winnerId : null}
                    spinning={spinning}
                    onSpinComplete={handleSpinComplete}
                  />
                )}
              </div>
              {remaining > 0 && (
                <button
                  type="button"
                  onClick={handleSpin}
                  disabled={spinning || showingResult}
                  className="w-full rounded-md bg-violet-500 px-4 py-3 text-lg font-medium text-white hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:ring-offset-2"
                >
                  {spinning ? spinningMessage || "誰が出るかな？" : showingResult ? resultMessage || "おめでとう！" : "ルーレットを回す"}
                </button>
              )}
            </>
          )}
        </section>
        <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-stone-600">当選履歴</h2>
          {histories.length === 0 ? (
            <p className="text-stone-500">まだ当選履歴はありません。</p>
          ) : (
            <ul className="space-y-2">
              {histories.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => setDetailHistoryId(h.id)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-left text-sm text-stone-600 hover:bg-stone-100"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {h.doll_image_url && (
                        <img src={h.doll_image_url} alt={h.doll_name} className="h-8 w-8 flex-shrink-0 rounded object-cover" />
                      )}
                      <span className="inline-block rounded px-2 py-0.5 font-medium" style={getDollColorStyle(h.doll_color ?? "")}>
                        {h.doll_name}
                      </span>
                    </div>
                    <span className="flex-shrink-0 text-stone-500">{formatDate(h.selected_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {detailHistoryId && (() => {
          const h = histories.find((x) => x.id === detailHistoryId);
          if (!h) return null;
          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="history-detail-title"
              onClick={(e) => e.target === e.currentTarget && setDetailHistoryId(null)}
            >
              <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h2 id="history-detail-title" className="sr-only">
                  {h.doll_name}の当選詳細
                </h2>
                <div className="p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <p className="inline-block rounded px-2 py-1 text-xl font-semibold" style={getDollColorStyle(h.doll_color ?? "")}>
                        {h.doll_name}
                      </p>
                      <p className="mt-1 text-stone-500">{formatDate(h.selected_at)}</p>
                    </div>
                    <button type="button" onClick={() => setDetailHistoryId(null)} className="p-1 text-stone-400 hover:text-stone-600" aria-label="閉じる">
                      ×
                    </button>
                  </div>
                  {h.doll_image_url ? (
                    <button
                      type="button"
                      onClick={() => setSelectedImageUrl(h.doll_image_url ?? null)}
                      className="block w-full rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2"
                    >
                      <img src={h.doll_image_url} alt={h.doll_name} className="max-h-64 w-full rounded-lg object-contain" />
                    </button>
                  ) : (
                    <div className="flex h-40 w-full items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-400">
                      画像なし
                    </div>
                  )}
                </div>
                <div className="flex gap-2 border-t border-stone-100 p-6 pt-0">
                  <button
                    type="button"
                    onClick={async () => {
                      await handleDeleteHistory(h.id);
                      setDetailHistoryId(null);
                    }}
                    disabled={deletingHistoryId === h.id}
                    className="rounded-md bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:ring-offset-2"
                  >
                    {deletingHistoryId === h.id ? "削除中…" : "削除"}
                  </button>
                  <button type="button" onClick={() => setDetailHistoryId(null)} className="rounded-md bg-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2">
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {selectedImageUrl && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="画像を拡大表示" onClick={() => setSelectedImageUrl(null)}>
            <button type="button" onClick={() => setSelectedImageUrl(null)} className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-stone-600 hover:bg-white" aria-label="閉じる">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img src={selectedImageUrl} alt="拡大表示" className="max-h-[90vh] w-auto max-w-full rounded object-contain" onClick={(e) => e.stopPropagation()} />
          </div>
        )}
      </div>
    </div>
  );
}
