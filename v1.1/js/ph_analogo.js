document.addEventListener("DOMContentLoaded", () => {
    const CLAVE_CACHE = "ph_analogo";
    const btnEstado = document.getElementById("btn-estado-ph-analogo");
    const txtEstado = document.getElementById("estado-ph-analogo");
    const selectFrecuencia = document.getElementById("frecuencia-lectura-ph-analogo");
    const inputPhMin = document.getElementById("ph-analogo-min");
    const inputPhMax = document.getElementById("ph-analogo-max");
    const selectFuenteTemp = document.getElementById("fuente-temp-ph-analogo");
    const inputVoltajeNeutro = document.getElementById("voltaje-neutro-mv");
    const inputVoltajeAcido = document.getElementById("voltaje-acido-mv");
    const inputFechaInst = document.getElementById("fecha-instalacion-electrodo");
    const selectAdc = document.getElementById("tec-ph-analogo-adc");

    const formControl = document.getElementById("form-control-ph-analogo");
    const formTecnico = document.getElementById("form-tecnico-ph-analogo");
    const btnEstabilizar = document.getElementById("btn-estabilizar-neutro");
    const contadorEstabilizacion = document.getElementById("contador-estabilizacion");
    const btnCapturarAcido = document.getElementById("btn-capturar-acido");
    const btnRestaurarFabrica = document.getElementById("btn-restaurar-fabrica-ph-analogo");
    const toast = document.getElementById("toast-ph-analogo");

    let toastTimer = null;
    let estabilizacionTimer = null;

    function mostrarToast(mensaje) {
        if (!toast) return;
        toast.textContent = mensaje;
        toast.hidden = false;
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.hidden = true;
        }, 3500);
    }

    function aplicarEstadoVisual(activo) {
        if (!btnEstado || !txtEstado) return;
        btnEstado.classList.toggle("activo", activo);
        btnEstado.classList.toggle("inactivo", !activo);
        btnEstado.setAttribute("aria-pressed", activo ? "true" : "false");
        txtEstado.textContent = activo ? "Activo" : "Pausado";
    }

    function cargarDesdeCache() {
        if (!window.AxionCache) return;
        const datos = window.AxionCache.leerDeCache(CLAVE_CACHE);
        aplicarEstadoVisual(datos.activo !== false);
        if (selectFrecuencia) selectFrecuencia.value = String(datos.frecuenciaSeg ?? 10);
        if (inputPhMin) inputPhMin.value = Number(datos.minNormal ?? 5.5).toFixed(2);
        if (inputPhMax) inputPhMax.value = Number(datos.maxNormal ?? 6.5).toFixed(2);
        if (selectFuenteTemp) selectFuenteTemp.value = datos.fuenteTemperatura || "pt100";
        if (inputVoltajeNeutro) inputVoltajeNeutro.value = Number(datos.voltajeNeutro ?? 1500.0).toFixed(1);
        if (inputVoltajeAcido) inputVoltajeAcido.value = Number(datos.voltajeAcido ?? 2032.4).toFixed(1);
        if (inputFechaInst && datos.fechaInstalacion) inputFechaInst.value = datos.fechaInstalacion;
        if (selectAdc && datos.canalAdc1) selectAdc.value = datos.canalAdc1;
    }

    cargarDesdeCache();

    if (btnEstado && txtEstado) {
        btnEstado.addEventListener("click", () => {
            const nuevoActivo = !btnEstado.classList.contains("activo");
            aplicarEstadoVisual(nuevoActivo);
            if (window.AxionCache) {
                window.AxionCache.guardarEnCache(CLAVE_CACHE, { activo: nuevoActivo });
            }
            mostrarToast(nuevoActivo ? "Sensor de pH Analógico activado." : "Sensor de pH Analógico pausado.");
        });
    }

    if (formControl) {
        formControl.addEventListener("submit", (e) => {
            e.preventDefault();
            if (window.AxionCache) {
                const prev = window.AxionCache.leerDeCache(CLAVE_CACHE);
                const nuevoMin = Number(inputPhMin?.value || 5.5);
                const nuevoMax = Number(inputPhMax?.value || 6.5);
                window.AxionCache.guardarEnCache(CLAVE_CACHE, {
                    frecuenciaSeg: Number(selectFrecuencia?.value || 10),
                    minNormal: nuevoMin,
                    maxNormal: nuevoMax,
                    fuenteTemperatura: selectFuenteTemp?.value || "pt100"
                });
                window.AxionCache.registrarAuditoria(
                    "pH Analógico",
                    "Umbrales pH",
                    `${prev.minNormal} - ${prev.maxNormal} pH`,
                    `${nuevoMin} - ${nuevoMax} pH`
                );
            }
            mostrarToast("Configuración operativa de pH Analógico guardada.");
        });
    }

    if (btnEstabilizar && contadorEstabilizacion) {
        btnEstabilizar.addEventListener("click", () => {
            if (estabilizacionTimer) clearInterval(estabilizacionTimer);
            let segundos = 60;
            contadorEstabilizacion.textContent = `${segundos} s`;
            btnEstabilizar.disabled = true;
            mostrarToast("Estabilización en buffer neutro pH 7.0 iniciada (60 s).");

            estabilizacionTimer = setInterval(() => {
                segundos -= 1;
                contadorEstabilizacion.textContent = `${segundos} s`;
                if (segundos <= 0) {
                    clearInterval(estabilizacionTimer);
                    estabilizacionTimer = null;
                    btnEstabilizar.disabled = false;
                    if (window.AxionCache && inputVoltajeNeutro) {
                        window.AxionCache.guardarEnCache(CLAVE_CACHE, {
                            voltajeNeutro: Number(inputVoltajeNeutro.value || 1500.0)
                        });
                    }
                    mostrarToast("Estabilización completada. Punto neutro pH 7.0 capturado.");
                }
            }, 1000);
        });
    }

    if (btnCapturarAcido) {
        btnCapturarAcido.addEventListener("click", () => {
            if (window.AxionCache && inputVoltajeAcido) {
                window.AxionCache.guardarEnCache(CLAVE_CACHE, {
                    voltajeAcido: Number(inputVoltajeAcido.value || 2032.4)
                });
            }
            mostrarToast("Punto ácido pH 4.0 capturado. Calibración actualizada.");
        });
    }

    if (inputFechaInst) {
        inputFechaInst.addEventListener("change", () => {
            if (window.AxionCache) {
                window.AxionCache.guardarEnCache(CLAVE_CACHE, {
                    fechaInstalacion: inputFechaInst.value
                });
            }
        });
    }

    if (formTecnico) {
        formTecnico.addEventListener("submit", (e) => {
            e.preventDefault();
            if (window.AxionCache) {
                window.AxionCache.guardarEnCache(CLAVE_CACHE, {
                    canalAdc1: selectAdc?.value || "GPIO4_ADC1"
                });
            }
            mostrarToast("Configuración técnica BNC / ADC1 guardada.");
        });
    }

    if (btnRestaurarFabrica) {
        btnRestaurarFabrica.addEventListener("click", () => {
            if (window.AxionCache) {
                window.AxionCache.restaurarClaveCache(CLAVE_CACHE);
                cargarDesdeCache();
            } else if (selectAdc) {
                selectAdc.value = "GPIO4_ADC1";
            }
            mostrarToast("Valores de fábrica restaurados.");
        });
    }
});
