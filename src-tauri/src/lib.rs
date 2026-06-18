use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize)]
pub struct GrepHit {
    pub topic_id: String,
    pub file: String,
    pub line: u64,
    pub snippet: String,
}

#[tauri::command]
fn grep_topics(root: String, query: String, is_regex: bool) -> Result<Vec<GrepHit>, String> {
    if query.is_empty() {
        return Ok(vec![]);
    }
    let pattern = if is_regex { query.clone() } else { regex::escape(&query) };
    let re = regex::RegexBuilder::new(&pattern)
        .case_insensitive(true)
        .build()
        .map_err(|e| e.to_string())?;
    let mut hits: Vec<GrepHit> = Vec::new();
    if !Path::new(&root).exists() {
        return Ok(hits);
    }
    for entry in WalkDir::new(&root).into_iter().filter_map(|e| e.ok()) {
        if !entry.file_type().is_file() {
            continue;
        }
        let path = entry.path();
        if path.extension().and_then(|x| x.to_str()) != Some("md") {
            continue;
        }
        let content = match std::fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => continue,
        };
        let topic_id = path
            .parent()
            .and_then(|p| p.file_name())
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();
        for (i, line) in content.lines().enumerate() {
            if re.is_match(line) {
                hits.push(GrepHit {
                    topic_id: topic_id.clone(),
                    file: path.to_string_lossy().into_owned(),
                    line: (i + 1) as u64,
                    snippet: line.chars().take(400).collect(),
                });
                if hits.len() >= 500 {
                    return Ok(hits);
                }
            }
        }
    }
    Ok(hits)
}

#[tauri::command]
fn ensure_dir(path: String) -> Result<(), String> {
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    if !Path::new(&path).exists() {
        return Ok(String::new());
    }
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn append_text_file(path: String, content: String) -> Result<u64, String> {
    use std::io::Write;
    if let Some(parent) = Path::new(&path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let mut f = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| e.to_string())?;
    let offset = f.metadata().map_err(|e| e.to_string())?.len();
    f.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
    Ok(offset)
}

#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_path(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.is_dir() {
        std::fs::remove_dir_all(p).map_err(|e| e.to_string())
    } else if p.exists() {
        std::fs::remove_file(p).map_err(|e| e.to_string())
    } else {
        Ok(())
    }
}

#[tauri::command]
fn app_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.to_string_lossy().into_owned())
}

fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "initial schema",
            sql: include_str!("../migrations/001_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add topic icon",
            sql: include_str!("../migrations/002_add_topic_icon.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add user profiles",
            sql: include_str!("../migrations/003_add_user_profiles.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add topic type",
            sql: include_str!("../migrations/004_add_topic_type.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "add message interactive data",
            sql: include_str!("../migrations/005_add_message_interactive.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:kui.db", migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            grep_topics,
            ensure_dir,
            read_text_file,
            append_text_file,
            write_text_file,
            delete_path,
            app_data_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
