export type BadgeType = 'blue' | 'orange' | 'none'

export interface QuoteState {
  /** 昵称 */
  name: string
  /** 账号 ID（不含 @） */
  handle: string
  badge: BadgeType
  title: string
  body: string
  /** 模板 id，见 src/templates.ts */
  templateId: string
  /** 正文字号（基准宽度 1012px 下的 px 值） */
  fontSize: number
  /** 行高倍数 */
  lineHeight: number
  /** 正文颜色 */
  textColor: string
  /** 背景颜色 */
  bgColor: string
  /** 头像缩放 1–3 */
  avatarZoom: number
  /** 头像平移偏移（基准画布 px，范围 ±75） */
  avatarOffsetX: number
  avatarOffsetY: number
  /** 自定义头像 data URL；null 表示使用默认 public/avatar.jpg */
  avatarDataUrl: string | null
}

export const DEFAULT_BODY = [
  '作为一个算命的，我可以负责的告诉你们，',
  '你永远不会错过属于你的任何东西，',
  '命运会把属于你的东西推到你的面前，',
  '你甚至都没有拒绝的权利，',
  '',
  '命运会把你推到你原本该有的位置上，',
  '你焦虑了一辈子，担心的事一件没发生',
  '却白白痛苦了一辈子，',
  '',
  '想做什么就去做吧，命运给你兜底。',
].join('\n')

export const DEFAULT_STATE: QuoteState = {
  name: '呆瓜小贱',
  handle: 'daiguaxiaojian',
  badge: 'blue',
  title: '算命的告诉你：你永远不会错过属于你的东西',
  body: DEFAULT_BODY,
  templateId: 'classic',
  fontSize: 43,
  lineHeight: 1.8,
  textColor: '#090909',
  bgColor: '#ffffff',
  avatarZoom: 1,
  avatarOffsetX: 0,
  avatarOffsetY: 0,
  avatarDataUrl: null,
}

export const STORAGE_KEY = 'quote-card-state-v1'

/** data URL 超过该体积时不写入 localStorage（头像仅保留在当前会话内存中） */
export const AVATAR_PERSIST_LIMIT = 800 * 1024
