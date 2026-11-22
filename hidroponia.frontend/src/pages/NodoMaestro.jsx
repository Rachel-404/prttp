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
                <p className="subtitulo-modulo">Gestión de conectividad inalámbrica, transporte de telemetría, buffer offline LittleFS y matriz de pines GPIO.</p>
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

                            <div className="fila-dos-cols">
                                <div className="grupo-campo">
                                    <label htmlFor="nodo-ssid" className="etiqueta-campo">SSID de Red Wi-Fi</label>
                                    <input type="text" id="nodo-ssid" name="ssid" className="campo-control" defaultValue="AXION_LAB_HIDROPONIA" required />
                                </div>

                                <div className="grupo-campo">
                                    <label htmlFor="nodo-wifi-pass" className="etiqueta-campo">Contraseña Wi-Fi</label>
                                    <input type="password" id="nodo-wifi-pass" name="wifiPassword" className="campo-control" defaultValue="********" required />
                                </div>
                            </div>

                            <div className="grupo-campo">
                                <label htmlFor="nodo-asignacion-ip" className="etiqueta-campo">Asignación IP</label>
                                <select id="nodo-asignacion-ip" name="asignacionIp" className="campo-control" defaultValue="dhcp">
                                    <option value="dhcp">DHCP Automático</option>
                                    <option value="estatica">IP Estática</option>
                                </select>
                            </div>

                            <div id="grupo-ip-estatica" className="fila-dos-cols" hidden>
                                <div className="grupo-campo">
                                    <label htmlFor="nodo-ip-local" className="etiqueta-campo">IP Local</label>
                                    <input type="text" id="nodo-ip-local" name="ipLocal" className="campo-control" defaultValue="192.168.1.120" />
                                </div>
                                <div className="grupo-campo">
                                    <label htmlFor="nodo-mascara" className="etiqueta-campo">Máscara de Subred</label>
                                    <input type="text" id="nodo-mascara" name="mascara" className="campo-control" defaultValue="255.255.255.0" />
                                </div>
                                <div className="grupo-campo">
                                    <label htmlFor="nodo-gateway" className="etiqueta-campo">Gateway</label>
                                    <input type="text" id="nodo-gateway" name="gateway" className="campo-control" defaultValue="192.168.1.1" />
                                </div>
                                <div className="grupo-campo">
                                    <label htmlFor="nodo-dns" className="etiqueta-campo">DNS</label>
                                    <input type="text" id="nodo-dns" name="dns" className="campo-control" defaultValue="8.8.8.8" />
                                </div>
                            </div>
                        </fieldset>

                        <fieldset className="subseccion-tecnica">
                            <legend className="subtitulo-tecnico">Conexión HTTP al Backend</legend>

                            <div className="grupo-campo">
                                <label htmlFor="nodo-broker-url" className="etiqueta-campo">URL del Servidor Backend</label>
                                <input type="text" id="nodo-broker-url" name="brokerUrl" className="campo-control" defaultValue="http://localhost:8080" required />
                            </div>

                            <div className="grupo-campo">
                                <label htmlFor="nodo-endpoint" className="etiqueta-campo">Endpoint de Telemetría</label>
                                <input type="text" id="nodo-endpoint" name="endpoint" className="campo-control" defaultValue="/api/v1/iot/telemetria" required />
                            </div>

                            <div className="fila-dos-cols">
                                <div className="grupo-campo">
                                    <label htmlFor="nodo-usuario" className="etiqueta-campo">Dispositivo ID</label>
                                    <input type="text" id="nodo-usuario" name="usuario" className="campo-control" defaultValue="ESP32_HIDRO_01" />
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
                        <h3>Temporización y Buffer Offline</h3>
                    </header>

                    <form id="form-buffer-nodo" className="cuerpo-card" noValidate>
                        <div className="grupo-campo">
                            <label htmlFor="nodo-muestreo" className="etiqueta-campo">Frecuencia de Muestreo y Envío Inmediato</label>
                            <input type="number" id="nodo-muestreo" name="muestreoSeg" className="campo-control" min="300" max="3600" defaultValue="300" required />
                        </div>

                        <fieldset className="subseccion-tecnica">
                            <legend className="subtitulo-tecnico">Cola Circular Offline</legend>

                            <div className="fila-dos-cols">
                                <div className="grupo-campo">
                                    <label htmlFor="nodo-particion" className="etiqueta-campo">Tamaño de Partición LittleFS</label>
                                    <input type="number" id="nodo-particion" name="particionMb" className="campo-control" min="1" max="14" defaultValue="10" required />
                                </div>

                                <div className="grupo-campo">
                                    <label htmlFor="nodo-formato-buffer" className="etiqueta-campo">Formato de Registro Compacto</label>
                                    <select id="nodo-formato-buffer" name="formatoBuffer" className="campo-control" defaultValue="cbor">
                                        <option value="cbor">Binario / CBOR</option>
                                        <option value="csv">CSV Compacto</option>
                                    </select>
                                </div>
                            </div>

                            <div className="fila-dos-cols">
                                <div className="grupo-campo">
                                    <label htmlFor="nodo-lote" className="etiqueta-campo">Tamaño de Lote de Sincronización</label>
                                    <input type="number" id="nodo-lote" name="loteTramas" className="campo-control" min="1" max="500" defaultValue="50" required />
                                </div>

                                <div className="grupo-campo">
                                    <label htmlFor="nodo-desbordamiento" className="etiqueta-campo">Política de Desbordamiento</label>
                                    <select id="nodo-desbordamiento" name="politicaDesbordamiento" className="campo-control" defaultValue="fifo">
                                        <option value="fifo">Sobrescribir tramas más antiguas y alertar</option>
                                        <option value="detener">Detener captura al llenar partición</option>
                                    </select>
                                </div>
                            </div>

                            <div className="paso-calibracion">
                                <div className="paso-info">
                                    <span className="etiqueta-campo">Tramas pendientes en buffer</span>
                                    <p className="texto-registro"><strong id="nodo-buffer-tramas">-- tramas</strong></p>
                                </div>
                                <div className="paso-accion">
                                    <button type="button" id="btn-forzar-sync" className="btn-modal btn-modal-cancelar">
                                        Forzar Sincronización Ahora
                                    </button>
                                </div>
                            </div>
                        </fieldset>

                        <footer className="acciones-card">
                            <button type="submit" className="btn-modal btn-modal-activar">
                                Guardar Política de Buffer
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
                                        <td><strong>GPIO 4</strong></td>
                                        <td>ADC1</td>
                                        <td>Sensor pH DFRobot Gravity V2.0</td>
                                        <td><span className="celda-estado estado-normal"><span className="punto-estado" aria-hidden="true"></span><span>Asignado</span></span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>GPIO 5</strong></td>
                                        <td>ADC1</td>
                                        <td>Sensor EC / TDS V1.0</td>
                                        <td><span className="celda-estado estado-normal"><span className="punto-estado" aria-hidden="true"></span><span>Asignado</span></span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>GPIO 6</strong></td>
                                        <td>Digital 1-Wire</td>
                                        <td>Sensor Temperatura y Humedad DHT22</td>
                                        <td><span className="celda-estado estado-normal"><span className="punto-estado" aria-hidden="true"></span><span>Asignado</span></span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>GPIO 10, 11, 12, 13</strong></td>
                                        <td>Bus SPI</td>
                                        <td>Sonda PT100 (Pendiente módulo)</td>
                                        <td><span className="celda-estado estado-advertencia"><span className="punto-estado" aria-hidden="true"></span><span>Reservado</span></span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>GPIO 14, 15, 16, 17</strong></td>
                                        <td>Salida Digital</td>
                                        <td>Módulo Relay 4 Canales HW-316 (5V Active LOW)</td>
                                        <td><span className="celda-estado estado-normal"><span className="punto-estado" aria-hidden="true"></span><span>Asignado</span></span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>GPIO 0, 45, 46</strong></td>
                                        <td>Sistema</td>
                                        <td>Pines Strapping de arranque</td>
                                        <td><span className="celda-estado estado-advertencia"><span className="punto-estado" aria-hidden="true"></span><span>Advertencia</span></span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>GPIO 19, 20</strong></td>
                                        <td>USB OTG</td>
                                        <td>USB Nativo D- / D+</td>
                                        <td><span className="celda-estado estado-advertencia"><span className="punto-estado" aria-hidden="true"></span><span>Advertencia</span></span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>GPIO 43, 44</strong></td>
                                        <td>UART0</td>
                                        <td>Consola Serial de Depuración</td>
                                        <td><span className="celda-estado estado-advertencia"><span className="punto-estado" aria-hidden="true"></span><span>Advertencia</span></span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>GPIO 26 – 32</strong></td>
                                        <td>Flash SPI</td>
                                        <td>Reservados Flash SPI Interna</td>
                                        <td><span className="celda-estado estado-critico"><span className="punto-estado" aria-hidden="true"></span><span>Bloqueado de Fábrica</span></span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>GPIO 35, 36, 37</strong></td>
                                        <td>PSRAM Octal</td>
                                        <td>Ocupados por PSRAM Octal</td>
                                        <td><span className="celda-estado estado-critico"><span className="punto-estado" aria-hidden="true"></span><span>Bloqueado de Fábrica</span></span></td>
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
