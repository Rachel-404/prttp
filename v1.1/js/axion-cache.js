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
            valorActual: 1200
        },
        ph: {
            activo: true,
            frecuenciaSeg: 10,
            minNormal: 5.5,
            maxNormal: 6.5,
            tempMax: 24.0,
            valorActual: 6.1
        },
        ph_analogo: {
            activo: true,
            frecuenciaSeg: 10,
            minNormal: 5.5,
            maxNormal: 6.5,
            fuenteTemperatura: "pt100",
            voltajeNeutro: 1500.0,
            voltajeAcido: 2032.4,
            fechaInstalacion: "2026-10-05",
            canalAdc1: "GPIO4_ADC1",
            valorActual: 5.85
        },
        nivel_agua: {
            activo: true,
            frecuenciaSeg: 10,
            unidadPrincipal: "pct",
            nivelMinCm: 15,
            nivelMaxCm: 90,
            minNormal: 20,
            maxNormal: 90,
            valorActual: 85,
            litros: 350
        },
        temp_agua: {
            activo: true,
            frecuenciaSeg: 10,
            minNormal: 18.0,
            maxNormal: 24.0,
            compensarOtros: true,
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

    global.AxionCache = {
        PREFIJO,
        VALORES_DEFECTO,
        guardarEnCache,
        leerDeCache,
        restaurarClaveCache,
        limpiarCacheSistema
    };
})(window);

