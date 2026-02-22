use image::{DynamicImage, ImageFormat, imageops};
use base64::Engine;
use std::path::Path;
use std::io::Cursor;

fn load_image(input: &str) -> Result<DynamicImage, String> {
    if input.starts_with("data:") {
        let b64 = input.split(',').nth(1).unwrap_or(input);
        let bytes = base64::engine::general_purpose::STANDARD.decode(b64).map_err(|e| e.to_string())?;
        image::load_from_memory(&bytes).map_err(|e| e.to_string())
    } else {
        image::open(input).map_err(|e| e.to_string())
    }
}

fn save_image(img: &DynamicImage, output: &str, format: &str) -> Result<(), String> {
    let fmt = match format { "jpeg"|"jpg" => ImageFormat::Jpeg, "png" => ImageFormat::Png, "webp" => ImageFormat::WebP, "bmp" => ImageFormat::Bmp, "gif" => ImageFormat::Gif, _ => ImageFormat::Png };
    img.save_with_format(output, fmt).map_err(|e| e.to_string())
}

fn image_to_base64(img: &DynamicImage, format: &str) -> Result<String, String> {
    let fmt = match format { "jpeg"|"jpg" => ImageFormat::Jpeg, "webp" => ImageFormat::WebP, _ => ImageFormat::Png };
    let mut buf = Cursor::new(Vec::new());
    img.write_to(&mut buf, fmt).map_err(|e| e.to_string())?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(buf.into_inner());
    let mime = match format { "jpeg"|"jpg" => "image/jpeg", "webp" => "image/webp", _ => "image/png" };
    Ok(format!("data:{};base64,{}", mime, b64))
}

pub fn metadata(input: String) -> Result<serde_json::Value, String> {
    let img = load_image(&input)?;
    Ok(serde_json::json!({
        "width": img.width(),
        "height": img.height(),
        "format": match img.color() {
            image::ColorType::Rgb8 => "rgb",
            image::ColorType::Rgba8 => "rgba",
            image::ColorType::L8 => "grayscale",
            _ => "unknown"
        }
    }))
}

pub fn resize(input: String, width: u32, height: u32, output: String) -> Result<(), String> {
    let img = load_image(&input)?;
    let resized = img.resize_exact(width, height, imageops::FilterType::Lanczos3);
    let format = Path::new(&output).extension().and_then(|s| s.to_str()).unwrap_or("png");
    save_image(&resized, &output, format)
}

pub fn rotate(input: String, degrees: i32, output: String) -> Result<(), String> {
    let img = load_image(&input)?;
    let rotated = match degrees {
        90 => img.rotate90(),
        180 => img.rotate180(),
        270 => img.rotate270(),
        _ => return Err("Only 90, 180, 270 degrees supported".to_string())
    };
    let format = Path::new(&output).extension().and_then(|s| s.to_str()).unwrap_or("png");
    save_image(&rotated, &output, format)
}

pub fn flip(input: String, direction: String, output: String) -> Result<(), String> {
    let img = load_image(&input)?;
    let flipped = match direction.as_str() {
        "horizontal" => img.fliph(),
        "vertical" => img.flipv(),
        _ => return Err("Direction must be 'horizontal' or 'vertical'".to_string())
    };
    let format = Path::new(&output).extension().and_then(|s| s.to_str()).unwrap_or("png");
    save_image(&flipped, &output, format)
}

pub fn crop(input: String, x: u32, y: u32, w: u32, h: u32, output: String) -> Result<(), String> {
    let img = load_image(&input)?;
    let cropped = imageops::crop_imm(&img, x, y, w, h).to_image();
    let format = Path::new(&output).extension().and_then(|s| s.to_str()).unwrap_or("png");
    save_image(&DynamicImage::ImageRgba8(cropped), &output, format)
}

pub fn blur(input: String, sigma: f32, output: String) -> Result<(), String> {
    let img = load_image(&input)?;
    let blurred = img.blur(sigma);
    let format = Path::new(&output).extension().and_then(|s| s.to_str()).unwrap_or("png");
    save_image(&blurred, &output, format)
}

pub fn grayscale(input: String, output: String) -> Result<(), String> {
    let img = load_image(&input)?;
    let gray = img.grayscale();
    let format = Path::new(&output).extension().and_then(|s| s.to_str()).unwrap_or("png");
    save_image(&gray, &output, format)
}

pub fn to_format(input: String, format: String, output: String) -> Result<(), String> {
    let img = load_image(&input)?;
    save_image(&img, &output, &format)
}

pub fn to_base64(input: String, format: String) -> Result<String, String> {
    let img = load_image(&input)?;
    image_to_base64(&img, &format)
}