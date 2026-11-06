/**
* 标题/正文校对：纯前端规则检查，无需调用 AI 接口。
*
* 能查的：常见错别字（因该/己经/帐号…）、“的”疑似误用为“得”、
* 英文标点混进中文、重复标点、标点混用、引号括号不成对、
* 句末缺标点、行首标点、中文间多余空格。
* 不能查的：需要语义理解的错别字（如音同字不同义）、生僻词、
* 语法结构问题——这类需要 AI 校对接口，本站暂不接入。
*
* 每个问题带位置（start/end）与建议替换；调用方按 start 倒序
* 应用修正可避免偏移错位；fixable=false 的只提示不修正。
*/
export interface ProofIssue {
field: 'title' | 'body'
start: number
end: number
/** 原文片段（插入类问题为空） */
text: string
message: string
/** 建议改法（展示用） */
suggestion: string | null
replacement: string | null
fixable: boolean
/** 是否参与“全部修正”（疑似类问题只单条修正，不批量改） */
bulk: boolean
}

interface RawIssue {
start: number
end: number
text: string
message: string
suggestion: string | null
replacement: string | null
fixable: boolean
bulk: boolean
}

const CJK = '\\u4e00-\\u9fa5'

function issue(
start: number,
end: number,
text: string,
message: string,
suggestion: string | null,
replacement: string | null,
fixable = true,
bulk = true,
): RawIssue {
return { start, end, text, message, suggestion, replacement, fixable, bulk}
}

function collect(
text: string,
re: RegExp,
make: (m: RegExpExecArray) => RawIssue | null,
): RawIssue[] {
const out: RawIssue[] = []
re.lastIndex = 0
let m: RegExpExecArray | null
while ((m = re.exec(text))!== null) {
const found = make(m)
if (found) out.push(found)
if (m[0].length === 0) re.lastIndex++
}
return out
}

/* ---------------- 错别字（固定搭配，高精度） ---------------- */

interface TypoRule {
re: RegExp
replacement: (m: RegExpExecArray) => string
message: string
bulk?: boolean
}

const TYPO_RULES: TypoRule[] = [
{ re: /因该/g, replacement: () => '应该', message: '错别字'},
{ re: /己经/g, replacement: () => '已经', message: '错别字'},
{ re: /以经/g, replacement: () => '已经', message: '错别字'},
{ re: /做用/g, replacement: () => '作用', message: '错别字'},
{
re: /反应(问题|情况|意见|诉求|困难|现象)/g,
replacement: (m) => `反映${m[1]}`,
message: '错别字',
},
{
re: /必需(做|去|要|得|完成|参加|进行|学习|努力)/g,
replacement: (m) => `必须${m[1]}`,
message: '错别字',
},
{ re: /必须品/g, replacement: () => '必需品', message: '错别字'},
{ re: /帐号/g, replacement: () => '账号', message: '错别字'},
{ re: /拔打/g, replacement: () => '拨打', message: '错别字'},
{ re: /宣染/g, replacement: () => '渲染', message: '错别字'},
{ re: /亚州/g, replacement: () => '亚洲', message: '错别字'},
{ re: /美州/g, replacement: () => '美洲', message: '错别字'},
{ re: /欧州/g, replacement: () => '欧洲', message: '错别字'},
{ re: /非州/g, replacement: () => '非洲', message: '错别字'},
{ re: /原故/g, replacement: () => '缘故', message: '错别字'},
{ re: /想往/g, replacement: () => '向往', message: '错别字'},
{ re: /跟本/g, replacement: () => '根本', message: '错别字'},
{ re: /好象/g, replacement: () => '好像', message: '错别字'},
{ re: /大像/g, replacement: () => '大象', message: '错别字'},
{ re: /作作业/g, replacement: () => '做作业', message: '错别字'},
{ re: /作饭/g, replacement: () => '做饭', message: '错别字'},
{ re: /作菜/g, replacement: () => '做菜', message: '错别字'},
{ re: /作梦/g, replacement: () => '做梦', message: '错别字'},
{
re: /登陆(账号|账户|网站|系统|平台|游戏|邮箱)/g,
replacement: (m) => `登录${m[1]}`,
message: '错别字',
},
{
re: /渡过(难关|困难|危机|一生|童年|时光|时间|岁月|假期|周末)/g,
replacement: (m) => `度过${m[1]}`,
message: '错别字',
},
{
re: /截止(目前|今日|现在|今天)/g,
replacement: (m) => `截至${m[1]}`,
message: '错别字',
},
{ re: /其它/g, replacement: () => '其他', message: '建议用“其他”'},
]

