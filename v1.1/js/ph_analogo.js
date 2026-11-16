document.addEventListener("DOMContentLoaded", () => {
    const btnEstado = document.getElementById("btn-estado-ph-analogo");
    const txtEstado = document.getElementById("estado-ph-analogo");
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

    if (btnEstado && txtEstado) {
        btnEstado.addEventListener("click", () => {
            const activo = btnEstado.classList.contains("activo");
            btnEstado.classList.toggle("activo", !activo);
            btnEstado.classList.toggle("inactivo", activo);
            btnEstado.setAttribute("aria-pressed", !activo ? "true" : "false");
            txtEstado.textContent = !activo ? "Activo" : "Pausado";
            mostrarToast(!activo ? "Sensor de pH Analógico activado." : "Sensor de pH Analógico pausado.");
        });
    }

    if (formControl) {
        formControl.addEventListener("submit", (e) => {
            e.preventDefault();
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
                    mostrarToast("Estabilización completada. Punto neutro pH 7.0 capturado.");
                }
            }, 1000);
        });
    }

    if (btnCapturarAcido) {
        btnCapturarAcido.addEventListener("click", () => {
            mostrarToast("Punto ácido pH 4.0 capturado. Calibración actualizada.");
        });
    }

    if (formTecnico) {
        formTecnico.addEventListener("submit", (e) => {
            e.preventDefault();
            mostrarToast("Configuración técnica BNC / ADC1 guardada.");
        });
    }

    if (btnRestaurarFabrica) {
        btnRestaurarFabrica.addEventListener("click", () => {
            const selectAdc = document.getElementById("tec-ph-analogo-adc");
            if (selectAdc) selectAdc.value = "GPIO4_ADC1";
            mostrarToast("Valores de fábrica restaurados.");
        });
    }
});

