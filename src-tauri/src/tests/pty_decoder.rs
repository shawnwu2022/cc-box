use crate::pty_decoder::PtyDecoder;

// ===================== 单次解码 =====================

// 纯 UTF-8 中文单次 decode 返回完整字符串
#[test]
fn PtyDecoder_PureUtf8_001() {
    let mut dec = PtyDecoder::new();
    let out = dec.decode("你好".as_bytes());
    assert_eq!(out, "你好");
}

// 纯 GBK 中文单次 decode 返回完整字符串（兼容 v0.12.2 修复）
#[test]
fn PtyDecoder_PureGbk_001() {
    let (cow, _, _) = encoding_rs::GBK.encode("你好");
    let gbk_bytes = cow.into_owned();
    let mut dec = PtyDecoder::new();
    let out = dec.decode(&gbk_bytes);
    assert_eq!(out, "你好");
}

// UTF-8 + GBK 混合单次 decode 各自正确（核心新场景）
#[test]
fn PtyDecoder_MixedUtf8Gbk_001() {
    let mut bytes = "前".as_bytes().to_vec();
    let (gbk_cow, _, _) = encoding_rs::GBK.encode("后");
    bytes.extend_from_slice(&gbk_cow);
    let mut dec = PtyDecoder::new();
    let out = dec.decode(&bytes);
    assert_eq!(out, "前后");
}

// ASCII + UTF-8 + GBK 三段混合
#[test]
fn PtyDecoder_MixedThree_001() {
    let mut bytes: Vec<u8> = Vec::new();
    bytes.extend_from_slice(b"A"); // ASCII
    bytes.extend_from_slice("中".as_bytes()); // UTF-8
    let (gbk_cow, _, _) = encoding_rs::GBK.encode("国");
    bytes.extend_from_slice(&gbk_cow); // GBK
    bytes.extend_from_slice(b"Z"); // ASCII
    let mut dec = PtyDecoder::new();
    let out = dec.decode(&bytes);
    assert_eq!(out, "A中国Z");
}

// 空输入返回空字符串，无 panic
#[test]
fn PtyDecoder_Empty_001() {
    let mut dec = PtyDecoder::new();
    let out = dec.decode(&[]);
    assert_eq!(out, "");
}

// 4 字节 UTF-8 emoji 正确解码
#[test]
fn PtyDecoder_FourByteUtf8_001() {
    let mut dec = PtyDecoder::new();
    let out = dec.decode("🎉".as_bytes());
    assert_eq!(out, "🎉");
}

// 孤立非法字节（0x80）替换为 U+FFFD，前后 ASCII 不污染
#[test]
fn PtyDecoder_IsolatedInvalid_001() {
    let mut dec = PtyDecoder::new();
    let out = dec.decode(&[b'A', 0x80, b'B']);
    assert_eq!(out, "A\u{FFFD}B");
}

// ===================== 跨 read 边界 =====================

// UTF-8 三字节字符 "中" 拆成 [0xE4,0xB8] + [0xAD]，跨 read 拼成完整字符
#[test]
fn PtyDecoder_CrossRead_Utf8Incomplete_001() {
    let mut dec = PtyDecoder::new();
    let out1 = dec.decode(&[0xE4, 0xB8]);
    assert_eq!(out1, "", "不完整序列第一次应返回空");
    let out2 = dec.decode(&[0xAD]);
    assert_eq!(out2, "中", "拼接后应输出完整字符");
}

// GBK "你" 拆成 [0xC4] + [0xE3]，跨 read 拼成完整 GBK 字符（根源 3 修复）
#[test]
fn PtyDecoder_CrossRead_GbkFirstByte_001() {
    let mut dec = PtyDecoder::new();
    let out1 = dec.decode(&[0xC4]);
    assert_eq!(out1, "", "GBK 首字节孤立时应保留到下次");
    let out2 = dec.decode(&[0xE3]);
    assert_eq!(out2, "你");
}

