# 部署说明

这是中文-西班牙语双语国际贸易术语库的可直接部署版本。

## 文件结构

```text
trade-terms-deploy/
├── index.html
├── app.js
├── styles.css
├── README.md
├── DEPLOY.md
└── data/
    └── terms.json
```

## Netlify 部署

1. 打开 https://app.netlify.com/drop
2. 将 `trade-terms-deploy` 文件夹整体拖入页面。
3. 等待上传完成后，Netlify 会生成一个可直接访问的网址。

## Cloudflare Pages 部署

1. 登录 Cloudflare Pages。
2. 选择上传静态资源。
3. 上传 `trade-terms-deploy` 文件夹中的全部内容。
4. 构建命令留空，输出目录使用根目录。

## GitHub Pages 部署

1. 新建 GitHub 仓库。
2. 上传 `trade-terms-deploy` 文件夹中的全部内容，不要只上传 HTML。
3. 进入仓库 Settings → Pages。
4. Source 选择 `Deploy from a branch`，Branch 选择 `main`，目录选择 `/root`。
5. 保存后等待 GitHub 生成网址。

## 注意事项

- 不要只上传 `index.html`，否则术语数据无法加载。
- `data/terms.json` 必须保留在 `data` 文件夹中。
- 该版本是纯静态网站，不需要服务器后端。
