use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UBrowserOp {
    pub action: String,  // "goto", "css", "evaluate", "click", "input", "wait", "screenshot", "press", "value", "check", "scroll", "hide", "show", "viewport", "useragent", "cookies", "setCookies", "removeCookies", "clearCookies", "hover", "focus", "paste", "download", "pdf", "device", "when", "end", "devTools"
    pub args: Vec<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UBrowserRunOptions {
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub show: Option<bool>,
}

/// Execute a chain of ubrowser operations. Returns results array.
/// This is called from a Tauri command. The actual WebView creation
/// happens via Tauri's AppHandle.
pub fn build_execute_script(ops: &[UBrowserOp]) -> String {
    // Generate a single JS script that executes all operations sequentially
    let mut script = String::from("(async () => { const __results = [];\n");
    for op in ops {
        match op.action.as_str() {
            "goto" => {
                let url = op.args.first().and_then(|v| v.as_str()).unwrap_or("");
                script.push_str(&format!("window.location.href = '{}';\nawait new Promise(r => {{ if (document.readyState === 'complete') r(); else window.addEventListener('load', r); }});\n", url));
            }
            "css" => {
                let css = op.args.first().and_then(|v| v.as_str()).unwrap_or("");
                script.push_str(&format!("{{ const s = document.createElement('style'); s.textContent = `{}`; document.head.appendChild(s); }}\n", css));
            }
            "evaluate" => {
                let code = op.args.first().and_then(|v| v.as_str()).unwrap_or("");
                script.push_str(&format!("__results.push(await (async () => {{ {} }})());\n", code));
            }
            "click" => {
                let sel = op.args.first().and_then(|v| v.as_str()).unwrap_or("");
                script.push_str(&format!("document.querySelector('{}')?.click();\n", sel));
            }
            "input" => {
                let sel = op.args.first().and_then(|v| v.as_str()).unwrap_or("");
                let val = op.args.get(1).and_then(|v| v.as_str()).unwrap_or("");
                script.push_str(&format!("{{ const el = document.querySelector('{}'); if(el) {{ el.value = '{}'; el.dispatchEvent(new Event('input', {{bubbles:true}})); }} }}\n", sel, val));
            }
            "value" => {
                let sel = op.args.first().and_then(|v| v.as_str()).unwrap_or("");
                let val = op.args.get(1).and_then(|v| v.as_str()).unwrap_or("");
                script.push_str(&format!("{{ const el = document.querySelector('{}'); if(el) el.value = '{}'; }}\n", sel, val));
            }
            "wait" => {
                if let Some(ms) = op.args.first().and_then(|v| v.as_u64()) {
                    script.push_str(&format!("await new Promise(r => setTimeout(r, {}));\n", ms));
                } else if let Some(sel) = op.args.first().and_then(|v| v.as_str()) {
                    script.push_str(&format!("await new Promise(r => {{ const i = setInterval(() => {{ if(document.querySelector('{}')) {{ clearInterval(i); r(); }} }}, 100); }});\n", sel));
                }
            }
            "press" => {
                let key = op.args.first().and_then(|v| v.as_str()).unwrap_or("");
                script.push_str(&format!("document.dispatchEvent(new KeyboardEvent('keydown', {{key:'{}'}})); document.dispatchEvent(new KeyboardEvent('keyup', {{key:'{}'}}));\n", key, key));
            }
            "scroll" => {
                let sel = op.args.first().and_then(|v| v.as_str());
                let y = op.args.get(1).and_then(|v| v.as_i64()).unwrap_or(0);
                if let Some(s) = sel {
                    script.push_str(&format!("document.querySelector('{}')?.scrollBy(0, {});\n", s, y));
                } else {
                    script.push_str(&format!("window.scrollBy(0, {});\n", y));
                }
            }
            "check" => {
                let sel = op.args.first().and_then(|v| v.as_str()).unwrap_or("");
                let checked = op.args.get(1).and_then(|v| v.as_bool()).unwrap_or(true);
                script.push_str(&format!("{{ const el = document.querySelector('{}'); if(el) el.checked = {}; }}\n", sel, checked));
            }
            "focus" => {
                let sel = op.args.first().and_then(|v| v.as_str()).unwrap_or("");
                script.push_str(&format!("document.querySelector('{}')?.focus();\n", sel));
            }
            "hover" => {
                let sel = op.args.first().and_then(|v| v.as_str()).unwrap_or("");
                script.push_str(&format!("document.querySelector('{}')?.dispatchEvent(new MouseEvent('mouseover', {{bubbles:true}}));\n", sel));
            }
            "screenshot" | "pdf" | "download" | "markdown" => {
                script.push_str("__results.push('not_supported');\n");
            }
            _ => {} // hide, show, viewport, useragent, cookies, device, when, end, devTools — handled at window level
        }
    }
    script.push_str("return __results; })();");
    script
}