document.addEventListener("DOMContentLoaded", () => {
    const CLAVE_CONFIG_EC = "axion_ec_bloque1";
    const CLAVE_CALIBRACION_EC = "axion_ec_calibracion";
    const CLAVE_TECNICA_EC = "axion_ec_tecnico";

    const FRECUENCIAS_VALIDAS = [5, 10, 30, 60, 300];
    const SONDAS_TEMP_VALIDAS = ["pt100", "sen0708", "fijo25"];
    const GPIOS_ADC_VALIDOS = [
        "GPIO1_ADC1",
        "GPIO2_ADC1",
        "GPIO3_ADC1",
        "GPIO4_ADC1",
        "GPIO5_ADC1",
        "GPIO6_ADC1",
        "GPIO7_ADC1"
    ];
    const VREFS_VALIDOS = ["3.3", "5.0"];
    const RESOLUCIONES_VALIDAS = [10, 11, 12];

    const DEFAULTS_TECNICOS_EC = {
        gpioAdc: "GPIO1_ADC1",
        vref: "3.3",
        resolucionBits: 12,
        kValue: 0.5,
        coeficienteTermico: 0.02,
        ventanaMuestreo: 30
    };

    // Estado centralizado del Bloque 1: Alertas y Control del Cultivo (EC / TDS V1.0)
    const estadoModuloEc = {
        sensor: "EC / TDS V1.0",
        modulo: "Conductividad Eléctrica",
        activo: true,
        frecuenciaLecturaSeg: 10,
        ecMinimo: 0.8,
        ecMaximo: 1.8,
        tdsMinimo: 400,
        tdsMaximo: 900,
        compensacionTermica: true,
        sondaTempAsociada: "pt100",
        ultimaActualizacion: null
    };

    // Estado centralizado del Bloque 2: Calibración de Conductividad
    const estadoCalibracionEc = {
        sensor: "EC / TDS V1.0",
        ultimaCalibracionISO: null,
        solucionEstandarMsCm: 1.41,
        factorAjusteCalibracion: 1.0
    };

    // Estado centralizado del Bloque 3: Configuración Técnica y Conexión
    let estadoTecnicoEc = { ...DEFAULTS_TECNICOS_EC };

    // Referencias DOM - Bloque 1
    const btnEstado = document.getElementById("btn-estado-ec");
    const txtEstado = document.getElementById("estado-ec");
    const formControl = document.getElementById("form-control-ec");
    const selectFrecuencia = document.getElementById("frecuencia-lectura-ec");
    const inputEcMin = document.getElementById("ec-minimo");
    const inputEcMax = document.getElementById("ec-maximo");
    const inputTdsMin = document.getElementById("tds-minimo");
    const inputTdsMax = document.getElementById("tds-maximo");
    const btnCompensacion = document.getElementById("btn-compensacion-ec");
    const txtCompensacion = document.getElementById("texto-compensacion-ec");
    const selectSondaTemp = document.getElementById("sonda-temp-asociada");
    const errorControl = document.getElementById("error-control-ec");

    // Referencias DOM - Bloque 2 (Calibración)
    const txtUltimaCalibracion = document.getElementById("ultima-calibracion-ec");
    const inputSolucionEstandar = document.getElementById("valor-solucion-estandar");
    const btnCalibrar = document.getElementById("btn-calibrar-ec");
    const errorCalibracion = document.getElementById("error-calibracion-ec");

    // Referencias DOM - Bloque 3 (Acordeón Técnico)
    const bloqueTecnico = document.getElementById("bloque-tecnico-ec");
    const btnAcordeonTecnico = document.getElementById("btn-acordeon-tecnico-ec");
    const formTecnico = document.getElementById("form-tecnico-ec");
    const selectGpioAdc = document.getElementById("tec-ec-gpio");
    const selectVref = document.getElementById("tec-ec-vref");
    const selectResolucion = document.getElementById("tec-ec-resolucion");
    const inputKValue = document.getElementById("tec-ec-kvalue");
    const inputAlpha = document.getElementById("tec-ec-alpha");
    const inputVentana = document.getElementById("tec-ec-ventana");
    const errorTecnico = document.getElementById("error-tecnico-ec");
    const btnRestaurarFabrica = document.getElementById("btn-restaurar-fabrica-ec");

    // Referencias DOM - Modal compartido y Toast
    const modal = document.getElementById("modal-confirmacion-ec");
    const modalTitulo = document.getElementById("modal-ec-titulo");
    const modalMensaje = document.getElementById("modal-ec-mensaje");
    const btnCancelar = document.getElementById("btn-modal-cancelar-ec");
    const btnAceptar = document.getElementById("btn-modal-aceptar-ec");
    const toastEc = document.getElementById("toast-ec");

    if (!btnEstado || !txtEstado || !modal || !formControl) return;

    let accionConfirmarPendiente = null;
    let toastTimer = null;

    const configuracionAcciones = {
        pausar: {
            titulo: "¿Pausar monitoreo de EC / TDS?",
            mensaje:
                "Vas a desactivar temporalmente el sensor de conductividad eléctrica. Durante este tiempo se detendrán las alertas de nutrientes (EC / TDS) y el sistema dejará de registrar datos en el historial. Utiliza esta opción solo durante limpieza, calibración o mantenimiento.",
            claseBoton: "btn-modal-pausar"
        },
        activar: {
            titulo: "¿Reactivar sensor de EC / TDS?",
            mensaje:
                "El sistema reanudará la lectura analógica de conductividad eléctrica (EC) y sólidos disueltos totales (TDS), volverá a evaluar los umbrales de nutrientes y retomará el registro histórico. Verifica que la sonda esté correctamente sumergida.",
            claseBoton: "btn-modal-activar"
        }
    };

    function obtenerKValueActivo() {
        const kInput = inputKValue ? Number.parseFloat(inputKValue.value) : NaN;
        if (Number.isFinite(kInput) && kInput >= 0.1 && kInput <= 1.0) {
            return kInput;
        }
        return estadoTecnicoEc.kValue;
    }

    function convertirEcATds(ecMsCm, kValue = obtenerKValueActivo()) {
        return Math.round(ecMsCm * 1000 * kValue);
    }

    function convertirTdsAEc(tdsPpm, kValue = obtenerKValueActivo()) {
        return Number((tdsPpm / (1000 * kValue)).toFixed(2));
    }

    function cargarEstadoInicial() {
        try {
            const tecGuardada = localStorage.getItem(CLAVE_TECNICA_EC);
            if (tecGuardada) {
                const tec = JSON.parse(tecGuardada);
                estadoTecnicoEc = { ...DEFAULTS_TECNICOS_EC, ...tec };
            }

            const guardado = localStorage.getItem(CLAVE_CONFIG_EC);
            if (guardado) {
                const datos = JSON.parse(guardado);
                if (typeof datos.activo === "boolean") estadoModuloEc.activo = datos.activo;
                if (FRECUENCIAS_VALIDAS.includes(Number(datos.frecuenciaLecturaSeg))) {
                    estadoModuloEc.frecuenciaLecturaSeg = Number(datos.frecuenciaLecturaSeg);
                }
                if (Number.isFinite(Number(datos.ecMinimo))) estadoModuloEc.ecMinimo = Number(datos.ecMinimo);
                if (Number.isFinite(Number(datos.ecMaximo))) estadoModuloEc.ecMaximo = Number(datos.ecMaximo);
                if (Number.isFinite(Number(datos.tdsMinimo))) estadoModuloEc.tdsMinimo = Number(datos.tdsMinimo);
                if (Number.isFinite(Number(datos.tdsMaximo))) estadoModuloEc.tdsMaximo = Number(datos.tdsMaximo);
                if (typeof datos.compensacionTermica === "boolean") {
                    estadoModuloEc.compensacionTermica = datos.compensacionTermica;
                }
                if (SONDAS_TEMP_VALIDAS.includes(datos.sondaTempAsociada)) {
                    estadoModuloEc.sondaTempAsociada = datos.sondaTempAsociada;
                }
                estadoModuloEc.ultimaActualizacion = datos.ultimaActualizacion || null;
            }

            const calGuardada = localStorage.getItem(CLAVE_CALIBRACION_EC);
            if (calGuardada) {
                const cal = JSON.parse(calGuardada);
                if (cal.ultimaCalibracionISO) estadoCalibracionEc.ultimaCalibracionISO = cal.ultimaCalibracionISO;
                if (Number.isFinite(Number(cal.solucionEstandarMsCm))) {
                    estadoCalibracionEc.solucionEstandarMsCm = Number(cal.solucionEstandarMsCm);
                }
                if (Number.isFinite(Number(cal.factorAjusteCalibracion))) {
                    estadoCalibracionEc.factorAjusteCalibracion = Number(cal.factorAjusteCalibracion);
                }
            }
        } catch (err) {
            console.warn("No se pudo restaurar la configuración de EC / TDS:", err);
        }
    }

    function persistirEstado() {
        estadoModuloEc.ultimaActualizacion = new Date().toISOString();
        localStorage.setItem(CLAVE_CONFIG_EC, JSON.stringify(estadoModuloEc));
    }

    function persistirCalibracion() {
        localStorage.setItem(CLAVE_CALIBRACION_EC, JSON.stringify(estadoCalibracionEc));
    }

    function persistirTecnica() {
        localStorage.setItem(CLAVE_TECNICA_EC, JSON.stringify(estadoTecnicoEc));
    }

    function formatearFechaCalibracion(isoString) {
        if (!isoString) return "Hace 18 días";
        const fecha = new Date(isoString);
        if (Number.isNaN(fecha.getTime())) return "Hace 18 días";

        const diffMs = Date.now() - fecha.getTime();
        const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const fechaHora = fecha.toLocaleString("es-PE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });

        if (diffDias <= 0) return `Hoy (${fechaHora})`;
        if (diffDias === 1) return `Hace 1 día (${fechaHora})`;
        return `Hace ${diffDias} días (${fechaHora})`;
    }

    function actualizarTextoCalibracion() {
        if (!txtUltimaCalibracion) return;
        txtUltimaCalibracion.textContent = formatearFechaCalibracion(estadoCalibracionEc.ultimaCalibracionISO);
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

    function sincronizarCamposTecnicos() {
        if (!formTecnico) return;
        if (selectGpioAdc) selectGpioAdc.value = estadoTecnicoEc.gpioAdc;
        if (selectVref) selectVref.value = estadoTecnicoEc.vref;
        if (selectResolucion) selectResolucion.value = String(estadoTecnicoEc.resolucionBits);
        if (inputKValue) inputKValue.value = estadoTecnicoEc.kValue.toFixed(2);
        if (inputAlpha) inputAlpha.value = String(estadoTecnicoEc.coeficienteTermico);
        if (inputVentana) inputVentana.value = String(estadoTecnicoEc.ventanaMuestreo);
    }

    function sincronizarFormularioConEstado() {
        actualizarIndicadorVisual(estadoModuloEc.activo);
        if (selectFrecuencia) selectFrecuencia.value = String(estadoModuloEc.frecuenciaLecturaSeg);
        if (inputEcMin) inputEcMin.value = estadoModuloEc.ecMinimo.toFixed(2);
        if (inputEcMax) inputEcMax.value = estadoModuloEc.ecMaximo.toFixed(2);
        if (inputTdsMin) inputTdsMin.value = String(Math.round(estadoModuloEc.tdsMinimo));
        if (inputTdsMax) inputTdsMax.value = String(Math.round(estadoModuloEc.tdsMaximo));
        actualizarBotonCompensacion(estadoModuloEc.compensacionTermica);
        if (selectSondaTemp) selectSondaTemp.value = estadoModuloEc.sondaTempAsociada;
        if (inputSolucionEstandar) {
            inputSolucionEstandar.value = estadoCalibracionEc.solucionEstandarMsCm.toFixed(2);
        }
        actualizarTextoCalibracion();
        sincronizarCamposTecnicos();
    }

    function mostrarError(elementoError, mensaje) {
        if (!elementoError) return;
        elementoError.textContent = mensaje;
        elementoError.hidden = false;
    }

    function limpiarError(elementoError) {
        if (!elementoError) return;
        elementoError.textContent = "";
        elementoError.hidden = true;
    }

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

    function enviarOrdenSensor(activo) {
        estadoModuloEc.activo = activo;
        persistirEstado();

        const orden = {
            sensor: estadoModuloEc.sensor,
            modulo: estadoModuloEc.modulo,
            estado: activo ? "ACTIVO" : "PAUSADO",
            timestamp: estadoModuloEc.ultimaActualizacion
        };

        document.dispatchEvent(new CustomEvent("ec:ordenEstado", { detail: orden }));
        console.info("Orden enviada para sensor EC / TDS V1.0:", orden);
        mostrarToast(activo ? "Sensor EC / TDS activado." : "Sensor EC / TDS pausado.");
    }

    function ejecutarCalibracion(valorEstandar) {
        const ahoraISO = new Date().toISOString();
        const kValue = estadoTecnicoEc.kValue;
        const factorAjuste = Number((valorEstandar / 1.41).toFixed(4));

        estadoCalibracionEc.ultimaCalibracionISO = ahoraISO;
        estadoCalibracionEc.solucionEstandarMsCm = Number(valorEstandar.toFixed(2));
        estadoCalibracionEc.factorAjusteCalibracion = factorAjuste;

        persistirCalibracion();
        actualizarTextoCalibracion();

        const comando = {
            sensor: "EC / TDS V1.0",
            accion: "CALIBRAR",
            solucionMsCm: estadoCalibracionEc.solucionEstandarMsCm,
            equivalentePpm: convertirEcATds(estadoCalibracionEc.solucionEstandarMsCm, kValue),
            factorAjuste,
            timestamp: ahoraISO
        };

        document.dispatchEvent(new CustomEvent("ec:calibracionEjecutada", { detail: comando }));
        console.info("Comando de calibración enviado (EC / TDS V1.0):", comando);
        mostrarToast(`Calibración completada (${estadoCalibracionEc.solucionEstandarMsCm.toFixed(2)} mS/cm).`);
    }

    function validarCamposControl() {
        const frecuencia = Number(selectFrecuencia.value);
        const ecMin = Number.parseFloat(inputEcMin.value);
        const ecMax = Number.parseFloat(inputEcMax.value);
        const tdsMin = Number.parseFloat(inputTdsMin.value);
        const tdsMax = Number.parseFloat(inputTdsMax.value);
        const sondaTemp = selectSondaTemp.value;

        if (!FRECUENCIAS_VALIDAS.includes(frecuencia)) {
            return { valido: false, error: "Selecciona una frecuencia de lectura válida." };
        }

        if (!Number.isFinite(ecMin) || ecMin < 0 || ecMin > 2.0) {
            return { valido: false, error: "La EC Mínima debe estar entre 0.00 y 2.00 mS/cm." };
        }

        if (!Number.isFinite(ecMax) || ecMax < 0 || ecMax > 2.0) {
            return { valido: false, error: "La EC Máxima debe estar entre 0.00 y 2.00 mS/cm." };
        }

        if (ecMin >= ecMax) {
            return { valido: false, error: "La EC Mínima debe ser menor que la EC Máxima." };
        }

        if (!Number.isFinite(tdsMin) || tdsMin < 0 || tdsMin > 1000) {
            return { valido: false, error: "El TDS Mínimo debe estar entre 0 y 1000 ppm." };
        }

        if (!Number.isFinite(tdsMax) || tdsMax < 0 || tdsMax > 1000) {
            return { valido: false, error: "El TDS Máximo debe estar entre 0 y 1000 ppm." };
        }

        if (tdsMin >= tdsMax) {
            return { valido: false, error: "El TDS Mínimo debe ser menor que el TDS Máximo." };
        }

        if (!SONDAS_TEMP_VALIDAS.includes(sondaTemp)) {
            return { valido: false, error: "Selecciona una sonda de temperatura asociada válida." };
        }

        return {
            valido: true,
            datos: {
                frecuenciaLecturaSeg: frecuencia,
                ecMinimo: Number(ecMin.toFixed(2)),
                ecMaximo: Number(ecMax.toFixed(2)),
                tdsMinimo: Math.round(tdsMin),
                tdsMaximo: Math.round(tdsMax),
                sondaTempAsociada: sondaTemp
            }
        };
    }

    function validarCamposTecnicos() {
        const gpioAdc = selectGpioAdc.value;
        const vref = selectVref.value;
        const resolucionBits = Number(selectResolucion.value);
        const kValue = Number.parseFloat(inputKValue.value);
        const coeficienteTermico = Number.parseFloat(inputAlpha.value);
        const ventanaMuestreo = Number(inputVentana.value);

        if (!GPIOS_ADC_VALIDOS.includes(gpioAdc)) {
            return { valido: false, error: "Selecciona un canal GPIO / ADC1 válido del ESP32-S3." };
        }

        if (!VREFS_VALIDOS.includes(vref)) {
            return { valido: false, error: "Selecciona un Voltaje de Referencia (Vref) válido." };
        }

        if (!RESOLUCIONES_VALIDAS.includes(resolucionBits)) {
            return { valido: false, error: "Selecciona una resolución ADC válida (10, 11 o 12 bits)." };
        }

        if (!Number.isFinite(kValue) || kValue < 0.1 || kValue > 1.0) {
            return { valido: false, error: "El Factor de Conversión (K_value) debe estar entre 0.10 y 1.00." };
        }

        if (!Number.isFinite(coeficienteTermico) || coeficienteTermico < 0.001 || coeficienteTermico > 0.1) {
            return { valido: false, error: "El Coeficiente Térmico (α) debe estar entre 0.001 y 0.100." };
        }

        if (!Number.isInteger(ventanaMuestreo) || ventanaMuestreo < 1 || ventanaMuestreo > 200) {
            return { valido: false, error: "La Ventana de Muestreo debe ser un entero entre 1 y 200 lecturas." };
        }

        return {
            valido: true,
            datos: {
                gpioAdc,
                vref,
                resolucionBits,
                kValue: Number(kValue.toFixed(2)),
                coeficienteTermico: Number(coeficienteTermico.toFixed(3)),
                ventanaMuestreo
            }
        };
    }

    function sincronizarTdsDesdeEcConFactor(kValue) {
        const ecMin = Number.parseFloat(inputEcMin.value);
        const ecMax = Number.parseFloat(inputEcMax.value);
        if (Number.isFinite(ecMin) && inputTdsMin) {
            const tdsMin = convertirEcATds(ecMin, kValue);
            inputTdsMin.value = String(tdsMin);
            estadoModuloEc.tdsMinimo = tdsMin;
        }
        if (Number.isFinite(ecMax) && inputTdsMax) {
            const tdsMax = convertirEcATds(ecMax, kValue);
            inputTdsMax.value = String(tdsMax);
            estadoModuloEc.tdsMaximo = tdsMax;
        }
    }

    function restaurarValoresFabrica() {
        estadoTecnicoEc = { ...DEFAULTS_TECNICOS_EC };
        persistirTecnica();
        sincronizarCamposTecnicos();
        sincronizarTdsDesdeEcConFactor(estadoTecnicoEc.kValue);
        limpiarError(errorTecnico);

        document.dispatchEvent(
            new CustomEvent("ec:configTecnicaRestaurada", { detail: { ...estadoTecnicoEc } })
        );
        console.info("Configuración técnica restaurada a valores de fábrica (EC / TDS):", estadoTecnicoEc);
        mostrarToast("Valores técnicos de fábrica restaurados.");
    }

    // 1. Control de Estado del Sensor (Modal obligatorio)
    btnEstado.addEventListener("click", () => {
        const nuevoEstado = !estadoModuloEc.activo;
        const cfg = nuevoEstado ? configuracionAcciones.activar : configuracionAcciones.pausar;
        abrirModalConfirmacion({
            titulo: cfg.titulo,
            mensaje: cfg.mensaje,
            claseBoton: cfg.claseBoton,
            onAceptar: () => {
                actualizarIndicadorVisual(nuevoEstado);
                enviarOrdenSensor(nuevoEstado);
            }
        });
    });

    // Sincronización bidireccional EC (mS/cm) <-> TDS (ppm)
    if (inputEcMin && inputTdsMin) {
        inputEcMin.addEventListener("input", () => {
            limpiarError(errorControl);
            const ecMin = Number.parseFloat(inputEcMin.value);
            if (!Number.isFinite(ecMin) || ecMin < 0) return;
            inputTdsMin.value = String(convertirEcATds(ecMin));
        });

        inputTdsMin.addEventListener("input", () => {
            limpiarError(errorControl);
            const tdsMin = Number.parseFloat(inputTdsMin.value);
            if (!Number.isFinite(tdsMin) || tdsMin < 0) return;
            inputEcMin.value = convertirTdsAEc(tdsMin).toFixed(2);
        });
    }

    if (inputEcMax && inputTdsMax) {
        inputEcMax.addEventListener("input", () => {
            limpiarError(errorControl);
            const ecMax = Number.parseFloat(inputEcMax.value);
            if (!Number.isFinite(ecMax) || ecMax < 0) return;
            inputTdsMax.value = String(convertirEcATds(ecMax));
        });

        inputTdsMax.addEventListener("input", () => {
            limpiarError(errorControl);
            const tdsMax = Number.parseFloat(inputTdsMax.value);
            if (!Number.isFinite(tdsMax) || tdsMax < 0) return;
            inputEcMax.value = convertirTdsAEc(tdsMax).toFixed(2);
        });
    }

    // Bloque 1 - Compensación Térmica Automática
    if (btnCompensacion) {
        btnCompensacion.addEventListener("click", () => {
            const nuevaCompensacion = !btnCompensacion.classList.contains("activo");
            actualizarBotonCompensacion(nuevaCompensacion);
        });
    }

    if (selectFrecuencia) selectFrecuencia.addEventListener("change", () => limpiarError(errorControl));
    if (selectSondaTemp) selectSondaTemp.addEventListener("change", () => limpiarError(errorControl));

    // Bloque 1 - Guardado de configuración
    formControl.addEventListener("submit", (e) => {
        e.preventDefault();
        limpiarError(errorControl);

        const resultado = validarCamposControl();
        if (!resultado.valido) {
            mostrarError(errorControl, resultado.error);
            return;
        }

        estadoModuloEc.frecuenciaLecturaSeg = resultado.datos.frecuenciaLecturaSeg;
        estadoModuloEc.ecMinimo = resultado.datos.ecMinimo;
        estadoModuloEc.ecMaximo = resultado.datos.ecMaximo;
        estadoModuloEc.tdsMinimo = resultado.datos.tdsMinimo;
        estadoModuloEc.tdsMaximo = resultado.datos.tdsMaximo;
        estadoModuloEc.compensacionTermica = btnCompensacion
            ? btnCompensacion.classList.contains("activo")
            : true;
        estadoModuloEc.sondaTempAsociada = resultado.datos.sondaTempAsociada;

        persistirEstado();
        sincronizarFormularioConEstado();

        document.dispatchEvent(
            new CustomEvent("ec:configuracionGuardada", { detail: { ...estadoModuloEc } })
        );
        console.info("Configuración Bloque 1 (EC / TDS V1.0) guardada:", estadoModuloEc);
        mostrarToast("Configuración de alertas y umbrales EC / TDS guardada.");
    });

    // Bloque 2 - Calibración con Solución Estándar (con modal de confirmación)
    if (inputSolucionEstandar) {
        inputSolucionEstandar.addEventListener("input", () => limpiarError(errorCalibracion));
    }

    if (btnCalibrar && inputSolucionEstandar) {
        btnCalibrar.addEventListener("click", () => {
            limpiarError(errorCalibracion);
            const valorEstandar = Number.parseFloat(inputSolucionEstandar.value);

            if (!Number.isFinite(valorEstandar) || valorEstandar <= 0 || valorEstandar > 20) {
                mostrarError(
                    errorCalibracion,
                    "Ingresa un valor de solución estándar válido entre 0.01 y 20.00 mS/cm."
                );
                return;
            }

            const ppmEquivalente = convertirEcATds(valorEstandar);
            abrirModalConfirmacion({
                titulo: "¿Calibrar sensor EC / TDS?",
                mensaje: `¿Confirmas que la sonda está sumergida y estabilizada en la solución estándar de ${valorEstandar.toFixed(2)} mS/cm (≈ ${ppmEquivalente} ppm) y deseas guardar el nuevo factor de ajuste?`,
                claseBoton: "btn-modal-activar",
                onAceptar: () => ejecutarCalibracion(valorEstandar)
            });
        });
    }

    // Bloque 3 - Ayudas contextuales (iconos ?)
    const botonesAyuda = Array.from(document.querySelectorAll(".btn-ayuda-campo"));

    function cerrarAyudasContextuales(exceptoBtn = null) {
        botonesAyuda.forEach((btn) => {
            if (btn === exceptoBtn) return;
            const idPanel = btn.getAttribute("aria-controls");
            const panel = idPanel ? document.getElementById(idPanel) : null;
            btn.setAttribute("aria-expanded", "false");
            if (panel) panel.hidden = true;
        });
    }

    botonesAyuda.forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const idPanel = btn.getAttribute("aria-controls");
            const panel = idPanel ? document.getElementById(idPanel) : null;
            if (!panel) return;

            const abrir = panel.hidden;
            cerrarAyudasContextuales(btn);
            panel.hidden = !abrir;
            btn.setAttribute("aria-expanded", abrir ? "true" : "false");
        });
    });

    document.addEventListener("click", (e) => {
        if (!e.target.closest(".ayuda-contextual")) {
            cerrarAyudasContextuales();
        }
    });

    // Bloque 3 - Acordeón colapsado por defecto
    if (btnAcordeonTecnico && bloqueTecnico) {
        btnAcordeonTecnico.addEventListener("click", () => {
            const abierto = bloqueTecnico.classList.toggle("abierto");
            btnAcordeonTecnico.setAttribute("aria-expanded", abierto ? "true" : "false");
            if (!abierto) cerrarAyudasContextuales();
        });
    }

    // Bloque 3 - Guardado de parámetros técnicos
    if (formTecnico) {
        formTecnico.addEventListener("submit", (e) => {
            e.preventDefault();
            limpiarError(errorTecnico);

            const resultado = validarCamposTecnicos();
            if (!resultado.valido) {
                mostrarError(errorTecnico, resultado.error);
                return;
            }

            estadoTecnicoEc = { ...resultado.datos };
            persistirTecnica();
            sincronizarCamposTecnicos();
            sincronizarTdsDesdeEcConFactor(estadoTecnicoEc.kValue);

            if (estadoModuloEc.tdsMaximo <= 1000) {
                persistirEstado();
            }

            document.dispatchEvent(
                new CustomEvent("ec:configTecnicaGuardada", { detail: { ...estadoTecnicoEc } })
            );
            console.info("Configuración técnica guardada (EC / TDS V1.0):", estadoTecnicoEc);
            mostrarToast(
                estadoModuloEc.tdsMaximo > 1000
                    ? "Parámetros técnicos guardados. Ajusta los umbrales TDS (máx. 1000 ppm)."
                    : "Configuración técnica y ADC guardada."
            );
        });

        [selectGpioAdc, selectVref, selectResolucion, inputKValue, inputAlpha, inputVentana].forEach((campo) => {
            if (campo) campo.addEventListener("input", () => limpiarError(errorTecnico));
        });
    }

    // Bloque 3 - Restaurar valores de fábrica
    if (btnRestaurarFabrica) {
        btnRestaurarFabrica.addEventListener("click", () => {
            abrirModalConfirmacion({
                titulo: "¿Restaurar valores de fábrica?",
                mensaje:
                    "Se restablecerán los parámetros técnicos de hardware ADC (GPIO 1 ADC1, Vref 3.3 V, 12 bits) y procesamiento (K_value 0.50, α 0.02, ventana 30 lecturas) a sus valores por defecto.",
                claseBoton: "btn-modal-pausar",
                onAceptar: restaurarValoresFabrica
            });
        });
    }

    // Acciones del Modal compartido
    btnAceptar.addEventListener("click", () => {
        if (typeof accionConfirmarPendiente === "function") {
            accionConfirmarPendiente();
        }
        cerrarModalConfirmacion();
    });

    btnCancelar.addEventListener("click", cerrarModalConfirmacion);

    modal.addEventListener("click", (e) => {
        if (e.target === modal) cerrarModalConfirmacion();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (!modal.hidden) cerrarModalConfirmacion();
            cerrarAyudasContextuales();
        }
    });

    // Inicialización al cargar
    cargarEstadoInicial();
    sincronizarFormularioConEstado();
});

