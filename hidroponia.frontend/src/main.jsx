import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import Chart from "chart.js/auto";
import { AxionProvider } from "./context/AxionContext";
import App from "./App";

if (typeof window !== "undefined") {
  window.Chart = Chart;
}

const rootEl = document.getElementById("root");
createRoot(rootEl).render(
  <BrowserRouter>
    <AxionProvider>
      <App />
    </AxionProvider>
  </BrowserRouter>
);
