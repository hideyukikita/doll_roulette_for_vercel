/** 認証 Cookie を送る fetch */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = path.startsWith("/") ? path : `/${path}`;
  return fetch(url, { ...init, credentials: "include" });
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Request failed ${res.status}`);
  }
  return res.json() as Promise<T>;
}
