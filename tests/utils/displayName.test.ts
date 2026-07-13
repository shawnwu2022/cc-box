import { describe, it, expect } from 'vitest'
import { validateDisplayName, projectBasename, resolveWindowTitle, matchProjectQuery } from '@/utils/displayName'

describe('validateDisplayName', () => {
  // 合法普通别名
  it('ValidateDisplay_OK_Normal_001', () => {
    expect(validateDisplayName('主项目')).toEqual({ ok: true })
  })
  // 空 / 纯空白合法（=清除语义，不报错）
  it('ValidateDisplay_OK_Empty_001', () => {
    expect(validateDisplayName('')).toEqual({ ok: true })
    expect(validateDisplayName('   ')).toEqual({ ok: true })
  })
  // 32 字符合法（边界）
  it('ValidateDisplay_OK_MaxLen32_001', () => {
    expect(validateDisplayName('a'.repeat(32))).toEqual({ ok: true })
  })
  // 33 字符过长
  it('ValidateDisplay_Fail_TooLong_001', () => {
    expect(validateDisplayName('a'.repeat(33))).toEqual({ ok: false, error: 'tooLong' })
  })
  // 含换行符（\p{Cc}）非法
  it('ValidateDisplay_Fail_Newline_001', () => {
    expect(validateDisplayName('a\nb')).toEqual({ ok: false, error: 'invalid' })
  })
  // 含回车符非法
  it('ValidateDisplay_Fail_CarriageReturn_001', () => {
    expect(validateDisplayName('a\rb')).toEqual({ ok: false, error: 'invalid' })
  })
  // 含制表符非法
  it('ValidateDisplay_Fail_Tab_001', () => {
    expect(validateDisplayName('a\tb')).toEqual({ ok: false, error: 'invalid' })
  })
  // 含 NUL 控制字符非法
  it('ValidateDisplay_Fail_Nul_001', () => {
    expect(validateDisplayName('a\x00b')).toEqual({ ok: false, error: 'invalid' })
  })
  // 普通空格合法（仅首尾 trim，中间空格允许）
  it('ValidateDisplay_OK_Space_001', () => {
    expect(validateDisplayName('my project')).toEqual({ ok: true })
  })
})

describe('projectBasename', () => {
  // 普通 POSIX 路径取末段
  it('Basename_Basic_001', () => {
    expect(projectBasename('/work/client')).toBe('client')
  })
  // 尾斜杠先去掉再取末段
  it('Basename_TrailingSlash_001', () => {
    expect(projectBasename('/work/app/')).toBe('app')
  })
  // 反斜杠规范后取末段
  it('Basename_Backslash_001', () => {
    expect(projectBasename('C:\\repo\\x\\')).toBe('x')
  })
  // 根路径：POSIX '/' -> 末段为空 -> 回退原路径
  it('Basename_PosixRoot_001', () => {
    expect(projectBasename('/')).toBe('/')
  })
})

describe('resolveWindowTitle', () => {
  // cwd 空 -> 默认标题
  it('ResolveWindowTitle_NoCwd_001', () => {
    expect(resolveWindowTitle(null, () => 'x')).toBe('CC-Box')
    expect(resolveWindowTitle('', () => 'x')).toBe('CC-Box')
    expect(resolveWindowTitle(undefined, () => 'x')).toBe('CC-Box')
  })
  // cwd 有值 -> 用 resolveName（getDisplayName，含别名/basename）
  it('ResolveWindowTitle_WithName_001', () => {
    expect(resolveWindowTitle('/p-a', () => '主项目')).toBe('主项目')
    expect(resolveWindowTitle('/p-a', () => 'p-a')).toBe('p-a')
  })
})

describe('matchProjectQuery 三字段', () => {
  // displayName 命中（别名）
  it('MatchQuery_DisplayName_001', () => {
    expect(matchProjectQuery('客户的活', 'client', '/work/client', '客户')).toBe(true)
  })
  // basename 命中（无别名场景，displayName=basename）
  it('MatchQuery_Basename_001', () => {
    expect(matchProjectQuery('client', 'client', '/work/client', 'client')).toBe(true)
  })
  // path 命中（displayName/basename 不含 q，path 含）
  it('MatchQuery_Path_001', () => {
    expect(matchProjectQuery('客户', 'client', '/work/secret-dir', 'secret')).toBe(true)
  })
  // 全不命中
  it('MatchQuery_NoMatch_001', () => {
    expect(matchProjectQuery('客户', 'client', '/work/client', 'zzz')).toBe(false)
  })
  // 大小写不敏感
  it('MatchQuery_CaseInsensitive_001', () => {
    expect(matchProjectQuery('Client', 'client', '/work/client', 'CLIENT')).toBe(true)
  })
  // alias 设置时 basename 仍独立命中（codex #8/#16）：displayName=别名不含 'client'，
  // basename='client' 含 -> 命中（证明 basename 参数独立，非被 displayName 遮蔽）
  it('MatchQuery_AliasSetBasenameIndependent_001', () => {
    // displayName='客户的活' 不含 'client'；path='/work/c1' 不含 'client'；仅 basename='client' 含
    expect(matchProjectQuery('客户的活', 'client', '/work/c1', 'client')).toBe(true)
  })
})
