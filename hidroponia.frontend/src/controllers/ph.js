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
                "10.00": "Buffer Alcalino pH 10.00"
            };
            const GPIOS_ADC_VALIDOS = [
                "GPIO1_ADC1", "GPIO2_ADC1", "GPIO3_ADC1", "GPIO4_ADC1",
                "GPIO5_ADC1", "GPIO6_ADC1", "GPIO7_ADC1"
            ];
            const ATENUACIONES_VALIDAS = ["11db", "6db", "2.5db", "0db"];

            const DEFAULTS_TECNICOS_PH = {
                gpioAdc: "GPIO4_ADC1",
                atenuacionAdc: "11db"
            };

            const estadoModuloPh = {
                activo: true,
                frecuenciaLecturaSeg: 300,
                phMinimo: 5.5,
                phMaximo: 6.5,
                voltajeNeutroMv: 1500.0,
                voltajeAcidoMv: 2032.44
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
            const inputVoltajeNeutro = document.getElementById("ph-voltaje-neutro");
            const inputVoltajeAcido = document.getElementById("ph-voltaje-acido");
            const btnCalibrarVoltajes = document.getElementById("btn-calibrar-tres-puntos");

            const formTecnico = document.getElementById("form-tecnico-ph");
            const selectGpioAdc = document.getElementById("tec-ph-gpio");
            const selectAtenuacion = document.getElementById("tec-ph-atenuacion");
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
                if (Number.isFinite(Number(p.voltajeNeutroMv))) estadoModuloPh.voltajeNeutroMv = Number(p.voltajeNeutroMv);
                if (Number.isFinite(Number(p.voltajeAcidoMv))) estadoModuloPh.voltajeAcidoMv = Number(p.voltajeAcidoMv);
                if (GPIOS_ADC_VALIDOS.includes(p.gpioAdc)) estadoTecnicoPh.gpioAdc = p.gpioAdc;
                if (ATENUACIONES_VALIDAS.includes(p.atenuacionAdc)) estadoTecnicoPh.atenuacionAdc = p.atenuacionAdc;
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
                    voltajeNeutroMv: estadoModuloPh.voltajeNeutroMv,
                    voltajeAcidoMv: estadoModuloPh.voltajeAcidoMv,
                    tipoSensor: "analogico_dfrobot_v2"
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
                if (inputVoltajeNeutro) inputVoltajeNeutro.value = estadoModuloPh.voltajeNeutroMv.toFixed(1);
                if (inputVoltajeAcido) inputVoltajeAcido.value = estadoModuloPh.voltajeAcidoMv.toFixed(2);
                if (selectGpioAdc) selectGpioAdc.value = estadoTecnicoPh.gpioAdc;
                if (selectAtenuacion) selectAtenuacion.value = estadoTecnicoPh.atenuacionAdc;
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
                        ? "El sistema reanudará la lectura analógica de pH (GPIO 4) y la evaluación de alertas."
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
                        mensaje: "¿Confirmas que la sonda está sumergida en la solución buffer pH 7.00?",
                        claseBoton: "btn-modal-activar",
                        onAceptar: () => ejecutarCalibracion({ paso: "PUNTO_NEUTRO", bufferPh: 7.0 }, "pH 7.00")
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

            if (btnCalibrarVoltajes) {
                btnCalibrarVoltajes.addEventListener("click", () => {
                    const vNeutro = Number.parseFloat(inputVoltajeNeutro?.value || "1500.0");
                    const vAcido = Number.parseFloat(inputVoltajeAcido?.value || "2032.44");
                    if (!Number.isFinite(vNeutro) || !Number.isFinite(vAcido) || vNeutro <= 0 || vAcido <= 0 || Math.abs(vNeutro - vAcido) < 10) {
                        mostrarToast("Ingresa voltajes válidos en mV distintos entre pH 7.0 y pH 4.0.");
                        return;
                    }
                    estadoModuloPh.voltajeNeutroMv = Number(vNeutro.toFixed(1));
                    estadoModuloPh.voltajeAcidoMv = Number(vAcido.toFixed(2));
                    ejecutarCalibracion(
                        {
                            paso: "VOLTAJES_MV",
                            voltajeNeutroMv: estadoModuloPh.voltajeNeutroMv,
                            voltajeAcidoMv: estadoModuloPh.voltajeAcidoMv
                        },
                        `${estadoModuloPh.voltajeNeutroMv} / ${estadoModuloPh.voltajeAcidoMv} mV`
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

                    const gpioAdc = selectGpioAdc ? selectGpioAdc.value : "GPIO4_ADC1";
                    const atenuacionAdc = selectAtenuacion ? selectAtenuacion.value : "11db";

                    if (!GPIOS_ADC_VALIDOS.includes(gpioAdc)) {
                        mostrarError(errorTecnico, "Selecciona un canal GPIO / ADC1 válido.");
                        return;
                    }
                    if (!ATENUACIONES_VALIDAS.includes(atenuacionAdc)) {
                        mostrarError(errorTecnico, "Selecciona una atenuación ADC válida.");
                        return;
                    }

                    estadoTecnicoPh = { gpioAdc, atenuacionAdc };
                    try {
                        await guardarTecnicoEnBackend();
                        mostrarToast("Configuración técnica ADC1 del sensor de pH guardada.");
                    } catch (err) {
                        mostrarError(errorTecnico, err.message || "Error al guardar la configuración técnica.");
                    }
                });
            }

            if (btnRestaurarFabrica) {
                btnRestaurarFabrica.addEventListener("click", () => {
                    abrirModalConfirmacion({
                        titulo: "¿Restaurar valores de fábrica?",
                        mensaje: "Se restablecerá la entrada analógica en GPIO 4 y atenuación 11 dB.",
                        claseBoton: "btn-modal-pausar",
                        onAceptar: async () => {
                            estadoTecnicoPh = { ...DEFAULTS_TECNICOS_PH };
                            estadoModuloPh.voltajeNeutroMv = 1500.0;
                            estadoModuloPh.voltajeAcidoMv = 2032.44;
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
