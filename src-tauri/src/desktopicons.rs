use dirs::desktop_dir;
use std::{fs, io};

// 获取桌面图标
pub fn get_desktop_contents() -> Result<Vec<String>, io::Error> {
    if let Some(desktop_path) = desktop_dir() {
        let entries = fs::read_dir(desktop_path)?
            .filter_map(Result::ok) // Filters out any errors from read_dir.
            .filter_map(|entry| entry.file_name().into_string().ok()) // Filters out non-UTF-8 filenames.
            .filter(|name| *name != "desktop.ini")
            .collect();

        Ok(entries)
    } else {
        Err(io::Error::new(
            io::ErrorKind::NotFound,
            "Desktop directory not found",
        ))
    }
}
