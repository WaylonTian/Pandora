use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketPlugin {
    pub name: String,
    pub description: String,
    pub url: String,
    pub detail_url: String,
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

pub async fn search_plugins(query: &str) -> Result<Vec<MarketPlugin>, String> {
    let url = format!("https://www.u-tools.cn/plugins/search/?q={}", urlencoding::encode(query));
    let html = reqwest::get(&url).await.map_err(|e| e.to_string())?
        .text().await.map_err(|e| e.to_string())?;
    Ok(parse_plugin_list(&html))
}

pub async fn list_topic(topic_id: u32) -> Result<Vec<MarketPlugin>, String> {
    let url = format!("https://www.u-tools.cn/plugins/topic/{}/", topic_id);
    let html = reqwest::get(&url).await.map_err(|e| e.to_string())?
        .text().await.map_err(|e| e.to_string())?;
    Ok(parse_plugin_list(&html))
}

pub async fn get_plugin_detail(name: &str) -> Result<MarketPluginDetail, String> {
    let url = format!("https://www.u-tools.cn/plugins/detail/{}/", urlencoding::encode(name));
    let html = reqwest::get(&url).await.map_err(|e| e.to_string())?
        .text().await.map_err(|e| e.to_string())?;
    parse_plugin_detail(&html, name)
}

pub async fn download_plugin(download_url: &str, dest: &std::path::Path) -> Result<(), String> {
    let resp = reqwest::get(download_url).await.map_err(|e| e.to_string())?;
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(dest, bytes).map_err(|e| e.to_string())
}

fn parse_plugin_list(html: &str) -> Vec<MarketPlugin> {
    let mut plugins = vec![];
    for line in html.lines() {
        if let Some(start) = line.find("/plugins/detail/") {
            let rest = &line[start + 16..];
            if let Some(end) = rest.find('/') {
                let name = urlencoding::decode(&rest[..end]).unwrap_or_default().to_string();
                if !name.is_empty() && !plugins.iter().any(|p: &MarketPlugin| p.name == name) {
                    plugins.push(MarketPlugin {
                        name: name.clone(),
                        description: String::new(),
                        url: format!("https://www.u-tools.cn/plugins/detail/{}/", urlencoding::encode(&name)),
                        detail_url: format!("https://www.u-tools.cn/plugins/detail/{}/", urlencoding::encode(&name)),
                    });
                }
            }
        }
    }
    plugins
}

fn parse_plugin_detail(html: &str, name: &str) -> Result<MarketPluginDetail, String> {
    let download_url = html.lines()
        .find(|l| l.contains("res.u-tools.cn/plugins/") && l.contains(".upxs"))
        .and_then(|l| {
            let start = l.find("https://res.u-tools.cn")?;
            let rest = &l[start..];
            let end = rest.find('"').or_else(|| rest.find('\''))?;
            Some(rest[..end].to_string())
        });

    let extract_after = |label: &str| -> String {
        html.lines()
            .skip_while(|l| !l.contains(label))
            .nth(1)
            .map(|l| l.trim().replace("<br>", "").replace("</div>", "").replace("</span>", ""))
            .unwrap_or_default()
            .trim().to_string()
    };

    Ok(MarketPluginDetail {
        name: name.to_string(),
        description: String::new(),
        version: extract_after("版本"),
        size: extract_after("大小"),
        download_url,
        developer: String::new(),
        rating: String::new(),
        users: String::new(),
        detail_html: String::new(),
    })
}
