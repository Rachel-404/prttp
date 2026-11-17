import React, { useEffect } from "react";
import Layout from "../components/Layout";
import usePageStyles from "../components/usePageStyles";
import initCtrl1 from "../controllers/ph.js";

const PAGE_CSS = ["/css/ph.css"];

export default function SensorPh() {
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
                <h1>Configuración del Sensor de pH</h1>
                <p className="subtitulo-modulo">Umbrales de acidez, calibración de dos puntos y comunicación RS485 Modbus.</p>
            </header>
            <div className="ordenar-div">

            
            <div className="card">
                
                <header className="titulo-card">
                    <h3>Alertas y Control del Cultivo</h3>
                    <button type="button" id="btn-estado" className="txt-descr activo" aria-pressed="true" aria-live="polite">
                        <span id="estado">Activo</span>
                    </button>
                </header>

                <form id="form-control-cultivo" className="cuerpo-card" noValidate>
                    
                    <div className="grupo-campo">
                        <label htmlFor="frecuencia-lectura" className="etiqueta-campo">Frecuencia de Lectura</label>
                        <select id="frecuencia-lectura" name="frecuenciaLectura" className="campo-control" defaultValue="10">
                            <option value="5">Cada 5 segundos</option>
                            <option value="10">Cada 10 segundos</option>
                            <option value="30">Cada 30 segundos</option>
                            <option value="60">Cada 1 minuto</option>
                            <option value="300">Cada 5 minutos</option>
                        </select>
                    </div>

                    
                    <div className="fila-limites">
                        <div className="grupo-campo">
                            <label htmlFor="ph-minimo" className="etiqueta-campo">pH Mínimo (Ácido)</label>
                            <input type="number" id="ph-minimo" name="phMinimo" className="campo-control" min="0.00" max="14.00" step="0.01" defaultValue="5.50" required />
                        </div>

                        <div className="grupo-campo">
                            <label htmlFor="ph-maximo" className="etiqueta-campo">pH Máximo (Alcalino)</label>
                            <input type="number" id="ph-maximo" name="phMaximo" className="campo-control" min="0.00" max="14.00" step="0.01" defaultValue="6.50" required />
                        </div>

                        <div className="grupo-campo">
                            <label htmlFor="temp-maxima" className="etiqueta-campo">Temp. Máxima Agua (°C)</label>
                            <input type="number" id="temp-maxima" name="tempMaxima" className="campo-control" min="0.0" max="50.0" step="0.1" defaultValue="24.0" required />
                        </div>
                    </div>

                    
                    <div className="fila-switch">
                        <label htmlFor="btn-compensacion" className="etiqueta-campo">Compensación Térmica Automática</label>
                        <button type="button" id="btn-compensacion" className="txt-descr activo" aria-pressed="true">
                            <span id="texto-compensacion">Activada</span>
                        </button>
                    </div>

                    <p id="error-control-cultivo" className="mensaje-error-form" role="alert" hidden></p>

                    
                    <footer className="acciones-card">
                        <button type="submit" id="btn-guardar-control" className="btn-modal btn-modal-activar">
                            Guardar Configuración
                        </button>
                    </footer>
                </form>
            </div>

            
            <div className="card">
                <header className="titulo-card">
                    <h3>Calibración del pH</h3>
                </header>

                <div className="cuerpo-card">
                    
                    <div className="registro-mantenimiento">
                        <p className="texto-registro">
                            Última calibración realizada: <strong id="ultima-calibracion" aria-live="polite">Hace 12 días</strong>
                        </p>
                        <p className="texto-guia">Se recomienda recalibrar cada 30 días.</p>
                        <p className="texto-registro">
                            Estado Modbus: <strong>OK</strong> | Último Error CRC: <strong>0x0000</strong>
                        </p>
                    </div>

                    
                    <div className="paso-calibracion">
                        <div className="paso-info">
                            <p className="etiqueta-campo">Paso 1: Líquido Neutro (pH 6.86)</p>
                            <p className="texto-guia">
                                Sumerge la sonda limpia en la solución buffer neutra (sobre verde pH 6.86) y espera 1 minuto a que se estabilice la lectura.
                            </p>
                        </div>
                        <div className="paso-accion">
                            <button type="button" id="btn-calibrar-neutro" className="btn-modal btn-modal-activar">
                                Calibrar Punto Neutro
                            </button>
                        </div>
                    </div>

                    
                    <div className="paso-calibracion">
                        <div className="paso-info">
                            <div className="grupo-campo">
                                <label htmlFor="select-buffer-segundo" className="etiqueta-campo">Paso 2: Líquido Ácido o Alcalino</label>
                                <select id="select-buffer-segundo" className="campo-control">
                                    <option value="4.00">Sobre Rojo (Ácido - pH 4.00)</option>
                                    <option value="9.18">Sobre Azul (Alcalino - pH 9.18)</option>
                                </select>
                            </div>
                            <p className="texto-guia">
                                Enjuaga la sonda con agua destilada, sumérgela en el sobre seleccionado y espera 1 minuto antes de confirmar.
                            </p>
                        </div>
                        <div className="paso-accion">
                            <button type="button" id="btn-calibrar-segundo" className="btn-modal btn-modal-activar">
                                Calibrar Segundo Punto
                            </button>
                        </div>
                    </div>

                    
                    <div className="subseccion-tecnica">
                        <p className="subtitulo-tecnico">Calibración de 3 Puntos</p>
                        <div className="fila-limites">
                            <div className="grupo-campo">
                                <label htmlFor="ph-cal-400" className="etiqueta-campo">Calibración pH 4.00</label>
                                <input type="number" id="ph-cal-400" name="calPh400" className="campo-control" min="0" max="14" step="0.01" defaultValue="4.00" />
                            </div>
                            <div className="grupo-campo">
                                <label htmlFor="ph-cal-686" className="etiqueta-campo">Calibración pH 6.86</label>
                                <input type="number" id="ph-cal-686" name="calPh686" className="campo-control" min="0" max="14" step="0.01" defaultValue="6.86" />
                            </div>
                            <div className="grupo-campo">
                                <label htmlFor="ph-cal-918" className="etiqueta-campo">Calibración pH 9.18</label>
                                <input type="number" id="ph-cal-918" name="calPh918" className="campo-control" min="0" max="14" step="0.01" defaultValue="9.18" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            
            <div className="card card-tecnica-abierta" id="bloque-tecnico">
                <header className="titulo-card">
                    <h3>Configuración Técnica y Conexión (Solo Técnicos)</h3>
                </header>

                <form id="form-tecnico-ph" className="cuerpo-card" noValidate>

                            
                            <fieldset className="subseccion-tecnica">
                                <legend className="subtitulo-tecnico subtitulo-con-ayuda">
                                    <span>Subsección A: Hardware y Conexión Física al ESP32-S3</span>
                                    <div className="ayuda-contextual">
                                        <button type="button" className="btn-ayuda-campo" aria-expanded="false" aria-controls="ayuda-electrica" aria-label="Verificación eléctrica de conexión">
                                            <span className="material-symbols-outlined" aria-hidden="true">help</span>
                                        </button>
                                        <div id="ayuda-electrica" className="popover-ayuda" role="region" hidden>
                                            <p className="etiqueta-campo">Verificación Eléctrica (Solo lectura)</p>
                                            <ul className="lista-checklist">
                                                <li className="texto-guia">
                                                    <strong>Alimentación:</strong> Cable Marrón (VCC) a fuente 12V DC y Cable Negro a GND.
                                                </li>
                                                <li className="texto-guia">
                                                    <strong>Referencia:</strong> Tierra (GND) de la fuente de 12V unida al GND del ESP32-S3.
                                                </li>
                                                <li className="texto-guia">
                                                    <strong>Bus RS485:</strong> Cable Amarillo (485-A) al terminal A y Cable Azul (485-B) al terminal B del conversor.
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </legend>

                                <div className="grid-tecnico-hardware">
                                    <div className="grupo-campo">
                                        <label htmlFor="tec-uart" className="etiqueta-campo">Puerto Serial (UART)</label>
                                        <select id="tec-uart" name="uart" className="campo-control" defaultValue="UART1">
                                            <option value="UART1">UART1</option>
                                            <option value="UART2">UART2</option>
                                        </select>
                                    </div>

                                    <div className="grupo-campo">
                                        <label htmlFor="tec-pin-rx" className="etiqueta-campo">Pin Recepción (RX) - GPIO</label>
                                        <input type="number" id="tec-pin-rx" name="pinRx" className="campo-control" min="0" max="48" step="1" defaultValue="18" required />
                                    </div>

                                    <div className="grupo-campo">
                                        <label htmlFor="tec-pin-tx" className="etiqueta-campo">Pin Transmisión (TX) - GPIO</label>
                                        <input type="number" id="tec-pin-tx" name="pinTx" className="campo-control" min="0" max="48" step="1" defaultValue="17" required />
                                    </div>

                                    <div className="grupo-campo">
                                        <label htmlFor="tec-pin-dere" className="etiqueta-campo">Pin Control de Flujo (DE/RE) - GPIO</label>
                                        <input type="number" id="tec-pin-dere" name="pinDeRe" className="campo-control" min="0" max="48" step="1" defaultValue="21" required />
                                    </div>
                                </div>

                                <div className="grupo-campo">
                                    <span className="etiqueta-campo">Verificación de Seguridad Física</span>
                                    <ul className="lista-checklist">
                                        <li className="texto-guia">
                                            <label>
                                                <input type="checkbox" name="chkFuente12v" />
                                                <span>Fuente externa de 12 V activa (10–30 VDC)</span>
                                            </label>
                                        </li>
                                        <li className="texto-guia">
                                            <label>
                                                <input type="checkbox" name="chkTierraComun" />
                                                <span>Tierra común (GND) conectada entre fuente, ESP32-S3 y transceptor</span>
                                            </label>
                                        </li>
                                        <li className="texto-guia">
                                            <label>
                                                <input type="checkbox" name="chkParDiferencial" />
                                                <span>Par diferencial verificado (Amarillo 485-A / Azul 485-B)</span>
                                            </label>
                                        </li>
                                    </ul>
                                </div>
                            </fieldset>

                            
                            <fieldset className="subseccion-tecnica">
                                <legend className="subtitulo-tecnico">Parámetros de Comunicación Modbus RTU</legend>

                                <div className="grid-tecnico-modbus">
                                    <div className="grupo-campo">
                                        <label htmlFor="tec-slave-id" className="etiqueta-campo">Dirección Modbus / Slave ID</label>
                                        <input type="number" id="tec-slave-id" name="slaveId" className="campo-control" min="1" max="247" step="1" defaultValue="1" required />
                                    </div>

                                    <div className="grupo-campo">
                                        <label htmlFor="tec-baud-rate" className="etiqueta-campo">Baudios</label>
                                        <select id="tec-baud-rate" name="baudRate" className="campo-control" defaultValue="9600">
                                            <option value="9600">9600 bps</option>
                                            <option value="19200">19200 bps</option>
                                            <option value="115200">115200 bps</option>
                                        </select>
                                    </div>

                                    <div className="grupo-campo">
                                        <label htmlFor="tec-paridad" className="etiqueta-campo">Paridad</label>
                                        <select id="tec-paridad" name="paridad" className="campo-control" defaultValue="None">
                                            <option value="None">None</option>
                                            <option value="Even">Even</option>
                                            <option value="Odd">Odd</option>
                                        </select>
                                    </div>

                                    <div className="grupo-campo">
                                        <label htmlFor="tec-stop-bits" className="etiqueta-campo">Stop Bits</label>
                                        <select id="tec-stop-bits" name="stopBits" className="campo-control" defaultValue="1">
                                            <option value="1">1</option>
                                            <option value="2">2</option>
                                        </select>
                                    </div>

                                    <div className="grupo-campo">
                                        <div className="etiqueta-con-ayuda">
                                            <label htmlFor="tec-timeout" className="etiqueta-campo">Timeout de Respuesta (ms)</label>
                                            <div className="ayuda-contextual">
                                                <button type="button" className="btn-ayuda-campo" aria-expanded="false" aria-controls="ayuda-timeout" aria-label="Información sobre Timeout de Respuesta">
                                                    <span className="material-symbols-outlined" aria-hidden="true">help</span>
                                                </button>
                                                <div id="ayuda-timeout" className="popover-ayuda" role="region" hidden>
                                                    <p className="texto-guia">El sensor tarda hasta 1000 ms en responder.</p>
                                                </div>
                                            </div>
                                        </div>
                                        <input type="number" id="tec-timeout" name="timeoutMs" className="campo-control" min="100" max="10000" step="50" defaultValue="1200" required />
                                    </div>

                                    <div className="grupo-campo">
                                        <label htmlFor="tec-reintentos" className="etiqueta-campo">Reintentos ante fallo</label>
                                        <input type="number" id="tec-reintentos" name="reintentos" className="campo-control" min="0" max="10" step="1" defaultValue="3" required />
                                    </div>
                                </div>
                            </fieldset>

                            
                            <fieldset className="subseccion-tecnica">
                                <legend className="subtitulo-tecnico">Subsección C: Mapa de Registros y Escala Interna</legend>

                                <div className="grid-tecnico-registros">
                                    <div className="grupo-campo">
                                        <label htmlFor="tec-reg-ph" className="etiqueta-campo">Registro de Lectura pH</label>
                                        <input type="text" id="tec-reg-ph" name="registroPh" className="campo-control" defaultValue="0x0000" required />
                                    </div>

                                    <div className="grupo-campo">
                                        <div className="etiqueta-con-ayuda">
                                            <label htmlFor="tec-div-ph" className="etiqueta-campo">Factor Divisor pH</label>
                                            <div className="ayuda-contextual">
                                                <button type="button" className="btn-ayuda-campo" aria-expanded="false" aria-controls="ayuda-divisor-ph" aria-label="Información sobre Factor Divisor pH">
                                                    <span className="material-symbols-outlined" aria-hidden="true">help</span>
                                                </button>
                                                <div id="ayuda-divisor-ph" className="popover-ayuda popover-ayuda-izq" role="region" hidden>
                                                    <p className="texto-guia">Mantiene resolución de 0.01 pH.</p>
                                                </div>
                                            </div>
                                        </div>
                                        <input type="number" id="tec-div-ph" name="divisorPh" className="campo-control" min="1" step="1" defaultValue="100" required />
                                    </div>

                                    <div className="grupo-campo">
                                        <label htmlFor="tec-reg-temp" className="etiqueta-campo">Registro de Lectura Temperatura</label>
                                        <input type="text" id="tec-reg-temp" name="registroTemp" className="campo-control" defaultValue="0x0001" required />
                                    </div>

                                    <div className="grupo-campo">
                                        <label htmlFor="tec-div-temp" className="etiqueta-campo">Factor Divisor Temperatura</label>
                                        <input type="number" id="tec-div-temp" name="divisorTemp" className="campo-control" min="1" step="1" defaultValue="10" required />
                                    </div>

                                    <div className="grupo-campo">
                                        <label htmlFor="tec-reg-cal" className="etiqueta-campo">Registro Comando Calibración (0x0120)</label>
                                        <input type="text" id="tec-reg-cal" name="registroCalibracion" className="campo-control" defaultValue="0x0120" required />
                                    </div>

                                    <div className="grupo-campo">
                                        <label htmlFor="tec-reg-patron" className="etiqueta-campo">Registro pH Patrón (0x0121)</label>
                                        <input type="text" id="tec-reg-patron" name="registroPhPatron" className="campo-control" defaultValue="0x0121" required />
                                    </div>

                                    <div className="grupo-campo">
                                        <label htmlFor="tec-reg-slave" className="etiqueta-campo">Registro Dirección Slave ID (0x07D0)</label>
                                        <input type="text" id="tec-reg-slave" name="registroSlaveId" className="campo-control" defaultValue="0x07D0" required />
                                    </div>

                                    <div className="grupo-campo">
                                        <label htmlFor="tec-reg-baud" className="etiqueta-campo">Registro Baud Rate (0x07D1)</label>
                                        <input type="text" id="tec-reg-baud" name="registroBaudRate" className="campo-control" defaultValue="0x07D1" required />
                                    </div>
                                </div>
                            </fieldset>

                            <p id="error-tecnico-ph" className="mensaje-error-form" role="alert" hidden></p>

                            
                            <footer className="acciones-card acciones-tecnicas">
                                <button type="button" id="btn-restaurar-fabrica" className="btn-modal btn-modal-cancelar">
                                    Restaurar valores de fábrica
                                </button>
                                <button type="submit" id="btn-guardar-tecnico" className="btn-modal btn-modal-activar">
                                    Guardar Configuración Técnica
                                </button>
                            </footer>

                        </form>
            </div>

            </div>
        
      </Layout>


    
    <div id="modal-confirmacion-ph" className="modal-overlay" hidden>
        <div className="modal-caja" role="dialog" aria-modal="true" aria-live="polite" aria-labelledby="modal-ph-titulo" aria-describedby="modal-ph-mensaje">
            <h4 id="modal-ph-titulo" className="modal-titulo"></h4>
            <p id="modal-ph-mensaje" className="modal-mensaje"></p>
            <footer className="modal-acciones">
                <button type="button" id="btn-modal-cancelar" className="btn-modal btn-modal-cancelar">Cancelar</button>
                <button type="button" id="btn-modal-aceptar" className="btn-modal btn-modal-pausar">Aceptar</button>
            </footer>
        </div>
    </div>

    
    <div id="toast-ph" className="toast-notificacion" role="status" aria-live="polite" hidden></div>

    
    </>
  );
}
