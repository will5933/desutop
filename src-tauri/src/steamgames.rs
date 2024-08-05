use lazy_static::lazy_static;
use regex::Regex;
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
pub struct SteamGame {
    appid: String,
    name: String,
    state_flags: String,
}

#[tauri::command]
pub fn get_steam_games() -> Result<Vec<SteamGame>, ()> {
    match get_steam_install_path() {
        Some(steam_path) => {
            // println!("{}", steam_path);
            let steamapps_dir: String = steam_path + "/steamapps";
            let vec: Vec<String> = dir_scan(Path::new(&steamapps_dir));

            let mut res_vec: Vec<SteamGame> = Vec::new();
            for filename in vec {
                if filename.contains("appmanifest_") {
                    if let Some(res) =
                        read_steam_game_config(format!("{}/{}", steamapps_dir, filename))
                    {
                        res_vec.push(res);
                    };
                }
            }
            Ok(res_vec)
        }
        None => Err(()),
    }
}

#[tauri::command]
pub fn start_steam_game(appid: &str) -> () {
    let status = Command::new("cmd")
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
    let entries = fs::read_dir(path).unwrap();
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
        .output()
        .expect("Failed to execute PowerShell command");

    let install_path: String = String::from_utf8_lossy(&output.stdout).trim().to_string();

    Some(install_path)
}

// lazy_static
lazy_static! {
    static ref KEY_REGEX_VEC: Vec<Regex> = {
        vec![
            Regex::new(r#"\"appid\"\t\t\"(\d+)\""#).unwrap(),
            Regex::new(r#"\"name\"\t\t\"(.+)\""#).unwrap(),
            Regex::new(r#"\"StateFlags\"\t\t\"(\d+)\""#).unwrap(),
        ]
    };
}

fn read_steam_game_config(filepath: String) -> Option<SteamGame> {
    let f = File::open(filepath);
    if let Ok(mut file) = f {
        let mut buffer: String = String::new();

        // read the whole file
        let _ = file.read_to_string(&mut buffer);

        // println!("{:?}", buffer);

        let appid = get_kv_data(&buffer, &KEY_REGEX_VEC[0]);
        let name = get_kv_data(&buffer, &KEY_REGEX_VEC[1]);
        let state_flags = get_kv_data(&buffer, &KEY_REGEX_VEC[2]);

        match (appid, name, state_flags) {
            (Some(a), Some(n), Some(s)) => {
                let game = SteamGame {
                    appid: a,
                    name: n,
                    state_flags: s,
                };
                // println!("{}", game);
                Some(game)
            }
            _ => None,
        }
    } else {
        None
    }
}

fn get_kv_data(buffer: &str, re: &Regex) -> Option<String> {
    if let Some(re) = re.captures(buffer) {
        Some(re.get(1).map_or("".to_owned(), |m| m.as_str().to_string()))
    } else {
        None
    }
}
