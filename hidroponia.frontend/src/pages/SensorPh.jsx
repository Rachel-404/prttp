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
          <p className="subtitulo-modulo">Umbrales de acidez, calibración NIST y comunicación RS485 Modbus RTU.</p>
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
                <select id="frecuencia-lectura" name="frecuenciaLectura" className="campo-control" defaultValue="300">
                  <option value="300">Cada 5 minutos</option>
                  <option value="600">Cada 10 minutos</option>
                  <option value="900">Cada 15 minutos</option>
                  <option value="1800">Cada 30 minutos</option>
                  <option value="3600">Cada 1 hora</option>
                </select>
              </div>

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
              <h3>Calibración NIST del pH</h3>
            </header>

            <div className="cuerpo-card">
              <div className="paso-calibracion">
                <div className="paso-info">
                  <p className="etiqueta-campo">Paso 1: Solución Buffer Neutra pH 6.86</p>
                  <p className="texto-guia">
                    Sumerge la sonda limpia en la solución buffer neutra pH 6.86 y espera 1 minuto a que se estabilice la lectura.
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
                      <option value="9.18">Buffer Alcalino pH 9.18</option>
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
                <p className="subtitulo-tecnico">Calibración Directa de 3 Puntos NIST</p>
                <div className="fila-limites">
                  <div className="grupo-campo">
                    <label htmlFor="ph-cal-400" className="etiqueta-campo">Punto Ácido pH 4.00</label>
                    <input type="number" id="ph-cal-400" name="calPh400" className="campo-control" min="0" max="14" step="0.01" defaultValue="4.00" />
                  </div>
                  <div className="grupo-campo">
                    <label htmlFor="ph-cal-686" className="etiqueta-campo">Punto Neutro pH 6.86</label>
                    <input type="number" id="ph-cal-686" name="calPh686" className="campo-control" min="0" max="14" step="0.01" defaultValue="6.86" />
                  </div>
                  <div className="grupo-campo">
                    <label htmlFor="ph-cal-918" className="etiqueta-campo">Punto Alcalino pH 9.18</label>
                    <input type="number" id="ph-cal-918" name="calPh918" className="campo-control" min="0" max="14" step="0.01" defaultValue="9.18" />
                  </div>
                </div>
                <footer className="acciones-card">
                  <button type="button" id="btn-calibrar-tres-puntos" className="btn-modal btn-modal-activar">
                    Registrar Calibración de 3 Puntos
                  </button>
                </footer>
              </div>
            </div>
          </div>

          <div className="card card-tecnica-abierta" id="bloque-tecnico">
            <header className="titulo-card">
              <h3>Configuración Técnica y Comunicación Modbus RTU</h3>
            </header>

            <form id="form-tecnico-ph" className="cuerpo-card" noValidate>
              <fieldset className="subseccion-tecnica">
                <legend className="subtitulo-tecnico">Conexión UART / RS485 y Parámetros Modbus</legend>

                <div className="grid-tecnico-hardware">
                  <div className="grupo-campo">
                    <label htmlFor="tec-uart" className="etiqueta-campo">Puerto Serial</label>
                    <select id="tec-uart" name="uart" className="campo-control" defaultValue="UART1">
                      <option value="UART1">UART1</option>
                      <option value="UART2">UART2</option>
                    </select>
                  </div>

                  <div className="grupo-campo">
                    <label htmlFor="tec-pin-rx" className="etiqueta-campo">Pin Recepción RX - GPIO</label>
                    <input type="number" id="tec-pin-rx" name="pinRx" className="campo-control" min="0" max="48" step="1" defaultValue="18" required />
                  </div>

                  <div className="grupo-campo">
                    <label htmlFor="tec-pin-tx" className="etiqueta-campo">Pin Transmisión TX - GPIO</label>
                    <input type="number" id="tec-pin-tx" name="pinTx" className="campo-control" min="0" max="48" step="1" defaultValue="17" required />
                  </div>

                  <div className="grupo-campo">
                    <label htmlFor="tec-pin-dere" className="etiqueta-campo">Pin Control Flujo DE/RE - GPIO</label>
                    <input type="number" id="tec-pin-dere" name="pinDeRe" className="campo-control" min="0" max="48" step="1" defaultValue="21" required />
                  </div>

                  <div className="grupo-campo">
                    <label htmlFor="tec-slave-id" className="etiqueta-campo">Dirección Modbus / Slave ID</label>
                    <input type="number" id="tec-slave-id" name="slaveId" className="campo-control" min="1" max="247" step="1" defaultValue="1" required />
                  </div>

                  <div className="grupo-campo">
                    <label htmlFor="tec-baud-rate" className="etiqueta-campo">Velocidad en Baudios</label>
                    <select id="tec-baud-rate" name="baudRate" className="campo-control" defaultValue="9600">
                      <option value="9600">9600 bps</option>
                      <option value="19200">19200 bps</option>
                      <option value="115200">115200 bps</option>
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
