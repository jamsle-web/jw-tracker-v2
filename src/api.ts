
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

const API_BASE = "";

async function request<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
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

    throw new Error(
      `API ${response.status}: ${detail || response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}

// ==========================================
// ADJUNTOS REMOTOS DE DISCURSOS
// ==========================================

interface AdjuntoRemotoInit {
  success: boolean;
  id: string;
  chunkSize: number;
  totalChunks: number;
}

async function obtenerErrorApi(response: Response): Promise<Error> {
  const detail = await response.text().catch(() => "");
  return new Error(
    `API ${response.status}: ${detail || response.statusText}`
  );
}

export async function subirAdjuntoDiscurso(
  id: string,
  file: File
): Promise<void> {
  if (!id || !file.name || file.size <= 0 || file.size > 20 * 1024 * 1024) {
    throw new Error("El archivo o su identificador no son válidos.");
  }

  const init = await request<AdjuntoRemotoInit>("/talk-attachments", {
    method: "POST",
    body: JSON.stringify({
      id,
      name: file.name,
      size: file.size,
    }),
  });

  if (
    !init.success ||
    init.id !== id ||
    !Number.isSafeInteger(init.chunkSize) ||
    init.chunkSize <= 0 ||
    !Number.isSafeInteger(init.totalChunks) ||
    init.totalChunks !== Math.ceil(file.size / init.chunkSize)
  ) {
    throw new Error("El servidor devolvió datos de carga no válidos.");
  }

  for (let index = 0; index < init.totalChunks; index++) {
    const start = index * init.chunkSize;
    const end = Math.min(start + init.chunkSize, file.size);

    const response = await fetch(
      `${API_BASE}/api/talk-attachments/${encodeURIComponent(id)}/chunks/${index}`,
      {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/octet-stream",
        },
        body: file.slice(start, end),
      }
    );

    if (!response.ok) {
      throw await obtenerErrorApi(response);
    }
  }
}

export async function descargarAdjuntoDiscurso(
  id: string
): Promise<Blob> {
  const response = await fetch(
    `${API_BASE}/api/talk-attachments/${encodeURIComponent(id)}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/octet-stream",
      },
    }
  );

  if (!response.ok) {
    throw await obtenerErrorApi(response);
  }

  const blob = await response.blob();

  if (blob.size === 0) {
    throw new Error("El archivo descargado está vacío.");
  }

  return blob;
}

export async function eliminarAdjuntoDiscurso(
  id: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/api/talk-attachments/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok && response.status !== 404) {
    throw await obtenerErrorApi(response);
  }
}

// ==========================================
// INFORMES
// ==========================================

export function obtenerInformes(): Promise<Informe[]> {
  return request<Informe[]>("/informes");
}

export function guardarInforme(
  informe: Informe,
  id?: number
): Promise<{ success: boolean; id: number }> {
  return request<{ success: boolean; id: number }>(
    id ? `/informes/${id}` : "/informes",
    {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(informe),
    }
  );
}

export function eliminarInforme(
  id: number
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/informes/${id}`, {
    method: "DELETE",
  });
}

// ==========================================
// AUTENTICACIÓN
// ==========================================

export async function obtenerUsuarioId(): Promise<string | null> {
  const result = await request<{
    user?: { id?: string };
  } | null>("/auth/get-session");

  return result?.user?.id ?? null;
}

// ==========================================
// SINCRONIZACIÓN DE DATOS DE LA CUENTA
// ==========================================

export async function obtenerDatosCuenta<T>(): Promise<T | null> {
  const result = await request<{ data: T | null }>("/data");

  return result.data;
}

export interface RespuestaGuardarDatos<T> {
  success: boolean;
  data: T;
}

export async function guardarDatosCuenta<
  T extends Record<string, unknown>
>(
  data: T
): Promise<RespuestaGuardarDatos<T>> {
  return request<RespuestaGuardarDatos<T>>("/data", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ==========================================
// BIBLIA
// ==========================================

export interface VersiculoBiblico {
  reference: string;
  text: string;
  translation: "TNM";
  language: "ht";
  sourceUrl: string;
}

export function obtenerVersiculoBiblico(
  reference: string
): Promise<VersiculoBiblico> {
  return request<VersiculoBiblico>(
    `/biblia/versiculo?ref=${encodeURIComponent(reference)}`
  );
}
