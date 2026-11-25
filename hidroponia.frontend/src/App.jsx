import React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { leerSesionGuardada, useAxion } from "./context/AxionContext";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import SensorPh from "./pages/SensorPh";
import SensorEc from "./pages/SensorEc";
import SensorNivelTemperatura from "./pages/SensorNivelTemperatura";
import SensorTemperaturaHumedad from "./pages/SensorTemperaturaHumedad";
import Reles from "./pages/Reles";
import NodoMaestro from "./pages/NodoMaestro";
import Reportes from "./pages/Reportes";
import ConfiguracionGeneral from "./pages/ConfiguracionGeneral";

function RutaAdmin({ children }) {
  const { esAdministrador } = useAxion();
  const location = useLocation();
  const autorizado = Boolean(esAdministrador || leerSesionGuardada());
  if (!autorizado) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Rutas públicas (Modo Investigación / Consulta + Admin) */}
      <Route path="/" element={<Dashboard />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reportes" element={<Reportes />} />

      {/* Rutas exclusivas de Administrador Único */}
      <Route
        path="/sensores/ph"
        element={
          <RutaAdmin>
            <SensorPh />
          </RutaAdmin>
        }
      />

      <Route
        path="/sensores/ec"
        element={
          <RutaAdmin>
            <SensorEc />
          </RutaAdmin>
        }
      />

      <Route
        path="/sensores/nivel-agua"
        element={<Navigate to="/sensores/nivel-temperatura?tab=nivel" replace />}
      />

      <Route
        path="/sensores/temperatura"
        element={<Navigate to="/sensores/nivel-temperatura?tab=temperatura" replace />}
      />

      <Route
        path="/sensores/nivel-temperatura"
        element={
          <RutaAdmin>
            <SensorNivelTemperatura />
          </RutaAdmin>
        }
      />

      <Route
        path="/sensores/temperatura-humedad"
        element={
          <RutaAdmin>
            <SensorTemperaturaHumedad />
          </RutaAdmin>
        }
      />

      <Route
        path="/reles"
        element={
          <RutaAdmin>
            <Reles />
          </RutaAdmin>
        }
      />

      <Route
        path="/nodo-maestro"
        element={
          <RutaAdmin>
            <NodoMaestro />
          </RutaAdmin>
        }
      />

      <Route
        path="/configuracion"
        element={
          <RutaAdmin>
            <ConfiguracionGeneral />
          </RutaAdmin>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
