//! PTY 流式解码器
//!
//! 处理跨 read 边界的多字节字符（UTF-8 1-4 字节序列、GBK 双字节字符）。
//! 每次 `decode` 接受新读入的字节，返回已解码字符串，把末尾可能不完整的
//! 字符序列保留到 `pending`，等下次拼接。

use crate::platform::{decode_output, is_gbk_lead, is_gbk_trail, utf8_expected_len};

/// 流式 PTY 解码器
///
/// 维护跨 `read` 调用的未刷出字节（潜在不完整 UTF-8 序列或 GBK 首字节）。
/// 一次 `decode` 调用 = 一次 PTY `read` 的字节流处理。
pub(crate) struct PtyDecoder {
    /// 跨 read 的残留字节（通常 ≤ 4 字节）
    pending: Vec<u8>,
}

impl PtyDecoder {
    pub(crate) fn new() -> Self {
        Self {
            pending: Vec::with_capacity(8),
        }
    }

    /// 接受新字节，返回已解码字符串
    ///
    /// 末尾如果是潜在不完整字符（UTF-8 序列缺续字节 / GBK 首字节缺次字节），
    /// 保留到 `pending`，等下次 `decode` 拼接。
    pub(crate) fn decode(&mut self, new_bytes: &[u8]) -> String {
        if new_bytes.is_empty() {
            return String::new();
        }

        let mut buf = std::mem::take(&mut self.pending);
        buf.extend_from_slice(new_bytes);

        let safe_end = Self::find_safe_boundary(&buf);

        if safe_end == 0 {
            // 整个 buf 都是不完整序列（UTF-8 续字节不足 / 孤立 GBK 首字节）。
            // 通常 buf ≤ 4 字节；防御性兜底：超过 4 字节说明全是非法字节，强制刷出
            // 避免 pending 无限累积。
            if buf.len() <= 4 {
                self.pending = buf;
                return String::new();
            }
            return decode_output(&buf);
        }

        let to_decode = buf[..safe_end].to_vec();
        if safe_end < buf.len() {
            self.pending = buf[safe_end..].to_vec();
        }

        decode_output(&to_decode)
    }

    /// EOF 时刷出全部残留（不再保留 pending）
    ///
    /// 残留字节解码后可能产生 U+FFFD（如孤立 GBK 首字节无配对），但优于丢失字节。
    pub(crate) fn flush(&mut self) -> String {
        if self.pending.is_empty() {
            return String::new();
        }
        let buf = std::mem::take(&mut self.pending);
        decode_output(&buf)
    }

    /// 找出 buf 中可安全刷出的字节长度（不含末尾不完整字符）
    ///
    /// 算法：贪心扫描每个字符位置
    /// - ASCII（< 0x80）：单字节完整，前进 1
    /// - 合法 UTF-8 多字节序列：前进序列长度
    /// - 合法 GBK 双字节字符：前进 2
    /// - 末尾的孤立 GBK 首字节（无配对）：保留（返回当前位置）
    /// - 其他位置：单字节非法，前进 1（decode_output 会替换为 U+FFFD）
    fn find_safe_boundary(buf: &[u8]) -> usize {
        let mut i = 0;
        while i < buf.len() {
            let b = buf[i];

            if b < 0x80 {
                i += 1;
                continue;
            }

            let utf8_len = utf8_expected_len(b);
            if utf8_len >= 2 {
                if i + utf8_len > buf.len() {
                    // UTF-8 序列被截断，保留
                    return i;
                }
                if std::str::from_utf8(&buf[i..i + utf8_len]).is_ok() {
                    i += utf8_len;
                    continue;
                }
                // UTF-8 不合法（续字节错误等），fallthrough 到 GBK 尝试
            }

            if i + 2 <= buf.len() && is_gbk_lead(b) && is_gbk_trail(buf[i + 1]) {
                i += 2;
                continue;
            }

            // 末尾孤立的 GBK 首字节（无次字节），保留
            if i == buf.len() - 1 && is_gbk_lead(b) {
                return i;
            }

            // 单字节非法（孤立续字节 / 无效前导），前进 1
            i += 1;
        }

        buf.len()
    }
}

impl Default for PtyDecoder {
    fn default() -> Self {
        Self::new()
    }
}
