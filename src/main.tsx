import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { registerPanel } from "./layouts/panels";
import { WelcomePanel } from "./modules/welcome/WelcomePanel";
import "./index.css";

registerPanel({ id: "welcome", title: "Welcome", component: WelcomePanel });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);