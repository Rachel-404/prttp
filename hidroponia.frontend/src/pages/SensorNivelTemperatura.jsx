import React, { useEffect } from "react";
import Layout from "../components/Layout";
import usePageStyles from "../components/usePageStyles";
import initCtrl1 from "../controllers/nivel-agua.js";
import initCtrl2 from "../controllers/temperatura.js";
import initCtrl3 from "../controllers/nivel_temperatura_tabs.js";

const PAGE_CSS = ["/css/reportes.css", "/css/nivel-agua.css", "/css/temperatura.css"];

export default function SensorNivelTemperatura() {
  usePageStyles(PAGE_CSS);

  useEffect(() => {
    const c1 = initCtrl1();
    const c2 = initCtrl2();
    const c3 = initCtrl3();
    return () => {
      if (typeof c1 === "function") c1();
      if (typeof c2 === "function") c2();
      if (typeof c3 === "function") c3();
    };
  }, []);

  return (
    <>
      <Layout plana>
        <div className="modulo-reportes">
          <header className="encabezado-reportes">
            <div className="titulo-modulo-reportes">
              <h1>Sensores Físicos del Agua</h1>
              <p className="subtitulo-modulo">Configuración de nivel hidrostático LMP633 y temperatura sumergida PT100.</p>
            </div>

            <nav className="barra-pestanas" role="tablist" aria-label="Sensores Físicos del Agua">
              <button type="button" id="tab-nivel-agua" className="btn-pestana activa" role="tab" aria-selected="true" aria-controls="panel-nivel-agua" data-tab="nivel">
                <span className="material-symbols-outlined" aria-hidden="true">water</span>
                <span>Nivel de Agua</span>
              </button>

              <button type="button" id="tab-temperatura" className="btn-pestana" role="tab" aria-selected="false" aria-controls="panel-temperatura" data-tab="temperatura">
                <span className="material-symbols-outlined" aria-hidden="true">device_thermostat</span>
                <span>Temperatura del Agua</span>
              </button>
            </nav>
          </header>

          {/* PESTAÑA 1: NIVEL DE AGUA LMP633 */}
          <section id="panel-nivel-agua" className="contenido-pestana" role="tabpanel" aria-labelledby="tab-nivel-agua">
            <div className="ordenar-div">
              <div className="card">
                <header className="titulo-card">
                  <h3>Alertas y Control del Tanque</h3>
                  <button type="button" id="btn-estado-na" className="txt-descr activo" aria-pressed="true" aria-live="polite">
                    <span id="estado-na">Activo</span>
                  </button>
                </header>

                <form id="form-control-na" className="cuerpo-card" noValidate>
                  <div className="fila-dos-cols">
                    <div className="grupo-campo">
                      <label htmlFor="frecuencia-lectura-na" className="etiqueta-campo">Frecuencia de Lectura</label>
                      <select id="frecuencia-lectura-na" name="frecuenciaLectura" className="campo-control" defaultValue="300">
                        <option value="300">Cada 5 minutos</option>
                        <option value="600">Cada 10 minutos</option>
                        <option value="900">Cada 15 minutos</option>
                        <option value="1800">Cada 30 minutos</option>
                        <option value="3600">Cada 1 hora</option>
                      </select>
                    </div>

                    <div className="grupo-campo">
                      <label htmlFor="unidad-principal-na" className="etiqueta-campo">Unidad Principal a Mostrar</label>
                      <select id="unidad-principal-na" name="unidadPrincipal" className="campo-control" defaultValue="pct">
                        <option value="pct">Porcentaje</option>
                        <option value="cm">Centímetros</option>
                        <option value="L">Litros</option>
                        <option value="kPa">Kilopascales</option>
                        <option value="MPa">Megapascales</option>
                        <option value="mH2O">Metros columna de agua</option>
                        <option value="m">Metros</option>
                      </select>
                    </div>
                  </div>

                  <div className="fila-dos-cols">
                    <div className="grupo-campo">
                      <label htmlFor="nivel-minimo-na" className="etiqueta-campo">Nivel Mínimo Crítico cm</label>
                      <input type="number" id="nivel-minimo-na" name="nivelMinimoCm" className="campo-control" min="0" step="0.5" defaultValue="15" required />
                    </div>

                    <div className="grupo-campo">
                      <label htmlFor="nivel-maximo-na" className="etiqueta-campo">Nivel Máximo Alerta cm</label>
                      <input type="number" id="nivel-maximo-na" name="nivelMaximoCm" className="campo-control" min="0" step="0.5" defaultValue="90" required />
                    </div>
                  </div>

                  <p id="error-control-na" className="mensaje-error-form" role="alert" hidden></p>

                  <footer className="acciones-card">
                    <button type="submit" id="btn-guardar-control-na" className="btn-modal btn-modal-activar">
                      Guardar Configuración
                    </button>
                  </footer>
                </form>
              </div>

              <div className="card">
                <header className="titulo-card">
                  <h3>Calibración de Punto Cero</h3>
                </header>

                <div className="cuerpo-card">
                  <div className="paso-calibracion">
                    <div className="paso-info">
                      <p className="etiqueta-campo">Referencia de Nivel Cero y Offset Mecánico</p>
                      <p className="texto-guia">
                        Compensa la altura a la que queda suspendida la sonda sobre el fondo del reservorio o fija la lectura actual como 0 cm con el tanque vacío.
                      </p>
                      <div className="grupo-campo">
                        <label htmlFor="offset_cm" className="etiqueta-campo">Offset Mecánico de Calibración cm</label>
                        <input type="number" id="offset_cm" name="offsetCm" className="campo-control" min="-100" max="100" step="0.1" defaultValue="0.0" required />
                      </div>
                    </div>
                    <div className="paso-accion">
                      <button type="button" id="btn-fijar-cero" className="btn-modal btn-modal-activar">
                        Fijar Nivel Cero Actual
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card card-tecnica-abierta" id="bloque-tecnico-na">
                <header className="titulo-card">
                  <h3>Configuración Técnica y Conexión</h3>
                </header>

                <form id="form-tecnico-na" className="cuerpo-card" noValidate>
                  <fieldset className="subseccion-tecnica">
                    <legend className="subtitulo-tecnico">Lazo de Corriente 4–20 mA y Protección ADC</legend>

                    <div className="fila-tres-cols">
                      <div className="grupo-campo">
                        <label htmlFor="tec-na-url" className="etiqueta-campo">Rango Nominal de Cápsula</label>
                        <select id="tec-na-url" name="rangoNominal" className="campo-control" defaultValue="C203G">
                          <option value="C203G">C203G · 0–20 kPa</option>
                          <option value="C403G">C403G · 0–40 kPa</option>
                          <option value="C104G">C104G · 0–100 kPa</option>
                        </select>
                      </div>

                      <div className="grupo-campo">
                        <label htmlFor="tec-na-shunt" className="etiqueta-campo">Resistencia Shunt Ω</label>
                        <input type="number" id="tec-na-shunt" name="resistenciaShunt" className="campo-control" min="10" max="165" step="1" defaultValue="100" required />
                      </div>

                      <div className="grupo-campo">
                        <label htmlFor="tec-na-adc-420" className="etiqueta-campo">Pin ADC1 ESP32-S3</label>
                        <select id="tec-na-adc-420" name="pinAdc420" className="campo-control" defaultValue="GPIO2">
                          <option value="GPIO1">GPIO 1</option>
                          <option value="GPIO2">GPIO 2</option>
                          <option value="GPIO3">GPIO 3</option>
                          <option value="GPIO4">GPIO 4</option>
                          <option value="GPIO5">GPIO 5</option>
                          <option value="GPIO6">GPIO 6</option>
                          <option value="GPIO7">GPIO 7</option>
                        </select>
                      </div>
                    </div>
                  </fieldset>

                  <p id="error-tecnico-na" className="mensaje-error-form" role="alert" hidden></p>

                  <footer className="acciones-card acciones-tecnicas">
                    <button type="button" id="btn-restaurar-fabrica-na" className="btn-modal btn-modal-cancelar">
                      Restaurar valores de fábrica
                    </button>
                    <button type="submit" id="btn-guardar-tecnico-na" className="btn-modal btn-modal-activar">
                      Guardar Configuración Técnica
                    </button>
                  </footer>
                </form>
              </div>
            </div>
          </section>

          {/* PESTAÑA 2: TEMPERATURA DEL AGUA PT100 */}
          <section id="panel-temperatura" className="contenido-pestana" role="tabpanel" aria-labelledby="tab-temperatura" hidden>
            <div className="ordenar-div">
              <div className="card">
                <header className="titulo-card">
                  <h3>Alertas y Control Térmico del Agua</h3>
                  <button type="button" id="btn-estado-temp" className="txt-descr activo" aria-pressed="true" aria-live="polite">
                    <span id="estado-temp">Activo</span>
                  </button>
                </header>

                <form id="form-control-temp" className="cuerpo-card" noValidate>
                  <div className="grupo-campo">
                    <label htmlFor="frecuencia-lectura-temp" className="etiqueta-campo">Frecuencia de Lectura</label>
                    <select id="frecuencia-lectura-temp" name="frecuenciaLectura" className="campo-control" defaultValue="300">
                      <option value="300">Cada 5 minutos</option>
                      <option value="600">Cada 10 minutos</option>
                      <option value="900">Cada 15 minutos</option>
                      <option value="1800">Cada 30 minutos</option>
                      <option value="3600">Cada 1 hora</option>
                    </select>
                  </div>

                  <div className="fila-dos-cols">
                    <div className="grupo-campo">
                      <label htmlFor="temp-minimo-agua" className="etiqueta-campo">Temperatura Mínima Agua °C</label>
                      <input type="number" id="temp-minimo-agua" name="tempMinimaAgua" className="campo-control" min="-50.0" max="200.0" step="0.1" defaultValue="18.0" required />
                    </div>

                    <div className="grupo-campo">
                      <label htmlFor="temp-maximo-agua" className="etiqueta-campo">Temperatura Máxima Agua °C</label>
                      <input type="number" id="temp-maximo-agua" name="tempMaximaAgua" className="campo-control" min="-50.0" max="200.0" step="0.1" defaultValue="24.0" required />
                    </div>
                  </div>

                  <div className="fila-switch">
                    <label htmlFor="btn-compensar-otros" className="etiqueta-campo">Proveer compensación térmica a Conductividad</label>
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
                  <div className="paso-calibracion">
                    <div className="paso-info">
                      <p className="etiqueta-campo">Ajuste de Desviación Térmica</p>
                      <p className="texto-guia">
                        Si al comparar con un termómetro patrón certificado notas una diferencia constante, ingresa el valor de corrección en grados Celsius.
                      </p>

                      <div className="fila-calibracion-temp">
                        <div className="grupo-campo campo-calibracion-temp">
                          <label htmlFor="offset-temp-calibracion" className="etiqueta-campo">Desviación / Offset °C</label>
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
                  <h3>Configuración Técnica RTD PT100 / MAX31865</h3>
                </header>

                <form id="form-tecnico-temp" className="cuerpo-card" noValidate>
                  <fieldset className="subseccion-tecnica">
                    <legend className="subtitulo-tecnico">Conexión SPI, Resistencia de Referencia y Filtrado</legend>

                    <div className="grid-tecnico-cuatro">
                      <div className="grupo-campo">
                        <label htmlFor="tec-temp-conexion" className="etiqueta-campo">Configuración de Hilos</label>
                        <select id="tec-temp-conexion" name="tipoConexion" className="campo-control" defaultValue="3_hilos">
                          <option value="3_hilos">3 hilos</option>
                          <option value="2_hilos">2 hilos</option>
                          <option value="4_hilos">4 hilos</option>
                        </select>
                      </div>

                      <div className="grupo-campo">
                        <label htmlFor="tec-temp-pin-cs" className="etiqueta-campo">Pin SPI CS</label>
                        <select id="tec-temp-pin-cs" name="pinCs" className="campo-control" defaultValue="GPIO10">
                          <option value="GPIO5">GPIO 5</option>
                          <option value="GPIO10">GPIO 10</option>
                          <option value="GPIO15">GPIO 15</option>
                        </select>
                      </div>

                      <div className="grupo-campo">
                        <label htmlFor="tec-temp-rref" className="etiqueta-campo">Resistencia Rref Ω</label>
                        <input type="number" id="tec-temp-rref" name="rrefOhmios" className="campo-control" min="100" max="1000" step="0.1" defaultValue="430.0" required />
                      </div>

                      <div className="grupo-campo">
                        <label htmlFor="tec-temp-alpha" className="etiqueta-campo">Coeficiente Platino α</label>
                        <input type="number" id="tec-temp-alpha" name="coeficienteAlpha" className="campo-control" min="0.001" max="0.01" step="0.00001" defaultValue="0.00385" required />
                      </div>

                      <div className="grupo-campo">
                        <label htmlFor="tec-temp-filtro" className="etiqueta-campo">Filtro de Red Eléctrica</label>
                        <select id="tec-temp-filtro" name="filtroRed" className="campo-control" defaultValue="60Hz">
                          <option value="60Hz">60 Hz</option>
                          <option value="50Hz">50 Hz</option>
                        </select>
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
          </section>
        </div>
      </Layout>

      <div id="modal-confirmacion-na" className="modal-overlay" hidden>
        <div className="modal-caja" role="dialog" aria-modal="true" aria-labelledby="modal-na-titulo" aria-describedby="modal-na-mensaje" aria-live="polite">
          <h4 id="modal-na-titulo" className="modal-titulo"></h4>
          <p id="modal-na-mensaje" className="modal-mensaje"></p>
          <div className="modal-acciones">
            <button type="button" id="btn-modal-cancelar-na" className="btn-modal btn-modal-cancelar">Cancelar</button>
            <button type="button" id="btn-modal-aceptar-na" className="btn-modal btn-modal-pausar">Aceptar</button>
          </div>
        </div>
      </div>

      <div id="toast-na" className="toast-notificacion" role="status" aria-live="polite" hidden></div>

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
