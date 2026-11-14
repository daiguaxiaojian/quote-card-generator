/**
 * 正文插图：图片以 `[[img:xxxxxxxx]]` 标记行嵌在 body 文本里，
 * 位置跟随光标插入点，渲染时按正文宽度通栏显示。
 */

export interface BodyImage {
  id: string
  /** JPEG data URL（插入时已按正文宽度压缩） */
  dataUrl: string
  /** 原图按压缩后的宽高（用于排版测高） */
  width: number
  height: number
}

export const IMG_MARKER_RE = /^\[\[img:([a-z0-9]{8})\]\]$/

export function makeImageId(): string {
  return Math.random().toString(16).slice(2, 10).padEnd(8, '0')
}

export function makeImageMarker(id: string): string {
  return `[[img:${id}]]`
}

export function parseImageMarker(line: string): string | null {
  const m = IMG_MARKER_RE.exec(line.trim())
  return m ? m[1] : null
}

/** 按出现顺序列出 body 中引用的图片 id */
export function referencedImageIds(body: string): string[] {
  const ids: string[] = []
  for (const line of body.split('\n')) {
    const id = parseImageMarker(line)
    if (id && !ids.includes(id)) ids.push(id)
  }
  return ids
}

/** 去掉标记行（用于自动生成标题：位置不重要） */
export function stripImageMarkers(body: string): string {
  return body
    .split('\n')
    .filter((line) => parseImageMarker(line) === null)
    .join('\n')
}

/**
 * 把标记行内容替换为空格，长度不变（用于校对：返回的位置偏移仍对应原文，
 * 修正时可直接按偏移量写回真实 body）。
 */
export function maskImageMarkers(body: string): string {
  return body
    .split('\n')
    .map((line) => (parseImageMarker(line) ? ' '.repeat(line.length) : line))
    .join('\n')
}

/**
 * 把 data URL 图片按需缩小到 maxWidth，输出 JPEG data URL。
 * 白底绘制，透明通道会被白色填充；导出清晰度按正文宽度 925px 对齐。
 */
export function downscaleImage(
  dataUrl: string,
  maxWidth = 925,
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.naturalWidth)
      const width = Math.max(1, Math.round(img.naturalWidth * scale))
      const height = Math.max(1, Math.round(img.naturalHeight * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('canvas 不可用'))
        return
      }
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.85), width, height })
    }
    img.onerror = () => reject(new Error('图片无法读取'))
    img.src = dataUrl
  })
}
