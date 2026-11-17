export default function initController() {
    const __docListeners = [];
    const __winListeners = [];
    const __observers = [];
    const __origDocAdd = document.addEventListener.bind(document);
    const __origWinAdd = window.addEventListener.bind(window);
    const __OrigMO = window.MutationObserver;

    const __docProxy = (type, fn, opts) => {
        __docListeners.push([type, fn, opts]);
        return __origDocAdd(type, fn, opts);
    };
    const __winProxy = (type, fn, opts) => {
        __winListeners.push([type, fn, opts]);
        return __origWinAdd(type, fn, opts);
    };
    class __TrackedMO extends __OrigMO {
        constructor(cb) {
            super(cb);
            __observers.push(this);
        }
    }

    document.addEventListener = __docProxy;
    window.addEventListener = __winProxy;
    window.MutationObserver = __TrackedMO;

    try {
        (function () {

    const cache = window.AxionCache;

    const UNIDADES_NIVEL = {
        pct: { sufijo: "%", factor: 1, decimales: 0 },
        cm: { sufijo: "cm", factor: 1, decimales: 0 },
        L: { sufijo: "L", factor: 4.12, decimales: 0 },
        kPa: { sufijo: "kPa", factor: 0.124, decimales: 2 },
        MPa: { sufijo: "MPa", factor: 0.000124, decimales: 4 },
        mH2O: { sufijo: "mH2O", factor: 0.0126, decimales: 2 },
        mmH2O: { sufijo: "mmH2O", factor: 12.6, decimales: 0 },
        inH2O: { sufijo: "inH2O", factor: 0.496, decimales: 1 },
        m: { sufijo: "m", factor: 0.0133, decimales: 2 },
        mm: { sufijo: "mm", factor: 13.3, decimales: 0 }
    };

    const CONFIG_SENSORES = {
        ec: {
            claveCache: "ec",
            minNormal: 800,
            maxNormal: 1800,
            margenAdvertencia: 200,
            unidad: "µS/cm",
            decimales: 0,
            idValor: "valor-ec",
            idRef: "ref-ec",
            idBadge: "badge-ec",
            idTextoBadge: "texto-badge-ec",
            idExtra: "extra-ec",
            formatearExtra: (valor) => `TDS Estimado: ${Math.round(valor * 0.5)} ppm`
        },
        ph: {
            claveCache: "ph",
            minNormal: 5.5,
            maxNormal: 6.5,
            margenAdvertencia: 0.3,
            unidad: "pH",
            decimales: 2,
            idValor: "valor-ph",
            idRef: "ref-ph",
            idBadge: "badge-ph",
            idTextoBadge: "texto-badge-ph",
            idExtra: "extra-ph"
        },
        nivel: {
            claveCache: "nivel_agua",
            minNormal: 20,
            maxNormal: 90,
            margenAdvertencia: 5,
            unidad: "%",
            decimales: 0,
            idValor: "valor-nivel",
            idRef: "ref-nivel",
            idBadge: "badge-nivel",
            idTextoBadge: "texto-badge-nivel",
            idExtra: "extra-nivel",
            formatearExtra: (porcentaje, litros) =>
                `Volumen estimado: ${Number.isFinite(litros) ? Math.round(litros) : Math.round((porcentaje / 85) * 350)} Litros`
        },
        tempAgua: {
            claveCache: "temp_agua",
            minNormal: 18.0,
            maxNormal: 24.0,
            margenAdvertencia: 1.5,
            unidad: "°C",
            decimales: 1,
            idValor: "valor-temp-agua",
            idRef: "ref-temp-agua",
            idBadge: "badge-temp-agua",
            idTextoBadge: "texto-badge-temp-agua",
            idExtra: "extra-temp-agua"
        }
    };

    const estadoDashboard = {
        ec: { valor: 1200, enLinea: true },
        ph: { valor: 6.1, enLinea: true },
        nivel: { valor: 85, litros: 350, enLinea: true },
        tempAgua: { valor: 21.5, enLinea: true },
        dht22: {
            temperatura: 24.5,
            humedad: 65.2,
            enLinea: true,
            tempMin: 18.0,
            tempMax: 28.0,
            humMin: 50,
            humMax: 80
        },
        esp32: {
            conectado: true,
            wifiTexto: "Excelente (-58 dBm)",
            alimentacion: "5V USB-C",
            segundosDesdeActualizacion: 2,
            muestreoSeg: 2,
            envioSeg: 10
        }
    };

    function cargarConfiguracionDesdeCache() {
        if (!cache) return;

        Object.keys(CONFIG_SENSORES).forEach((clave) => {
            const cfg = CONFIG_SENSORES[clave];
            const guardado = cache.leerDeCache(cfg.claveCache);
            if (!guardado) return;

            if (typeof guardado.activo === "boolean") {
                estadoDashboard[clave].enLinea = guardado.activo;
            }
            if (Number.isFinite(Number(guardado.minNormal))) {
                cfg.minNormal = Number(guardado.minNormal);
            }
            if (Number.isFinite(Number(guardado.maxNormal))) {
                cfg.maxNormal = Number(guardado.maxNormal);
            }

            if (clave === "nivel" && guardado.unidadPrincipal && UNIDADES_NIVEL[guardado.unidadPrincipal]) {
                const u = UNIDADES_NIVEL[guardado.unidadPrincipal];
                cfg.unidad = u.sufijo;
                cfg.decimales = u.decimales;
                const baseValor = Number(guardado.valorActual ?? 85);
                estadoDashboard.nivel.valor = Number((baseValor * u.factor).toFixed(u.decimales));
                if (guardado.unidadPrincipal !== "pct") {
                    cfg.minNormal = Number((Number(guardado.nivelMinCm ?? 15) * u.factor).toFixed(u.decimales));
                    cfg.maxNormal = Number((Number(guardado.nivelMaxCm ?? 90) * u.factor).toFixed(u.decimales));
                    cfg.margenAdvertencia = Math.max(1, (cfg.maxNormal - cfg.minNormal) * 0.1);
                }
            }
        });

        const nodo = cache.leerDeCache("nodo_maestro");
        if (nodo) {
            estadoDashboard.esp32.wifiTexto = nodo.ssid ? `${nodo.ssid} (-58 dBm)` : "Excelente (-58 dBm)";
            estadoDashboard.esp32.muestreoSeg = Number(nodo.muestreoSeg || 2);
            estadoDashboard.esp32.envioSeg = Number(nodo.envioSeg || 10);
        }

        const cfgDht = cache.leerDeCache("dht22");
        if (cfgDht) {
            if (typeof cfgDht.activo === "boolean") estadoDashboard.dht22.enLinea = cfgDht.activo;
            if (Number.isFinite(Number(cfgDht.tempMin))) estadoDashboard.dht22.tempMin = Number(cfgDht.tempMin);
            if (Number.isFinite(Number(cfgDht.tempMax))) estadoDashboard.dht22.tempMax = Number(cfgDht.tempMax);
            if (Number.isFinite(Number(cfgDht.humMin))) estadoDashboard.dht22.humMin = Number(cfgDht.humMin);
            if (Number.isFinite(Number(cfgDht.humMax))) estadoDashboard.dht22.humMax = Number(cfgDht.humMax);
        }

        if (typeof cache.resolverTemperaturaAtc === "function") {
            const cfgEc = cache.leerDeCache("ec");
            const atcEc = cache.resolverTemperaturaAtc(cfgEc.sondaTempAsociada || "pt100", cfgEc.tempManualAtc ?? 25.0);
            const subEc = document.querySelector("#card-ec .submetricas-tecnicas");
            if (subEc) {
                subEc.textContent = `1.184 V · 1469 Raw · ${atcEc.valor.toFixed(1)} °C (${atcEc.origen})`;
            }
        }
    }

    function evaluarClaseColor(valor, cfg, enLinea) {
        if (!enLinea || !Number.isFinite(valor)) {
            return "valor-critico";
        }
        if (valor >= cfg.minNormal && valor <= cfg.maxNormal) {
            return "valor-normal";
        }
        const limiteInfCritico = cfg.minNormal - cfg.margenAdvertencia;
        const limiteSupCritico = cfg.maxNormal + cfg.margenAdvertencia;
        if (valor >= limiteInfCritico && valor <= limiteSupCritico) {
            return "valor-advertencia";
        }
        return "valor-critico";
    }

    function actualizarBadgeEstado(elBadge, elTexto, estadoBadge, texto) {
        if (!elBadge || !elTexto) return;
        elBadge.classList.remove("conectado", "advertencia", "critico", "sin-senal");
        elBadge.classList.add(estadoBadge);
        elTexto.textContent = texto;
    }

    function formatearNumero(valor, decimales) {
        return decimales > 0 ? Number(valor).toFixed(decimales) : String(Math.round(valor));
    }

    function renderizarTarjetaSensor(clave) {
        const cfg = CONFIG_SENSORES[clave];
        const estado = estadoDashboard[clave];
        if (!cfg || !estado) return;

        const elValor = document.getElementById(cfg.idValor);
        const elRef = document.getElementById(cfg.idRef);
        const elBadge = document.getElementById(cfg.idBadge);
        const elTextoBadge = document.getElementById(cfg.idTextoBadge);
        const elExtra = document.getElementById(cfg.idExtra);

        if (elRef) {
            const minTxt = formatearNumero(cfg.minNormal, cfg.decimales);
            const maxTxt = formatearNumero(cfg.maxNormal, cfg.decimales);
            const prefijo = clave === "nivel" ? "Nivel normal" : "Rango normal";
            elRef.textContent = `${prefijo}: ${minTxt} - ${maxTxt} ${cfg.unidad}`;
        }

        const claseColor = evaluarClaseColor(estado.valor, cfg, estado.enLinea);

        if (!estado.enLinea) {
            actualizarBadgeEstado(elBadge, elTextoBadge, "sin-senal", "Pausado");
        } else if (claseColor === "valor-normal") {
            actualizarBadgeEstado(elBadge, elTextoBadge, "conectado", "Normal");
        } else if (claseColor === "valor-advertencia") {
            actualizarBadgeEstado(elBadge, elTextoBadge, "advertencia", "Advertencia");
        } else {
            actualizarBadgeEstado(elBadge, elTextoBadge, "critico", "Crítico");
        }

        if (elValor) {
            elValor.classList.remove("valor-normal", "valor-advertencia", "valor-critico");
            elValor.classList.add(claseColor);

            if (!estado.enLinea || !Number.isFinite(estado.valor)) {
                elValor.textContent = `-- ${cfg.unidad}`;
            } else {
                const numeroFormateado = formatearNumero(estado.valor, cfg.decimales);
                elValor.textContent = `${numeroFormateado} ${cfg.unidad}`;
            }
        }

        if (elExtra && typeof cfg.formatearExtra === "function" && estado.enLinea && Number.isFinite(estado.valor)) {
            elExtra.textContent = cfg.formatearExtra(estado.valor, estado.litros);
        }
    }

    function renderizarMicrocontrolador() {
        const esp = estadoDashboard.esp32;
        const elBadge = document.getElementById("badge-esp32");
        const elTextoBadge = document.getElementById("texto-badge-esp32");
        const elWifi = document.getElementById("wifi-esp32");
        const elAlimentacion = document.getElementById("alimentacion-esp32");
        const elActualizacion = document.getElementById("actualizacion-esp32");
        const elSubmetricaSistema = document.querySelector("#card-microcontrolador .submetricas-sistema");

        actualizarBadgeEstado(elBadge, elTextoBadge, esp.conectado ? "conectado" : "sin-senal", esp.conectado ? "Conectado" : "Sin Señal");

        if (elWifi) {
            elWifi.textContent = esp.conectado ? esp.wifiTexto : "Sin conexión";
        }
        if (elAlimentacion) {
            elAlimentacion.textContent = esp.alimentacion;
        }
        if (elActualizacion) {
            const seg = Math.max(0, Math.round(esp.segundosDesdeActualizacion));
            elActualizacion.textContent = seg === 1 ? "Hace 1 segundo" : `Hace ${seg} segundos`;
        }
        if (elSubmetricaSistema) {
            elSubmetricaSistema.textContent = `160 mA · Muestreo ${esp.muestreoSeg}s / Envío ${esp.envioSeg}s · Buffer 0%`;
        }
    }

    function evaluarNivelMargen5(valor, min, max) {
        if (!Number.isFinite(valor) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 0;
        if (valor < min || valor > max) return 2; // Crítico
        const margen = (max - min) * 0.05;
        if (valor <= min + margen || valor >= max - margen) return 1; // Advertencia
        return 0; // Normal
    }

    function renderizarTarjetaDht22() {
        const d = estadoDashboard.dht22;
        const elTemp = document.getElementById("val-temp-amb");
        const elHum = document.getElementById("val-hum-amb");
        const elBadge = document.getElementById("badge-dht22");
        const elTextoBadge = document.getElementById("texto-badge-dht22");
        const elExtra = document.getElementById("extra-dht22");

        if (elExtra) {
            elExtra.textContent = `Aire: ${d.tempMin.toFixed(1)} – ${d.tempMax.toFixed(1)} °C · Humedad: ${Math.round(d.humMin)} – ${Math.round(d.humMax)} %`;
        }

        if (!d.enLinea) {
            actualizarBadgeEstado(elBadge, elTextoBadge, "sin-senal", "Pausado");
            if (elTemp) {
                elTemp.classList.remove("valor-normal", "valor-advertencia", "valor-critico");
                elTemp.classList.add("valor-critico");
                elTemp.textContent = "-- °C";
            }
            if (elHum) elHum.textContent = "-- %";
            return;
        }

        const nivelTemp = evaluarNivelMargen5(d.temperatura, d.tempMin, d.tempMax);
        const nivelHum = evaluarNivelMargen5(d.humedad, d.humMin, d.humMax);
        const peorNivel = Math.max(nivelTemp, nivelHum);

        const claseValor = peorNivel === 2 ? "valor-critico" : peorNivel === 1 ? "valor-advertencia" : "valor-normal";
        const claseBadge = peorNivel === 2 ? "critico" : peorNivel === 1 ? "advertencia" : "conectado";
        const textoBadge = peorNivel === 2 ? "Crítico" : peorNivel === 1 ? "Advertencia" : "Óptimo";

        actualizarBadgeEstado(elBadge, elTextoBadge, claseBadge, textoBadge);
        if (elTemp) {
            elTemp.classList.remove("valor-normal", "valor-advertencia", "valor-critico");
            elTemp.classList.add(claseValor);
            elTemp.textContent = `${Number(d.temperatura).toFixed(1)} °C`;
        }
        if (elHum) {
            elHum.textContent = `${Number(d.humedad).toFixed(1)} %`;
        }
    }

    function renderizarTodo() {
        cargarConfiguracionDesdeCache();
        Object.keys(CONFIG_SENSORES).forEach(renderizarTarjetaSensor);
        renderizarTarjetaDht22();
        renderizarMicrocontrolador();
    }

    function actualizarDashboardAxion(nuevosDatos = {}) {
        Object.keys(CONFIG_SENSORES).forEach((clave) => {
            if (nuevosDatos[clave] && typeof nuevosDatos[clave] === "object") {
                estadoDashboard[clave] = {
                    ...estadoDashboard[clave],
                    ...nuevosDatos[clave]
                };
            }
        });

        if (nuevosDatos.dht22 && typeof nuevosDatos.dht22 === "object") {
            estadoDashboard.dht22 = {
                ...estadoDashboard.dht22,
                ...nuevosDatos.dht22
            };
        }

        if (nuevosDatos.esp32 && typeof nuevosDatos.esp32 === "object") {
            estadoDashboard.esp32 = {
                ...estadoDashboard.esp32,
                ...nuevosDatos.esp32
            };
        }

        renderizarTodo();
    }

    window.actualizarDashboardAxion = actualizarDashboardAxion;

    document.addEventListener("dashboard:actualizarLecturas", (e) => {
        if (e.detail) actualizarDashboardAxion(e.detail);
    });

    const CLAVE_RELES_ESTADO = "axion_reles_estado";
    const ESTADOS_RELES_DEFAULT = [
        { canal: 1, nombre: "Electrobomba 1 (Recirculación Principal)", encendido: false },
        { canal: 2, nombre: "Electrobomba 2 (Dosificación / Oxigenación)", encendido: false },
        { canal: 3, nombre: "Electrobomba 3 (Llenado / Auxiliar)", encendido: false },
        { canal: 4, nombre: "Reflector (Iluminación del Cultivo)", encendido: false },
        { canal: 5, nombre: "Canal Reserva 1 (Disponible)", encendido: false },
        { canal: 6, nombre: "Canal Reserva 2 (Disponible)", encendido: false }
    ];

    function renderizarEquiposDashboard() {
        let canales = ESTADOS_RELES_DEFAULT;
        if (cache) {
            const cacheReles = cache.leerDeCache("reles");
            if (Array.isArray(cacheReles.canales) && cacheReles.canales.length === 6) {
                canales = cacheReles.canales;
            }
        }
        try {
            const raw = localStorage.getItem(CLAVE_RELES_ESTADO);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed.canales) && parsed.canales.length === 6) {
                    canales = parsed.canales;
                }
            }
        } catch (err) {
            console.warn("No se pudo leer el estado de relés:", err);
        }

        canales.forEach((item) => {
            const badge = document.getElementById(`dash-estado-rele-${item.canal}`);
            const fila = document.querySelector(`.item-equipo[data-canal="${item.canal}"] .nombre-equipo`);
            if (fila && item.nombre) {
                fila.textContent = `${item.canal}. ${item.nombre}`;
            }
            if (!badge) return;
            const activo = Boolean(item.encendido);
            badge.classList.toggle("encendido", activo);
            badge.classList.toggle("apagado", !activo);
            const txt = badge.querySelector(".texto-estado-equipo");
            if (txt) txt.textContent = activo ? "Encendido" : "Apagado";
        });
    }

    window.addEventListener("storage", (e) => {
        if (!e.key) return;
        if (e.key === CLAVE_RELES_ESTADO || e.key === `${cache?.PREFIJO || "axion_proto_"}reles`) {
            renderizarEquiposDashboard();
        }
        if (e.key.startsWith(cache?.PREFIJO || "axion_proto_")) {
            renderizarTodo();
        }
    });

    const esAdmin = Boolean(window.AxionAuth && window.AxionAuth.esAdministrador());
    const enlaceGestionarEquipos = document.querySelector(".enlace-gestionar-equipos");
    if (enlaceGestionarEquipos) {
        enlaceGestionarEquipos.hidden = !esAdmin;
    }

    const rutasTarjetasAdmin = [
        ["card-ec", "/sensores/ec"],
        ["card-ph", "/sensores/ph"],
        ["card-nivel", "/sensores/nivel-temperatura?tab=nivel"],
        ["card-temp-agua", "/sensores/nivel-temperatura?tab=temperatura"],
        ["card-dht22", "/sensores/temperatura-humedad"],
        ["card-microcontrolador", "/nodo-maestro"]
    ];

    rutasTarjetasAdmin.forEach(([id, ruta]) => {
        const card = document.getElementById(id);
        if (!card) return;
        const linkInterno = card.querySelector("h3 a");
        if (esAdmin) {
            card.style.cursor = "pointer";
            card.addEventListener("click", (e) => {
                if (!e.target.closest("a")) {
                    if (typeof window.AxionNavigate === "function") {
                        window.AxionNavigate(ruta);
                    } else {
                        window.location.href = ruta;
                    }
                }
            });
        } else if (linkInterno) {
            linkInterno.removeAttribute("href");
            linkInterno.style.cursor = "default";
        }
    });

    renderizarEquiposDashboard();
    renderizarTodo();

        })();
    } finally {
        document.addEventListener = __origDocAdd;
        window.addEventListener = __origWinAdd;
        window.MutationObserver = __OrigMO;
    }

    return () => {
        __docListeners.forEach(([t, fn, opts]) => document.removeEventListener(t, fn, opts));
        __winListeners.forEach(([t, fn, opts]) => window.removeEventListener(t, fn, opts));
        __observers.forEach((obs) => obs.disconnect());
    };
}
