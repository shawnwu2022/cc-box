/**
 * JSON 操作工具函数
 * 提取自 providers store，供 store 和测试共用
 */

/** 深度合并两个对象（与 Rust deep_merge_json 一致） */
export function deepMergeSettings(target: any, source: any): any {
  if (target !== null && typeof target === 'object' && !Array.isArray(target) &&
      source !== null && typeof source === 'object' && !Array.isArray(source)) {
    const result = { ...target }
    for (const key of Object.keys(source)) {
      result[key] = key in result ? deepMergeSettings(result[key], source[key]) : source[key]
    }
    return result
  }
  return source
}

/** 递归替换对象中的占位符字符串 */
export function replaceInSettings(obj: any, placeholder: string, value: string): any {
  if (typeof obj === 'string') {
    if (obj.includes(placeholder)) {
      return obj.replaceAll(placeholder, value)
    }
    return obj
  }
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = replaceInSettings(obj[i], placeholder, value)
    }
    return obj
  }
  if (typeof obj === 'object' && obj !== null) {
    for (const key of Object.keys(obj)) {
      obj[key] = replaceInSettings(obj[key], placeholder, value)
    }
    return obj
  }
  return obj
}
