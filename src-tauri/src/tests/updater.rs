use crate::updater::{is_newer_version, extract_filename};

// 0.6.4 vs 0.6.3 返回 true (patch 升级)
#[test]
fn VersionCmp_PatchUpgrade_001() {
    assert_eq!(is_newer_version("0.6.4", "0.6.3"), true);
}

// 0.6.3 vs 0.6.4 返回 false (降级)
#[test]
fn VersionCmp_Downgrade_001() {
    assert_eq!(is_newer_version("0.6.3", "0.6.4"), false);
}

// 0.6.4 vs 0.6.4 返回 false (版本相同)
#[test]
fn VersionCmp_SameVersion_001() {
    assert_eq!(is_newer_version("0.6.4", "0.6.4"), false);
}

// 1.0.0 vs 0.6.4 返回 true (major 升级)
#[test]
fn VersionCmp_MajorUpgrade_001() {
    assert_eq!(is_newer_version("1.0.0", "0.6.4"), true);
}

// 0.7.0 vs 0.6.4 返回 true (minor 升级)
#[test]
fn VersionCmp_MinorUpgrade_001() {
    assert_eq!(is_newer_version("0.7.0", "0.6.4"), true);
}

// v0.7.0 vs v0.6.4 返回 true (v 前缀版本)
#[test]
fn VersionCmp_VPrefix_001() {
    assert_eq!(is_newer_version("v0.7.0", "v0.6.4"), true);
}

// 0.7.0 vs v0.6.4 返回 true (混合 v 前缀)
#[test]
fn VersionCmp_MixedPrefix_001() {
    assert_eq!(is_newer_version("0.7.0", "v0.6.4"), true);
}

// 0.6.4 vs 0.6 返回 true (不等长段用 0 补齐)
#[test]
fn VersionCmp_ShorterSeg_001() {
    assert_eq!(is_newer_version("0.6.4", "0.6"), true);
}

// 0.6.4 vs 0.6.4-beta 返回 false (非数字段被跳过)
#[test]
fn VersionCmp_NonNumeric_001() {
    assert_eq!(is_newer_version("0.6.4", "0.6.4-beta"), false);
}

// https://example.com/file.zip → "file.zip"
#[test]
fn ExtractFile_Simple_001() {
    assert_eq!(extract_filename("https://example.com/file.zip"), "file.zip");
}

// https://example.com/a/b/c/file.msi → "file.msi"
#[test]
fn ExtractFile_Nested_001() {
    assert_eq!(extract_filename("https://example.com/a/b/c/file.msi"), "file.msi");
}

// https://example.com/ → "unknown"
#[test]
fn ExtractFile_TrailingSlash_001() {
    assert_eq!(extract_filename("https://example.com/"), "unknown");
}

// 空字符串 → "unknown"
#[test]
fn ExtractFile_Empty_001() {
    assert_eq!(extract_filename(""), "unknown");
}
