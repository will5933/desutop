use lazy_static::lazy_static;
use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use rayon::prelude::*;
use regex::Regex;
use std::fs::File;
use std::io::Read;
use std::sync::mpsc::{self};
use std::{fs, path::Path};

use serde::Serialize;

use std::os::windows::process::CommandExt;
use std::process::{Command, Stdio};

//
// SteamGame
//
#[derive(Serialize)]
pub struct SteamGame {
    appid: String,
    name: String,
    state_flags: String,
    last_played: String,
    size_on_disk: String,
}

pub fn watch<P: AsRef<Path>, F: Fn(Event) + Send + 'static>(
    paths: Vec<P>,
    callback: F,
) -> notify::Result<()> {
    let (tx, rx) = mpsc::channel();
    let mut watcher: RecommendedWatcher = RecommendedWatcher::new(tx, Config::default())?;

    for path in paths {
        watcher.watch(path.as_ref(), RecursiveMode::NonRecursive)?;
    }
    for res in rx {
        match res {
            Ok(event) => callback(event),
            Err(err) => eprintln!("Error: {:?}", err),
        }
    }
    Ok(())
}

#[tauri::command]
pub fn get_steam_games() -> core::result::Result<Vec<SteamGame>, ()> {
    let mut all_steam_games: Vec<SteamGame> = Vec::new();

    if let Ok(library_paths_vec) = extract_library_paths() {
        for library_path in library_paths_vec {
            let steamapps_dir: String = library_path + "\\steamapps";
            let vec: Vec<String> = dir_scan(Path::new(&steamapps_dir));

            let res_vec: Vec<SteamGame> = vec
                .into_par_iter() // 使用并行迭代器加速处理
                .filter_map(|filename| {
                    if filename.contains("appmanifest_") {
                        read_steam_game_config(format!("{}\\{}", steamapps_dir, filename))
                    } else {
                        None
                    }
                })
                .collect();

            // 将当前路径的结果添加到总结果向量中
            all_steam_games.extend(res_vec);
        }
    }

    Ok(all_steam_games)
}

#[tauri::command]
pub fn start_steam_game(appid: &str) -> () {
    let status: std::process::ExitStatus = Command::new("cmd")
        .arg("/C")
        .arg(&format!("start steam://rungameid/{appid}"))
        .creation_flags(0x08000000)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .expect("Failed to start the game");

    if !status.success() {
        eprintln!("Failed to start the game: {appid}");
    }
}

// 扫描文件夹
pub fn dir_scan(path: &Path) -> Vec<String> {
    let entries: fs::ReadDir = fs::read_dir(path).unwrap();
    let mut contents: Vec<String> = Vec::with_capacity(30);
    for entry in entries {
        if let Ok(entry) = entry {
            if let Some(filename) = entry.file_name().into_string().ok() {
                contents.push(filename);
            }
        }
    }
    contents.shrink_to_fit();
    contents
}

// 获取steam安装路径
pub fn get_steam_install_path() -> Option<String> {
    let ps_command: &str = r#"
        (Get-ItemProperty -Path 'HKLM:\SOFTWARE\WOW6432Node\Valve\Steam' -Name 'InstallPath').InstallPath
    "#;

    let output: std::process::Output = Command::new("powershell")
        .arg("-NoProfile")
        .arg("-Command")
        .arg(ps_command)
        .creation_flags(0x08000000)
        .output()
        .ok()?;

    let install_path: String = String::from_utf8_lossy(&output.stdout).trim().to_string();

    if install_path.is_empty() {
        None
    } else {
        Some(install_path)
    }
}

// 获取 steam library 安装路径
pub fn extract_library_paths() -> Result<Vec<String>, std::io::Error> {
    let mut file = File::open(format!(
        "{}\\config\\libraryfolders.vdf",
        get_steam_install_path().expect("Failed to find steam path")
    ))?;
    let mut content = String::new();
    file.read_to_string(&mut content)?;

    // 正则表达式匹配路径
    let re = Regex::new(r#"\"path\"\t\t\"(.+)\""#).unwrap();
    let paths: Vec<String> = re
        .captures_iter(&content)
        .map(|cap| cap[1].to_string())
        .collect();

    Ok(paths)
}

// lazy_static
lazy_static! {
    static ref KEY_REGEX_VEC: Vec<Regex> = {
        vec![
            Regex::new(r#"\"appid\"\t\t\"(\d+)\""#).unwrap(),
            Regex::new(r#"\"name\"\t\t\"(.+)\""#).unwrap(),
            Regex::new(r#"\"StateFlags\"\t\t\"(\d+)\""#).unwrap(),
            Regex::new(r#"\"LastPlayed\"\t\t\"(\d+)\""#).unwrap(),
            Regex::new(r#"\"SizeOnDisk\"\t\t\"(\d+)\""#).unwrap(),
        ]
    };
}

fn read_steam_game_config(filepath: String) -> Option<SteamGame> {
    let mut file: File = File::open(filepath).ok()?;
    let mut buffer: String = String::new();
    file.read_to_string(&mut buffer).ok()?;

    let appid: String = get_kv_data(&buffer, &KEY_REGEX_VEC[0])?;
    let name: String = get_kv_data(&buffer, &KEY_REGEX_VEC[1])?;
    let state_flags: String = get_kv_data(&buffer, &KEY_REGEX_VEC[2])?;
    let last_played: String = get_kv_data(&buffer, &KEY_REGEX_VEC[3])?;
    let size_on_disk: String = get_kv_data(&buffer, &KEY_REGEX_VEC[4])?;

    Some(SteamGame {
        appid,
        name,
        state_flags,
        last_played,
        size_on_disk,
    })
}

fn get_kv_data<'a>(buffer: &'a str, re: &Regex) -> Option<String> {
    re.captures(buffer)
        .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()))
}
