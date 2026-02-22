use std::io::{Read, Write};
use std::net::TcpListener;
use std::path::PathBuf;
use std::sync::OnceLock;

static PORT: OnceLock<u16> = OnceLock::new();

pub fn get_port() -> u16 {
    *PORT.get().unwrap_or(&18321)
}

pub fn start_server(plugins_dir: PathBuf) {
    let listener = TcpListener::bind("127.0.0.1:0").expect("Failed to bind plugin server");
    let port = listener.local_addr().unwrap().port();
    PORT.set(port).ok();
    eprintln!("[plugin-server] listening on 127.0.0.1:{}", port);

    std::thread::spawn(move || {
        for stream in listener.incoming().flatten() {
            let dir = plugins_dir.clone();
            std::thread::spawn(move || handle(stream, &dir));
        }
    });
}

fn handle(mut stream: std::net::TcpStream, plugins_dir: &PathBuf) {
    let mut buf = [0u8; 4096];
    let n = match stream.read(&mut buf) {
        Ok(n) if n > 0 => n,
        _ => return,
    };
    let req = String::from_utf8_lossy(&buf[..n]);
    let path = req.split_whitespace().nth(1).unwrap_or("/");
    let (path_part, query) = path.split_once('?').unwrap_or((path, ""));
    // path: /plugin-id/file.js
    let decoded = urlencoding::decode(path_part).unwrap_or_default();
    let decoded = decoded.trim_start_matches('/');

    if decoded.contains("..") {
        let _ = stream.write_all(b"HTTP/1.1 403 Forbidden\r\n\r\n");
        return;
    }

    // Handle raw file access: /__raw__?path=/absolute/path
    if decoded.starts_with("__raw__") {
        let file_path = query.strip_prefix("path=")
            .map(|p| urlencoding::decode(p).unwrap_or_default().into_owned())
            .unwrap_or_default();
        if file_path.is_empty() || file_path.contains("..") {
            let _ = stream.write_all(b"HTTP/1.1 400 Bad Request\r\n\r\n");
            return;
        }
        match std::fs::read(&file_path) {
            Ok(data) => {
                let header = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: {}\r\nAccess-Control-Allow-Origin: *\r\n\r\n",
                    data.len()
                );
                let _ = stream.write_all(header.as_bytes());
                let _ = stream.write_all(&data);
            }
            Err(_) => { let _ = stream.write_all(b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n"); }
        }
        return;
    }

    let file_path = plugins_dir.join(decoded);
    let mime = match file_path.extension().and_then(|e| e.to_str()) {
        Some("html") => "text/html; charset=utf-8",
        Some("js" | "mjs") => "application/javascript; charset=utf-8",
        Some("css") => "text/css; charset=utf-8",
        Some("json") => "application/json",
        Some("png") => "image/png",
        Some("jpg" | "jpeg") => "image/jpeg",
        Some("svg") => "image/svg+xml",
        Some("woff2") => "font/woff2",
        Some("woff") => "font/woff",
        Some("ttf") => "font/ttf",
        _ => "application/octet-stream",
    };

    match std::fs::read(&file_path) {
        Ok(data) => {
            // Inject shim into HTML when __inject__ query param is present
            let body = if query.contains("__inject__") && mime == "text/html; charset=utf-8" {
                let html = String::from_utf8_lossy(&data);
                // Extract plugin_id from path (first segment)
                let plugin_id = decoded.split('/').next().unwrap_or("");
                let shim_path = plugins_dir.join(plugin_id).join("__shim__.js");
                let preload_tag = std::fs::read_to_string(plugins_dir.join(plugin_id).join("plugin.json")).ok()
                    .and_then(|m| serde_json::from_str::<serde_json::Value>(&m).ok())
                    .and_then(|v| v.get("preload").and_then(|p| p.as_str()).map(|p| format!("<script src=\"{}\"></script>", p)))
                    .unwrap_or_default();
                let shim_tag = if shim_path.exists() {
                    format!("<script src=\"__shim__.js\"></script>")
                } else { String::new() };
                let inject = format!("{}{}", shim_tag, preload_tag);
                let injected = if html.contains("<head>") {
                    html.replacen("<head>", &format!("<head>{}", inject), 1)
                } else {
                    format!("{}{}", inject, html)
                };
                injected.into_bytes()
            } else {
                data
            };
            let header = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: {}\r\nContent-Length: {}\r\nAccess-Control-Allow-Origin: *\r\n\r\n",
                mime, body.len()
            );
            let _ = stream.write_all(header.as_bytes());
            let _ = stream.write_all(&body);
        }
        Err(_) => {
            let _ = stream.write_all(b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n");
        }
    }
}
