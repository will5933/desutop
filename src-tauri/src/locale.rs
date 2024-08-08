use serde_json::Value;
use std::io::Read;
use tauri::{path::BaseDirectory, Manager};

#[tauri::command]
pub fn get_lang_json_string(handle: tauri::AppHandle) -> String {
    let resource_path = handle
        .path()
        .resolve("locale/default.json", BaseDirectory::Resource)
        .unwrap();

    let mut json_str = String::new();
    let mut file = std::fs::File::open(&resource_path).unwrap();
    let _ = file.read_to_string(&mut json_str);

    json_str
}

pub fn get_lang_json(resource_path: std::path::PathBuf) -> Value {
    let mut json_str = String::new();

    let mut file = std::fs::File::open(resource_path).unwrap();

    let _ = file.read_to_string(&mut json_str);

    serde_json::from_str(json_str.as_str()).unwrap()
}
