use serde_json::json;
use std::{fs::File, io::Read, path::PathBuf};
use tauri::{path::BaseDirectory, AppHandle, Manager, Wry};
use tauri_plugin_store::{with_store, StoreCollection};

#[tauri::command]
pub fn get_lang_json_string(handle: AppHandle) -> String {
    let stores = handle.state::<StoreCollection<Wry>>();
    let path: PathBuf = PathBuf::from("settings.bin");

    if let Ok(result) = with_store(handle.clone(), stores, path, |store| {
        let lang_json_filename: &str = if store.has("language_json_filename") {
            store
                .get("language_json_filename")
                .expect("Failed to get value from store")
                .as_str()
                .expect("Failed to get value from store")
        } else {
            store.insert("language_json_filename".to_string(), json!("EN.json"))?;
            store.save()?;
            "EN.json"
        };

        let resource_path: PathBuf = handle
            .path()
            .resolve(
                format!("locale/{}", lang_json_filename),
                BaseDirectory::Resource,
            )
            .unwrap();

        let mut json_str: String = String::new();
        let mut file: File = File::open(&resource_path).expect("Failed to open file");
        file.read_to_string(&mut json_str)
            .map_err(|_| "Failed to read file")
            .expect("Failed to read file");

        Ok(json_str)
    }) {
        result
    } else {
        panic!("Failed to get language config");
    }
}