// “的”疑似误用为“得”：动词 + 的 + 程度副词 + 短补语，如“跑的很快”→“跑得很快”
// 只提示、不参与批量修正，由用户逐条确认
const VERBS =
'跑|走|说|唱|跳|吃|睡|学|做|玩|看|听|想|哭|笑|飞|游|爬|站|坐|躺|写|读|干|活|过|来|去|回|等|买|卖|穿|戴|用|拿|放|开|关|打|拍|踢|抱|背|拉|推|追|赶|叫|喊|问|答|念|算|画|弹|吹|喝|抽|洗|扫|拖|擦|刷|剪|挂|搬|扛|挑|抬|扶|牵'
const DEGREE =
'很|挺|非常|特别|太|真|更|最|十分|格外|相当|好|有点|比较|蛮'
const DE_RULE = new RegExp(
`(${VERBS})的(${DEGREE})([${CJK}]{1,3})`,
'g',
)

/* ---------------- 标点符号 ---------------- */

const EN_PUNCT_MAP: Record<string, string> = {
',': '，',
'.': '。',
'!': '！',
'?': '？',
';': '；',
':': '：',
'(': '（',
')': '）',
}

const PAIRS: [string, string, string][] = [
['“', '”', '引号'],
['‘', '’', '引号'],
['（', '）', '括号'],
['《', '》', '书名号'],
['\u3010', '\u3011', '方括号'],
['「', '」', '引号'],
]

