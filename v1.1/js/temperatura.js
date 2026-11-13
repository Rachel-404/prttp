document.addEventListener("DOMContentLoaded", () => {
    const CLAVE_CONFIG_TEMP = "axion_temp_agua_bloque1";
    const CLAVE_CALIBRACION_TEMP = "axion_temp_agua_calibracion";
    const CLAVE_TECNICA_TEMP = "axion_temp_agua_tecnico";

    const FRECUENCIAS_VALIDAS = [5, 10, 30, 60, 300];
    const CONEXIONES_VALIDAS = ["3_hilos", "2_hilos"];
    const LONGITUDES_VALIDAS = ["1m", "2m", "3m"];
    const INTERFACES_VALIDAS = ["SPI_MAX31865", "ANALOG_ADC"];
    const FILTROS_RED_VALIDOS = ["60Hz", "50Hz"];

    const DEFAULTS_TECNICOS_TEMP = {
        tipoConexion: "3_hilos",
        longitudCable: "2m",
        interfazLector: "SPI_MAX31865",
        pinesEsp32: "CS: GPIO 5, SCK: GPIO 18, MISO: GPIO 19, MOSI: GPIO 23",
        rrefOhmios: 430.0,
        r0Ohmios: 100.0,
        coeficienteAlpha: 0.00385,
        filtroRed: "60Hz"
    };

    // Estado centralizado del Bloque 1: Alertas y Control del Cultivo (RTD PT100 3 Hilos)
    const estadoModuloTemp = {
        sensor: "RTD PT100",
        modulo: "Temperatura del Agua",
        activo: true,
        frecuenciaLecturaSeg: 10,
        tempMinimaAgua: 18.0,
        tempMaximaAgua: 24.0,
        compensarOtrosSensores: true,
        ultimaActualizacion: null
    };

    // Estado centralizado del Bloque 2: Calibración de Temperatura
    const estadoCalibracionTemp = {
        sensor: "RTD PT100",
        ultimaCalibracionISO: null,
        offsetCelsius: 0.0
    };

    // Estado centralizado del Bloque 3: Configuración Técnica y Conexión
    let estadoTecnicoTemp = { ...DEFAULTS_TECNICOS_TEMP };

    // Referencias DOM - Bloque 1
    const btnEstado = document.getElementById("btn-estado-temp");
    const txtEstado = document.getElementById("estado-temp");
    const formControl = document.getElementById("form-control-temp");
    const selectFrecuencia = document.getElementById("frecuencia-lectura-temp");
    const inputTempMin = document.getElementById("temp-minimo-agua");
    const inputTempMax = document.getElementById("temp-maximo-agua");
    const btnCompensarOtros = document.getElementById("btn-compensar-otros");
    const txtCompensarOtros = document.getElementById("texto-compensar-otros");
    const errorControl = document.getElementById("error-control-temp");

    // Referencias DOM - Bloque 2
    const txtUltimaCalibracion = document.getElementById("ultima-calibracion-temp");
    const inputOffset = document.getElementById("offset-temp-calibracion");
    const btnAplicarAjuste = document.getElementById("btn-aplicar-ajuste-temp");
    const errorCalibracion = document.getElementById("error-calibracion-temp");

    // Referencias DOM - Bloque 3
    const bloqueTecnico = document.getElementById("bloque-tecnico-temp");
    const btnAcordeonTecnico = document.getElementById("btn-acordeon-tecnico-temp");
    const formTecnico = document.getElementById("form-tecnico-temp");
    const selectConexion = document.getElementById("tec-temp-conexion");
    const selectLongitud = document.getElementById("tec-temp-longitud");
    const selectInterfaz = document.getElementById("tec-temp-interfaz");
    const inputPines = document.getElementById("tec-temp-pines");
    const inputRref = document.getElementById("tec-temp-rref");
    const inputR0 = document.getElementById("tec-temp-r0");
    const inputAlpha = document.getElementById("tec-temp-alpha");
    const selectFiltro = document.getElementById("tec-temp-filtro");
    const errorTecnico = document.getElementById("error-tecnico-temp");
    const btnRestaurarFabrica = document.getElementById("btn-restaurar-fabrica-temp");

    // Referencias DOM - Modal compartido y Toast
    const modal = document.getElementById("modal-confirmacion-temp");
    const modalTitulo = document.getElementById("modal-temp-titulo");
    const modalMensaje = document.getElementById("modal-temp-mensaje");
    const btnCancelar = document.getElementById("btn-modal-cancelar-temp");
    const btnAceptar = document.getElementById("btn-modal-aceptar-temp");
    const toastTemp = document.getElementById("toast-temp");

    if (!btnEstado || !txtEstado || !modal || !formControl) return;

    let accionConfirmarPendiente = null;
    let toastTimer = null;

    const configuracionAcciones = {
        pausar: {
            titulo: "¿Pausar monitoreo de temperatura?",
            mensaje:
                "Vas a desactivar temporalmente la sonda RTD PT100. Durante este tiempo se detendrán las alertas térmicas del agua y se suspenderá la compensación automática de temperatura hacia los otros sensores (EC y pH).",
            claseBoton: "btn-modal-pausar"
        },
        activar: {
            titulo: "¿Reactivar sonda PT100 de temperatura?",
            mensaje:
                "El sistema reanudará la lectura continua de la temperatura del agua, reactivará las alertas térmicas y volverá a proveer compensación térmica en tiempo real para EC y pH.",
            claseBoton: "btn-modal-activar"
        }
    };

    function cargarEstadoInicial() {
        try {
            const cfgGuardada = localStorage.getItem(CLAVE_CONFIG_TEMP);
            if (cfgGuardada) {
                const datos = JSON.parse(cfgGuardada);
                if (typeof datos.activo === "boolean") estadoModuloTemp.activo = datos.activo;
                if (FRECUENCIAS_VALIDAS.includes(Number(datos.frecuenciaLecturaSeg))) {
                    estadoModuloTemp.frecuenciaLecturaSeg = Number(datos.frecuenciaLecturaSeg);
                }
                if (Number.isFinite(Number(datos.tempMinimaAgua))) {
                    estadoModuloTemp.tempMinimaAgua = Number(datos.tempMinimaAgua);
                }
                if (Number.isFinite(Number(datos.tempMaximaAgua))) {
                    estadoModuloTemp.tempMaximaAgua = Number(datos.tempMaximaAgua);
                }
                if (typeof datos.compensarOtrosSensores === "boolean") {
                    estadoModuloTemp.compensarOtrosSensores = datos.compensarOtrosSensores;
                }
                estadoModuloTemp.ultimaActualizacion = datos.ultimaActualizacion || null;
            }

            const calGuardada = localStorage.getItem(CLAVE_CALIBRACION_TEMP);
            if (calGuardada) {
                const cal = JSON.parse(calGuardada);
                if (cal.ultimaCalibracionISO) estadoCalibracionTemp.ultimaCalibracionISO = cal.ultimaCalibracionISO;
                if (Number.isFinite(Number(cal.offsetCelsius))) {
                    estadoCalibracionTemp.offsetCelsius = Number(cal.offsetCelsius);
                }
            }

            const tecGuardada = localStorage.getItem(CLAVE_TECNICA_TEMP);
            if (tecGuardada) {
                const tec = JSON.parse(tecGuardada);
                estadoTecnicoTemp = { ...DEFAULTS_TECNICOS_TEMP, ...tec };
            }
        } catch (err) {
            console.warn("No se pudo restaurar la configuración de Temperatura del Agua:", err);
        }
    }

    function persistirEstado() {
        estadoModuloTemp.ultimaActualizacion = new Date().toISOString();
        localStorage.setItem(CLAVE_CONFIG_TEMP, JSON.stringify(estadoModuloTemp));
    }

    function persistirCalibracion() {
        localStorage.setItem(CLAVE_CALIBRACION_TEMP, JSON.stringify(estadoCalibracionTemp));
    }

    function persistirTecnica() {
        localStorage.setItem(CLAVE_TECNICA_TEMP, JSON.stringify(estadoTecnicoTemp));
    }

    function formatearFechaCalibracion(isoString) {
        if (!isoString) return "Hace 15 días";
        const fecha = new Date(isoString);
        if (Number.isNaN(fecha.getTime())) return "Hace 15 días";

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

    function actualizarTextoCalibracion() {
        if (!txtUltimaCalibracion) return;
        txtUltimaCalibracion.textContent = formatearFechaCalibracion(estadoCalibracionTemp.ultimaCalibracionISO);
    }

    function sincronizarCamposTecnicos() {
        if (!formTecnico) return;
        if (selectConexion) selectConexion.value = estadoTecnicoTemp.tipoConexion;
        if (selectLongitud) selectLongitud.value = estadoTecnicoTemp.longitudCable;
        if (selectInterfaz) selectInterfaz.value = estadoTecnicoTemp.interfazLector;
        if (inputPines) inputPines.value = estadoTecnicoTemp.pinesEsp32;
        if (inputRref) inputRref.value = estadoTecnicoTemp.rrefOhmios.toFixed(1);
        if (inputR0) inputR0.value = estadoTecnicoTemp.r0Ohmios.toFixed(1);
        if (inputAlpha) inputAlpha.value = String(estadoTecnicoTemp.coeficienteAlpha);
        if (selectFiltro) selectFiltro.value = estadoTecnicoTemp.filtroRed;
    }

    function sincronizarFormularioConEstado() {
        actualizarIndicadorVisual(estadoModuloTemp.activo);
        if (selectFrecuencia) selectFrecuencia.value = String(estadoModuloTemp.frecuenciaLecturaSeg);
        if (inputTempMin) inputTempMin.value = estadoModuloTemp.tempMinimaAgua.toFixed(1);
        if (inputTempMax) inputTempMax.value = estadoModuloTemp.tempMaximaAgua.toFixed(1);
        actualizarBotonCompensacion(estadoModuloTemp.compensarOtrosSensores);
        if (inputOffset) inputOffset.value = estadoCalibracionTemp.offsetCelsius.toFixed(1);
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

    function enviarOrdenSensor(activo) {
        estadoModuloTemp.activo = activo;
        persistirEstado();

        const orden = {
            sensor: estadoModuloTemp.sensor,
            modulo: estadoModuloTemp.modulo,
            estado: activo ? "ACTIVO" : "PAUSADO",
            compensacionCompartidaActiva: activo && estadoModuloTemp.compensarOtrosSensores,
            timestamp: estadoModuloTemp.ultimaActualizacion
        };

        document.dispatchEvent(new CustomEvent("temperatura:ordenEstado", { detail: orden }));
        console.info("Orden enviada para sonda RTD PT100:", orden);
        mostrarToast(activo ? "Sonda PT100 activada." : "Sonda PT100 pausada.");
    }

    function ejecutarAjusteOffset(offset) {
        const ahoraISO = new Date().toISOString();
        estadoCalibracionTemp.ultimaCalibracionISO = ahoraISO;
        estadoCalibracionTemp.offsetCelsius = Number(offset.toFixed(1));
        persistirCalibracion();
        actualizarTextoCalibracion();

        const offsetEtiqueta =
            estadoCalibracionTemp.offsetCelsius > 0
                ? `+${estadoCalibracionTemp.offsetCelsius.toFixed(1)}`
                : estadoCalibracionTemp.offsetCelsius.toFixed(1);

        const comando = {
            sensor: "RTD PT100",
            accion: "AJUSTAR_OFFSET",
            offsetCelsius: estadoCalibracionTemp.offsetCelsius,
            timestamp: ahoraISO
        };

        document.dispatchEvent(new CustomEvent("temperatura:offsetAplicado", { detail: comando }));
        console.info("Ajuste de offset aplicado (PT100):", comando);
        mostrarToast(`Offset aplicado (${offsetEtiqueta} °C).`);
    }

    function validarCamposControl() {
        const frecuencia = Number(selectFrecuencia.value);
        const tempMin = Number.parseFloat(inputTempMin.value);
        const tempMax = Number.parseFloat(inputTempMax.value);

        if (!FRECUENCIAS_VALIDAS.includes(frecuencia)) {
            return { valido: false, error: "Selecciona una frecuencia de lectura válida." };
        }

        if (!Number.isFinite(tempMin) || tempMin < 0 || tempMin > 400) {
            return {
                valido: false,
                error: "La Temp. Mínima Agua debe estar dentro del rango físico de la sonda (0.0 a 400.0 °C)."
            };
        }

        if (!Number.isFinite(tempMax) || tempMax < 0 || tempMax > 400) {
            return {
                valido: false,
                error: "La Temp. Máxima Agua debe estar dentro del rango físico de la sonda (0.0 a 400.0 °C)."
            };
        }

        if (tempMin >= tempMax) {
            return {
                valido: false,
                error: "La Temp. Mínima Agua debe ser menor que la Temp. Máxima Agua."
            };
        }

        return {
            valido: true,
            datos: {
                frecuenciaLecturaSeg: frecuencia,
                tempMinimaAgua: Number(tempMin.toFixed(1)),
                tempMaximaAgua: Number(tempMax.toFixed(1))
            }
        };
    }

    function validarCamposTecnicos() {
        const tipoConexion = selectConexion.value;
        const longitudCable = selectLongitud.value;
        const interfazLector = selectInterfaz.value;
        const pinesEsp32 = (inputPines.value || "").trim();
        const rrefOhmios = Number.parseFloat(inputRref.value);
        const r0Ohmios = Number.parseFloat(inputR0.value);
        const coeficienteAlpha = Number.parseFloat(inputAlpha.value);
        const filtroRed = selectFiltro.value;

        if (!CONEXIONES_VALIDAS.includes(tipoConexion)) {
            return { valido: false, error: "Selecciona un tipo de conexión válido (2 o 3 hilos)." };
        }

        if (!LONGITUDES_VALIDAS.includes(longitudCable)) {
            return { valido: false, error: "Selecciona una longitud de cable válida (1m, 2m o 3m)." };
        }

        if (!INTERFACES_VALIDAS.includes(interfazLector)) {
            return { valido: false, error: "Selecciona una interfaz lectora válida." };
        }

        if (!pinesEsp32) {
            return { valido: false, error: "Indica la asignación de pines del ESP32-S3." };
        }

        if (!Number.isFinite(rrefOhmios) || rrefOhmios < 100 || rrefOhmios > 1000) {
            return { valido: false, error: "La Resistencia de Referencia Rref debe estar entre 100.0 y 1000.0 Ω." };
        }

        if (!Number.isFinite(r0Ohmios) || r0Ohmios < 50 || r0Ohmios > 1000) {
            return { valido: false, error: "La Resistencia Base R0 a 0°C debe estar entre 50.0 y 1000.0 Ω." };
        }

        if (!Number.isFinite(coeficienteAlpha) || coeficienteAlpha < 0.001 || coeficienteAlpha > 0.01) {
            return { valido: false, error: "El Coeficiente Térmico α debe estar entre 0.00100 y 0.01000." };
        }

        if (!FILTROS_RED_VALIDOS.includes(filtroRed)) {
            return { valido: false, error: "Selecciona un filtro de red eléctrica válido (50 Hz o 60 Hz)." };
        }

        return {
            valido: true,
            datos: {
                tipoConexion,
                longitudCable,
                interfazLector,
                pinesEsp32,
                rrefOhmios: Number(rrefOhmios.toFixed(1)),
                r0Ohmios: Number(r0Ohmios.toFixed(1)),
                coeficienteAlpha: Number(coeficienteAlpha.toFixed(5)),
                filtroRed
            }
        };
    }

    function restaurarValoresFabrica() {
        estadoTecnicoTemp = { ...DEFAULTS_TECNICOS_TEMP };
        persistirTecnica();
        sincronizarCamposTecnicos();
        limpiarError(errorTecnico);

        document.dispatchEvent(
            new CustomEvent("temperatura:configTecnicaRestaurada", { detail: { ...estadoTecnicoTemp } })
        );
        console.info("Configuración técnica restaurada a valores de fábrica (PT100):", estadoTecnicoTemp);
        mostrarToast("Valores técnicos de fábrica restaurados.");
    }

    // Bloque 1 - Estado del sensor con modal
    btnEstado.addEventListener("click", () => {
        const nuevoEstado = !estadoModuloTemp.activo;
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

    // Bloque 1 - Sincronización de compensación térmica hacia EC y pH
    if (btnCompensarOtros) {
        btnCompensarOtros.addEventListener("click", () => {
            const nuevaCompensacion = !btnCompensarOtros.classList.contains("activo");
            actualizarBotonCompensacion(nuevaCompensacion);
        });
    }

    [selectFrecuencia, inputTempMin, inputTempMax].forEach((campo) => {
        if (campo) campo.addEventListener("input", () => limpiarError(errorControl));
    });

    formControl.addEventListener("submit", (e) => {
        e.preventDefault();
        limpiarError(errorControl);

        const resultado = validarCamposControl();
        if (!resultado.valido) {
            mostrarError(errorControl, resultado.error);
            return;
        }

        estadoModuloTemp.frecuenciaLecturaSeg = resultado.datos.frecuenciaLecturaSeg;
        estadoModuloTemp.tempMinimaAgua = resultado.datos.tempMinimaAgua;
        estadoModuloTemp.tempMaximaAgua = resultado.datos.tempMaximaAgua;
        estadoModuloTemp.compensarOtrosSensores = btnCompensarOtros
            ? btnCompensarOtros.classList.contains("activo")
            : true;

        persistirEstado();
        sincronizarFormularioConEstado();

        document.dispatchEvent(
            new CustomEvent("temperatura:configuracionGuardada", {
                detail: {
                    ...estadoModuloTemp,
                    compensacionCompartidaActiva: estadoModuloTemp.activo && estadoModuloTemp.compensarOtrosSensores
                }
            })
        );
        console.info("Configuración Bloque 1 (RTD PT100) guardada:", estadoModuloTemp);
        mostrarToast("Configuración térmica y sincronización guardada.");
    });

    // Bloque 2 - Ajuste de Desviación (Offset) con modal
    if (inputOffset) {
        inputOffset.addEventListener("input", () => limpiarError(errorCalibracion));
    }

    if (btnAplicarAjuste && inputOffset) {
        btnAplicarAjuste.addEventListener("click", () => {
            limpiarError(errorCalibracion);
            const offset = Number.parseFloat(inputOffset.value);

            if (!Number.isFinite(offset) || offset < -20 || offset > 20) {
                mostrarError(
                    errorCalibracion,
                    "Ingresa un valor de desviación válido entre -20.0 °C y +20.0 °C."
                );
                return;
            }

            const offsetFmt = offset > 0 ? `+${offset.toFixed(1)}` : offset.toFixed(1);
            abrirModalConfirmacion({
                titulo: "¿Aplicar ajuste de desviación térmica?",
                mensaje: `¿Confirmas guardar un offset de ${offsetFmt} °C respecto a tu termómetro patrón y actualizar la fecha de verificación de la sonda PT100?`,
                claseBoton: "btn-modal-activar",
                onAceptar: () => ejecutarAjusteOffset(offset)
            });
        });
    }

    // Bloque 3 - Ayudas contextuales (?)
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

    // Bloque 3 - Acordeón técnico
    if (btnAcordeonTecnico && bloqueTecnico) {
        btnAcordeonTecnico.addEventListener("click", () => {
            const abierto = bloqueTecnico.classList.toggle("abierto");
            btnAcordeonTecnico.setAttribute("aria-expanded", abierto ? "true" : "false");
            if (!abierto) cerrarAyudasContextuales();
        });
    }

    if (formTecnico) {
        formTecnico.addEventListener("submit", (e) => {
            e.preventDefault();
            limpiarError(errorTecnico);

            const resultado = validarCamposTecnicos();
            if (!resultado.valido) {
                mostrarError(errorTecnico, resultado.error);
                return;
            }

            estadoTecnicoTemp = { ...resultado.datos };
            persistirTecnica();
            sincronizarCamposTecnicos();

            document.dispatchEvent(
                new CustomEvent("temperatura:configTecnicaGuardada", { detail: { ...estadoTecnicoTemp } })
            );
            console.info("Configuración técnica guardada (RTD PT100):", estadoTecnicoTemp);
            mostrarToast("Configuración técnica PT100 y MAX31865 guardada.");
        });

        [
            selectConexion,
            selectLongitud,
            selectInterfaz,
            inputPines,
            inputRref,
            inputR0,
            inputAlpha,
            selectFiltro
        ].forEach((campo) => {
            if (campo) campo.addEventListener("input", () => limpiarError(errorTecnico));
        });
    }

    if (btnRestaurarFabrica) {
        btnRestaurarFabrica.addEventListener("click", () => {
            abrirModalConfirmacion({
                titulo: "¿Restaurar valores de fábrica?",
                mensaje:
                    "Se restablecerán los parámetros de cableado (3 Hilos, 2m, SPI MAX31865, pines SPI por defecto) y las constantes físicas (Rref 430.0 Ω, R0 100.0 Ω, α 0.00385, filtro 60 Hz).",
                claseBoton: "btn-modal-pausar",
                onAceptar: restaurarValoresFabrica
            });
        });
    }

    // Modal compartido
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

