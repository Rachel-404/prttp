document.addEventListener("DOMContentLoaded", () => {
    const CLAVE_CONFIG_PH = "axion_ph_bloque1";
    const CLAVE_CALIBRACION_PH = "axion_ph_calibracion";
    const CLAVE_TECNICA_PH = "axion_ph_tecnico";

    const FRECUENCIAS_VALIDAS = [5, 10, 30, 60, 300];
    const BUFFERS_SEGUNDO_PUNTO = {
        "4.01": "Sobre Rojo (pH 4.01)",
        "9.18": "Sobre Azul (pH 9.18)"
    };
    const UARTS_VALIDOS = ["UART1", "UART2"];
    const BAUDS_VALIDOS = [4800, 9600, 19200];
    const PARIDADES_VALIDAS = ["None", "Even", "Odd"];
    const STOP_BITS_VALIDOS = [1, 2];

    const DEFAULTS_TECNICOS_PH = {
        uart: "UART1",
        pinRx: 18,
        pinTx: 17,
        pinDeRe: 21,
        slaveId: 1,
        baudRate: 4800,
        paridad: "None",
        stopBits: 1,
        timeoutMs: 1200,
        reintentos: 3,
        registroPh: "0x0000",
        divisorPh: 100,
        registroTemp: "0x0001",
        divisorTemp: 10
    };

    // Estado centralizado del Bloque 1: Alertas y Control del Cultivo (SEN0708)
    const estadoModuloPh = {
        sensor: "SEN0708",
        modulo: "pH",
        activo: true,
        frecuenciaLecturaSeg: 10,
        phMinimo: 5.5,
        phMaximo: 6.5,
        tempMaximaAgua: 24.0,
        compensacionTermica: true,
        ultimaActualizacion: null
    };

    // Estado centralizado del Bloque 2: Calibración del pH (SEN0708)
    const estadoCalibracionPh = {
        sensor: "SEN0708",
        ultimaCalibracionISO: null,
        puntoNeutroCalibrado: false,
        segundoPuntoValor: null,
        segundoPuntoEtiqueta: null
    };

    // Estado centralizado del Bloque 3: Configuración Técnica y Conexión
    let estadoTecnicoPh = { ...DEFAULTS_TECNICOS_PH };

    // Referencias DOM - Bloque 1
    const btnEstado = document.getElementById("btn-estado");
    const txtEstado = document.getElementById("estado");
    const formControl = document.getElementById("form-control-cultivo");
    const selectFrecuencia = document.getElementById("frecuencia-lectura");
    const inputPhMinimo = document.getElementById("ph-minimo");
    const inputPhMaximo = document.getElementById("ph-maximo");
    const inputTempMaxima = document.getElementById("temp-maxima");
    const btnCompensacion = document.getElementById("btn-compensacion");
    const txtCompensacion = document.getElementById("texto-compensacion");
    const errorFormulario = document.getElementById("error-control-cultivo");

    // Referencias DOM - Bloque 2 (Calibración)
    const txtUltimaCalibracion = document.getElementById("ultima-calibracion");
    const btnCalibrarNeutro = document.getElementById("btn-calibrar-neutro");
    const selectBufferSegundo = document.getElementById("select-buffer-segundo");
    const btnCalibrarSegundo = document.getElementById("btn-calibrar-segundo");

    // Referencias DOM - Bloque 3 (Configuración Técnica y Conexión)
    const bloqueTecnico = document.getElementById("bloque-tecnico");
    const btnAcordeonTecnico = document.getElementById("btn-acordeon-tecnico");
    const formTecnico = document.getElementById("form-tecnico-ph");
    const selectUart = document.getElementById("tec-uart");
    const inputPinRx = document.getElementById("tec-pin-rx");
    const inputPinTx = document.getElementById("tec-pin-tx");
    const inputPinDeRe = document.getElementById("tec-pin-dere");
    const inputSlaveId = document.getElementById("tec-slave-id");
    const selectBaudRate = document.getElementById("tec-baud-rate");
    const selectParidad = document.getElementById("tec-paridad");
    const selectStopBits = document.getElementById("tec-stop-bits");
    const inputTimeout = document.getElementById("tec-timeout");
    const inputReintentos = document.getElementById("tec-reintentos");
    const inputRegPh = document.getElementById("tec-reg-ph");
    const inputDivPh = document.getElementById("tec-div-ph");
    const inputRegTemp = document.getElementById("tec-reg-temp");
    const inputDivTemp = document.getElementById("tec-div-temp");
    const errorTecnico = document.getElementById("error-tecnico-ph");
    const btnRestaurarFabrica = document.getElementById("btn-restaurar-fabrica");

    // Referencias DOM - Modal compartido y Toast
    const modal = document.getElementById("modal-confirmacion-ph");
    const modalTitulo = document.getElementById("modal-ph-titulo");
    const modalMensaje = document.getElementById("modal-ph-mensaje");
    const btnCancelar = document.getElementById("btn-modal-cancelar");
    const btnAceptar = document.getElementById("btn-modal-aceptar");
    const toastPh = document.getElementById("toast-ph");

    if (!btnEstado || !txtEstado || !modal || !formControl) return;

    let accionConfirmarPendiente = null;
    let toastTimer = null;

    const configuracionAcciones = {
        pausar: {
            titulo: "¿Pausar monitoreo de pH?",
            mensaje:
                "Vas a desactivar temporalmente el sensor de pH. Durante este tiempo se suspenderán las alertas automáticas de acidez/alcalinidad y el sistema dejará de registrar datos en el historial. Utiliza esta opción solo si vas a realizar limpieza, calibración o mantenimiento.",
            claseBoton: "btn-modal-pausar"
        },
        activar: {
            titulo: "¿Reactivar sensor de pH?",
            mensaje:
                "El sensor volverá a conectarse al bus RS485. El sistema reanudará la lectura automática de pH y temperatura, y volverá a evaluar los límites de alerta para tus lechugas. Asegúrate de que el electrodo esté correctamente sumergido.",
            claseBoton: "btn-modal-activar"
        }
    };

    function cargarEstadoInicial() {
        try {
            const guardado = localStorage.getItem(CLAVE_CONFIG_PH);
            if (guardado) {
                const datos = JSON.parse(guardado);
                if (typeof datos.activo === "boolean") estadoModuloPh.activo = datos.activo;
                if (FRECUENCIAS_VALIDAS.includes(Number(datos.frecuenciaLecturaSeg))) {
                    estadoModuloPh.frecuenciaLecturaSeg = Number(datos.frecuenciaLecturaSeg);
                }
                if (Number.isFinite(Number(datos.phMinimo))) estadoModuloPh.phMinimo = Number(datos.phMinimo);
                if (Number.isFinite(Number(datos.phMaximo))) estadoModuloPh.phMaximo = Number(datos.phMaximo);
                if (Number.isFinite(Number(datos.tempMaximaAgua))) {
                    estadoModuloPh.tempMaximaAgua = Number(datos.tempMaximaAgua);
                }
                if (typeof datos.compensacionTermica === "boolean") {
                    estadoModuloPh.compensacionTermica = datos.compensacionTermica;
                }
                estadoModuloPh.ultimaActualizacion = datos.ultimaActualizacion || null;
            }

            const calGuardada = localStorage.getItem(CLAVE_CALIBRACION_PH);
            if (calGuardada) {
                const cal = JSON.parse(calGuardada);
                if (cal.ultimaCalibracionISO) estadoCalibracionPh.ultimaCalibracionISO = cal.ultimaCalibracionISO;
                if (typeof cal.puntoNeutroCalibrado === "boolean") {
                    estadoCalibracionPh.puntoNeutroCalibrado = cal.puntoNeutroCalibrado;
                }
                if (cal.segundoPuntoValor) estadoCalibracionPh.segundoPuntoValor = cal.segundoPuntoValor;
                if (cal.segundoPuntoEtiqueta) estadoCalibracionPh.segundoPuntoEtiqueta = cal.segundoPuntoEtiqueta;
            }

            const tecGuardada = localStorage.getItem(CLAVE_TECNICA_PH);
            if (tecGuardada) {
                const tec = JSON.parse(tecGuardada);
                estadoTecnicoPh = { ...DEFAULTS_TECNICOS_PH, ...tec };
            }
        } catch (err) {
            console.warn("No se pudo restaurar la configuración de pH:", err);
        }
    }

    function persistirEstado() {
        estadoModuloPh.ultimaActualizacion = new Date().toISOString();
        localStorage.setItem(CLAVE_CONFIG_PH, JSON.stringify(estadoModuloPh));
    }

    function persistirCalibracion() {
        localStorage.setItem(CLAVE_CALIBRACION_PH, JSON.stringify(estadoCalibracionPh));
    }

    function persistirTecnica() {
        localStorage.setItem(CLAVE_TECNICA_PH, JSON.stringify(estadoTecnicoPh));
    }

    function formatearFechaCalibracion(isoString) {
        if (!isoString) return "Hace 12 días";
        const fecha = new Date(isoString);
        if (Number.isNaN(fecha.getTime())) return "Hace 12 días";

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
        txtUltimaCalibracion.textContent = formatearFechaCalibracion(estadoCalibracionPh.ultimaCalibracionISO);
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
        if (selectUart) selectUart.value = estadoTecnicoPh.uart;
        if (inputPinRx) inputPinRx.value = String(estadoTecnicoPh.pinRx);
        if (inputPinTx) inputPinTx.value = String(estadoTecnicoPh.pinTx);
        if (inputPinDeRe) inputPinDeRe.value = String(estadoTecnicoPh.pinDeRe);
        if (inputSlaveId) inputSlaveId.value = String(estadoTecnicoPh.slaveId);
        if (selectBaudRate) selectBaudRate.value = String(estadoTecnicoPh.baudRate);
        if (selectParidad) selectParidad.value = estadoTecnicoPh.paridad;
        if (selectStopBits) selectStopBits.value = String(estadoTecnicoPh.stopBits);
        if (inputTimeout) inputTimeout.value = String(estadoTecnicoPh.timeoutMs);
        if (inputReintentos) inputReintentos.value = String(estadoTecnicoPh.reintentos);
        if (inputRegPh) inputRegPh.value = estadoTecnicoPh.registroPh;
        if (inputDivPh) inputDivPh.value = String(estadoTecnicoPh.divisorPh);
        if (inputRegTemp) inputRegTemp.value = estadoTecnicoPh.registroTemp;
        if (inputDivTemp) inputDivTemp.value = String(estadoTecnicoPh.divisorTemp);
    }

    function sincronizarFormularioConEstado() {
        actualizarIndicadorVisual(estadoModuloPh.activo);
        if (selectFrecuencia) selectFrecuencia.value = String(estadoModuloPh.frecuenciaLecturaSeg);
        if (inputPhMinimo) inputPhMinimo.value = estadoModuloPh.phMinimo.toFixed(2);
        if (inputPhMaximo) inputPhMaximo.value = estadoModuloPh.phMaximo.toFixed(2);
        if (inputTempMaxima) inputTempMaxima.value = estadoModuloPh.tempMaximaAgua.toFixed(1);
        actualizarBotonCompensacion(estadoModuloPh.compensacionTermica);
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

    function enviarOrdenSensor(activo) {
        estadoModuloPh.activo = activo;
        persistirEstado();

        const orden = {
            sensor: estadoModuloPh.sensor,
            modulo: estadoModuloPh.modulo,
            estado: activo ? "ACTIVO" : "PAUSADO",
            timestamp: estadoModuloPh.ultimaActualizacion
        };

        document.dispatchEvent(new CustomEvent("ph:ordenEstado", { detail: orden }));
        console.info("Orden enviada para sensor SEN0708:", orden);

        mostrarToast(activo ? "Sensor SEN0708 activado." : "Sensor SEN0708 pausado.");
    }

    function ejecutarCalibracion(paso, valorBuffer, etiquetaBuffer) {
        const ahoraISO = new Date().toISOString();
        estadoCalibracionPh.ultimaCalibracionISO = ahoraISO;

        if (paso === "PUNTO_NEUTRO") {
            estadoCalibracionPh.puntoNeutroCalibrado = true;
        } else {
            estadoCalibracionPh.segundoPuntoValor = valorBuffer;
            estadoCalibracionPh.segundoPuntoEtiqueta = etiquetaBuffer;
        }

        persistirCalibracion();
        actualizarTextoCalibracion();

        const comando = {
            sensor: "SEN0708",
            accion: "CALIBRAR",
            paso,
            bufferPh: Number(valorBuffer),
            etiqueta: etiquetaBuffer,
            timestamp: ahoraISO
        };

        document.dispatchEvent(new CustomEvent("ph:calibracionEjecutada", { detail: comando }));
        console.info("Comando de calibración enviado (SEN0708):", comando);
        mostrarToast(`Calibración completada: ${etiquetaBuffer}.`);
    }

    function validarCamposControl() {
        const frecuencia = Number(selectFrecuencia.value);
        const phMin = Number.parseFloat(inputPhMinimo.value);
        const phMax = Number.parseFloat(inputPhMaximo.value);
        const tempMax = Number.parseFloat(inputTempMaxima.value);

        if (!FRECUENCIAS_VALIDAS.includes(frecuencia)) {
            return { valido: false, error: "Selecciona una frecuencia de lectura válida." };
        }

        if (!Number.isFinite(phMin) || phMin < 0 || phMin > 14) {
            return { valido: false, error: "El pH Mínimo (Ácido) debe estar entre 0.00 y 14.00." };
        }

        if (!Number.isFinite(phMax) || phMax < 0 || phMax > 14) {
            return { valido: false, error: "El pH Máximo (Alcalino) debe estar entre 0.00 y 14.00." };
        }

        if (phMin >= phMax) {
            return { valido: false, error: "El pH Mínimo debe ser menor que el pH Máximo." };
        }

        if (!Number.isFinite(tempMax) || tempMax <= 0 || tempMax > 50) {
            return { valido: false, error: "La Temp. Máxima Agua (°C) debe estar entre 0.1 y 50.0 °C." };
        }

        return {
            valido: true,
            datos: {
                frecuenciaLecturaSeg: frecuencia,
                phMinimo: Number(phMin.toFixed(2)),
                phMaximo: Number(phMax.toFixed(2)),
                tempMaximaAgua: Number(tempMax.toFixed(1))
            }
        };
    }

    function normalizarRegistroHex(valor) {
        const limpio = (valor || "").trim();
        if (!/^0[xX][0-9a-fA-F]{1,4}$/.test(limpio)) return null;
        return "0x" + limpio.slice(2).toUpperCase().padStart(4, "0");
    }

    function validarCamposTecnicos() {
        const uart = selectUart.value;
        const pinRx = Number(inputPinRx.value);
        const pinTx = Number(inputPinTx.value);
        const pinDeRe = Number(inputPinDeRe.value);
        const slaveId = Number(inputSlaveId.value);
        const baudRate = Number(selectBaudRate.value);
        const paridad = selectParidad.value;
        const stopBits = Number(selectStopBits.value);
        const timeoutMs = Number(inputTimeout.value);
        const reintentos = Number(inputReintentos.value);
        const registroPh = normalizarRegistroHex(inputRegPh.value);
        const divisorPh = Number(inputDivPh.value);
        const registroTemp = normalizarRegistroHex(inputRegTemp.value);
        const divisorTemp = Number(inputDivTemp.value);

        if (!UARTS_VALIDOS.includes(uart)) {
            return { valido: false, error: "Selecciona un puerto serial (UART1 o UART2) válido." };
        }

        const pines = [pinRx, pinTx, pinDeRe];
        if (pines.some((p) => !Number.isInteger(p) || p < 0 || p > 48)) {
            return { valido: false, error: "Los pines GPIO del ESP32-S3 deben ser enteros entre 0 y 48." };
        }

        if (new Set(pines).size !== pines.length) {
            return { valido: false, error: "Los pines RX, TX y DE/RE no pueden compartir el mismo GPIO." };
        }

        if (!Number.isInteger(slaveId) || slaveId < 1 || slaveId > 247) {
            return { valido: false, error: "El Slave ID Modbus-RTU debe estar entre 1 y 247." };
        }

        if (!BAUDS_VALIDOS.includes(baudRate)) {
            return { valido: false, error: "Selecciona un Baud Rate válido (4800, 9600 o 19200)." };
        }

        if (!PARIDADES_VALIDAS.includes(paridad)) {
            return { valido: false, error: "Selecciona una paridad válida (None, Even u Odd)." };
        }

        if (!STOP_BITS_VALIDOS.includes(stopBits)) {
            return { valido: false, error: "Selecciona un valor válido de Stop Bits (1 o 2)." };
        }

        if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 10000) {
            return {
                valido: false,
                error: "El Timeout de Respuesta debe ser al menos 1000 ms (hasta 10000 ms) para evitar lecturas cortadas."
            };
        }

        if (!Number.isInteger(reintentos) || reintentos < 0 || reintentos > 10) {
            return { valido: false, error: "Los reintentos ante fallo deben ser un entero entre 0 y 10." };
        }

        if (!registroPh || !registroTemp) {
            return {
                valido: false,
                error: "Los registros Modbus deben estar en formato hexadecimal válido (ej. 0x0000 y 0x0001)."
            };
        }

        if (registroPh === registroTemp) {
            return {
                valido: false,
                error: "El registro de lectura pH y el de temperatura no pueden apuntar a la misma dirección."
            };
        }

        if (!Number.isInteger(divisorPh) || divisorPh < 1 || !Number.isInteger(divisorTemp) || divisorTemp < 1) {
            return { valido: false, error: "Los factores divisores deben ser enteros mayores o iguales a 1." };
        }

        return {
            valido: true,
            datos: {
                uart,
                pinRx,
                pinTx,
                pinDeRe,
                slaveId,
                baudRate,
                paridad,
                stopBits,
                timeoutMs,
                reintentos,
                registroPh,
                divisorPh,
                registroTemp,
                divisorTemp
            }
        };
    }

    function restaurarValoresFabrica() {
        estadoTecnicoPh = { ...DEFAULTS_TECNICOS_PH };
        persistirTecnica();
        sincronizarCamposTecnicos();
        limpiarError(errorTecnico);

        document.dispatchEvent(
            new CustomEvent("ph:configTecnicaRestaurada", { detail: { ...estadoTecnicoPh } })
        );
        console.info("Configuración técnica restaurada a valores de fábrica:", estadoTecnicoPh);
        mostrarToast("Valores técnicos de fábrica restaurados.");
    }

    // 1. Control de Estado del Sensor (Modal obligatorio antes de cambiar)
    btnEstado.addEventListener("click", () => {
        const nuevoEstado = !estadoModuloPh.activo;
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

    // Bloque 2 - Paso 1: Calibrar Punto Neutro (pH 6.86)
    if (btnCalibrarNeutro) {
        btnCalibrarNeutro.addEventListener("click", () => {
            abrirModalConfirmacion({
                titulo: "Calibrar Punto Neutro",
                mensaje:
                    "¿Confirmas que el sensor está sumergido en el líquido neutro (pH 6.86) y deseas guardar este punto de calibración?",
                claseBoton: "btn-modal-activar",
                onAceptar: () => {
                    ejecutarCalibracion("PUNTO_NEUTRO", "6.86", "Líquido Neutro (pH 6.86)");
                }
            });
        });
    }

    // Bloque 2 - Paso 2: Calibrar Segundo Punto (pH 4.01 o pH 9.18)
    if (btnCalibrarSegundo && selectBufferSegundo) {
        btnCalibrarSegundo.addEventListener("click", () => {
            const valorSeleccionado = selectBufferSegundo.value;
            const etiquetaBuffer = BUFFERS_SEGUNDO_PUNTO[valorSeleccionado];

            if (!etiquetaBuffer) {
                mostrarToast("Selecciona una solución buffer válida para el segundo punto.");
                return;
            }

            abrirModalConfirmacion({
                titulo: "Calibrar Segundo Punto",
                mensaje: `¿Confirmas la calibración del segundo punto usando el ${etiquetaBuffer}?`,
                claseBoton: "btn-modal-activar",
                onAceptar: () => {
                    ejecutarCalibracion("SEGUNDO_PUNTO", valorSeleccionado, etiquetaBuffer);
                }
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

    // Bloque 3 - Guardado de parámetros técnicos con validación
    if (formTecnico) {
        formTecnico.addEventListener("submit", (e) => {
            e.preventDefault();
            limpiarError(errorTecnico);

            const resultado = validarCamposTecnicos();
            if (!resultado.valido) {
                mostrarError(errorTecnico, resultado.error);
                return;
            }

            estadoTecnicoPh = { ...resultado.datos };
            persistirTecnica();
            sincronizarCamposTecnicos();

            document.dispatchEvent(
                new CustomEvent("ph:configTecnicaGuardada", { detail: { ...estadoTecnicoPh } })
            );
            console.info("Configuración técnica guardada (SEN0708):", estadoTecnicoPh);
            mostrarToast("Configuración técnica y Modbus-RTU guardada.");
        });

        [
            selectUart,
            inputPinRx,
            inputPinTx,
            inputPinDeRe,
            inputSlaveId,
            selectBaudRate,
            selectParidad,
            selectStopBits,
            inputTimeout,
            inputReintentos,
            inputRegPh,
            inputDivPh,
            inputRegTemp,
            inputDivTemp
        ].forEach((campo) => {
            if (campo) campo.addEventListener("input", () => limpiarError(errorTecnico));
        });
    }

    // Bloque 3 - Restaurar valores de fábrica (con modal de confirmación)
    if (btnRestaurarFabrica) {
        btnRestaurarFabrica.addEventListener("click", () => {
            abrirModalConfirmacion({
                titulo: "¿Restaurar valores de fábrica?",
                mensaje:
                    "Se restablecerán todos los parámetros de conexión física (UART1, GPIO 18/17/21), Modbus-RTU (Slave ID 1, 4800 baud) y registros (0x0000 / 0x0001) a sus valores por defecto.",
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

    // Compensación Térmica Automática
    if (btnCompensacion) {
        btnCompensacion.addEventListener("click", () => {
            const nuevaCompensacion = !btnCompensacion.classList.contains("activo");
            actualizarBotonCompensacion(nuevaCompensacion);
        });
    }

    // Limpiar error al modificar cualquier campo del Bloque 1
    [selectFrecuencia, inputPhMinimo, inputPhMaximo, inputTempMaxima].forEach((campo) => {
        if (campo) campo.addEventListener("input", () => limpiarError(errorFormulario));
    });

    // Guardado de toda la configuración del Bloque 1
    formControl.addEventListener("submit", (e) => {
        e.preventDefault();
        limpiarError(errorFormulario);

        const resultado = validarCamposControl();
        if (!resultado.valido) {
            mostrarError(errorFormulario, resultado.error);
            return;
        }

        estadoModuloPh.frecuenciaLecturaSeg = resultado.datos.frecuenciaLecturaSeg;
        estadoModuloPh.phMinimo = resultado.datos.phMinimo;
        estadoModuloPh.phMaximo = resultado.datos.phMaximo;
        estadoModuloPh.tempMaximaAgua = resultado.datos.tempMaximaAgua;
        estadoModuloPh.compensacionTermica = btnCompensacion
            ? btnCompensacion.classList.contains("activo")
            : true;

        persistirEstado();
        sincronizarFormularioConEstado();

        document.dispatchEvent(
            new CustomEvent("ph:configuracionGuardada", { detail: { ...estadoModuloPh } })
        );
        console.info("Configuración Bloque 1 (SEN0708) guardada:", estadoModuloPh);
        mostrarToast("Configuración de alertas y control guardada.");
    });

    // Inicialización al cargar
    cargarEstadoInicial();
    sincronizarFormularioConEstado();
});