function checkText(text: string): RawIssue[] {
const out: RawIssue[] = []

// 错别字
for (const rule of TYPO_RULES) {
out.push(
...collect(text, rule.re, (m) =>
issue(
m.index,
m.index + m[0].length,
m[0],
rule.message,
rule.replacement(m),
rule.replacement(m),
true,
rule.bulk!== false,
),
),
)
}
out.push(
...collect(text, DE_RULE, (m) =>
issue(
m.index,
m.index + m[0].length,
m[0],
'疑似“的”应为“得”',
`${m[1]}得${m[2]}${m[3]}`,
`${m[1]}得${m[2]}${m[3]}`,
true,
false,
),
),
)

// 英文标点夹在中文之间（数字间的小数点、千分位不算）
out.push(
...collect(text, new RegExp(`([${CJK}])([,.;!?;:()])`, 'g'), (m) =>
issue(
m.index + 1,
m.index + 2,
m[2],
'英文标点，建议改用中文标点',
EN_PUNCT_MAP[m[2]],
EN_PUNCT_MAP[m[2]],
),
),
)
out.push(
...collect(text, new RegExp(`([,.;!?;:()])([${CJK}])`, 'g'), (m) => {
// 小数点后跟中文通常仍是笔误（如“3.是”），但数字后的点一律跳过
if (m[1] === '.' && m.index > 0 && /\d/.test(text[m.index - 1])) return null
return issue(
m.index,
m.index + 1,
m[1],
'英文标点，建议改用中文标点',
EN_PUNCT_MAP[m[1]],
EN_PUNCT_MAP[m[1]],
)
}),
)

// 英文引号：按出现顺序配对，奇数个配 “”，偶数个配”；单引号同理
for (const [en, open, close] of [
['"', '“', '”'],
["'", '‘', '’'],
] as const) {
const positions: number[] = []
for (let i = 0; i < text.length; i++) {
if (text[i]!== en) continue
const prev = text[i - 1]?? ''
const next = text[i + 1]?? ''
if (
new RegExp(`[${CJK}]`).test(prev) ||
new RegExp(`[${CJK}]`).test(next)
) {
positions.push(i)
}
}
positions.forEach((pos, idx) => {
const replacement = idx % 2 === 0? open: close
out.push(
issue(
pos,
pos + 1,
en,
'英文引号，建议改用中文引号',
replacement,
replacement,
),
)
})
}

// 重复标点：。。！！，，等
out.push(
...collect(text, /([。！？，；：、])\1+/g, (m) =>
issue(
m.index,
m.index + m[0].length,
m[0],
'重复标点',
m[1],
m[1],
),
),
)

// 标点混用：，。；：等两个不同标点连用（？！/！？是合法组合，不算）
out.push(
...collect(text, /([，。！？；：、])([，。！？；：、])/g, (m) => {
if (m[1] === m[2]) return null // 重复标点已由上一条处理
if (
(m[1] === '？' && m[2] === '！') ||
(m[1] === '！' && m[2] === '？')
) {
return null
}
return issue(
m.index,
m.index + m[0].length,
m[0],
'标点混用',
m[2],
m[2],
)
}),
)

// 英文省略号... → ……
out.push(
...collect(text, /\.{3,}/g, (m) =>
issue(
m.index,
m.index + m[0].length,
m[0],
'英文省略号，建议改用中文省略号',
'……',
'……',
),
),
)

// 行首标点
out.push(
...collect(text, /(^|\n)([，。！？；：、])/g, (m) =>
issue(
m.index + m[1].length,
m.index + m[1].length + 1,
m[2],
'行首不应出现标点',
'删除该标点',
'',
),
),
)

// 中文之间多余空格 / 标点前的空格
out.push(
...collect(
text,
new RegExp(`([${CJK}]) +([${CJK}])`, 'g'),
(m) =>
issue(
m.index + 1,
m.index + 1 + (m[0].length - 2),
m[0],
'中文之间有多余空格',
'删除空格',
'',
),
),
)
out.push(
...collect(
text,
new RegExp(`([${CJK}]) +([，。！？；：、])`, 'g'),
(m) =>
issue(
m.index + 1,
m.index + 1 + (m[0].length - 2),
m[0],
'标点前有多余空格',
'删除空格',
'',
),
),
)

// 引号/括号不成对（只提示，不自动改）
for (const [open, close, name] of PAIRS) {
const openCount = text.split(open).length - 1
const closeCount = text.split(close).length - 1
if (openCount!== closeCount) {
const pos = Math.min(
...[text.indexOf(open), text.indexOf(close)].filter((i) => i >= 0),
)
const ch = text[pos]
out.push(
issue(
pos,
pos + 1,
ch,
`${name}不成对（${open} ${openCount} 个，${close} ${closeCount} 个），请检查`,
null,
null,
false,
false,
),
)
}
}

// 句末缺标点：仅正文段落，行末是中文且无标点时建议加句号（仅提示，不批量改）
return out
}

/** 正文段落句末缺标点（行号从 1 开始） */
function checkMissingEndPunct(text: string): RawIssue[] {
const out: RawIssue[] = []
const lines = text.split('\n')
let offset = 0
lines.forEach((line, i) => {
const trimmedEnd = line.length - line.trimEnd().length
const endPos = offset + line.length - trimmedEnd
const lastChar = line.trimEnd().slice(-1)
if (
lastChar &&
new RegExp(`[${CJK}]`).test(lastChar)
) {
out.push(
issue(
endPos,
endPos,
'',
`第 ${i + 1} 行句末缺少标点`,
'加句号 。',
'。',
true,
false,
),
)
}
offset += line.length + 1
})
return out
}

export function proofread(title: string, body: string): ProofIssue[] {
const found: ProofIssue[] = []
for (const [field, text] of [
['title', title],
['body', body],
] as const) {
const issues = checkText(text)
if (field === 'body') issues.push(...checkMissingEndPunct(text))
for (const raw of issues) {
found.push({ field,...raw})
}
}
// 按位置排序，去重（同一位置只留第一条），最多 50 条
found.sort((a, b) => a.start - b.start)
const seen = new Set<string>()
return found
.filter((i) => {
const key = `${i.field}:${i.start}:${i.end}`
if (seen.has(key)) return false
seen.add(key)
return true
})
.slice(0, 50)
}
