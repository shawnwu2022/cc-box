use serde::Serialize;
use serde_json::Value;

/// 发送给前端的完整 hook 事件 payload
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HookPayload {
    pub pty_id: Option<String>,
    pub session_id: Option<String>,
    pub event_name: String,
    pub state: String,
    pub timestamp: i64,
    pub detail: HookEventDetail,
}

/// 各事件类型的结构化详情
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", content = "data", rename_all = "camelCase")]
pub enum HookEventDetail {
    SessionStart(SessionStartData),
    SessionEnd,
    UserPromptSubmit(UserPromptSubmitData),
    PreToolUse,
    PostToolUse,
    PostToolUseFailure,
    Stop,
    StopFailure,
    Notification,
    SubagentStart,
    SubagentStop,
    /// 未识别事件，保留原始 JSON
    Unknown(Value),
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserPromptSubmitData {
    pub prompt: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionStartData {
    pub model: Option<String>,
    pub cwd: Option<String>,
    pub transcript_path: Option<String>,
    pub source: Option<String>,
}

// ---- 提取逻辑 ----

impl HookPayload {
    pub fn from_raw(pty_id: Option<String>, event: Value) -> Self {
        let event_name = event
            .get("hook_event_name")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string();

        let session_id = str_field(&event, "session_id");
        let state = derive_state(&event_name, &event);
        let detail = extract_detail(&event_name, &event);

        Self {
            pty_id,
            session_id,
            event_name,
            state,
            timestamp: chrono::Utc::now().timestamp_millis(),
            detail,
        }
    }
}

fn str_field(v: &Value, key: &str) -> Option<String> {
    v.get(key).and_then(|v| v.as_str()).map(|s| s.to_string())
}

fn extract_detail(event_name: &str, event: &Value) -> HookEventDetail {
    match event_name {
        "SessionStart" => HookEventDetail::SessionStart(SessionStartData {
            model: str_field(event, "model"),
            cwd: str_field(event, "cwd"),
            transcript_path: str_field(event, "transcript_path"),
            source: str_field(event, "source"),
        }),
        "SessionEnd" => HookEventDetail::SessionEnd,
        "UserPromptSubmit" => HookEventDetail::UserPromptSubmit(UserPromptSubmitData {
            prompt: str_field(event, "prompt"),
        }),
        "PreToolUse" => HookEventDetail::PreToolUse,
        "PostToolUse" => HookEventDetail::PostToolUse,
        "PostToolUseFailure" => HookEventDetail::PostToolUseFailure,
        "Stop" => HookEventDetail::Stop,
        "StopFailure" => HookEventDetail::StopFailure,
        "Notification" => HookEventDetail::Notification,
        "SubagentStart" => HookEventDetail::SubagentStart,
        "SubagentStop" => HookEventDetail::SubagentStop,
        _ => HookEventDetail::Unknown(event.clone()),
    }
}

fn derive_state(event_name: &str, event: &Value) -> String {
    match event_name {
        "UserPromptSubmit" => "thinking".into(),
        "PreToolUse" => "tool_executing".into(),
        "PostToolUse" | "PostToolUseFailure" => "thinking".into(),
        "Stop" => "idle".into(),
        "StopFailure" => "error".into(),
        "Notification" => {
            let ntype = str_field(event, "notification_type").unwrap_or_default();
            match ntype.as_str() {
                "permission_prompt" => "waiting_permission",
                "idle_prompt" => "waiting_input",
                _ => "waiting_input",
            }
            .into()
        }
        "SubagentStart" => "subagent_running".into(),
        "SubagentStop" => "thinking".into(),
        "PreCompact" => "compacting".into(),
        "PostCompact" => "thinking".into(),
        "SessionStart" => "idle".into(),
        "SessionEnd" => "idle".into(),
        _ => "unknown".into(),
    }
}
