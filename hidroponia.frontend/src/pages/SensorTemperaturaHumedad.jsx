import React, { useEffect } from "react";
import Layout from "../components/Layout";
import usePageStyles from "../components/usePageStyles";
import initCtrl1 from "../controllers/temperatura_humedad.js";

const PAGE_CSS = ["/css/temperatura_humedad.css"];

export default function SensorTemperaturaHumedad() {
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
                <h1>Configuración del Sensor de Temperatura y Humedad Ambiental (DHT22)</h1>
                <p className="subtitulo-modulo">Control del microclima en invernadero, verificación con termohigrómetro y puerto digital.</p>
            </header>
            <div className="ordenar-div">

                
                <div className="card">
                    <header className="titulo-card">
                        <h3>Alertas y Control del Microclima</h3>
                        <button type="button" id="btn-estado-dht22" className="txt-descr activo" aria-pressed="true" aria-live="polite">
                            <span id="estado-dht22">Activo</span>
                        </button>
                    </header>

                    <form id="form-control-dht22" className="cuerpo-card" noValidate>
                        
                        <div className="grupo-campo">
                            <label htmlFor="frecuencia-lectura-dht22" className="etiqueta-campo">Frecuencia de Lectura</label>
                            <select id="frecuencia-lectura-dht22" name="frecuenciaLectura" className="campo-control" defaultValue="10">
                                <option value="2">Cada 2 segundos</option>
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
                                    <label htmlFor="temp-min-aire" className="etiqueta-campo">Temp. Mínima Aire (°C)</label>
                                    <div className="ayuda-contextual">
                                        <button type="button" className="btn-ayuda-campo" aria-expanded="false" aria-controls="ayuda-temp-min-aire" aria-label="Información sobre Temp. Mínima Aire">
                                            <svg className="icono-ayuda-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                <circle cx="12" cy="12" r="10" />
                                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                                                <line x1="12" y1="17" x2="12.01" y2="17" />
                                            </svg>
                                        </button>
                                        <div id="ayuda-temp-min-aire" className="popover-ayuda" role="region" hidden>
                                            <p className="texto-guia">Evita estrés por frío ambiental en el cultivo.</p>
                                        </div>
                                    </div>
                                </div>
                                <input type="number" id="temp-min-aire" name="tempMinimaAire" className="campo-control" min="-40.0" max="80.0" step="0.1" defaultValue="18.0" required />
                            </div>

                            <div className="grupo-campo">
                                <div className="etiqueta-con-ayuda">
                                    <label htmlFor="temp-max-aire" className="etiqueta-campo">Temp. Máxima Aire (°C)</label>
                                    <div className="ayuda-contextual">
                                        <button type="button" className="btn-ayuda-campo" aria-expanded="false" aria-controls="ayuda-temp-max-aire" aria-label="Información sobre Temp. Máxima Aire">
                                            <svg className="icono-ayuda-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                <circle cx="12" cy="12" r="10" />
                                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                                                <line x1="12" y1="17" x2="12.01" y2="17" />
                                            </svg>
                                        </button>
                                        <div id="ayuda-temp-max-aire" className="popover-ayuda popover-ayuda-izq" role="region" hidden>
                                            <p className="texto-guia">Alerta por exceso de calor en el invernadero.</p>
                                        </div>
                                    </div>
                                </div>
                                <input type="number" id="temp-max-aire" name="tempMaximaAire" className="campo-control" min="-40.0" max="80.0" step="0.1" defaultValue="28.0" required />
                            </div>
                        </div>

                        
                        <div className="fila-dos-cols">
                            <div className="grupo-campo">
                                <div className="etiqueta-con-ayuda">
                                    <label htmlFor="humedad-min-aire" className="etiqueta-campo">Humedad Mínima (%)</label>
                                    <div className="ayuda-contextual">
                                        <button type="button" className="btn-ayuda-campo" aria-expanded="false" aria-controls="ayuda-humedad-min" aria-label="Información sobre Humedad Mínima">
                                            <svg className="icono-ayuda-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                <circle cx="12" cy="12" r="10" />
                                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                                                <line x1="12" y1="17" x2="12.01" y2="17" />
                                            </svg>
                                        </button>
                                        <div id="ayuda-humedad-min" className="popover-ayuda" role="region" hidden>
                                            <p className="texto-guia">Evita aire excesivamente seco que deshidrate las hojas.</p>
                                        </div>
                                    </div>
                                </div>
                                <input type="number" id="humedad-min-aire" name="humedadMinima" className="campo-control" min="0" max="100" step="1" defaultValue="50" required />
                            </div>

                            <div className="grupo-campo">
                                <div className="etiqueta-con-ayuda">
                                    <label htmlFor="humedad-max-aire" className="etiqueta-campo">Humedad Máxima (%)</label>
                                    <div className="ayuda-contextual">
                                        <button type="button" className="btn-ayuda-campo" aria-expanded="false" aria-controls="ayuda-humedad-max" aria-label="Información sobre Humedad Máxima">
                                            <svg className="icono-ayuda-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                <circle cx="12" cy="12" r="10" />
                                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                                                <line x1="12" y1="17" x2="12.01" y2="17" />
                                            </svg>
                                        </button>
                                        <div id="ayuda-humedad-max" className="popover-ayuda popover-ayuda-izq" role="region" hidden>
                                            <p className="texto-guia">Previene aparición de hongos por exceso de condensación.</p>
                                        </div>
                                    </div>
                                </div>
                                <input type="number" id="humedad-max-aire" name="humedadMaxima" className="campo-control" min="0" max="100" step="1" defaultValue="80" required />
                            </div>
                        </div>

                        <p id="error-control-dht22" className="mensaje-error-form" role="alert" hidden></p>

                        
                        <footer className="acciones-card">
                            <button type="submit" id="btn-guardar-control-dht22" className="btn-modal btn-modal-activar">
                                Guardar Configuración
                            </button>
                        </footer>
                    </form>
                </div>

                
                <div className="card">
                    <header className="titulo-card">
                        <h3>Calibración de Temperatura y Humedad</h3>
                    </header>

                    <div className="cuerpo-card">
                        
                        <div className="registro-mantenimiento">
                            <p className="texto-registro">
                                Última verificación realizada: <strong id="ultima-verificacion-dht22" aria-live="polite">Hace 15 días</strong>
                            </p>
                            <p className="texto-guia">Se recomienda verificar cada 60 días</p>
                        </div>

                        
                        <div className="paso-calibracion">
                            <div className="paso-info">
                                <p className="etiqueta-campo">Ajuste de Desviación Ambiental</p>
                                <p className="texto-guia">
                                    Si al comparar con un termohigrómetro patrón certificado notas una diferencia fija en el aire, ingresa el valor de corrección correspondiente.
                                </p>

                                <div className="fila-dos-cols">
                                    <div className="grupo-campo">
                                        <label htmlFor="offset-temp-dht22" className="etiqueta-campo">Desviación Temperatura (°C)</label>
                                        <input type="number" id="offset-temp-dht22" name="offsetTemperatura" className="campo-control" min="-20.0" max="20.0" step="0.1" defaultValue="0.0" required />
                                    </div>

                                    <div className="grupo-campo">
                                        <label htmlFor="offset-humedad-dht22" className="etiqueta-campo">Desviación Humedad (%)</label>
                                        <input type="number" id="offset-humedad-dht22" name="offsetHumedad" className="campo-control" min="-30.0" max="30.0" step="0.1" defaultValue="0.0" required />
                                    </div>
                                </div>

                                <p id="error-calibracion-dht22" className="mensaje-error-form" role="alert" hidden></p>

                                <div className="acciones-card">
                                    <button type="button" id="btn-aplicar-ajuste-dht22" className="btn-modal btn-modal-activar">
                                        Aplicar Ajuste
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                
                <div className="card card-tecnica-abierta" id="bloque-tecnico-dht22">
                    <header className="titulo-card">
                        <h3>Configuración Técnica y Conexión (Solo Técnicos)</h3>
                    </header>

                    <form id="form-tecnico-dht22" className="cuerpo-card" noValidate>

                                
                                <fieldset className="subseccion-tecnica">
                                    <legend className="subtitulo-tecnico">Subsección A: Cableado y Protocolo Digital (ESP32-S3)</legend>

                                    <div className="grid-tecnico-tres">
                                        <div className="grupo-campo">
                                            <label htmlFor="tec-dht22-modelo" className="etiqueta-campo">Modelo de Sensor</label>
                                            <select id="tec-dht22-modelo" name="modeloSensor" className="campo-control" defaultValue="DHT22">
                                                <option value="DHT22">DHT22 / AM2302 (Alta precisión)</option>
                                                <option value="DHT11">DHT11</option>
                                            </select>
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="tec-dht22-gpio" className="etiqueta-campo">Pin Digital de Datos (GPIO)</label>
                                            <select id="tec-dht22-gpio" name="pinGpio" className="campo-control" defaultValue="GPIO 4">
                                                <option value="GPIO 4">GPIO 4</option>
                                                <option value="GPIO 5">GPIO 5</option>
                                                <option value="GPIO 15">GPIO 15</option>
                                                <option value="GPIO 16">GPIO 16</option>
                                                <option value="GPIO 17">GPIO 17</option>
                                                <option value="GPIO 18">GPIO 18</option>
                                                <option value="GPIO 21">GPIO 21</option>
                                            </select>
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="tec-dht22-pullup" className="etiqueta-campo">Resistencia Pull-Up</label>
                                            <select id="tec-dht22-pullup" name="resistenciaPullUp" className="campo-control" defaultValue="externa_10k">
                                                <option value="externa_10k">Externa 10 kΩ instalada (Recomendado)</option>
                                                <option value="interna_esp32">Interna del ESP32-S3</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="cuadro-verificacion-electrica" role="note" aria-label="Verificación eléctrica del sensor">
                                        <div className="encabezado-info-electrica">
                                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                <circle cx="12" cy="12" r="10" />
                                                <line x1="12" y1="16" x2="12" y2="12" />
                                                <line x1="12" y1="8" x2="12.01" y2="8" />
                                            </svg>
                                            <span className="etiqueta-campo">Verificación Eléctrica (Solo lectura)</span>
                                        </div>
                                        <ul className="lista-verificacion-electrica">
                                            <li><strong>Alimentación:</strong> Pin VCC (+) a 3.3V o 5V DC y Pin GND (-) a tierra común del ESP32-S3.</li>
                                            <li><strong>Señal:</strong> Protocolo digital de un solo cable (Single-Bus) con tiempo mínimo de muestreo de 2 segundos entre lecturas.</li>
                                        </ul>
                                    </div>
                                </fieldset>

                                
                                <fieldset className="subseccion-tecnica">
                                    <legend className="subtitulo-tecnico">Subsección B: Rangos Físicos y Filtrado de Señal</legend>

                                    <div className="grid-tecnico-tres">
                                        <div className="grupo-campo">
                                            <label htmlFor="tec-dht22-rango-temp" className="etiqueta-campo">Rango Operativo Temperatura (°C)</label>
                                            <input type="text" id="tec-dht22-rango-temp" name="rangoOperativoTemp" className="campo-control campo-solo-lectura" defaultValue="-40 a 80 °C" readOnly />
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="tec-dht22-rango-hum" className="etiqueta-campo">Rango Operativo Humedad (%)</label>
                                            <input type="text" id="tec-dht22-rango-hum" name="rangoOperativoHum" className="campo-control campo-solo-lectura" defaultValue="0 a 100% HR" readOnly />
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="tec-dht22-muestras" className="etiqueta-campo">Muestras para Promedio (Filtro)</label>
                                            <input type="number" id="tec-dht22-muestras" name="muestrasPromedio" className="campo-control" min="1" max="30" step="1" defaultValue="5" required />
                                        </div>
                                    </div>
                                </fieldset>

                                <p id="error-tecnico-dht22" className="mensaje-error-form" role="alert" hidden></p>

                                
                                <footer className="acciones-card acciones-tecnicas">
                                    <button type="button" id="btn-restaurar-fabrica-dht22" className="btn-modal btn-modal-cancelar">
                                        Restaurar valores de fábrica
                                    </button>
                                    <button type="submit" id="btn-guardar-tecnico-dht22" className="btn-modal btn-modal-activar">
                                        Guardar Configuración Técnica
                                    </button>
                                </footer>

                            </form>
                </div>

            </div>
        
      </Layout>


    
    <div id="modal-confirmacion-dht22" className="modal-overlay" hidden>
        <div className="modal-caja" role="dialog" aria-modal="true" aria-labelledby="modal-dht22-titulo" aria-describedby="modal-dht22-mensaje" aria-live="polite">
            <h4 id="modal-dht22-titulo" className="modal-titulo"></h4>
            <p id="modal-dht22-mensaje" className="modal-mensaje"></p>
            <div className="modal-acciones">
                <button type="button" id="btn-modal-cancelar-dht22" className="btn-modal btn-modal-cancelar">Cancelar</button>
                <button type="button" id="btn-modal-aceptar-dht22" className="btn-modal btn-modal-pausar">Aceptar</button>
            </div>
        </div>
    </div>

    
    <div id="toast-dht22" className="toast-notificacion" role="status" aria-live="polite" hidden></div>

    
    </>
  );
}
