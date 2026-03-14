/** 認証 Cookie を送る fetch */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = path.startsWith("/") ? path : `/${path}`;
  return fetch(url, { ...init, credentials: "include" });
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
    const message = data.detail ? `${data.error ?? "エラー"}: ${data.detail}` : (data.error ?? `Request failed ${res.status}`);
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}
