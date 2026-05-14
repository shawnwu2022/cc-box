use crate::checks::decode_output;

// 有效 UTF-8 字节原样返回字符串
#[test]
fn DecodeOutput_Utf8_001() {
    let input = b"hello world";
    let result = decode_output(input);
    assert_eq!(result, "hello world");
}

// UTF-8 编码的中文字符正确解码
#[test]
fn DecodeOutput_Chinese_001() {
    let input = "你好世界".as_bytes();
    let result = decode_output(input);
    assert_eq!(result, "你好世界");
}

// GBK 编码的字节在 Windows 上正确解码为中文
#[cfg(target_os = "windows")]
#[test]
fn DecodeOutput_Gbk_001() {
    let (cow, _, _) = encoding_rs::GBK.encode("你好");
    let gbk_bytes: Vec<u8> = cow.into_owned();
    let result = decode_output(&gbk_bytes);
    assert_eq!(result, "你好");
}

// 空字节切片返回空字符串
#[test]
fn DecodeOutput_Empty_001() {
    let result = decode_output(&[]);
    assert_eq!(result, "");
}
