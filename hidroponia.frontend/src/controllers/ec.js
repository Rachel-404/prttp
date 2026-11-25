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
            const MODULO = "ec";
            const SONDAS_TEMP_VALIDAS = ["pt100", "fijo25"];
            const GPIOS_ADC_VALIDOS = [
                "GPIO1_ADC1", "GPIO2_ADC1", "GPIO3_ADC1", "GPIO4_ADC1",
                "GPIO5_ADC1", "GPIO6_ADC1", "GPIO7_ADC1"
            ];
            const ATENUACIONES_VALIDAS = ["11db", "6db", "2.5db", "0db"];

            const DEFAULTS_TECNICOS_EC = {
                gpioAdc: "GPIO5_ADC1",
                atenuacionAdc: "11db",
                factorCalibracionK: 1.0,
                kValue: 0.5,
                coeficienteTermico: 0.02
            };

            const estadoModuloEc = {
                activo: true,
                ecMinimo: 0.8,
                ecMaximo: 1.8,
                tdsMinimo: 400,
                tdsMaximo: 900,
                compensacionTermica: true,
                sondaTempAsociada: "pt100",
                tempManualAtc: 25.0
            };

            let estadoTecnicoEc = { ...DEFAULTS_TECNICOS_EC };
            let ultimaTempAguaReal = null;

            const btnEstado = document.getElementById("btn-estado-ec");
            const txtEstado = document.getElementById("estado-ec");
            const formControl = document.getElementById("form-control-ec");
            const inputEcMin = document.getElementById("ec-minimo");
            const inputEcMax = document.getElementById("ec-maximo");
            const inputTdsMin = document.getElementById("tds-minimo");
            const inputTdsMax = document.getElementById("tds-maximo");
            const btnCompensacion = document.getElementById("btn-compensacion-ec");
            const txtCompensacion = document.getElementById("texto-compensacion-ec");
            const selectSondaTemp = document.getElementById("sonda-temp-asociada");
            const inputTempManual = document.getElementById("ec-temp-manual");
            const errorControl = document.getElementById("error-control-ec");

            const inputSolucionEstandar = document.getElementById("valor-solucion-estandar");
            const btnCalibrar = document.getElementById("btn-calibrar-ec");
            const errorCalibracion = document.getElementById("error-calibracion-ec");

            const formTecnico = document.getElementById("form-tecnico-ec");
            const selectGpioAdc = document.getElementById("tec-ec-gpio");
            const selectAtenuacion = document.getElementById("tec-ec-atenuacion");
            const inputFactorK = document.getElementById("ec-factor-k");
            const inputKValue = document.getElementById("tec-ec-kvalue");
            const inputAlpha = document.getElementById("tec-ec-alpha");
            const errorTecnico = document.getElementById("error-tecnico-ec");
            const btnRestaurarFabrica = document.getElementById("btn-restaurar-fabrica-ec");

            const modal = document.getElementById("modal-confirmacion-ec");
            const modalTitulo = document.getElementById("modal-ec-titulo");
            const modalMensaje = document.getElementById("modal-ec-mensaje");
            const btnCancelar = document.getElementById("btn-modal-cancelar-ec");
            const btnAceptar = document.getElementById("btn-modal-aceptar-ec");
            const toastEc = document.getElementById("toast-ec");

            if (!btnEstado || !txtEstado || !modal || !formControl) return;

            let accionConfirmarPendiente = null;
            let toastTimer = null;

            function mostrarToast(texto) {
                if (!toastEc) return;
                toastEc.textContent = texto;
                toastEc.hidden = false;
                if (toastTimer) clearTimeout(toastTimer);
                toastTimer = setTimeout(() => {
                    toastEc.hidden = true;
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

            function obtenerKValueActivo() {
                const kInput = inputKValue ? Number.parseFloat(inputKValue.value) : NaN;
                if (Number.isFinite(kInput) && kInput >= 0.1 && kInput <= 1.0) return kInput;
                return estadoTecnicoEc.kValue;
            }

            function convertirEcATds(ecMsCm, kValue = obtenerKValueActivo()) {
                return Math.round(ecMsCm * 1000 * kValue);
            }

            function convertirTdsAEc(tdsPpm, kValue = obtenerKValueActivo()) {
                return Number((tdsPpm / (1000 * kValue)).toFixed(2));
            }

            function aplicarDesdeBackend(cfg) {
                if (!cfg) return;
                if (typeof cfg.activo === "boolean") estadoModuloEc.activo = cfg.activo;

                const p = cfg.parametrosTecnicos || {};
                if (Number.isFinite(Number(p.kValue))) estadoTecnicoEc.kValue = Number(p.kValue);
                if (Number.isFinite(Number(p.ecMinMs))) {
                    estadoModuloEc.ecMinimo = Number(p.ecMinMs);
                } else if (Number.isFinite(Number(cfg.minNormal))) {
                    estadoModuloEc.ecMinimo = Number((Number(cfg.minNormal) / 1000).toFixed(2));
                }
                if (Number.isFinite(Number(p.ecMaxMs))) {
                    estadoModuloEc.ecMaximo = Number(p.ecMaxMs);
                } else if (Number.isFinite(Number(cfg.maxNormal))) {
                    estadoModuloEc.ecMaximo = Number((Number(cfg.maxNormal) / 1000).toFixed(2));
                }
                estadoModuloEc.tdsMinimo = Number.isFinite(Number(p.tdsMin))
                    ? Math.round(Number(p.tdsMin))
                    : convertirEcATds(estadoModuloEc.ecMinimo, estadoTecnicoEc.kValue);
                estadoModuloEc.tdsMaximo = Number.isFinite(Number(p.tdsMax))
                    ? Math.round(Number(p.tdsMax))
                    : convertirEcATds(estadoModuloEc.ecMaximo, estadoTecnicoEc.kValue);

                if (typeof p.compensacionTermica === "boolean") estadoModuloEc.compensacionTermica = p.compensacionTermica;
                if (SONDAS_TEMP_VALIDAS.includes(p.sondaTempAsociada)) estadoModuloEc.sondaTempAsociada = p.sondaTempAsociada;
                if (Number.isFinite(Number(p.tempManualAtc))) estadoModuloEc.tempManualAtc = Number(p.tempManualAtc);
                if (GPIOS_ADC_VALIDOS.includes(p.gpioAdc)) estadoTecnicoEc.gpioAdc = p.gpioAdc;
                if (ATENUACIONES_VALIDAS.includes(p.atenuacionAdc)) estadoTecnicoEc.atenuacionAdc = p.atenuacionAdc;
                if (Number.isFinite(Number(p.factorCalibracionK))) estadoTecnicoEc.factorCalibracionK = Number(p.factorCalibracionK);
                if (Number.isFinite(Number(p.coeficienteTermico))) estadoTecnicoEc.coeficienteTermico = Number(p.coeficienteTermico);

                sincronizarFormulario();
            }

            async function cargarDesdeBackend() {
                if (!window.AxionApi) return;
                try {
                    const [cfg, resumen] = await Promise.all([
                        window.AxionApi.get(`/sensores/${MODULO}`),
                        window.AxionApi.get("/dashboard/resumen").catch(() => null)
                    ]);
                    if (resumen?.ultimaLectura?.tempAguaC != null) {
                        ultimaTempAguaReal = Number(resumen.ultimaLectura.tempAguaC);
                    }
                    aplicarDesdeBackend(cfg);
                } catch (err) {
                    mostrarToast(err.message || "No se pudo cargar la configuración del sensor EC.");
                }
            }

            async function guardarControlEnBackend() {
                await window.AxionApi.put(`/sensores/${MODULO}/control`, {
                    activo: estadoModuloEc.activo,
                    minNormal: Math.round(estadoModuloEc.ecMinimo * 1000),
                    maxNormal: Math.round(estadoModuloEc.ecMaximo * 1000)
                });
                const cfg = await window.AxionApi.put(`/sensores/${MODULO}/tecnico`, {
                    ecMinMs: estadoModuloEc.ecMinimo,
                    ecMaxMs: estadoModuloEc.ecMaximo,
                    tdsMin: estadoModuloEc.tdsMinimo,
                    tdsMax: estadoModuloEc.tdsMaximo,
                    compensacionTermica: estadoModuloEc.compensacionTermica,
                    sondaTempAsociada: estadoModuloEc.sondaTempAsociada,
                    tempManualAtc: estadoModuloEc.tempManualAtc
                });
                aplicarDesdeBackend(cfg);
            }

            async function guardarTecnicoEnBackend() {
                const cfg = await window.AxionApi.put(`/sensores/${MODULO}/tecnico`, {
                    ...estadoTecnicoEc,
                    tdsMin: estadoModuloEc.tdsMinimo,
                    tdsMax: estadoModuloEc.tdsMaximo
                });
                aplicarDesdeBackend(cfg);
            }

            function actualizarEstadoAtcEc() {
                const grupoManual = document.getElementById("grupo-ec-temp-manual");
                const elEstado = document.getElementById("estado-atc-ec");
                const elTexto = document.getElementById("texto-estado-atc-ec");
                const fuente = selectSondaTemp ? selectSondaTemp.value : estadoModuloEc.sondaTempAsociada;

                if (grupoManual) grupoManual.hidden = fuente !== "fijo25";
                if (!elEstado || !elTexto) return;

                let mensaje;
                if (fuente === "pt100") {
                    mensaje = Number.isFinite(ultimaTempAguaReal)
                        ? `Compensación térmica activa desde PT100 · Lectura actual: ${ultimaTempAguaReal.toFixed(1)} °C`
                        : "Compensación térmica enlazada a PT100 · Esperando lectura del controlador";
                } else {
                    const valFijo = Number.parseFloat(inputTempManual ? inputTempManual.value : "25.0");
                    const tempFmt = Number.isFinite(valFijo) ? valFijo.toFixed(1) : "25.0";
                    mensaje = `Temperatura manual fija activa · Valor aplicado: ${tempFmt} °C`;
                }
                elEstado.classList.remove("estado-normal", "estado-advertencia", "estado-critico");
                elEstado.classList.add("estado-normal");
                elTexto.textContent = mensaje;
            }

            function actualizarIndicadorVisual(activo) {
                btnEstado.classList.toggle("activo", activo);
                btnEstado.classList.toggle("inactivo", !activo);
                btnEstado.setAttribute("aria-pressed", activo ? "true" : "false");
                txtEstado.textContent = activo ? "Activo" : "Pausado";
            }

            function actualizarBotonCompensacion(activada) {
                if (!btnCompensacion || !txtCompensacion) return;
                btnCompensacion.classList.toggle("activo", activada);
                btnCompensacion.classList.toggle("inactivo", !activada);
                btnCompensacion.setAttribute("aria-pressed", activada ? "true" : "false");
                txtCompensacion.textContent = activada ? "Activada" : "Desactivada";
            }

            function sincronizarFormulario() {
                actualizarIndicadorVisual(estadoModuloEc.activo);
                if (inputEcMin) inputEcMin.value = estadoModuloEc.ecMinimo.toFixed(2);
                if (inputEcMax) inputEcMax.value = estadoModuloEc.ecMaximo.toFixed(2);
                if (inputTdsMin) inputTdsMin.value = String(estadoModuloEc.tdsMinimo);
                if (inputTdsMax) inputTdsMax.value = String(estadoModuloEc.tdsMaximo);
                actualizarBotonCompensacion(estadoModuloEc.compensacionTermica);
                if (selectSondaTemp) selectSondaTemp.value = estadoModuloEc.sondaTempAsociada;
                if (inputTempManual) inputTempManual.value = estadoModuloEc.tempManualAtc.toFixed(1);
                if (selectGpioAdc) selectGpioAdc.value = estadoTecnicoEc.gpioAdc;
                if (selectAtenuacion) selectAtenuacion.value = estadoTecnicoEc.atenuacionAdc;
                if (inputFactorK) inputFactorK.value = estadoTecnicoEc.factorCalibracionK.toFixed(2);
                if (inputKValue) inputKValue.value = estadoTecnicoEc.kValue.toFixed(2);
                if (inputAlpha) inputAlpha.value = String(estadoTecnicoEc.coeficienteTermico);
                actualizarEstadoAtcEc();
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
                const nuevoEstado = !estadoModuloEc.activo;
                abrirModalConfirmacion({
                    titulo: nuevoEstado ? "¿Reactivar sensor de EC / TDS?" : "¿Pausar monitoreo de EC / TDS?",
                    mensaje: nuevoEstado
                        ? "El sistema reanudará la lectura analógica de conductividad y TDS."
                        : "Se suspenderán las alertas de nutrientes durante limpieza o calibración.",
                    claseBoton: nuevoEstado ? "btn-modal-activar" : "btn-modal-pausar",
                    onAceptar: async () => {
                        const prev = estadoModuloEc.activo;
                        estadoModuloEc.activo = nuevoEstado;
                        try {
                            await guardarControlEnBackend();
                            mostrarToast(nuevoEstado ? "Sensor de conductividad activado." : "Sensor de conductividad pausado.");
                        } catch (err) {
                            estadoModuloEc.activo = prev;
                            sincronizarFormulario();
                            mostrarToast(err.message || "Error al actualizar el estado del sensor.");
                        }
                    }
                });
            });

            if (inputEcMin && inputTdsMin) {
                inputEcMin.addEventListener("input", () => {
                    limpiarError(errorControl);
                    const v = Number.parseFloat(inputEcMin.value);
                    if (Number.isFinite(v) && v >= 0) inputTdsMin.value = String(convertirEcATds(v));
                });
                inputTdsMin.addEventListener("input", () => {
                    limpiarError(errorControl);
                    const v = Number.parseFloat(inputTdsMin.value);
                    if (Number.isFinite(v) && v >= 0) inputEcMin.value = convertirTdsAEc(v).toFixed(2);
                });
            }

            if (inputEcMax && inputTdsMax) {
                inputEcMax.addEventListener("input", () => {
                    limpiarError(errorControl);
                    const v = Number.parseFloat(inputEcMax.value);
                    if (Number.isFinite(v) && v >= 0) inputTdsMax.value = String(convertirEcATds(v));
                });
                inputTdsMax.addEventListener("input", () => {
                    limpiarError(errorControl);
                    const v = Number.parseFloat(inputTdsMax.value);
                    if (Number.isFinite(v) && v >= 0) inputEcMax.value = convertirTdsAEc(v).toFixed(2);
                });
            }

            if (btnCompensacion) {
                btnCompensacion.addEventListener("click", () => {
                    actualizarBotonCompensacion(!btnCompensacion.classList.contains("activo"));
                });
            }
            if (selectSondaTemp) {
                selectSondaTemp.addEventListener("change", () => {
                    limpiarError(errorControl);
                    actualizarEstadoAtcEc();
                });
            }

            formControl.addEventListener("submit", async (e) => {
                e.preventDefault();
                limpiarError(errorControl);

                const ecMin = Number.parseFloat(inputEcMin.value);
                const ecMax = Number.parseFloat(inputEcMax.value);
                const tdsMin = Number.parseFloat(inputTdsMin.value);
                const tdsMax = Number.parseFloat(inputTdsMax.value);
                const sondaTemp = selectSondaTemp ? selectSondaTemp.value : "pt100";
                const tempManual = Number.parseFloat(inputTempManual?.value || "25.0");

                if (!Number.isFinite(ecMin) || !Number.isFinite(ecMax) || ecMin < 0 || ecMin >= ecMax) {
                    mostrarError(errorControl, "EC Mínima debe ser mayor o igual a 0 y menor que EC Máxima.");
                    return;
                }
                if (!Number.isFinite(tdsMin) || !Number.isFinite(tdsMax) || tdsMin < 0 || tdsMin >= tdsMax) {
                    mostrarError(errorControl, "TDS Mínimo debe ser menor que TDS Máximo.");
                    return;
                }

                estadoModuloEc.ecMinimo = Number(ecMin.toFixed(2));
                estadoModuloEc.ecMaximo = Number(ecMax.toFixed(2));
                estadoModuloEc.tdsMinimo = Math.round(tdsMin);
                estadoModuloEc.tdsMaximo = Math.round(tdsMax);
                estadoModuloEc.compensacionTermica = btnCompensacion ? btnCompensacion.classList.contains("activo") : true;
                estadoModuloEc.sondaTempAsociada = SONDAS_TEMP_VALIDAS.includes(sondaTemp) ? sondaTemp : "pt100";
                if (Number.isFinite(tempManual)) estadoModuloEc.tempManualAtc = Number(tempManual.toFixed(1));

                try {
                    await guardarControlEnBackend();
                    mostrarToast("Configuración de alertas y umbrales EC / TDS guardada.");
                } catch (err) {
                    mostrarError(errorControl, err.message || "Error al guardar en el servidor.");
                }
            });

            if (btnCalibrar && inputSolucionEstandar) {
                btnCalibrar.addEventListener("click", () => {
                    limpiarError(errorCalibracion);
                    const valorEstandar = Number.parseFloat(inputSolucionEstandar.value);
                    if (!Number.isFinite(valorEstandar) || valorEstandar <= 0 || valorEstandar > 20) {
                        mostrarError(errorCalibracion, "Ingresa un valor de solución patrón entre 0.01 y 20.00 mS/cm.");
                        return;
                    }
                    abrirModalConfirmacion({
                        titulo: "¿Calibrar sensor EC / TDS?",
                        mensaje: `¿Confirmas que la sonda está sumergida en la solución patrón de ${valorEstandar.toFixed(2)} mS/cm?`,
                        claseBoton: "btn-modal-activar",
                        onAceptar: async () => {
                            try {
                                const res = await window.AxionApi.post("/sensores/ec/calibrar", {
                                    solucionPatronMsCm: Number(valorEstandar.toFixed(2)),
                                    factorCalibracionK: estadoTecnicoEc.factorCalibracionK
                                });
                                mostrarToast(res.mensaje || `Calibración con solución ${valorEstandar.toFixed(2)} mS/cm enviada.`);
                                await cargarDesdeBackend();
                            } catch (err) {
                                mostrarToast(err.message || "Error al enviar la calibración EC.");
                            }
                        }
                    });
                });
            }

            if (formTecnico) {
                formTecnico.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    limpiarError(errorTecnico);

                    const gpioAdc = selectGpioAdc.value;
                    const atenuacionAdc = selectAtenuacion.value;
                    const factorCalibracionK = Number.parseFloat(inputFactorK.value);
                    const kValue = Number.parseFloat(inputKValue.value);
                    const coeficienteTermico = Number.parseFloat(inputAlpha.value);

                    if (!GPIOS_ADC_VALIDOS.includes(gpioAdc)) {
                        mostrarError(errorTecnico, "Selecciona un canal GPIO / ADC1 válido.");
                        return;
                    }
                    if (!ATENUACIONES_VALIDAS.includes(atenuacionAdc)) {
                        mostrarError(errorTecnico, "Selecciona una atenuación ADC válida.");
                        return;
                    }
                    if (!Number.isFinite(factorCalibracionK) || factorCalibracionK < 0.1 || factorCalibracionK > 5.0) {
                        mostrarError(errorTecnico, "El Factor de Calibración k debe estar entre 0.10 y 5.00.");
                        return;
                    }
                    if (!Number.isFinite(kValue) || kValue < 0.1 || kValue > 1.0) {
                        mostrarError(errorTecnico, "El Factor de Conversión K_value debe estar entre 0.10 y 1.00.");
                        return;
                    }
                    if (!Number.isFinite(coeficienteTermico) || coeficienteTermico < 0.001 || coeficienteTermico > 0.1) {
                        mostrarError(errorTecnico, "El Coeficiente Térmico α debe estar entre 0.001 y 0.100.");
                        return;
                    }

                    estadoTecnicoEc = {
                        gpioAdc,
                        atenuacionAdc,
                        factorCalibracionK: Number(factorCalibracionK.toFixed(2)),
                        kValue: Number(kValue.toFixed(2)),
                        coeficienteTermico: Number(coeficienteTermico.toFixed(3))
                    };
                    estadoModuloEc.tdsMinimo = convertirEcATds(estadoModuloEc.ecMinimo, estadoTecnicoEc.kValue);
                    estadoModuloEc.tdsMaximo = convertirEcATds(estadoModuloEc.ecMaximo, estadoTecnicoEc.kValue);

                    try {
                        await guardarTecnicoEnBackend();
                        mostrarToast("Configuración técnica y ADC guardada.");
                    } catch (err) {
                        mostrarError(errorTecnico, err.message || "Error al guardar la configuración técnica.");
                    }
                });
            }

            if (btnRestaurarFabrica) {
                btnRestaurarFabrica.addEventListener("click", () => {
                    abrirModalConfirmacion({
                        titulo: "¿Restaurar valores de fábrica?",
                        mensaje: "Se restablecerán los parámetros ADC y factores de conversión a sus valores por defecto.",
                        claseBoton: "btn-modal-pausar",
                        onAceptar: async () => {
                            estadoTecnicoEc = { ...DEFAULTS_TECNICOS_EC };
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
