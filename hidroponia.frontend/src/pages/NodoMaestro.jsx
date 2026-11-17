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
                <h1>Controlador Maestro ESP32-S3 (N16R8)</h1>
                <p className="subtitulo-modulo">Gestión de conectividad inalámbrica, transporte de telemetría, buffer offline LittleFS y matriz de pines GPIO.</p>
            </header>

            
            <section className="grid-tecnico-cuatro telemetria-nodo-grid" aria-label="Telemetría de salud del controlador">
                <div className="tarjeta-metrica-contraste">
                    <span className="etiqueta-metrica-contraste">Estado de Red</span>
                    <strong className="valor-metrica-contraste valor-metrica-normal">Conectado (Wi-Fi -58 dBm)</strong>
                </div>

                <div className="tarjeta-metrica-contraste">
                    <span className="etiqueta-metrica-contraste">Alimentación y Consumo</span>
                    <strong className="valor-metrica-contraste">5V USB-C (~160 mA en TX)</strong>
                </div>

                <div className="tarjeta-metrica-contraste">
                    <span className="etiqueta-metrica-contraste">Memoria Flash (LittleFS 16 MB)</span>
                    <strong className="valor-metrica-contraste">24% Ocupado (10 MB asignados a Buffer)</strong>
                </div>

                <div className="tarjeta-metrica-contraste">
                    <span className="etiqueta-metrica-contraste">Memoria PSRAM (8 MB)</span>
                    <strong className="valor-metrica-contraste">12% Ocupado (Caché FIFO activa)</strong>
                </div>
            </section>

            <div className="ordenar-div">

                
                <div className="card">
                    <header className="titulo-card">
                        <h3>Conectividad Wi-Fi, BLE y Transporte de Datos</h3>
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

                            <div className="fila-switch">
                                <label htmlFor="btn-ble-switch" className="etiqueta-campo">Aprovisionamiento Bluetooth 5 LE</label>
                                <button type="button" id="btn-ble-switch" className="txt-descr activo" aria-pressed="true">
                                    <span id="texto-ble-switch">Activo</span>
                                </button>
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
                            <legend className="subtitulo-tecnico">Protocolo de Transporte</legend>

                            <div className="fila-dos-cols">
                                <div className="grupo-campo">
                                    <label htmlFor="nodo-protocolo" className="etiqueta-campo">Protocolo</label>
                                    <select id="nodo-protocolo" name="protocolo" className="campo-control" defaultValue="mqtt">
                                        <option value="mqtt">MQTT</option>
                                        <option value="http">HTTP / REST</option>
                                        <option value="ws">WebSocket</option>
                                    </select>
                                </div>

                                <div className="grupo-campo">
                                    <label htmlFor="nodo-puerto" className="etiqueta-campo">Puerto</label>
                                    <input type="number" id="nodo-puerto" name="puerto" className="campo-control" min="1" max="65535" defaultValue="8883" required />
                                </div>
                            </div>

                            <div className="grupo-campo">
                                <label htmlFor="nodo-broker-url" className="etiqueta-campo">Servidor / Broker URL</label>
                                <input type="text" id="nodo-broker-url" name="brokerUrl" className="campo-control" defaultValue="mqtts://broker.axion-iot.local" required />
                            </div>

                            <div className="grupo-campo">
                                <label htmlFor="nodo-endpoint" className="etiqueta-campo">Tópico Principal / Endpoint</label>
                                <input type="text" id="nodo-endpoint" name="endpoint" className="campo-control" defaultValue="axion/hidroponia/telemetria" required />
                            </div>

                            <div className="fila-dos-cols">
                                <div className="grupo-campo">
                                    <label htmlFor="nodo-usuario" className="etiqueta-campo">Usuario</label>
                                    <input type="text" id="nodo-usuario" name="usuario" className="campo-control" defaultValue="esp32_nodo_01" />
                                </div>

                                <div className="grupo-campo">
                                    <label htmlFor="nodo-pass-transporte" className="etiqueta-campo">Contraseña</label>
                                    <input type="password" id="nodo-pass-transporte" name="passTransporte" className="campo-control" defaultValue="********" />
                                </div>
                            </div>

                            <label className="item-checkbox-variable" htmlFor="nodo-tls">
                                <input type="checkbox" id="nodo-tls" name="habilitarTls" defaultChecked />
                                <span>Habilitar Cifrado TLS / SSL</span>
                            </label>
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
                        <h3>Temporización y Buffer Offline (LittleFS)</h3>
                    </header>

                    <form id="form-buffer-nodo" className="cuerpo-card" noValidate>
                        <div className="fila-dos-cols">
                            <div className="grupo-campo">
                                <label htmlFor="nodo-muestreo" className="etiqueta-campo">Frecuencia Global de Muestreo (segundos)</label>
                                <input type="number" id="nodo-muestreo" name="muestreoSeg" className="campo-control" min="1" max="3600" defaultValue="2" required />
                            </div>

                            <div className="grupo-campo">
                                <label htmlFor="nodo-envio" className="etiqueta-campo">Frecuencia de Envío al Servidor (segundos)</label>
                                <input type="number" id="nodo-envio" name="envioSeg" className="campo-control" min="1" max="3600" defaultValue="10" required />
                            </div>
                        </div>

                        <fieldset className="subseccion-tecnica">
                            <legend className="subtitulo-tecnico">Cola Circular Offline (Tolerancia a fallos 72 h)</legend>

                            <div className="fila-dos-cols">
                                <div className="grupo-campo">
                                    <label htmlFor="nodo-particion" className="etiqueta-campo">Tamaño de Partición LittleFS (MB)</label>
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
                                    <label htmlFor="nodo-lote" className="etiqueta-campo">Tamaño de Lote de Sincronización (tramas)</label>
                                    <input type="number" id="nodo-lote" name="loteTramas" className="campo-control" min="1" max="500" defaultValue="50" required />
                                </div>

                                <div className="grupo-campo">
                                    <label htmlFor="nodo-desbordamiento" className="etiqueta-campo">Política de Desbordamiento</label>
                                    <select id="nodo-desbordamiento" name="politicaDesbordamiento" className="campo-control" defaultValue="fifo">
                                        <option value="fifo">Sobrescribir tramas más antiguas (FIFO) y alertar</option>
                                        <option value="detener">Detener captura al llenar partición</option>
                                    </select>
                                </div>
                            </div>

                            <div className="paso-calibracion">
                                <div className="paso-info">
                                    <span className="etiqueta-campo">Tramas pendientes en buffer</span>
                                    <p className="texto-registro"><strong>0 tramas (0% de ocupación)</strong></p>
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
                        <h3>Pinout Manager Interactivo (ESP32-S3-WROOM-1 N16R8)</h3>
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
                                        <td><strong>GPIO 1</strong></td>
                                        <td>ADC1</td>
                                        <td>Sensor EC / TDS</td>
                                        <td><span className="celda-estado estado-normal"><span className="punto-estado" aria-hidden="true"></span><span>Asignado</span></span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>GPIO 2</strong></td>
                                        <td>ADC1</td>
                                        <td>Transmisor de Nivel de Agua</td>
                                        <td><span className="celda-estado estado-normal"><span className="punto-estado" aria-hidden="true"></span><span>Asignado</span></span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>GPIO 4</strong></td>
                                        <td>Digital 1-Wire</td>
                                        <td>Sensor Temperatura y Humedad DHT22</td>
                                        <td><span className="celda-estado estado-normal"><span className="punto-estado" aria-hidden="true"></span><span>Asignado</span></span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>GPIO 10, 11, 12, 13</strong></td>
                                        <td>Bus SPI</td>
                                        <td>Sonda PT100 (Digitalizador MAX31865)</td>
                                        <td><span className="celda-estado estado-normal"><span className="punto-estado" aria-hidden="true"></span><span>Asignado</span></span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>GPIO 17, 18, 21</strong></td>
                                        <td>UART1 / RS485</td>
                                        <td>Sensor pH RS485 (TX, RX, DE/RE)</td>
                                        <td><span className="celda-estado estado-normal"><span className="punto-estado" aria-hidden="true"></span><span>Asignado</span></span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>GPIO 5, 6, 7, 15, 16, 47</strong></td>
                                        <td>Salida Digital</td>
                                        <td>Módulo de 6 Relés (Actuadores)</td>
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
                                        <td>Ocupados por PSRAM Octal (8 MB)</td>
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
