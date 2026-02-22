#[cfg(windows)]
use std::mem;
#[cfg(windows)]
use winapi::um::winuser::*;
#[cfg(windows)]
use winapi::um::wingdi::{GetDeviceCaps, GetPixel as WinGetPixel, LOGPIXELSX};
#[cfg(windows)]
use winapi::shared::windef::{HMONITOR, POINT, RECT};

#[cfg(windows)]
fn get_dpi() -> f64 {
    unsafe {
        let hdc = GetDC(std::ptr::null_mut());
        let dpi = GetDeviceCaps(hdc, LOGPIXELSX);
        ReleaseDC(std::ptr::null_mut(), hdc);
        dpi as f64
    }
}

#[cfg(windows)]
pub fn get_primary_display() -> Result<serde_json::Value, String> {
    unsafe {
        let w = GetSystemMetrics(SM_CXSCREEN);
        let h = GetSystemMetrics(SM_CYSCREEN);
        let mut rc: RECT = mem::zeroed();
        SystemParametersInfoW(SPI_GETWORKAREA, 0, &mut rc as *mut _ as *mut _, 0);
        let scale = get_dpi() / 96.0;
        Ok(serde_json::json!({
            "id": 0, "rotation": 0, "scaleFactor": scale,
            "bounds": {"x": 0, "y": 0, "width": w, "height": h},
            "workArea": {"x": rc.left, "y": rc.top, "width": rc.right - rc.left, "height": rc.bottom - rc.top}
        }))
    }
}

#[cfg(windows)]
pub fn get_all_displays() -> Result<Vec<serde_json::Value>, String> {
    unsafe {
        let mut displays: Vec<serde_json::Value> = Vec::new();
        unsafe extern "system" fn cb(hmon: HMONITOR, _: winapi::shared::windef::HDC, _: winapi::shared::windef::LPRECT, data: isize) -> i32 {
            let displays = &mut *(data as *mut Vec<serde_json::Value>);
            let mut info: MONITORINFO = mem::zeroed();
            info.cbSize = mem::size_of::<MONITORINFO>() as u32;
            GetMonitorInfoW(hmon, &mut info);
            let b = info.rcMonitor;
            let w = info.rcWork;
            displays.push(serde_json::json!({
                "id": displays.len(), "rotation": 0, "scaleFactor": 1.0,
                "bounds": {"x": b.left, "y": b.top, "width": b.right - b.left, "height": b.bottom - b.top},
                "workArea": {"x": w.left, "y": w.top, "width": w.right - w.left, "height": w.bottom - w.top}
            }));
            1
        }
        EnumDisplayMonitors(std::ptr::null_mut(), std::ptr::null(), Some(cb), &mut displays as *mut _ as isize);
        Ok(displays)
    }
}

#[cfg(windows)]
pub fn get_cursor_screen_point() -> Result<serde_json::Value, String> {
    unsafe {
        let mut pt: POINT = mem::zeroed();
        GetCursorPos(&mut pt);
        Ok(serde_json::json!({"x": pt.x, "y": pt.y}))
    }
}

#[cfg(windows)]
pub fn screen_color_pick() -> Result<String, String> {
    unsafe {
        let mut pt: POINT = mem::zeroed();
        GetCursorPos(&mut pt);
        let hdc = GetDC(std::ptr::null_mut());
        let color = WinGetPixel(hdc, pt.x, pt.y);
        ReleaseDC(std::ptr::null_mut(), hdc);
        let r = color & 0xFF;
        let g = (color >> 8) & 0xFF;
        let b = (color >> 16) & 0xFF;
        Ok(format!("#{:02X}{:02X}{:02X}", r, g, b))
    }
}

#[cfg(windows)]
pub fn get_display_nearest_point(x: i32, y: i32) -> Result<serde_json::Value, String> {
    unsafe {
        let pt = POINT { x, y };
        let hmon = MonitorFromPoint(pt, MONITOR_DEFAULTTONEAREST);
        let mut info: MONITORINFO = mem::zeroed();
        info.cbSize = mem::size_of::<MONITORINFO>() as u32;
        GetMonitorInfoW(hmon, &mut info);
        let b = info.rcMonitor;
        let w = info.rcWork;
        Ok(serde_json::json!({
            "id": 0, "rotation": 0, "scaleFactor": get_dpi() / 96.0,
            "bounds": {"x": b.left, "y": b.top, "width": b.right - b.left, "height": b.bottom - b.top},
            "workArea": {"x": w.left, "y": w.top, "width": w.right - w.left, "height": w.bottom - w.top}
        }))
    }
}

#[cfg(windows)]
pub fn screen_to_dip_point(x: i32, y: i32) -> Result<serde_json::Value, String> {
    let scale = get_dpi() / 96.0;
    Ok(serde_json::json!({"x": (x as f64 / scale) as i32, "y": (y as f64 / scale) as i32}))
}

#[cfg(windows)]
pub fn dip_to_screen_point(x: i32, y: i32) -> Result<serde_json::Value, String> {
    let scale = get_dpi() / 96.0;
    Ok(serde_json::json!({"x": (x as f64 * scale) as i32, "y": (y as f64 * scale) as i32}))
}

// Non-windows stubs
#[cfg(not(windows))]
pub fn get_primary_display() -> Result<serde_json::Value, String> { Err("Windows only".into()) }
#[cfg(not(windows))]
pub fn get_all_displays() -> Result<Vec<serde_json::Value>, String> { Err("Windows only".into()) }
#[cfg(not(windows))]
pub fn get_cursor_screen_point() -> Result<serde_json::Value, String> { Err("Windows only".into()) }
#[cfg(not(windows))]
pub fn screen_color_pick() -> Result<String, String> { Err("Windows only".into()) }
#[cfg(not(windows))]
pub fn get_display_nearest_point(_: i32, _: i32) -> Result<serde_json::Value, String> { Err("Windows only".into()) }
#[cfg(not(windows))]
pub fn screen_to_dip_point(_: i32, _: i32) -> Result<serde_json::Value, String> { Err("Windows only".into()) }
#[cfg(not(windows))]
pub fn dip_to_screen_point(_: i32, _: i32) -> Result<serde_json::Value, String> { Err("Windows only".into()) }
