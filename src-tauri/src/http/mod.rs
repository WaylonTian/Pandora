use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct HttpResponse {
    pub status: u16,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub time: u64,
    pub size: usize,
}

pub async fn send_request(
    _method: &str,
    _url: &str,
    _headers: HashMap<String, String>,
    _body: Option<String>,
) -> Result<HttpResponse, String> {
    todo!("Will be implemented in Task 5")
}