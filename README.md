# Portfolio Static Site

这个仓库现在已经是一个真正统一的单项目作品集工程。

不再依赖桌面上的另一个 `个人网站` 目录，也不再通过临时启动外部 `server.js` 去抓取页面内容。当前仓库自己就是唯一源头。

## 现在的目录角色

- `scripts/`
  - 静态页面生成逻辑
- `scripts/site_data.py`
  - 首页、列表页、二级页等结构化内容
- `styles.css`
  - 作品 case 页面共享样式源文件
- `source/work/`
  - 原先来自 `个人网站` 的 3 个 case 页面源文件
- `assets/`
  - 当前项目统一维护的静态资源
- `dist/`
  - 构建产物

## 构建方式

```bash
npm run build
npm run dev
```

- `npm run build`
  - 运行 `scripts/build_site.py`
  - 直接从当前仓库读取 `styles.css`、`source/work/`、`assets/`
  - 生成完整 `dist/`
- `npm run dev`
  - 在 `http://127.0.0.1:4173` 本地预览 `dist/`

## 这次真正统一了什么

之前 `复刻网站` 会跨目录读取：

- `/Users/zhihu/Desktop/个人网站/styles.css`
- `/Users/zhihu/Desktop/个人网站/assets/`
- `/Users/zhihu/Desktop/个人网站/server.js`

现在已经改成：

- case 页面样式源：当前仓库的 [styles.css](/Users/zhihu/Desktop/复刻网站/styles.css)
- case 页面源文件：当前仓库的 [source/work](/Users/zhihu/Desktop/复刻网站/source/work)
- 静态资源：当前仓库的 [assets](/Users/zhihu/Desktop/复刻网站/assets)
- 页面生成：当前仓库的 [scripts/build_site.py](/Users/zhihu/Desktop/复刻网站/scripts/build_site.py)

也就是说，当前仓库已经不再依赖另一个项目目录才能构建成功。

## 当前统一后的状态

这是“一个仓库、一套构建入口、一份可迁移源码”的状态：

- 可以单独拷走
- 可以单独部署
- 可以单独推到 GitHub
- 不需要再保留 `个人网站` 目录作为构建前置条件

## 下一步如果还要继续收口

如果你后面想再往前走一步，可以继续做：

1. 把 `source/work/` 下这 3 个 case 页面再进一步模板化
2. 让它们和 `scripts/site_data.py` 一样，完全进入 Python 生成体系
3. 最终把 “静态 HTML 源文件 + Python 模板” 统一成单一内容系统

但就当前阶段来说，这个项目已经不是“两份项目拼在一起”，而是一个真正可以独立维护的统一项目了。
