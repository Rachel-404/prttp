import React, { createContext, useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../services/axionCache.js";
import { apiGet, apiPost } from "../services/apiClient.js";

const CLAVE_TEMA = "axion_tema";
const CLAVE_TIPOGRAFIA = "axion_tipografia";
const CLAVE_SESION_ADMIN = "axion_sesion_activa";

const AxionContext = createContext(null);

function resolverTemaClaro(modo) {
  if (modo === "sistema") {
    return Boolean(window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches);
  }
  return modo === "claro";
}

function tokenJwtExpirado(token) {
  if (!token || typeof token !== "string") return false;
  try {
    const partes = token.split(".");
    if (partes.length !== 3) return false;
    const base64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
    const payload = JSON.parse(atob(base64 + pad));
    return typeof payload?.exp === "number" && payload.exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}

export function leerSesionGuardada() {
  try {
    const raw =
      localStorage.getItem(CLAVE_SESION_ADMIN) ||
      sessionStorage.getItem(CLAVE_SESION_ADMIN);
    if (!raw) return null;
    const datos = JSON.parse(raw);
    if (!datos || datos.autenticado !== true) return null;
    if (tokenJwtExpirado(datos.token)) {
      localStorage.removeItem(CLAVE_SESION_ADMIN);
      sessionStorage.removeItem(CLAVE_SESION_ADMIN);
      return null;
    }
    return datos;
  } catch {
    return null;
  }
}

// Exponer window.AxionAuth de forma síncrona antes de que cualquier controlador de vista se ejecute
window.AxionAuth = {
  obtenerSesionActiva: () => leerSesionGuardada(),
  esAdministrador: () => Boolean(leerSesionGuardada())
};

export function normalizarRutaSpa(ruta) {
  if (!ruta) return "/";
  const limpia = String(ruta).trim().replace(/^(\.\/|\.\.\/)+/, "");
  const [pathname, search] = limpia.split("?");
  const qs = search ? `?${search}` : "";

  if (pathname === "" || pathname === "/" || pathname.endsWith("index.html") && !pathname.includes("views/")) {
    return "/" + qs;
  }
  if (pathname.endsWith("login.html") || pathname === "/login") {
    return "/login" + qs;
  }
  if (pathname.includes("views/sensores/ph")) return "/sensores/ph" + qs;
  if (pathname.includes("views/sensores/ec")) return "/sensores/ec" + qs;
  if (pathname.includes("views/sensores/nivel-temperatura")) return "/sensores/nivel-temperatura" + qs;
  if (pathname.includes("views/sensores/nivel-agua")) return "/sensores/nivel-agua" + qs;
  if (pathname.includes("views/sensores/temperatura_humedad")) return "/sensores/temperatura-humedad" + qs;
  if (pathname.includes("views/sensores/temperatura")) return "/sensores/temperatura" + qs;
  if (pathname.includes("views/reles")) return "/reles" + qs;
  if (pathname.includes("views/nodo-maestro")) return "/nodo-maestro" + qs;
  if (pathname.includes("views/reportes")) return "/reportes" + qs;
  if (pathname.includes("views/configuracion")) return "/configuracion" + qs;

  return limpia.startsWith("/") ? limpia : `/${limpia}`;
}

export function AxionProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sesion, setSesion] = useState(() => leerSesionGuardada());
  const [modoTema, setModoTema] = useState(() => localStorage.getItem(CLAVE_TEMA) || "oscuro");
  const [esClaro, setEsClaro] = useState(() =>
    resolverTemaClaro(localStorage.getItem(CLAVE_TEMA) || "oscuro")
  );
  const [sidebarOculto, setSidebarOculto] = useState(false);

  // Sincronizar sesión cada vez que cambia la ruta o el almacenamiento
  useEffect(() => {
    setSesion(leerSesionGuardada());
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onStorage = () => {
      setSesion(leerSesionGuardada());
      const temaActual = localStorage.getItem(CLAVE_TEMA) || "oscuro";
      setModoTema(temaActual);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const sesionVigente = sesion || leerSesionGuardada();
  const esAdministrador = Boolean(sesionVigente && sesionVigente.autenticado);

  // Actualizar helpers globales sincrónicamente durante el render
  window.AxionAuth = {
    obtenerSesionActiva: () => leerSesionGuardada(),
    esAdministrador: () => Boolean(leerSesionGuardada())
  };
  window.AxionSincronizarSesion = () => {
    setSesion(leerSesionGuardada());
  };
  window.AxionNavigate = (ruta) => {
    navigate(normalizarRutaSpa(ruta));
  };

  useEffect(() => {
    const claro = resolverTemaClaro(modoTema);
    setEsClaro(claro);
    document.body.classList.toggle("tema-claro", claro);
  }, [modoTema]);

  useEffect(() => {
    const aplicarTipografia = (prefs) => {
      if (!prefs) return;
      const t = prefs.title || (prefs.titlePx ? `${prefs.titlePx}px` : null);
      const s = prefs.subtitle || (prefs.subtitlePx ? `${prefs.subtitlePx}px` : null);
      const b = prefs.base || (prefs.basePx ? `${prefs.basePx}px` : null);
      if (t) document.documentElement.style.setProperty("--font-size-title", t);
      if (s) document.documentElement.style.setProperty("--font-size-subtitle", s);
      if (b) document.documentElement.style.setProperty("--font-size-base", b);
    };

    try {
      const raw = localStorage.getItem(CLAVE_TIPOGRAFIA);
      if (raw) aplicarTipografia(JSON.parse(raw));
    } catch {
      // Ignorar
    }

    apiGet("/configuracion/apariencia")
      .then((ap) => {
        if (!ap) return;
        if (ap.tema && ["oscuro", "claro", "sistema"].includes(ap.tema)) {
          localStorage.setItem(CLAVE_TEMA, ap.tema);
          setModoTema(ap.tema);
        }
        aplicarTipografia(ap);
      })
      .catch(() => {});
  }, []);

  const alternarTema = () => {
    const actualmenteClaro = document.body.classList.contains("tema-claro");
    const nuevoModo = actualmenteClaro ? "oscuro" : "claro";
    localStorage.setItem(CLAVE_TEMA, nuevoModo);
    setModoTema(nuevoModo);
  };

  const cambiarModoTema = (nuevoModo) => {
    localStorage.setItem(CLAVE_TEMA, nuevoModo);
    setModoTema(nuevoModo);
  };

  const iniciarSesionAdmin = (correo, mantenerSesion = false) => {
    const payload = {
      autenticado: true,
      rol: "Administrador Único",
      correo,
      persistente: Boolean(mantenerSesion),
      inicioIso: new Date().toISOString()
    };
    const serializado = JSON.stringify(payload);
    localStorage.removeItem(CLAVE_SESION_ADMIN);
    sessionStorage.removeItem(CLAVE_SESION_ADMIN);
    if (mantenerSesion) {
      localStorage.setItem(CLAVE_SESION_ADMIN, serializado);
    } else {
      sessionStorage.setItem(CLAVE_SESION_ADMIN, serializado);
    }
    setSesion(payload);
  };

  useEffect(() => {
    const intervaloMs = Number(
      (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_POLLING_MS) || 5000
    );
    const deviceId =
      (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_DEVICE_ID) ||
      "ESP32_HIDRO_01";
    let activo = true;
    let ultimaLecturaId = null;
    let ultimaFirmaEstado = null;

    const consultarEstadoHttp = async () => {
      try {
        const resumen = await apiGet(`/dashboard/resumen?dispositivoId=${encodeURIComponent(deviceId)}`);
        if (!activo || !resumen) return;
        const idActual = resumen.ultimaLectura ? (resumen.ultimaLectura.id ?? resumen.ultimaLectura.ts ?? "") : "";
        const conectadoActual = resumen.dispositivo ? Boolean(resumen.dispositivo.conectado) : false;
        const heartbeatActual = resumen.dispositivo?.ultimoHeartbeat ?? "";
        const firmaActual = `${idActual}|${conectadoActual}|${heartbeatActual}`;

        if (resumen.ultimaLectura && idActual !== ultimaLecturaId) {
          ultimaLecturaId = idActual;
          window.dispatchEvent(new CustomEvent("axion:telemetria", { detail: resumen.ultimaLectura }));
        }
        if (firmaActual !== ultimaFirmaEstado) {
          ultimaFirmaEstado = firmaActual;
          document.dispatchEvent(new CustomEvent("dashboard:actualizarLecturas", { detail: resumen.ultimaLectura }));
        }
        window.dispatchEvent(new CustomEvent("axion:alertasActualizadas"));
      } catch {
        // Reintentar en el siguiente ciclo de polling HTTP
      }
    };

    consultarEstadoHttp();
    const timer = setInterval(consultarEstadoHttp, Math.max(2000, intervaloMs));
    return () => {
      activo = false;
      clearInterval(timer);
    };
  }, []);

  const cerrarSesionAdmin = () => {
    apiPost("/auth/logout").catch(() => {});
    localStorage.removeItem(CLAVE_SESION_ADMIN);
    sessionStorage.removeItem(CLAVE_SESION_ADMIN);
    setSesion(null);
  };

  return (
    <AxionContext.Provider
      value={{
        sesion,
        esAdministrador,
        modoTema,
        esClaro,
        alternarTema,
        cambiarModoTema,
        iniciarSesionAdmin,
        cerrarSesionAdmin,
        sidebarOculto,
        setSidebarOculto
      }}
    >
      {children}
    </AxionContext.Provider>
  );
}

export function useAxion() {
  return useContext(AxionContext);
}
