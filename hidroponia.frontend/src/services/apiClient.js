const API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  "http://localhost:8080/api/v1";

const CLAVE_SESION_ADMIN = "axion_sesion_activa";

function obtenerTokenJwt() {
  try {
    const raw =
      localStorage.getItem(CLAVE_SESION_ADMIN) ||
      sessionStorage.getItem(CLAVE_SESION_ADMIN);
    if (!raw) return null;
    const datos = JSON.parse(raw);
    return datos && datos.token ? datos.token : null;
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  const token = obtenerTokenJwt();
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  let resp;
  try {
    resp = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers
    });
  } catch (err) {
    const netErr = new Error("Backend no disponible");
    netErr.isNetworkError = true;
    netErr.cause = err;
    throw netErr;
  }

  if (!resp.ok) {
    let msg = `Error HTTP ${resp.status}`;
    try {
      const errBody = await resp.json();
      if (errBody && (errBody.error || errBody.message)) {
        msg = errBody.error || errBody.message;
      }
    } catch {
      // Ignorar cuerpo no JSON
    }
    const apiErr = new Error(msg);
    apiErr.status = resp.status;
    throw apiErr;
  }

  if (options.rawResponse) return resp;
  const contentType = resp.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return resp.json();
  }
  return resp.text();
}

export const apiGet = (path) => request(path, { method: "GET" });
export const apiPost = (path, body) =>
  request(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined });
export const apiPut = (path, body) =>
  request(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined });
export const apiPatch = (path, body) =>
  request(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined });

export async function apiDownload(path, filename) {
  const resp = await request(path, { method: "GET", rawResponse: true });
  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const AxionApi = {
  API_BASE_URL,
  get: apiGet,
  post: apiPost,
  put: apiPut,
  patch: apiPatch,
  download: apiDownload
};

window.AxionApi = AxionApi;
