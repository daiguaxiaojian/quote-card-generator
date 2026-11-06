import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

interface AvatarEditorProps {
  /** 用于预览的图片 URL（默认头像或上传的 data URL） */
  src: string
  zoom: number
  offsetX: number
  offsetY: number
  onZoomChange: (zoom: number) => void
  onOffsetChange: (x: number, y: number) => void
  onUpload: (dataUrl: string) => void
  onReset: () => void
}

const PREVIEW_BOX = 180
/** 预览框 180px 对应画布头像直径 150px 的换算系数 */
const PX_TO_CANVAS = 150 / PREVIEW_BOX

function clampOffset(v: number): number {
  return Math.max(-75, Math.min(75, v))
}

export default function AvatarEditor({
  src,
  zoom,
  offsetX,
  offsetY,
  onZoomChange,
  onOffsetChange,
  onUpload,
  onReset,
}: AvatarEditorProps) {
  const [dragging, setDragging] = useState(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFile = (file: File | undefined | null): void => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('仅支持 JPG / PNG / WebP 图片')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') onUpload(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>): void => {
    e.currentTarget.setPointerCapture(e.pointerId)
    lastPos.current = { x: e.clientX, y: e.clientY }
    setDragging(true)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (!dragging || !lastPos.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    lastPos.current = { x: e.clientX, y: e.clientY }
    onOffsetChange(
      clampOffset(offsetX + dx * PX_TO_CANVAS),
      clampOffset(offsetY + dy * PX_TO_CANVAS),
    )
  }

  const onPointerUp = (): void => {
    setDragging(false)
    lastPos.current = null
  }

  return (
    <div className="avatarEditor">
      <div
        className="avatarCropBox"
        style={{ width: PREVIEW_BOX, height: PREVIEW_BOX }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        title="拖动调整头像位置"
      >
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- pointer pan is intentional */}
        <img
          src={src}
          alt="头像裁剪预览"
          draggable={false}
          style={{
            transform: `translate(${offsetX / PX_TO_CANVAS}px, ${
              offsetY / PX_TO_CANVAS
            }px) scale(${zoom})`,
          }}
        />
      </div>
      <div className="avatarControls">
        <div>
          <button
            type="button"
            className="btn"
            onClick={() => fileInputRef.current?.click()}
          >
            上传头像
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => {
              handleFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
        <label className="sliderRow">
          <span>缩放 {zoom.toFixed(1)}x</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
          />
        </label>
        <div className="hint">拖动圆形区域调整位置；支持 JPG / PNG / WebP</div>
        <button type="button" className="btn btnGhost" onClick={onReset}>
          重置头像位置
        </button>
      </div>
    </div>
  )
}
