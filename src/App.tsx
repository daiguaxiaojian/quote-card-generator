import { useEffect, useRef, useState } from 'react'
import type { DragEvent as ReactDragEvent } from 'react'
import AvatarEditor from './components/AvatarEditor'
import { canvasHeight, renderQuote } from './render'
import { getTemplate, TEMPLATES } from './templates'
import {
  AVATAR_PERSIST_LIMIT,
  DEFAULT_STATE,
  STORAGE_KEY,
} from './types'
import type { AspectRatio, BadgeType, QuoteState } from './types'

const ASPECT_OPTIONS: { value: AspectRatio; label: string }[] = [
  { value: '2:3', label: '2:3（竖版）' },
  { value: '1:1', label: '1:1（方形）' },
  { value: '4:5', label: '4:5' },
  { value: '9:16', label: '9:16（长竖版）' },
]

function loadState(): QuoteState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return DEFAULT_STATE
    const parsed = JSON.parse(saved) as Partial<QuoteState>
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_STATE
    return { ...DEFAULT_STATE, ...parsed }
  } catch {
    return DEFAULT_STATE
  }
}

export default function App() {
  const [state, setState] = useState<QuoteState>(loadState)
  const [overflow, setOverflow] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [avatarVersion, setAvatarVersion] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const avatarRef = useRef<HTMLImageElement | null>(null)

  const avatarSrc = state.avatarDataUrl ?? '/avatar.jpg'

  const update = (patch: Partial<QuoteState>): void => {
    setState((prev) => ({ ...prev, ...patch }))
  }

  // 持久化：头像 data URL 超过 ~800KB 时只存其余字段，头像仅保留在会话内存中
  useEffect(() => {
    try {
      const toSave: QuoteState =
        state.avatarDataUrl && state.avatarDataUrl.length > AVATAR_PERSIST_LIMIT
          ? { ...state, avatarDataUrl: null }
          : state
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    } catch {
      // localStorage 不可用或已满时静默跳过
    }
  }, [state])

  // 加载头像图片
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      avatarRef.current = img
      setAvatarVersion((v) => v + 1)
    }
    img.onerror = () => {
      avatarRef.current = null
      setAvatarVersion((v) => v + 1)
    }
    img.src = avatarSrc
  }, [avatarSrc])

  // 实时预览：状态变化后用 rAF 节流重绘
  useEffect(() => {
    let raf = 0
    let cancelled = false
    raf = requestAnimationFrame(() => {
      if (cancelled) return
      const canvas = canvasRef.current
      if (!canvas) return
      const result = renderQuote(canvas, state, avatarRef.current, 1)
      setOverflow((prev) => (prev === result.overflow ? prev : result.overflow))
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [state, avatarVersion])

  const handleAvatarUpload = (dataUrl: string): void => {
    update({ avatarDataUrl: dataUrl, avatarZoom: 1, avatarOffsetX: 0, avatarOffsetY: 0 })
  }

  const handleDrop = (e: ReactDragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('仅支持 JPG / PNG / WebP 图片')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') handleAvatarUpload(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const exportPng = (scale: number): void => {
    const offscreen = document.createElement('canvas')
    renderQuote(offscreen, state, avatarRef.current, scale)
    offscreen.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `金句卡片-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  const handleTemplateChange = (templateId: string): void => {
    const t = getTemplate(templateId)
    update({ templateId, bgColor: t.bg, textColor: t.fg })
  }

  const resetToDefault = (): void => {
    setState(DEFAULT_STATE)
  }

  const height = canvasHeight(state.aspect)

  return (
    <div className="wrap">
      <header>
        <div className="logo">✎</div>
        <div>
          <h1>个性化金句卡片生成器</h1>
          <p>自定义头像、名称、内容，一键生成高清图片</p>
        </div>
      </header>

      <div className="layout">
        <section className="panel">
          <h2>① 头像设置</h2>
          <AvatarEditor
            src={avatarSrc}
            zoom={state.avatarZoom}
            offsetX={state.avatarOffsetX}
            offsetY={state.avatarOffsetY}
            onZoomChange={(zoom) => update({ avatarZoom: zoom })}
            onOffsetChange={(x, y) => update({ avatarOffsetX: x, avatarOffsetY: y })}
            onUpload={handleAvatarUpload}
            onReset={() => update({ avatarZoom: 1, avatarOffsetX: 0, avatarOffsetY: 0 })}
          />

          <h2>② 账号信息</h2>
          <div className="grid2">
            <div className="field">
              <label htmlFor="name">名称（昵称）</label>
              <input
                id="name"
                type="text"
                value={state.name}
                onChange={(e) => update({ name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>认证标识</label>
              <div className="choices">
                {(
                  [
                    { value: 'blue', label: '蓝色认证' },
                    { value: 'orange', label: '橙色认证' },
                    { value: 'none', label: '不显示' },
                  ] as { value: BadgeType; label: string }[]
                ).map((opt) => (
                  <label key={opt.value}>
                    <input
                      type="radio"
                      name="badge"
                      checked={state.badge === opt.value}
                      onChange={() => update({ badge: opt.value })}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="field">
            <label htmlFor="handle">账号 ID（@）</label>
            <input
              id="handle"
              type="text"
              value={state.handle}
              onChange={(e) => update({ handle: e.target.value.replace(/^@/, '') })}
            />
          </div>

          <h2>③ 文字内容</h2>
          <div className="field">
            <label htmlFor="title">图片标题</label>
            <textarea
              id="title"
              className="titleInput"
              value={state.title}
              onChange={(e) => update({ title: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="body">正文（空行表示分段）</label>
            <textarea
              id="body"
              value={state.body}
              onChange={(e) => update({ body: e.target.value })}
            />
          </div>

          <h2>④ 样式设置</h2>
          <div className="grid2">
            <div className="field">
              <label htmlFor="template">模板</label>
              <select
                id="template"
                value={state.templateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
              >
                {TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="aspect">图片比例</label>
              <select
                id="aspect"
                value={state.aspect}
                onChange={(e) => update({ aspect: e.target.value as AspectRatio })}
              >
                {ASPECT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="sliderRow">
            <span>正文字号 {state.fontSize}px</span>
            <input
              type="range"
              min={30}
              max={56}
              step={1}
              value={state.fontSize}
              onChange={(e) => update({ fontSize: Number(e.target.value) })}
            />
          </label>
          <label className="sliderRow">
            <span>行间距 {state.lineHeight.toFixed(2)}x</span>
            <input
              type="range"
              min={1.6}
              max={2.6}
              step={0.05}
              value={state.lineHeight}
              onChange={(e) => update({ lineHeight: Number(e.target.value) })}
            />
          </label>
          <div className="grid2">
            <div className="field">
              <label htmlFor="textColor">文字颜色</label>
              <input
                id="textColor"
                type="color"
                value={state.textColor}
                onChange={(e) => update({ textColor: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="bgColor">背景颜色</label>
              <input
                id="bgColor"
                type="color"
                value={state.bgColor}
                onChange={(e) => update({ bgColor: e.target.value })}
              />
            </div>
          </div>

          <h2>⑤ 导出图片</h2>
          <div className="exportRow">
            <span>清晰度：</span>
            {[1, 2, 3].map((scale) => (
              <button
                key={scale}
                type="button"
                className="btn"
                onClick={() => exportPng(scale)}
              >
                {scale}x PNG
              </button>
            ))}
          </div>
          <button type="button" className="primary" onClick={() => exportPng(2)}>
            ↓ 生成并下载图片（2x）
          </button>
          <div className="hint">全部内容在浏览器本地生成，不会上传到服务器。</div>
        </section>

        <section className="panel previewPanel">
          <div
            className={`preview${dragOver ? ' dragOver' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <canvas ref={canvasRef} width={1012} height={height} />
          </div>
          <div className="hint">可把头像图片直接拖到预览图上更换</div>
          {overflow && (
            <div className="warning" role="alert">
              内容较长，建议缩小字号或精简内容
            </div>
          )}
          <div className="actions">
            <button type="button" className="btn" onClick={resetToDefault}>
              恢复示例
            </button>
            <button type="button" className="btn" onClick={() => exportPng(2)}>
              下载 PNG（2x）
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
