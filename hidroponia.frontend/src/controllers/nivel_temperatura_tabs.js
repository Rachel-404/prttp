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
