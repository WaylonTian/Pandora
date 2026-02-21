import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { registerPanel } from "./layouts/panels";
import { WelcomePanel } from "./modules/welcome/WelcomePanel";
import { ApiTesterPanel } from "./modules/api-tester/ApiTesterPanel";
import { DbManagerPanel } from "./modules/db-manager/DbManagerPanel";
import "./index.css";

registerPanel({ id: "welcome", title: "Welcome", component: WelcomePanel });
registerPanel({ id: "api-tester", title: "API Tester", component: ApiTesterPanel });
registerPanel({ id: "db-manager", title: "DB Manager", component: DbManagerPanel });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);