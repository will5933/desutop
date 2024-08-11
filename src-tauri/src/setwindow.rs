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
        let tauri_hwnd: HWND = HWND(tauri_hwnd_lparam.0 as *mut c_void);

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
    // Use default HWND if not provided
    let parent_window: HWND = parent_window.unwrap_or(HWND(null_mut()));
    let child_after: HWND = child_after.unwrap_or(HWND(null_mut()));

    // Convert strings to PCWSTR, handle empty strings as null
    let class_name_pcwstr: PCWSTR = if !class_name.is_empty() {
        to_pcwstr(class_name)
    } else {
        PCWSTR::null()
    };

    let window_name_pcwstr: PCWSTR = if !window_name.is_empty() {
        to_pcwstr(window_name)
    } else {
        PCWSTR::null()
    };

    unsafe {
        FindWindowExW(
            parent_window,
            child_after,
            class_name_pcwstr,
            window_name_pcwstr,
        )
    }
}

fn send_0x52c() {
    let mut lpdwresult: usize = 0;
    let sleep_duration: Duration = Duration::from_millis(100);

    for i in 0..=9 {
        match find_window(None, None, "Progman", "Program Manager") {
            Ok(hwnd) => {
                // SendMessage 0x52C
                unsafe {
                    SendMessageTimeoutW(
                        hwnd,
                        0x52C,
                        WPARAM(0),
                        LPARAM(0),
                        SEND_MESSAGE_TIMEOUT_FLAGS(SMTO_BLOCK.0),
                        100,
                        Some(&mut lpdwresult),
                    );
                }
                return; // Successfully sent message, exit function
            }
            Err(_) if i == 9 => {
                panic!("[CODE03] Cannot find window named `Program Manager`");
            }
            Err(_) => {
                sleep(sleep_duration);
            }
        }
    }
}
