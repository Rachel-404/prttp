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
      if (typeof c1 === 'function') c1();
      if (typeof c2 === 'function') c2();
      if (typeof c3 === 'function') c3();
    };
  }, []);

  return (
    <>
      <Layout plana>

            <div className="modulo-reportes">
                <header className="encabezado-reportes">
                    <div className="titulo-modulo-reportes">
                        <h1>Sensores Físicos del Agua</h1>
                        <p className="subtitulo-modulo">Configuración de nivel hidrostático (LMP633) y temperatura sumergida (RTD PT100).</p>
                    </div>

                    <nav className="barra-pestanas" role="tablist" aria-label="Sensores Físicos del Agua">
                        <button type="button" id="tab-nivel-agua" className="btn-pestana activa" role="tab" aria-selected="true" aria-controls="panel-nivel-agua" data-tab="nivel">
                            <span className="material-symbols-outlined" aria-hidden="true">water</span>
                            <span>Nivel de Agua (LMP633)</span>
                        </button>

                        <button type="button" id="tab-temperatura" className="btn-pestana" role="tab" aria-selected="false" aria-controls="panel-temperatura" data-tab="temperatura">
                            <span className="material-symbols-outlined" aria-hidden="true">device_thermostat</span>
                            <span>Temperatura del Agua (PT100)</span>
                        </button>
                    </nav>
                </header>

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
                                <select id="frecuencia-lectura-na" name="frecuenciaLectura" className="campo-control" defaultValue="10">
                                    <option value="5">Cada 5 segundos</option>
                                    <option value="10">Cada 10 segundos</option>
                                    <option value="30">Cada 30 segundos</option>
                                    <option value="60">Cada 1 minuto</option>
                                    <option value="300">Cada 5 minutos</option>
                                </select>
                            </div>

                            <div className="grupo-campo">
                                <label htmlFor="unidad-principal-na" className="etiqueta-campo">Unidad Principal a Mostrar</label>
                                <select id="unidad-principal-na" name="unidadPrincipal" className="campo-control" defaultValue="cm">
                                    <option value="cm">Centímetros (cm)</option>
                                    <option value="pct">Porcentaje (%)</option>
                                    <option value="L">Litros (L)</option>
                                    <option value="kPa">Kilopascales (kPa)</option>
                                    <option value="MPa">Megapascales (MPa)</option>
                                    <option value="mH2O">Metros columna de agua (mH2O)</option>
                                    <option value="mmH2O">Milímetros columna de agua (mmH2O)</option>
                                    <option value="inH2O">Pulgadas columna de agua (inH2O)</option>
                                    <option value="m">Metros (m)</option>
                                    <option value="mm">Milímetros (mm)</option>
                                </select>
                            </div>
                        </div>

                        
                        <div className="fila-dos-cols">
                            <div className="grupo-campo">
                                <div className="etiqueta-con-ayuda">
                                    <label htmlFor="nivel-minimo-na" className="etiqueta-campo">Nivel Mínimo Crítico (cm)</label>
                                    <div className="ayuda-contextual">
                                        <button type="button" className="btn-ayuda-campo" aria-expanded="false" aria-controls="ayuda-na-min" aria-label="Información sobre Nivel Mínimo Crítico">
                                            <span className="material-symbols-outlined" aria-hidden="true">help</span>
                                        </button>
                                        <div id="ayuda-na-min" className="popover-ayuda" role="region" hidden>
                                            <p className="texto-guia">Protege la bomba de agua contra trabajo en seco.</p>
                                        </div>
                                    </div>
                                </div>
                                <input type="number" id="nivel-minimo-na" name="nivelMinimoCm" className="campo-control" min="0" step="0.5" defaultValue="15" required />
                            </div>

                            <div className="grupo-campo">
                                <div className="etiqueta-con-ayuda">
                                    <label htmlFor="nivel-maximo-na" className="etiqueta-campo">Nivel Máximo Alerta (cm)</label>
                                    <div className="ayuda-contextual">
                                        <button type="button" className="btn-ayuda-campo" aria-expanded="false" aria-controls="ayuda-na-max" aria-label="Información sobre Nivel Máximo Alerta">
                                            <span className="material-symbols-outlined" aria-hidden="true">help</span>
                                        </button>
                                        <div id="ayuda-na-max" className="popover-ayuda popover-ayuda-izq" role="region" hidden>
                                            <p className="texto-guia">Evita desbordamientos en el reservorio.</p>
                                        </div>
                                    </div>
                                </div>
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
                        <h3>Dimensiones del Tanque y Ajuste Cero</h3>
                    </header>

                    <div className="cuerpo-card">
                        
                        <div className="grupo-campo">
                            <label htmlFor="forma-tanque" className="etiqueta-campo">Forma del Tanque</label>
                            <select id="forma-tanque" name="formaTanque" className="campo-control" defaultValue="rectangular">
                                <option value="rectangular">Rectangular / Cuadrado</option>
                                <option value="cilindrico">Cilíndrico</option>
                                <option value="cilindrico_horizontal">Cilíndrico horizontal</option>
                            </select>
                        </div>

                        <div id="campos-rectangular" className="fila-tres-cols">
                            <div className="grupo-campo">
                                <label htmlFor="tanque-largo" className="etiqueta-campo">Largo (m)</label>
                                <input type="number" id="tanque-largo" className="campo-control" min="0.05" step="0.01" defaultValue="0.80" required />
                            </div>
                            <div className="grupo-campo">
                                <label htmlFor="tanque-ancho" className="etiqueta-campo">Ancho (m)</label>
                                <input type="number" id="tanque-ancho" className="campo-control" min="0.05" step="0.01" defaultValue="0.50" required />
                            </div>
                            <div className="grupo-campo">
                                <label htmlFor="tanque-altura-rect" className="etiqueta-campo">Altura Total del Tanque (m)</label>
                                <input type="number" id="tanque-altura-rect" className="campo-control" min="0.05" step="0.01" defaultValue="1.00" required />
                            </div>
                        </div>

                        <div id="campos-cilindrico" className="fila-dos-cols" hidden>
                            <div className="grupo-campo">
                                <label htmlFor="tanque-diametro" className="etiqueta-campo">Diámetro (m)</label>
                                <input type="number" id="tanque-diametro" className="campo-control" min="0.05" step="0.01" defaultValue="0.80" required />
                            </div>
                            <div className="grupo-campo">
                                <label htmlFor="tanque-altura-cil" className="etiqueta-campo">Altura Total del Tanque (m)</label>
                                <input type="number" id="tanque-altura-cil" className="campo-control" min="0.05" step="0.01" defaultValue="1.00" required />
                            </div>
                        </div>

                        <p className="texto-registro">
                            Capacidad total estimada: <strong id="capacidad-estimada-litros">400 Litros</strong>
                        </p>

                        
                        <div className="paso-calibracion">
                            <div className="paso-info">
                                <p className="etiqueta-campo">Calibración de Nivel Cero (Tanque Vacío)</p>
                                <p className="texto-guia">
                                    Si el sensor está suspendido a unos centímetros del fondo o marca una pequeña desviación estando el tanque vacío, presiona este botón para fijar la lectura actual como 0 cm.
                                </p>
                                <p className="texto-registro">
                                    Último ajuste cero: <strong id="ultimo-ajuste-cero">Hace 20 días</strong>
                                </p>
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
                        <h3>Configuración Técnica y Conexión (Solo Técnicos)</h3>
                    </header>

                    <form id="form-tecnico-na" className="cuerpo-card" noValidate>

                                
                                <fieldset className="subseccion-tecnica">
                                    <legend className="subtitulo-tecnico">Subsección A: Señal Eléctrica y Rango de Fábrica</legend>

                                    <div className="grid-tecnico-dos">
                                        <div className="grupo-campo">
                                            <label htmlFor="tec-na-salida" className="etiqueta-campo">Tipo de Salida Eléctrica</label>
                                            <select id="tec-na-salida" name="tipoSalida" className="campo-control" defaultValue="4-20mA">
                                                <option value="4-20mA">4-20 mA (Código F/H - Dos hilos)</option>
                                                <option value="0.5-4.5V-std">0.5–4.5 VDC Estándar (Código 5)</option>
                                                <option value="0.5-4.5V-rad">0.5–4.5 VDC Radiométrica (Código 6)</option>
                                                <option value="modbus">Modbus-RTU / RS485 (Código R/G - Cuatro hilos)</option>
                                            </select>
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="tec-na-url" className="etiqueta-campo">Rango Nominal de Fábrica (URL)</label>
                                            <select id="tec-na-url" name="rangoNominal" className="campo-control" defaultValue="C203G">
                                                <option value="C203G">C203G (0 - 20 kPa / 2 mH2O)</option>
                                                <option value="C403G">C403G (40 kPa / 4 mH2O)</option>
                                                <option value="C104G">C104G (100 kPa / 10 mH2O)</option>
                                                <option value="C204G">C204G (200 kPa)</option>
                                                <option value="C404G">C404G (400 kPa)</option>
                                                <option value="C105G">C105G (1 MPa)</option>
                                                <option value="C205G">C205G (2 MPa)</option>
                                            </select>
                                        </div>
                                    </div>

                                    
                                    <div id="grupo-salida-420ma" className="grid-tecnico-dos">
                                        <div className="grupo-campo">
                                            <label htmlFor="tec-na-shunt" className="etiqueta-campo">Shunt de 100 Ω (0.4 – 2.0 V) protegido para ADC</label>
                                            <input type="number" id="tec-na-shunt" name="resistenciaShunt" className="campo-control" min="10" max="1000" step="1" defaultValue="100" required />
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="tec-na-adc-420" className="etiqueta-campo">Pin ADC ESP32-S3</label>
                                            <select id="tec-na-adc-420" name="pinAdc420" className="campo-control" defaultValue="GPIO2">
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
                                    </div>

                                    
                                    <div id="grupo-salida-vdc" className="grid-tecnico-dos" hidden>
                                        <div className="grupo-campo">
                                            <label htmlFor="tec-na-adc-vdc" className="etiqueta-campo">Pin ADC ESP32-S3</label>
                                            <select id="tec-na-adc-vdc" name="pinAdcVdc" className="campo-control" defaultValue="GPIO2">
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
                                            <div className="etiqueta-con-ayuda">
                                                <label htmlFor="tec-na-divisor" className="etiqueta-campo">Factor Divisor de Tensión</label>
                                                <div className="ayuda-contextual">
                                                    <button type="button" className="btn-ayuda-campo" aria-expanded="false" aria-controls="ayuda-na-divisor" aria-label="Información sobre Factor Divisor de Tensión">
                                                        <span className="material-symbols-outlined" aria-hidden="true">help</span>
                                                    </button>
                                                    <div id="ayuda-na-divisor" className="popover-ayuda popover-ayuda-izq" role="region" hidden>
                                                        <p className="texto-guia">Relación del divisor resistivo para adaptar la señal 0.5–4.5 V al máximo de 3.3 V del ADC del ESP32-S3.</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <input type="number" id="tec-na-divisor" name="factorDivisorTension" className="campo-control" min="0.1" max="10" step="0.01" defaultValue="0.66" required />
                                        </div>

                                        <div id="grupo-vsup-radiometrica" className="grupo-campo" hidden>
                                            <label htmlFor="tec-na-adc-vsup" className="etiqueta-campo">Canal ADC de Tensión de Alimentación (Vsup)</label>
                                            <select id="tec-na-adc-vsup" name="pinAdcVsup" className="campo-control" defaultValue="GPIO3">
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
                                    </div>

                                    
                                    <div id="grupo-salida-modbus" className="grid-tecnico-dos" hidden>
                                        <div className="grupo-campo">
                                            <label htmlFor="tec-na-modbus-codigo" className="etiqueta-campo">Variante de Protocolo</label>
                                            <select id="tec-na-modbus-codigo" name="codigoModbus" className="campo-control" defaultValue="R">
                                                <option value="R">Código R (Solo presión)</option>
                                                <option value="G">Código G (Presión y temperatura)</option>
                                            </select>
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="tec-na-uart" className="etiqueta-campo">Puerto UART</label>
                                            <select id="tec-na-uart" name="uartModbus" className="campo-control" defaultValue="UART1">
                                                <option value="UART1">UART1</option>
                                                <option value="UART2">UART2</option>
                                            </select>
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="tec-na-slave" className="etiqueta-campo">Slave ID</label>
                                            <input type="number" id="tec-na-slave" name="slaveId" className="campo-control" min="1" max="247" step="1" defaultValue="1" required />
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="tec-na-baud" className="etiqueta-campo">Baud Rate</label>
                                            <select id="tec-na-baud" name="baudRate" className="campo-control" defaultValue="9600">
                                                <option value="4800">4800</option>
                                                <option value="9600">9600</option>
                                                <option value="19200">19200</option>
                                                <option value="38400">38400</option>
                                            </select>
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="tec-na-reg-presion" className="etiqueta-campo">Registro de Presión (Hex)</label>
                                            <input type="text" id="tec-na-reg-presion" name="registroPresionHex" className="campo-control" defaultValue="0x0000" required />
                                        </div>
                                    </div>
                                </fieldset>

                                
                                <fieldset className="subseccion-tecnica">
                                    <legend className="subtitulo-tecnico">Subsección B: Escalamiento, Densidad y Estabilidad</legend>

                                    <div className="grid-tecnico-cuatro">
                                        <div className="grupo-campo">
                                            <label htmlFor="tec-na-lrv" className="etiqueta-campo">LRV - Límite Inferior Calibrado (kPa)</label>
                                            <input type="number" id="tec-na-lrv" name="lrvKpa" className="campo-control" min="0" max="100" step="0.1" defaultValue="0" required />
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="tec-na-urv" className="etiqueta-campo">URV - Límite Superior Calibrado (kPa)</label>
                                            <input type="number" id="tec-na-urv" name="urvKpa" className="campo-control" min="0.1" max="100" step="0.1" defaultValue="20" required />
                                        </div>

                                        <div className="grupo-campo">
                                            <div className="etiqueta-con-ayuda">
                                                <label htmlFor="tec-na-densidad" className="etiqueta-campo">Densidad del Líquido ρ (kg/m³)</label>
                                                <div className="ayuda-contextual">
                                                    <button type="button" className="btn-ayuda-campo" aria-expanded="false" aria-controls="ayuda-na-densidad" aria-label="Información sobre Densidad del Líquido">
                                                        <span className="material-symbols-outlined" aria-hidden="true">help</span>
                                                    </button>
                                                    <div id="ayuda-na-densidad" className="popover-ayuda popover-ayuda-izq" role="region" hidden>
                                                        <p className="texto-guia">Ajustado para agua con sales nutrientes hidropónicas.</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <input type="number" id="tec-na-densidad" name="densidadKgM3" className="campo-control" min="500" max="2000" step="1" defaultValue="1005" required />
                                        </div>

                                        <div className="grupo-campo">
                                            <div className="etiqueta-con-ayuda">
                                                <label htmlFor="tec-na-damping" className="etiqueta-campo">Tiempo de Amortiguamiento / Damping (segundos)</label>
                                                <div className="ayuda-contextual">
                                                    <button type="button" className="btn-ayuda-campo" aria-expanded="false" aria-controls="ayuda-na-damping" aria-label="Información sobre Damping">
                                                        <span className="material-symbols-outlined" aria-hidden="true">help</span>
                                                    </button>
                                                    <div id="ayuda-na-damping" className="popover-ayuda popover-ayuda-izq" role="region" hidden>
                                                        <p className="texto-guia">Filtra el oleaje del agua en el reservorio (0 a 100 s).</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <input type="number" id="tec-na-damping" name="dampingSeg" className="campo-control" min="0" max="100" step="1" defaultValue="2" required />
                                        </div>
                                    </div>
                                </fieldset>

                                
                                <fieldset className="subseccion-tecnica">
                                    <legend className="subtitulo-tecnico">Subsección C: Compensación Mecánica del Cabezal</legend>

                                    <div className="grid-tecnico-dos">
                                        <div className="grupo-campo">
                                            <label htmlFor="tec-na-carcasa" className="etiqueta-campo">Tipo de Sonda / Carcasa</label>
                                            <select id="tec-na-carcasa" name="tipoCarcasa" className="campo-control" defaultValue="H46">
                                                <option value="H46">Anticorrosiva PP/PVDF - H46 (Offset automático: 7.5 mm)</option>
                                                <option value="H39">Acero Inoxidable SUS316 - H39 (Offset automático: 4.0 mm)</option>
                                            </select>
                                        </div>

                                        <div className="grupo-campo">
                                            <div className="etiqueta-con-ayuda">
                                                <label htmlFor="tec-na-offset" className="etiqueta-campo">Offset Mecánico Total (mm)</label>
                                                <div className="ayuda-contextual">
                                                    <button type="button" className="btn-ayuda-campo" aria-expanded="false" aria-controls="ayuda-na-offset" aria-label="Información sobre Offset Mecánico Total">
                                                        <span className="material-symbols-outlined" aria-hidden="true">help</span>
                                                    </button>
                                                    <div id="ayuda-na-offset" className="popover-ayuda popover-ayuda-izq" role="region" hidden>
                                                        <p className="texto-guia">Permite sumar altura extra si lleva contrapeso P5/P6.</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <input type="number" id="tec-na-offset" name="offsetMecanicoMm" className="campo-control" min="0" max="500" step="0.5" defaultValue="7.5" required />
                                        </div>
                                    </div>

                                    <div className="fila-tres-cols">
                                        <div className="grupo-campo">
                                            <label htmlFor="tec-na-material" className="etiqueta-campo">Material de la sonda</label>
                                            <select id="tec-na-material" name="materialSonda" className="campo-control" defaultValue="PP">
                                                <option value="PP">PP (Polipropileno)</option>
                                                <option value="PVDF">PVDF</option>
                                                <option value="SUS316">Acero SUS316</option>
                                            </select>
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="tec-na-cable" className="etiqueta-campo">Tipo de cable</label>
                                            <select id="tec-na-cable" name="tipoCable" className="campo-control" defaultValue="N1">
                                                <option value="N1">N1 - PUR</option>
                                                <option value="N2">N2 - PTFE</option>
                                            </select>
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="tec-na-longitud-cable" className="etiqueta-campo">Longitud de cable instalada (m)</label>
                                            <input type="number" id="tec-na-longitud-cable" name="longitudCableM" className="campo-control" min="1" max="200" step="1" defaultValue="5" required />
                                        </div>
                                    </div>

                                    <div className="fila-tres-cols">
                                        <div className="grupo-campo">
                                            <label htmlFor="tec-na-contrapeso" className="etiqueta-campo">Tipo de contrapeso</label>
                                            <select id="tec-na-contrapeso" name="tipoContrapeso" className="campo-control" defaultValue="none">
                                                <option value="none">Sin contrapeso</option>
                                                <option value="P5">P5 - 54 mm</option>
                                                <option value="P6">P6 - 55 mm</option>
                                            </select>
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="tec-na-cant-contrapesos" className="etiqueta-campo">Cantidad de contrapesos</label>
                                            <input type="number" id="tec-na-cant-contrapesos" name="cantidadContrapesos" className="campo-control" min="0" max="3" step="1" defaultValue="0" required />
                                        </div>

                                        <div className="grupo-campo">
                                            <label htmlFor="tec-na-cota-montaje" className="etiqueta-campo">Cota de montaje sobre el fondo (mm)</label>
                                            <input type="number" id="tec-na-cota-montaje" name="cotaMontajeMm" className="campo-control" min="0" max="1000" step="1" defaultValue="0" required />
                                        </div>
                                    </div>

                                    <div className="grupo-campo">
                                        <label htmlFor="offset_cm" className="etiqueta-campo">Offset de calibración (cm)</label>
                                        <input type="number" id="offset_cm" name="offsetCm" className="campo-control" min="-100" max="100" step="0.1" defaultValue="0.0" required />
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

                <section id="panel-temperatura" className="contenido-pestana" role="tabpanel" aria-labelledby="tab-temperatura" hidden>
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
                                            <label htmlFor="tec-temp-conexion" className="etiqueta-campo">Configuración de Hilos del Sensor</label>
                                            <select id="tec-temp-conexion" name="tipoConexion" className="campo-control" defaultValue="3_hilos">
                                                <option value="3_hilos">3 hilos</option>
                                                <option value="2_hilos">2 hilos</option>
                                                <option value="4_hilos">4 hilos</option>
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
