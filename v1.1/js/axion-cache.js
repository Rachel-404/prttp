(function (global) {
    const PREFIJO = "axion_proto_";

    const VALORES_DEFECTO = {
        ec: {
            activo: true,
            frecuenciaSeg: 10,
            ecMinMs: 0.8,
            ecMaxMs: 1.8,
            tdsMin: 400,
            tdsMax: 900,
            minNormal: 800,
            maxNormal: 1800,
            sondaTempAsociada: "pt100",
            tempManualAtc: 25.0,
            factorCalibracionK: 1.0,
            atenuacionAdc: "11db",
            valorActual: 1200
        },
        ph: {
            activo: true,
            frecuenciaSeg: 10,
            minNormal: 5.5,
            maxNormal: 6.5,
            tempMax: 24.0,
            baudRate: 9600,
            slaveId: 1,
            calPh401: 1950,
            calPh700: 1500,
            calPh1001: 1050,
            valorActual: 6.1
        },
        nivel_agua: {
            activo: true,
            frecuenciaSeg: 10,
            unidadPrincipal: "pct",
            nivelMinCm: 15,
            nivelMaxCm: 90,
            minNormal: 20,
            maxNormal: 90,
            resistenciaShunt: 100,
            offset_cm: 0.0,
            valorActual: 85,
            litros: 350
        },
        temp_agua: {
            activo: true,
            frecuenciaSeg: 10,
            minNormal: 18.0,
            maxNormal: 24.0,
            compensarOtros: true,
            tipoConexion: "3_hilos",
            rrefOhmios: 430.0,
            valorActual: 21.5
        },
        dht22: {
            activo: true,
            frecuenciaSeg: 10,
            tempMin: 18.0,
            tempMax: 28.0,
            humMin: 50,
            humMax: 80
        },
        reles: {
            canales: [
                { canal: 1, nombre: "Electrobomba 1 (Recirculación Principal)", encendido: false },
                { canal: 2, nombre: "Electrobomba 2 (Dosificación / Oxigenación)", encendido: false },
                { canal: 3, nombre: "Electrobomba 3 (Llenado / Auxiliar)", encendido: false },
                { canal: 4, nombre: "Reflector (Iluminación del Cultivo)", encendido: false },
                { canal: 5, nombre: "Canal Reserva 1 (Disponible)", encendido: false },
                { canal: 6, nombre: "Canal Reserva 2 (Disponible)", encendido: false }
            ]
        },
        nodo_maestro: {
            ssid: "AXION_LAB_HIDROPONIA",
            bleActivo: true,
            asignacionIp: "dhcp",
            ipLocal: "192.168.1.120",
            mascara: "255.255.255.0",
            gateway: "192.168.1.1",
            dns: "8.8.8.8",
            protocolo: "mqtt",
            puerto: 8883,
            brokerUrl: "mqtts://broker.axion-iot.local",
            endpoint: "axion/hidroponia/telemetria",
            usuario: "esp32_nodo_01",
            habilitarTls: true,
            muestreoSeg: 2,
            envioSeg: 10,
            particionMb: 10,
            formatoBuffer: "cbor",
            loteTramas: 50,
            politicaDesbordamiento: "fifo"
        },
        tipografia: {
            titlePx: 24,
            subtitlePx: 18,
            basePx: 14,
            title: "24px",
            subtitle: "18px",
            base: "14px"
        },
        alertas: [
            {
                id: "alerta-1",
                nivel: "critico",
                titulo: "pH RS485 fuera de umbral",
                detalle: "Lectura: 6.85 pH (Máx: 6.50 pH)",
                tiempo: "Hace 14 min",
                leida: false,
                urlDestino: "views/sensores/ph/index.html"
            },
            {
                id: "alerta-2",
                nivel: "advertencia",
                titulo: "Desconexión temporal PT100",
                detalle: "Resistencia fuera de rango (Circuito abierto)",
                tiempo: "Hace 2 h",
                leida: false,
                urlDestino: "views/sensores/nivel-temperatura/index.html?tab=temperatura"
            },
            {
                id: "alerta-3",
                nivel: "normal",
                titulo: "Sincronización Buffer Offline",
                detalle: "142 tramas enviadas tras reconexión Wi-Fi",
                tiempo: "Ayer, 18:30",
                leida: true,
                urlDestino: "views/nodo-maestro/index.html"
            }
        ],
        auditoria: [
            {
                fechaHora: "16/11/2026 18:10:00",
                modulo: "pH RS485",
                parametro: "Umbral Máximo de pH",
                cambio: "6.50 pH → 6.80 pH",
                usuario: "Administrador Único"
            },
            {
                fechaHora: "16/11/2026 17:45:12",
                modulo: "Nivel y Temperatura",
                parametro: "Unidad Principal",
                cambio: "cm → kPa",
                usuario: "Administrador Único"
            },
            {
                fechaHora: "16/11/2026 16:20:05",
                modulo: "Nodo ESP32-S3",
                parametro: "Frecuencia de Envío",
                cambio: "15 s → 10 s",
                usuario: "Administrador Único"
            }
        ],
        retencion_backup: {
            frecuenciaProgramada: "diario",
            formatoEmpaquetado: "zip",
            diasRetencion: 365,
            accionVencimiento: "archivar"
        }
    };

    function clonar(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function guardarEnCache(clave, datos) {
        try {
            const previo = leerDeCache(clave, VALORES_DEFECTO[clave] || {});
            const combinado = Array.isArray(datos)
                ? datos
                : { ...previo, ...(datos && typeof datos === "object" ? datos : {}) };
            localStorage.setItem(`${PREFIJO}${clave}`, JSON.stringify(combinado));
            return combinado;
        } catch (err) {
            console.warn(`No se pudo guardar en caché (${clave}):`, err);
            return datos;
        }
    }

    function leerDeCache(clave, valoresPorDefecto) {
        const base = valoresPorDefecto !== undefined
            ? clonar(valoresPorDefecto)
            : clonar(VALORES_DEFECTO[clave] || {});
        try {
            const raw = localStorage.getItem(`${PREFIJO}${clave}`);
            if (!raw) return base;
            const parsed = JSON.parse(raw);
            if (Array.isArray(base) || Array.isArray(parsed)) {
                return parsed;
            }
            if (parsed && typeof parsed === "object") {
                return { ...base, ...parsed };
            }
            return base;
        } catch (err) {
            console.warn(`No se pudo leer de caché (${clave}):`, err);
            return base;
        }
    }

    function restaurarClaveCache(clave) {
        try {
            localStorage.removeItem(`${PREFIJO}${clave}`);
        } catch (err) {
            console.warn(`No se pudo restaurar caché (${clave}):`, err);
        }
        return clonar(VALORES_DEFECTO[clave] || {});
    }

    function limpiarCacheSistema() {
        try {
            Object.keys(localStorage).forEach((k) => {
                if (k.startsWith(PREFIJO)) {
                    localStorage.removeItem(k);
                }
            });
        } catch (err) {
            console.warn("No se pudo limpiar la caché del sistema:", err);
        }
    }

    function obtenerAuditoria(filtroModulo = "todos") {
        let lista = [];
        try {
            const raw = localStorage.getItem(`${PREFIJO}auditoria`);
            if (!raw) {
                lista = clonar(VALORES_DEFECTO.auditoria);
                localStorage.setItem(`${PREFIJO}auditoria`, JSON.stringify(lista));
            } else {
                const parsed = JSON.parse(raw);
                lista = Array.isArray(parsed) ? parsed : clonar(VALORES_DEFECTO.auditoria);
            }
        } catch (err) {
            lista = clonar(VALORES_DEFECTO.auditoria);
        }
        if (filtroModulo && filtroModulo !== "todos") {
            return lista.filter((item) => item.modulo === filtroModulo);
        }
        return lista;
    }

    function renderizarTablaAuditoria(tbodyId = "tbody-auditoria-sistema", filtroModulo = "todos") {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;
        const registros = obtenerAuditoria(filtroModulo);
        tbody.innerHTML = "";
        if (registros.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No hay registros de cambios para el módulo seleccionado.</td></tr>';
            return;
        }
        registros.forEach((item) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${item.fechaHora}</td>
                <td>${item.modulo}</td>
                <td>${item.parametro}</td>
                <td><strong>${item.cambio}</strong></td>
                <td>${item.usuario}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function registrarAuditoria(modulo, parametro, valorAnterior, valorNuevo) {
        if (String(valorAnterior) === String(valorNuevo)) return null;
        const ahora = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        const fechaHora = `${pad(ahora.getDate())}/${pad(ahora.getMonth() + 1)}/${ahora.getFullYear()} ${pad(ahora.getHours())}:${pad(ahora.getMinutes())}:${pad(ahora.getSeconds())}`;
        const registro = {
            fechaHora,
            modulo: String(modulo || "Sistema y Tipografía"),
            parametro: String(parametro || "Parámetro"),
            cambio: `${valorAnterior} → ${valorNuevo}`,
            usuario: "Administrador Único"
        };
        const actual = obtenerAuditoria("todos");
        actual.unshift(registro);
        const nuevaLista = actual.slice(0, 50);
        guardarEnCache("auditoria", nuevaLista);
        const selectFiltro = document.getElementById("filtro-auditoria-modulo");
        renderizarTablaAuditoria("tbody-auditoria-sistema", selectFiltro ? selectFiltro.value : "todos");
        document.dispatchEvent(new CustomEvent("axion:auditoriaActualizada", { detail: nuevaLista }));
        return registro;
    }

    function resolverTemperaturaAtc(fuente = "pt100", tempManual = 25.0) {
        if (fuente === "pt100") {
            const pt100 = leerDeCache("temp_agua");
            if (pt100 && pt100.activo === false) {
                return {
                    activa: false,
                    estado: "advertencia",
                    valor: 25.0,
                    origen: "Respaldo",
                    mensaje: "Advertencia: PT100 pausada · Usando temperatura de respaldo (25.0 °C)"
                };
            }
            const lectura = Number(pt100?.valorActual ?? 21.5);
            return {
                activa: true,
                estado: "normal",
                valor: lectura,
                origen: "PT100",
                mensaje: `Compensación térmica activa desde PT100 · Lectura actual: ${lectura.toFixed(1)} °C · Coeficiente: 2.0 %/°C`
            };
        }

        if (fuente === "sen0708") {
            const phRs485 = leerDeCache("ph");
            if (phRs485 && phRs485.activo === false) {
                return {
                    activa: false,
                    estado: "advertencia",
                    valor: 25.0,
                    origen: "Respaldo",
                    mensaje: "Fuente externa pausada · Aplicando compensación por defecto (25.0 °C)"
                };
            }
            return {
                activa: true,
                estado: "normal",
                valor: 23.5,
                origen: "SEN0708",
                mensaje: "Enlazado a sonda interna SEN0708 · Temperatura: 23.5 °C"
            };
        }

        const valFijo = Number.isFinite(Number(tempManual)) ? Number(tempManual) : 25.0;
        return {
            activa: true,
            estado: "normal",
            valor: valFijo,
            origen: "Fija",
            mensaje: `Temperatura manual fija activa · Valor aplicado: ${valFijo.toFixed(1)} °C`
        };
    }

    global.registrarAuditoria = registrarAuditoria;

    global.AxionCache = {
        PREFIJO,
        VALORES_DEFECTO,
        guardarEnCache,
        leerDeCache,
        restaurarClaveCache,
        limpiarCacheSistema,
        obtenerAuditoria,
        renderizarTablaAuditoria,
        registrarAuditoria,
        resolverTemperaturaAtc
    };
})(window);

