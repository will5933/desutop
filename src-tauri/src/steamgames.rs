use lazy_static::lazy_static;
use rayon::prelude::*;
use regex::Regex;
use std::borrow::Cow;
use std::fs::File;
use std::io::Read;
use std::{fs, path::Path};

use serde::Serialize;

use std::os::windows::process::CommandExt;
use std::process::{Command, Stdio};

//
// SteamGame
//
#[derive(Serialize)]
pub struct SteamGame<'a> {
    appid: Cow<'a, str>,
    name: Cow<'a, str>,
    state_flags: Cow<'a, str>,
    last_played: Cow<'a, str>,
    size_on_disk: Cow<'a, str>,
}

#[tauri::command]
pub fn get_steam_games() -> Result<Vec<SteamGame<'static>>, ()> {
    match get_steam_install_path() {
        Some(steam_path) => {
            let steamapps_dir: String = steam_path + "/steamapps";
            let vec: Vec<String> = dir_scan(Path::new(&steamapps_dir));

            let res_vec: Vec<SteamGame> = vec
                .into_par_iter()
                .filter_map(|filename| {
                    if filename.contains("appmanifest_") {
                        read_steam_game_config(format!("{}/{}", steamapps_dir, filename))
                    } else {
                        None
                    }
                })
                .collect();
            Ok(res_vec)
        }
        None => Err(()),
    }
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
fn get_steam_install_path() -> Option<String> {
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

fn read_steam_game_config(filepath: String) -> Option<SteamGame<'static>> {
    let mut file: File = File::open(filepath).ok()?;
    let mut buffer: String = String::new();
    file.read_to_string(&mut buffer).ok()?;

    let appid: Cow<str> = get_kv_data(&buffer, &KEY_REGEX_VEC[0])?;
    let name: Cow<str> = get_kv_data(&buffer, &KEY_REGEX_VEC[1])?;
    let state_flags: Cow<str> = get_kv_data(&buffer, &KEY_REGEX_VEC[2])?;
    let last_played: Cow<str> = get_kv_data(&buffer, &KEY_REGEX_VEC[3])?;
    let size_on_disk: Cow<str> = get_kv_data(&buffer, &KEY_REGEX_VEC[4])?;

    Some(SteamGame {
        appid: appid.into_owned().into(),
        name: name.into_owned().into(),
        state_flags: state_flags.into_owned().into(),
        last_played: last_played.into_owned().into(),
        size_on_disk: size_on_disk.into_owned().into(),
    })
}

fn get_kv_data<'a>(buffer: &'a str, re: &Regex) -> Option<Cow<'a, str>> {
    re.captures(buffer).and_then(|cap| cap.get(1).map(|m| Cow::from(m.as_str())))
}
