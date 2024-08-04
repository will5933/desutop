use std::os::raw::c_void;
use std::result::Result;
use std::{ptr::null_mut, sync::OnceLock};
use windows::{core::*, Win32::Foundation::*, Win32::UI::WindowsAndMessaging::*};

static ICON_LAYER_HWND_ISIZE: OnceLock<isize> = OnceLock::new();
static TAURI_HWND_ISIZE: OnceLock<isize> = OnceLock::new();

//
// Macro
//
macro_rules! MAKELPARAM {
    ($low:expr, $high:expr) => {
        ((($low & 0xffff) as u32) | (($high & 0xffff) as u32) << 16) as isize
    };
}

//
// Public fn
//
pub fn set_wallpaper(hwnd_isize: isize) -> bool {
    // save as globle
    let _ = TAURI_HWND_ISIZE.set(hwnd_isize);

    if slice_progman() {
        unsafe {
            let _ = EnumWindows(Some(set_wallpaper_layer), LPARAM(hwnd_isize));
        }
        return true;
    } else {
        return false;
    }
}

//
// Private fn
//
fn slice_progman() -> bool {
    // Look for "Progman"
    if let Ok(result) = find_window(None, None, "Progman", "Program Manager") {
        // Send 0x52c msg
        send_0x52c(result);
        return true;
    }
    false
}

extern "system" fn set_wallpaper_layer(hwnd: HWND, tauri_hwnd_lparam: LPARAM) -> BOOL {
    let mut res: BOOL = TRUE;

    if let Ok(_) = find_window(Some(hwnd), None, "SHELLDLL_DefView", "") {
        if let Ok(workerw_hwnd) = find_window(None, Some(hwnd), "WorkerW", "") {
            let tauri_hwnd = HWND(tauri_hwnd_lparam.0 as *mut c_void);

            //
            // set parent
            //
            let _ = unsafe { SetParent(tauri_hwnd, workerw_hwnd) };

            //
            // Get icon_layer tid
            //
            let _ = ICON_LAYER_HWND_ISIZE.set(hwnd.0 as isize);

            //
            // Mouse hook
            //
            let _ = unsafe {
                SetWindowsHookExW(WH_MOUSE_LL, Some(mouse_hook_proc), HINSTANCE(null_mut()), 0)
            };

            // let _ = unsafe { ShowWindow(workerw_hwnd, SW_HIDE) };
            res = FALSE;
        }
    }
    res
}

fn to_pcwstr(s: &str) -> PCWSTR {
    let encoded: Vec<u16> = s.encode_utf16().chain(Some(0)).collect();
    PCWSTR(encoded.as_ptr())
}

fn find_window(
    parent_window: Option<HWND>,
    child_after: Option<HWND>,
    class_name: &str,
    window_name: &str,
) -> Result<HWND, Error> {
    let mut _parent_window: HWND;
    let mut _child_after: HWND;
    match parent_window {
        Some(x) => _parent_window = x,
        None => _parent_window = HWND(null_mut()),
    }
    match child_after {
        Some(x) => _child_after = x,
        None => _child_after = HWND(null_mut()),
    }

    unsafe {
        FindWindowExW(
            _parent_window,
            _child_after,
            if class_name != "" {
                to_pcwstr(class_name)
            } else {
                PCWSTR::null()
            },
            if window_name != "" {
                to_pcwstr(window_name)
            } else {
                PCWSTR::null()
            },
        )
    }
}

fn send_0x52c(hwnd: HWND) -> () {
    let lpdwresult: Option<*mut usize> = Some(&mut 0);

    // SendMessage 0x52C
    let _ = unsafe {
        SendMessageTimeoutW(
            hwnd,
            0x52C,
            WPARAM(0),
            LPARAM(0),
            SEND_MESSAGE_TIMEOUT_FLAGS(SMTO_BLOCK.0),
            100,
            lpdwresult,
        )
    };
}

// hook
unsafe extern "system" fn mouse_hook_proc(
    n_code: i32,
    w_param: WPARAM,
    l_param: LPARAM,
) -> LRESULT {
    if n_code < 0 {
        // CallNextHookEx
        return CallNextHookEx(None, n_code, w_param, l_param);
    }

    // get hwnd
    if let Some(tauri_hwnd_isize) = TAURI_HWND_ISIZE.get() {
        let tauri_hwnd = HWND(*tauri_hwnd_isize as *mut c_void);

        // get web_widget_hwnd
        if let Some(web_widget_hwnd) = get_web_widget_hwnd(tauri_hwnd) {
            let hwnd = unsafe { GetForegroundWindow() };

            let target_hwnd_isize = ICON_LAYER_HWND_ISIZE.get().unwrap();

            if *target_hwnd_isize == hwnd.0 as isize {
                let p = l_param.0 as *const MSLLHOOKSTRUCT;
                let p = *p;

                let l = LPARAM(MAKELPARAM!(p.pt.x, p.pt.y));

                let flag = w_param.0 as u32;
                let w = p.mouseData as usize;

                match flag {
                    // WM_MOUSEMOVE
                    0x200 => PostMessageW(web_widget_hwnd, flag, WPARAM(w), l).unwrap(),

                    // left | x right x | middle
                    0x201..=0x203 | 0x207..=0x209 => {
                        PostMessageW(web_widget_hwnd, flag, WPARAM(w), l).unwrap()
                    }

                    // left | middle
                    // 0x201..=0x203 | 0x207..=0x209 => true,

                    // WM_MOUSEWHEEL
                    0x020A => PostMessageW(web_widget_hwnd, flag, WPARAM(w), l).unwrap(),

                    // unknown
                    _ => (),
                }
            }
        }
    }
    return CallNextHookEx(None, n_code, w_param, l_param);
}

//
fn get_web_widget_hwnd(hwnd: HWND) -> Option<HWND> {
    // shit begin
    if let Ok(wry_webview_hwnd) = find_window(Some(hwnd), None, "WRY_WEBVIEW", "") {
        if let Ok(chrome_widgetwin_0_hwnd) =
            find_window(Some(wry_webview_hwnd), None, "Chrome_WidgetWin_0", "")
        {
            if let Ok(chrome_widgetwin_1_hwnd) =
                unsafe { GetWindow(chrome_widgetwin_0_hwnd, GW_CHILD) }
            {
                if let Ok(chrome_render_widget_host_hwnd) = find_window(
                    Some(chrome_widgetwin_1_hwnd),
                    None,
                    "Chrome_RenderWidgetHostHWND",
                    "Chrome Legacy Window",
                ) {
                    return Some(chrome_render_widget_host_hwnd);
                }
            }
        }
    }
    // shit end
    None
}
