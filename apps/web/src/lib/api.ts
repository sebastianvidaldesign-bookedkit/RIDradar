const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

export const fetcher = async <T = any>(path: string): Promise<T> => {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
};
