document.addEventListener("DOMContentLoaded", () => {
    const CLAVE_CONFIG_LECHUGA = "axion_temp_lechuga_bloque1";
    const CLAVE_CALIBRACION_LECHUGA = "axion_temp_lechuga_calibracion";
    const CLAVE_TECNICA_LECHUGA = "axion_temp_lechuga_tecnico";

    const FRECUENCIAS_VALIDAS = [5, 10, 30, 60, 300];
    const BUSES_VALIDOS = ["I2C0", "I2C1"];
    const FRECUENCIAS_I2C_VALIDAS = ["100", "400"];
    const FOV_VALIDOS = ["90", "35", "10"];
    const FILTROS_IIR_VALIDOS = ["off", "medio_50", "fuerte_80"];

    const DEFAULTS_TECNICOS_LECHUGA = {
        busI2c: "I2C0",
        direccionI2c: "0x5A",
        pinSda: "GPIO 8",
        pinScl: "GPIO 9",
        frecuenciaI2c: "100",
        varianteFov: "90",
        distanciaDoselCm: 15,
        filtroIir: "medio_50"
    };

    // Estado centralizado del Bloque 1: Alertas y Control del Cultivo (MLX90614 / GY-906)
    const estadoModuloLechuga = {
        sensor: "MLX90614 / GY-906",
        modulo: "Temperatura Foliar de la Lechuga",
        activo: true,
        frecuenciaLecturaSeg: 10,
        tempMinimaHoja: 15.0,
        tempMaximaHoja: 25.0,
        deltaTMaxHoja: 3.0,
        compararAmbienteInterno: true,
        ultimaActualizacion: null
    };

    // Estado centralizado del Bloque 2: Calibración Óptica y Emisividad
    const estadoCalibracionLechuga = {
        sensor: "MLX90614 / GY-906",
        ultimaVerificacionISO: null,
        emisividadHoja: 0.98,
        offsetCelsius: 0.0
    };

    // Estado centralizado del Bloque 3: Configuración Técnica y Conexión
    let estadoTecnicoLechuga = { ...DEFAULTS_TECNICOS_LECHUGA };

    // Referencias DOM - Bloque 1
    const btnEstado = document.getElementById("btn-estado-lechuga");
    const txtEstado = document.getElementById("estado-lechuga");
    const formControl = document.getElementById("form-control-lechuga");
    const selectFrecuencia = document.getElementById("frecuencia-lectura-lechuga");
    const inputTempMinHoja = document.getElementById("temp-min-hoja");
    const inputTempMaxHoja = document.getElementById("temp-max-hoja");
    const inputDeltaTMax = document.getElementById("delta-t-max-hoja");
    const btnCompararAmbiente = document.getElementById("btn-comparar-ambiente");
    const txtCompararAmbiente = document.getElementById("texto-comparar-ambiente");
    const errorControl = document.getElementById("error-control-lechuga");

    // Referencias DOM - Bloque 2
    const txtUltimaVerificacion = document.getElementById("ultima-verificacion-lechuga");
    const inputEmisividad = document.getElementById("emisividad-hoja");
    const inputOffset = document.getElementById("offset-temp-lechuga");
    const btnAplicarAjuste = document.getElementById("btn-aplicar-ajuste-lechuga");
    const errorCalibracion = document.getElementById("error-calibracion-lechuga");

    // Referencias DOM - Bloque 3
    const bloqueTecnico = document.getElementById("bloque-tecnico-lechuga");
    const btnAcordeonTecnico = document.getElementById("btn-acordeon-tecnico-lechuga");
    const formTecnico = document.getElementById("form-tecnico-lechuga");
    const selectBusI2c = document.getElementById("tec-lechuga-bus");
    const inputDireccionI2c = document.getElementById("tec-lechuga-direccion");
    const inputPinSda = document.getElementById("tec-lechuga-sda");
    const inputPinScl = document.getElementById("tec-lechuga-scl");
    const selectFrecuenciaI2c = document.getElementById("tec-lechuga-frecuencia-i2c");
    const selectFov = document.getElementById("tec-lechuga-fov");
    const inputDistanciaDosel = document.getElementById("tec-lechuga-distancia");
    const selectFiltroIir = document.getElementById("tec-lechuga-iir");
    const txtDiametroArea = document.getElementById("diametro-area-medida");
    const txtDetalleAreaFov = document.getElementById("detalle-area-fov");
    const errorTecnico = document.getElementById("error-tecnico-lechuga");
    const btnRestaurarFabrica = document.getElementById("btn-restaurar-fabrica-lechuga");

    // Referencias DOM - Modal compartido y Toast
    const modal = document.getElementById("modal-confirmacion-lechuga");
    const modalTitulo = document.getElementById("modal-lechuga-titulo");
    const modalMensaje = document.getElementById("modal-lechuga-mensaje");
    const btnCancelar = document.getElementById("btn-modal-cancelar-lechuga");
    const btnAceptar = document.getElementById("btn-modal-aceptar-lechuga");
    const toastLechuga = document.getElementById("toast-lechuga");

    if (!btnEstado || !txtEstado || !modal || !formControl) return;

    let accionConfirmarPendiente = null;
    let toastTimer = null;

    const configuracionAcciones = {
        pausar: {
            titulo: "¿Pausar monitoreo foliar?",
            mensaje:
                "Vas a desactivar temporalmente el sensor infrarrojo MLX90614. Durante este tiempo se detendrán las alertas de estrés térmico en las hojas y el registro histórico.",
            claseBoton: "btn-modal-pausar"
        },
        activar: {
            titulo: "¿Reactivar sensor infrarrojo MLX90614?",
            mensaje:
                "El sistema reanudará el monitoreo infrarrojo de temperatura foliar, reactivará las alertas de estrés térmico/tipburn y continuará el registro histórico.",
            claseBoton: "btn-modal-activar"
        }
    };

    function calcularDiametroAreaCm(fovGrados, distanciaCm) {
        const anguloRad = (Number(fovGrados) * Math.PI) / 180;
        if (!Number.isFinite(anguloRad) || !Number.isFinite(distanciaCm) || distanciaCm <= 0) {
            return null;
        }
        return 2 * distanciaCm * Math.tan(anguloRad / 2);
    }

    function actualizarResumenAreaFov() {
        if (!txtDiametroArea || !txtDetalleAreaFov || !selectFov || !inputDistanciaDosel) return;
        const fov = Number(selectFov.value);
        const distancia = Number.parseFloat(inputDistanciaDosel.value);
        const diametro = calcularDiametroAreaCm(fov, distancia);

        if (!Number.isFinite(diametro)) {
            txtDiametroArea.textContent = "—";
            txtDetalleAreaFov.textContent = "(ingresa una distancia válida mayor a 0 cm)";
            return;
        }

        txtDiametroArea.textContent = `${diametro.toFixed(1)} cm`;
        txtDetalleAreaFov.textContent = `(con FOV ${fov}° a ${Number(distancia.toFixed(1))} cm de distancia)`;
    }

    function cargarEstadoInicial() {
        try {
            const cfgGuardada = localStorage.getItem(CLAVE_CONFIG_LECHUGA);
            if (cfgGuardada) {
                const datos = JSON.parse(cfgGuardada);
                if (typeof datos.activo === "boolean") estadoModuloLechuga.activo = datos.activo;
                if (FRECUENCIAS_VALIDAS.includes(Number(datos.frecuenciaLecturaSeg))) {
                    estadoModuloLechuga.frecuenciaLecturaSeg = Number(datos.frecuenciaLecturaSeg);
                }
                if (Number.isFinite(Number(datos.tempMinimaHoja))) {
                    estadoModuloLechuga.tempMinimaHoja = Number(datos.tempMinimaHoja);
                }
                if (Number.isFinite(Number(datos.tempMaximaHoja))) {
                    estadoModuloLechuga.tempMaximaHoja = Number(datos.tempMaximaHoja);
                }
                if (Number.isFinite(Number(datos.deltaTMaxHoja))) {
                    estadoModuloLechuga.deltaTMaxHoja = Number(datos.deltaTMaxHoja);
                }
                if (typeof datos.compararAmbienteInterno === "boolean") {
                    estadoModuloLechuga.compararAmbienteInterno = datos.compararAmbienteInterno;
                }
                estadoModuloLechuga.ultimaActualizacion = datos.ultimaActualizacion || null;
            }

            const calGuardada = localStorage.getItem(CLAVE_CALIBRACION_LECHUGA);
            if (calGuardada) {
                const cal = JSON.parse(calGuardada);
                if (cal.ultimaVerificacionISO) estadoCalibracionLechuga.ultimaVerificacionISO = cal.ultimaVerificacionISO;
                if (Number.isFinite(Number(cal.emisividadHoja))) {
                    estadoCalibracionLechuga.emisividadHoja = Number(cal.emisividadHoja);
                }
                if (Number.isFinite(Number(cal.offsetCelsius))) {
                    estadoCalibracionLechuga.offsetCelsius = Number(cal.offsetCelsius);
                }
            }

            const tecGuardada = localStorage.getItem(CLAVE_TECNICA_LECHUGA);
            if (tecGuardada) {
                const tec = JSON.parse(tecGuardada);
                estadoTecnicoLechuga = { ...DEFAULTS_TECNICOS_LECHUGA, ...tec };
            }
        } catch (err) {
            console.warn("No se pudo restaurar la configuración de Temperatura Foliar:", err);
        }
    }

    function persistirEstado() {
        estadoModuloLechuga.ultimaActualizacion = new Date().toISOString();
        localStorage.setItem(CLAVE_CONFIG_LECHUGA, JSON.stringify(estadoModuloLechuga));
    }

    function persistirCalibracion() {
        localStorage.setItem(CLAVE_CALIBRACION_LECHUGA, JSON.stringify(estadoCalibracionLechuga));
    }

    function persistirTecnica() {
        localStorage.setItem(CLAVE_TECNICA_LECHUGA, JSON.stringify(estadoTecnicoLechuga));
    }

    function formatearFechaVerificacion(isoString) {
        if (!isoString) return "Hace 10 días";
        const fecha = new Date(isoString);
        if (Number.isNaN(fecha.getTime())) return "Hace 10 días";

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

    function actualizarBotonMicroclima(activada) {
        if (!btnCompararAmbiente || !txtCompararAmbiente) return;
        btnCompararAmbiente.classList.toggle("activo", activada);
        btnCompararAmbiente.classList.toggle("inactivo", !activada);
        btnCompararAmbiente.setAttribute("aria-pressed", activada ? "true" : "false");
        txtCompararAmbiente.textContent = activada ? "Activada" : "Desactivada";
    }

    function actualizarTextoVerificacion() {
        if (!txtUltimaVerificacion) return;
        txtUltimaVerificacion.textContent = formatearFechaVerificacion(estadoCalibracionLechuga.ultimaVerificacionISO);
    }

    function sincronizarCamposTecnicos() {
        if (!formTecnico) return;
        if (selectBusI2c) selectBusI2c.value = estadoTecnicoLechuga.busI2c;
        if (inputDireccionI2c) inputDireccionI2c.value = estadoTecnicoLechuga.direccionI2c;
        if (inputPinSda) inputPinSda.value = estadoTecnicoLechuga.pinSda;
        if (inputPinScl) inputPinScl.value = estadoTecnicoLechuga.pinScl;
        if (selectFrecuenciaI2c) selectFrecuenciaI2c.value = String(estadoTecnicoLechuga.frecuenciaI2c);
        if (selectFov) selectFov.value = String(estadoTecnicoLechuga.varianteFov);
        if (inputDistanciaDosel) inputDistanciaDosel.value = String(estadoTecnicoLechuga.distanciaDoselCm);
        if (selectFiltroIir) selectFiltroIir.value = estadoTecnicoLechuga.filtroIir;
        actualizarResumenAreaFov();
    }

    function sincronizarFormularioConEstado() {
        actualizarIndicadorVisual(estadoModuloLechuga.activo);
        if (selectFrecuencia) selectFrecuencia.value = String(estadoModuloLechuga.frecuenciaLecturaSeg);
        if (inputTempMinHoja) inputTempMinHoja.value = estadoModuloLechuga.tempMinimaHoja.toFixed(1);
        if (inputTempMaxHoja) inputTempMaxHoja.value = estadoModuloLechuga.tempMaximaHoja.toFixed(1);
        if (inputDeltaTMax) inputDeltaTMax.value = estadoModuloLechuga.deltaTMaxHoja.toFixed(1);
        actualizarBotonMicroclima(estadoModuloLechuga.compararAmbienteInterno);
        if (inputEmisividad) inputEmisividad.value = estadoCalibracionLechuga.emisividadHoja.toFixed(2);
        if (inputOffset) inputOffset.value = estadoCalibracionLechuga.offsetCelsius.toFixed(1);
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
        if (!toastLechuga) return;
        toastLechuga.textContent = texto;
        toastLechuga.hidden = false;
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toastLechuga.hidden = true;
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
        estadoModuloLechuga.activo = activo;
        persistirEstado();

        const orden = {
            sensor: estadoModuloLechuga.sensor,
            modulo: estadoModuloLechuga.modulo,
            estado: activo ? "ACTIVO" : "PAUSADO",
            compararAmbienteInterno: estadoModuloLechuga.compararAmbienteInterno,
            timestamp: estadoModuloLechuga.ultimaActualizacion
        };

        document.dispatchEvent(new CustomEvent("temperaturaLechuga:ordenEstado", { detail: orden }));
        console.info("Orden enviada para MLX90614 / GY-906:", orden);
        mostrarToast(activo ? "Sensor foliar MLX90614 activado." : "Sensor foliar MLX90614 pausado.");
    }

    function ejecutarAjusteOptico(emisividad, offset) {
        const ahoraISO = new Date().toISOString();
        estadoCalibracionLechuga.ultimaVerificacionISO = ahoraISO;
        estadoCalibracionLechuga.emisividadHoja = Number(emisividad.toFixed(2));
        estadoCalibracionLechuga.offsetCelsius = Number(offset.toFixed(1));
        persistirCalibracion();
        actualizarTextoVerificacion();

        const offsetEtiqueta =
            estadoCalibracionLechuga.offsetCelsius > 0
                ? `+${estadoCalibracionLechuga.offsetCelsius.toFixed(1)}`
                : estadoCalibracionLechuga.offsetCelsius.toFixed(1);

        const comando = {
            sensor: "MLX90614 / GY-906",
            accion: "CALIBRAR_EMISIVIDAD_OFFSET",
            emisividadHoja: estadoCalibracionLechuga.emisividadHoja,
            offsetCelsius: estadoCalibracionLechuga.offsetCelsius,
            timestamp: ahoraISO
        };

        document.dispatchEvent(new CustomEvent("temperaturaLechuga:calibracionAplicada", { detail: comando }));
        console.info("Calibración óptica aplicada (MLX90614):", comando);
        mostrarToast(`Ajuste aplicado (ε ${estadoCalibracionLechuga.emisividadHoja.toFixed(2)}, ${offsetEtiqueta} °C).`);
    }

    function validarCamposControl() {
        const frecuencia = Number(selectFrecuencia.value);
        const tempMin = Number.parseFloat(inputTempMinHoja.value);
        const tempMax = Number.parseFloat(inputTempMaxHoja.value);
        const deltaTMax = Number.parseFloat(inputDeltaTMax.value);

        if (!FRECUENCIAS_VALIDAS.includes(frecuencia)) {
            return { valido: false, error: "Selecciona una frecuencia de lectura válida." };
        }

        if (!Number.isFinite(tempMin) || tempMin < -70 || tempMin > 380) {
            return {
                valido: false,
                error: "La Temp. Mínima Hoja debe estar dentro del rango del sensor (-70.0 a 380.0 °C)."
            };
        }

        if (!Number.isFinite(tempMax) || tempMax < -70 || tempMax > 380) {
            return {
                valido: false,
                error: "La Temp. Máxima Hoja debe estar dentro del rango del sensor (-70.0 a 380.0 °C)."
            };
        }

        if (tempMin >= tempMax) {
            return {
                valido: false,
                error: "La Temp. Mínima Hoja debe ser menor que la Temp. Máxima Hoja."
            };
        }

        if (!Number.isFinite(deltaTMax) || deltaTMax < 0.1 || deltaTMax > 30) {
            return {
                valido: false,
                error: "El Diferencial Máx. Hoja - Ambiente (ΔT) debe estar entre 0.1 y 30.0 °C."
            };
        }

        return {
            valido: true,
            datos: {
                frecuenciaLecturaSeg: frecuencia,
                tempMinimaHoja: Number(tempMin.toFixed(1)),
                tempMaximaHoja: Number(tempMax.toFixed(1)),
                deltaTMaxHoja: Number(deltaTMax.toFixed(1))
            }
        };
    }

    function validarCamposTecnicos() {
        const busI2c = selectBusI2c.value;
        const direccionBruta = (inputDireccionI2c.value || "").trim();
        const pinSda = (inputPinSda.value || "").trim();
        const pinScl = (inputPinScl.value || "").trim();
        const frecuenciaI2c = selectFrecuenciaI2c.value;
        const varianteFov = selectFov.value;
        const distanciaDoselCm = Number.parseFloat(inputDistanciaDosel.value);
        const filtroIir = selectFiltroIir.value;

        if (!BUSES_VALIDOS.includes(busI2c)) {
            return { valido: false, error: "Selecciona un bus I2C válido (I2C0 o I2C1)." };
        }

        if (!/^0[xX][0-9A-Fa-f]{2}$/.test(direccionBruta)) {
            return {
                valido: false,
                error: "La Dirección I2C del Sensor debe tener formato hexadecimal de 2 dígitos (ej. 0x5A)."
            };
        }

        const direccionValor = Number.parseInt(direccionBruta, 16);
        if (direccionValor < 0x08 || direccionValor > 0x77) {
            return {
                valido: false,
                error: "La Dirección I2C debe estar en el rango válido de 7 bits (0x08 a 0x77)."
            };
        }

        if (!pinSda || !pinScl) {
            return { valido: false, error: "Indica los pines SDA y SCL del ESP32-S3." };
        }

        if (pinSda.toUpperCase() === pinScl.toUpperCase()) {
            return { valido: false, error: "Los pines SDA y SCL no pueden ser iguales." };
        }

        if (!FRECUENCIAS_I2C_VALIDAS.includes(frecuenciaI2c)) {
            return { valido: false, error: "Selecciona una frecuencia del bus I2C válida (100 kHz o 400 kHz)." };
        }

        if (!FOV_VALIDOS.includes(varianteFov)) {
            return { valido: false, error: "Selecciona una variante óptica FOV válida." };
        }

        if (!Number.isFinite(distanciaDoselCm) || distanciaDoselCm < 1 || distanciaDoselCm > 500) {
            return {
                valido: false,
                error: "La Distancia al Dosel de la Lechuga debe estar entre 1 y 500 cm."
            };
        }

        if (!FILTROS_IIR_VALIDOS.includes(filtroIir)) {
            return { valido: false, error: "Selecciona un nivel válido para el Filtro Digital Interno (IIR)." };
        }

        return {
            valido: true,
            datos: {
                busI2c,
                direccionI2c: `0x${direccionValor.toString(16).toUpperCase().padStart(2, "0")}`,
                pinSda,
                pinScl,
                frecuenciaI2c,
                varianteFov,
                distanciaDoselCm: Math.round(distanciaDoselCm),
                filtroIir
            }
        };
    }

    function restaurarValoresFabrica() {
        estadoTecnicoLechuga = { ...DEFAULTS_TECNICOS_LECHUGA };
        persistirTecnica();
        sincronizarCamposTecnicos();
        limpiarError(errorTecnico);

        document.dispatchEvent(
            new CustomEvent("temperaturaLechuga:configTecnicaRestaurada", {
                detail: { ...estadoTecnicoLechuga }
            })
        );
        console.info("Configuración técnica restaurada a valores de fábrica (MLX90614):", estadoTecnicoLechuga);
        mostrarToast("Valores técnicos de fábrica restaurados.");
    }

    // Bloque 1 - Estado del sensor con modal
    btnEstado.addEventListener("click", () => {
        const nuevoEstado = !estadoModuloLechuga.activo;
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

    // Bloque 1 - Toggle comparación con temperatura ambiente interna
    if (btnCompararAmbiente) {
        btnCompararAmbiente.addEventListener("click", () => {
            const nuevaComparacion = !btnCompararAmbiente.classList.contains("activo");
            actualizarBotonMicroclima(nuevaComparacion);
        });
    }

    [selectFrecuencia, inputTempMinHoja, inputTempMaxHoja, inputDeltaTMax].forEach((campo) => {
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

        estadoModuloLechuga.frecuenciaLecturaSeg = resultado.datos.frecuenciaLecturaSeg;
        estadoModuloLechuga.tempMinimaHoja = resultado.datos.tempMinimaHoja;
        estadoModuloLechuga.tempMaximaHoja = resultado.datos.tempMaximaHoja;
        estadoModuloLechuga.deltaTMaxHoja = resultado.datos.deltaTMaxHoja;
        estadoModuloLechuga.compararAmbienteInterno = btnCompararAmbiente
            ? btnCompararAmbiente.classList.contains("activo")
            : true;

        persistirEstado();
        sincronizarFormularioConEstado();

        document.dispatchEvent(
            new CustomEvent("temperaturaLechuga:configuracionGuardada", {
                detail: { ...estadoModuloLechuga }
            })
        );
        console.info("Configuración Bloque 1 (MLX90614) guardada:", estadoModuloLechuga);
        mostrarToast("Configuración foliar y de microclima guardada.");
    });

    // Bloque 2 - Calibración óptica de emisividad y offset con modal
    [inputEmisividad, inputOffset].forEach((campo) => {
        if (campo) campo.addEventListener("input", () => limpiarError(errorCalibracion));
    });

    if (btnAplicarAjuste && inputEmisividad && inputOffset) {
        btnAplicarAjuste.addEventListener("click", () => {
            limpiarError(errorCalibracion);
            const emisividad = Number.parseFloat(inputEmisividad.value);
            const offset = Number.parseFloat(inputOffset.value);

            if (!Number.isFinite(emisividad) || emisividad < 0.10 || emisividad > 1.00) {
                mostrarError(
                    errorCalibracion,
                    "La Emisividad de la Hoja (ε) debe estar entre 0.10 y 1.00."
                );
                return;
            }

            if (!Number.isFinite(offset) || offset < -20 || offset > 20) {
                mostrarError(
                    errorCalibracion,
                    "Ingresa una Desviación / Offset válida entre -20.0 °C y +20.0 °C."
                );
                return;
            }

            const offsetFmt = offset > 0 ? `+${offset.toFixed(1)}` : offset.toFixed(1);
            abrirModalConfirmacion({
                titulo: "¿Aplicar calibración óptica y emisividad?",
                mensaje: `¿Confirmas guardar la emisividad ε = ${emisividad.toFixed(2)} y un offset de ${offsetFmt} °C, actualizando la fecha de verificación del lente MLX90614?`,
                claseBoton: "btn-modal-activar",
                onAceptar: () => ejecutarAjusteOptico(emisividad, offset)
            });
        });
    }

    // Ayudas contextuales (?)
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

    // Bloque 3 - Acordeón técnico y cálculo dinámico del diámetro FOV
    if (btnAcordeonTecnico && bloqueTecnico) {
        btnAcordeonTecnico.addEventListener("click", () => {
            const abierto = bloqueTecnico.classList.toggle("abierto");
            btnAcordeonTecnico.setAttribute("aria-expanded", abierto ? "true" : "false");
            if (!abierto) cerrarAyudasContextuales();
        });
    }

    if (selectFov) {
        selectFov.addEventListener("change", actualizarResumenAreaFov);
    }

    if (inputDistanciaDosel) {
        inputDistanciaDosel.addEventListener("input", actualizarResumenAreaFov);
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

            const diametroCm = calcularDiametroAreaCm(
                resultado.datos.varianteFov,
                resultado.datos.distanciaDoselCm
            );

            estadoTecnicoLechuga = { ...resultado.datos };
            persistirTecnica();
            sincronizarCamposTecnicos();

            document.dispatchEvent(
                new CustomEvent("temperaturaLechuga:configTecnicaGuardada", {
                    detail: {
                        ...estadoTecnicoLechuga,
                        diametroAreaMedidaCm: diametroCm ? Number(diametroCm.toFixed(1)) : null
                    }
                })
            );
            console.info("Configuración técnica guardada (MLX90614):", estadoTecnicoLechuga);
            mostrarToast("Configuración técnica I2C y FOV guardada.");
        });

        [
            selectBusI2c,
            inputDireccionI2c,
            inputPinSda,
            inputPinScl,
            selectFrecuenciaI2c,
            selectFov,
            inputDistanciaDosel,
            selectFiltroIir
        ].forEach((campo) => {
            if (campo) campo.addEventListener("input", () => limpiarError(errorTecnico));
        });
    }

    if (btnRestaurarFabrica) {
        btnRestaurarFabrica.addEventListener("click", () => {
            abrirModalConfirmacion({
                titulo: "¿Restaurar valores de fábrica?",
                mensaje:
                    "Se restablecerán los parámetros I2C (I2C0 Wire, 0x5A, SDA GPIO 8, SCL GPIO 9, 100 kHz) y los parámetros ópticos (FOV 90°, distancia 15 cm, filtro IIR Medio 50%).",
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

