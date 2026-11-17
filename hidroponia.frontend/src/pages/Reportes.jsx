import React, { useEffect } from "react";
import Layout from "../components/Layout";
import usePageStyles from "../components/usePageStyles";
import initCtrl1 from "../controllers/reportes.js";

const PAGE_CSS = ["/css/reportes.css"];

export default function Reportes() {
  usePageStyles(PAGE_CSS);

  useEffect(() => {
    const c1 = initCtrl1();
    return () => {
      if (typeof c1 === 'function') c1();
    };
  }, []);

  return (
    <>
      <Layout>

            <div className="modulo-reportes">
                
                <header className="encabezado-reportes">
                    <div className="titulo-modulo-reportes">
                        <h1>Reportes y Respaldos</h1>
                    </div>
                    <nav className="barra-pestanas" role="tablist" aria-label="Secciones de Reportes y Respaldos">
                        <button type="button" id="tab-historial" className="btn-pestana activa" role="tab" aria-selected="true" aria-controls="contenido-pestana-reportes" data-tab="historial" data-view="historial_exportacion.html">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                            </svg>
                            <span>Historial y Exportación</span>
                        </button>

                        <button type="button" id="tab-respaldos" className="btn-pestana" role="tab" aria-selected="false" aria-controls="contenido-pestana-reportes" data-tab="respaldos" data-view="respaldos_backup.html">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            <span>Respaldos Automáticos (Backup)</span>
                        </button>
                    </nav>
                </header>

                
                <section id="contenido-pestana-reportes" className="contenido-pestana" role="tabpanel" aria-labelledby="tab-historial" aria-live="polite"></section>
            </div>
        
      </Layout>


    
    <div id="modal-reportes-overlay" className="modal-overlay" hidden>
        <div className="modal-caja" role="dialog" aria-modal="true" aria-labelledby="modal-reportes-titulo" aria-describedby="modal-reportes-mensaje" aria-live="polite">
            <h4 id="modal-reportes-titulo" className="modal-titulo"></h4>
            <p id="modal-reportes-mensaje" className="modal-mensaje"></p>
            <div className="modal-acciones">
                <button type="button" id="btn-modal-reportes-cancelar" className="btn-modal btn-modal-cancelar">Cancelar</button>
                <button type="button" id="btn-modal-reportes-aceptar" className="btn-modal btn-modal-activar">Aceptar</button>
            </div>
        </div>
    </div>

    
    <div id="toast-reportes" className="toast-notificacion" role="status" aria-live="polite" hidden></div>

    
    </>
  );
}
