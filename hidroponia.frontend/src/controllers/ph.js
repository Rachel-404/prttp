export default function initController() {
    const __docListeners = [];
    const __winListeners = [];
    const __observers = [];
    const __origDocAdd = document.addEventListener.bind(document);
    const __origWinAdd = window.addEventListener.bind(window);
    const __OrigMO = window.MutationObserver;

    const __docProxy = (type, fn, opts) => {
        __docListeners.push([type, fn, opts]);
        return __origDocAdd(type, fn, opts);
    };
    const __winProxy = (type, fn, opts) => {
        __winListeners.push([type, fn, opts]);
        return __origWinAdd(type, fn, opts);
    };
    class __TrackedMO extends __OrigMO {
        constructor(cb) {
            super(cb);
            __observers.push(this);
        }
    }

    document.addEventListener = __docProxy;
    window.addEventListener = __winProxy;
    window.MutationObserver = __TrackedMO;

    try {
        (function () {
            const MODULO = "ph";
            const FRECUENCIAS_VALIDAS = [300, 600, 900, 1800, 3600];
            const BUFFERS_SEGUNDO_PUNTO = {
                "4.00": "Buffer Ácido pH 4.00",
                "9.18": "Buffer Alcalino pH 9.18"
            };
            const UARTS_VALIDOS = ["UART1", "UART2"];
            const BAUDS_VALIDOS = [9600, 19200, 115200];

            const DEFAULTS_TECNICOS_PH = {
                uart: "UART1",
                pinRx: 18,
                pinTx: 17,
                pinDeRe: 21,
                slaveId: 1,
                baudRate: 9600
            };

            const estadoModuloPh = {
                activo: true,
                frecuenciaLecturaSeg: 300,
                phMinimo: 5.5,
                phMaximo: 6.5,
                calPh400: 4.0,
                calPh686: 6.86,
                calPh918: 9.18
            };

            let estadoTecnicoPh = { ...DEFAULTS_TECNICOS_PH };

            const btnEstado = document.getElementById("btn-estado");
            const txtEstado = document.getElementById("estado");
            const formControl = document.getElementById("form-control-cultivo");
            const selectFrecuencia = document.getElementById("frecuencia-lectura");
            const inputPhMinimo = document.getElementById("ph-minimo");
            const inputPhMaximo = document.getElementById("ph-maximo");
            const errorFormulario = document.getElementById("error-control-cultivo");

            const btnCalibrarNeutro = document.getElementById("btn-calibrar-neutro");
            const selectBufferSegundo = document.getElementById("select-buffer-segundo");
            const btnCalibrarSegundo = document.getElementById("btn-calibrar-segundo");
            const inputCal400 = document.getElementById("ph-cal-400");
            const inputCal686 = document.getElementById("ph-cal-686");
            const inputCal918 = document.getElementById("ph-cal-918");
            const btnCalibrarTresPuntos = document.getElementById("btn-calibrar-tres-puntos");

            const formTecnico = document.getElementById("form-tecnico-ph");
            const selectUart = document.getElementById("tec-uart");
            const inputPinRx = document.getElementById("tec-pin-rx");
            const inputPinTx = document.getElementById("tec-pin-tx");
            const inputPinDeRe = document.getElementById("tec-pin-dere");
            const inputSlaveId = document.getElementById("tec-slave-id");
            const selectBaudRate = document.getElementById("tec-baud-rate");
            const errorTecnico = document.getElementById("error-tecnico-ph");
            const btnRestaurarFabrica = document.getElementById("btn-restaurar-fabrica");

            const modal = document.getElementById("modal-confirmacion-ph");
            const modalTitulo = document.getElementById("modal-ph-titulo");
            const modalMensaje = document.getElementById("modal-ph-mensaje");
            const btnCancelar = document.getElementById("btn-modal-cancelar");
            const btnAceptar = document.getElementById("btn-modal-aceptar");
            const toastPh = document.getElementById("toast-ph");

            if (!btnEstado || !txtEstado || !modal || !formControl) return;

            let accionConfirmarPendiente = null;
            let toastTimer = null;

            function mostrarToast(texto) {
                if (!toastPh) return;
                toastPh.textContent = texto;
                toastPh.hidden = false;
                if (toastTimer) clearTimeout(toastTimer);
                toastTimer = setTimeout(() => {
                    toastPh.hidden = true;
                }, 3000);
            }

            function abrirModalConfirmacion({ titulo, mensaje, claseBoton, onAceptar }) {
                accionConfirmarPendiente = onAceptar;
                modalTitulo.textContent = titulo;
                modalMensaje.textContent = mensaje;
                btnAceptar.className = `btn-modal ${claseBoton || "btn-modal-activar"}`;
                modal.hidden = false;
                btnCancelar.focus();
            }

            function cerrarModalConfirmacion() {
                modal.hidden = true;
                accionConfirmarPendiente = null;
            }

            function normalizarFrecuencia(val) {
                const n = Number(val);
                return FRECUENCIAS_VALIDAS.includes(n) ? n : 300;
            }

            function aplicarDesdeBackend(cfg) {
                if (!cfg) return;
                if (typeof cfg.activo === "boolean") estadoModuloPh.activo = cfg.activo;
                estadoModuloPh.frecuenciaLecturaSeg = normalizarFrecuencia(cfg.frecuenciaSeg);
                if (Number.isFinite(Number(cfg.minNormal))) estadoModuloPh.phMinimo = Number(cfg.minNormal);
                if (Number.isFinite(Number(cfg.maxNormal))) estadoModuloPh.phMaximo = Number(cfg.maxNormal);

                const p = cfg.parametrosTecnicos || {};
                if (Number.isFinite(Number(p.calPh400))) estadoModuloPh.calPh400 = Number(p.calPh400);
                if (Number.isFinite(Number(p.calPh686))) estadoModuloPh.calPh686 = Number(p.calPh686);
                if (Number.isFinite(Number(p.calPh918))) estadoModuloPh.calPh918 = Number(p.calPh918);
                if (UARTS_VALIDOS.includes(p.uart)) estadoTecnicoPh.uart = p.uart;
                if (Number.isInteger(Number(p.pinRx))) estadoTecnicoPh.pinRx = Number(p.pinRx);
                if (Number.isInteger(Number(p.pinTx))) estadoTecnicoPh.pinTx = Number(p.pinTx);
                if (Number.isInteger(Number(p.pinDeRe))) estadoTecnicoPh.pinDeRe = Number(p.pinDeRe);
                if (Number.isInteger(Number(p.slaveId))) estadoTecnicoPh.slaveId = Number(p.slaveId);
                if (BAUDS_VALIDOS.includes(Number(p.baudRate))) estadoTecnicoPh.baudRate = Number(p.baudRate);
                sincronizarFormulario();
            }

            async function cargarDesdeBackend() {
                if (!window.AxionApi) return;
                try {
                    const cfg = await window.AxionApi.get(`/sensores/${MODULO}`);
                    aplicarDesdeBackend(cfg);
                } catch (err) {
                    mostrarToast(err.message || "No se pudo cargar la configuración del sensor de pH.");
                }
            }

            async function guardarControlEnBackend() {
                const cfg = await window.AxionApi.put(`/sensores/${MODULO}/control`, {
                    activo: estadoModuloPh.activo,
                    frecuenciaSeg: estadoModuloPh.frecuenciaLecturaSeg,
                    minNormal: estadoModuloPh.phMinimo,
                    maxNormal: estadoModuloPh.phMaximo
                });
                aplicarDesdeBackend(cfg);
            }

            async function guardarTecnicoEnBackend() {
                const cfg = await window.AxionApi.put(`/sensores/${MODULO}/tecnico`, {
                    ...estadoTecnicoPh,
                    calPh400: estadoModuloPh.calPh400,
                    calPh686: estadoModuloPh.calPh686,
                    calPh918: estadoModuloPh.calPh918,
                    estandar: "NIST"
                });
                aplicarDesdeBackend(cfg);
            }

            function actualizarIndicadorVisual(activo) {
                btnEstado.classList.toggle("activo", activo);
                btnEstado.classList.toggle("inactivo", !activo);
                btnEstado.setAttribute("aria-pressed", activo ? "true" : "false");
                txtEstado.textContent = activo ? "Activo" : "Pausado";
            }

            function sincronizarFormulario() {
                actualizarIndicadorVisual(estadoModuloPh.activo);
                if (selectFrecuencia) selectFrecuencia.value = String(estadoModuloPh.frecuenciaLecturaSeg);
                if (inputPhMinimo) inputPhMinimo.value = estadoModuloPh.phMinimo.toFixed(2);
                if (inputPhMaximo) inputPhMaximo.value = estadoModuloPh.phMaximo.toFixed(2);
                if (inputCal400) inputCal400.value = estadoModuloPh.calPh400.toFixed(2);
                if (inputCal686) inputCal686.value = estadoModuloPh.calPh686.toFixed(2);
                if (inputCal918) inputCal918.value = estadoModuloPh.calPh918.toFixed(2);
                if (selectUart) selectUart.value = estadoTecnicoPh.uart;
                if (inputPinRx) inputPinRx.value = String(estadoTecnicoPh.pinRx);
                if (inputPinTx) inputPinTx.value = String(estadoTecnicoPh.pinTx);
                if (inputPinDeRe) inputPinDeRe.value = String(estadoTecnicoPh.pinDeRe);
                if (inputSlaveId) inputSlaveId.value = String(estadoTecnicoPh.slaveId);
                if (selectBaudRate) selectBaudRate.value = String(estadoTecnicoPh.baudRate);
            }

            function mostrarError(el, msg) {
                if (!el) return;
                el.textContent = msg;
                el.hidden = false;
            }

            function limpiarError(el) {
                if (!el) return;
                el.textContent = "";
                el.hidden = true;
            }

            async function ejecutarCalibracion(payload, etiqueta) {
                try {
                    const res = await window.AxionApi.post("/sensores/ph/calibrar", payload);
                    mostrarToast(res.mensaje || `Calibración NIST registrada: ${etiqueta}.`);
                    await cargarDesdeBackend();
                } catch (err) {
                    mostrarToast(err.message || "Error al enviar la calibración de pH.");
                }
            }

            btnEstado.addEventListener("click", () => {
                const nuevoEstado = !estadoModuloPh.activo;
                abrirModalConfirmacion({
                    titulo: nuevoEstado ? "¿Reactivar sensor de pH?" : "¿Pausar monitoreo de pH?",
                    mensaje: nuevoEstado
                        ? "El sistema reanudará la lectura de pH por RS485 y la evaluación de alertas."
                        : "Se suspenderán temporalmente las alertas de pH durante limpieza o calibración.",
                    claseBoton: nuevoEstado ? "btn-modal-activar" : "btn-modal-pausar",
                    onAceptar: async () => {
                        const prev = estadoModuloPh.activo;
                        estadoModuloPh.activo = nuevoEstado;
                        try {
                            await guardarControlEnBackend();
                            mostrarToast(nuevoEstado ? "Sensor de pH activado." : "Sensor de pH pausado.");
                        } catch (err) {
                            estadoModuloPh.activo = prev;
                            sincronizarFormulario();
                            mostrarToast(err.message || "No se pudo actualizar el estado del sensor.");
                        }
                    }
                });
            });

            if (btnCalibrarNeutro) {
                btnCalibrarNeutro.addEventListener("click", () => {
                    abrirModalConfirmacion({
                        titulo: "Calibrar Punto Neutro",
                        mensaje: "¿Confirmas que la sonda está sumergida en la solución buffer pH 6.86?",
                        claseBoton: "btn-modal-activar",
                        onAceptar: () => ejecutarCalibracion({ paso: "PUNTO_NEUTRO", bufferPh: 6.86, calPh686: 6.86 }, "pH 6.86")
                    });
                });
            }

            if (btnCalibrarSegundo && selectBufferSegundo) {
                btnCalibrarSegundo.addEventListener("click", () => {
                    const valor = selectBufferSegundo.value;
                    const etiqueta = BUFFERS_SEGUNDO_PUNTO[valor] || `pH ${valor}`;
                    abrirModalConfirmacion({
                        titulo: "Calibrar Segundo Punto",
                        mensaje: `¿Confirmas la calibración del segundo punto con ${etiqueta}?`,
                        claseBoton: "btn-modal-activar",
                        onAceptar: () => ejecutarCalibracion({ paso: "SEGUNDO_PUNTO", bufferPh: Number(valor) }, etiqueta)
                    });
                });
            }

            if (btnCalibrarTresPuntos) {
                btnCalibrarTresPuntos.addEventListener("click", () => {
                    const c400 = Number.parseFloat(inputCal400?.value || "4.00");
                    const c686 = Number.parseFloat(inputCal686?.value || "6.86");
                    const c918 = Number.parseFloat(inputCal918?.value || "9.18");
                    if (![c400, c686, c918].every((v) => Number.isFinite(v) && v >= 0 && v <= 14) || !(c400 < c686 && c686 < c918)) {
                        mostrarToast("Los 3 puntos deben ser valores válidos en orden: ácido < neutro < alcalino.");
                        return;
                    }
                    estadoModuloPh.calPh400 = Number(c400.toFixed(2));
                    estadoModuloPh.calPh686 = Number(c686.toFixed(2));
                    estadoModuloPh.calPh918 = Number(c918.toFixed(2));
                    ejecutarCalibracion(
                        {
                            paso: "TRES_PUNTOS",
                            calPh400: estadoModuloPh.calPh400,
                            calPh686: estadoModuloPh.calPh686,
                            calPh918: estadoModuloPh.calPh918
                        },
                        `${estadoModuloPh.calPh400} / ${estadoModuloPh.calPh686} / ${estadoModuloPh.calPh918}`
                    );
                });
            }

            formControl.addEventListener("submit", async (e) => {
                e.preventDefault();
                limpiarError(errorFormulario);

                const frecuencia = Number(selectFrecuencia.value);
                const phMin = Number.parseFloat(inputPhMinimo.value);
                const phMax = Number.parseFloat(inputPhMaximo.value);

                if (!FRECUENCIAS_VALIDAS.includes(frecuencia)) {
                    mostrarError(errorFormulario, "Selecciona una frecuencia de lectura entre 5 minutos y 1 hora.");
                    return;
                }
                if (!Number.isFinite(phMin) || phMin < 0 || phMin > 14 || !Number.isFinite(phMax) || phMax < 0 || phMax > 14) {
                    mostrarError(errorFormulario, "Los umbrales de pH deben estar entre 0.00 y 14.00.");
                    return;
                }
                if (phMin >= phMax) {
                    mostrarError(errorFormulario, "El pH Mínimo debe ser menor que el pH Máximo.");
                    return;
                }

                estadoModuloPh.frecuenciaLecturaSeg = frecuencia;
                estadoModuloPh.phMinimo = Number(phMin.toFixed(2));
                estadoModuloPh.phMaximo = Number(phMax.toFixed(2));

                try {
                    await guardarControlEnBackend();
                    mostrarToast("Configuración de alertas y control de pH guardada.");
                } catch (err) {
                    mostrarError(errorFormulario, err.message || "Error al guardar en el servidor.");
                }
            });

            if (formTecnico) {
                formTecnico.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    limpiarError(errorTecnico);

                    const uart = selectUart.value;
                    const pinRx = Number(inputPinRx.value);
                    const pinTx = Number(inputPinTx.value);
                    const pinDeRe = Number(inputPinDeRe.value);
                    const slaveId = Number(inputSlaveId.value);
                    const baudRate = Number(selectBaudRate.value);

                    if (!UARTS_VALIDOS.includes(uart)) {
                        mostrarError(errorTecnico, "Selecciona un puerto UART válido.");
                        return;
                    }
                    const pines = [pinRx, pinTx, pinDeRe];
                    if (pines.some((p) => !Number.isInteger(p) || p < 0 || p > 48) || new Set(pines).size !== 3) {
                        mostrarError(errorTecnico, "Los pines RX, TX y DE/RE deben ser enteros distintos entre 0 y 48.");
                        return;
                    }
                    if (!Number.isInteger(slaveId) || slaveId < 1 || slaveId > 247) {
                        mostrarError(errorTecnico, "El Slave ID Modbus debe estar entre 1 y 247.");
                        return;
                    }
                    if (!BAUDS_VALIDOS.includes(baudRate)) {
                        mostrarError(errorTecnico, "Selecciona una velocidad en baudios válida.");
                        return;
                    }

                    estadoTecnicoPh = { uart, pinRx, pinTx, pinDeRe, slaveId, baudRate };
                    try {
                        await guardarTecnicoEnBackend();
                        mostrarToast("Configuración técnica Modbus RTU guardada.");
                    } catch (err) {
                        mostrarError(errorTecnico, err.message || "Error al guardar la configuración técnica.");
                    }
                });
            }

            if (btnRestaurarFabrica) {
                btnRestaurarFabrica.addEventListener("click", () => {
                    abrirModalConfirmacion({
                        titulo: "¿Restaurar valores de fábrica?",
                        mensaje: "Se restablecerán los pines UART1 y parámetros Modbus RTU a sus valores por defecto.",
                        claseBoton: "btn-modal-pausar",
                        onAceptar: async () => {
                            estadoTecnicoPh = { ...DEFAULTS_TECNICOS_PH };
                            try {
                                await guardarTecnicoEnBackend();
                                limpiarError(errorTecnico);
                                mostrarToast("Valores técnicos de fábrica restaurados.");
                            } catch (err) {
                                mostrarToast(err.message || "Error al restaurar valores de fábrica.");
                            }
                        }
                    });
                });
            }

            btnAceptar.addEventListener("click", () => {
                if (typeof accionConfirmarPendiente === "function") accionConfirmarPendiente();
                cerrarModalConfirmacion();
            });
            btnCancelar.addEventListener("click", cerrarModalConfirmacion);
            modal.addEventListener("click", (e) => {
                if (e.target === modal) cerrarModalConfirmacion();
            });

            sincronizarFormulario();
            cargarDesdeBackend();
        })();
    } finally {
        document.addEventListener = __origDocAdd;
        window.addEventListener = __origWinAdd;
        window.MutationObserver = __OrigMO;
    }

    return () => {
        __docListeners.forEach(([t, fn, opts]) => document.removeEventListener(t, fn, opts));
        __winListeners.forEach(([t, fn, opts]) => window.removeEventListener(t, fn, opts));
        __observers.forEach((obs) => obs.disconnect());
    };
}
