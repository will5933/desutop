// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    image::Image,
    menu::{MenuBuilder, MenuItemBuilder},
    path::BaseDirectory,
    tray::TrayIconBuilder,
    Manager,
};

use serde_json::Value;

use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

mod setwindow;
use setwindow::set_wallpaper;

mod locale;
use locale::{get_lang_json, get_lang_json_string};

mod steamgames;
use steamgames::*;

fn main() {
    tauri::Builder::default()
        // autostart
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        // store
        .plugin(tauri_plugin_store::Builder::new().build())
        // shell
        .plugin(tauri_plugin_shell::init())
        // invoke fn
        .invoke_handler(tauri::generate_handler![
            get_lang_json_string,
            get_steam_games,
            start_steam_game
        ])
        //
        // setup
        //
        .setup(|app: &mut tauri::App| {
            // setup: autostart
            let autostart_manager = app.autolaunch();
            autostart_manager.enable().unwrap();

            // setup: get locale path
            let lang_json_file_path: std::path::PathBuf = app
                .path()
                .resolve("locale/EN.json", BaseDirectory::Resource)?;
            let lang_json: Value = get_lang_json(lang_json_file_path);

            // setup: fn set_system_tray
            setup_set_system_tray(app, lang_json);

            // setup: fn set_windows
            setup_set_windows(app);

            // if let Ok(vec) = get_desktop_contents() {
            //     println!("{:?} length: {}", vec, vec.len());
            // };
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running");
}

//
// set_system_tray
//
fn setup_set_system_tray(app: &mut tauri::App, lang_json: Value) -> () {
    let lang_quit = lang_json["QUIT"].as_str().unwrap();
    let quit = MenuItemBuilder::with_id("quit", lang_quit).build(app).unwrap();
    let menu = MenuBuilder::new(app).items(&[&quit]).build().unwrap();
    let _tray = TrayIconBuilder::new()
        .icon(Image::from_path("icons/icon.ico").unwrap())
        .menu(&menu)
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "quit" => {
                app.exit(0);
            }
            _ => (),
        })
        // .on_tray_icon_event(|tray, event| {
        //     if let TrayIconEvent::Click {
        //         button: MouseButton::Left,
        //         button_state: MouseButtonState::Up,
        //         ..
        //     } = event
        //     {
        //         let app = tray.app_handle();
        //         if let Some(webview_window) = app.get_webview_window("main") {
        //             let _ = webview_window.show();
        //             let _ = webview_window.set_focus();
        //         }
        //     }
        // })
        .build(app)
        .unwrap();
}

//
// set_windows
//
fn setup_set_windows(app: &mut tauri::App) -> () {
    if let Some(ww) = app.get_webview_window("main") {
        //  Set ignore cursor events
        // ww.set_ignore_cursor_events(true).unwrap();

        // Get HWND
        if let Ok(hwnd) = ww.hwnd() {
            // set_wallpaper()
            set_wallpaper(hwnd.0);

            // Waiting for fn set_wallpaper()
            ww.show().unwrap();
        } else {
            panic!("[CODE02] Window handle not found");
        }
    } else {
        panic!("[CODE01] The main window not found");
    }
}
