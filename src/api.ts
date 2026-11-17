
const API_URL: string | undefined = (
  import.meta as ImportMeta & {
    env?: { VITE_API_URL?: string };
  }
).env?.VITE_API_URL?.replace(/\/+$/, "");

export interface Informe {
  id?: number;
  user_id: string;
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
}

/**
 * Producción: utiliza el proxy de Vercel.
 * Desarrollo: conecta directamente con Cloudflare.
 */
function obtenerBaseUrl(): string {
  if (import.meta.env.PROD) {
    return "";
  }

  if (!API_URL) {
    throw new Error("VITE_API_URL no está configurada");
  }

  return API_URL;
}

/**
 * Identificador local temporal para mantener
 * compatibilidad con el frontend existente.
 *
 * La identidad real la determina la sesión del servidor.
 */
export function obtenerUsuarioId(): string {
  const STORAGE_KEY = "jw_tracker_user_id";

  let userId = localStorage.getItem(STORAGE_KEY);

  if (!userId) {
    userId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `user_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 9)}`;

    localStorage.setItem(STORAGE_KEY, userId);
  }

  return userId;
}

/**
 * Obtener informes del usuario autenticado.
 */
export async function obtenerInformes(
  userId: string
): Promise<Informe[]> {
  const respuesta = await fetch(
    `${obtenerBaseUrl()}/api/informes/${encodeURIComponent(userId)}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!respuesta.ok) {
    throw new Error(
      `Error al cargar informes (${respuesta.status})`
    );
  }

  return respuesta.json();
}

/**
 * Guardar informe del usuario autenticado.
 */
export async function guardarInforme(
  informe: Informe
): Promise<Informe> {
  const respuesta = await fetch(
    `${obtenerBaseUrl()}/api/informes`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(informe),
    }
  );

  if (!respuesta.ok) {
    const detalle = await respuesta.text();

    throw new Error(
      `Error al guardar informe (${respuesta.status}): ${detalle}`
    );
  }

  return respuesta.json();
}
