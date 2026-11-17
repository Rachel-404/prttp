import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAxion } from "../context/AxionContext";

const SUBMENU_CONFIG = [
  {
    ruta: "/sensores/ph",
    alias: "/views/sensores/ph",
    icono: "water_ph",
    texto: "Sensor de pH (RS485)"
  },
  {
    ruta: "/sensores/ec",
    alias: "/views/sensores/ec",
    icono: "water_ec",
    texto: "Sensor de EC"
  },
  {
    ruta: "/sensores/nivel-temperatura",
    alias: "/views/sensores/nivel",
    icono: "water",
    texto: "Nivel y Temperatura"
  },
  {
    ruta: "/sensores/temperatura-humedad",
    alias: "/views/sensores/temperatura_humedad",
    icono: "humidity_percentage",
    texto: "Temperatura y Humedad"
  },
  {
    ruta: "/reles",
    alias: "/views/reles",
    icono: "bolt",
    texto: "Control de Equipos"
  }
];

export default function Sidebar() {
  const { esAdministrador, sidebarOculto } = useAxion();
  const location = useLocation();
  const p = location.pathname;

  const coincideItem = (item) =>
    p.startsWith(item.ruta) ||
    p.startsWith(item.alias) ||
    (item.ruta === "/sensores/nivel-temperatura" &&
      (p.startsWith("/sensores/temperatura") || p.startsWith("/views/sensores/temperatura/")));

  const enRutaSubmenu = SUBMENU_CONFIG.some(coincideItem);
  const [configAbierto, setConfigAbierto] = useState(enRutaSubmenu);

  useEffect(() => {
    if (enRutaSubmenu) {
      setConfigAbierto(true);
    }
  }, [enRutaSubmenu]);

  const esDashboard = p === "/" || p === "/index.html";
  const esNodo = p.startsWith("/nodo-maestro") || p.startsWith("/views/nodo-maestro");
  const esReportes = p.startsWith("/reportes") || p.startsWith("/views/reportes");
  const esConfigGeneral = p.startsWith("/configuracion") || p.startsWith("/views/configuracion");

  return (
    <aside
      id="contenedor-sidebar"
      className={sidebarOculto ? "oculto" : ""}
      style={{ overflow: sidebarOculto ? "hidden" : "" }}
    >
      <nav className="sidebar-nav" aria-label="Navegación principal">
        <ul className="sidebar-lista">
          <li className="sidebar-item">
            <Link to="/" className={`contenedor-opcion${esDashboard ? " activo" : ""}`}>
              <span className="material-symbols-outlined" aria-hidden="true">
                dashboard
              </span>
              <span>Dashboard Principal</span>
            </Link>
          </li>

          {esAdministrador && (
            <li className="sidebar-item" data-solo-admin="true">
              <button
                type="button"
                id="btn-toggle-config-nav"
                className="contenedor-opcion btn-submenu-sidebar"
                aria-expanded={configAbierto}
                aria-controls="submenu-sensores"
                onClick={() => setConfigAbierto(!configAbierto)}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  tune
                </span>
                <span className="texto-opcion-sidebar">Configuración</span>
                <span className="material-symbols-outlined icono-chevron-sidebar" aria-hidden="true">
                  expand_more
                </span>
              </button>

              {configAbierto && (
                <ul id="submenu-sensores" className="submenu-sensores">
                  {SUBMENU_CONFIG.map((item) => {
                    const activo = coincideItem(item);
                    return (
                      <li key={item.ruta} className={`opcionII${activo ? " activo" : ""}`}>
                        <Link to={item.ruta}>
                          <span className="material-symbols-outlined" aria-hidden="true">
                            {item.icono}
                          </span>
                          <span>{item.texto}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          )}

          {esAdministrador && (
            <li className="sidebar-item" data-solo-admin="true">
              <Link
                to="/nodo-maestro"
                className={`contenedor-opcion${esNodo ? " activo" : ""}`}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  memory
                </span>
                <span>Controlador</span>
              </Link>
            </li>
          )}

          <li className="sidebar-item">
            <Link
              to="/reportes"
              className={`contenedor-opcion${esReportes ? " activo" : ""}`}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                analytics
              </span>
              <span id="sidebar-label-reportes">
                {esAdministrador ? "Reportes y Respaldos" : "Reportes e Investigación"}
              </span>
            </Link>
          </li>

          {esAdministrador && (
            <li className="sidebar-item" data-solo-admin="true">
              <Link
                to="/configuracion"
                className={`contenedor-opcion${esConfigGeneral ? " activo" : ""}`}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  person
                </span>
                <span>Configuración General</span>
              </Link>
            </li>
          )}
        </ul>
      </nav>
    </aside>
  );
}
