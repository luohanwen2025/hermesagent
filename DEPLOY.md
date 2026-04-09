# HermesAgent.Best 部署指南

## 部署到 Cloudflare Pages

### 方式一：通过 Git 仓库自动部署（推荐）

1. **将项目推送到 GitHub**
   ```bash
   cd hermesagent
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/hermesagent.git
   git push -u origin main
   ```

2. **在 Cloudflare Pages 创建项目**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - 进入 **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
   - 选择你的 GitHub 仓库
   - 配置构建设置：
     - **Framework preset**: Astro
     - **Build command**: `npm run build`
     - **Build output directory**: `dist`
     - **Node.js version**: `18`（在 Environment Variables 中设置 `NODE_VERSION=18`）

3. **配置自定义域名**
   - 在 Cloudflare Pages 项目设置中，进入 **Custom domains**
   - 点击 **Set up a custom domain**
   - 输入 `hermesagent.best`
   - Cloudflare 会自动配置 DNS 记录（如果域名已在 Cloudflare 管理）
   - 如果域名不在 Cloudflare，需要将域名的 nameserver 指向 Cloudflare

### 方式二：直接上传静态文件

如果不想通过 Git，可以直接上传构建产物：

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 直接部署 dist 目录
wrangler pages deploy dist --project-name=hermesagent-best
```

然后在 Cloudflare Pages 设置中绑定自定义域名 `hermesagent.best`。

## DNS 配置

### 如果域名已在 Cloudflare 管理

Cloudflare Pages 绑定自定义域名时会自动添加 CNAME 记录，无需手动操作。

### 如果域名在其他注册商

需要在域名 DNS 设置中添加：

| 类型  | 名称 | 值 |
|-------|------|----|
| CNAME | @    | hermesagent-best.pages.dev |

或者将域名的 nameserver 切换到 Cloudflare：
- `ns1.cloudflare.com`
- `ns2.cloudflare.com`

## 内容同步

定期从官方仓库同步内容更新：

```bash
# 检查是否有更新
npm run sync-docs

# 下载更新的文件到 synced-docs/ 目录
npm run sync-docs -- --download
```

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 本地预览构建结果
npm run preview
```
