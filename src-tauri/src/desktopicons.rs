// use core::str;
// use dirs::desktop_dir;
// use std::{fs, io, path::PathBuf};

// // 获取桌面图标
// pub fn _get_desktop_contents() -> Result<Vec<PathBuf>, io::Error> {
//     if let Some(desktop_path) = desktop_dir() {
//         let entries = fs::read_dir(desktop_path)?
//             .filter_map(Result::ok)
//             .map(|entry| entry.path())
//             .filter(|path| {
//                 path.file_name()
//                     .and_then(|name| name.to_str())
//                     .map(|name| name != "desktop.ini")
//                     .unwrap_or(false)
//             })
//             .collect();

//         Ok(entries)
//     } else {
//         Err(io::Error::new(
//             io::ErrorKind::NotFound,
//             "Desktop directory not found",
//         ))
//     }
// }

// pub fn _get_lnk_info(lnk_file_path: PathBuf) {
//     let output = std::process::Command::new("powershell")
//         .arg("-NoProfile")
//         .arg("-Command")
//         .arg(format!(
//             "(New-Object -ComObject WScript.Shell).CreateShortcut('{}').TargetPath",
//             lnk_file_path.display()
//         ))
//         .output()
//         .expect("Failed to execute command");

//     if output.status.success() {
//         let target_path = str::from_utf8(&output.stdout).unwrap().trim();
//         println!("Target Path: {}", target_path);
//     } else {
//         eprintln!(
//             "Error: {}",
//             str::from_utf8(&output.stderr).unwrap_or("Unknown error")
//         );
//     }
// }
