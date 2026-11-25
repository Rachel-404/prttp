import React from "react";
import { useNavigate } from "react-router-dom";
import { normalizarRutaSpa, useAxion } from "../context/AxionContext";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function Layout({ children, plana = false }) {
  const { sidebarOculto } = useAxion();
  const navigate = useNavigate();

  const handleMainClick = (e) => {
    const link = e.target.closest("a[href]");
    if (!link) return;
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || /^(https?:|mailto:|tel:|javascript:)/i.test(href)) {
      return;
    }
    e.preventDefault();
    navigate(normalizarRutaSpa(href));
  };

  return (
    <div
      className="layout-container"
      style={{
        gridTemplateColumns: sidebarOculto ? "0px minmax(0, 1fr)" : "250px minmax(0, 1fr)"
      }}
    >
      <Navbar />
      <Sidebar />
      <main
        id="contenedor-base"
        className={plana ? "vista-config-plana" : ""}
        onClick={handleMainClick}
      >
        {children}
      </main>
    </div>
  );
}
