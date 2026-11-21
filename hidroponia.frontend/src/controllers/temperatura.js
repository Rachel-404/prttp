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
            const MODULO = "temp_agua";
            const FRECUENCIAS_VALIDAS = [300, 600, 900, 1800, 3600];
            const CONEXIONES_VALIDAS = ["3_hilos", "2_hilos", "4_hilos"];
            const PINES_CS_VALIDOS = ["GPIO5", "GPIO10", "GPIO15"];
            const FILTROS_RED_VALIDOS = ["60Hz", "50Hz"];

            const DEFAULTS_TECNICOS_TEMP = {
                tipoConexion: "3_hilos",
                pinCs: "GPIO5",
                rrefOhmios: 430.0,
                coeficienteAlpha: 0.00385,
                filtroRed: "60Hz"
            };

            const estadoModuloTemp = {
                activo: true,
                frecuenciaLecturaSeg: 300,
                tempMinimaAgua: 18.0,
                tempMaximaAgua: 24.0,
                compensarOtrosSensores: true,
                offsetCelsius: 0.0
            };

            let estadoTecnicoTemp = { ...DEFAULTS_TECNICOS_TEMP };

            const btnEstado = document.getElementById("btn-estado-temp");
            const txtEstado = document.getElementById("estado-temp");
            const formControl = document.getElementById("form-control-temp");
            const selectFrecuencia = document.getElementById("frecuencia-lectura-temp");
            const inputTempMin = document.getElementById("temp-minimo-agua");
            const inputTempMax = document.getElementById("temp-maximo-agua");
            const btnCompensarOtros = document.getElementById("btn-compensar-otros");
            const txtCompensarOtros = document.getElementById("texto-compensar-otros");
            const errorControl = document.getElementById("error-control-temp");

            const inputOffset = document.getElementById("offset-temp-calibracion");
            const btnAplicarAjuste = document.getElementById("btn-aplicar-ajuste-temp");
            const errorCalibracion = document.getElementById("error-calibracion-temp");

            const formTecnico = document.getElementById("form-tecnico-temp");
            const selectConexion = document.getElementById("tec-temp-conexion");
            const selectPinCs = document.getElementById("tec-temp-pin-cs");
            const inputRref = document.getElementById("tec-temp-rref");
            const inputAlpha = document.getElementById("tec-temp-alpha");
            const selectFiltro = document.getElementById("tec-temp-filtro");
            const errorTecnico = document.getElementById("error-tecnico-temp");
            const btnRestaurarFabrica = document.getElementById("btn-restaurar-fabrica-temp");

            const modal = document.getElementById("modal-confirmacion-temp");
            const modalTitulo = document.getElementById("modal-temp-titulo");
            const modalMensaje = document.getElementById("modal-temp-mensaje");
            const btnCancelar = document.getElementById("btn-modal-cancelar-temp");
            const btnAceptar = document.getElementById("btn-modal-aceptar-temp");
            const toastTemp = document.getElementById("toast-temp");

            if (!btnEstado || !txtEstado || !modal || !formControl) return;

            let accionConfirmarPendiente = null;
            let toastTimer = null;

            function mostrarToast(texto) {
                if (!toastTemp) return;
                toastTemp.textContent = texto;
                toastTemp.hidden = false;
                if (toastTimer) clearTimeout(toastTimer);
                toastTimer = setTimeout(() => {
                    toastTemp.hidden = true;
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
                if (typeof cfg.activo === "boolean") estadoModuloTemp.activo = cfg.activo;
                estadoModuloTemp.frecuenciaLecturaSeg = normalizarFrecuencia(cfg.frecuenciaSeg);
                if (Number.isFinite(Number(cfg.minNormal))) estadoModuloTemp.tempMinimaAgua = Number(cfg.minNormal);
                if (Number.isFinite(Number(cfg.maxNormal))) estadoModuloTemp.tempMaximaAgua = Number(cfg.maxNormal);

                const p = cfg.parametrosTecnicos || {};
                if (typeof p.compensarOtros === "boolean") estadoModuloTemp.compensarOtrosSensores = p.compensarOtros;
                if (Number.isFinite(Number(p.offsetCelsius))) estadoModuloTemp.offsetCelsius = Number(p.offsetCelsius);
                if (CONEXIONES_VALIDAS.includes(p.tipoConexion)) estadoTecnicoTemp.tipoConexion = p.tipoConexion;
                if (PINES_CS_VALIDOS.includes(p.pinCs)) estadoTecnicoTemp.pinCs = p.pinCs;
                if (Number.isFinite(Number(p.rrefOhmios))) estadoTecnicoTemp.rrefOhmios = Number(p.rrefOhmios);
                if (Number.isFinite(Number(p.coeficienteAlpha))) estadoTecnicoTemp.coeficienteAlpha = Number(p.coeficienteAlpha);
                if (FILTROS_RED_VALIDOS.includes(p.filtroRed)) estadoTecnicoTemp.filtroRed = p.filtroRed;

                sincronizarFormulario();
            }

            async function cargarDesdeBackend() {
                if (!window.AxionApi) return;
                try {
                    const cfg = await window.AxionApi.get(`/sensores/${MODULO}`);
                    aplicarDesdeBackend(cfg);
                } catch (err) {
                    mostrarToast(err.message || "No se pudo cargar la configuración de temperatura del agua.");
                }
            }

            async function guardarControlEnBackend() {
                await window.AxionApi.put(`/sensores/${MODULO}/control`, {
                    activo: estadoModuloTemp.activo,
                    frecuenciaSeg: estadoModuloTemp.frecuenciaLecturaSeg,
                    minNormal: estadoModuloTemp.tempMinimaAgua,
                    maxNormal: estadoModuloTemp.tempMaximaAgua
                });
                const cfg = await window.AxionApi.put(`/sensores/${MODULO}/tecnico`, {
                    compensarOtros: estadoModuloTemp.compensarOtrosSensores
                });
                aplicarDesdeBackend(cfg);
            }

            async function guardarTecnicoEnBackend() {
                const cfg = await window.AxionApi.put(`/sensores/${MODULO}/tecnico`, {
                    ...estadoTecnicoTemp,
                    offsetCelsius: estadoModuloTemp.offsetCelsius
                });
                aplicarDesdeBackend(cfg);
            }

            function actualizarIndicadorVisual(activo) {
                btnEstado.classList.toggle("activo", activo);
                btnEstado.classList.toggle("inactivo", !activo);
                btnEstado.setAttribute("aria-pressed", activo ? "true" : "false");
                txtEstado.textContent = activo ? "Activo" : "Pausado";
            }

            function actualizarBotonCompensacion(activada) {
                if (!btnCompensarOtros || !txtCompensarOtros) return;
                btnCompensarOtros.classList.toggle("activo", activada);
                btnCompensarOtros.classList.toggle("inactivo", !activada);
                btnCompensarOtros.setAttribute("aria-pressed", activada ? "true" : "false");
                txtCompensarOtros.textContent = activada ? "Activada" : "Desactivada";
            }

            function sincronizarFormulario() {
                actualizarIndicadorVisual(estadoModuloTemp.activo);
                if (selectFrecuencia) selectFrecuencia.value = String(estadoModuloTemp.frecuenciaLecturaSeg);
                if (inputTempMin) inputTempMin.value = estadoModuloTemp.tempMinimaAgua.toFixed(1);
                if (inputTempMax) inputTempMax.value = estadoModuloTemp.tempMaximaAgua.toFixed(1);
                actualizarBotonCompensacion(estadoModuloTemp.compensarOtrosSensores);
                if (inputOffset) inputOffset.value = estadoModuloTemp.offsetCelsius.toFixed(1);
                if (selectConexion) selectConexion.value = estadoTecnicoTemp.tipoConexion;
                if (selectPinCs) selectPinCs.value = estadoTecnicoTemp.pinCs;
                if (inputRref) inputRref.value = estadoTecnicoTemp.rrefOhmios.toFixed(1);
                if (inputAlpha) inputAlpha.value = String(estadoTecnicoTemp.coeficienteAlpha);
                if (selectFiltro) selectFiltro.value = estadoTecnicoTemp.filtroRed;
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
                const nuevoEstado = !estadoModuloTemp.activo;
                abrirModalConfirmacion({
                    titulo: nuevoEstado ? "¿Reactivar sonda PT100 de temperatura?" : "¿Pausar monitoreo de temperatura?",
                    mensaje: nuevoEstado
                        ? "El sistema reanudará la lectura continua de la temperatura del agua."
                        : "Se suspenderán las alertas térmicas del agua temporalmente.",
                    claseBoton: nuevoEstado ? "btn-modal-activar" : "btn-modal-pausar",
                    onAceptar: async () => {
                        const prev = estadoModuloTemp.activo;
                        estadoModuloTemp.activo = nuevoEstado;
                        try {
                            await guardarControlEnBackend();
                            mostrarToast(nuevoEstado ? "Sonda PT100 activada." : "Sonda PT100 pausada.");
                        } catch (err) {
                            estadoModuloTemp.activo = prev;
                            sincronizarFormulario();
                            mostrarToast(err.message || "Error al actualizar el estado de la sonda.");
                        }
                    }
                });
            });

            if (btnCompensarOtros) {
                btnCompensarOtros.addEventListener("click", () => {
                    actualizarBotonCompensacion(!btnCompensarOtros.classList.contains("activo"));
                });
            }

            formControl.addEventListener("submit", async (e) => {
                e.preventDefault();
                limpiarError(errorControl);

                const frecuencia = Number(selectFrecuencia.value);
                const tempMin = Number.parseFloat(inputTempMin.value);
                const tempMax = Number.parseFloat(inputTempMax.value);

                if (!FRECUENCIAS_VALIDAS.includes(frecuencia)) {
                    mostrarError(errorControl, "Selecciona una frecuencia entre 5 minutos y 1 hora.");
                    return;
                }
                if (!Number.isFinite(tempMin) || !Number.isFinite(tempMax) || tempMin >= tempMax) {
                    mostrarError(errorControl, "La Temperatura Mínima debe ser menor que la Temperatura Máxima.");
                    return;
                }

                estadoModuloTemp.frecuenciaLecturaSeg = frecuencia;
                estadoModuloTemp.tempMinimaAgua = Number(tempMin.toFixed(1));
                estadoModuloTemp.tempMaximaAgua = Number(tempMax.toFixed(1));
                estadoModuloTemp.compensarOtrosSensores = btnCompensarOtros
                    ? btnCompensarOtros.classList.contains("activo")
                    : true;

                try {
                    await guardarControlEnBackend();
                    mostrarToast("Configuración térmica guardada.");
                } catch (err) {
                    mostrarError(errorControl, err.message || "Error al guardar en el servidor.");
                }
            });

            if (btnAplicarAjuste && inputOffset) {
                btnAplicarAjuste.addEventListener("click", () => {
                    limpiarError(errorCalibracion);
                    const offset = Number.parseFloat(inputOffset.value);
                    if (!Number.isFinite(offset) || offset < -20 || offset > 20) {
                        mostrarError(errorCalibracion, "Ingresa una desviación entre -20.0 y +20.0 °C.");
                        return;
                    }
                    abrirModalConfirmacion({
                        titulo: "¿Aplicar ajuste de desviación térmica?",
                        mensaje: `Se guardará un offset de ${offset.toFixed(1)} °C para la sonda PT100.`,
                        claseBoton: "btn-modal-activar",
                        onAceptar: async () => {
                            estadoModuloTemp.offsetCelsius = Number(offset.toFixed(1));
                            try {
                                await guardarTecnicoEnBackend();
                                mostrarToast("Offset térmico guardado.");
                            } catch (err) {
                                mostrarToast(err.message || "Error al guardar el offset térmico.");
                            }
                        }
                    });
                });
            }

            if (formTecnico) {
                formTecnico.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    limpiarError(errorTecnico);

                    const tipoConexion = selectConexion.value;
                    const pinCs = selectPinCs ? selectPinCs.value : "GPIO5";
                    const rrefOhmios = Number.parseFloat(inputRref.value);
                    const coeficienteAlpha = Number.parseFloat(inputAlpha.value);
                    const filtroRed = selectFiltro.value;

                    if (!CONEXIONES_VALIDAS.includes(tipoConexion)) {
                        mostrarError(errorTecnico, "Selecciona una configuración de hilos válida.");
                        return;
                    }
                    if (!PINES_CS_VALIDOS.includes(pinCs)) {
                        mostrarError(errorTecnico, "Selecciona un pin SPI CS válido.");
                        return;
                    }
                    if (!Number.isFinite(rrefOhmios) || rrefOhmios < 100 || rrefOhmios > 1000) {
                        mostrarError(errorTecnico, "La Resistencia Rref debe estar entre 100.0 y 1000.0 Ω.");
                        return;
                    }
                    if (!Number.isFinite(coeficienteAlpha) || coeficienteAlpha < 0.001 || coeficienteAlpha > 0.01) {
                        mostrarError(errorTecnico, "El Coeficiente α debe estar entre 0.00100 y 0.01000.");
                        return;
                    }
                    if (!FILTROS_RED_VALIDOS.includes(filtroRed)) {
                        mostrarError(errorTecnico, "Selecciona un filtro de red válido.");
                        return;
                    }

                    estadoTecnicoTemp = {
                        tipoConexion,
                        pinCs,
                        rrefOhmios: Number(rrefOhmios.toFixed(1)),
                        coeficienteAlpha: Number(coeficienteAlpha.toFixed(5)),
                        filtroRed
                    };
                    try {
                        await guardarTecnicoEnBackend();
                        mostrarToast("Configuración técnica PT100 / MAX31865 guardada.");
                    } catch (err) {
                        mostrarError(errorTecnico, err.message || "Error al guardar la configuración técnica.");
                    }
                });
            }

            if (btnRestaurarFabrica) {
                btnRestaurarFabrica.addEventListener("click", () => {
                    abrirModalConfirmacion({
                        titulo: "¿Restaurar valores de fábrica?",
                        mensaje: "Se restablecerán la conexión de 3 hilos, Rref 430.0 Ω, α 0.00385 y filtro 60 Hz.",
                        claseBoton: "btn-modal-pausar",
                        onAceptar: async () => {
                            estadoTecnicoTemp = { ...DEFAULTS_TECNICOS_TEMP };
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
