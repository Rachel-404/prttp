import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import usePageStyles from "../components/usePageStyles";
import initCtrl1 from "../controllers/dashboard.js";
import initCtrl2 from "../controllers/dashboard_charts.js";

const PAGE_CSS = ["/css/dashboard.css"];

export default function Dashboard() {
  usePageStyles(PAGE_CSS);

  useEffect(() => {
    const c1 = initCtrl1();
    const c2 = initCtrl2();
    return () => {
      if (typeof c1 === 'function') c1();
      if (typeof c2 === 'function') c2();
    };
  }, []);

  return (
    <>
      <Layout>


            <section className="dashboard-grid" aria-label="Monitoreo del cultivo en tiempo real">

                
                <article className="card card-sensor" id="card-ec">
                    <header className="titulo-card">
                        <h3>Conductividad Eléctrica</h3>
                        <span id="badge-ec" className="badge-conexion conectado" role="status" aria-live="polite">
                            <span className="punto-estado" aria-hidden="true"></span>
                            <span id="texto-badge-ec">Normal</span>
                        </span>
                    </header>

                    <div className="cuerpo-sensor" aria-live="polite">
                        <p id="valor-ec" className="valor-principal">-- µS/cm</p>
                        <p id="ref-ec" className="rango-referencia">Rango normal: --</p>
                        <p id="diag-ec" className="submetricas-tecnicas" aria-label="Métricas de diagnóstico">Sin telemetría</p>
                    </div>

                    <footer className="pie-sensor">
                        <span id="extra-ec" className="dato-inferior">TDS Estimado: -- ppm</span>
                    </footer>
                </article>

                
                <article className="card card-sensor" id="card-ph">
                    <header className="titulo-card">
                        <h3>pH</h3>
                        <span id="badge-ph" className="badge-conexion sin-senal" role="status" aria-live="polite">
                            <span className="punto-estado" aria-hidden="true"></span>
                            <span id="texto-badge-ph">Cargando</span>
                        </span>
                    </header>

                    <div className="cuerpo-sensor" aria-live="polite">
                        <p id="valor-ph" className="valor-principal">-- pH</p>
                        <p id="ref-ph" className="rango-referencia">Rango normal: --</p>
                        <p id="diag-ph" className="submetricas-tecnicas" aria-label="Métricas de diagnóstico">Analógico ADC1 · GPIO 4</p>
                    </div>

                    <footer className="pie-sensor">
                        <span id="extra-ph" className="dato-inferior">Sonda DFRobot Gravity V2.0</span>
                    </footer>
                </article>

                
                <article className="card card-sensor" id="card-nivel">
                    <header className="titulo-card">
                        <h3>Nivel de agua</h3>
                        <span id="badge-nivel" className="badge-conexion sin-senal" role="status" aria-live="polite">
                            <span className="punto-estado" aria-hidden="true"></span>
                            <span id="texto-badge-nivel">Cargando</span>
                        </span>
                    </header>

                    <div className="cuerpo-sensor" aria-live="polite">
                        <p id="valor-nivel" className="valor-principal">-- %</p>
                        <p id="ref-nivel" className="rango-referencia">Nivel normal: --</p>
                        <p id="diag-nivel" className="submetricas-tecnicas" aria-label="Métricas de diagnóstico">Transmisor 4–20 mA</p>
                    </div>

                    <footer className="pie-sensor">
                        <span id="extra-nivel" className="dato-inferior">Volumen estimado: --</span>
                    </footer>
                </article>

                
                <article className="card card-sensor" id="card-temp-agua">
                    <header className="titulo-card">
                        <h3>Temperatura del agua</h3>
                        <span id="badge-temp-agua" className="badge-conexion sin-senal" role="status" aria-live="polite">
                            <span className="punto-estado" aria-hidden="true"></span>
                            <span id="texto-badge-temp-agua">Cargando</span>
                        </span>
                    </header>

                    <div className="cuerpo-sensor" aria-live="polite">
                        <p id="valor-temp-agua" className="valor-principal">-- °C</p>
                        <p id="ref-temp-agua" className="rango-referencia">Rango normal: --</p>
                        <p id="diag-temp-agua" className="submetricas-tecnicas" aria-label="Métricas de diagnóstico">PT100 / MAX31865</p>
                    </div>

                    <footer className="pie-sensor">
                        <span id="extra-temp-agua" className="dato-inferior">Compensando pH y EC</span>
                    </footer>
                </article>

                
                <article className="card card-sensor" id="card-dht22">
                    <header className="titulo-card">
                        <h3><Link to="/sensores/temperatura-humedad">Microclima Ambiental</Link></h3>
                        <span id="badge-dht22" className="badge-conexion sin-senal" role="status" aria-live="polite">
                            <span className="punto-estado" aria-hidden="true"></span>
                            <span id="texto-badge-dht22">Cargando</span>
                        </span>
                    </header>

                    <div className="cuerpo-sensor" aria-live="polite">
                        <p id="val-temp-amb" className="valor-principal">-- °C</p>
                        <p id="ref-dht22" className="rango-referencia">Humedad relativa: <strong id="val-hum-amb">-- %</strong></p>
                        <p className="submetricas-tecnicas" aria-label="Métricas de diagnóstico">DHT22 · Aire y Humedad</p>
                    </div>

                    <footer className="pie-sensor">
                        <span id="extra-dht22" className="dato-inferior">Rango normal: --</span>
                    </footer>
                </article>

                
                <article className="card card-sensor card-sistema" id="card-microcontrolador">
                    <header className="titulo-card">
                        <h3>Microcontrolador ESP32-S3</h3>
                        <span id="badge-esp32" className="badge-conexion sin-senal" role="status" aria-live="polite">
                            <span className="punto-estado" aria-hidden="true"></span>
                            <span id="texto-badge-esp32">Sin señal</span>
                        </span>
                    </header>

                    <ul className="lista-estado-sistema" aria-live="polite">
                        <li className="item-estado-sistema">
                            <span className="etiqueta-sistema">Señal Wi-Fi:</span>
                            <strong id="wifi-esp32" className="valor-sistema">--</strong>
                        </li>
                        <li className="item-estado-sistema">
                            <span className="etiqueta-sistema">Alimentación:</span>
                            <strong id="alimentacion-esp32" className="valor-sistema">--</strong>
                        </li>
                        <li className="item-estado-sistema">
                            <span className="etiqueta-sistema">Última actualización:</span>
                            <strong id="actualizacion-esp32" className="valor-sistema">Sin registros</strong>
                        </li>
                    </ul>

                    <p className="submetricas-tecnicas submetricas-sistema" aria-label="Métricas de diagnóstico del microcontrolador">Esperando telemetría</p>
                </article>

            </section>

            
            <section className="card card-equipos" aria-label="Estado de equipos y actuadores">
                <header className="titulo-card encabezado-equipos">
                    <h3>Estado de Equipos y Actuadores</h3>
                    <Link to="/reles" className="enlace-gestionar-equipos">
                        <span>Gestionar equipos</span>
                    </Link>
                </header>

                <div className="grid-equipos-dashboard" id="grid-equipos-dashboard" aria-live="polite">
                    <div className="item-equipo" data-canal="1">
                        <span className="nombre-equipo">1. Electrobomba 1</span>
                        <span className="estado-equipo apagado" id="dash-estado-rele-1">
                            <span className="punto-estado-equipo" aria-hidden="true"></span>
                            <span className="texto-estado-equipo">Apagado</span>
                        </span>
                    </div>
                    <div className="item-equipo" data-canal="2">
                        <span className="nombre-equipo">2. Electrobomba 2</span>
                        <span className="estado-equipo apagado" id="dash-estado-rele-2">
                            <span className="punto-estado-equipo" aria-hidden="true"></span>
                            <span className="texto-estado-equipo">Apagado</span>
                        </span>
                    </div>
                    <div className="item-equipo" data-canal="3">
                        <span className="nombre-equipo">3. Electrobomba 3</span>
                        <span className="estado-equipo apagado" id="dash-estado-rele-3">
                            <span className="punto-estado-equipo" aria-hidden="true"></span>
                            <span className="texto-estado-equipo">Apagado</span>
                        </span>
                    </div>
                    <div className="item-equipo" data-canal="4">
                        <span className="nombre-equipo">4. Reflector</span>
                        <span className="estado-equipo apagado" id="dash-estado-rele-4">
                            <span className="punto-estado-equipo" aria-hidden="true"></span>
                            <span className="texto-estado-equipo">Apagado</span>
                        </span>
                    </div>
                    <div className="item-equipo" data-canal="5">
                        <span className="nombre-equipo">5. Canal Reserva 1</span>
                        <span className="estado-equipo apagado" id="dash-estado-rele-5">
                            <span className="punto-estado-equipo" aria-hidden="true"></span>
                            <span className="texto-estado-equipo">Apagado</span>
                        </span>
                    </div>
                    <div className="item-equipo" data-canal="6">
                        <span className="nombre-equipo">6. Canal Reserva 2</span>
                        <span className="estado-equipo apagado" id="dash-estado-rele-6">
                            <span className="punto-estado-equipo" aria-hidden="true"></span>
                            <span className="texto-estado-equipo">Apagado</span>
                        </span>
                    </div>
                    <div className="item-equipo" data-canal="7">
                        <span className="nombre-equipo">7. Canal Reserva 3</span>
                        <span className="estado-equipo apagado" id="dash-estado-rele-7">
                            <span className="punto-estado-equipo" aria-hidden="true"></span>
                            <span className="texto-estado-equipo">Apagado</span>
                        </span>
                    </div>
                    <div className="item-equipo" data-canal="8">
                        <span className="nombre-equipo">8. Canal Reserva 4</span>
                        <span className="estado-equipo apagado" id="dash-estado-rele-8">
                            <span className="punto-estado-equipo" aria-hidden="true"></span>
                            <span className="texto-estado-equipo">Apagado</span>
                        </span>
                    </div>
                </div>
            </section>

            
            <section className="card card-tendencias" aria-label="Tendencias rápidas de las últimas 24 horas">
                <header className="titulo-card encabezado-tendencias">
                    <h3>Tendencia de las últimas 24 horas</h3>
                    <div className="controles-tendencias">
                        <label htmlFor="selector-tendencia" className="sr-only">Variable a graficar</label>
                        <select id="selector-tendencia" className="selector-tendencia" defaultValue="ph">
                            <option value="ph">pH del Agua</option>
                            <option value="ec">Conductividad Eléctrica</option>
                            <option value="temp_agua">Temperatura del Agua</option>
                            <option value="temp_ambiente">Temperatura Ambiente</option>
                            <option value="humedad_ambiente">Humedad Relativa</option>
                            <option value="nivel_agua">Nivel de Agua</option>
                        </select>
                    </div>
                </header>

                <div className="cuerpo-tendencias">
                    <div className="tendencias-layout">
                        <div className="tendencias-grafica-col">
                            <div className="contenedor-canvas-tendencias">
                                <canvas id="grafica-tendencias" role="img" aria-label="Gráfica de tendencia de las últimas 24 horas"></canvas>
                            </div>

                            <div id="leyenda-tendencias" className="leyenda-tendencias" aria-label="Leyenda de la gráfica">
                            </div>
                        </div>

                        <aside className="tendencias-filtros-panel" aria-label="Filtros de fecha y hora para tendencias">
                            <h4 className="titulo-filtros-tendencia">Intervalo de Consulta</h4>

                            <div className="campo-filtro-minimal">
                                <label htmlFor="tendencia-fecha-inicio" className="etiqueta-filtro-minimal">Fecha
                                    inicial</label>
                                <input type="date" id="tendencia-fecha-inicio" name="fechaInicioTendencia" className="input-filtro-minimal" />
                            </div>

                            <div className="campo-filtro-minimal">
                                <label htmlFor="tendencia-hora-inicio" className="etiqueta-filtro-minimal">Hora inicial</label>
                                <input type="time" id="tendencia-hora-inicio" name="horaInicioTendencia" className="input-filtro-minimal" defaultValue="00:00" />
                            </div>

                            <div className="campo-filtro-minimal">
                                <label htmlFor="tendencia-fecha-fin" className="etiqueta-filtro-minimal">Fecha final</label>
                                <input type="date" id="tendencia-fecha-fin" name="fechaFinTendencia" className="input-filtro-minimal" />
                            </div>

                            <div className="campo-filtro-minimal">
                                <label htmlFor="tendencia-hora-fin" className="etiqueta-filtro-minimal">Hora final</label>
                                <input type="time" id="tendencia-hora-fin" name="horaFinTendencia" className="input-filtro-minimal" defaultValue="23:59" />
                            </div>
                        </aside>
                    </div>
                </div>
            </section>
        
      </Layout>


    
    </>
  );
}
