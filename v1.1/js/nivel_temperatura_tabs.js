document.addEventListener("DOMContentLoaded", () => {
    const botones = Array.from(document.querySelectorAll(".barra-pestanas .btn-pestana"));
    const panelNivel = document.getElementById("panel-nivel-agua");
    const panelTemp = document.getElementById("panel-temperatura");

    function activarPestana(nombreTab) {
        const esTemp = nombreTab === "temperatura";

        botones.forEach((btn) => {
            const activa = btn.dataset.tab === (esTemp ? "temperatura" : "nivel");
            btn.classList.toggle("activa", activa);
            btn.setAttribute("aria-selected", activa ? "true" : "false");
        });

        if (panelNivel) panelNivel.hidden = esTemp;
        if (panelTemp) panelTemp.hidden = !esTemp;
    }

    botones.forEach((btn) => {
        btn.addEventListener("click", () => {
            activarPestana(btn.dataset.tab);
        });
    });

    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "temperatura") {
        activarPestana("temperatura");
    }
});

