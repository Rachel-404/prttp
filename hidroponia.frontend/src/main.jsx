import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AxionProvider } from "./context/AxionContext";
import App from "./App";

const rootEl = document.getElementById("root");
createRoot(rootEl).render(
  <BrowserRouter>
    <AxionProvider>
      <App />
    </AxionProvider>
  </BrowserRouter>
);
