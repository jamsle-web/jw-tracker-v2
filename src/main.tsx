import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import PwaInstallControl from "./PwaInstallControl";
import "./styles.css";
import "./pwa.css";

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(error => {
    console.error("No se pudo registrar el service worker de JW Tracker.", error);
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><App />{import.meta.env.PROD && <PwaInstallControl />}</React.StrictMode>
);