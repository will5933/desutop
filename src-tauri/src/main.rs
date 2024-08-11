// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    AppHandle, Manager, WebviewWindowBuilder,
};

use serde_json::Value;

// use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

mod locale;
mod setwindow;

mod steamgames;

fn main() {
    use locale::*;
    use steamgames::*;

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            let _ = show_msg(app);
        }))
        // autostart
        // .plugin(tauri_plugin_autostart::init(
        //     MacosLauncher::LaunchAgent,
        //     None,
        // ))
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
            // setup: fn set_windows
            setup_set_windows(app);

            let lang_json: Value = serde_json::from_str(get_lang_json_string(app.handle().clone()).as_str()).unwrap();

            // setup: fn set_system_tray
            setup_set_system_tray(app, lang_json);

            // if let Ok(vec) = get_desktop_contents() {
            //     println!("{:?} length: {}", vec, vec.len());
            // };

            // setup: autostart
            // let autostart_manager: tauri::State<tauri_plugin_autostart::AutoLaunchManager> =
            //     app.autolaunch();
            // if !autostart_manager.is_enabled().unwrap() {
            //     autostart_manager.enable().unwrap();
            // }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running");
}

//
// set_system_tray
//
fn setup_set_system_tray(app: &mut tauri::App, lang_json: Value) -> () {
    let lang_quit: &str = lang_json["QUIT"].as_str().unwrap();
    let lang_settings: &str = lang_json["SETTINGS"]["SETTINGS"].as_str().unwrap();
    // let lang_title_settings: &str = lang_json["TITLE_SETTINGS"].as_str().unwrap();

    let quit = MenuItemBuilder::with_id("quit", lang_quit)
        .build(app)
        .unwrap();
    let settings = MenuItemBuilder::with_id("settings", lang_settings)
        .build(app)
        .unwrap();
    //
    let menu = MenuBuilder::new(app)
        .items(&[&settings, &quit])
        .build()
        .unwrap();
    let _tray: tauri::tray::TrayIcon = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().to_owned())
        .menu(&menu)
        .on_menu_event(move |app: &AppHandle, event| match event.id().as_ref() {
            "quit" => {
                app.exit(0);
            }
            "settings" => {
                open_settings_windows(app, &lang_json);
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
            setwindow::set_wallpaper(hwnd.0);

            // Waiting for fn set_wallpaper()
            ww.show().unwrap();
        }
    }
}

fn open_settings_windows(app: &AppHandle, lang_json: &Value) -> () {
    let builder = WebviewWindowBuilder::new(
        app,
        "settings",
        tauri::WebviewUrl::App("settings_page/settings.html".into()),
    );
    let _webview = builder
        .inner_size(800.0, 600.0)
        .min_inner_size(600.0, 400.0)
        .max_inner_size(1200.0, 800.0)
        .decorations(false)
        .center()
        .title(lang_json["SETTINGS"]["TITLE_SETTINGS"].as_str().unwrap())
        .build()
        .unwrap();
}

fn show_msg(app: &AppHandle) {
    use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

    let _ans = app
        .dialog()
        .message("Desutop is running!")
        .kind(MessageDialogKind::Error)
        .title("Warning")
        .blocking_show();
}
