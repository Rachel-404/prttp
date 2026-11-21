const API_BASE_URL =
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
    "http://localhost:8080/api/v1";

(function (global) {
    const PREFIJO = "axion_proto_";

    const VALORES_DEFECTO = {
        ec: {
            activo: true,
            frecuenciaSeg: 300,
            ecMinMs: 0.8,
            ecMaxMs: 1.8,
            tdsMin: 400,
            tdsMax: 900,
            minNormal: 800,
            maxNormal: 1800,
            sondaTempAsociada: "pt100",
            coeficienteTermico: 0.02,
            tempManualAtc: 25.0,
            factorCalibracionK: 1.0,
            kValue: 0.5,
            atenuacionAdc: "11db"
        },
        ph: {
            activo: true,
            frecuenciaSeg: 300,
            minNormal: 5.5,
            maxNormal: 6.5,
            baudRate: 9600,
            slaveId: 1,
            calPh400: 4.0,
            calPh686: 6.86,
            calPh918: 9.18
        },
        nivel_agua: {
            activo: true,
            frecuenciaSeg: 300,
            unidadPrincipal: "pct",
            nivelMinCm: 15,
            nivelMaxCm: 90,
            minNormal: 20,
            maxNormal: 90,
            resistenciaShunt: 100,
            offset_cm: 0.0
        },
        temp_agua: {
            activo: true,
            frecuenciaSeg: 300,
            minNormal: 18.0,
            maxNormal: 24.0,
            compensarOtros: true,
            tipoConexion: "3_hilos",
            rrefOhmios: 430.0,
            filtroRed: "60Hz"
        },
        dht22: {
            activo: true,
            frecuenciaSeg: 300,
            tempMin: 18.0,
            tempMax: 28.0,
            humMin: 50,
            humMax: 80
        },
        tipografia: {
            titlePx: 24,
            subtitlePx: 18,
            basePx: 14,
            title: "24px",
            subtitle: "18px",
            base: "14px"
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

    function resolverTemperaturaAtc(fuente = "pt100", tempManual = 25.0, lecturaRealPt100 = null) {
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
            const lectura = Number.isFinite(Number(lecturaRealPt100))
                ? Number(lecturaRealPt100)
                : Number.isFinite(Number(pt100?.valorActual))
                    ? Number(pt100.valorActual)
                    : null;
            if (lectura === null) {
                return {
                    activa: true,
                    estado: "normal",
                    valor: null,
                    origen: "PT100",
                    mensaje: "Compensación térmica enlazada a PT100 · Esperando lectura del controlador"
                };
            }
            return {
                activa: true,
                estado: "normal",
                valor: lectura,
                origen: "PT100",
                mensaje: `Compensación térmica activa desde PT100 · Lectura actual: ${lectura.toFixed(1)} °C`
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

    global.AxionCache = {
        API_BASE_URL,
        PREFIJO,
        VALORES_DEFECTO,
        guardarEnCache,
        leerDeCache,
        restaurarClaveCache,
        limpiarCacheSistema,
        resolverTemperaturaAtc
    };
})(window);
