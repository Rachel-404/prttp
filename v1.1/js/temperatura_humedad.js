document.addEventListener("DOMContentLoaded", () => {
    const CLAVE_CONFIG_DHT22 = "axion_dht22_bloque1";
    const CLAVE_CALIBRACION_DHT22 = "axion_dht22_calibracion";
    const CLAVE_TECNICA_DHT22 = "axion_dht22_tecnico";

    const FRECUENCIAS_VALIDAS = [5, 10, 30, 60, 300];
    const MODELOS_VALIDOS = ["DHT22", "DHT11"];
    const GPIOS_VALIDOS = ["GPIO 4", "GPIO 5", "GPIO 15", "GPIO 16", "GPIO 17", "GPIO 18", "GPIO 21"];
    const PULLUPS_VALIDOS = ["externa_10k", "interna_esp32"];

    const RANGOS_POR_MODELO = {
        DHT22: { temp: "-40 a 80 °C", hum: "0 a 100 % HR" },
        DHT11: { temp: "0 a 50 °C", hum: "20 a 90 % HR" }
    };

    const DEFAULTS_TECNICOS_DHT22 = {
        modeloSensor: "DHT22",
        pinGpio: "GPIO 4",
        resistenciaPullUp: "externa_10k",
        muestrasPromedio: 5
    };

    // Estado centralizado del Bloque 1: Alertas y Control del Microclima (DHT22)
    const estadoModuloDht22 = {
        sensor: "DHT22",
        modulo: "Temperatura y Humedad Ambiental",
        activo: true,
        frecuenciaLecturaSeg: 10,
        tempMinimaAire: 16.0,
        tempMaximaAire: 28.0,
        humedadMinima: 50,
        humedadMaxima: 80,
        ultimaActualizacion: null
    };

    // Estado centralizado del Bloque 2: Calibración de Temperatura y Humedad
    const estadoCalibracionDht22 = {
        sensor: "DHT22",
        ultimaVerificacionISO: null,
        offsetTemperatura: 0.0,
        offsetHumedad: 0.0
    };

    // Estado centralizado del Bloque 3: Configuración Técnica y Conexión
    let estadoTecnicoDht22 = { ...DEFAULTS_TECNICOS_DHT22 };

    // Referencias DOM - Bloque 1
    const btnEstado = document.getElementById("btn-estado-dht22");
    const txtEstado = document.getElementById("estado-dht22");
    const formControl = document.getElementById("form-control-dht22");
    const selectFrecuencia = document.getElementById("frecuencia-lectura-dht22");
    const inputTempMin = document.getElementById("temp-min-aire");
    const inputTempMax = document.getElementById("temp-max-aire");
    const inputHumMin = document.getElementById("humedad-min-aire");
    const inputHumMax = document.getElementById("humedad-max-aire");
    const errorControl = document.getElementById("error-control-dht22");

    // Referencias DOM - Bloque 2
    const txtUltimaVerificacion = document.getElementById("ultima-verificacion-dht22");
    const inputOffsetTemp = document.getElementById("offset-temp-dht22");
    const inputOffsetHum = document.getElementById("offset-humedad-dht22");
    const btnAplicarAjuste = document.getElementById("btn-aplicar-ajuste-dht22");
    const errorCalibracion = document.getElementById("error-calibracion-dht22");

    // Referencias DOM - Bloque 3
    const bloqueTecnico = document.getElementById("bloque-tecnico-dht22");
    const btnAcordeonTecnico = document.getElementById("btn-acordeon-tecnico-dht22");
    const formTecnico = document.getElementById("form-tecnico-dht22");
    const selectModelo = document.getElementById("tec-dht22-modelo");
    const selectGpio = document.getElementById("tec-dht22-gpio");
    const selectPullUp = document.getElementById("tec-dht22-pullup");
    const inputRangoTemp = document.getElementById("tec-dht22-rango-temp");
    const inputRangoHum = document.getElementById("tec-dht22-rango-hum");
    const inputMuestras = document.getElementById("tec-dht22-muestras");
    const errorTecnico = document.getElementById("error-tecnico-dht22");
    const btnRestaurarFabrica = document.getElementById("btn-restaurar-fabrica-dht22");

    // Referencias DOM - Modal compartido y Toast
    const modal = document.getElementById("modal-confirmacion-dht22");
    const modalTitulo = document.getElementById("modal-dht22-titulo");
    const modalMensaje = document.getElementById("modal-dht22-mensaje");
    const btnCancelar = document.getElementById("btn-modal-cancelar-dht22");
    const btnAceptar = document.getElementById("btn-modal-aceptar-dht22");
    const toastDht22 = document.getElementById("toast-dht22");

    if (!btnEstado || !txtEstado || !modal || !formControl) return;

    let accionConfirmarPendiente = null;
    let toastTimer = null;

    const configuracionAcciones = {
        pausar: {
            titulo: "¿Pausar sensor ambiental DHT22?",
            mensaje:
                "Vas a desactivar temporalmente el monitoreo de temperatura y humedad ambiental. Durante este tiempo se detendrán las alertas ambientales del cultivo y el registro histórico.",
            claseBoton: "btn-modal-pausar"
        },
        activar: {
            titulo: "¿Reactivar sensor ambiental DHT22?",
            mensaje:
                "El sistema reanudará la lectura de temperatura del aire y humedad relativa, reactivará las alertas del microclima y continuará el registro histórico.",
            claseBoton: "btn-modal-activar"
        }
    };

    function cargarEstadoInicial() {
        try {
            const cfgGuardada = localStorage.getItem(CLAVE_CONFIG_DHT22);
            if (cfgGuardada) {
                const datos = JSON.parse(cfgGuardada);
                if (typeof datos.activo === "boolean") estadoModuloDht22.activo = datos.activo;
                if (FRECUENCIAS_VALIDAS.includes(Number(datos.frecuenciaLecturaSeg))) {
                    estadoModuloDht22.frecuenciaLecturaSeg = Number(datos.frecuenciaLecturaSeg);
                }
                if (Number.isFinite(Number(datos.tempMinimaAire))) {
                    estadoModuloDht22.tempMinimaAire = Number(datos.tempMinimaAire);
                }
                if (Number.isFinite(Number(datos.tempMaximaAire))) {
                    estadoModuloDht22.tempMaximaAire = Number(datos.tempMaximaAire);
                }
                if (Number.isFinite(Number(datos.humedadMinima))) {
                    estadoModuloDht22.humedadMinima = Number(datos.humedadMinima);
                }
                if (Number.isFinite(Number(datos.humedadMaxima))) {
                    estadoModuloDht22.humedadMaxima = Number(datos.humedadMaxima);
                }
                estadoModuloDht22.ultimaActualizacion = datos.ultimaActualizacion || null;
            }

            const calGuardada = localStorage.getItem(CLAVE_CALIBRACION_DHT22);
            if (calGuardada) {
                const cal = JSON.parse(calGuardada);
                if (cal.ultimaVerificacionISO) estadoCalibracionDht22.ultimaVerificacionISO = cal.ultimaVerificacionISO;
                if (Number.isFinite(Number(cal.offsetTemperatura))) {
                    estadoCalibracionDht22.offsetTemperatura = Number(cal.offsetTemperatura);
                }
                if (Number.isFinite(Number(cal.offsetHumedad))) {
                    estadoCalibracionDht22.offsetHumedad = Number(cal.offsetHumedad);
                }
            }

            const tecGuardada = localStorage.getItem(CLAVE_TECNICA_DHT22);
            if (tecGuardada) {
                const tec = JSON.parse(tecGuardada);
                estadoTecnicoDht22 = { ...DEFAULTS_TECNICOS_DHT22, ...tec };
            }
        } catch (err) {
            console.warn("No se pudo restaurar la configuración de Temperatura y Humedad:", err);
        }
    }

    function persistirEstado() {
        estadoModuloDht22.ultimaActualizacion = new Date().toISOString();
        localStorage.setItem(CLAVE_CONFIG_DHT22, JSON.stringify(estadoModuloDht22));
    }

    function persistirCalibracion() {
        localStorage.setItem(CLAVE_CALIBRACION_DHT22, JSON.stringify(estadoCalibracionDht22));
    }

    function persistirTecnica() {
        localStorage.setItem(CLAVE_TECNICA_DHT22, JSON.stringify(estadoTecnicoDht22));
    }

    function formatearFechaVerificacion(isoString) {
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

    function actualizarTextoVerificacion() {
        if (!txtUltimaVerificacion) return;
        txtUltimaVerificacion.textContent = formatearFechaVerificacion(estadoCalibracionDht22.ultimaVerificacionISO);
    }

    function actualizarRangosFisicosPorModelo(modelo) {
        const rangos = RANGOS_POR_MODELO[modelo] || RANGOS_POR_MODELO.DHT22;
        if (inputRangoTemp) inputRangoTemp.value = rangos.temp;
        if (inputRangoHum) inputRangoHum.value = rangos.hum;
    }

    function sincronizarCamposTecnicos() {
        if (!formTecnico) return;
        if (selectModelo) selectModelo.value = estadoTecnicoDht22.modeloSensor;
        if (selectGpio) selectGpio.value = estadoTecnicoDht22.pinGpio;
        if (selectPullUp) selectPullUp.value = estadoTecnicoDht22.resistenciaPullUp;
        if (inputMuestras) inputMuestras.value = String(estadoTecnicoDht22.muestrasPromedio);
        actualizarRangosFisicosPorModelo(estadoTecnicoDht22.modeloSensor);
    }

    function sincronizarFormularioConEstado() {
        actualizarIndicadorVisual(estadoModuloDht22.activo);
        if (selectFrecuencia) selectFrecuencia.value = String(estadoModuloDht22.frecuenciaLecturaSeg);
        if (inputTempMin) inputTempMin.value = estadoModuloDht22.tempMinimaAire.toFixed(1);
        if (inputTempMax) inputTempMax.value = estadoModuloDht22.tempMaximaAire.toFixed(1);
        if (inputHumMin) inputHumMin.value = String(Math.round(estadoModuloDht22.humedadMinima));
        if (inputHumMax) inputHumMax.value = String(Math.round(estadoModuloDht22.humedadMaxima));
        if (inputOffsetTemp) inputOffsetTemp.value = estadoCalibracionDht22.offsetTemperatura.toFixed(1);
        if (inputOffsetHum) inputOffsetHum.value = estadoCalibracionDht22.offsetHumedad.toFixed(1);
        actualizarTextoVerificacion();
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

    function enviarOrdenSensor(activo) {
        estadoModuloDht22.activo = activo;
        persistirEstado();

        const orden = {
            sensor: estadoModuloDht22.sensor,
            modulo: estadoModuloDht22.modulo,
            estado: activo ? "ACTIVO" : "PAUSADO",
            timestamp: estadoModuloDht22.ultimaActualizacion
        };

        document.dispatchEvent(new CustomEvent("temperaturaHumedad:ordenEstado", { detail: orden }));
        console.info("Orden enviada para DHT22:", orden);
        mostrarToast(activo ? "Sensor ambiental DHT22 activado." : "Sensor ambiental DHT22 pausado.");
    }

    function ejecutarAjusteAmbiental(offsetTemp, offsetHum) {
        const ahoraISO = new Date().toISOString();
        estadoCalibracionDht22.ultimaVerificacionISO = ahoraISO;
        estadoCalibracionDht22.offsetTemperatura = Number(offsetTemp.toFixed(1));
        estadoCalibracionDht22.offsetHumedad = Number(offsetHum.toFixed(1));
        persistirCalibracion();
        actualizarTextoVerificacion();

        const tempEtiqueta =
            estadoCalibracionDht22.offsetTemperatura > 0
                ? `+${estadoCalibracionDht22.offsetTemperatura.toFixed(1)}`
                : estadoCalibracionDht22.offsetTemperatura.toFixed(1);
        const humEtiqueta =
            estadoCalibracionDht22.offsetHumedad > 0
                ? `+${estadoCalibracionDht22.offsetHumedad.toFixed(1)}`
                : estadoCalibracionDht22.offsetHumedad.toFixed(1);

        const comando = {
            sensor: estadoTecnicoDht22.modeloSensor,
            accion: "CALIBRAR_OFFSET_AMBIENTAL",
            offsetTemperatura: estadoCalibracionDht22.offsetTemperatura,
            offsetHumedad: estadoCalibracionDht22.offsetHumedad,
            timestamp: ahoraISO
        };

        document.dispatchEvent(new CustomEvent("temperaturaHumedad:calibracionAplicada", { detail: comando }));
        console.info("Ajuste ambiental aplicado (DHT22):", comando);
        mostrarToast(`Ajuste aplicado (${tempEtiqueta} °C, ${humEtiqueta} % HR).`);
    }

    function validarCamposControl() {
        const frecuencia = Number(selectFrecuencia.value);
        const tempMin = Number.parseFloat(inputTempMin.value);
        const tempMax = Number.parseFloat(inputTempMax.value);
        const humMin = Number.parseFloat(inputHumMin.value);
        const humMax = Number.parseFloat(inputHumMax.value);

        if (!FRECUENCIAS_VALIDAS.includes(frecuencia)) {
            return { valido: false, error: "Selecciona una frecuencia de lectura válida." };
        }

        if (!Number.isFinite(tempMin) || tempMin < -40 || tempMin > 80) {
            return {
                valido: false,
                error: "La Temp. Mínima Aire debe estar dentro del rango físico (-40.0 a 80.0 °C)."
            };
        }

        if (!Number.isFinite(tempMax) || tempMax < -40 || tempMax > 80) {
            return {
                valido: false,
                error: "La Temp. Máxima Aire debe estar dentro del rango físico (-40.0 a 80.0 °C)."
            };
        }

        if (tempMin >= tempMax) {
            return {
                valido: false,
                error: "La Temp. Mínima Aire debe ser menor que la Temp. Máxima Aire."
            };
        }

        if (!Number.isFinite(humMin) || humMin < 0 || humMin > 100) {
            return {
                valido: false,
                error: "La Humedad Mínima debe estar entre 0 % y 100 %."
            };
        }

        if (!Number.isFinite(humMax) || humMax < 0 || humMax > 100) {
            return {
                valido: false,
                error: "La Humedad Máxima debe estar entre 0 % y 100 %."
            };
        }

        if (humMin >= humMax) {
            return {
                valido: false,
                error: "La Humedad Mínima debe ser menor que la Humedad Máxima."
            };
        }

        return {
            valido: true,
            datos: {
                frecuenciaLecturaSeg: frecuencia,
                tempMinimaAire: Number(tempMin.toFixed(1)),
                tempMaximaAire: Number(tempMax.toFixed(1)),
                humedadMinima: Math.round(humMin),
                humedadMaxima: Math.round(humMax)
            }
        };
    }

    function validarCamposCalibracion() {
        const offsetTemp = Number.parseFloat(inputOffsetTemp.value);
        const offsetHum = Number.parseFloat(inputOffsetHum.value);

        if (!Number.isFinite(offsetTemp) || offsetTemp < -20 || offsetTemp > 20) {
            return {
                valido: false,
                error: "La Desviación de Temperatura debe estar entre -20.0 °C y +20.0 °C."
            };
        }

        if (!Number.isFinite(offsetHum) || offsetHum < -30 || offsetHum > 30) {
            return {
                valido: false,
                error: "La Desviación de Humedad debe estar entre -30.0 % y +30.0 %."
            };
        }

        return {
            valido: true,
            offsetTemperatura: Number(offsetTemp.toFixed(1)),
            offsetHumedad: Number(offsetHum.toFixed(1))
        };
    }

    function validarCamposTecnicos() {
        const modeloSensor = selectModelo.value;
        const pinGpio = selectGpio.value;
        const resistenciaPullUp = selectPullUp.value;
        const muestrasPromedio = Number.parseInt(inputMuestras.value, 10);

        if (!MODELOS_VALIDOS.includes(modeloSensor)) {
            return { valido: false, error: "Selecciona un modelo de sensor válido." };
        }

        if (!GPIOS_VALIDOS.includes(pinGpio)) {
            return { valido: false, error: "Selecciona un pin digital GPIO válido del ESP32-S3." };
        }

        if (!PULLUPS_VALIDOS.includes(resistenciaPullUp)) {
            return { valido: false, error: "Selecciona una configuración de resistencia Pull-Up válida." };
        }

        if (!Number.isInteger(muestrasPromedio) || muestrasPromedio < 1 || muestrasPromedio > 30) {
            return {
                valido: false,
                error: "Muestras para Promedio (Filtro) debe ser un número entero entre 1 y 30."
            };
        }

        return {
            valido: true,
            datos: {
                modeloSensor,
                pinGpio,
                resistenciaPullUp,
                muestrasPromedio
            }
        };
    }

    function cerrarTodosLosPopovers(exceptoBoton = null) {
        document.querySelectorAll(".btn-ayuda-campo").forEach((boton) => {
            if (boton === exceptoBoton) return;
            const idPanel = boton.getAttribute("aria-controls");
            const panel = idPanel ? document.getElementById(idPanel) : null;
            boton.setAttribute("aria-expanded", "false");
            if (panel) panel.hidden = true;
        });
    }

    // Inicializar estado y UI
    cargarEstadoInicial();
    sincronizarFormularioConEstado();

    // Popovers de ayuda contextual
    document.querySelectorAll(".btn-ayuda-campo").forEach((boton) => {
        boton.addEventListener("click", (event) => {
            event.stopPropagation();
            const idPanel = boton.getAttribute("aria-controls");
            const panel = idPanel ? document.getElementById(idPanel) : null;
            if (!panel) return;

            const abierto = boton.getAttribute("aria-expanded") === "true";
            cerrarTodosLosPopovers(boton);
            boton.setAttribute("aria-expanded", abierto ? "false" : "true");
            panel.hidden = abierto;
        });
    });

    document.addEventListener("click", (event) => {
        if (!event.target.closest(".ayuda-contextual")) {
            cerrarTodosLosPopovers();
        }
    });

    // Evento badge Activo / Pausado (Bloque 1)
    btnEstado.addEventListener("click", () => {
        const accion = estadoModuloDht22.activo ? "pausar" : "activar";
        const cfg = configuracionAcciones[accion];

        abrirModalConfirmacion({
            titulo: cfg.titulo,
            mensaje: cfg.mensaje,
            claseBoton: cfg.claseBoton,
            onAceptar: () => {
                const nuevoEstado = accion === "activar";
                actualizarIndicadorVisual(nuevoEstado);
                enviarOrdenSensor(nuevoEstado);
            }
        });
    });

    // Guardar configuración (Bloque 1)
    formControl.addEventListener("submit", (event) => {
        event.preventDefault();
        limpiarError(errorControl);

        const validacion = validarCamposControl();
        if (!validacion.valido) {
            mostrarError(errorControl, validacion.error);
            return;
        }

        Object.assign(estadoModuloDht22, validacion.datos);
        persistirEstado();

        document.dispatchEvent(
            new CustomEvent("temperaturaHumedad:configuracionGuardada", {
                detail: { ...estadoModuloDht22 }
            })
        );
        console.info("Configuración guardada (Bloque 1 - DHT22):", estadoModuloDht22);
        mostrarToast("Configuración del microclima guardada.");
    });

    // Aplicar ajuste de desviación ambiental (Bloque 2)
    if (btnAplicarAjuste) {
        btnAplicarAjuste.addEventListener("click", () => {
            limpiarError(errorCalibracion);

            const validacion = validarCamposCalibracion();
            if (!validacion.valido) {
                mostrarError(errorCalibracion, validacion.error);
                return;
            }

            const tempTxt =
                validacion.offsetTemperatura > 0
                    ? `+${validacion.offsetTemperatura.toFixed(1)}`
                    : validacion.offsetTemperatura.toFixed(1);
            const humTxt =
                validacion.offsetHumedad > 0
                    ? `+${validacion.offsetHumedad.toFixed(1)}`
                    : validacion.offsetHumedad.toFixed(1);

            abrirModalConfirmacion({
                titulo: "¿Aplicar ajuste de desviación ambiental?",
                mensaje: `Se guardará una corrección de ${tempTxt} °C en temperatura y ${humTxt} % en humedad relativa frente al termohigrómetro patrón, actualizando la fecha de verificación.`,
                claseBoton: "btn-modal-activar",
                onAceptar: () => {
                    ejecutarAjusteAmbiental(validacion.offsetTemperatura, validacion.offsetHumedad);
                }
            });
        });
    }

    // Acordeón técnico (Bloque 3 - inicia colapsado)
    if (btnAcordeonTecnico && bloqueTecnico) {
        btnAcordeonTecnico.addEventListener("click", () => {
            const abierto = bloqueTecnico.classList.toggle("abierto");
            btnAcordeonTecnico.setAttribute("aria-expanded", abierto ? "true" : "false");
        });
    }

    // Actualizar rangos físicos al cambiar de modelo (DHT22 / DHT11)
    if (selectModelo) {
        selectModelo.addEventListener("change", () => {
            actualizarRangosFisicosPorModelo(selectModelo.value);
        });
    }

    // Guardar configuración técnica (Bloque 3)
    if (formTecnico) {
        formTecnico.addEventListener("submit", (event) => {
            event.preventDefault();
            limpiarError(errorTecnico);

            const validacion = validarCamposTecnicos();
            if (!validacion.valido) {
                mostrarError(errorTecnico, validacion.error);
                return;
            }

            estadoTecnicoDht22 = { ...validacion.datos };
            estadoModuloDht22.sensor = estadoTecnicoDht22.modeloSensor;
            persistirTecnica();
            persistirEstado();

            document.dispatchEvent(
                new CustomEvent("temperaturaHumedad:configuracionTecnicaGuardada", {
                    detail: { ...estadoTecnicoDht22 }
                })
            );
            console.info("Configuración técnica guardada (DHT22 / ESP32-S3):", estadoTecnicoDht22);
            mostrarToast("Configuración técnica y conexión guardada.");
        });
    }

    // Restaurar valores de fábrica (Bloque 3)
    if (btnRestaurarFabrica) {
        btnRestaurarFabrica.addEventListener("click", () => {
            abrirModalConfirmacion({
                titulo: "¿Restaurar valores de fábrica?",
                mensaje:
                    "Se restablecerán los parámetros de conexión del ESP32-S3 (DHT22 / AM2302, GPIO 4, resistencia Pull-Up externa de 10 kΩ y 5 muestras para promedio).",
                claseBoton: "btn-modal-pausar",
                onAceptar: () => {
                    limpiarError(errorTecnico);
                    estadoTecnicoDht22 = { ...DEFAULTS_TECNICOS_DHT22 };
                    estadoModuloDht22.sensor = DEFAULTS_TECNICOS_DHT22.modeloSensor;
                    persistirTecnica();
                    persistirEstado();
                    sincronizarCamposTecnicos();
                    mostrarToast("Valores técnicos restaurados de fábrica.");
                }
            });
        });
    }

    // Acciones del modal compartido
    btnCancelar.addEventListener("click", cerrarModalConfirmacion);
    btnAceptar.addEventListener("click", () => {
        const callback = accionConfirmarPendiente;
        cerrarModalConfirmacion();
        if (typeof callback === "function") callback();
    });

    modal.addEventListener("click", (event) => {
        if (event.target === modal) cerrarModalConfirmacion();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        cerrarTodosLosPopovers();
        if (!modal.hidden) cerrarModalConfirmacion();
    });
});

