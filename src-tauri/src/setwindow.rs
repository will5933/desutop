use std::ptr::null_mut;
use std::result::Result;
use std::time::Duration;
use std::{os::raw::c_void, thread::sleep};
use windows::{core::*, Win32::Foundation::*, Win32::UI::WindowsAndMessaging::*};

//
// Public fn
//
pub fn set_wallpaper(hwnd_isize: isize) -> () {
    send_0x52c();
    unsafe {
        let _ = EnumWindows(Some(set_wallpaper_layer), LPARAM(hwnd_isize));
    };
}

//
// Private fn
//
extern "system" fn set_wallpaper_layer(hwnd: HWND, tauri_hwnd_lparam: LPARAM) -> BOOL {
    let mut res: BOOL = TRUE;

    if let Ok(_) = find_window(Some(hwnd), None, "SHELLDLL_DefView", "") {
        let tauri_hwnd = HWND(tauri_hwnd_lparam.0 as *mut c_void);

        //
        // set parent
        //
        let _ = unsafe { SetParent(tauri_hwnd, hwnd) };

        // let _ = unsafe { ShowWindow(workerw_hwnd, SW_HIDE) };
        res = FALSE;
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

fn send_0x52c() -> () {
    for i in 0..=9 {
        if let Ok(hwnd) = find_window(None, None, "Progman", "Program Manager") {
            let lpdwresult: Option<*mut usize> = Some(&mut 0);

            // SendMessage 0x52C
            unsafe {
                SendMessageTimeoutW(
                    hwnd,
                    0x52C,
                    WPARAM(0),
                    LPARAM(0),
                    SEND_MESSAGE_TIMEOUT_FLAGS(SMTO_BLOCK.0),
                    100,
                    lpdwresult,
                );
            }
            break;
        }
        // panic
        if i == 9 {
            panic!("[CODE03] Cannot find window named `Program Manager`")
        }
        sleep(Duration::from_millis(100));
    }
}
