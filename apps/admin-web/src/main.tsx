import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "./plus-shell.css";
import App from "./App";

if (import.meta.env.DEV) {
  console.info("[Pointmor Admin] build: dev-local");
  console.info("[Pointmor Admin] main:", import.meta.url);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
