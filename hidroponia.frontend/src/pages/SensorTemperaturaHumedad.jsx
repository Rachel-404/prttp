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
      if (typeof c1 === "function") c1();
    };
  }, []);

  return (
    <>
      <Layout plana>
        <header className="encabezado-modulo">
          <h1>Configuración del Sensor de Temperatura y Humedad Ambiental</h1>
          <p className="subtitulo-modulo">Control del microclima con sensor digital DHT22, ajuste de desviación y conexión GPIO.</p>
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
                <select id="frecuencia-lectura-dht22" name="frecuenciaLectura" className="campo-control" defaultValue="300">
                  <option value="300">Cada 5 minutos</option>
                  <option value="600">Cada 10 minutos</option>
                  <option value="900">Cada 15 minutos</option>
                  <option value="1800">Cada 30 minutos</option>
                  <option value="3600">Cada 1 hora</option>
                </select>
              </div>

              <div className="fila-dos-cols">
                <div className="grupo-campo">
                  <label htmlFor="temp-min-aire" className="etiqueta-campo">Temperatura Mínima Aire °C</label>
                  <input type="number" id="temp-min-aire" name="tempMinimaAire" className="campo-control" min="-40.0" max="80.0" step="0.1" defaultValue="18.0" required />
                </div>

                <div className="grupo-campo">
                  <label htmlFor="temp-max-aire" className="etiqueta-campo">Temperatura Máxima Aire °C</label>
                  <input type="number" id="temp-max-aire" name="tempMaximaAire" className="campo-control" min="-40.0" max="80.0" step="0.1" defaultValue="28.0" required />
                </div>
              </div>

              <div className="fila-dos-cols">
                <div className="grupo-campo">
                  <label htmlFor="humedad-min-aire" className="etiqueta-campo">Humedad Relativa Mínima %</label>
                  <input type="number" id="humedad-min-aire" name="humedadMinima" className="campo-control" min="0" max="100" step="1" defaultValue="50" required />
                </div>

                <div className="grupo-campo">
                  <label htmlFor="humedad-max-aire" className="etiqueta-campo">Humedad Relativa Máxima %</label>
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
              <h3>Ajuste de Desviación Ambiental</h3>
            </header>

            <div className="cuerpo-card">
              <div className="paso-calibracion">
                <div className="paso-info">
                  <p className="texto-guia">
                    Si al comparar con un termohigrómetro patrón notas una diferencia constante, ingresa el valor de corrección correspondiente.
                  </p>

                  <div className="fila-dos-cols">
                    <div className="grupo-campo">
                      <label htmlFor="offset-temp-dht22" className="etiqueta-campo">Offset Temperatura °C</label>
                      <input type="number" id="offset-temp-dht22" name="offsetTemperatura" className="campo-control" min="-20.0" max="20.0" step="0.1" defaultValue="0.0" required />
                    </div>

                    <div className="grupo-campo">
                      <label htmlFor="offset-humedad-dht22" className="etiqueta-campo">Offset Humedad %</label>
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
              <h3>Configuración Técnica y Conexión</h3>
            </header>

            <form id="form-tecnico-dht22" className="cuerpo-card" noValidate>
              <fieldset className="subseccion-tecnica">
                <legend className="subtitulo-tecnico">Pin Digital One-Wire y Resistencia Pull-Up</legend>

                <div className="fila-dos-cols">
                  <div className="grupo-campo">
                    <label htmlFor="tec-dht22-gpio" className="etiqueta-campo">Pin Digital de Datos</label>
                    <select id="tec-dht22-gpio" name="pinGpio" className="campo-control" defaultValue="GPIO 6">
                      <option value="GPIO 4">GPIO 4</option>
                      <option value="GPIO 5">GPIO 5</option>
                      <option value="GPIO 6">GPIO 6</option>
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
                      <option value="externa_10k">Externa 10 kΩ instalada</option>
                      <option value="interna_esp32">Interna del ESP32-S3</option>
                    </select>
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
