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
            const canvas = document.getElementById("grafica-tendencias");
            const selector = document.getElementById("selector-tendencia");
            const contenedorLeyenda = document.getElementById("leyenda-tendencias");
            const inputFechaInicio = document.getElementById("tendencia-fecha-inicio");
            const inputHoraInicio = document.getElementById("tendencia-hora-inicio");
            const inputFechaFin = document.getElementById("tendencia-fecha-fin");
            const inputHoraFin = document.getElementById("tendencia-hora-fin");

            if (!canvas || !selector || typeof Chart === "undefined") return;

            const CONFIG_SERIES = {
                ph: {
                    tituloEje: "pH",
                    sugeridoMin: 5.5,
                    sugeridoMax: 6.5,
                    label: "pH del Agua",
                    unidad: "pH",
                    decimales: 2,
                    color: "#10b981",
                    fillColor: "rgba(16, 185, 129, 0.14)"
                },
                ec: {
                    tituloEje: "EC (µS/cm)",
                    sugeridoMin: 800,
                    sugeridoMax: 1800,
                    label: "Conductividad Eléctrica",
                    unidad: "µS/cm",
                    decimales: 0,
                    color: "#f59e0b",
                    fillColor: "rgba(245, 158, 11, 0.12)"
                },
                temp_agua: {
                    tituloEje: "Temperatura del Agua (°C)",
                    sugeridoMin: 18,
                    sugeridoMax: 24,
                    label: "Temperatura del Agua",
                    unidad: "°C",
                    decimales: 1,
                    color: "#10b981",
                    fillColor: "rgba(16, 185, 129, 0.14)"
                },
                temp_ambiente: {
                    tituloEje: "Temperatura Ambiente (°C)",
                    sugeridoMin: 18,
                    sugeridoMax: 28,
                    label: "Temperatura Ambiente",
                    unidad: "°C",
                    decimales: 1,
                    color: "#f59e0b",
                    fillColor: "rgba(245, 158, 11, 0.12)"
                },
                humedad_ambiente: {
                    tituloEje: "Humedad Relativa (%)",
                    sugeridoMin: 45,
                    sugeridoMax: 85,
                    label: "Humedad Relativa",
                    unidad: "%",
                    decimales: 1,
                    color: "#38bdf8",
                    fillColor: "rgba(56, 189, 248, 0.14)"
                },
                nivel_agua: {
                    tituloEje: "Nivel (%)",
                    sugeridoMin: 0,
                    sugeridoMax: 100,
                    label: "Nivel del Tanque",
                    unidad: "%",
                    decimales: 0,
                    color: "#22c55e",
                    fillColor: "rgba(34, 197, 94, 0.14)"
                }
            };

            let graficaInstancia = null;

            function obtenerColoresTema() {
                const esTemaClaro = document.body.classList.contains("tema-claro");
                return {
                    texto: esTemaClaro ? "#334155" : "#cbd5e1",
                    grid: esTemaClaro ? "rgba(15, 23, 42, 0.08)" : "rgba(148, 163, 184, 0.12)",
                    tooltipBg: esTemaClaro ? "#1e293b" : "#0f172a",
                    tooltipBorder: esTemaClaro ? "#475569" : "#334155"
                };
            }

            function construirQueryRango() {
                const params = new URLSearchParams();
                if (inputFechaInicio && inputFechaInicio.value) {
                    const horaIni = inputHoraInicio?.value || "00:00";
                    const dIni = new Date(`${inputFechaInicio.value}T${horaIni}:00`);
                    if (!Number.isNaN(dIni.getTime())) params.set("inicio", dIni.toISOString());
                }
                if (inputFechaFin && inputFechaFin.value) {
                    const horaFin = inputHoraFin?.value || "23:59";
                    const dFin = new Date(`${inputFechaFin.value}T${horaFin}:59`);
                    if (!Number.isNaN(dFin.getTime())) params.set("fin", dFin.toISOString());
                }
                return params.toString();
            }

            function renderizarLeyenda(cfg, totalPuntos, errorMsg) {
                if (!contenedorLeyenda) return;
                contenedorLeyenda.innerHTML = "";

                const item = document.createElement("div");
                item.className = "item-leyenda";

                const punto = document.createElement("span");
                punto.className = "indicador-leyenda";
                punto.style.backgroundColor = cfg.color;
                punto.setAttribute("aria-hidden", "true");

                const texto = document.createElement("span");
                if (errorMsg) {
                    texto.textContent = `${cfg.label} · ${errorMsg}`;
                } else if (totalPuntos === 0) {
                    texto.textContent = `${cfg.label} · Sin lecturas en el rango seleccionado`;
                } else {
                    texto.textContent = `${cfg.label} (${totalPuntos} lecturas)`;
                }

                item.appendChild(punto);
                item.appendChild(texto);
                contenedorLeyenda.appendChild(item);
            }

            async function renderizarGrafica(claveSerie) {
                const cfg = CONFIG_SERIES[claveSerie] || CONFIG_SERIES.ph;
                let etiquetas = [];
                let valores = [];
                let errorMsg = null;

                if (window.AxionApi) {
                    try {
                        const rangoQs = construirQueryRango();
                        const url = `/dashboard/tendencias?variable=${encodeURIComponent(claveSerie)}${rangoQs ? `&${rangoQs}` : ""}`;
                        const res = await window.AxionApi.get(url);
                        if (res && Array.isArray(res.puntos)) {
                            etiquetas = res.puntos.map((p) => {
                                const d = new Date(p.ts);
                                return Number.isNaN(d.getTime())
                                    ? String(p.ts)
                                    : d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
                            });
                            valores = res.puntos.map((p) => Number(p.valor));
                        }
                    } catch {
                        errorMsg = "No se pudo conectar con el servidor";
                    }
                }

                const coloresTema = obtenerColoresTema();
                renderizarLeyenda(cfg, valores.length, errorMsg);

                if (graficaInstancia) {
                    graficaInstancia.destroy();
                }
                if (typeof Chart.getChart === "function") {
                    const previa = Chart.getChart(canvas);
                    if (previa) previa.destroy();
                }

                graficaInstancia = new Chart(canvas, {
                    type: "line",
                    data: {
                        labels: etiquetas,
                        datasets: [
                            {
                                label: cfg.label,
                                data: valores,
                                yAxisID: "y",
                                borderColor: cfg.color,
                                backgroundColor: cfg.fillColor,
                                borderWidth: 2.5,
                                tension: 0.35,
                                fill: true,
                                pointRadius: 3,
                                pointHoverRadius: 6,
                                pointBackgroundColor: cfg.color,
                                pointBorderColor: "#0f172a",
                                pointBorderWidth: 1.5,
                                unidad: cfg.unidad,
                                decimales: cfg.decimales
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        animation: { duration: 250 },
                        interaction: { mode: "index", intersect: false },
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                backgroundColor: coloresTema.tooltipBg,
                                titleColor: "#f8fafc",
                                bodyColor: "#e2e8f0",
                                borderColor: coloresTema.tooltipBorder,
                                borderWidth: 1,
                                padding: 12,
                                cornerRadius: 8,
                                displayColors: true,
                                callbacks: {
                                    title: (items) => (items.length ? `Hora: ${items[0].label}` : ""),
                                    label: (ctx) => {
                                        const ds = ctx.dataset;
                                        const val = Number(ctx.parsed.y);
                                        const valFmt = ds.decimales > 0 ? val.toFixed(ds.decimales) : String(Math.round(val));
                                        return ` ${ds.label}: ${valFmt} ${ds.unidad}`;
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
                                grid: { color: coloresTema.grid, drawBorder: false },
                                ticks: { color: coloresTema.texto, font: { size: 12, weight: "500" } }
                            },
                            y: {
                                type: "linear",
                                position: "left",
                                suggestedMin: cfg.sugeridoMin,
                                suggestedMax: cfg.sugeridoMax,
                                title: {
                                    display: true,
                                    text: cfg.tituloEje,
                                    color: coloresTema.texto,
                                    font: { size: 12, weight: "600" }
                                },
                                grid: { color: coloresTema.grid, drawBorder: false },
                                ticks: { color: coloresTema.texto, font: { size: 12 } }
                            }
                        }
                    }
                });
            }

            selector.addEventListener("change", () => renderizarGrafica(selector.value));

            [inputFechaInicio, inputHoraInicio, inputFechaFin, inputHoraFin].forEach((el) => {
                if (el) el.addEventListener("change", () => renderizarGrafica(selector.value));
            });

            document.addEventListener("dashboard:actualizarLecturas", () => {
                renderizarGrafica(selector.value);
            });

            const observadorTema = new MutationObserver(() => {
                renderizarGrafica(selector.value);
            });
            observadorTema.observe(document.body, { attributes: true, attributeFilter: ["class"] });

            renderizarGrafica(selector.value);
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
