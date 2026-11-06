export interface TemplateDef {
  id: string
  label: string
  bg: string
  fg: string
  muted: string
  divider: string
}

/**
 * 模板注册表：新增模板只需在这里加一条记录，
 * 再在编辑器的模板选择器里自动出现，无需改渲染逻辑。
 */
export const TEMPLATES: TemplateDef[] = [
  {
    id: 'classic',
    label: '经典白底',
    bg: '#ffffff',
    fg: '#090909',
    muted: '#777777',
    divider: '#bbbbbb',
  },
  {
    id: 'dark',
    label: '深色',
    bg: '#181b27',
    fg: '#ffffff',
    muted: '#b9becb',
    divider: '#555555',
  },
  {
    id: 'warm',
    label: '暖白',
    bg: '#fffaf1',
    fg: '#090909',
    muted: '#777777',
    divider: '#bbbbbb',
  },
]

export function getTemplate(id: string): TemplateDef {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]
}
