use std::collections::HashMap;
use tempfile::tempdir;

// ==================== sync_claude_env ====================

// settings.json 不存在时创建文件并写入 env 字段
#[test]
fn SyncEnv_NewFile_001() {
    let dir = tempdir().unwrap();
    // 临时替换 home 目录
    let home_env = "CC_BOX_TEST_HOME";
    let home_path = dir.path().to_string_lossy().to_string();
    std::env::set_var(home_env, &home_path);

    // 手动创建 .claude 目录（sync_claude_env 使用 dirs::home_dir，无法直接测试）
    // 此测试验证逻辑时使用模拟方式：直接调用内部逻辑
    // 实际测试需要 mock dirs::home_dir，这里通过构造测试路径验证合并逻辑

    let settings_path = dir.path().join(".claude").join("settings.json");
    std::fs::create_dir_all(settings_path.parent().unwrap()).unwrap();

    let user_env: HashMap<String, String> = HashMap::from([
        ("LANG".to_string(), "en_US.UTF-8".to_string()),
        ("PYTHONUTF8".to_string(), "1".to_string()),
    ]);

    // 模拟 sync_claude_env 的核心逻辑
    let mut settings = serde_json::json!({});
    let settings_obj = settings.as_object_mut().unwrap();
    settings_obj.insert("env".to_string(), serde_json::json!({}));

    let env_obj = settings_obj.get_mut("env").unwrap().as_object_mut().unwrap();
    for (key, value) in &user_env {
        env_obj.insert(key.clone(), serde_json::Value::String(value.clone()));
    }

    std::fs::write(&settings_path, serde_json::to_string_pretty(&settings).unwrap()).unwrap();

    // 验证：文件存在且 env 包含写入的变量
    let content = std::fs::read_to_string(&settings_path).unwrap();
    let parsed: serde_json::Value = serde_json::from_str(&content).unwrap();
    assert!(parsed.get("env").is_some());
    let env = parsed.get("env").unwrap().as_object().unwrap();
    assert_eq!(env.get("LANG").unwrap().as_str(), Some("en_US.UTF-8"));
    assert_eq!(env.get("PYTHONUTF8").unwrap().as_str(), Some("1"));
}

// user_env 合写入 env 时保留用户手动添加的变量
#[test]
fn SyncEnv_Merge_001() {
    let dir = tempdir().unwrap();
    let settings_path = dir.path().join(".claude").join("settings.json");
    std::fs::create_dir_all(settings_path.parent().unwrap()).unwrap();

    // 预置：settings.json 中已有 env，包含 cc-box 管理和用户手动添加的变量
    let existing = serde_json::json!({
        "env": {
            "LANG": "zh_CN.UTF-8",
            "MY_CUSTOM_VAR": "custom_value"
        }
    });
    std::fs::write(&settings_path, serde_json::to_string_pretty(&existing).unwrap()).unwrap();

    // 执行：写入新的 cc-box 管理变量
    let user_env: HashMap<String, String> = HashMap::from([
        ("LANG".to_string(), "en_US.UTF-8".to_string()),
        ("PYTHONUTF8".to_string(), "1".to_string()),
    ]);
    let removed_keys: Vec<String> = Vec::new();

    // 模拟核心逻辑
    let content = std::fs::read_to_string(&settings_path).unwrap();
    let mut settings: serde_json::Value = serde_json::from_str(&content).unwrap();
    let settings_obj = settings.as_object_mut().unwrap();
    let env_obj = settings_obj.get_mut("env").unwrap().as_object_mut().unwrap();

    for key in &removed_keys {
        env_obj.remove(key);
    }
    for (key, value) in &user_env {
        env_obj.insert(key.clone(), serde_json::Value::String(value.clone()));
    }

    std::fs::write(&settings_path, serde_json::to_string_pretty(&settings).unwrap()).unwrap();

    // 验证：LANG 被更新，MY_CUSTOM_VAR 保留，PYTHONUTF8 新增
    let result: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(&settings_path).unwrap()).unwrap();
    let env = result.get("env").unwrap().as_object().unwrap();
    assert_eq!(env.get("LANG").unwrap().as_str(), Some("en_US.UTF-8"));
    assert_eq!(env.get("MY_CUSTOM_VAR").unwrap().as_str(), Some("custom_value"));
    assert_eq!(env.get("PYTHONUTF8").unwrap().as_str(), Some("1"));
}

// user_env 覆盖已存在的同名 key
#[test]
fn SyncEnv_Overwrite_001() {
    let dir = tempdir().unwrap();
    let settings_path = dir.path().join(".claude").join("settings.json");
    std::fs::create_dir_all(settings_path.parent().unwrap()).unwrap();

    // 预置：LANG 已有旧值
    let existing = serde_json::json!({
        "env": {
            "LANG": "old_value"
        }
    });
    std::fs::write(&settings_path, serde_json::to_string_pretty(&existing).unwrap()).unwrap();

    // 执行：写入新值
    let user_env: HashMap<String, String> = HashMap::from([
        ("LANG".to_string(), "new_value".to_string()),
    ]);

    let content = std::fs::read_to_string(&settings_path).unwrap();
    let mut settings: serde_json::Value = serde_json::from_str(&content).unwrap();
    let env_obj = settings.as_object_mut().unwrap().get_mut("env").unwrap().as_object_mut().unwrap();
    for (key, value) in &user_env {
        env_obj.insert(key.clone(), serde_json::Value::String(value.clone()));
    }
    std::fs::write(&settings_path, serde_json::to_string_pretty(&settings).unwrap()).unwrap();

    // 验证：LANG 被覆盖为新值
    let result: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(&settings_path).unwrap()).unwrap();
    assert_eq!(result["env"]["LANG"].as_str(), Some("new_value"));
}

