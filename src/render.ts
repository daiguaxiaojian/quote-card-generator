import type { QuoteState } from './types'
import { getTemplate } from './templates'

/** 设计画布宽（内部排版坐标系，导出时等比缩放到输出尺寸） */
export const BASE_WIDTH = 1012

/** 1x 导出尺寸固定为 275×370 */
export const OUTPUT_WIDTH = 275
export const OUTPUT_HEIGHT = 370

export const FONT_STACK = '"Microsoft YaHei", "PingFang SC", system-ui, sans-serif'

/** 设计画布高：按 275:370 比例换算 */
export function canvasHeight(): number {
  return Math.round((BASE_WIDTH * OUTPUT_HEIGHT) / OUTPUT_WIDTH)
}

/** 逐字换行：与 v1 相同的按字符 measureText 方式，保证中文换行一致 */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  font: string,
): string[] {
  ctx.font = font
  const lines: string[] = []
  let line = ''
  for (const ch of text) {
    if (line && ctx.measureText(line + ch).width > maxWidth) {
      lines.push(line)
      line = ch
    } else {
      line += ch
    }
  }
  if (line || lines.length === 0) lines.push(line)
  return lines
}

/** 24 角星形认证徽章 + 白色对勾（与 v1 的 drawBadge 一致） */
export function drawBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
): void {
  ctx.save()
  ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI) / 12 - Math.PI / 2
    const r = i % 2 ? 20 : 24
    const px = x + Math.cos(a) * r
    const py = y + Math.sin(a) * r
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(x - 11, y)
  ctx.lineTo(x - 2, y + 9)
  ctx.lineTo(x + 13, y - 10)
  ctx.stroke()
  ctx.restore()
}

export interface BodyLayout {
  /** 正文起始 y */
  startY: number
  /** 正文结束 y（最后一行基线 + 行高余量） */
  endY: number
  /** 实际使用的正文字号（自动缩小后） */
  fontSize: number
  lines: number
}

function measureBody(
  ctx: CanvasRenderingContext2D,
  body: string,
  fontSize: number,
  lineHeight: number,
  startY: number,
): { endY: number; lines: number } {
  const font = `500 ${fontSize}px ${FONT_STACK}`
  const lh = fontSize * lineHeight
  let y = startY
  let lines = 0
  for (const paragraph of body.split('\n')) {
    if (!paragraph.trim()) {
      y += lh * 0.78
      continue
    }
    const wrapped = wrapText(ctx, paragraph, 925, font)
    lines += wrapped.length
    y += wrapped.length * lh
  }
  return { endY: y, lines }
}

/**
 * 计算正文布局：若内容超出画布高度，自动把字号缩小到 60% 为止。
 * 返回实际字号与是否仍溢出。
 */
export function layoutBody(
  ctx: CanvasRenderingContext2D,
  state: QuoteState,
  startY: number,
  maxY: number,
): BodyLayout {
  const minSize = state.fontSize * 0.6
  let fontSize = state.fontSize
  let measured = measureBody(ctx, state.body, fontSize, state.lineHeight, startY)
  while (measured.endY > maxY && fontSize > minSize) {
    fontSize = Math.max(minSize, fontSize - 1)
    measured = measureBody(ctx, state.body, fontSize, state.lineHeight, startY)
  }
  return {
    startY,
    endY: measured.endY,
    fontSize,
    lines: measured.lines,
  }
}

export interface RenderResult {
  /** 正文是否仍溢出画布（即使已缩小到 60%） */
  overflow: boolean
  /** 实际使用的正文字号 */
  bodyFontSize: number
}

/**
 * 在 canvas 上绘制金句卡片。
 * @param canvas 目标 canvas（预览或导出共用）
 * @param state 编辑器状态
 * @param avatarImage 已加载的头像图片；null 时画灰色占位
 * @param scale 导出倍率（1/2/3），预览时为 1
 */
