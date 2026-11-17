import React, { useEffect } from "react";
import Layout from "../components/Layout";
import usePageStyles from "../components/usePageStyles";
import initCtrl1 from "../controllers/temperatura.js";

const PAGE_CSS = ["/css/temperatura.css"];

export default function SensorTemperatura() {
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

            <header className="encabezado-modulo">
                <h1>Configuración del Sensor de Temperatura del Agua (PT100)</h1>
                <p className="subtitulo-modulo">Alertas térmicas de la solución nutritiva, compensación cruzada y parámetros RTD.</p>
            </header>
            <div className="ordenar-div">

                
                <div className="card">
                    <header className="titulo-card">
                        <h3>Alertas y Control del Cultivo</h3>
                        <button type="button" id="btn-estado-temp" className="txt-descr activo" aria-pressed="true" aria-live="polite">
                            <span id="estado-temp">Activo</span>
                        </button>
                    </header>

                    <form id="form-control-temp" className="cuerpo-card" noValidate>
                        
                        <div className="grupo-campo">
                            <label htmlFor="frecuencia-lectura-temp" className="etiqueta-campo">Frecuencia de Lectura</label>
                            <select id="frecuencia-lectura-temp" name="frecuenciaLectura" className="campo-control" defaultValue="10">
                                <option value="5">Cada 5 segundos</option>
                                <option value="10">Cada 10 segundos</option>
                                <option value="30">Cada 30 segundos</option>
                                <option value="60">Cada 1 minuto</option>
                                <option value="300">Cada 5 minutos</option>
                            </select>
                        </div>

                        
                        <div className="fila-dos-cols">
                            <div className="grupo-campo">
                                <div className="etiqueta-con-ayuda">
                                    <label htmlFor="temp-minimo-agua" className="etiqueta-campo">Temp. Mínima Agua (°C)</label>
                                    <div className="ayuda-contextual">
                                        <button type="button" className="btn-ayuda-campo" aria-expanded="false" aria-controls="ayuda-temp-min" aria-label="Información sobre Temp. Mínima Agua">
                                            <span className="material-symbols-outlined" aria-hidden="true">help</span>
                                        </button>
                                        <div id="ayuda-temp-min" className="popover-ayuda" role="region" hidden>
                                            <p className="texto-guia">Evita estrés por frío en las raíces (rango físico PT100: 0 a 400 °C).</p>
                                        </div>
                                    </div>
                                </div>
                                <input type="number" id="temp-minimo-agua" name="tempMinimaAgua" className="campo-control" min="0.0" max="400.0" step="0.1" defaultValue="18.0" required />
                            </div>

                            <div className="grupo-campo">
                                <div className="etiqueta-con-ayuda">
                                    <label htmlFor="temp-maximo-agua" className="etiqueta-campo">Temp. Máxima Agua (°C)</label>
                                    <div className="ayuda-contextual">
                                        <button type="button" className="btn-ayuda-campo" aria-expanded="false" aria-controls="ayuda-temp-max" aria-label="Información sobre Temp. Máxima Agua">
                                            <span className="material-symbols-outlined" aria-hidden="true">help</span>
                                        </button>
                                        <div id="ayuda-temp-max" className="popover-ayuda popover-ayuda-izq" role="region" hidden>
                                            <p className="texto-guia">Previene pudrición de raíz y falta de oxígeno disuelto.</p>
                                        </div>
                                    </div>
                                </div>
                                <input type="number" id="temp-maximo-agua" name="tempMaximaAgua" className="campo-control" min="0.0" max="400.0" step="0.1" defaultValue="24.0" required />
                            </div>
                        </div>

                        
                        <div className="fila-switch">
                            <div className="etiqueta-con-ayuda">
                                <label htmlFor="btn-compensar-otros" className="etiqueta-campo">Compensar temperatura a otros sensores (EC y pH)</label>
                                <div className="ayuda-contextual">
                                    <button type="button" className="btn-ayuda-campo" aria-expanded="false" aria-controls="ayuda-temp-sync" aria-label="Información sobre sincronización térmica">
                                        <span className="material-symbols-outlined" aria-hidden="true">help</span>
                                    </button>
                                    <div id="ayuda-temp-sync" className="popover-ayuda" role="region" hidden>
                                        <p className="texto-guia">Provee la temperatura real del agua en tiempo real para corregir las lecturas de conductividad (TDS V1.0) y pH.</p>
                                    </div>
                                </div>
                            </div>
                            <button type="button" id="btn-compensar-otros" className="txt-descr activo" aria-pressed="true" aria-live="polite">
                                <span id="texto-compensar-otros">Activada</span>
                            </button>
                        </div>

                        <p id="error-control-temp" className="mensaje-error-form" role="alert" hidden></p>

                        
                        <footer className="acciones-card">
                            <button type="submit" id="btn-guardar-control-temp" className="btn-modal btn-modal-activar">
                                Guardar Configuración
                            </button>
                        </footer>
                    </form>
                </div>

                
                <div className="card">
                    <header className="titulo-card">
                        <h3>Calibración de Temperatura</h3>
                    </header>

                    <div className="cuerpo-card">
                        
                        <div className="registro-mantenimiento">
                            <p className="texto-registro">
                                Última calibración realizada: <strong id="ultima-calibracion-temp" aria-live="polite">Hace 15 días</strong>
                            </p>
                            <p className="texto-guia">Se recomienda verificar cada 60 días.</p>
                        </div>

                        
                        <div className="paso-calibracion">
                            <div className="paso-info">
                                <p className="etiqueta-campo">Ajuste de Desviación (Offset)</p>
                                <p className="texto-guia">
                                    Si al comparar con un termómetro patrón certificado notas una diferencia fija, ingresa el valor de corrección en grados Celsius.
                                </p>

                                <div className="fila-calibracion-temp">
                                    <div className="grupo-campo campo-calibracion-temp">
                                        <label htmlFor="offset-temp-calibracion" className="etiqueta-campo">Desviación / Offset (°C)</label>
                                        <input type="number" id="offset-temp-calibracion" name="offsetTemperatura" className="campo-control" min="-20.0" max="20.0" step="0.1" defaultValue="0.0" required />
                                    </div>
                                    <div className="paso-accion">
                                        <button type="button" id="btn-aplicar-ajuste-temp" className="btn-modal btn-modal-activar">
                                            Aplicar Ajuste
                                        </button>
                                    </div>
                                </div>

                                <p id="error-calibracion-temp" className="mensaje-error-form" role="alert" hidden></p>
                            </div>
                        </div>
                    </div>
                </div>

                
                <div className="card card-tecnica-abierta" id="bloque-tecnico-temp">
                    <header className="titulo-card">
                        <h3>Configuración Técnica y Conexión (Solo Técnicos)</h3>
                    </header>

                    <form id="form-tecnico-temp" className="cuerpo-card" noValidate>

                                
                                <fieldset className="subseccion-tecnica">
                                    <legend className="subtitulo-tecnico">Subsección A: Cableado e Interfaz con ESP32-S3</legend>

                                    <div className="grid-tecnico-tres">
                                        <div className="grupo-campo">
                                            <label htmlFor="tec-temp-conexion" className="etiqueta-campo">Tipo de Conexión</label>
                                            <select id="tec-temp-conexion" name="tipoConexion" className="campo-control" defaultValue="3_hilos">
                                                <option value="3_hilos">3 hilos (Compensación de cable)</option>
                                            </select>
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="tec-temp-longitud" className="etiqueta-campo">Longitud del Cable Instalado</label>
                                            <select id="tec-temp-longitud" name="longitudCable" className="campo-control" defaultValue="2m">
                                                <option value="1m">1m</option>
                                                <option value="2m">2m</option>
                                                <option value="3m">3m</option>
                                            </select>
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="tec-temp-interfaz" className="etiqueta-campo">Interfaz / Módulo Lector</label>
                                            <select id="tec-temp-interfaz" name="interfazLector" className="campo-control" defaultValue="SPI_MAX31865">
                                                <option value="SPI_MAX31865">SPI - Digitalizador MAX31865</option>
                                                <option value="ANALOG_ADC">Transmisor Analógico (ADC)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div id="grupo-temp-spi" className="grid-tecnico-cuatro">
                                        <div className="grupo-campo">
                                            <label htmlFor="tec-temp-pin-cs" className="etiqueta-campo">Pin CS</label>
                                            <select id="tec-temp-pin-cs" name="pinCs" className="campo-control" defaultValue="GPIO5">
                                                <option value="GPIO5">GPIO 5</option>
                                                <option value="GPIO10">GPIO 10</option>
                                                <option value="GPIO15">GPIO 15</option>
                                            </select>
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="tec-temp-pin-mosi" className="etiqueta-campo">Pin MOSI</label>
                                            <select id="tec-temp-pin-mosi" name="pinMosi" className="campo-control" defaultValue="GPIO23">
                                                <option value="GPIO11">GPIO 11</option>
                                                <option value="GPIO23">GPIO 23</option>
                                                <option value="GPIO35">GPIO 35</option>
                                            </select>
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="tec-temp-pin-miso" className="etiqueta-campo">Pin MISO</label>
                                            <select id="tec-temp-pin-miso" name="pinMiso" className="campo-control" defaultValue="GPIO19">
                                                <option value="GPIO13">GPIO 13</option>
                                                <option value="GPIO19">GPIO 19</option>
                                                <option value="GPIO37">GPIO 37</option>
                                            </select>
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="tec-temp-pin-sck" className="etiqueta-campo">Pin SCK</label>
                                            <select id="tec-temp-pin-sck" name="pinSck" className="campo-control" defaultValue="GPIO18">
                                                <option value="GPIO12">GPIO 12</option>
                                                <option value="GPIO18">GPIO 18</option>
                                                <option value="GPIO36">GPIO 36</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div id="grupo-temp-adc" className="fila-dos-cols" hidden>
                                        <div className="grupo-campo">
                                            <label htmlFor="tec-temp-canal-adc" className="etiqueta-campo">Canal ADC1</label>
                                            <select id="tec-temp-canal-adc" name="canalAdc1" className="campo-control" defaultValue="GPIO1">
                                                <option value="GPIO1">GPIO 1 (ADC1)</option>
                                                <option value="GPIO2">GPIO 2 (ADC1)</option>
                                                <option value="GPIO3">GPIO 3 (ADC1)</option>
                                                <option value="GPIO4">GPIO 4 (ADC1)</option>
                                                <option value="GPIO5">GPIO 5 (ADC1)</option>
                                                <option value="GPIO6">GPIO 6 (ADC1)</option>
                                                <option value="GPIO7">GPIO 7 (ADC1)</option>
                                                <option value="GPIO8">GPIO 8 (ADC1)</option>
                                                <option value="GPIO9">GPIO 9 (ADC1)</option>
                                                <option value="GPIO10">GPIO 10 (ADC1)</option>
                                            </select>
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="tec-temp-rango-adc" className="etiqueta-campo">Rango de escalamiento (°C)</label>
                                            <input type="text" id="tec-temp-rango-adc" name="rangoEscalamiento" className="campo-control" defaultValue="0 a 100 °C" />
                                        </div>
                                    </div>

                                    <div className="registro-mantenimiento" aria-label="Diagnóstico de sonda PT100">
                                        <p className="texto-registro">
                                            Estado del cable: <strong>Normal (3 hilos)</strong> | Resistencia medida: <strong>109.13 Ω</strong>
                                        </p>
                                    </div>
                                </fieldset>

                                
                                <fieldset className="subseccion-tecnica">
                                    <legend className="subtitulo-tecnico">Subsección B: Constantes Físicas del Platino (Callendar-Van Dusen) y Filtrado</legend>

                                    <div className="grid-tecnico-cuatro">
                                        <div className="grupo-campo">
                                            <label htmlFor="tec-temp-rref" className="etiqueta-campo">Resistencia de Referencia Rref (Ω)</label>
                                            <input type="number" id="tec-temp-rref" name="rrefOhmios" className="campo-control" min="100" max="1000" step="0.1" defaultValue="430.0" required />
                                        </div>

                                        <div className="grupo-campo">
                                            <div className="etiqueta-con-ayuda">
                                                <label htmlFor="tec-temp-r0" className="etiqueta-campo">Resistencia Base a 0°C R0 (Ω)</label>
                                                <div className="ayuda-contextual">
                                                    <button type="button" className="btn-ayuda-campo" aria-expanded="false" aria-controls="ayuda-temp-r0" aria-label="Información sobre Resistencia Base R0">
                                                        <span className="material-symbols-outlined" aria-hidden="true">help</span>
                                                    </button>
                                                    <div id="ayuda-temp-r0" className="popover-ayuda" role="region" hidden>
                                                        <p className="texto-guia">Estándar PT100 (100.0 Ω a 0 °C).</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <input type="number" id="tec-temp-r0" name="r0Ohmios" className="campo-control" min="50" max="1000" step="0.1" defaultValue="100.0" required />
                                        </div>

                                        <div className="grupo-campo">
                                            <div className="etiqueta-con-ayuda">
                                                <label htmlFor="tec-temp-alpha" className="etiqueta-campo">Coeficiente Térmico α</label>
                                                <div className="ayuda-contextual">
                                                    <button type="button" className="btn-ayuda-campo" aria-expanded="false" aria-controls="ayuda-temp-alpha" aria-label="Información sobre Coeficiente Térmico">
                                                        <span className="material-symbols-outlined" aria-hidden="true">help</span>
                                                    </button>
                                                    <div id="ayuda-temp-alpha" className="popover-ayuda popover-ayuda-izq" role="region" hidden>
                                                        <p className="texto-guia">Norma IEC 60751 para sondas RTD de platino (0.00385).</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <input type="number" id="tec-temp-alpha" name="coeficienteAlpha" className="campo-control" min="0.001" max="0.01" step="0.00001" defaultValue="0.00385" required />
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="tec-temp-filtro" className="etiqueta-campo">Filtro de Red Eléctrica</label>
                                            <select id="tec-temp-filtro" name="filtroRed" className="campo-control" defaultValue="60Hz">
                                                <option value="60Hz">60 Hz (Perú / América)</option>
                                                <option value="50Hz">50 Hz (Europa)</option>
                                            </select>
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="tec-temp-coef-a" className="etiqueta-campo">Coeficiente A (Callendar-Van Dusen)</label>
                                            <input type="number" id="tec-temp-coef-a" name="coeficienteA" className="campo-control" step="0.0000001" defaultValue="0.0039083" readOnly />
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="tec-temp-coef-b" className="etiqueta-campo">Coeficiente B (Callendar-Van Dusen)</label>
                                            <input type="number" id="tec-temp-coef-b" name="coeficienteB" className="campo-control" step="0.0000000001" defaultValue="-0.0000005775" readOnly />
                                        </div>
                                    </div>
                                </fieldset>

                                <p id="error-tecnico-temp" className="mensaje-error-form" role="alert" hidden></p>

                                
                                <footer className="acciones-card acciones-tecnicas">
                                    <button type="button" id="btn-restaurar-fabrica-temp" className="btn-modal btn-modal-cancelar">
                                        Restaurar valores de fábrica
                                    </button>
                                    <button type="submit" id="btn-guardar-tecnico-temp" className="btn-modal btn-modal-activar">
                                        Guardar Configuración Técnica
                                    </button>
                                </footer>

                            </form>
                </div>

            </div>
        
      </Layout>


    
    <div id="modal-confirmacion-temp" className="modal-overlay" hidden>
        <div className="modal-caja" role="dialog" aria-modal="true" aria-live="polite" aria-labelledby="modal-temp-titulo" aria-describedby="modal-temp-mensaje">
            <h4 id="modal-temp-titulo" className="modal-titulo"></h4>
            <p id="modal-temp-mensaje" className="modal-mensaje"></p>
            <footer className="modal-acciones">
                <button type="button" id="btn-modal-cancelar-temp" className="btn-modal btn-modal-cancelar">Cancelar</button>
                <button type="button" id="btn-modal-aceptar-temp" className="btn-modal btn-modal-pausar">Aceptar</button>
            </footer>
        </div>
    </div>

    
    <div id="toast-temp" className="toast-notificacion" role="status" aria-live="polite" hidden></div>

    
    </>
  );
}
