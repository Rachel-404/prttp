const API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  "http://localhost:8080/api/v1";

const WS_URL =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_WS_URL) ||
  "ws://localhost:8080/ws";

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

/**
 * Cliente STOMP ligero sobre WebSocket nativo para /ws (/topic/telemetria y /topic/alertas)
 */
export function conectarWebSocket({ onTelemetria, onAlerta }) {
  let ws = null;
  let cerrado = false;
  let reconnectTimer = null;

  const conectar = () => {
    if (cerrado) return;
    try {
      ws = new WebSocket(WS_URL);
    } catch {
      return;
    }

    ws.onopen = () => {
      ws.send("CONNECT\naccept-version:1.2\nheart-beat:0,0\n\n\0");
    };

    ws.onmessage = (evt) => {
      const frames = String(evt.data || "").split("\0");
      frames.forEach((rawFrame) => {
        const frame = rawFrame.trim();
        if (!frame) return;
        if (frame.startsWith("CONNECTED")) {
          ws.send("SUBSCRIBE\nid:sub-telemetria\ndestination:/topic/telemetria\n\n\0");
          ws.send("SUBSCRIBE\nid:sub-alertas\ndestination:/topic/alertas\n\n\0");
          return;
        }
        if (frame.startsWith("MESSAGE")) {
          const splitIdx = frame.indexOf("\n\n");
          if (splitIdx === -1) return;
          const headersPart = frame.slice(0, splitIdx);
          const bodyPart = frame.slice(splitIdx + 2);
          try {
            const payload = JSON.parse(bodyPart);
            if (headersPart.includes("/topic/telemetria") && typeof onTelemetria === "function") {
              onTelemetria(payload);
            } else if (headersPart.includes("/topic/alertas") && typeof onAlerta === "function") {
              onAlerta(payload);
            }
          } catch {
            // Ignorar frames no JSON
          }
        }
      });
    };

    ws.onclose = () => {
      if (!cerrado) {
        reconnectTimer = setTimeout(conectar, 8000);
      }
    };

    ws.onerror = () => {
      // Silencioso si el backend no está levantado aún
    };
  };

  conectar();

  return () => {
    cerrado = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send("DISCONNECT\n\n\0");
      } catch {
        // Ignorar
      }
    }
    if (ws) ws.close();
  };
}

export const AxionApi = {
  API_BASE_URL,
  WS_URL,
  get: apiGet,
  post: apiPost,
  put: apiPut,
  patch: apiPatch,
  download: apiDownload,
  conectarWebSocket
};

window.AxionApi = AxionApi;
