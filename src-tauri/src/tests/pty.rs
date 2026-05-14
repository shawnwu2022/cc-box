use crate::pty::{utf8_complete_boundary, utf8_seq_len};

// ASCII 字节 0x41 (A) 返回长度 1
#[test]
fn Utf8SeqLen_Ascii_001() {
    assert_eq!(utf8_seq_len(0x41), 1);
}

// ASCII 字节 0x7F 返回长度 1
#[test]
fn Utf8SeqLen_AsciiMax_001() {
    assert_eq!(utf8_seq_len(0x7F), 1);
}

// 双字节前导 0xC3 返回长度 2
#[test]
fn Utf8SeqLen_TwoByte_001() {
    assert_eq!(utf8_seq_len(0xC3), 2);
}

// 三字节前导 0xE4 返回长度 3
#[test]
fn Utf8SeqLen_ThreeByte_001() {
    assert_eq!(utf8_seq_len(0xE4), 3);
}

// 四字节前导 0xF0 返回长度 4
#[test]
fn Utf8SeqLen_FourByte_001() {
    assert_eq!(utf8_seq_len(0xF0), 4);
}

// 无效前导 0xFE 回退返回长度 1
#[test]
fn Utf8SeqLen_Invalid_001() {
    assert_eq!(utf8_seq_len(0xFE), 1);
}

// 空切片返回 0
#[test]
fn Utf8Boundary_Empty_001() {
    assert_eq!(utf8_complete_boundary(&[]), 0);
}

// 完整 ASCII 数据 "hello" 返回全长 5
#[test]
fn Utf8Boundary_Ascii_001() {
    assert_eq!(utf8_complete_boundary(b"hello"), 5);
}

// 完整双字节 UTF-8 [0xC3, 0xA9] (é) 返回全长 2
#[test]
fn Utf8Boundary_TwoByte_001() {
    assert_eq!(utf8_complete_boundary(&[0xC3, 0xA9]), 2);
}

// 完整三字节 UTF-8 [0xE4, 0xB8, 0xAD] (中) 返回全长 3
#[test]
fn Utf8Boundary_ThreeByte_001() {
    assert_eq!(utf8_complete_boundary(&[0xE4, 0xB8, 0xAD]), 3);
}

// 不完整双字节序列 [0xC3] 截断返回 0
#[test]
fn Utf8Boundary_IncompleteTwo_001() {
    assert_eq!(utf8_complete_boundary(&[0xC3]), 0);
}

// 不完整三字节序列 [0xE4, 0xB8] 截断返回 0
#[test]
fn Utf8Boundary_IncompleteThree_001() {
    assert_eq!(utf8_complete_boundary(&[0xE4, 0xB8]), 0);
}

// ASCII "hi" 加完整双字节 é 混合返回全长 4
#[test]
fn Utf8Boundary_Mixed_001() {
    assert_eq!(utf8_complete_boundary(&[b'h', b'i', 0xC3, 0xA9]), 4);
}

// 完整 "ab" 后跟不完整三字节前导 0xE4 截断返回 2
#[test]
fn Utf8Boundary_TrailingIncomplete_001() {
    assert_eq!(utf8_complete_boundary(&[b'a', b'b', 0xE4]), 2);
}
