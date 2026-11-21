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
            const MODULO = "nivel_agua";
            const FRECUENCIAS_VALIDAS = [300, 600, 900, 1800, 3600];
            const UNIDADES_VALIDAS = ["pct", "cm", "L", "kPa", "MPa", "mH2O", "m"];
            const RANGOS_VALIDOS = ["C203G", "C403G", "C104G"];
            const PINES_ADC_VALIDOS = ["GPIO1", "GPIO2", "GPIO3", "GPIO4", "GPIO5", "GPIO6", "GPIO7"];

            const DEFAULTS_TECNICOS_NA = {
                rangoNominal: "C203G",
                resistenciaShunt: 100,
                pinAdc420: "GPIO2"
            };

            const estadoModuloNa = {
                activo: true,
                frecuenciaLecturaSeg: 300,
                unidadPrincipal: "pct",
                nivelMinimoCm: 15,
                nivelMaximoCm: 90,
                offsetCm: 0.0
            };

            let estadoTecnicoNa = { ...DEFAULTS_TECNICOS_NA };

            const btnEstado = document.getElementById("btn-estado-na");
            const txtEstado = document.getElementById("estado-na");
            const formControl = document.getElementById("form-control-na");
            const selectFrecuencia = document.getElementById("frecuencia-lectura-na");
            const selectUnidad = document.getElementById("unidad-principal-na");
            const inputNivelMin = document.getElementById("nivel-minimo-na");
            const inputNivelMax = document.getElementById("nivel-maximo-na");
            const errorControl = document.getElementById("error-control-na");

            const inputOffsetCm = document.getElementById("offset_cm");
            const btnFijarCero = document.getElementById("btn-fijar-cero");

            const formTecnico = document.getElementById("form-tecnico-na");
            const selectUrl = document.getElementById("tec-na-url");
            const inputShunt = document.getElementById("tec-na-shunt");
            const selectAdc420 = document.getElementById("tec-na-adc-420");
            const errorTecnico = document.getElementById("error-tecnico-na");
            const btnRestaurarFabrica = document.getElementById("btn-restaurar-fabrica-na");

            const modal = document.getElementById("modal-confirmacion-na");
            const modalTitulo = document.getElementById("modal-na-titulo");
            const modalMensaje = document.getElementById("modal-na-mensaje");
            const btnCancelar = document.getElementById("btn-modal-cancelar-na");
            const btnAceptar = document.getElementById("btn-modal-aceptar-na");
            const toastNa = document.getElementById("toast-na");

            if (!btnEstado || !txtEstado || !modal || !formControl) return;

            let accionConfirmarPendiente = null;
            let toastTimer = null;

            function mostrarToast(texto) {
                if (!toastNa) return;
                toastNa.textContent = texto;
                toastNa.hidden = false;
                if (toastTimer) clearTimeout(toastTimer);
                toastTimer = setTimeout(() => {
                    toastNa.hidden = true;
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
                if (typeof cfg.activo === "boolean") estadoModuloNa.activo = cfg.activo;
                estadoModuloNa.frecuenciaLecturaSeg = normalizarFrecuencia(cfg.frecuenciaSeg);

                const p = cfg.parametrosTecnicos || {};
                if (UNIDADES_VALIDAS.includes(p.unidadPrincipal)) estadoModuloNa.unidadPrincipal = p.unidadPrincipal;
                if (Number.isFinite(Number(p.nivelMinCm ?? cfg.minNormal))) {
                    estadoModuloNa.nivelMinimoCm = Number(p.nivelMinCm ?? cfg.minNormal);
                }
                if (Number.isFinite(Number(p.nivelMaxCm ?? cfg.maxNormal))) {
                    estadoModuloNa.nivelMaximoCm = Number(p.nivelMaxCm ?? cfg.maxNormal);
                }
                if (Number.isFinite(Number(p.offsetCm ?? p.offset_cm))) {
                    estadoModuloNa.offsetCm = Number(p.offsetCm ?? p.offset_cm);
                }
                if (RANGOS_VALIDOS.includes(p.rangoCapsula ?? p.rangoNominal)) {
                    estadoTecnicoNa.rangoNominal = p.rangoCapsula ?? p.rangoNominal;
                }
                if (Number.isFinite(Number(p.resistenciaShunt))) {
                    estadoTecnicoNa.resistenciaShunt = Number(p.resistenciaShunt);
                }
                if (PINES_ADC_VALIDOS.includes(p.pinAdc420)) {
                    estadoTecnicoNa.pinAdc420 = p.pinAdc420;
                }
                sincronizarFormulario();
            }

            async function cargarDesdeBackend() {
                if (!window.AxionApi) return;
                try {
                    const cfg = await window.AxionApi.get(`/sensores/${MODULO}`);
                    aplicarDesdeBackend(cfg);
                } catch (err) {
                    mostrarToast(err.message || "No se pudo cargar la configuración del sensor de nivel.");
                }
            }

            async function guardarControlEnBackend() {
                await window.AxionApi.put(`/sensores/${MODULO}/control`, {
                    activo: estadoModuloNa.activo,
                    frecuenciaSeg: estadoModuloNa.frecuenciaLecturaSeg,
                    minNormal: estadoModuloNa.nivelMinimoCm,
                    maxNormal: estadoModuloNa.nivelMaximoCm
                });
                const cfg = await window.AxionApi.put(`/sensores/${MODULO}/tecnico`, {
                    unidadPrincipal: estadoModuloNa.unidadPrincipal,
                    nivelMinCm: estadoModuloNa.nivelMinimoCm,
                    nivelMaxCm: estadoModuloNa.nivelMaximoCm
                });
                aplicarDesdeBackend(cfg);
            }

            async function guardarTecnicoEnBackend() {
                const cfg = await window.AxionApi.put(`/sensores/${MODULO}/tecnico`, {
                    rangoCapsula: estadoTecnicoNa.rangoNominal,
                    rangoNominal: estadoTecnicoNa.rangoNominal,
                    resistenciaShunt: estadoTecnicoNa.resistenciaShunt,
                    pinAdc420: estadoTecnicoNa.pinAdc420
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
                actualizarIndicadorVisual(estadoModuloNa.activo);
                if (selectFrecuencia) selectFrecuencia.value = String(estadoModuloNa.frecuenciaLecturaSeg);
                if (selectUnidad) selectUnidad.value = estadoModuloNa.unidadPrincipal;
                if (inputNivelMin) inputNivelMin.value = String(estadoModuloNa.nivelMinimoCm);
                if (inputNivelMax) inputNivelMax.value = String(estadoModuloNa.nivelMaximoCm);
                if (inputOffsetCm) inputOffsetCm.value = estadoModuloNa.offsetCm.toFixed(1);
                if (selectUrl) selectUrl.value = estadoTecnicoNa.rangoNominal;
                if (inputShunt) inputShunt.value = String(estadoTecnicoNa.resistenciaShunt);
                if (selectAdc420) selectAdc420.value = estadoTecnicoNa.pinAdc420;
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

            btnEstado.addEventListener("click", () => {
                const nuevoEstado = !estadoModuloNa.activo;
                abrirModalConfirmacion({
                    titulo: nuevoEstado ? "¿Reactivar sensor de nivel de agua?" : "¿Pausar monitoreo de nivel de agua?",
                    mensaje: nuevoEstado
                        ? "El sistema reanudará la lectura continua del nivel del reservorio."
                        : "Se suspenderán las alertas de nivel bajo o desborde temporalmente.",
                    claseBoton: nuevoEstado ? "btn-modal-activar" : "btn-modal-pausar",
                    onAceptar: async () => {
                        const prev = estadoModuloNa.activo;
                        estadoModuloNa.activo = nuevoEstado;
                        try {
                            await guardarControlEnBackend();
                            mostrarToast(nuevoEstado ? "Sensor de nivel activado." : "Sensor de nivel pausado.");
                        } catch (err) {
                            estadoModuloNa.activo = prev;
                            sincronizarFormulario();
                            mostrarToast(err.message || "Error al actualizar el estado del sensor.");
                        }
                    }
                });
            });

            formControl.addEventListener("submit", async (e) => {
                e.preventDefault();
                limpiarError(errorControl);

                const frecuencia = Number(selectFrecuencia.value);
                const unidad = selectUnidad.value;
                const nivelMin = Number.parseFloat(inputNivelMin.value);
                const nivelMax = Number.parseFloat(inputNivelMax.value);

                if (!FRECUENCIAS_VALIDAS.includes(frecuencia)) {
                    mostrarError(errorControl, "Selecciona una frecuencia entre 5 minutos y 1 hora.");
                    return;
                }
                if (!UNIDADES_VALIDAS.includes(unidad)) {
                    mostrarError(errorControl, "Selecciona una unidad de visualización válida.");
                    return;
                }
                if (!Number.isFinite(nivelMin) || !Number.isFinite(nivelMax) || nivelMin < 0 || nivelMin >= nivelMax) {
                    mostrarError(errorControl, "El Nivel Mínimo Crítico debe ser menor que el Nivel Máximo Alerta.");
                    return;
                }

                estadoModuloNa.frecuenciaLecturaSeg = frecuencia;
                estadoModuloNa.unidadPrincipal = unidad;
                estadoModuloNa.nivelMinimoCm = Number(nivelMin.toFixed(1));
                estadoModuloNa.nivelMaximoCm = Number(nivelMax.toFixed(1));

                try {
                    await guardarControlEnBackend();
                    mostrarToast("Configuración de alertas del tanque guardada.");
                } catch (err) {
                    mostrarError(errorControl, err.message || "Error al guardar en el servidor.");
                }
            });

            if (btnFijarCero) {
                btnFijarCero.addEventListener("click", () => {
                    const offsetVal = Number.parseFloat(inputOffsetCm?.value || "0.0");
                    const offsetSeguro = Number.isFinite(offsetVal) ? Number(offsetVal.toFixed(1)) : 0.0;
                    abrirModalConfirmacion({
                        titulo: "¿Fijar nivel cero actual?",
                        mensaje: `Se registrará el punto cero con un offset mecánico de ${offsetSeguro} cm.`,
                        claseBoton: "btn-modal-activar",
                        onAceptar: async () => {
                            try {
                                const res = await window.AxionApi.post("/sensores/nivel_agua/cero", {
                                    offsetCm: offsetSeguro,
                                    offset_cm: offsetSeguro
                                });
                                estadoModuloNa.offsetCm = offsetSeguro;
                                sincronizarFormulario();
                                mostrarToast(res.mensaje || "Calibración de punto cero registrada.");
                            } catch (err) {
                                mostrarToast(err.message || "Error al registrar el punto cero.");
                            }
                        }
                    });
                });
            }

            if (formTecnico) {
                formTecnico.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    limpiarError(errorTecnico);

                    const rangoNominal = selectUrl.value;
                    const resistenciaShunt = Number.parseFloat(inputShunt.value);
                    const pinAdc420 = selectAdc420.value;

                    if (!RANGOS_VALIDOS.includes(rangoNominal)) {
                        mostrarError(errorTecnico, "Selecciona un rango nominal de cápsula válido.");
                        return;
                    }
                    if (!Number.isFinite(resistenciaShunt) || resistenciaShunt < 10 || resistenciaShunt > 165) {
                        mostrarError(errorTecnico, "La Resistencia Shunt debe estar entre 10 y 165 Ω para proteger el ADC de 3.3 V.");
                        return;
                    }
                    if (!PINES_ADC_VALIDOS.includes(pinAdc420)) {
                        mostrarError(errorTecnico, "Selecciona un pin ADC1 válido.");
                        return;
                    }

                    estadoTecnicoNa = {
                        rangoNominal,
                        resistenciaShunt: Number(resistenciaShunt.toFixed(1)),
                        pinAdc420
                    };
                    try {
                        await guardarTecnicoEnBackend();
                        mostrarToast("Configuración técnica LMP633 guardada.");
                    } catch (err) {
                        mostrarError(errorTecnico, err.message || "Error al guardar la configuración técnica.");
                    }
                });
            }

            if (btnRestaurarFabrica) {
                btnRestaurarFabrica.addEventListener("click", () => {
                    abrirModalConfirmacion({
                        titulo: "¿Restaurar valores de fábrica?",
                        mensaje: "Se restablecerán la cápsula C203G, el Shunt de 100 Ω y el pin GPIO 2.",
                        claseBoton: "btn-modal-pausar",
                        onAceptar: async () => {
                            estadoTecnicoNa = { ...DEFAULTS_TECNICOS_NA };
                            try {
                                await guardarTecnicoEnBackend();
                                limpiarError(errorTecnico);
                                mostrarToast("Valores técnicos restaurados de fábrica.");
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
