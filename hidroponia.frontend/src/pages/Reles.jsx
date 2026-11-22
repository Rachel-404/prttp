import React, { useEffect } from "react";
import Layout from "../components/Layout";
import usePageStyles from "../components/usePageStyles";
import initCtrl1 from "../controllers/reles.js";

const PAGE_CSS = ["/css/reles.css"];

export default function Reles() {
  usePageStyles(PAGE_CSS);

  useEffect(() => {
    const c1 = initCtrl1();
    return () => {
      if (typeof c1 === 'function') c1();
    };
  }, []);

  return (
    <>
      <Layout plana>

            <header className="encabezado-modulo">
                <h1>Control de Equipos y Relés</h1>
                <p className="subtitulo-modulo">Activación manual, modo automático por temporizador y asignación de pines GPIO.</p>
            </header>
            <div className="reles-columna-unica">

                
                <section className="card card-reles" aria-label="Control manual y modo de operación">
                    <header className="titulo-card encabezado-reles">
                        <h3>Control Manual y Modo de Operación</h3>
                        <div className="control-modo-global">
                            <label htmlFor="modo-operacion-reles" className="etiqueta-campo">Modo:</label>
                            <select id="modo-operacion-reles" className="campo-control selector-modo-reles" defaultValue="manual">
                                <option value="manual">Modo Manual</option>
                                <option value="automatico">Modo Automático</option>
                            </select>
                        </div>
                    </header>

                    <div className="cuerpo-card">
                        <p id="aviso-modo-automatico" className="aviso-modo-auto" role="status" aria-live="polite" hidden>
 Modo Automático activo: el control manual de los relés está bloqueado temporalmente para evitar conflictos con la programación del ESP32-S3.
 </p>

                        
                        <div className="grid-reles-canales" id="grid-reles-canales" aria-live="polite"></div>
                    </div>
                </section>

                
                <section className="card card-tecnica-abierta" id="bloque-tecnico-reles" aria-label="Configuración técnica de pines">
                    <header className="titulo-card">
                        <h3>Configuración Técnica de Pines</h3>
                    </header>

                    <form id="form-tecnico-reles" className="cuerpo-card" noValidate>

                                <fieldset className="subseccion-tecnica">
                                    <legend className="subtitulo-tecnico">Asignación de Pines GPIO y Lógica de Disparo</legend>

                                    <div className="grid-pines-reles">
                                        <div className="grupo-campo">
                                            <label htmlFor="pin-rele-1" className="etiqueta-campo">Relé 1</label>
                                            <input type="text" id="pin-rele-1" name="pinRele1" className="campo-control" defaultValue="GPIO 14" required />
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="pin-rele-2" className="etiqueta-campo">Relé 2</label>
                                            <input type="text" id="pin-rele-2" name="pinRele2" className="campo-control" defaultValue="GPIO 15" required />
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="pin-rele-3" className="etiqueta-campo">Relé 3</label>
                                            <input type="text" id="pin-rele-3" name="pinRele3" className="campo-control" defaultValue="GPIO 16" required />
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="pin-rele-4" className="etiqueta-campo">Relé 4</label>
                                            <input type="text" id="pin-rele-4" name="pinRele4" className="campo-control" defaultValue="GPIO 17" required />
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="pin-rele-5" className="etiqueta-campo">Relé 5</label>
                                            <input type="text" id="pin-rele-5" name="pinRele5" className="campo-control" defaultValue="GPIO 18" required />
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="pin-rele-6" className="etiqueta-campo">Relé 6</label>
                                            <input type="text" id="pin-rele-6" name="pinRele6" className="campo-control" defaultValue="GPIO 21" required />
                                        </div>
                                    </div>

                                    <div className="grupo-campo campo-logica-disparo">
                                        <label htmlFor="tec-rele-logica" className="etiqueta-campo">Lógica de Disparo del Módulo</label>
                                        <select id="tec-rele-logica" name="logicaDisparo" className="campo-control" defaultValue="low">
                                            <option value="low">Activo en Bajo / Low-Level Trigger</option>
                                            <option value="high">Activo en Alto / High-Level Trigger</option>
                                        </select>
                                    </div>
                                </fieldset>

                                <p id="error-tecnico-reles" className="mensaje-error-form" role="alert" hidden></p>

                                <footer className="acciones-card acciones-tecnicas">
                                    <button type="button" id="btn-restaurar-fabrica-reles" className="btn-modal btn-modal-cancelar">
                                        Restaurar valores de fábrica
                                    </button>
                                    <button type="submit" id="btn-guardar-tecnico-reles" className="btn-modal btn-modal-activar">
                                        Guardar Configuración Técnica
                                    </button>
                                </footer>

                            </form>
                </section>

            </div>
        
      </Layout>


    
    <div id="modal-confirmacion-reles" className="modal-overlay" hidden>
        <div className="modal-caja" role="dialog" aria-modal="true" aria-labelledby="modal-reles-titulo" aria-describedby="modal-reles-mensaje" aria-live="polite">
            <h4 id="modal-reles-titulo" className="modal-titulo"></h4>
            <p id="modal-reles-mensaje" className="modal-mensaje"></p>
            <div className="modal-acciones">
                <button type="button" id="btn-modal-cancelar-reles" className="btn-modal btn-modal-cancelar">Cancelar</button>
                <button type="button" id="btn-modal-aceptar-reles" className="btn-modal btn-modal-activar">Aceptar</button>
            </div>
        </div>
    </div>

    
    <div id="toast-reles" className="toast-notificacion" role="status" aria-live="polite" hidden></div>

    
    </>
  );
}
