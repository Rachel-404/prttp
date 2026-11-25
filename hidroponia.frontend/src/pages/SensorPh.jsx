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
      if (typeof c1 === "function") c1();
    };
  }, []);

  return (
    <>
      <Layout plana>
        <header className="encabezado-modulo">
          <h1>Configuración del Sensor de pH</h1>
          <p className="subtitulo-modulo">Umbrales de acidez, calibración en 2 puntos y entrada analógica ADC1.</p>
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
              <div className="fila-dos-cols">
                <div className="grupo-campo">
                  <label htmlFor="ph-minimo" className="etiqueta-campo">pH Mínimo</label>
                  <input type="number" id="ph-minimo" name="phMinimo" className="campo-control" min="0.00" max="14.00" step="0.01" defaultValue="5.50" required />
                </div>

                <div className="grupo-campo">
                  <label htmlFor="ph-maximo" className="etiqueta-campo">pH Máximo</label>
                  <input type="number" id="ph-maximo" name="phMaximo" className="campo-control" min="0.00" max="14.00" step="0.01" defaultValue="6.50" required />
                </div>
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
              <h3>Calibración Analógica del pH</h3>
            </header>

            <div className="cuerpo-card">
              <div className="paso-calibracion">
                <div className="paso-info">
                  <p className="etiqueta-campo">Paso 1: Solución Buffer Neutra pH 7.00</p>
                  <p className="texto-guia">
                    Sumerge la sonda limpia en la solución buffer neutra pH 7.00 y espera 1 minuto a que se estabilice la lectura.
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
                    <label htmlFor="select-buffer-segundo" className="etiqueta-campo">Paso 2: Solución Ácida o Alcalina</label>
                    <select id="select-buffer-segundo" className="campo-control" defaultValue="4.00">
                      <option value="4.00">Buffer Ácido pH 4.00</option>
                      <option value="10.00">Buffer Alcalino pH 10.00</option>
                    </select>
                  </div>
                  <p className="texto-guia">
                    Enjuaga la sonda con agua destilada, sumérgela en el buffer seleccionado y espera 1 minuto antes de confirmar.
                  </p>
                </div>
                <div className="paso-accion">
                  <button type="button" id="btn-calibrar-segundo" className="btn-modal btn-modal-activar">
                    Calibrar Segundo Punto
                  </button>
                </div>
              </div>

              <div className="subseccion-tecnica">
                <p className="subtitulo-tecnico">Voltajes de Calibración Analógica en mV a 25 °C</p>
                <div className="fila-dos-cols">
                  <div className="grupo-campo">
                    <label htmlFor="ph-voltaje-neutro" className="etiqueta-campo">Voltaje en pH 7.0 mV</label>
                    <input type="number" id="ph-voltaje-neutro" name="voltajeNeutroMv" className="campo-control" min="0" max="3300" step="0.1" defaultValue="1500.0" />
                  </div>
                  <div className="grupo-campo">
                    <label htmlFor="ph-voltaje-acido" className="etiqueta-campo">Voltaje en pH 4.0 mV</label>
                    <input type="number" id="ph-voltaje-acido" name="voltajeAcidoMv" className="campo-control" min="0" max="3300" step="0.01" defaultValue="2032.44" />
                  </div>
                </div>
                <footer className="acciones-card">
                  <button type="button" id="btn-calibrar-tres-puntos" className="btn-modal btn-modal-activar">
                    Guardar Voltajes de Calibración
                  </button>
                </footer>
              </div>
            </div>
          </div>

          <div className="card card-tecnica-abierta" id="bloque-tecnico">
            <header className="titulo-card">
              <h3>Configuración Técnica y Entrada Analógica ADC1</h3>
            </header>

            <form id="form-tecnico-ph" className="cuerpo-card" noValidate>
              <fieldset className="subseccion-tecnica">
                <legend className="subtitulo-tecnico">Conexión Analógica ADC1 y Atenuación</legend>

                <div className="fila-dos-cols">
                  <div className="grupo-campo">
                    <label htmlFor="tec-ph-gpio" className="etiqueta-campo">Pin GPIO / Canal ADC1</label>
                    <select id="tec-ph-gpio" name="gpioAdc" className="campo-control" defaultValue="GPIO4_ADC1">
                      <option value="GPIO1_ADC1">GPIO 1</option>
                      <option value="GPIO2_ADC1">GPIO 2</option>
                      <option value="GPIO3_ADC1">GPIO 3</option>
                      <option value="GPIO4_ADC1">GPIO 4</option>
                      <option value="GPIO5_ADC1">GPIO 5</option>
                      <option value="GPIO6_ADC1">GPIO 6</option>
                      <option value="GPIO7_ADC1">GPIO 7</option>
                    </select>
                  </div>

                  <div className="grupo-campo">
                    <label htmlFor="tec-ph-atenuacion" className="etiqueta-campo">Atenuación del ADC</label>
                    <select id="tec-ph-atenuacion" name="atenuacionAdc" className="campo-control" defaultValue="11db">
                      <option value="11db">11 dB · Recomendado</option>
                      <option value="6db">6 dB</option>
                      <option value="2.5db">2.5 dB</option>
                      <option value="0db">0 dB</option>
                    </select>
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
