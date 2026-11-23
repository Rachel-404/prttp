import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { normalizarRutaSpa, useAxion } from "../context/AxionContext";
import { apiGet, apiPatch } from "../services/apiClient";

export default function Navbar() {
  const {
    esAdministrador,
    esClaro,
    alternarTema,
    cerrarSesionAdmin,
    sidebarOculto,
    setSidebarOculto
  } = useAxion();
  const navigate = useNavigate();

  const [alertas, setAlertas] = useState([]);
  const [alertasAbiertas, setAlertasAbiertas] = useState(false);
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const [errorAlertas, setErrorAlertas] = useState("");

  const refAlertas = useRef(null);
  const refPerfil = useRef(null);
  const refErrorTimer = useRef(null);

  const mostrarErrorAlertas = useCallback((msg) => {
    setErrorAlertas(msg || "No se pudo actualizar el estado de las alertas.");
    if (refErrorTimer.current) clearTimeout(refErrorTimer.current);
    refErrorTimer.current = setTimeout(() => {
      setErrorAlertas("");
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (refErrorTimer.current) clearTimeout(refErrorTimer.current);
    };
  }, []);

  const refrescarAlertas = useCallback(async () => {
    try {
      const remotas = await apiGet("/alertas");
      if (Array.isArray(remotas)) {
        const normalizadas = remotas.map((a) => ({
          id: String(a.id),
          nivel: a.nivel || "normal",
          titulo: a.titulo,
          detalle: a.detalle,
          tiempo: a.creadaEn ? new Date(a.creadaEn).toLocaleString("es-PE") : "Reciente",
          leida: Boolean(a.leida),
          urlDestino: normalizarRutaSpa(a.urlDestino || "/")
        }));
        setAlertas(normalizadas);
      }
    } catch {
      // Mantener el estado actual si el servidor no responde momentáneamente
    }
  }, []);

  useEffect(() => {
    refrescarAlertas();
    window.addEventListener("axion:alertasActualizadas", refrescarAlertas);
    return () => {
      window.removeEventListener("axion:alertasActualizadas", refrescarAlertas);
    };
  }, [refrescarAlertas]);

  useEffect(() => {
    const cerrarAlClickFuera = (e) => {
      if (refAlertas.current && !refAlertas.current.contains(e.target)) {
        setAlertasAbiertas(false);
      }
      if (refPerfil.current && !refPerfil.current.contains(e.target)) {
        setPerfilAbierto(false);
      }
    };
    const cerrarConEscape = (e) => {
      if (e.key === "Escape") {
        setAlertasAbiertas(false);
        setPerfilAbierto(false);
      }
    };
    document.addEventListener("click", cerrarAlClickFuera);
    document.addEventListener("keydown", cerrarConEscape);
    return () => {
      document.removeEventListener("click", cerrarAlClickFuera);
      document.removeEventListener("keydown", cerrarConEscape);
    };
  }, []);

  const marcarAlerta = async (alerta) => {
    const leidaPrevia = Boolean(alerta.leida);
    setAlertas((prev) => prev.map((a) => (a.id === alerta.id ? { ...a, leida: true } : a)));
    if (esAdministrador && /^\d+$/.test(String(alerta.id))) {
      try {
        await apiPatch(`/alertas/${alerta.id}/leer`);
      } catch (err) {
        setAlertas((prev) => prev.map((a) => (a.id === alerta.id ? { ...a, leida: leidaPrevia } : a)));
        mostrarErrorAlertas(err?.message || "No se pudo marcar la alerta como leída.");
        return;
      }
    }
    setAlertasAbiertas(false);
    if (esAdministrador && alerta.urlDestino) {
      navigate(normalizarRutaSpa(alerta.urlDestino));
    }
  };

  const marcarTodasLeidas = async () => {
    if (!esAdministrador) return;
    const prevAlertas = alertas;
    setAlertas((prev) => prev.map((a) => ({ ...a, leida: true })));
    try {
      await apiPatch("/alertas/leer-todas");
    } catch (err) {
      setAlertas(prevAlertas);
      mostrarErrorAlertas(err?.message || "No se pudieron marcar las alertas como leídas.");
    }
  };

  const noLeidas = alertas.filter((a) => !a.leida).length;

  return (
    <header id="contenedor-navbar">
      <nav className="navbar-contenido" aria-label="Barra de navegación superior">
        <button
          id="sidebar"
          className="abajo btn-menu"
          type="button"
          aria-label="Abrir o cerrar menú lateral"
          onClick={() => setSidebarOculto(!sidebarOculto)}
        >
          <span className="hmbrgs" aria-hidden="true"></span>
          <span className="hmbrgs" aria-hidden="true"></span>
          <span className="hmbrgs" aria-hidden="true"></span>
        </button>

        <div className="contenedor-titulo">
          <img className="img-logo" src="/img/logo.png" alt="Logo AXIÓN IOT" />
          <Link to="/">
            <span className="navbar-titulo">AXIÓN - IOT</span>
          </Link>
        </div>

        <div className="navbar-acciones">
          <div className="control-tema">
            <button
              id="btn-tema"
              className={`btn-tema${esClaro ? " modo-claro" : ""}`}
              type="button"
              aria-label="Cambiar tema oscuro o claro"
              title="Cambiar tema"
              onClick={alternarTema}
            >
              <span className="icono-tema">
                <span className="material-symbols-outlined" aria-hidden="true">
                  {esClaro ? "light_mode" : "dark_mode"}
                </span>
              </span>
            </button>
          </div>

          <div id="centro-alertas-header" className="perfil-usuario-header" ref={refAlertas}>
            <button
              id="btn-alertas-header"
              className="btn-perfil-header"
              type="button"
              aria-haspopup="true"
              aria-expanded={alertasAbiertas}
              aria-controls="dropdown-alertas-header"
              aria-label="Centro de alertas del sistema"
              onClick={() => setAlertasAbiertas(!alertasAbiertas)}
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span
                id="badge-alertas-count"
                className="badge-alertas-contador"
                hidden={noLeidas === 0}
              >
                {noLeidas}
              </span>
            </button>

            <div
              id="dropdown-alertas-header"
              className="dropdown-perfil-header dropdown-alertas-panel"
              role="region"
              aria-label="Alertas del sistema"
              hidden={!alertasAbiertas}
            >
              <div className="encabezado-alertas-dropdown">
                <span className="titulo-alertas-dropdown">Alertas del Sistema</span>
                <button
                  type="button"
                  id="btn-marcar-todas-leidas"
                  className="enlace-alertas-leidas"
                  onClick={marcarTodasLeidas}
                >
                  Marcar todas como leídas
                </button>
              </div>
              <ul id="lista-alertas-header" className="lista-alertas-header" aria-live="polite">
                {alertas.length === 0 ? (
                  <li className="item-alerta-header alerta-leida">
                    <span className="detalle-item-alerta">No hay alertas registradas.</span>
                  </li>
                ) : (
                  alertas.map((alerta) => (
                    <li
                      key={alerta.id}
                      className={`item-alerta-header alerta-${alerta.nivel}${
                        alerta.leida ? " alerta-leida" : ""
                      }`}
                      role="button"
                      tabIndex={0}
                      onClick={() => marcarAlerta(alerta)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          marcarAlerta(alerta);
                        }
                      }}
                    >
                      <div className="cabecera-item-alerta">
                        <span className="titulo-item-alerta">{alerta.titulo}</span>
                        {!alerta.leida && (
                          <span className="punto-alerta-no-leida" aria-hidden="true"></span>
                        )}
                      </div>
                      <span className="detalle-item-alerta">{alerta.detalle}</span>
                      <div className="pie-item-alerta">
                        <span>{alerta.tiempo}</span>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          <div id="perfil-usuario-header" className="perfil-usuario-header" ref={refPerfil}>
            <Link
              id="btn-header-login"
              className="btn-perfil-header"
              to="/login"
              aria-label="Iniciar sesión en el sistema"
              hidden={esAdministrador}
            >
              <svg
                className="icono-usuario-svg"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span className="texto-perfil-header">Iniciar Sesión</span>
            </Link>

            <div
              id="contenedor-sesion-activa"
              className="contenedor-sesion-activa"
              hidden={!esAdministrador}
            >
              <button
                id="btn-perfil-dropdown"
                className="btn-perfil-header btn-perfil-activo"
                type="button"
                aria-haspopup="true"
                aria-expanded={perfilAbierto}
                aria-controls="menu-perfil-header"
                onClick={() => setPerfilAbierto(!perfilAbierto)}
              >
                <span className="punto-sesion-activa" aria-hidden="true"></span>
                <svg
                  className="icono-usuario-svg"
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span className="texto-perfil-header">Administrador Único</span>
                <svg
                  className="icono-chevron-svg"
                  viewBox="0 0 24 24"
                  width="15"
                  height="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              <div
                id="menu-perfil-header"
                className="dropdown-perfil-header"
                role="menu"
                aria-label="Opciones de cuenta administrativa"
                hidden={!perfilAbierto}
              >
                <Link
                  id="opcion-mi-perfil"
                  className="item-dropdown-perfil"
                  to="/configuracion"
                  role="menuitem"
                  onClick={() => setPerfilAbierto(false)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span>Mi Perfil</span>
                </Link>
                <button
                  id="btn-cerrar-sesion"
                  className="item-dropdown-perfil item-cerrar-sesion"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setPerfilAbierto(false);
                    cerrarSesionAdmin();
                    navigate("/");
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <div
        id="toast-alertas-navbar"
        className="toast-notificacion"
        role="alert"
        aria-live="assertive"
        hidden={!errorAlertas}
      >
        {errorAlertas}
      </div>
    </header>
  );
}
