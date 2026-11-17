import React, { useEffect } from "react";
import Layout from "../components/Layout";
import usePageStyles from "../components/usePageStyles";
import initCtrl1 from "../controllers/ec.js";

const PAGE_CSS = ["/css/ec.css"];

export default function SensorEc() {
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
                <h1>Configuración del Sensor de Conductividad Eléctrica (EC)</h1>
                <p className="subtitulo-modulo">Umbrales de nutrientes, calibración estándar y parámetros ADC del ESP32-S3.</p>
            </header>
            <div className="ordenar-div">

                
                <div className="card">
                    <header className="titulo-card">
                        <h3>Alertas y Control del Cultivo</h3>
                        <button type="button" id="btn-estado-ec" className="txt-descr activo" aria-pressed="true" aria-live="polite">
                            <span id="estado-ec">Activo</span>
                        </button>
                    </header>

                    <form id="form-control-ec" className="cuerpo-card" noValidate>
                        
                        <div className="grupo-campo">
                            <label htmlFor="frecuencia-lectura-ec" className="etiqueta-campo">Frecuencia de Lectura</label>
                            <select id="frecuencia-lectura-ec" name="frecuenciaLectura" className="campo-control" defaultValue="10">
                                <option value="5">Cada 5 segundos</option>
                                <option value="10">Cada 10 segundos</option>
                                <option value="30">Cada 30 segundos</option>
                                <option value="60">Cada 1 minuto</option>
                                <option value="300">Cada 5 minutos</option>
                            </select>
                        </div>

                        
                        <div className="fila-umbrales-ec">
                            <div className="grupo-campo">
                                <label htmlFor="ec-minimo" className="etiqueta-campo">EC Mínima (mS/cm)</label>
                                <input type="number" id="ec-minimo" name="ecMinimo" className="campo-control" min="0.0" max="2.0" step="0.01" defaultValue="0.80" required />
                            </div>

                            <div className="grupo-campo">
                                <label htmlFor="ec-maximo" className="etiqueta-campo">EC Máxima (mS/cm)</label>
                                <input type="number" id="ec-maximo" name="ecMaximo" className="campo-control" min="0.0" max="2.0" step="0.01" defaultValue="1.80" required />
                            </div>

                            <div className="grupo-campo">
                                <label htmlFor="tds-minimo" className="etiqueta-campo">TDS Mínimo (ppm)</label>
                                <input type="number" id="tds-minimo" name="tdsMinimo" className="campo-control" min="0" max="1000" step="1" defaultValue="400" required />
                            </div>

                            <div className="grupo-campo">
                                <label htmlFor="tds-maximo" className="etiqueta-campo">TDS Máximo (ppm)</label>
                                <input type="number" id="tds-maximo" name="tdsMaximo" className="campo-control" min="0" max="1000" step="1" defaultValue="900" required />
                            </div>
                        </div>

                        
                        <div className="fila-switch">
                            <label htmlFor="btn-compensacion-ec" className="etiqueta-campo">Compensación Térmica Automática</label>
                            <button type="button" id="btn-compensacion-ec" className="txt-descr activo" aria-pressed="true">
                                <span id="texto-compensacion-ec">Activada</span>
                            </button>
                        </div>

                        <div className="grupo-campo">
                            <label htmlFor="sonda-temp-asociada" className="etiqueta-campo">Fuente de Compensación Térmica (ATC)</label>
                            <select id="sonda-temp-asociada" name="sondaTempAsociada" className="campo-control" defaultValue="pt100">
                                <option value="pt100">Sonda RTD PT100 (Tiempo real)</option>
                                <option value="sen0708">Sensor pH RS485 SEN0708 (Interna)</option>
                                <option value="fijo25">Temperatura Manual Fija (25.0 °C)</option>
                            </select>
                        </div>

                        <div id="grupo-ec-temp-manual" className="grupo-campo" hidden>
                            <label htmlFor="ec-temp-manual" className="etiqueta-campo">Temperatura Manual Fija (°C)</label>
                            <input type="number" id="ec-temp-manual" name="tempManualAtc" className="campo-control" min="0" max="50" step="0.1" defaultValue="25.0" />
                        </div>

                        <p id="estado-atc-ec" className="celda-estado estado-normal" aria-live="polite">
                            <span className="punto-estado" aria-hidden="true"></span>
                            <span id="texto-estado-atc-ec">Compensación térmica activa desde PT100 · Lectura actual: 21.5 °C · Coeficiente: 2.0 %/°C</span>
                        </p>

                        <p id="error-control-ec" className="mensaje-error-form" role="alert" hidden></p>

                        
                        <footer className="acciones-card">
                            <button type="submit" id="btn-guardar-control-ec" className="btn-modal btn-modal-activar">
                                Guardar Configuración
                            </button>
                        </footer>
                    </form>
                </div>

                
                <div className="card">
                    <header className="titulo-card">
                        <h3>Calibración de Conductividad (EC / TDS)</h3>
                    </header>

                    <div className="cuerpo-card">
                        
                        <div className="registro-mantenimiento">
                            <p className="texto-registro">
                                Última calibración realizada: <strong id="ultima-calibracion-ec" aria-live="polite">Hace 18 días</strong>
                            </p>
                            <p className="texto-guia">Se recomienda recalibrar cada 30 días.</p>
                        </div>

                        
                        <div className="paso-calibracion">
                            <div className="paso-info">
                                <p className="etiqueta-campo">Calibración con Solución Estándar</p>
                                <p className="texto-guia">
                                    Sumerge la sonda limpia en solución estándar de conductividad conocida (ej. 1.41 mS/cm o 700 ppm) y espera 1 minuto a que se estabilice.
                                </p>

                                <div className="fila-calibracion-ec">
                                    <div className="grupo-campo campo-calibracion-ec">
                                        <label htmlFor="valor-solucion-estandar" className="etiqueta-campo">Valor de la solución estándar (mS/cm)</label>
                                        <input type="number" id="valor-solucion-estandar" name="solucionEstandar" className="campo-control" min="0.01" max="20.00" step="0.01" defaultValue="1.41" required />
                                    </div>
                                    <div className="paso-accion">
                                        <button type="button" id="btn-calibrar-ec" className="btn-modal btn-modal-activar">
                                            Calibrar Sensor
                                        </button>
                                    </div>
                                </div>

                                <p id="error-calibracion-ec" className="mensaje-error-form" role="alert" hidden></p>
                            </div>
                        </div>
                    </div>
                </div>

                
                <div className="card card-tecnica-abierta" id="bloque-tecnico-ec">
                    <header className="titulo-card">
                        <h3>Configuración Técnica y Conexión (Solo Técnicos)</h3>
                    </header>

                    <form id="form-tecnico-ec" className="cuerpo-card" noValidate>

                                
                                <fieldset className="subseccion-tecnica">
                                    <legend className="subtitulo-tecnico">Subsección Hardware y ADC (ESP32-S3)</legend>

                                    <div className="grid-tecnico-adc">
                                        <div className="grupo-campo">
                                            <label htmlFor="tec-ec-gpio" className="etiqueta-campo">Pin GPIO / Canal ADC</label>
                                            <select id="tec-ec-gpio" name="gpioAdc" className="campo-control" defaultValue="GPIO1_ADC1">
                                                <option value="GPIO1_ADC1">GPIO 1 (ADC1)</option>
                                                <option value="GPIO2_ADC1">GPIO 2 (ADC1)</option>
                                                <option value="GPIO3_ADC1">GPIO 3 (ADC1)</option>
                                                <option value="GPIO4_ADC1">GPIO 4 (ADC1)</option>
                                                <option value="GPIO5_ADC1">GPIO 5 (ADC1)</option>
                                                <option value="GPIO6_ADC1">GPIO 6 (ADC1)</option>
                                                <option value="GPIO7_ADC1">GPIO 7 (ADC1)</option>
                                                <option value="GPIO8_ADC1">GPIO 8 (ADC1)</option>
                                                <option value="GPIO9_ADC1">GPIO 9 (ADC1)</option>
                                                <option value="GPIO10_ADC1">GPIO 10 (ADC1)</option>
                                            </select>
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="tec-ec-vref" className="etiqueta-campo">Voltaje de Referencia (Vref)</label>
                                            <select id="tec-ec-vref" name="vref" className="campo-control" defaultValue="3.3">
                                                <option value="3.3">3.3 V (ADC Interno)</option>
                                                <option value="5.0">5.0 V</option>
                                            </select>
                                            <small className="texto-guia">
                                                La señal de salida del sensor (0 - 2.3V) no debe superar los 3.3V de entrada del ESP32.
                                            </small>
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="tec-ec-resolucion" className="etiqueta-campo">Resolución ADC</label>
                                            <select id="tec-ec-resolucion" name="resolucionBits" className="campo-control" defaultValue="12">
                                                <option value="10">10 bits</option>
                                                <option value="11">11 bits</option>
                                                <option value="12">12 bits (4095 niveles)</option>
                                            </select>
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="tec-ec-atenuacion" className="etiqueta-campo">Atenuación del ADC</label>
                                            <select id="tec-ec-atenuacion" name="atenuacionAdc" className="campo-control" defaultValue="11db">
                                                <option value="11db">11 dB (Rango 150-2450 mV) · Recomendado</option>
                                                <option value="6db">6 dB (hasta ~1750 mV · satura la sonda)</option>
                                                <option value="2.5db">2.5 dB (hasta ~1250 mV · satura la sonda)</option>
                                                <option value="0db">0 dB (hasta ~950 mV · satura la sonda)</option>
                                            </select>
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="ec-factor-k" className="etiqueta-campo">Factor de Calibración (k)</label>
                                            <input type="number" id="ec-factor-k" name="factorCalibracionK" className="campo-control" min="0.10" max="5.00" step="0.01" defaultValue="1.00" required />
                                        </div>
                                    </div>

                                    <div className="registro-mantenimiento" aria-label="Parámetros eléctricos nominales">
                                        <p className="texto-registro">
                                            Parámetros eléctricos nominales: <strong>Alimentación: 3.3–5.5 V</strong> | <strong>Consumo: 3–6 mA</strong> | <strong>Excitación: Onda AC 1 kHz</strong>
                                        </p>
                                    </div>
                                </fieldset>

                                
                                <fieldset className="subseccion-tecnica">
                                    <legend className="subtitulo-tecnico">Subsección Matemáticas y Filtrado</legend>

                                    <div className="grid-tecnico-mate">
                                        <div className="grupo-campo">
                                            <div className="etiqueta-con-ayuda">
                                                <label htmlFor="tec-ec-kvalue" className="etiqueta-campo">Factor de Conversión (K_value)</label>
                                                <div className="ayuda-contextual">
                                                    <button type="button" className="btn-ayuda-campo" aria-expanded="false" aria-controls="ayuda-ec-kvalue" aria-label="Información sobre Factor de Conversión K_value">
                                                        <span className="material-symbols-outlined" aria-hidden="true">help</span>
                                                    </button>
                                                    <div id="ayuda-ec-kvalue" className="popover-ayuda" role="region" hidden>
                                                        <p className="texto-guia">Para convertir mS/cm a ppm (TDS = EC × 1000 × K_value).</p>
                                                        <p className="texto-guia">0.50: base NaCl (por defecto). 0.64–0.70: soluciones nutritivas hidropónicas.</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <input type="number" id="tec-ec-kvalue" name="kValue" className="campo-control" min="0.1" max="1.0" step="0.01" defaultValue="0.50" required />
                                        </div>

                                        <div className="grupo-campo">
                                            <div className="etiqueta-con-ayuda">
                                                <label htmlFor="tec-ec-alpha" className="etiqueta-campo">Coeficiente Térmico (α)</label>
                                                <div className="ayuda-contextual">
                                                    <button type="button" className="btn-ayuda-campo" aria-expanded="false" aria-controls="ayuda-ec-alpha" aria-label="Información sobre Coeficiente Térmico">
                                                        <span className="material-symbols-outlined" aria-hidden="true">help</span>
                                                    </button>
                                                    <div id="ayuda-ec-alpha" className="popover-ayuda" role="region" hidden>
                                                        <p className="texto-guia">Representa 2% (0.02) de ajuste por cada °C respecto a 25 °C.</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <input type="number" id="tec-ec-alpha" name="coeficienteTermico" className="campo-control" min="0.001" max="0.1" step="0.001" defaultValue="0.02" required />
                                        </div>

                                        <div className="grupo-campo">
                                            <div className="etiqueta-con-ayuda">
                                                <label htmlFor="tec-ec-ventana" className="etiqueta-campo">Ventana de Muestreo (N lecturas)</label>
                                                <div className="ayuda-contextual">
                                                    <button type="button" className="btn-ayuda-campo" aria-expanded="false" aria-controls="ayuda-ec-ventana" aria-label="Información sobre Ventana de Muestreo">
                                                        <span className="material-symbols-outlined" aria-hidden="true">help</span>
                                                    </button>
                                                    <div id="ayuda-ec-ventana" className="popover-ayuda popover-ayuda-izq" role="region" hidden>
                                                        <p className="texto-guia">Cantidad de muestras que promedia el filtro para estabilizar la señal analógica.</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <input type="number" id="tec-ec-ventana" name="ventanaMuestreo" className="campo-control" min="1" max="200" step="1" defaultValue="30" required />
                                        </div>
                                    </div>
                                </fieldset>

                                <p id="error-tecnico-ec" className="mensaje-error-form" role="alert" hidden></p>

                                
                                <footer className="acciones-card acciones-tecnicas">
                                    <button type="button" id="btn-restaurar-fabrica-ec" className="btn-modal btn-modal-cancelar">
                                        Restaurar valores de fábrica
                                    </button>
                                    <button type="submit" id="btn-guardar-tecnico-ec" className="btn-modal btn-modal-activar">
                                        Guardar Configuración Técnica
                                    </button>
                                </footer>

                            </form>
                </div>

            </div>
        
      </Layout>


    
    <div id="modal-confirmacion-ec" className="modal-overlay" hidden>
        <div className="modal-caja" role="dialog" aria-modal="true" aria-labelledby="modal-ec-titulo" aria-describedby="modal-ec-mensaje" aria-live="polite">
            <h4 id="modal-ec-titulo" className="modal-titulo"></h4>
            <p id="modal-ec-mensaje" className="modal-mensaje"></p>
            <div className="modal-acciones">
                <button type="button" id="btn-modal-cancelar-ec" className="btn-modal btn-modal-cancelar">Cancelar</button>
                <button type="button" id="btn-modal-aceptar-ec" className="btn-modal btn-modal-pausar">Aceptar</button>
            </div>
        </div>
    </div>

    
    <div id="toast-ec" className="toast-notificacion" role="status" aria-live="polite" hidden></div>

    
    </>
  );
}
