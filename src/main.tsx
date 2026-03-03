import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { registerPanel } from "./layouts/panels";
import { ApiTesterPanel } from "./modules/api-tester/ApiTesterPanel";
import { DbManagerPanel } from "./modules/db-manager/DbManagerPanel";
import { ToolkitPanel } from "./modules/toolkit/ToolkitPanel";
import { RedisManagerPanel } from "./modules/redis-manager/RedisManagerPanel";
import { registerAllTools } from "./modules/toolkit/register";
import "./index.css";

registerAllTools();
registerPanel({ id: "api-tester", title: "API Tester", component: ApiTesterPanel });
registerPanel({ id: "db-manager", title: "DB Manager", component: DbManagerPanel });
registerPanel({ id: "redis-manager", title: "Redis Manager", component: RedisManagerPanel });
registerPanel({ id: "toolkit", title: "Toolkit", component: ToolkitPanel });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);