export function renderQuote(
  canvas: HTMLCanvasElement,
  state: QuoteState,
  avatarImage: HTMLImageElement | null,
  scale = 1,
): RenderResult {
  const height = canvasHeight()
  canvas.width = OUTPUT_WIDTH * scale
  canvas.height = OUTPUT_HEIGHT * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) return { overflow: false, bodyFontSize: state.fontSize }
  // 设计坐标系（1012 宽）→ 输出尺寸（275×370 起）的等比缩放
  const s = (OUTPUT_WIDTH / BASE_WIDTH) * scale
  ctx.setTransform(s, 0, 0, s, 0, 0)

  const template = getTemplate(state.templateId)
  const fg = state.textColor
  const bg = state.bgColor
  const muted = template.muted
  const dividerColor = template.divider

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, BASE_WIDTH, height)

  const title = state.title.trim()
  const name = state.name || ' '
  const handle = state.handle.replace(/^@/, '')
  const badgeColor = state.badge === 'blue' ? '#168df4' : state.badge === 'orange' ? '#f58b08' : ''

  // 标题：粗体 59px
  const titleFont = `bold 59px ${FONT_STACK}`
  const titleLines = wrapText(ctx, title, 924, titleFont)
  let ty = 104
  ctx.fillStyle = fg
  ctx.font = titleFont
  for (const line of titleLines) {
    ctx.fillText(line, 42, ty)
    ty += 86
  }

  // 分割线
  const divY = Math.max(246, ty + 20)
  ctx.strokeStyle = dividerColor
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(42, divY)
  ctx.lineTo(971, divY)
  ctx.stroke()

  // 头像：圆形裁剪，cover 适配 + 缩放 + 平移
  const ay = divY + 122
  ctx.save()
  ctx.beginPath()
  ctx.arc(116, ay, 75, 0, Math.PI * 2)
  ctx.clip()
  if (avatarImage && avatarImage.complete && avatarImage.naturalWidth > 0) {
    const sw = avatarImage.naturalWidth
    const sh = avatarImage.naturalHeight
    const cover = Math.max(150 / sw, 150 / sh) * state.avatarZoom
    const w = sw * cover
    const h = sh * cover
    ctx.drawImage(
      avatarImage,
      116 - w / 2 + state.avatarOffsetX,
      ay - h / 2 + state.avatarOffsetY,
      w,
      h,
    )
  } else {
    ctx.fillStyle = '#eeeeee'
    ctx.fillRect(41, ay - 75, 150, 150)
  }
  ctx.restore()
  ctx.strokeStyle = '#888888'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.arc(116, ay, 75, 0, Math.PI * 2)
  ctx.stroke()

  // 昵称 + 认证徽章 + @handle
  ctx.fillStyle = fg
  ctx.font = `bold 46px ${FONT_STACK}`
  ctx.fillText(name, 218, ay - 8)
  if (state.badge !== 'none') {
    const badgeX = Math.min(920, 218 + ctx.measureText(name).width + 38)
    drawBadge(ctx, badgeX, ay - 25, badgeColor)
  }
  ctx.fillStyle = muted
  ctx.font = '37px Arial, sans-serif'
  ctx.fillText(`@${handle}`, 218, ay + 51)

  // 正文：自动缩小字号直至放得下（最低 60%）
  const bodyStartY = ay + 170
  const maxBodyY = height - 74
  const layout = layoutBody(ctx, state, bodyStartY, maxBodyY)
  const overflow = layout.endY > maxBodyY
  const bodyFont = `500 ${layout.fontSize}px ${FONT_STACK}`
  const lh = layout.fontSize * state.lineHeight
  ctx.fillStyle = fg
  ctx.font = bodyFont
  let y = bodyStartY
  for (const paragraph of state.body.split('\n')) {
    if (!paragraph.trim()) {
      y += lh * 0.78
      continue
    }
    const lines = wrapText(ctx, paragraph, 925, bodyFont)
    for (const line of lines) {
      ctx.fillText(line, 42, y)
      y += lh
    }
  }

  // 页脚 @handle（右下角）
  ctx.fillStyle = muted
  ctx.font = '30px Arial, sans-serif'
  const footer = `@${handle}`
  ctx.fillText(footer, 970 - ctx.measureText(footer).width, height - 34)

  return { overflow, bodyFontSize: layout.fontSize }
}
