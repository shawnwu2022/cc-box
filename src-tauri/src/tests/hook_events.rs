use crate::hook_events::{derive_state, extract_detail, HookPayload, HookEventDetail};
use serde_json::json;

// ---- derive_state 测试 ----

// UserPromptSubmit 映射为 thinking
#[test]
fn DeriveState_PromptSubmit_001() {
    let data = json!({});
    assert_eq!(derive_state("UserPromptSubmit", &data), "thinking");
}

// PreToolUse 映射为 tool_executing
#[test]
fn DeriveState_PreToolUse_001() {
    let data = json!({});
    assert_eq!(derive_state("PreToolUse", &data), "tool_executing");
}

// PostToolUse 映射为 thinking
#[test]
fn DeriveState_PostToolUse_001() {
    let data = json!({});
    assert_eq!(derive_state("PostToolUse", &data), "thinking");
}

// PostToolUseFailure 映射为 thinking
#[test]
fn DeriveState_PostToolFail_001() {
    let data = json!({});
    assert_eq!(derive_state("PostToolUseFailure", &data), "thinking");
}

// Stop 映射为 idle
#[test]
fn DeriveState_Stop_001() {
    let data = json!({});
    assert_eq!(derive_state("Stop", &data), "idle");
}

// StopFailure 映射为 error
#[test]
fn DeriveState_StopFail_001() {
    let data = json!({});
    assert_eq!(derive_state("StopFailure", &data), "error");
}

// Notification + permission_prompt 映射为 waiting_permission
#[test]
fn DeriveState_NotificationPerm_001() {
    let data = json!({"notification_type": "permission_prompt"});
    assert_eq!(derive_state("Notification", &data), "waiting_permission");
}

// Notification + idle_prompt 映射为 waiting_input
#[test]
fn DeriveState_NotificationIdle_001() {
    let data = json!({"notification_type": "idle_prompt"});
    assert_eq!(derive_state("Notification", &data), "waiting_input");
}

// Notification + 未知 notification_type 映射为 waiting_input
#[test]
fn DeriveState_NotificationOther_001() {
    let data = json!({"notification_type": "something_else"});
    assert_eq!(derive_state("Notification", &data), "waiting_input");
}

// SubagentStart 映射为 subagent_running
#[test]
fn DeriveState_SubagentStart_001() {
    let data = json!({});
    assert_eq!(derive_state("SubagentStart", &data), "subagent_running");
}

// SubagentStop 映射为 thinking
#[test]
fn DeriveState_SubagentStop_001() {
    let data = json!({});
    assert_eq!(derive_state("SubagentStop", &data), "thinking");
}

// PreCompact 映射为 compacting
#[test]
fn DeriveState_PreCompact_001() {
    let data = json!({});
    assert_eq!(derive_state("PreCompact", &data), "compacting");
}

// PostCompact 映射为 thinking
#[test]
fn DeriveState_PostCompact_001() {
    let data = json!({});
    assert_eq!(derive_state("PostCompact", &data), "thinking");
}

// SessionStart 映射为 idle
#[test]
fn DeriveState_SessionStart_001() {
    let data = json!({});
    assert_eq!(derive_state("SessionStart", &data), "idle");
}

// SessionEnd 映射为 idle
#[test]
fn DeriveState_SessionEnd_001() {
    let data = json!({});
    assert_eq!(derive_state("SessionEnd", &data), "idle");
}

// 未知事件名映射为 unknown
#[test]
fn DeriveState_UnknownEvent_001() {
    let data = json!({});
    assert_eq!(derive_state("NonExistentEvent", &data), "unknown");
}

// ---- extract_detail 测试 ----

// SessionStart 提取 model, cwd, transcript_path, source 四个字段
#[test]
fn ExtractDetail_SessionStart_001() {
    let data = json!({
        "model": "claude-sonnet-4-20250514",
        "cwd": "/home/user/project",
        "transcript_path": "/tmp/transcript.jsonl",
        "source": "cli"
    });
    let detail = extract_detail("SessionStart", &data);
    match detail {
        HookEventDetail::SessionStart(sd) => {
            assert_eq!(sd.model.as_deref(), Some("claude-sonnet-4-20250514"));
            assert_eq!(sd.cwd.as_deref(), Some("/home/user/project"));
            assert_eq!(sd.transcript_path.as_deref(), Some("/tmp/transcript.jsonl"));
            assert_eq!(sd.source.as_deref(), Some("cli"));
        }
        _ => panic!("Expected SessionStart variant"),
    }
}

// SessionEnd 返回 SessionEnd 变体
#[test]
fn ExtractDetail_SessionEnd_001() {
    let data = json!({});
    let detail = extract_detail("SessionEnd", &data);
    assert!(matches!(detail, HookEventDetail::SessionEnd));
}

// UserPromptSubmit 提取 prompt 字段
#[test]
fn ExtractDetail_PromptSubmit_001() {
    let data = json!({"prompt": "hello world"});
    let detail = extract_detail("UserPromptSubmit", &data);
    match detail {
        HookEventDetail::UserPromptSubmit(d) => {
            assert_eq!(d.prompt.as_deref(), Some("hello world"));
        }
        _ => panic!("Expected UserPromptSubmit variant"),
    }
}

// PreToolUse 返回 PreToolUse 变体
#[test]
fn ExtractDetail_PreToolUse_001() {
    let data = json!({});
    let detail = extract_detail("PreToolUse", &data);
    assert!(matches!(detail, HookEventDetail::PreToolUse));
}

// PostToolUse 返回 PostToolUse 变体
#[test]
fn ExtractDetail_PostToolUse_001() {
    let data = json!({});
    let detail = extract_detail("PostToolUse", &data);
    assert!(matches!(detail, HookEventDetail::PostToolUse));
}

// 未知事件名返回 Unknown 变体保留原始 JSON
#[test]
fn ExtractDetail_Unknown_001() {
    let data = json!({"foo": "bar", "num": 42});
    let detail = extract_detail("CustomEvent", &data);
    match detail {
        HookEventDetail::Unknown(v) => {
            assert_eq!(v["foo"], "bar");
            assert_eq!(v["num"], 42);
        }
        _ => panic!("Expected Unknown variant"),
    }
}

// ---- HookPayload::from_raw 测试 ----

// 从 JSON 中提取 hook_event_name 字段
#[test]
fn FromRaw_EventName_001() {
    let data = json!({"hook_event_name": "PreToolUse"});
    let payload = HookPayload::from_raw(None, data);
    assert_eq!(payload.event_name, "PreToolUse");
}

// 从 JSON 中提取 session_id 字段
#[test]
fn FromRaw_SessionId_001() {
    let data = json!({"hook_event_name": "Stop", "session_id": "sess-abc123"});
    let payload = HookPayload::from_raw(None, data);
    assert_eq!(payload.session_id.as_deref(), Some("sess-abc123"));
}

// 缺少 hook_event_name 时默认为 "unknown"
#[test]
fn FromRaw_DefaultName_001() {
    let data = json!({"session_id": "sess-xyz"});
    let payload = HookPayload::from_raw(None, data);
    assert_eq!(payload.event_name, "unknown");
}

// 提取的时间戳为非零值
#[test]
fn FromRaw_Timestamp_001() {
    let data = json!({"hook_event_name": "Stop"});
    let payload = HookPayload::from_raw(None, data);
    assert_ne!(payload.timestamp, 0);
}
