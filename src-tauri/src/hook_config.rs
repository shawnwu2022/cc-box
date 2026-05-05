use anyhow::Result;
use std::fs;
use std::path::PathBuf;

// 编译时嵌入 plugin 源文件
const PLUGIN_JSON: &str = include_str!("../plugin/.claude-plugin/plugin.json");
const HOOKS_JSON: &str = include_str!("../plugin/hooks/hooks.json");
const REPORT_HOOK_SH: &str = include_str!("../plugin/scripts/report-hook.sh");

/// Plugin 版本（与 app 版本绑定）
const PLUGIN_VERSION: &str = env!("CARGO_PKG_VERSION");

/// Plugin 目标路径（~/.cc-box/claude-plugin/）
pub fn plugin_dir() -> PathBuf {
    dirs::home_dir()
        .expect("Home directory not found")
        .join(".cc-box")
        .join("claude-plugin")
}

/// 确保 plugin 文件存在于目标路径
/// 如果版本匹配，跳过所有文件操作
pub fn ensure_plugin_files() -> Result<()> {
    let dir = plugin_dir();
    let version_file = dir.join(".version");

    // 版本匹配时跳过
    if version_file.exists() {
        if let Ok(existing_version) = fs::read_to_string(&version_file) {
            if existing_version.trim() == PLUGIN_VERSION {
                log::info!("Plugin version {} matches, skipping deployment", PLUGIN_VERSION);
                return Ok(());
            }
        }
    }

    // 版本不匹配或不存在，需要部署
    log::info!("Deploying plugin version {}", PLUGIN_VERSION);

    fs::create_dir_all(dir.join(".claude-plugin"))?;
    fs::create_dir_all(dir.join("hooks"))?;
    fs::create_dir_all(dir.join("scripts"))?;

    write_file(dir.join(".claude-plugin").join("plugin.json"), PLUGIN_JSON)?;
    write_file(dir.join("hooks").join("hooks.json"), HOOKS_JSON)?;
    write_file(dir.join("scripts").join("report-hook.sh"), REPORT_HOOK_SH)?;
    write_file(version_file, PLUGIN_VERSION)?;

    log::info!("Plugin deployed successfully");
    Ok(())
}

fn write_file(path: PathBuf, content: &str) -> Result<()> {
    fs::write(&path, content)?;
    Ok(())
}
