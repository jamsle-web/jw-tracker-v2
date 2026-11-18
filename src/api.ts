export interface Informe {
  id?: number;
  user_id?: string;
  fecha: string;
  horas: number;
  minutos: number;
  credit_hours: number;
  credit_minutes: number;
  cursos_biblicos: number;
  participo: boolean | number;
  studies: number;
  publications: number;
  videos: number;
  notas?: string;
  location?: string;
  companion?: string;
  created_at?: string;
}

const API_BASE = import.meta.env.PROD
  ? ""
  : (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!import.meta.env.PROD && !API_BASE) {
    throw new Error("Falta VITE_API_URL en .env.local para conectar con Cloudflare.");
  }

  const response = await fetch(`${API_BASE}/api${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`API ${response.status}: ${detail || response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export function obtenerInformes(): Promise<Informe[]> {
  return request<Informe[]>("/informes");
}

export function guardarInforme(informe: Informe, id?: number): Promise<{ success: boolean; id: number }> {
  return request<{ success: boolean; id: number }>(id ? `/informes/${id}` : "/informes", {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(informe),
  });
}

export function eliminarInforme(id: number): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/informes/${id}`, { method: "DELETE" });
}

export async function obtenerUsuarioId(): Promise<string | null> {
  const result = await request<{ user?: { id?: string } } | null>("/auth/get-session");
  return result?.user?.id ?? null;
}
