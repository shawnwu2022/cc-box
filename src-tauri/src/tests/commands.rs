use crate::commands::validate_display_name_inner;

// 后端必须与浏览器 maxlength/前端 raw.length 一致，按原始 UTF-16 code unit 计数。
#[test]
fn ValidateDisplayName_Utf16Boundary_001() {
    assert!(validate_display_name_inner(&"😀".repeat(16)).is_ok());
    assert!(validate_display_name_inner(&"😀".repeat(17)).is_err());
}

// 校验发生在 trim 之前，不能让控制字符或超长纯空白绕过前端规则。
#[test]
fn ValidateDisplayName_RawInputBeforeTrim_001() {
    assert!(validate_display_name_inner("\t").is_err());
    assert!(validate_display_name_inner(&" ".repeat(33)).is_err());
    assert!(validate_display_name_inner(&" ".repeat(32)).is_ok());
}
