// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{path::PathBuf, thread};

// use rayon::iter::{IntoParallelRefIterator, ParallelIterator};
use serde_json::{json, Value};

use tauri::{
    generate_context, generate_handler,
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Listener, Manager, WebviewWindowBuilder,
};

mod locale;
mod setwindow;

mod steamgames;

mod desktopicons;

fn main() {
    use locale::*;
    use steamgames::*;

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            show_msg(app, "Desutop is running!");
        }))
        //
        // invoke_handler
        //
        .invoke_handler(generate_handler![
            get_lang_json_string,
            get_steam_games,
            start_steam_game
        ])
        //
        // setup
        //
        .setup(|app: &mut tauri::App| {
            let settings_config: SettingsConfig = setup_get_settings(app.app_handle().clone());

            // setup: fn set_windows
            setup_set_windows(
                app,
                settings_config.set_wallpaper_for_windows,
                settings_config.wallpaper_file_path,
            );

            let lang_json: Value = serde_json::from_str(
                get_lang_json_string(app.handle().clone(), settings_config.language_json_filename)
                    .as_str(),
            )
            .expect("Language json file corruption");

            // setup: fn set_system_tray
            setup_set_system_tray(app, lang_json);

            // listen
            let _ = app.listen("wallpaper-change", move |event| {
                let string: String =
                    serde_json::from_str(event.payload()).expect("Wallpaper path error");
                let mut x: PathBuf = PathBuf::from(string);
                setwindow::set_windows_wallpaper(&mut x);
            });

            // steam games info watcher
            if let Ok(mut library_path_vec) = extract_library_paths() {
                let handle: AppHandle = app.app_handle().clone();

                for s in library_path_vec.iter_mut() {
                    s.push_str("\\steamapps");
                }

                // thread::spawn
                thread::spawn(move || {
                    if let Err(e) =
                        watch(library_path_vec, move |event| {
                            if event.paths.iter().any(|path| {
                                path.extension().map(|ext| ext == "acf").unwrap_or(false)
                            }) {
                                handle
                                    .emit_to(
                                        "main",
                                        "steamgames-state-change",
                                        &get_steam_games().expect("Failed to get steam games"),
                                    )
                                    .expect("Failed to emit event `steamgames-state-change`");
                            }
                        })
                    {
                        eprintln!("Watch error: {:?}", e);
                    }
                });
            }

            // clipboard watcher
            let handle: AppHandle = app.app_handle().clone();
            thread::spawn(move || {
                start_listen_clipboard(|| {
                    handle
                        .emit_to("main", "clipboard-change", 0)
                        .expect("clipboard-change");
                });
            });

            // use desktopicons::*;

            // if let Ok(vec) = get_desktop_contents() {
            //     // 使用 Rayon 并行处理
            //     vec.par_iter().for_each(|path| {
            //         if let Some(extension) = path.extension() {
            //             if extension == "lnk" {
            //                 println!("{:?}", path);
            //                 get_lnk_info(path.clone());
            //             }
            //         }
            //     });
            // }
            Ok(())
        });

    //
    // run
    //
    app.run(generate_context!()).expect("error while running")
}

#[derive(serde::Serialize, serde::Deserialize)]
struct SettingsConfig {
    set_wallpaper_for_windows: bool,
    language_json_filename: String,
    wallpaper_file_path: String,
    steam_path: String,
}

fn setup_get_settings(handle: AppHandle) -> SettingsConfig {
    use tauri_plugin_store::StoreBuilder;
    let mut store = StoreBuilder::new("settings.bin").build(handle);

    if let Ok(()) = store.load() {
        if let Some(raw_json_string) = store.get("data") {
            serde_json::from_value(raw_json_string.to_owned()).expect("Failed to load settings")
        } else {
            panic!("Failed to load settings");
        }
    } else {
        //
        // init
        //
        let init_setting: SettingsConfig = SettingsConfig {
            set_wallpaper_for_windows: true,
            language_json_filename: String::from("EN.json"),
            wallpaper_file_path: String::from("wallpapers/default.webp"),
            steam_path: steamgames::get_steam_install_path().unwrap_or(String::from("NOTFOUND")),
        };
        store
            .insert(String::from("data"), json!(init_setting))
            .expect("Failed to init settings");
        store.save().expect("Failed to save settings");
        init_setting
    }
}

fn start_listen_clipboard<F: Fn() -> ()>(handle_fn: F) -> thread::JoinHandle<()> {
    use clipboard_win::{formats, get_clipboard};

    let mut cache: String = String::new();
    loop {
        let new_data: String = get_clipboard(formats::Unicode).unwrap_or(String::new());
        if cache != new_data {
            handle_fn();
            cache = new_data;
        }

        thread::sleep(std::time::Duration::from_millis(300));
    }
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
    //
    let _tray: tauri::tray::TrayIcon = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().to_owned())
        .menu(&menu)
        .on_menu_event(move |app: &AppHandle, event: tauri::menu::MenuEvent| {
            match event.id().as_ref() {
                "quit" => {
                    app.cleanup_before_exit();
                    app.exit(0);
                }
                "settings" => {
                    open_settings_windows(app, &lang_json);
                }
                _ => (),
            }
        })
        .build(app)
        .unwrap();
}

//
// set_windows
//
fn setup_set_windows(
    app: &mut tauri::App,
    set_for_system: bool,
    wallpaper_file_path: String,
) -> () {
    if let Some(ww) = app.get_webview_window("main") {

        // Get HWND
        if let Ok(hwnd) = ww.hwnd() {
            // set_wallpaper()
            setwindow::set_wallpaper(
                hwnd.0,
                app.app_handle().clone(),
                set_for_system,
                wallpaper_file_path,
            );

            // Waiting for fn set_wallpaper()
            ww.show().unwrap();
        }
    }
}

fn open_settings_windows(app: &AppHandle, lang_json: &Value) -> () {
    if app.get_webview_window("settings").is_none() {
        let builder = WebviewWindowBuilder::new(
            app,
            "settings",
            tauri::WebviewUrl::App("settings_page/settings.html#common".into()),
        );
        let _webview = builder
            .inner_size(800.0, 600.0)
            .min_inner_size(800.0, 500.0)
            .max_inner_size(1200.0, 800.0)
            // .disable_drag_drop_handler()
            .decorations(false)
            .center()
            .title(lang_json["SETTINGS"]["TITLE_SETTINGS"].as_str().unwrap())
            .build()
            .unwrap();
    } else {
        app.get_webview_window("settings")
            .unwrap()
            .set_focus()
            .unwrap();
    }
}

fn show_msg(app: &AppHandle, msg: &str) {
    use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

    let _ans = app
        .dialog()
        .message(msg)
        .kind(MessageDialogKind::Error)
        .title("Warning")
        .blocking_show();
}
