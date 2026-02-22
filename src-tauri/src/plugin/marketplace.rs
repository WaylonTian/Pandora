use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::Mutex;
use std::time::{Duration, Instant};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketPlugin {
    pub name: String,
    pub description: String,
    pub logo: String,
    pub plugin_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketPluginDetail {
    pub name: String,
    pub description: String,
    pub version: String,
    pub size: String,
    pub download_url: Option<String>,
    pub developer: String,
    pub rating: String,
    pub users: String,
    pub detail_html: String,
}

struct CacheEntry<T> {
    data: T,
    at: Instant,
}

static CACHE: std::sync::LazyLock<Mutex<MarketCache>> =
    std::sync::LazyLock::new(|| Mutex::new(MarketCache::default()));

const CACHE_TTL: Duration = Duration::from_secs(86400); // 1 day

#[derive(Default)]
struct MarketCache {
    topics: HashMap<u32, CacheEntry<Vec<MarketPlugin>>>,
    searches: HashMap<String, CacheEntry<Vec<MarketPlugin>>>,
    /// Plugin names known to be .upxs (encrypted, unsupported)
    upxs_names: HashSet<String>,
}

fn filter_upxs(plugins: Vec<MarketPlugin>, blocked: &HashSet<String>) -> Vec<MarketPlugin> {
    if blocked.is_empty() { return plugins; }
    plugins.into_iter().filter(|p| !blocked.contains(&p.name)).collect()
}

/// Mark a plugin name as .upxs (will be hidden from future listings)
pub fn mark_upxs(name: &str) {
    if let Ok(mut c) = CACHE.lock() { c.upxs_names.insert(name.to_string()); }
}

pub async fn search_plugins(query: &str) -> Result<Vec<MarketPlugin>, String> {
    let key = query.to_string();
    if let Ok(c) = CACHE.lock() {
        if let Some(e) = c.searches.get(&key) {
            if e.at.elapsed() < CACHE_TTL {
                return Ok(filter_upxs(e.data.clone(), &c.upxs_names));
            }
        }
    }
    let url = format!("https://www.u-tools.cn/plugins/search/?q={}", urlencoding::encode(query));
    let html = reqwest::get(&url).await.map_err(|e| e.to_string())?
        .text().await.map_err(|e| e.to_string())?;
    let plugins = parse_next_data_list(&html)?;
    let blocked = if let Ok(mut c) = CACHE.lock() {
        c.searches.insert(key, CacheEntry { data: plugins.clone(), at: Instant::now() });
        c.upxs_names.clone()
    } else { HashSet::new() };
    Ok(filter_upxs(plugins, &blocked))
}

pub async fn list_topic(topic_id: u32) -> Result<Vec<MarketPlugin>, String> {
    if let Ok(c) = CACHE.lock() {
        if let Some(e) = c.topics.get(&topic_id) {
            if e.at.elapsed() < CACHE_TTL {
                return Ok(filter_upxs(e.data.clone(), &c.upxs_names));
            }
        }
    }
    let url = format!("https://www.u-tools.cn/plugins/topic/{}/", topic_id);
    let html = reqwest::get(&url).await.map_err(|e| e.to_string())?
        .text().await.map_err(|e| e.to_string())?;
    let plugins = parse_next_data_list(&html)?;
    let blocked = if let Ok(mut c) = CACHE.lock() {
        c.topics.insert(topic_id, CacheEntry { data: plugins.clone(), at: Instant::now() });
        c.upxs_names.clone()
    } else { HashSet::new() };
    Ok(filter_upxs(plugins, &blocked))
}

pub async fn get_plugin_detail(name: &str) -> Result<MarketPluginDetail, String> {
    let url = format!("https://www.u-tools.cn/plugins/detail/{}/", urlencoding::encode(name));
    let html = reqwest::get(&url).await.map_err(|e| e.to_string())?
        .text().await.map_err(|e| e.to_string())?;
    parse_next_data_detail(&html, name)
}

pub async fn download_plugin(download_url: &str, dest: &std::path::Path) -> Result<(), String> {
    let resp = reqwest::get(download_url).await.map_err(|e| e.to_string())?;
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(dest, bytes).map_err(|e| e.to_string())
}

/// Extract the JSON from `<script id="__NEXT_DATA__">...</script>`
fn extract_next_data(html: &str) -> Option<serde_json::Value> {
    let marker = r#"id="__NEXT_DATA__""#;
    let pos = html.find(marker)?;
    let rest = &html[pos..];
    let start = rest.find('>')?;
    let json_start = start + 1;
    let end = rest[json_start..].find("</script>")?;
    serde_json::from_str(&rest[json_start..json_start + end]).ok()
}

fn parse_next_data_list(html: &str) -> Result<Vec<MarketPlugin>, String> {
    let data = extract_next_data(html).ok_or("Failed to find __NEXT_DATA__")?;

    // Try topic page: pageProps.topic.componentsList[0].data.items
    if let Some(items) = data.pointer("/props/pageProps/topic/componentsList/0/data/items")
        .and_then(|v| v.as_array())
    {
        return Ok(items.iter().filter_map(|item| {
            Some(MarketPlugin {
                name: item.get("plugin_name")?.as_str()?.to_string(),
                description: item.get("description").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                logo: item.get("logo").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                plugin_id: item.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            })
        }).collect());
    }

    // Try search page: pageProps.plugins or pageProps.list
    for key in &["plugins", "list", "data"] {
        if let Some(items) = data.pointer(&format!("/props/pageProps/{}", key))
            .and_then(|v| v.as_array())
        {
            return Ok(items.iter().filter_map(|item| {
                Some(MarketPlugin {
                    name: item.get("plugin_name").or(item.get("name"))?.as_str()?.to_string(),
                    description: item.get("description").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    logo: item.get("logo").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    plugin_id: item.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                })
            }).collect());
        }
    }

    // Fallback: scan HTML for href="/plugins/detail/..."
    Ok(parse_plugin_list_fallback(html))
}

fn parse_plugin_list_fallback(html: &str) -> Vec<MarketPlugin> {
    let mut plugins = vec![];
    let pattern = "/plugins/detail/";
    let mut search_from = 0;
    while let Some(pos) = html[search_from..].find(pattern) {
        let abs = search_from + pos + pattern.len();
        if let Some(end) = html[abs..].find('/') {
            let raw = &html[abs..abs + end];
            // Skip if it looks like a quote or tag
            if !raw.is_empty() && !raw.contains('<') {
                let name = urlencoding::decode(raw).unwrap_or_default().to_string();
                if !name.is_empty() && !plugins.iter().any(|p: &MarketPlugin| p.name == name) {
                    plugins.push(MarketPlugin {
                        name: name.clone(),
                        description: String::new(),
                        logo: String::new(),
                        plugin_id: String::new(),
                    });
                }
            }
        }
        search_from = abs + 1;
    }
    plugins
}

fn parse_next_data_detail(html: &str, name: &str) -> Result<MarketPluginDetail, String> {
    let data = extract_next_data(html);

    let mut download_url = None;
    let mut version = String::new();
    let mut description = String::new();
    let mut developer = String::new();
    let mut plugin_id = String::new();

    if let Some(data) = &data {
        // pageProps.detail.detailInfos
        let plugin = data.pointer("/props/pageProps/detail/detailInfos");

        if let Some(p) = plugin {
            version = p.get("version").and_then(|v| v.as_str()).unwrap_or("").to_string();
            description = p.get("description").and_then(|v| v.as_str()).unwrap_or("").to_string();
            developer = p.get("author").and_then(|v| v.as_str()).unwrap_or("").to_string();
            plugin_id = p.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string();
        }
    }

    // Build download URL from detail data
    if !plugin_id.is_empty() {
        // The JSON has download_url like "/hash.upxs", full URL is https://res.u-tools.cn/plugins/{hash}.upxs
        if let Some(data) = &data {
            if let Some(dl) = data.pointer("/props/pageProps/detail/detailInfos/download_url")
                .and_then(|v| v.as_str())
            {
                let hash = dl.trim_start_matches('/');
                download_url = Some(format!("https://res.u-tools.cn/plugins/{}", hash));
            }
        }
    }

    // Fallback: scan for download URL in HTML (.upxs or .upx)
    if download_url.is_none() {
        if let Some(pos) = html.find("res.u-tools.cn/plugins/") {
            let start = html[..pos].rfind("https://").unwrap_or(pos);
            let rest = &html[start..];
            if let Some(end_offset) = rest.find(".upxs") {
                download_url = Some(rest[..end_offset + 5].to_string());
            } else if let Some(end_offset) = rest.find(".upx") {
                download_url = Some(rest[..end_offset + 4].to_string());
            }
        }
    }

    Ok(MarketPluginDetail {
        name: name.to_string(),
        description,
        version,
        size: String::new(),
        download_url,
        developer,
        rating: String::new(),
        users: String::new(),
        detail_html: String::new(),
    })
}
