document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("grafica-tendencias");
    const selector = document.getElementById("selector-tendencia");
    const contenedorLeyenda = document.getElementById("leyenda-tendencias");

    if (!canvas || !selector || typeof Chart === "undefined") return;

    const HORAS_24H = [
        "12:00", "14:00", "16:00", "18:00",
        "20:00", "22:00", "00:00", "02:00",
        "04:00", "06:00", "08:00", "10:00"
    ];

    // Datos simulados de las últimas 24 horas por grupo de variables
    const SERIES_TENDENCIA = {
        ph_ec: {
            dobleEje: true,
            ejes: {
                y: {
                    titulo: "pH",
                    sugeridoMin: 5.8,
                    sugeridoMax: 6.4
                },
                y1: {
                    titulo: "EC (µS/cm)",
                    sugeridoMin: 1050,
                    sugeridoMax: 1400
                }
            },
            datasets: [
                {
                    label: "pH del Agua",
                    unidad: "pH",
                    decimales: 2,
                    yAxisID: "y",
                    color: "#10b981",
                    fillColor: "rgba(16, 185, 129, 0.12)",
                    data: [6.05, 6.08, 6.12, 6.15, 6.11, 6.09, 6.04, 6.02, 6.06, 6.08, 6.10, 6.10]
                },
                {
                    label: "Conductividad (EC)",
                    unidad: "µS/cm",
                    decimales: 0,
                    yAxisID: "y1",
                    color: "#f59e0b",
                    fillColor: "rgba(245, 158, 11, 0.10)",
                    data: [1180, 1210, 1245, 1260, 1230, 1215, 1195, 1190, 1185, 1195, 1205, 1200]
                }
            ]
        },
        temperaturas: {
            dobleEje: false,
            ejes: {
                y: {
                    titulo: "Temperatura (°C)",
                    sugeridoMin: 16,
                    sugeridoMax: 28
                }
            },
            datasets: [
                {
                    label: "Temperatura del Agua",
                    unidad: "°C",
                    decimales: 1,
                    yAxisID: "y",
                    color: "#10b981",
                    fillColor: "rgba(16, 185, 129, 0.14)",
                    data: [21.2, 21.6, 22.1, 22.3, 21.9, 21.4, 20.9, 20.6, 20.5, 20.8, 21.2, 21.5]
                },
                {
                    label: "Temperatura Ambiente",
                    unidad: "°C",
                    decimales: 1,
                    yAxisID: "y",
                    color: "#f59e0b",
                    fillColor: "rgba(245, 158, 11, 0.10)",
                    data: [23.4, 24.8, 25.6, 24.9, 23.1, 21.8, 20.7, 19.9, 19.6, 20.4, 22.1, 23.2]
                }
            ]
        },
        nivel_agua: {
            dobleEje: false,
            ejes: {
                y: {
                    titulo: "Nivel (%)",
                    sugeridoMin: 0,
                    sugeridoMax: 100
                }
            },
            datasets: [
                {
                    label: "Nivel del Tanque",
                    unidad: "%",
                    decimales: 0,
                    yAxisID: "y",
                    color: "#22c55e",
                    fillColor: "rgba(34, 197, 94, 0.14)",
                    data: [90, 89, 88, 87, 86, 85, 84, 83, 82, 86, 85, 85]
                }
            ]
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

    function renderizarLeyenda(datasets) {
        if (!contenedorLeyenda) return;
        contenedorLeyenda.innerHTML = "";

        datasets.forEach((ds) => {
            const item = document.createElement("div");
            item.className = "item-leyenda";

            const punto = document.createElement("span");
            punto.className = "indicador-leyenda";
            punto.style.backgroundColor = ds.color;
            punto.setAttribute("aria-hidden", "true");

            const texto = document.createElement("span");
            texto.textContent = ds.label;

            item.appendChild(punto);
            item.appendChild(texto);
            contenedorLeyenda.appendChild(item);
        });
    }

    function construirEscalas(configSerie, coloresTema) {
        const scales = {
            x: {
                grid: {
                    color: coloresTema.grid,
                    drawBorder: false
                },
                ticks: {
                    color: coloresTema.texto,
                    font: { size: 12, weight: "500" }
                }
            },
            y: {
                type: "linear",
                position: "left",
                suggestedMin: configSerie.ejes.y.sugeridoMin,
                suggestedMax: configSerie.ejes.y.sugeridoMax,
                title: {
                    display: true,
                    text: configSerie.ejes.y.titulo,
                    color: coloresTema.texto,
                    font: { size: 12, weight: "600" }
                },
                grid: {
                    color: coloresTema.grid,
                    drawBorder: false
                },
                ticks: {
                    color: coloresTema.texto,
                    font: { size: 12 }
                }
            }
        };

        if (configSerie.dobleEje && configSerie.ejes.y1) {
            scales.y1 = {
                type: "linear",
                position: "right",
                suggestedMin: configSerie.ejes.y1.sugeridoMin,
                suggestedMax: configSerie.ejes.y1.sugeridoMax,
                title: {
                    display: true,
                    text: configSerie.ejes.y1.titulo,
                    color: coloresTema.texto,
                    font: { size: 12, weight: "600" }
                },
                grid: {
                    drawOnChartArea: false
                },
                ticks: {
                    color: coloresTema.texto,
                    font: { size: 12 }
                }
            };
        }

        return scales;
    }

    function renderizarGrafica(claveSerie) {
        const configSerie = SERIES_TENDENCIA[claveSerie] || SERIES_TENDENCIA.ph_ec;
        const coloresTema = obtenerColoresTema();

        const datasetsChart = configSerie.datasets.map((ds) => ({
            label: ds.label,
            data: ds.data,
            yAxisID: ds.yAxisID,
            borderColor: ds.color,
            backgroundColor: ds.fillColor,
            borderWidth: 2.5,
            tension: 0.4,
            fill: true,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: ds.color,
            pointBorderColor: "#0f172a",
            pointBorderWidth: 1.5,
            unidad: ds.unidad,
            decimales: ds.decimales
        }));

        renderizarLeyenda(configSerie.datasets);

        if (graficaInstancia) {
            graficaInstancia.destroy();
        }

        graficaInstancia = new Chart(canvas, {
            type: "line",
            data: {
                labels: HORAS_24H,
                datasets: datasetsChart
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 300
                },
                interaction: {
                    mode: "index",
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: false
                    },
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
                scales: construirEscalas(configSerie, coloresTema)
            }
        });
    }

    selector.addEventListener("change", () => {
        renderizarGrafica(selector.value);
    });

    // Sincronizar colores de ejes y grid cuando el usuario cambia entre tema oscuro y claro
    const observadorTema = new MutationObserver(() => {
        renderizarGrafica(selector.value);
    });
    observadorTema.observe(document.body, {
        attributes: true,
        attributeFilter: ["class"]
    });

    renderizarGrafica(selector.value);
});
