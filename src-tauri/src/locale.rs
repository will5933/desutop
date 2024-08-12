use std::{fs::File, io::Read, path::PathBuf};
use tauri::{path::BaseDirectory, AppHandle, Manager};

#[tauri::command]
pub fn get_lang_json_string(handle: AppHandle, language_json_filename: String) -> String {
    let resource_path: PathBuf = handle
        .path()
        .resolve(
            format!("locale/{}", language_json_filename),
            BaseDirectory::Resource,
        )
        .unwrap();
    let mut json_str: String = String::new();
    let mut file: File = File::open(&resource_path).expect("Failed to open language file");
    file.read_to_string(&mut json_str)
        .map_err(|_| "Failed to read language file")
        .expect("Failed to read language file");
    json_str
}
