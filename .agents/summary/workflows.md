# Key Workflows

## 1. Application Startup

```mermaid
sequenceDiagram
    participant M as main.tsx
    participant R as registerAllTools()
    participant P as registerPanel() ×4
    participant App as App.tsx
    participant DV as DockviewReact
    participant LS as localStorage

    M->>R: Register 12 built-in tools
    M->>P: Register API Tester, DB Manager, Toolkit, Script Runner
    M->>App: ReactDOM.createRoot().render()
    App->>LS: Load theme, layout
    App->>DV: onReady callback
    alt Saved layout exists
        DV->>DV: fromJSON(saved)
        DV->>DV: Unlock all groups
    else No saved layout
        DV->>DV: addPanel() for each registered panel
    end
    DV->>LS: onDidLayoutChange → save
```

## 2. API Request Execution

```mermaid
sequenceDiagram
    participant U as User
    participant AT as ApiTester.tsx
    participant T as template.ts
    participant S as store.ts
    participant IPC as invoke()
    participant HTTP as http/send_request
    participant SC as scripting.ts

    U->>AT: Click Send
    AT->>T: resolveTemplate(url, variables)
    AT->>T: resolveHeaders(headers, variables)
    AT->>SC: executeScript(preRequestScript, context)
    AT->>IPC: invoke("send_http_request", {method, url, headers, body})
    IPC->>HTTP: reqwest::Client request
    HTTP-->>IPC: HttpResponse {status, headers, body, time_ms}
    IPC-->>AT: Response data
    AT->>SC: executeScript(postResponseScript, context)
    AT->>S: Save to history
    AT->>AT: Render response (body, headers, timing, cookies)
```

## 3. Plugin Installation & Execution

```mermaid
sequenceDiagram
    participant U as User
    participant MK as Marketplace.tsx
    participant PS as plugin-store.ts
    participant IPC as invoke()
    participant MGR as manager.rs
    participant ASAR as asar.rs

    U->>MK: Browse marketplace
    MK->>IPC: invoke("marketplace_search", {query})
    IPC-->>MK: MarketPlugin[]
    U->>MK: Click Install
    MK->>IPC: invoke("plugin_install_from_market", {plugin_id})
    IPC->>MGR: download .upxs from u-tools.cn
    MGR->>ASAR: extract_asar(upxs_path)
    ASAR-->>MGR: Extracted files
    MGR->>MGR: Parse plugin.json → PluginManifest
    MGR->>MGR: Save to registry.json
    MGR-->>IPC: InstalledPlugin
    IPC-->>PS: Update store
```

```mermaid
sequenceDiagram
    participant U as User
    participant TL as ToolkitLayout.tsx
    participant PC as PluginContainer.tsx
    participant IF as iframe (sandbox)
    participant BR as bridge.ts
    participant IPC as invoke()

    U->>TL: Select installed plugin
    TL->>PC: Render with plugin data
    PC->>IF: srcdoc = utools-shim.js + node-shim.js + plugin HTML
    IF->>IF: window.utools.* API available
    IF->>BR: postMessage({type:"utools-call", method:"db.put", args})
    BR->>IPC: invoke("plugin_db_put", {pluginId, doc})
    IPC-->>BR: Result
    BR->>IF: postMessage({type:"utools-response", id, result})
```

## 4. Database Query Execution

```mermaid
sequenceDiagram
    participant U as User
    participant SE as SqlEditor.tsx
    participant ST as store/index.ts
    participant IPC as invoke()
    participant QE as query.rs
    participant DB as MySQL/PG/SQLite

    U->>SE: Write SQL + Click Run (or Ctrl+Enter)
    SE->>ST: executeQuery(connectionId, sql)
    ST->>IPC: invoke("execute_query", {connection_id, sql})
    IPC->>QE: split_sql_statements(sql)
    loop Each statement
        QE->>DB: Execute via driver
        DB-->>QE: Rows/affected
    end
    QE-->>IPC: Vec<QueryResult>
    IPC-->>ST: Update results
    ST-->>SE: Re-render QueryResult grid
    ST->>IPC: invoke("save_query_history", {item})
```

## 5. Script Execution

```mermaid
sequenceDiagram
    participant U as User
    participant SR as ScriptRunner.tsx
    participant ST as store.ts
    participant IPC as invoke()
    participant SC as script/mod.rs

    U->>SR: Select file + Click Run
    SR->>ST: runScript(path, runtime)
    ST->>IPC: invoke("start_script", {path, runtime, env_vars})
    IPC->>SC: detect runtime, spawn process
    SC-->>IPC: pid (streaming mode)
    loop stdout/stderr events
        SC-->>SR: Tauri event stream
        SR->>SR: Append to OutputPanel
    end
    U->>SR: Click Stop
    SR->>IPC: invoke("kill_script", {pid})
```

## 6. OpenAPI/Swagger Import

```mermaid
sequenceDiagram
    participant U as User
    participant IM as ImportApiModal.tsx
    participant OP as openapi.ts
    participant ST as store.ts
    participant IPC as invoke()

    U->>IM: Paste JSON/YAML or enter URL
    alt URL provided
        IM->>IPC: invoke("send_http_request", {url})
        IPC-->>IM: Swagger spec content
    end
    IM->>OP: parseOpenAPI(spec)
    OP->>OP: Detect OpenAPI 3.x or Swagger 2.0
    OP->>OP: resolveRef() for $ref pointers
    OP->>OP: generateExample() for request bodies
    OP-->>IM: ApiRequest[] grouped by tags
    U->>IM: Select requests to import
    IM->>ST: Save to collection
    ST->>IPC: invoke("save_request") for each
```

## 7. Theme & i18n Toggle

```mermaid
graph LR
    Toggle["User clicks theme/locale button"] --> Store["Zustand store update"]
    Store --> LS["localStorage persist"]
    Store --> DOM["document.classList.toggle('dark')"]
    Store --> Rerender["All useThemeStore/useI18nStore subscribers re-render"]
```
