# 金句卡片生成器

个性化金句图片生成器：上传头像、修改昵称 / 账号 ID / 认证标识、编辑标题与正文，实时预览 Canvas 渲染结果，一键导出高清 PNG。纯前端实现，无后端、无登录，编辑记录保存在浏览器本地存储。

## 功能

- **头像管理**：支持 JPG / PNG / WebP 上传（按钮上传或拖到预览图上），圆形裁剪预览，缩放 1x–3x，拖动调整位置
- **账号信息**：自定义昵称、账号 ID，蓝色 / 橙色 / 无认证三种标识（Canvas 绘制 24 角星形徽章 + 对勾）
- **内容编辑**：标题、正文多段落，空行表示分段，按字符自动换行
- **实时预览**：编辑即用 `requestAnimationFrame` 节流重绘 Canvas
- **模板系统**：经典白底 / 深色 / 暖白三种模板，注册表位于 `src/templates.ts`，新增模板只需加一条记录
- **样式设置**：正文字号（30–56px）、行间距（1.6–2.6x，默认 1.8）、文字颜色、背景颜色；图片尺寸固定 275×370
- **图片导出**：固定导出 1100×1480 PNG（275:370 比例的 4x，适合发小红书）；内容溢出时自动把正文字号缩小到 60%，仍溢出则显示提示
- **本地保存**：编辑状态存入 `localStorage`（键 `quote-card-state-v1`）；头像 data URL 超过约 800KB 时不写入，仅保留在当前会话内存中
- **移动端适配**：小于 850px 时上下布局，桌面端左右布局

## 本地开发

```bash
npm install
npm run dev        # 开发服务器，默认 http://localhost:5173
npm run typecheck  # TypeScript 类型检查
npm run build      # 类型检查 + 构建，产物在 dist/
npm run preview    # 本地预览构建产物
```

## 部署（Cloudflare Pages）

当前线上部署方式：Cloudflare Pages 项目 `quote-card-generator`（生产分支 main），自定义域名 `quote.daiguaxiaojian.com`（CNAME 指向 `quote-card-generator.pages.dev`，HTTPS 由 Cloudflare 自动签发）。

构建命令：`npm run build`；输出目录：`dist`；Node 20+。

后续更新：修改代码后推送到 GitHub main 分支，部署服务器每 10 分钟检查一次 main 分支 HEAD，有新提交时自动构建并部署（脚本 `deploy/auto_deploy.py`）。原生 Pages↔GitHub 自动部署需在 GitHub 安装 Cloudflare Pages 应用，当前未启用；如需改用原生方式，在 Pages 项目设置中连接 GitHub 仓库即可。

## 技术栈

- React 18 + Vite 5 + TypeScript（严格模式）
- Canvas 2D 渲染（`src/render.ts`，纯函数，可独立测试）
- 系统字体：`"Microsoft YaHei", "PingFang SC", system-ui, sans-serif`（无外部字体请求，中文渲染一致）
- 无运行时网络请求