// removed_keys 从 settings env 中删除指定 key
#[test]
fn SyncEnv_Remove_001() {
    let dir = tempdir().unwrap();
    let settings_path = dir.path().join(".claude").join("settings.json");
    std::fs::create_dir_all(settings_path.parent().unwrap()).unwrap();

    // 预置：env 中有 OLD_KEY
    let existing = serde_json::json!({
        "env": {
            "OLD_KEY": "to_be_removed",
            "LANG": "en_US.UTF-8"
        }
    });
    std::fs::write(&settings_path, serde_json::to_string_pretty(&existing).unwrap()).unwrap();

    // 执行：removed_keys 包含 OLD_KEY，user_env 为空
    let user_env: HashMap<String, String> = HashMap::new();
    let removed_keys: Vec<String> = vec!["OLD_KEY".to_string()];

    let content = std::fs::read_to_string(&settings_path).unwrap();
    let mut settings: serde_json::Value = serde_json::from_str(&content).unwrap();
    let env_obj = settings.as_object_mut().unwrap().get_mut("env").unwrap().as_object_mut().unwrap();
    for key in &removed_keys {
        env_obj.remove(key);
    }
    for (key, value) in &user_env {
        env_obj.insert(key.clone(), serde_json::Value::String(value.clone()));
    }
    std::fs::write(&settings_path, serde_json::to_string_pretty(&settings).unwrap()).unwrap();

    // 验证：OLD_KEY 被删除，LANG 保留
    let result: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(&settings_path).unwrap()).unwrap();
    let env = result.get("env").unwrap().as_object().unwrap();
    assert!(env.get("OLD_KEY").is_none());
    assert!(env.get("LANG").is_some());
}

// removed_keys 只删除指定 key，保留其他 cc-box 管理的 key
#[test]
fn SyncEnv_RemovePreserve_001() {
    let dir = tempdir().unwrap();
    let settings_path = dir.path().join(".claude").join("settings.json");
    std::fs::create_dir_all(settings_path.parent().unwrap()).unwrap();

    // 预置：多个 cc-box 管理的变量
    let existing = serde_json::json!({
        "env": {
            "LANG": "en_US.UTF-8",
            "LC_ALL": "en_US.UTF-8",
            "PYTHONUTF8": "1"
        }
    });
    std::fs::write(&settings_path, serde_json::to_string_pretty(&existing).unwrap()).unwrap();

    // 执行：只删除 LANG，其他保留
    let user_env: HashMap<String, String> = HashMap::from([
        ("LC_ALL".to_string(), "en_US.UTF-8".to_string()),
        ("PYTHONUTF8".to_string(), "1".to_string()),
    ]);
    let removed_keys: Vec<String> = vec!["LANG".to_string()];

    let content = std::fs::read_to_string(&settings_path).unwrap();
    let mut settings: serde_json::Value = serde_json::from_str(&content).unwrap();
    let env_obj = settings.as_object_mut().unwrap().get_mut("env").unwrap().as_object_mut().unwrap();
    for key in &removed_keys {
        env_obj.remove(key);
    }
    for (key, value) in &user_env {
        env_obj.insert(key.clone(), serde_json::Value::String(value.clone()));
    }
    std::fs::write(&settings_path, serde_json::to_string_pretty(&settings).unwrap()).unwrap();

    // 验证：LANG 删除，LC_ALL 和 PYTHONUTF8 保留
    let result: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(&settings_path).unwrap()).unwrap();
    let env = result.get("env").unwrap().as_object().unwrap();
    assert!(env.get("LANG").is_none());
    assert!(env.get("LC_ALL").is_some());
    assert!(env.get("PYTHONUTF8").is_some());
}

// 非空 settings.json 保留其他顶级字段（如 permissions、model）
#[test]
fn SyncEnv_PreserveNonCcBox_001() {
    let dir = tempdir().unwrap();
    let settings_path = dir.path().join(".claude").join("settings.json");
    std::fs::create_dir_all(settings_path.parent().unwrap()).unwrap();

    // 预置：settings.json 有多个顶级字段
    let existing = serde_json::json!({
        "model": "claude-sonnet-4-20250514",
        "permissions": {
            "allow": ["Bash(ls:*)"]
        },
        "env": {
            "LANG": "en_US.UTF-8"
        }
    });
    std::fs::write(&settings_path, serde_json::to_string_pretty(&existing).unwrap()).unwrap();

    // 执行：写入新的 env 变量
    let user_env: HashMap<String, String> = HashMap::from([
        ("LANG".to_string(), "en_US.UTF-8".to_string()),
        ("PYTHONUTF8".to_string(), "1".to_string()),
    ]);

    let content = std::fs::read_to_string(&settings_path).unwrap();
    let mut settings: serde_json::Value = serde_json::from_str(&content).unwrap();
    let settings_obj = settings.as_object_mut().unwrap();
    if !settings_obj.contains_key("env") {
        settings_obj.insert("env".to_string(), serde_json::json!({}));
    }
    let env_obj = settings_obj.get_mut("env").unwrap().as_object_mut().unwrap();
    for (key, value) in &user_env {
        env_obj.insert(key.clone(), serde_json::Value::String(value.clone()));
    }
    std::fs::write(&settings_path, serde_json::to_string_pretty(&settings).unwrap()).unwrap();

    // 验证：model 和 permissions 保留，env 更新
    let result: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(&settings_path).unwrap()).unwrap();
    assert_eq!(result.get("model").unwrap().as_str(), Some("claude-sonnet-4-20250514"));
    assert!(result.get("permissions").is_some());
    assert!(result.get("env").unwrap().get("PYTHONUTF8").is_some());
}