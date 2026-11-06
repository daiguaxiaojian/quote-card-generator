/**
 * 从正文自动提取一句作为标题：纯前端启发式，无需调用 AI 接口。
 *
 * 规则：按句号/问号/感叹号/分号/换行切句，逐句打分后取最高分；
 * 长度 10–22 字加分，含「永远 / 其实 / 真正 / 命运 / 人生」等
 * 金句关键词加分，第一句加分，含逗号的复合句减分；太短或超过
 * 30 字的句子不适合做标题，直接跳过。
 */
const TITLE_KEYWORDS = [
  '永远',
  '其实',
  '真正',
  '不是',
  '没有',
  '命运',
  '人生',
  '记住',
  '只有',
  '一定',
  '最',
  '就是',
]

function scoreSentence(sentence: string, isFirst: boolean): number {
  const len = [...sentence].length
  let score = 0
  if (len >= 10 && len <= 22) score += 3
  else if (len >= 6 && len <= 30) score += 1
  else return -1 // 太短或太长不适合做标题
  for (const kw of TITLE_KEYWORDS) {
    if (sentence.includes(kw)) score += 3
  }
  if (isFirst) score += 2
  if (sentence.includes('，')) score -= 1
  return score
}

export function generateTitle(body: string): string | null {
  const sentences = body
    .split(/[\n。！？!?；;]+/)
    .map((s) =>
      s
        .trim()
        .replace(/^[「『"“'‘（(，、,]+|[」』"”'’）)，、,。:：；;]+$/g, ''),
    )
    .filter((s) => s.length > 0)
  if (sentences.length === 0) return null
  let best: string | null = null
  let bestScore = -1
  sentences.forEach((s, i) => {
    const score = scoreSentence(s, i === 0)
    if (score > bestScore) {
      bestScore = score
      best = s
    }
  })
  if (best === null || bestScore < 0) return sentences[0]
  return best
}
