use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Instant;

#[derive(Debug, Serialize, Deserialize)]
pub struct HttpResponse {
    pub status: u16,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub time: u64,
    pub size: usize,
}

pub async fn send_request(
    method: &str,
    url: &str,
    headers: HashMap<String, String>,
    body: Option<String>,
) -> Result<HttpResponse, String> {
    let client = reqwest::Client::new();
    let start = Instant::now();

    let mut builder = match method.to_uppercase().as_str() {
        "GET" => client.get(url),
        "POST" => client.post(url),
        "PUT" => client.put(url),
        "PATCH" => client.patch(url),
        "DELETE" => client.delete(url),
        "HEAD" => client.head(url),
        "OPTIONS" => client.request(reqwest::Method::OPTIONS, url),
        _ => return Err(format!("Unsupported method: {}", method)),
    };

    for (key, value) in &headers {
        builder = builder.header(key, value);
    }

    if let Some(body_content) = body {
        if !body_content.is_empty() {
            builder = builder.body(body_content);
        }
    }

    let response = builder.send().await.map_err(|e| e.to_string())?;
    let elapsed = start.elapsed().as_millis() as u64;
    let status = response.status().as_u16();

    let mut resp_headers = HashMap::new();
    for (key, value) in response.headers() {
        if let Ok(v) = value.to_str() {
            resp_headers.insert(key.to_string(), v.to_string());
        }
    }

    let body_bytes = response.bytes().await.map_err(|e| e.to_string())?;
    let size = body_bytes.len();
    let body_text = String::from_utf8_lossy(&body_bytes).to_string();

    Ok(HttpResponse {
        status,
        headers: resp_headers,
        body: body_text,
        time: elapsed,
        size,
    })
}