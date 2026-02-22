#[cfg(windows)]
use std::mem;
#[cfg(windows)]
use winapi::um::winuser::*;

#[cfg(windows)]
fn send_key(vk: u16, flags: u32) {
    unsafe {
        let mut input: INPUT = mem::zeroed();
        input.type_ = INPUT_KEYBOARD;
        *input.u.ki_mut() = KEYBDINPUT { wVk: vk, wScan: 0, dwFlags: flags, time: 0, dwExtraInfo: 0 };
        SendInput(1, &mut input, mem::size_of::<INPUT>() as i32);
    }
}

#[cfg(windows)]
fn send_mouse(flags: u32) {
    unsafe {
        let mut input: INPUT = mem::zeroed();
        input.type_ = INPUT_MOUSE;
        *input.u.mi_mut() = MOUSEINPUT { dx: 0, dy: 0, mouseData: 0, dwFlags: flags, time: 0, dwExtraInfo: 0 };
        SendInput(1, &mut input, mem::size_of::<INPUT>() as i32);
    }
}

#[cfg(windows)]
pub fn keyboard_tap(key: &str, modifiers: &[String]) -> Result<(), String> {
    let vk: u16 = match key.to_lowercase().as_str() {
        s if s.len() == 1 && s.as_bytes()[0].is_ascii_alphanumeric() => s.as_bytes()[0].to_ascii_uppercase() as u16,
        "f1" => 0x70, "f2" => 0x71, "f3" => 0x72, "f4" => 0x73, "f5" => 0x74, "f6" => 0x75,
        "f7" => 0x76, "f8" => 0x77, "f9" => 0x78, "f10" => 0x79, "f11" => 0x7A, "f12" => 0x7B,
        "enter" => VK_RETURN as u16, "tab" => VK_TAB as u16, "escape" | "esc" => VK_ESCAPE as u16,
        "space" => VK_SPACE as u16, "backspace" => VK_BACK as u16, "delete" => VK_DELETE as u16,
        "up" => VK_UP as u16, "down" => VK_DOWN as u16, "left" => VK_LEFT as u16, "right" => VK_RIGHT as u16,
        "home" => VK_HOME as u16, "end" => VK_END as u16, "pageup" => VK_PRIOR as u16, "pagedown" => VK_NEXT as u16,
        _ => return Err(format!("Unsupported key: {key}")),
    };
    let mods: Vec<u16> = modifiers.iter().filter_map(|m| match m.as_str() {
        "ctrl" | "control" => Some(VK_CONTROL as u16), "shift" => Some(VK_SHIFT as u16),
        "alt" => Some(VK_MENU as u16), "meta" | "command" => Some(VK_LWIN as u16), _ => None,
    }).collect();

    for &m in &mods { send_key(m, 0); }
    send_key(vk, 0);
    send_key(vk, KEYEVENTF_KEYUP);
    for &m in mods.iter().rev() { send_key(m, KEYEVENTF_KEYUP); }
    Ok(())
}

#[cfg(windows)]
pub fn mouse_move(x: i32, y: i32) -> Result<(), String> {
    unsafe { SetCursorPos(x, y); }
    Ok(())
}

#[cfg(windows)]
pub fn mouse_click(x: i32, y: i32) -> Result<(), String> {
    mouse_move(x, y)?;
    send_mouse(MOUSEEVENTF_LEFTDOWN);
    send_mouse(MOUSEEVENTF_LEFTUP);
    Ok(())
}

#[cfg(windows)]
pub fn mouse_double_click(x: i32, y: i32) -> Result<(), String> {
    mouse_click(x, y)?;
    mouse_click(x, y)
}

#[cfg(windows)]
pub fn mouse_right_click(x: i32, y: i32) -> Result<(), String> {
    mouse_move(x, y)?;
    send_mouse(MOUSEEVENTF_RIGHTDOWN);
    send_mouse(MOUSEEVENTF_RIGHTUP);
    Ok(())
}

#[cfg(not(windows))]
pub fn keyboard_tap(_: &str, _: &[String]) -> Result<(), String> { Err("Windows only".into()) }
#[cfg(not(windows))]
pub fn mouse_move(_: i32, _: i32) -> Result<(), String> { Err("Windows only".into()) }
#[cfg(not(windows))]
pub fn mouse_click(_: i32, _: i32) -> Result<(), String> { Err("Windows only".into()) }
#[cfg(not(windows))]
pub fn mouse_double_click(_: i32, _: i32) -> Result<(), String> { Err("Windows only".into()) }
#[cfg(not(windows))]
pub fn mouse_right_click(_: i32, _: i32) -> Result<(), String> { Err("Windows only".into()) }
