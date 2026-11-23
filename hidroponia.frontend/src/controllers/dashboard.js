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
                m: { sufijo: "m", factor: 0.0133, decimales: 2 }
            };

            const CONFIG_SENSORES = {
                ec: {
                    modulo: "ec",
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
                    formatearExtra: (valor, kVal) => `TDS Estimado: ${Math.round(valor * (kVal || 0.5))} ppm`
                },
                ph: {
                    modulo: "ph",
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
                    modulo: "nivel_agua",
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
                        Number.isFinite(litros)
                            ? `Volumen estimado: ${Math.round(litros)} Litros`
                            : `Nivel relativo: ${Math.round(porcentaje)} %`
                },
                tempAgua: {
                    modulo: "temp_agua",
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
                ec: { valor: null, kValue: 0.5, sondaTemp: "pt100", enLinea: true, estadoHw: "ok" },
                ph: { valor: null, enLinea: true, estadoHw: "ok" },
                nivel: { valor: null, valorPctCrudo: null, litros: null, capacidadLitros: 350, unidadPrincipal: "pct", enLinea: true, estadoHw: "ok" },
                tempAgua: { valor: null, tipoConexion: "3_hilos", compensarOtros: true, enLinea: true, estadoHw: "ok" },
                dht22: {
                    temperatura: null,
                    humedad: null,
                    enLinea: true,
                    estadoHw: "ok",
                    tempMin: 18.0,
                    tempMax: 28.0,
                    humMin: 50,
                    humMax: 80
                },
                esp32: {
                    conectado: false,
                    rssi: null,
                    ssid: null,
                    alimentacion: "--",
                    consumoMa: null,
                    bufferTramas: null,
                    ultimoTs: null,
                    muestreoSeg: 300,
                    envioSeg: 300
                },
                reles: []
            };

            function evaluarClaseColor(valor, cfg, enLinea) {
                if (!enLinea || !Number.isFinite(valor)) return "valor-critico";
                if (valor < cfg.minNormal || valor > cfg.maxNormal) return "valor-critico";
                const margen = Math.max(0.0001, cfg.maxNormal - cfg.minNormal) * 0.05;
                if (valor <= cfg.minNormal + margen || valor >= cfg.maxNormal - margen) return "valor-advertencia";
                return "valor-normal";
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

                const hw = estado.estadoHw || "ok";
                const esPausadoHw = hw === "pausado" || hw === "inactivo";
                const esPendiente = hw === "pendiente";
                const esErrorHw = hw === "error";
                const tieneValor = !esPausadoHw && !esPendiente && !esErrorHw && Number.isFinite(estado.valor);
                const claseColor = evaluarClaseColor(estado.valor, cfg, estado.enLinea);

                if (!estado.enLinea || esPausadoHw) {
                    actualizarBadgeEstado(elBadge, elTextoBadge, "sin-senal", "Pausado");
                } else if (esPendiente) {
                    actualizarBadgeEstado(elBadge, elTextoBadge, "sin-senal", "Pendiente");
                } else if (esErrorHw) {
                    actualizarBadgeEstado(elBadge, elTextoBadge, "sin-senal", "Error");
                } else if (!tieneValor) {
                    actualizarBadgeEstado(elBadge, elTextoBadge, "sin-senal", "Sin datos");
                } else if (claseColor === "valor-normal") {
                    actualizarBadgeEstado(elBadge, elTextoBadge, "conectado", "Normal");
                } else if (claseColor === "valor-advertencia") {
                    actualizarBadgeEstado(elBadge, elTextoBadge, "advertencia", "Advertencia");
                } else {
                    actualizarBadgeEstado(elBadge, elTextoBadge, "critico", "Crítico");
                }

                if (elValor) {
                    elValor.classList.remove("valor-normal", "valor-advertencia", "valor-critico");
                    if (estado.enLinea && tieneValor) {
                        elValor.classList.add(claseColor);
                        elValor.textContent = `${formatearNumero(estado.valor, cfg.decimales)} ${cfg.unidad}`;
                    } else {
                        elValor.textContent = `-- ${cfg.unidad}`;
                    }
                }

                if (elExtra && typeof cfg.formatearExtra === "function") {
                    if (estado.enLinea && tieneValor) {
                        const extraArg = clave === "ec" ? estado.kValue : estado.litros;
                        elExtra.textContent = cfg.formatearExtra(estado.valor, extraArg);
                    } else {
                        elExtra.textContent = clave === "ec" ? "TDS Estimado: -- ppm" : "Volumen estimado: --";
                    }
                }
            }

            function renderizarDiagnosticos() {
                const diagEc = document.getElementById("diag-ec");
                if (diagEc) {
                    const tempRef = estadoDashboard.tempAgua.enLinea && estadoDashboard.tempAgua.estadoHw === "ok" && Number.isFinite(estadoDashboard.tempAgua.valor)
                        ? `${estadoDashboard.tempAgua.valor.toFixed(1)} °C`
                        : "-- °C";
                    diagEc.textContent = `ATC ${estadoDashboard.ec.sondaTemp === "fijo25" ? "Fijo" : "PT100"} · ${tempRef}`;
                }
                const diagTemp = document.getElementById("diag-temp-agua");
                if (diagTemp) {
                    const hilos = String(estadoDashboard.tempAgua.tipoConexion || "3_hilos").replace("_", " ");
                    diagTemp.textContent = `PT100 / MAX31865 · ${hilos}`;
                }
                const extraTemp = document.getElementById("extra-temp-agua");
                if (extraTemp) {
                    extraTemp.textContent = estadoDashboard.tempAgua.compensarOtros
                        ? "Compensando pH y EC"
                        : "Compensación externa desactivada";
                }
            }

            function formatearTiempoRelativo(isoTs) {
                if (!isoTs) return "Sin registros";
                const ms = Date.now() - new Date(isoTs).getTime();
                if (!Number.isFinite(ms) || ms < 0) return "Hace instantes";
                const seg = Math.floor(ms / 1000);
                if (seg < 60) return seg === 1 ? "Hace 1 segundo" : `Hace ${seg} segundos`;
                const min = Math.floor(seg / 60);
                if (min < 60) return min === 1 ? "Hace 1 minuto" : `Hace ${min} minutos`;
                const horas = Math.floor(min / 60);
                if (horas < 24) return horas === 1 ? "Hace 1 hora" : `Hace ${horas} horas`;
                return new Date(isoTs).toLocaleString("es-PE");
            }

            function renderizarMicrocontrolador() {
                const esp = estadoDashboard.esp32;
                const elBadge = document.getElementById("badge-esp32");
                const elTextoBadge = document.getElementById("texto-badge-esp32");
                const elWifi = document.getElementById("wifi-esp32");
                const elAlimentacion = document.getElementById("alimentacion-esp32");
                const elActualizacion = document.getElementById("actualizacion-esp32");
                const elSubmetricaSistema = document.querySelector("#card-microcontrolador .submetricas-sistema");

                actualizarBadgeEstado(
                    elBadge,
                    elTextoBadge,
                    esp.conectado ? "conectado" : "sin-senal",
                    esp.conectado ? "Conectado" : "Sin señal"
                );

                if (elWifi) {
                    if (!esp.conectado) {
                        elWifi.textContent = "Sin conexión";
                    } else if (esp.rssi != null && esp.ssid) {
                        elWifi.textContent = `${esp.ssid} · ${esp.rssi} dBm`;
                    } else if (esp.rssi != null) {
                        elWifi.textContent = `${esp.rssi} dBm`;
                    } else {
                        elWifi.textContent = esp.ssid || "Conectado";
                    }
                }
                if (elAlimentacion) {
                    elAlimentacion.textContent = esp.alimentacion || "--";
                }
                if (elActualizacion) {
                    elActualizacion.textContent = formatearTiempoRelativo(esp.ultimoTs);
                }
                if (elSubmetricaSistema) {
                    const consumo = esp.consumoMa != null ? `${esp.consumoMa} mA` : "-- mA";
                    const buf = esp.bufferTramas != null ? `${esp.bufferTramas} tramas` : "--";
                    elSubmetricaSistema.textContent = `${consumo} · Muestreo ${esp.muestreoSeg}s · Buffer ${buf}`;
                }
            }

            function evaluarNivelMargen5(valor, min, max) {
                if (!Number.isFinite(valor) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 0;
                if (valor < min || valor > max) return 2;
                const margen = (max - min) * 0.05;
                if (valor <= min + margen || valor >= max - margen) return 1;
                return 0;
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

                const hw = d.estadoHw || "ok";
                if (!d.enLinea || hw === "pausado" || hw === "inactivo") {
                    actualizarBadgeEstado(elBadge, elTextoBadge, "sin-senal", "Pausado");
                    if (elTemp) {
                        elTemp.classList.remove("valor-normal", "valor-advertencia", "valor-critico");
                        elTemp.textContent = "-- °C";
                    }
                    if (elHum) elHum.textContent = "-- %";
                    return;
                }

                if (hw === "pendiente" || hw === "error") {
                    actualizarBadgeEstado(elBadge, elTextoBadge, "sin-senal", hw === "error" ? "Error" : "Pendiente");
                    if (elTemp) {
                        elTemp.classList.remove("valor-normal", "valor-advertencia", "valor-critico");
                        elTemp.textContent = "-- °C";
                    }
                    if (elHum) elHum.textContent = "-- %";
                    return;
                }

                if (!Number.isFinite(d.temperatura) || !Number.isFinite(d.humedad)) {
                    actualizarBadgeEstado(elBadge, elTextoBadge, "sin-senal", "Sin datos");
                    if (elTemp) elTemp.textContent = "-- °C";
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

            function renderizarEquiposDashboard() {
                estadoDashboard.reles.forEach((item) => {
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

            function renderizarTodo() {
                Object.keys(CONFIG_SENSORES).forEach(renderizarTarjetaSensor);
                renderizarDiagnosticos();
                renderizarTarjetaDht22();
                renderizarMicrocontrolador();
                renderizarEquiposDashboard();
            }

            function aplicarResumenDesdeBackend(res) {
                if (!res) return;
                const { ultimaLectura, sensores, reles, dispositivo } = res;

                if (Array.isArray(sensores)) {
                    sensores.forEach((s) => {
                        const params = s.parametrosTecnicos || {};
                        if (s.modulo === "ec") {
                            estadoDashboard.ec.enLinea = Boolean(s.activo);
                            if (Number.isFinite(Number(s.minNormal))) CONFIG_SENSORES.ec.minNormal = Number(s.minNormal);
                            if (Number.isFinite(Number(s.maxNormal))) CONFIG_SENSORES.ec.maxNormal = Number(s.maxNormal);
                            if (Number.isFinite(Number(params.kValue))) estadoDashboard.ec.kValue = Number(params.kValue);
                            if (params.sondaTempAsociada) estadoDashboard.ec.sondaTemp = params.sondaTempAsociada;
                        } else if (s.modulo === "ph") {
                            estadoDashboard.ph.enLinea = Boolean(s.activo);
                            if (Number.isFinite(Number(s.minNormal))) CONFIG_SENSORES.ph.minNormal = Number(s.minNormal);
                            if (Number.isFinite(Number(s.maxNormal))) CONFIG_SENSORES.ph.maxNormal = Number(s.maxNormal);
                        } else if (s.modulo === "nivel_agua") {
                            estadoDashboard.nivel.enLinea = Boolean(s.activo);
                            if (Number.isFinite(Number(params.litros))) {
                                estadoDashboard.nivel.capacidadLitros = Number(params.litros);
                            }
                            const unidadKey = params.unidadPrincipal && UNIDADES_NIVEL[params.unidadPrincipal] ? params.unidadPrincipal : "pct";
                            estadoDashboard.nivel.unidadPrincipal = unidadKey;
                            const u = UNIDADES_NIVEL[unidadKey];
                            CONFIG_SENSORES.nivel.unidad = u.sufijo;
                            CONFIG_SENSORES.nivel.decimales = u.decimales;
                            if (Number.isFinite(Number(s.minNormal))) CONFIG_SENSORES.nivel.minNormal = Number((Number(s.minNormal) * (unidadKey === "pct" ? 1 : u.factor)).toFixed(u.decimales));
                            if (Number.isFinite(Number(s.maxNormal))) CONFIG_SENSORES.nivel.maxNormal = Number((Number(s.maxNormal) * (unidadKey === "pct" ? 1 : u.factor)).toFixed(u.decimales));
                        } else if (s.modulo === "temp_agua") {
                            estadoDashboard.tempAgua.enLinea = Boolean(s.activo);
                            if (Number.isFinite(Number(s.minNormal))) CONFIG_SENSORES.tempAgua.minNormal = Number(s.minNormal);
                            if (Number.isFinite(Number(s.maxNormal))) CONFIG_SENSORES.tempAgua.maxNormal = Number(s.maxNormal);
                            if (params.tipoConexion) estadoDashboard.tempAgua.tipoConexion = params.tipoConexion;
                            if (typeof params.compensarOtros === "boolean") estadoDashboard.tempAgua.compensarOtros = params.compensarOtros;
                        } else if (s.modulo === "dht22") {
                            estadoDashboard.dht22.enLinea = Boolean(s.activo);
                            if (Number.isFinite(Number(params.tempMin ?? s.minNormal))) estadoDashboard.dht22.tempMin = Number(params.tempMin ?? s.minNormal);
                            if (Number.isFinite(Number(params.tempMax ?? s.maxNormal))) estadoDashboard.dht22.tempMax = Number(params.tempMax ?? s.maxNormal);
                            if (Number.isFinite(Number(params.humMin))) estadoDashboard.dht22.humMin = Number(params.humMin);
                            if (Number.isFinite(Number(params.humMax))) estadoDashboard.dht22.humMax = Number(params.humMax);
                        }
                    });
                }

                if (ultimaLectura) {
                    const estHw = ultimaLectura.estadoSensores || {};
                    estadoDashboard.ec.estadoHw = String(estHw.tds || "ok").toLowerCase();
                    estadoDashboard.ph.estadoHw = String(estHw.ph || "ok").toLowerCase();
                    estadoDashboard.nivel.estadoHw = String(estHw.nivel || "ok").toLowerCase();
                    estadoDashboard.tempAgua.estadoHw = String(estHw.pt100 || "ok").toLowerCase();
                    estadoDashboard.dht22.estadoHw = String(estHw.dht22 || "ok").toLowerCase();

                    if (ultimaLectura.ecUsCm != null) estadoDashboard.ec.valor = Number(ultimaLectura.ecUsCm);
                    if (ultimaLectura.ph != null) estadoDashboard.ph.valor = Number(ultimaLectura.ph);
                    if (ultimaLectura.nivelPct != null) {
                        estadoDashboard.nivel.valorPctCrudo = Number(ultimaLectura.nivelPct);
                        const u = UNIDADES_NIVEL[estadoDashboard.nivel.unidadPrincipal] || UNIDADES_NIVEL.pct;
                        estadoDashboard.nivel.valor = Number((estadoDashboard.nivel.valorPctCrudo * u.factor).toFixed(u.decimales));
                    }
                    if (estadoDashboard.nivel.estadoHw === "ok" && ultimaLectura.nivelPct != null) {
                        estadoDashboard.nivel.litros = ultimaLectura.volumenL != null
                            ? Number(ultimaLectura.volumenL)
                            : (Number(ultimaLectura.nivelPct) / 100) * (estadoDashboard.nivel.capacidadLitros || 350);
                    } else {
                        estadoDashboard.nivel.litros = null;
                    }
                    if (ultimaLectura.tempAguaC != null) {
                        estadoDashboard.tempAgua.valor = Number(ultimaLectura.tempAguaC);
                        if (cache) cache.guardarEnCache("temp_agua", { valorActual: estadoDashboard.tempAgua.valor });
                    }
                    if (ultimaLectura.tempAmbC != null) estadoDashboard.dht22.temperatura = Number(ultimaLectura.tempAmbC);
                    if (ultimaLectura.humAmbPct != null) estadoDashboard.dht22.humedad = Number(ultimaLectura.humAmbPct);
                    if (ultimaLectura.ts) estadoDashboard.esp32.ultimoTs = ultimaLectura.ts;
                }

                if (Array.isArray(reles)) {
                    estadoDashboard.reles = reles.map((r) => ({
                        canal: r.canal,
                        nombre: String(r.nombre || `Canal ${r.canal}`).replace(/\s*\([^()]+\)/g, ""),
                        encendido: Boolean(r.encendido)
                    }));
                }

                if (dispositivo) {
                    estadoDashboard.esp32.conectado = Boolean(dispositivo.conectado);
                    estadoDashboard.esp32.rssi = dispositivo.rssi;
                    estadoDashboard.esp32.ssid = dispositivo.configRedMqtt?.ssid || null;
                    estadoDashboard.esp32.alimentacion = dispositivo.alimentacion || "--";
                    estadoDashboard.esp32.consumoMa = dispositivo.consumoMa;
                    estadoDashboard.esp32.bufferTramas = dispositivo.bufferTramas;
                    if (dispositivo.ultimoHeartbeat) estadoDashboard.esp32.ultimoTs = dispositivo.ultimoHeartbeat;
                    if (dispositivo.configBuffer?.muestreoSeg) estadoDashboard.esp32.muestreoSeg = Number(dispositivo.configBuffer.muestreoSeg);
                    if (dispositivo.configBuffer?.envioSeg) estadoDashboard.esp32.envioSeg = Number(dispositivo.configBuffer.envioSeg);
                }

                renderizarTodo();
            }

            async function cargarResumenBackend() {
                if (!window.AxionApi) return;
                try {
                    const res = await window.AxionApi.get("/dashboard/resumen");
                    aplicarResumenDesdeBackend(res);
                } catch {
                    // Mantener estado sin datos si el backend no responde
                }
            }

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

            document.addEventListener("dashboard:actualizarLecturas", () => {
                cargarResumenBackend();
            });

            renderizarTodo();
            cargarResumenBackend();
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
