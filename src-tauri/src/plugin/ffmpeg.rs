use std::process::Command;

pub fn is_available() -> bool {
    Command::new("ffmpeg").arg("-version").output().is_ok()
}

pub fn get_install_hint() -> String {
    "FFmpeg is not installed. Install via:\n- winget install ffmpeg\n- choco install ffmpeg\n- scoop install ffmpeg\nOr download from https://ffmpeg.org/download.html".to_string()
}

pub fn run(args: Vec<String>) -> Result<String, String> {
    if !is_available() {
        return Err(get_install_hint());
    }
    let output = Command::new("ffmpeg")
        .args(&args)
        .output()
        .map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

pub fn probe(input: String) -> Result<String, String> {
    if !is_available() {
        return Err(get_install_hint());
    }
    let output = Command::new("ffprobe")
        .args(["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", &input])
        .output()
        .map_err(|e| e.to_string())?;
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}