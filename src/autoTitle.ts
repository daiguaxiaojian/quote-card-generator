/**
 * 从正文自动提取一句作为标题：纯前端启发式，无需调用 AI 接口。
 *
 * 流程：按句号/问号/感叹号/分号/换行切句（保留句末的 ？/！）→
 * 超过 30 字的长句再按逗号/顿号切成短句参与评分 → 逐句打分取最高。
 * 长度 10–22 字加分，含「永远 / 其实 / 真正 / 命运 / 人生」等
 * 金句关键词加分，第一句加分；含重复片段的句子减分，半句（逗号
 * 切出的短句）减分；太短或太长不适合做标题。兜底返回第一句的
 * 第一个短句，超过 26 字截断加 …，绝不返回全文。
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

const MAX_TITLE_LEN = 26

/** 去掉句首引导语（“有人说：”）、句尾句号/分号、首尾引号括号逗号；保留 ？/！ */
function cleanSentence(s: string): string {
  let t = s.trim()
  t = t.replace(/^[^：:]{1,8}[说讲问][：:]/, '')
  t = t.replace(/[。；;]+$/, '')
  // 引号在句中也可能残留（如前半句的后引号），全部去掉
  t = t.replace(/[「『"“”‘’]/g, '')
  t = t.replace(/^[（(，、,]+/, '').replace(/[）)，、,]+$/, '')
  return t.trim()
}

function splitClauses(sentence: string): string[] {
  return sentence
    .split(/[，、,]/)
    .map((s) =>
      s
        .trim()
        .replace(/^[「『"“'‘（(]+/, '')
        .replace(/[」』"”'’）)]+$/, ''),
    )
    .filter((s) => s.length > 0)
}

function hasRepeat(sentence: string): boolean {
  const seen = new Set<string>()
  for (const part of splitClauses(sentence)) {
    if (part.length >= 4) {
      if (seen.has(part)) return true
      seen.add(part)
    }
  }
  return false
}

function scoreSentence(
  sentence: string,
  isFirst: boolean,
  isClause: boolean,
): number {
  const len = [...sentence].length
  if (len < 6 || len > 30) return -1 // 太短或太长不适合做标题
  let score = 0
  if (len >= 10 && len <= 22) score += 3
  else score += 1
  for (const kw of TITLE_KEYWORDS) {
    if (sentence.includes(kw)) score += 3
  }
  if (isFirst) score += 2
  if (hasRepeat(sentence)) score -= 3
  if (sentence.includes('，')) score -= 2 // 复合句不如单句适合做标题
  if (isClause) score -= 1
  return score
}

function truncate(title: string): string {
  return [...title].length > MAX_TITLE_LEN
    ? [...title].slice(0, MAX_TITLE_LEN).join('') + '…'
    : title
}

export function generateTitle(body: string): string | null {
  // 按句切分，保留句末的 ？/！
  const raw = body.match(/[^。！？!?\n；;]+[。！？!?；;]?/g) ?? []
  const sentences = raw.map(cleanSentence).filter((s) => s.length > 0)
  if (sentences.length === 0) return null

  interface Candidate {
    text: string
    first: boolean
    clause: boolean
  }
  const candidates: Candidate[] = []
  sentences.forEach((s, i) => {
    candidates.push({ text: s, first: i === 0, clause: false })
    if ([...s].length > 22) {
      for (const c of splitClauses(s)) {
        candidates.push({ text: c, first: i === 0, clause: true })
      }
    }
  })

  let best: string | null = null
  let bestScore = -1
  for (const c of candidates) {
    const score = scoreSentence(c.text, c.first, c.clause)
    // 平分时，若当前最优是复合句而新候选不是，选更短的单句
    const tieBreak =
      score === bestScore &&
      best !== null &&
      best.includes('，') &&
      !c.text.includes('，')
    if (score > bestScore || tieBreak) {
      bestScore = score
      best = c.text
    }
  }
  if (best !== null && bestScore >= 0) return truncate(best)

  // 兜底：第一句的第一个短句，仍超长则截断，绝不返回全文
  const first = splitClauses(sentences[0])[0] ?? sentences[0]
  return truncate(first)
}
