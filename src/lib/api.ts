export const SIDECAR_URL = "http://localhost:8787";

export async function apiGet<T>(pathname: string): Promise<T> {
  const res = await fetch(`${SIDECAR_URL}${pathname}`);
  if (!res.ok) throw new Error(`GET ${pathname} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiPostJson<T>(pathname: string, body: unknown): Promise<T> {
  const res = await fetch(`${SIDECAR_URL}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `POST ${pathname} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}
