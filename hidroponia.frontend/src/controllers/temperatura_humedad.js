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
            const MODULO = "dht22";
            const FRECUENCIAS_VALIDAS = [300, 600, 900, 1800, 3600];
            const GPIOS_VALIDOS = ["GPIO 4", "GPIO 5", "GPIO 15", "GPIO 16", "GPIO 17", "GPIO 18", "GPIO 21"];
            const PULLUPS_VALIDOS = ["externa_10k", "interna_esp32"];

            const DEFAULTS_TECNICOS_DHT22 = {
                pinGpio: "GPIO 4",
                resistenciaPullUp: "externa_10k"
            };

            const estadoModuloDht22 = {
                activo: true,
                frecuenciaLecturaSeg: 300,
                tempMinimaAire: 18.0,
                tempMaximaAire: 28.0,
                humedadMinima: 50,
                humedadMaxima: 80,
                offsetTemperatura: 0.0,
                offsetHumedad: 0.0
            };

            let estadoTecnicoDht22 = { ...DEFAULTS_TECNICOS_DHT22 };

            const btnEstado = document.getElementById("btn-estado-dht22");
            const txtEstado = document.getElementById("estado-dht22");
            const formControl = document.getElementById("form-control-dht22");
            const selectFrecuencia = document.getElementById("frecuencia-lectura-dht22");
            const inputTempMin = document.getElementById("temp-min-aire");
            const inputTempMax = document.getElementById("temp-max-aire");
            const inputHumMin = document.getElementById("humedad-min-aire");
            const inputHumMax = document.getElementById("humedad-max-aire");
            const errorControl = document.getElementById("error-control-dht22");

            const inputOffsetTemp = document.getElementById("offset-temp-dht22");
            const inputOffsetHum = document.getElementById("offset-humedad-dht22");
            const btnAplicarAjuste = document.getElementById("btn-aplicar-ajuste-dht22");
            const errorCalibracion = document.getElementById("error-calibracion-dht22");

            const formTecnico = document.getElementById("form-tecnico-dht22");
            const selectGpio = document.getElementById("tec-dht22-gpio");
            const selectPullUp = document.getElementById("tec-dht22-pullup");
            const errorTecnico = document.getElementById("error-tecnico-dht22");
            const btnRestaurarFabrica = document.getElementById("btn-restaurar-fabrica-dht22");

            const modal = document.getElementById("modal-confirmacion-dht22");
            const modalTitulo = document.getElementById("modal-dht22-titulo");
            const modalMensaje = document.getElementById("modal-dht22-mensaje");
            const btnCancelar = document.getElementById("btn-modal-cancelar-dht22");
            const btnAceptar = document.getElementById("btn-modal-aceptar-dht22");
            const toastDht22 = document.getElementById("toast-dht22");

            if (!btnEstado || !txtEstado || !modal || !formControl) return;

            let accionConfirmarPendiente = null;
            let toastTimer = null;

            function mostrarToast(texto) {
                if (!toastDht22) return;
                toastDht22.textContent = texto;
                toastDht22.hidden = false;
                if (toastTimer) clearTimeout(toastTimer);
                toastTimer = setTimeout(() => {
                    toastDht22.hidden = true;
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
                if (typeof cfg.activo === "boolean") estadoModuloDht22.activo = cfg.activo;
                estadoModuloDht22.frecuenciaLecturaSeg = normalizarFrecuencia(cfg.frecuenciaSeg);

                const p = cfg.parametrosTecnicos || {};
                if (Number.isFinite(Number(p.tempMin ?? cfg.minNormal))) {
                    estadoModuloDht22.tempMinimaAire = Number(p.tempMin ?? cfg.minNormal);
                }
                if (Number.isFinite(Number(p.tempMax ?? cfg.maxNormal))) {
                    estadoModuloDht22.tempMaximaAire = Number(p.tempMax ?? cfg.maxNormal);
                }
                if (Number.isFinite(Number(p.humMin))) estadoModuloDht22.humedadMinima = Number(p.humMin);
                if (Number.isFinite(Number(p.humMax))) estadoModuloDht22.humedadMaxima = Number(p.humMax);
                if (Number.isFinite(Number(p.offsetTemperatura))) estadoModuloDht22.offsetTemperatura = Number(p.offsetTemperatura);
                if (Number.isFinite(Number(p.offsetHumedad))) estadoModuloDht22.offsetHumedad = Number(p.offsetHumedad);
                if (GPIOS_VALIDOS.includes(p.pinGpio)) estadoTecnicoDht22.pinGpio = p.pinGpio;
                if (PULLUPS_VALIDOS.includes(p.resistenciaPullUp)) estadoTecnicoDht22.resistenciaPullUp = p.resistenciaPullUp;

                sincronizarFormulario();
            }

            async function cargarDesdeBackend() {
                if (!window.AxionApi) return;
                try {
                    const cfg = await window.AxionApi.get(`/sensores/${MODULO}`);
                    aplicarDesdeBackend(cfg);
                } catch (err) {
                    mostrarToast(err.message || "No se pudo cargar la configuración del sensor DHT22.");
                }
            }

            async function guardarControlEnBackend() {
                await window.AxionApi.put(`/sensores/${MODULO}/control`, {
                    activo: estadoModuloDht22.activo,
                    frecuenciaSeg: estadoModuloDht22.frecuenciaLecturaSeg,
                    minNormal: estadoModuloDht22.tempMinimaAire,
                    maxNormal: estadoModuloDht22.tempMaximaAire
                });
                const cfg = await window.AxionApi.put(`/sensores/${MODULO}/tecnico`, {
                    tempMin: estadoModuloDht22.tempMinimaAire,
                    tempMax: estadoModuloDht22.tempMaximaAire,
                    humMin: estadoModuloDht22.humedadMinima,
                    humMax: estadoModuloDht22.humedadMaxima
                });
                aplicarDesdeBackend(cfg);
            }

            async function guardarTecnicoEnBackend() {
                const cfg = await window.AxionApi.put(`/sensores/${MODULO}/tecnico`, {
                    ...estadoTecnicoDht22,
                    offsetTemperatura: estadoModuloDht22.offsetTemperatura,
                    offsetHumedad: estadoModuloDht22.offsetHumedad
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
                actualizarIndicadorVisual(estadoModuloDht22.activo);
                if (selectFrecuencia) selectFrecuencia.value = String(estadoModuloDht22.frecuenciaLecturaSeg);
                if (inputTempMin) inputTempMin.value = estadoModuloDht22.tempMinimaAire.toFixed(1);
                if (inputTempMax) inputTempMax.value = estadoModuloDht22.tempMaximaAire.toFixed(1);
                if (inputHumMin) inputHumMin.value = String(Math.round(estadoModuloDht22.humedadMinima));
                if (inputHumMax) inputHumMax.value = String(Math.round(estadoModuloDht22.humedadMaxima));
                if (inputOffsetTemp) inputOffsetTemp.value = estadoModuloDht22.offsetTemperatura.toFixed(1);
                if (inputOffsetHum) inputOffsetHum.value = estadoModuloDht22.offsetHumedad.toFixed(1);
                if (selectGpio) selectGpio.value = estadoTecnicoDht22.pinGpio;
                if (selectPullUp) selectPullUp.value = estadoTecnicoDht22.resistenciaPullUp;
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
                const nuevoEstado = !estadoModuloDht22.activo;
                abrirModalConfirmacion({
                    titulo: nuevoEstado ? "¿Reactivar sensor ambiental DHT22?" : "¿Pausar sensor ambiental DHT22?",
                    mensaje: nuevoEstado
                        ? "El sistema reanudará la lectura de temperatura y humedad ambiental."
                        : "Se suspenderán las alertas del microclima temporalmente.",
                    claseBoton: nuevoEstado ? "btn-modal-activar" : "btn-modal-pausar",
                    onAceptar: async () => {
                        const prev = estadoModuloDht22.activo;
                        estadoModuloDht22.activo = nuevoEstado;
                        try {
                            await guardarControlEnBackend();
                            mostrarToast(nuevoEstado ? "Sensor DHT22 activado." : "Sensor DHT22 pausado.");
                        } catch (err) {
                            estadoModuloDht22.activo = prev;
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
                const tempMin = Number.parseFloat(inputTempMin.value);
                const tempMax = Number.parseFloat(inputTempMax.value);
                const humMin = Number.parseFloat(inputHumMin.value);
                const humMax = Number.parseFloat(inputHumMax.value);

                if (!FRECUENCIAS_VALIDAS.includes(frecuencia)) {
                    mostrarError(errorControl, "Selecciona una frecuencia entre 5 minutos y 1 hora.");
                    return;
                }
                if (!Number.isFinite(tempMin) || !Number.isFinite(tempMax) || tempMin < -40 || tempMax > 80 || tempMin >= tempMax) {
                    mostrarError(errorControl, "Temperatura Mínima debe ser menor que Temperatura Máxima dentro de -40 a 80 °C.");
                    return;
                }
                if (!Number.isFinite(humMin) || !Number.isFinite(humMax) || humMin < 0 || humMax > 100 || humMin >= humMax) {
                    mostrarError(errorControl, "Humedad Mínima debe ser menor que Humedad Máxima entre 0 % y 100 %.");
                    return;
                }

                estadoModuloDht22.frecuenciaLecturaSeg = frecuencia;
                estadoModuloDht22.tempMinimaAire = Number(tempMin.toFixed(1));
                estadoModuloDht22.tempMaximaAire = Number(tempMax.toFixed(1));
                estadoModuloDht22.humedadMinima = Math.round(humMin);
                estadoModuloDht22.humedadMaxima = Math.round(humMax);

                try {
                    await guardarControlEnBackend();
                    mostrarToast("Configuración del microclima guardada.");
                } catch (err) {
                    mostrarError(errorControl, err.message || "Error al guardar en el servidor.");
                }
            });

            if (btnAplicarAjuste) {
                btnAplicarAjuste.addEventListener("click", () => {
                    limpiarError(errorCalibracion);
                    const offsetTemp = Number.parseFloat(inputOffsetTemp.value);
                    const offsetHum = Number.parseFloat(inputOffsetHum.value);

                    if (!Number.isFinite(offsetTemp) || offsetTemp < -20 || offsetTemp > 20) {
                        mostrarError(errorCalibracion, "El Offset de Temperatura debe estar entre -20.0 y +20.0 °C.");
                        return;
                    }
                    if (!Number.isFinite(offsetHum) || offsetHum < -30 || offsetHum > 30) {
                        mostrarError(errorCalibracion, "El Offset de Humedad debe estar entre -30.0 y +30.0 %.");
                        return;
                    }

                    abrirModalConfirmacion({
                        titulo: "¿Aplicar ajuste de desviación ambiental?",
                        mensaje: `Se guardará un offset de ${offsetTemp.toFixed(1)} °C y ${offsetHum.toFixed(1)} % HR.`,
                        claseBoton: "btn-modal-activar",
                        onAceptar: async () => {
                            estadoModuloDht22.offsetTemperatura = Number(offsetTemp.toFixed(1));
                            estadoModuloDht22.offsetHumedad = Number(offsetHum.toFixed(1));
                            try {
                                await guardarTecnicoEnBackend();
                                mostrarToast("Ajuste de desviación ambiental guardado.");
                            } catch (err) {
                                mostrarToast(err.message || "Error al guardar el ajuste ambiental.");
                            }
                        }
                    });
                });
            }

            if (formTecnico) {
                formTecnico.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    limpiarError(errorTecnico);

                    const pinGpio = selectGpio.value;
                    const resistenciaPullUp = selectPullUp.value;

                    if (!GPIOS_VALIDOS.includes(pinGpio)) {
                        mostrarError(errorTecnico, "Selecciona un pin GPIO válido.");
                        return;
                    }
                    if (!PULLUPS_VALIDOS.includes(resistenciaPullUp)) {
                        mostrarError(errorTecnico, "Selecciona una resistencia Pull-Up válida.");
                        return;
                    }

                    estadoTecnicoDht22 = { pinGpio, resistenciaPullUp };
                    try {
                        await guardarTecnicoEnBackend();
                        mostrarToast("Configuración técnica DHT22 guardada.");
                    } catch (err) {
                        mostrarError(errorTecnico, err.message || "Error al guardar la configuración técnica.");
                    }
                });
            }

            if (btnRestaurarFabrica) {
                btnRestaurarFabrica.addEventListener("click", () => {
                    abrirModalConfirmacion({
                        titulo: "¿Restaurar valores de fábrica?",
                        mensaje: "Se restablecerán el pin GPIO 4 y la resistencia Pull-Up externa de 10 kΩ.",
                        claseBoton: "btn-modal-pausar",
                        onAceptar: async () => {
                            estadoTecnicoDht22 = { ...DEFAULTS_TECNICOS_DHT22 };
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

            btnCancelar.addEventListener("click", cerrarModalConfirmacion);
            btnAceptar.addEventListener("click", () => {
                const cb = accionConfirmarPendiente;
                cerrarModalConfirmacion();
                if (typeof cb === "function") cb();
            });
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
