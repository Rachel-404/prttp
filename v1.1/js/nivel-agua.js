document.addEventListener("DOMContentLoaded", () => {
    const CLAVE_CONFIG_NA = "axion_nivel_agua_bloque1";
    const CLAVE_TANQUE_NA = "axion_nivel_agua_bloque2";
    const CLAVE_TECNICA_NA = "axion_nivel_agua_tecnico";

    const FRECUENCIAS_VALIDAS = [5, 10, 30, 60, 300];
    const UNIDADES_VALIDAS = ["cm", "pct", "L"];
    const FORMAS_VALIDAS = ["rectangular", "cilindrico"];
    const SALIDAS_VALIDAS = ["4-20mA", "0.5-4.5V", "modbus"];
    const PINES_ADC_VALIDOS = ["GPIO1", "GPIO2", "GPIO3", "GPIO4", "GPIO5", "GPIO6", "GPIO7"];
    const BAUDS_VALIDOS = [4800, 9600, 19200, 38400];
    const RANGOS_URL_MAX_KPA = {
        C203G: 20,
        C403G: 40,
        C104G: 100
    };
    const OFFSETS_CARCASA_MM = {
        H46: 7.5,
        H39: 4.0
    };

    const DEFAULTS_TECNICOS_NA = {
        tipoSalida: "4-20mA",
        resistenciaShunt: 150,
        pinAdc420: "GPIO2",
        pinAdcVdc: "GPIO2",
        factorDivisorTension: 0.66,
        slaveId: 1,
        baudRate: 9600,
        rangoNominal: "C203G",
        lrvKpa: 0,
        urvKpa: 20,
        densidadKgM3: 1005,
        dampingSeg: 2,
        tipoCarcasa: "H46",
        offsetMecanicoMm: 7.5
    };

    // Estado centralizado del Bloque 1: Alertas y Control del Tanque (LMP633-NCN)
    const estadoModuloNa = {
        sensor: "LMP633-NCN",
        modulo: "Nivel de Agua",
        activo: true,
        frecuenciaLecturaSeg: 10,
        unidadPrincipal: "cm",
        nivelMinimoCm: 15,
        nivelMaximoCm: 90,
        ultimaActualizacion: null
    };

    // Estado centralizado del Bloque 2: Dimensiones del Tanque y Ajuste Cero
    const estadoTanqueNa = {
        forma: "rectangular",
        largoM: 0.8,
        anchoM: 0.5,
        diametroM: 0.8,
        alturaTotalM: 1.0,
        capacidadLitros: 400,
        ultimoAjusteCeroISO: null
    };

    // Estado centralizado del Bloque 3: Configuración Técnica y Conexión
    let estadoTecnicoNa = { ...DEFAULTS_TECNICOS_NA };
    let carcasaAnterior = DEFAULTS_TECNICOS_NA.tipoCarcasa;

    // Referencias DOM - Bloque 1
    const btnEstado = document.getElementById("btn-estado-na");
    const txtEstado = document.getElementById("estado-na");
    const formControl = document.getElementById("form-control-na");
    const selectFrecuencia = document.getElementById("frecuencia-lectura-na");
    const selectUnidad = document.getElementById("unidad-principal-na");
    const inputNivelMin = document.getElementById("nivel-minimo-na");
    const inputNivelMax = document.getElementById("nivel-maximo-na");
    const errorControl = document.getElementById("error-control-na");

    // Referencias DOM - Bloque 2
    const selectForma = document.getElementById("forma-tanque");
    const grupoRect = document.getElementById("campos-rectangular");
    const grupoCil = document.getElementById("campos-cilindrico");
    const inputLargo = document.getElementById("tanque-largo");
    const inputAncho = document.getElementById("tanque-ancho");
    const inputAlturaRect = document.getElementById("tanque-altura-rect");
    const inputDiametro = document.getElementById("tanque-diametro");
    const inputAlturaCil = document.getElementById("tanque-altura-cil");
    const txtCapacidad = document.getElementById("capacidad-estimada-litros");
    const txtUltimoCero = document.getElementById("ultimo-ajuste-cero");
    const btnFijarCero = document.getElementById("btn-fijar-cero");

    // Referencias DOM - Bloque 3
    const bloqueTecnico = document.getElementById("bloque-tecnico-na");
    const btnAcordeonTecnico = document.getElementById("btn-acordeon-tecnico-na");
    const formTecnico = document.getElementById("form-tecnico-na");
    const selectSalida = document.getElementById("tec-na-salida");
    const selectUrl = document.getElementById("tec-na-url");
    const grupo420 = document.getElementById("grupo-salida-420ma");
    const grupoVdc = document.getElementById("grupo-salida-vdc");
    const grupoModbus = document.getElementById("grupo-salida-modbus");
    const inputShunt = document.getElementById("tec-na-shunt");
    const selectAdc420 = document.getElementById("tec-na-adc-420");
    const selectAdcVdc = document.getElementById("tec-na-adc-vdc");
    const inputDivisorVdc = document.getElementById("tec-na-divisor");
    const inputSlave = document.getElementById("tec-na-slave");
    const selectBaud = document.getElementById("tec-na-baud");
    const inputLrv = document.getElementById("tec-na-lrv");
    const inputUrv = document.getElementById("tec-na-urv");
    const inputDensidad = document.getElementById("tec-na-densidad");
    const inputDamping = document.getElementById("tec-na-damping");
    const selectCarcasa = document.getElementById("tec-na-carcasa");
    const inputOffset = document.getElementById("tec-na-offset");
    const errorTecnico = document.getElementById("error-tecnico-na");
    const btnRestaurarFabrica = document.getElementById("btn-restaurar-fabrica-na");

    // Referencias DOM - Modal compartido y Toast
    const modal = document.getElementById("modal-confirmacion-na");
    const modalTitulo = document.getElementById("modal-na-titulo");
    const modalMensaje = document.getElementById("modal-na-mensaje");
    const btnCancelar = document.getElementById("btn-modal-cancelar-na");
    const btnAceptar = document.getElementById("btn-modal-aceptar-na");
    const toastNa = document.getElementById("toast-na");

    if (!btnEstado || !txtEstado || !modal || !formControl) return;

    let accionConfirmarPendiente = null;
    let toastTimer = null;

    const configuracionAcciones = {
        pausar: {
            titulo: "¿Pausar monitoreo de nivel de agua?",
            mensaje:
                "Vas a desactivar temporalmente el transmisor LMP633-NCN. Durante este tiempo se detendrán las alertas de nivel bajo/desborde, la protección de bomba contra trabajo en seco y el registro histórico.",
            claseBoton: "btn-modal-pausar"
        },
        activar: {
            titulo: "¿Reactivar sensor de nivel de agua?",
            mensaje:
                "El sistema reanudará la lectura continua del nivel del reservorio, volverá a evaluar los umbrales críticos de desborde/bomba y retomará el registro histórico.",
            claseBoton: "btn-modal-activar"
        }
    };

    function calcularCapacidadLitros(tanque = estadoTanqueNa) {
        if (tanque.forma === "cilindrico") {
            const radio = tanque.diametroM / 2;
            const litros = Math.PI * radio * radio * tanque.alturaTotalM * 1000;
            return Math.round(litros);
        }
        return Math.round(tanque.largoM * tanque.anchoM * tanque.alturaTotalM * 1000);
    }

    function cargarEstadoInicial() {
        try {
            const cfgGuardada = localStorage.getItem(CLAVE_CONFIG_NA);
            if (cfgGuardada) {
                const datos = JSON.parse(cfgGuardada);
                if (typeof datos.activo === "boolean") estadoModuloNa.activo = datos.activo;
                if (FRECUENCIAS_VALIDAS.includes(Number(datos.frecuenciaLecturaSeg))) {
                    estadoModuloNa.frecuenciaLecturaSeg = Number(datos.frecuenciaLecturaSeg);
                }
                if (UNIDADES_VALIDAS.includes(datos.unidadPrincipal)) {
                    estadoModuloNa.unidadPrincipal = datos.unidadPrincipal;
                }
                if (Number.isFinite(Number(datos.nivelMinimoCm))) {
                    estadoModuloNa.nivelMinimoCm = Number(datos.nivelMinimoCm);
                }
                if (Number.isFinite(Number(datos.nivelMaximoCm))) {
                    estadoModuloNa.nivelMaximoCm = Number(datos.nivelMaximoCm);
                }
                estadoModuloNa.ultimaActualizacion = datos.ultimaActualizacion || null;
            }

            const tanqueGuardado = localStorage.getItem(CLAVE_TANQUE_NA);
            if (tanqueGuardado) {
                const tq = JSON.parse(tanqueGuardado);
                if (FORMAS_VALIDAS.includes(tq.forma)) estadoTanqueNa.forma = tq.forma;
                if (Number(tq.largoM) > 0) estadoTanqueNa.largoM = Number(tq.largoM);
                if (Number(tq.anchoM) > 0) estadoTanqueNa.anchoM = Number(tq.anchoM);
                if (Number(tq.diametroM) > 0) estadoTanqueNa.diametroM = Number(tq.diametroM);
                if (Number(tq.alturaTotalM) > 0) estadoTanqueNa.alturaTotalM = Number(tq.alturaTotalM);
                if (tq.ultimoAjusteCeroISO) estadoTanqueNa.ultimoAjusteCeroISO = tq.ultimoAjusteCeroISO;
                estadoTanqueNa.capacidadLitros = calcularCapacidadLitros(estadoTanqueNa);
            }

            const tecGuardada = localStorage.getItem(CLAVE_TECNICA_NA);
            if (tecGuardada) {
                const tec = JSON.parse(tecGuardada);
                estadoTecnicoNa = { ...DEFAULTS_TECNICOS_NA, ...tec };
                carcasaAnterior = estadoTecnicoNa.tipoCarcasa;
            }
        } catch (err) {
            console.warn("No se pudo restaurar la configuración de Nivel de Agua:", err);
        }
    }

    function persistirEstado() {
        estadoModuloNa.ultimaActualizacion = new Date().toISOString();
        localStorage.setItem(CLAVE_CONFIG_NA, JSON.stringify(estadoModuloNa));
    }

    function persistirTanque() {
        localStorage.setItem(CLAVE_TANQUE_NA, JSON.stringify(estadoTanqueNa));
    }

    function persistirTecnica() {
        localStorage.setItem(CLAVE_TECNICA_NA, JSON.stringify(estadoTecnicoNa));
    }

    function formatearFechaCero(isoString) {
        if (!isoString) return "Hace 20 días";
        const fecha = new Date(isoString);
        if (Number.isNaN(fecha.getTime())) return "Hace 20 días";

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

    function actualizarVisibilidadFormaTanque() {
        const esCilindrico = selectForma && selectForma.value === "cilindrico";
        if (grupoRect) grupoRect.hidden = esCilindrico;
        if (grupoCil) grupoCil.hidden = !esCilindrico;
    }

    function actualizarVisibilidadSalidaElectrica() {
        const salida = selectSalida ? selectSalida.value : "4-20mA";
        if (grupo420) grupo420.hidden = salida !== "4-20mA";
        if (grupoVdc) grupoVdc.hidden = salida !== "0.5-4.5V";
        if (grupoModbus) grupoModbus.hidden = salida !== "modbus";
    }

    function actualizarTextoCapacidad() {
        if (!txtCapacidad) return;
        txtCapacidad.textContent = `${estadoTanqueNa.capacidadLitros} Litros`;
    }

    function actualizarTextoAjusteCero() {
        if (!txtUltimoCero) return;
        txtUltimoCero.textContent = formatearFechaCero(estadoTanqueNa.ultimoAjusteCeroISO);
    }

    function sincronizarCamposTecnicos() {
        if (!formTecnico) return;
        if (selectSalida) selectSalida.value = estadoTecnicoNa.tipoSalida;
        if (selectUrl) selectUrl.value = estadoTecnicoNa.rangoNominal;
        if (inputShunt) inputShunt.value = String(estadoTecnicoNa.resistenciaShunt);
        if (selectAdc420) selectAdc420.value = estadoTecnicoNa.pinAdc420;
        if (selectAdcVdc) selectAdcVdc.value = estadoTecnicoNa.pinAdcVdc;
        if (inputDivisorVdc) inputDivisorVdc.value = String(estadoTecnicoNa.factorDivisorTension);
        if (inputSlave) inputSlave.value = String(estadoTecnicoNa.slaveId);
        if (selectBaud) selectBaud.value = String(estadoTecnicoNa.baudRate);
        if (inputLrv) inputLrv.value = String(estadoTecnicoNa.lrvKpa);
        if (inputUrv) inputUrv.value = String(estadoTecnicoNa.urvKpa);
        if (inputDensidad) inputDensidad.value = String(estadoTecnicoNa.densidadKgM3);
        if (inputDamping) inputDamping.value = String(estadoTecnicoNa.dampingSeg);
        if (selectCarcasa) selectCarcasa.value = estadoTecnicoNa.tipoCarcasa;
        if (inputOffset) inputOffset.value = String(estadoTecnicoNa.offsetMecanicoMm);
        carcasaAnterior = estadoTecnicoNa.tipoCarcasa;
        actualizarVisibilidadSalidaElectrica();
    }

    function sincronizarFormularioConEstado() {
        actualizarIndicadorVisual(estadoModuloNa.activo);
        if (selectFrecuencia) selectFrecuencia.value = String(estadoModuloNa.frecuenciaLecturaSeg);
        if (selectUnidad) selectUnidad.value = estadoModuloNa.unidadPrincipal;
        if (inputNivelMin) inputNivelMin.value = String(estadoModuloNa.nivelMinimoCm);
        if (inputNivelMax) inputNivelMax.value = String(estadoModuloNa.nivelMaximoCm);

        if (selectForma) selectForma.value = estadoTanqueNa.forma;
        if (inputLargo) inputLargo.value = estadoTanqueNa.largoM.toFixed(2);
        if (inputAncho) inputAncho.value = estadoTanqueNa.anchoM.toFixed(2);
        if (inputAlturaRect) inputAlturaRect.value = estadoTanqueNa.alturaTotalM.toFixed(2);
        if (inputDiametro) inputDiametro.value = estadoTanqueNa.diametroM.toFixed(2);
        if (inputAlturaCil) inputAlturaCil.value = estadoTanqueNa.alturaTotalM.toFixed(2);
        actualizarVisibilidadFormaTanque();
        actualizarTextoCapacidad();
        actualizarTextoAjusteCero();
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
        if (!toastNa) return;
        toastNa.textContent = texto;
        toastNa.hidden = false;
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toastNa.hidden = true;
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
        estadoModuloNa.activo = activo;
        persistirEstado();

        const orden = {
            sensor: estadoModuloNa.sensor,
            modulo: estadoModuloNa.modulo,
            estado: activo ? "ACTIVO" : "PAUSADO",
            timestamp: estadoModuloNa.ultimaActualizacion
        };

        document.dispatchEvent(new CustomEvent("nivelAgua:ordenEstado", { detail: orden }));
        console.info("Orden enviada para sensor LMP633-NCN:", orden);
        mostrarToast(activo ? "Sensor LMP633-NCN activado." : "Sensor LMP633-NCN pausado.");
    }

    function ejecutarAjusteCero() {
        const ahoraISO = new Date().toISOString();
        estadoTanqueNa.ultimoAjusteCeroISO = ahoraISO;
        persistirTanque();
        actualizarTextoAjusteCero();

        const comando = {
            sensor: "LMP633-NCN",
            accion: "TARAR_CERO",
            offsetMecanicoMm: estadoTecnicoNa.offsetMecanicoMm,
            timestamp: ahoraISO
        };

        document.dispatchEvent(new CustomEvent("nivelAgua:ceroFijado", { detail: comando }));
        console.info("Comando de ajuste cero enviado (LMP633-NCN):", comando);
        mostrarToast("Punto cero fijado correctamente (0 cm).");
    }

    function recalcularDimensionesDesdeInputs(sincronizarAlturaOrigen = null) {
        const forma = selectForma ? selectForma.value : "rectangular";
        estadoTanqueNa.forma = FORMAS_VALIDAS.includes(forma) ? forma : "rectangular";

        if (sincronizarAlturaOrigen === "rect" && inputAlturaRect && inputAlturaCil) {
            inputAlturaCil.value = inputAlturaRect.value;
        } else if (sincronizarAlturaOrigen === "cil" && inputAlturaCil && inputAlturaRect) {
            inputAlturaRect.value = inputAlturaCil.value;
        }

        const largo = Number.parseFloat(inputLargo ? inputLargo.value : "");
        const ancho = Number.parseFloat(inputAncho ? inputAncho.value : "");
        const diametro = Number.parseFloat(inputDiametro ? inputDiametro.value : "");
        const alturaInput = estadoTanqueNa.forma === "cilindrico" ? inputAlturaCil : inputAlturaRect;
        const altura = Number.parseFloat(alturaInput ? alturaInput.value : "");

        if (estadoTanqueNa.forma === "cilindrico") {
            if (!Number.isFinite(diametro) || diametro <= 0 || !Number.isFinite(altura) || altura <= 0) {
                if (txtCapacidad) txtCapacidad.textContent = "Dimensiones inválidas";
                return false;
            }
            estadoTanqueNa.diametroM = Number(diametro.toFixed(2));
            estadoTanqueNa.alturaTotalM = Number(altura.toFixed(2));
        } else {
            if (
                !Number.isFinite(largo) || largo <= 0 ||
                !Number.isFinite(ancho) || ancho <= 0 ||
                !Number.isFinite(altura) || altura <= 0
            ) {
                if (txtCapacidad) txtCapacidad.textContent = "Dimensiones inválidas";
                return false;
            }
            estadoTanqueNa.largoM = Number(largo.toFixed(2));
            estadoTanqueNa.anchoM = Number(ancho.toFixed(2));
            estadoTanqueNa.alturaTotalM = Number(altura.toFixed(2));
        }

        estadoTanqueNa.capacidadLitros = calcularCapacidadLitros(estadoTanqueNa);
        actualizarTextoCapacidad();
        persistirTanque();
        return true;
    }

    function validarCamposControl() {
        const frecuencia = Number(selectFrecuencia.value);
        const unidad = selectUnidad.value;
        const nivelMin = Number.parseFloat(inputNivelMin.value);
        const nivelMax = Number.parseFloat(inputNivelMax.value);
        const alturaTanqueCm = Number((estadoTanqueNa.alturaTotalM * 100).toFixed(1));

        if (!FRECUENCIAS_VALIDAS.includes(frecuencia)) {
            return { valido: false, error: "Selecciona una frecuencia de lectura válida." };
        }

        if (!UNIDADES_VALIDAS.includes(unidad)) {
            return { valido: false, error: "Selecciona una unidad de visualización válida." };
        }

        if (!Number.isFinite(nivelMin) || nivelMin < 0) {
            return { valido: false, error: "El Nivel Mínimo Crítico debe ser mayor o igual a 0 cm." };
        }

        if (!Number.isFinite(nivelMax) || nivelMax <= 0) {
            return { valido: false, error: "El Nivel Máximo Alerta debe ser mayor que 0 cm." };
        }

        if (nivelMin >= nivelMax) {
            return { valido: false, error: "El Nivel Mínimo Crítico debe ser menor que el Nivel Máximo Alerta." };
        }

        if (nivelMax > alturaTanqueCm) {
            return {
                valido: false,
                error: `El Nivel Máximo Alerta no puede superar la altura del tanque (${alturaTanqueCm} cm).`
            };
        }

        return {
            valido: true,
            datos: {
                frecuenciaLecturaSeg: frecuencia,
                unidadPrincipal: unidad,
                nivelMinimoCm: Number(nivelMin.toFixed(1)),
                nivelMaximoCm: Number(nivelMax.toFixed(1))
            }
        };
    }

    function validarCamposTecnicos() {
        const tipoSalida = selectSalida.value;
        const rangoNominal = selectUrl.value;
        const maxUrlKpa = RANGOS_URL_MAX_KPA[rangoNominal];
        const lrvKpa = Number.parseFloat(inputLrv.value);
        const urvKpa = Number.parseFloat(inputUrv.value);
        const densidadKgM3 = Number.parseFloat(inputDensidad.value);
        const dampingSeg = Number(inputDamping.value);
        const tipoCarcasa = selectCarcasa.value;
        const offsetMecanicoMm = Number.parseFloat(inputOffset.value);

        if (!SALIDAS_VALIDAS.includes(tipoSalida)) {
            return { valido: false, error: "Selecciona un tipo de salida eléctrica válido." };
        }

        if (!maxUrlKpa) {
            return { valido: false, error: "Selecciona un Rango Nominal de Fábrica (URL) válido." };
        }

        let resistenciaShunt = estadoTecnicoNa.resistenciaShunt;
        let pinAdc420 = estadoTecnicoNa.pinAdc420;
        let pinAdcVdc = estadoTecnicoNa.pinAdcVdc;
        let factorDivisorTension = estadoTecnicoNa.factorDivisorTension;
        let slaveId = estadoTecnicoNa.slaveId;
        let baudRate = estadoTecnicoNa.baudRate;

        if (tipoSalida === "4-20mA") {
            resistenciaShunt = Number.parseFloat(inputShunt.value);
            pinAdc420 = selectAdc420.value;
            if (!Number.isFinite(resistenciaShunt) || resistenciaShunt < 10 || resistenciaShunt > 1000) {
                return { valido: false, error: "La Resistencia Shunt debe estar entre 10 y 1000 Ω." };
            }
            if (!PINES_ADC_VALIDOS.includes(pinAdc420)) {
                return { valido: false, error: "Selecciona un pin ADC1 válido del ESP32-S3." };
            }
        } else if (tipoSalida === "0.5-4.5V") {
            pinAdcVdc = selectAdcVdc.value;
            factorDivisorTension = Number.parseFloat(inputDivisorVdc.value);
            if (!PINES_ADC_VALIDOS.includes(pinAdcVdc)) {
                return { valido: false, error: "Selecciona un pin ADC1 válido del ESP32-S3." };
            }
            if (!Number.isFinite(factorDivisorTension) || factorDivisorTension < 0.1 || factorDivisorTension > 10) {
                return { valido: false, error: "El Factor Divisor de Tensión debe estar entre 0.10 y 10.00." };
            }
        } else if (tipoSalida === "modbus") {
            slaveId = Number(inputSlave.value);
            baudRate = Number(selectBaud.value);
            if (!Number.isInteger(slaveId) || slaveId < 1 || slaveId > 247) {
                return { valido: false, error: "El Slave ID Modbus-RTU debe estar entre 1 y 247." };
            }
            if (!BAUDS_VALIDOS.includes(baudRate)) {
                return { valido: false, error: "Selecciona un Baud Rate válido (4800, 9600, 19200 o 38400)." };
            }
        }

        if (!Number.isFinite(lrvKpa) || lrvKpa < 0) {
            return { valido: false, error: "El LRV debe ser mayor o igual a 0 kPa." };
        }

        if (!Number.isFinite(urvKpa) || urvKpa <= lrvKpa || urvKpa > maxUrlKpa) {
            return {
                valido: false,
                error: `El URV debe ser mayor que LRV y no exceder el URL seleccionado (${maxUrlKpa} kPa).`
            };
        }

        if (!Number.isFinite(densidadKgM3) || densidadKgM3 < 500 || densidadKgM3 > 2000) {
            return { valido: false, error: "La Densidad del Líquido debe estar entre 500 y 2000 kg/m³." };
        }

        if (!Number.isInteger(dampingSeg) || dampingSeg < 0 || dampingSeg > 100) {
            return { valido: false, error: "El Tiempo de Amortiguamiento debe ser un entero entre 0 y 100 segundos." };
        }

        if (!Object.prototype.hasOwnProperty.call(OFFSETS_CARCASA_MM, tipoCarcasa)) {
            return { valido: false, error: "Selecciona un tipo de sonda / carcasa válido." };
        }

        if (!Number.isFinite(offsetMecanicoMm) || offsetMecanicoMm < 0 || offsetMecanicoMm > 500) {
            return { valido: false, error: "El Offset Mecánico Total debe estar entre 0 y 500 mm." };
        }

        return {
            valido: true,
            datos: {
                tipoSalida,
                resistenciaShunt: Number(resistenciaShunt.toFixed(1)),
                pinAdc420,
                pinAdcVdc,
                factorDivisorTension: Number(factorDivisorTension.toFixed(2)),
                slaveId,
                baudRate,
                rangoNominal,
                lrvKpa: Number(lrvKpa.toFixed(2)),
                urvKpa: Number(urvKpa.toFixed(2)),
                densidadKgM3: Math.round(densidadKgM3),
                dampingSeg,
                tipoCarcasa,
                offsetMecanicoMm: Number(offsetMecanicoMm.toFixed(1))
            }
        };
    }

    function restaurarValoresFabrica() {
        estadoTecnicoNa = { ...DEFAULTS_TECNICOS_NA };
        persistirTecnica();
        sincronizarCamposTecnicos();
        limpiarError(errorTecnico);

        document.dispatchEvent(
            new CustomEvent("nivelAgua:configTecnicaRestaurada", { detail: { ...estadoTecnicoNa } })
        );
        console.info("Configuración técnica restaurada a valores de fábrica (LMP633-NCN):", estadoTecnicoNa);
        mostrarToast("Valores técnicos de fábrica restaurados.");
    }

    // Bloque 1 - Estado del sensor con modal
    btnEstado.addEventListener("click", () => {
        const nuevoEstado = !estadoModuloNa.activo;
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

    [selectFrecuencia, selectUnidad, inputNivelMin, inputNivelMax].forEach((campo) => {
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

        estadoModuloNa.frecuenciaLecturaSeg = resultado.datos.frecuenciaLecturaSeg;
        estadoModuloNa.unidadPrincipal = resultado.datos.unidadPrincipal;
        estadoModuloNa.nivelMinimoCm = resultado.datos.nivelMinimoCm;
        estadoModuloNa.nivelMaximoCm = resultado.datos.nivelMaximoCm;

        persistirEstado();
        sincronizarFormularioConEstado();

        document.dispatchEvent(
            new CustomEvent("nivelAgua:configuracionGuardada", { detail: { ...estadoModuloNa } })
        );
        console.info("Configuración Bloque 1 (LMP633-NCN) guardada:", estadoModuloNa);
        mostrarToast("Configuración de alertas del tanque guardada.");
    });

    // Bloque 2 - Geometría dinámica y cálculo automático en Litros
    if (selectForma) {
        selectForma.addEventListener("change", () => {
            actualizarVisibilidadFormaTanque();
            recalcularDimensionesDesdeInputs();
        });
    }

    [inputLargo, inputAncho, inputDiametro].forEach((campo) => {
        if (campo) campo.addEventListener("input", () => recalcularDimensionesDesdeInputs());
    });

    if (inputAlturaRect) {
        inputAlturaRect.addEventListener("input", () => recalcularDimensionesDesdeInputs("rect"));
    }

    if (inputAlturaCil) {
        inputAlturaCil.addEventListener("input", () => recalcularDimensionesDesdeInputs("cil"));
    }

    // Bloque 2 - Ajuste de Punto Cero (con modal obligatorio)
    if (btnFijarCero) {
        btnFijarCero.addEventListener("click", () => {
            abrirModalConfirmacion({
                titulo: "¿Fijar nivel cero actual?",
                mensaje:
                    "¿Confirmas que el tanque está vacío en su referencia base y deseas fijar la lectura actual del sensor LMP633-NCN como 0 cm?",
                claseBoton: "btn-modal-activar",
                onAceptar: ejecutarAjusteCero
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

    if (selectSalida) {
        selectSalida.addEventListener("change", () => {
            actualizarVisibilidadSalidaElectrica();
            limpiarError(errorTecnico);
        });
    }

    if (selectCarcasa && inputOffset) {
        selectCarcasa.addEventListener("change", () => {
            const nuevaCarcasa = selectCarcasa.value;
            const basePrev = OFFSETS_CARCASA_MM[carcasaAnterior] ?? 7.5;
            const baseNueva = OFFSETS_CARCASA_MM[nuevaCarcasa] ?? 7.5;
            const actual = Number.parseFloat(inputOffset.value);
            const extraContrapeso = Number.isFinite(actual) ? Math.max(0, actual - basePrev) : 0;

            inputOffset.value = (baseNueva + extraContrapeso).toFixed(1);
            carcasaAnterior = nuevaCarcasa;
            limpiarError(errorTecnico);
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

            estadoTecnicoNa = { ...resultado.datos };
            persistirTecnica();
            sincronizarCamposTecnicos();

            document.dispatchEvent(
                new CustomEvent("nivelAgua:configTecnicaGuardada", { detail: { ...estadoTecnicoNa } })
            );
            console.info("Configuración técnica guardada (LMP633-NCN):", estadoTecnicoNa);
            mostrarToast("Configuración técnica del transmisor LMP633-NCN guardada.");
        });

        [
            selectSalida,
            selectUrl,
            inputShunt,
            selectAdc420,
            selectAdcVdc,
            inputDivisorVdc,
            inputSlave,
            selectBaud,
            inputLrv,
            inputUrv,
            inputDensidad,
            inputDamping,
            selectCarcasa,
            inputOffset
        ].forEach((campo) => {
            if (campo) campo.addEventListener("input", () => limpiarError(errorTecnico));
        });
    }

    if (btnRestaurarFabrica) {
        btnRestaurarFabrica.addEventListener("click", () => {
            abrirModalConfirmacion({
                titulo: "¿Restaurar valores de fábrica?",
                mensaje:
                    "Se restablecerán los parámetros eléctricos (4-20 mA, 150 Ω, GPIO 2, URL C203G 0-20 kPa), escalamiento (ρ 1005 kg/m³, damping 2 s) y offset de carcasa H46 (7.5 mm) a sus valores por defecto.",
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

