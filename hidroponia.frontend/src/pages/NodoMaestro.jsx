import React, { useEffect } from "react";
import Layout from "../components/Layout";
import usePageStyles from "../components/usePageStyles";
import initCtrl1 from "../controllers/nodo_maestro.js";

const PAGE_CSS = ["/css/reportes.css"];

export default function NodoMaestro() {
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
                <h1>Controlador Maestro ESP32-S3</h1>
                <p className="subtitulo-modulo">Gestión de conectividad inalámbrica Wi-Fi, transporte HTTP REST, cadencia de muestreo en memoria NVS y matriz de pines GPIO.</p>
            </header>

            
            <section className="grid-tecnico-cuatro telemetria-nodo-grid" aria-label="Telemetría de salud del controlador">
                <div className="tarjeta-metrica-contraste">
                    <span className="etiqueta-metrica-contraste">Estado de Red</span>
                    <strong id="nodo-estado-red" className="valor-metrica-contraste">--</strong>
                </div>

                <div className="tarjeta-metrica-contraste">
                    <span className="etiqueta-metrica-contraste">Alimentación y Consumo</span>
                    <strong id="nodo-alimentacion" className="valor-metrica-contraste">--</strong>
                </div>

                <div className="tarjeta-metrica-contraste">
                    <span className="etiqueta-metrica-contraste">Firmware</span>
                    <strong id="nodo-firmware" className="valor-metrica-contraste">--</strong>
                </div>

                <div className="tarjeta-metrica-contraste">
                    <span className="etiqueta-metrica-contraste">Memoria PSRAM</span>
                    <strong id="nodo-psram" className="valor-metrica-contraste">--</strong>
                </div>
            </section>

            <div className="ordenar-div">

                
                <div className="card">
                    <header className="titulo-card">
                        <h3>Conectividad Wi-Fi y Transporte HTTP</h3>
                    </header>

                    <form id="form-conectividad-nodo" className="cuerpo-card" noValidate>
                        <fieldset className="subseccion-tecnica">
                            <legend className="subtitulo-tecnico">Red Inalámbrica</legend>

                            <div className="grupo-campo" style={{ marginBottom: "12px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                                    <button type="button" id="btn-escanear-wifi" className="btn-modal btn-modal-cancelar">
                                        Buscar redes Wi-Fi
                                    </button>
                                    <span id="estado-escaneo-wifi" className="texto-guia"></span>
                                </div>
                                <div
                                    id="lista-redes-wifi"
                                    hidden
                                    style={{
                                        marginTop: "10px",
                                        display: "grid",
                                        gap: "8px",
                                        maxHeight: "220px",
                                        overflowY: "auto"
                                    }}
                                ></div>
                            </div>

                            <div className="fila-dos-cols">
                                <div className="grupo-campo">
                                    <label htmlFor="nodo-ssid" className="etiqueta-campo">SSID de Red Wi-Fi</label>
                                    <input type="text" id="nodo-ssid" name="ssid" className="campo-control" defaultValue="AXION_LAB_HIDROPONIA" required />
                                </div>

                                <div className="grupo-campo">
                                    <label htmlFor="nodo-wifi-pass" className="etiqueta-campo">Contraseña Wi-Fi</label>
                                    <input
                                        type="password"
                                        id="nodo-wifi-pass"
                                        name="wifiPassword"
                                        className="campo-control"
                                        defaultValue=""
                                        placeholder="Dejar vacío para mantener actual"
                                    />
                                </div>
                            </div>

                            <div className="grupo-campo">
                                <label htmlFor="nodo-asignacion-ip" className="etiqueta-campo">Asignación IP</label>
                                <select id="nodo-asignacion-ip" name="asignacionIp" className="campo-control" defaultValue="dhcp">
                                    <option value="dhcp">DHCP Automático</option>
                                    <option value="estatica">IP Estática</option>
                                </select>
                            </div>

                            <div id="grupo-ip-estatica" className="fila-dos-cols">
                                <div className="grupo-campo">
                                    <label htmlFor="nodo-ip-local" className="etiqueta-campo">IP Local</label>
                                    <input type="text" id="nodo-ip-local" name="ipLocal" className="campo-control" defaultValue="--" readOnly />
                                </div>
                                <div className="grupo-campo">
                                    <label htmlFor="nodo-mascara" className="etiqueta-campo">Máscara de Subred</label>
                                    <input type="text" id="nodo-mascara" name="mascara" className="campo-control" defaultValue="255.255.255.0" readOnly />
                                </div>
                                <div className="grupo-campo">
                                    <label htmlFor="nodo-gateway" className="etiqueta-campo">Gateway</label>
                                    <input type="text" id="nodo-gateway" name="gateway" className="campo-control" defaultValue="--" readOnly />
                                </div>
                                <div className="grupo-campo">
                                    <label htmlFor="nodo-dns" className="etiqueta-campo">DNS</label>
                                    <input type="text" id="nodo-dns" name="dns" className="campo-control" defaultValue="8.8.8.8" readOnly />
                                </div>
                            </div>
                        </fieldset>

                        <fieldset className="subseccion-tecnica">
                            <legend className="subtitulo-tecnico">Conexión HTTP al Backend</legend>

                            <div className="grupo-campo">
                                <label htmlFor="nodo-server-url" className="etiqueta-campo">URL del Servidor Backend</label>
                                <input type="text" id="nodo-server-url" name="serverUrl" className="campo-control" defaultValue="--" readOnly />
                            </div>

                            <div className="fila-dos-cols">
                                <div className="grupo-campo">
                                    <label htmlFor="nodo-usuario" className="etiqueta-campo">Dispositivo ID</label>
                                    <input type="text" id="nodo-usuario" name="usuario" className="campo-control" defaultValue="ESP32_HIDRO_01" readOnly />
                                </div>

                                <div className="grupo-campo">
                                    <label htmlFor="nodo-pass-transporte" className="etiqueta-campo">Device Key</label>
                                    <input type="password" id="nodo-pass-transporte" name="passTransporte" className="campo-control" defaultValue="********" />
                                </div>
                            </div>
                        </fieldset>

                        <footer className="acciones-card">
                            <button type="submit" className="btn-modal btn-modal-activar">
                                Guardar Conectividad
                            </button>
                        </footer>
                    </form>
                </div>

                
                <div className="card">
                    <header className="titulo-card">
                        <h3>Cadencia de Muestreo y Sincronización HTTP</h3>
                    </header>

                    <form id="form-buffer-nodo" className="cuerpo-card" noValidate>
                        <div className="grupo-campo">
                            <label htmlFor="nodo-muestreo" className="etiqueta-campo">Frecuencia de Muestreo y Envío HTTP en segundos</label>
                            <input type="number" id="nodo-muestreo" name="muestreoSeg" className="campo-control" min="15" max="3600" defaultValue="300" required />
                        </div>

                        <div className="paso-calibracion">
                            <div className="paso-info">
                                <span className="etiqueta-campo">Sincronización Inmediata con el ESP32-S3</span>
                                <p className="texto-guia">Ordena al controlador realizar una lectura inmediata de los 5 sensores y enviarla por HTTP.</p>
                            </div>
                            <div className="paso-accion">
                                <button type="button" id="btn-forzar-sync" className="btn-modal btn-modal-cancelar">
                                    Solicitar Lectura Ahora
                                </button>
                            </div>
                        </div>

                        <footer className="acciones-card">
                            <button type="submit" className="btn-modal btn-modal-activar">
                                Guardar Cadencia de Muestreo
                            </button>
                        </footer>
                    </form>
                </div>

                
                <div className="card">
                    <header className="titulo-card">
                        <h3>Pinout Manager Interactivo</h3>
                        <span className="texto-guia">Matriz de asignación y reserva de pines GPIO</span>
                    </header>

                    <form id="form-pinout-nodo" className="cuerpo-card" noValidate>
                        <div className="contenedor-tabla-registros">
                            <table className="tabla-historial" aria-label="Matriz de asignación de pines GPIO del ESP32-S3">
                                <thead>
                                    <tr>
                                        <th>Pines GPIO</th>
                                        <th>Periférico / Bus</th>
                                        <th>Función Asignada</th>
                                        <th>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td colSpan={4} className="texto-guia">
                                            Cargando matriz de asignación de pines desde el backend...
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <footer className="acciones-card acciones-tecnicas">
                            <button type="button" id="btn-validar-pinout" className="btn-modal btn-modal-cancelar">
                                Validar Mapa de Pines
                            </button>
                            <button type="submit" className="btn-modal btn-modal-activar">
                                Guardar y Sincronizar Nodo
                            </button>
                        </footer>
                    </form>
                </div>

            </div>
        
      </Layout>


    <div id="toast-nodo-maestro" className="toast-notificacion" role="status" aria-live="polite" hidden></div>

    
    </>
  );
}