// "AB" + GBK "你好" + "CD" 拆三次 decode，拼接结果完整
#[test]
fn PtyDecoder_CrossRead_GbkFullChar_001() {
    let mut dec = PtyDecoder::new();
    let (gbk_cow, _, _) = encoding_rs::GBK.encode("你好");
    let gbk_bytes = gbk_cow.into_owned();

    let out1 = dec.decode(b"AB");
    assert_eq!(out1, "AB");

    let out2 = dec.decode(&gbk_bytes);
    assert_eq!(out2, "你好");

    let out3 = dec.decode(b"CD");
    assert_eq!(out3, "CD");
}

// UTF-8 "中" 在 GBK 首字节之前跨 read：[0xE4,0xB8,0xAD,0xC4] + [0xE3]
#[test]
fn PtyDecoder_CrossRead_Utf8ThenGbk_001() {
    let mut dec = PtyDecoder::new();
    let out1 = dec.decode(&[0xE4, 0xB8, 0xAD, 0xC4]);
    assert_eq!(out1, "中", "UTF-8 部分先输出，GBK 首字节保留");
    let out2 = dec.decode(&[0xE3]);
    assert_eq!(out2, "你");
}

// 多次小块输入累积成完整 UTF-8 字符
#[test]
fn PtyDecoder_CrossRead_ByteByByte_001() {
    let mut dec = PtyDecoder::new();
    let bytes = "你".as_bytes();
    let mut accumulated = String::new();
    for b in bytes {
        accumulated.push_str(&dec.decode(&[*b]));
    }
    assert_eq!(accumulated, "你");
}

// ===================== flush（EOF 路径）=====================

// flush 后 pending 清空，残留 GBK 首字节解码为 U+FFFD（无配对）
#[test]
fn PtyDecoder_Flush_GbkLeadOnly_001() {
    let mut dec = PtyDecoder::new();
    let _ = dec.decode(&[0xC4]);
    let flushed = dec.flush();
    // 0xC4 单独不是合法 GBK 字符，替换为 U+FFFD
    assert_eq!(flushed, "\u{FFFD}");
}

// flush 后再 flush 返回空
#[test]
fn PtyDecoder_Flush_Twice_001() {
    let mut dec = PtyDecoder::new();
    dec.decode(b"hello");
    let _ = dec.flush();
    let second = dec.flush();
    assert_eq!(second, "");
}

// EOF 后 flush 把 pending 残留按 GBK 兜底解码（不完整 UTF-8 + 合法 GBK → GBK 字符）
#[test]
fn PtyDecoder_Flush_NoDataLoss_001() {
    let mut dec = PtyDecoder::new();
    let _ = dec.decode(&[0xE4, 0xB8]); // 不完整 UTF-8（"中"前 2 字节），但合法 GBK "涓"
    let flushed = dec.flush();
    assert_eq!(flushed, "涓", "不完整 UTF-8 字节按 GBK 兜底（优于丢失）");
}

// ===================== 死锁防御 =====================

// 持续喂纯 GBK 字符流，pending 不会无限累积
#[test]
fn PtyDecoder_NoDeadlock_ContinuousGbk_001() {
    let mut dec = PtyDecoder::new();
    let (gbk_cow, _, _) = encoding_rs::GBK.encode("你好世界你好世界你好世界");
    let gbk_bytes = gbk_cow.into_owned();

    // 分多次 decode
    let mut accumulated = String::new();
    for chunk in gbk_bytes.chunks(3) {
        accumulated.push_str(&dec.decode(chunk));
    }
    // flush 残留
    accumulated.push_str(&dec.flush());
    assert_eq!(accumulated, "你好世界你好世界你好世界");
}

// ===================== 性能基线 =====================

// 10KB 混合输入应在 100ms 内完成（防止 O(n²) 退化）
#[test]
fn PtyDecoder_Performance_001() {
    let mut bytes = Vec::with_capacity(10240);
    for i in 0..1024 {
        bytes.push((i % 128) as u8); // ASCII
        if i % 10 == 0 {
            bytes.extend_from_slice("中文".as_bytes()); // UTF-8 中文
        }
    }

    let start = std::time::Instant::now();
    let mut dec = PtyDecoder::new();
    let _ = dec.decode(&bytes);
    let _ = dec.flush();
    let elapsed = start.elapsed();

    assert!(
        elapsed.as_millis() < 100,
        "10KB 解码耗时 {:?} 应 < 100ms",
        elapsed
    );
}
