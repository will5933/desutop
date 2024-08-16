use std::ffi::OsStr;
use std::os::windows::ffi::OsStrExt as _;
use std::path::PathBuf;
use std::ptr::null_mut;
use std::result::Result;
use std::time::Duration;
use std::{os::raw::c_void, thread::sleep};
use tauri::{path::BaseDirectory, AppHandle, Manager};
use windows::{core::*, Win32::Foundation::*, Win32::UI::WindowsAndMessaging::*};

//
// Public fn
//
pub fn set_wallpaper(
    hwnd_isize: isize,
    handle: AppHandle,
    set_for_system: bool,
    wallpaper_file_path: String,
) -> () {
    send_0x52c();
    unsafe {
        let _ = EnumWindows(Some(set_wallpaper_layer), LPARAM(hwnd_isize));
    };

    if set_for_system {
        // set Windows wallpaper
        let mut binding: PathBuf = handle
            .path()
            .resolve(wallpaper_file_path, BaseDirectory::Resource)
            .expect("Failed to resolve wallpaper image path");
        set_windows_wallpaper(&mut binding);
    }
}

pub fn set_windows_wallpaper(binding: &mut PathBuf) -> () {
    let pic_path: &mut OsStr = binding.as_mut_os_str();

    let wide_path: Vec<u16> = pic_path.encode_wide().chain(Some(0).into_iter()).collect();

    unsafe {
        SystemParametersInfoW(
            SPI_SETDESKWALLPAPER,
            0,
            Some(wide_path.as_ptr() as *mut _),
            SPIF_UPDATEINIFILE | SPIF_SENDCHANGE,
        )
        .expect("Failed to set Windows wallpaper")
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
            Err(e) if i == 9 => {
                panic!("Cannot find window named `Program Manager` {}", e);
            }
            Err(_) => {
                sleep(sleep_duration);
            }
        }
    }
}
