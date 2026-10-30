# tv4me · OmniBox 爬虫源自动同步

把上游/外部源转换成 OmniBox 爬虫源，并每天自动重新验活、重新生成、版本自增。

## ⚠️ 重要前提：私有库的 raw 地址 OmniBox 拉不到

`@downloadURL` 指向 `raw.githubusercontent.com/Metruee/tv4me/...`。**私有库的 raw 地址未授权访问会 401/404**，OmniBox 服务端没有你的 token，所以「检查更新」会失败。

三选一：
1. **把 tv4me 设为 public**（推荐；里面只有爬虫代码和脚本，无密钥）；
2. 另开一个 **public 仓库**（如 `tv4me-spiders`）只放 `spiders/`，本仓库继续私有；
3. 不用 `@downloadURL`，改用手动导入。

## 目录结构

```
tv4me/
├── spiders/                  # 生成的爬虫源（OmniBox 导入/更新用）
│   ├── omnibox-采集A.js … omnibox-综合导航.js   (10 个)
├── config/merged.json        # 分组配置（哪些子源进哪个文件 + 版本 + 下载地址）
├── scripts/
│   ├── build_merged.py       # 合并器：多源 → 一个蜘蛛（序号: 前缀路由）
│   ├── sync_upstream.py      # 拉上游 → 逐个实跑验活 → 重新合并 → 版本自增
│   ├── convert_maccms.py     # 转源器：TVBox 配置 / 苹果CMS 列表 → 蜘蛛
│   ├── verify_spider.js      # 单源验活（home 失败再 search）
│   ├── templates/            # 苹果CMS 通用层模板
│   └── sdk/                  # omnibox_sdk / spider_runner 本地桩（仅验证用）
└── .github/workflows/sync.yml  # 每天 UTC 18:00（北京 02:00）自动同步
```

## 现有 10 个源

| 文件 | 子源数 | 内容 |
|---|---|---|
| `omnibox-采集A/B/C.js` | 11+11+11 | 影视采集站（含 movie360 解析） |
| `omnibox-网盘A/B.js` | 6+6 | 网盘站 |
| `omnibox-短剧.js` | 4 | 短剧 |
| `omnibox-音乐听书.js` | 7 | 音乐 + 听书 |
| `omnibox-教育.js` | 2 | **纯教育**（哔哩教育 + 贝乐虎） |
| `omnibox-动漫.js` | 1 | 动漫 |
| `omnibox-综合导航.js` | 3 | 哔哩大全 + MakkaPakka + 豆瓣推荐 |

## `@downloadURL` 到底怎么工作（重要）

它**不会**让爬虫自动更新。真实流程（从前端代码确认）：

1. OmniBox 读到脚本里有 `@downloadURL` → 才在源列表显示「检查更新」按钮；
2. 点「检查更新」→ `GET /api/spider-source/{id}/script/check-update?path=index.js`
   → 服务端去拉 `@downloadURL`，比对 `@version`，返回 `hasUpdate`；
3. 点「从远端同步」→ `POST /api/spider-source/{id}/script/update-from-remote?path=index.js` → 覆盖本地脚本。

所以是**拉模式 + 手动触发**（支持勾选多个批量）。要真正无人值守，只能外部定时调这两个接口，而它们要登录态。

## 每天自动同步做了什么

`sync_upstream.py`：

1. 下载 `Silent1566/OmniBox-Spider` main 分支 tarball（走 gh-proxy）；
2. 解包，对每个 `.js` 跑 `verify_spider.js`（home，失败再 search）——**只合并真能返回内容的**；
3. 按分类重新分组，`采集` 按体积均分 3 份、`网盘` 均分 2 份；
4. 版本号 = `2.<YYYYMMDD>.<run_number>`，写入文件；
5. `spiders/` 有变化则 commit + push。

## 导入 / 使用

**首次导入**：
- 方式 A（推荐）：OmniBox 后台 → 蜘蛛源 →「GitHub 导入爬虫源」→ 填仓库地址 + 勾 `spiders/` 下文件；
- 方式 B：手动打开 `spiders/*.js` 复制粘贴。

**之后更新**：源列表勾选 → 检查更新 → 从远端同步。

## 把新源转成爬虫

```bash
# 1) 从 TVBox/影视仓 配置转（只取 type 0/1 的苹果CMS 站点，type 3 jar 蜘蛛会跳过）
python3 scripts/convert_maccms.py --tvbox https://example.com/config.json \
        --name "外部TVBox转换" --out spiders/omnibox-tvbox.js

# 2) 从自己的列表转
cat > /tmp/list.json <<'EOF'
[{"name":"电影天堂","api":"http://caiji.dyttzyapi.com/api.php/provide/vod"}]
EOF
python3 scripts/convert_maccms.py --list /tmp/list.json --name "我的源" --out spiders/omnibox-mine.js

# 加 --limit N 限制探测数量；--download 指定 @downloadURL
```

转换器会逐个请求 `ac=list` 验活，**只保留返回数据的站**。

## 本地验证

```bash
cd scripts && npm install axios cheerio crypto-js
NODE_PATH="$PWD/sdk:$PWD/node_modules" node verify_spider.js ../spiders/omnibox-短剧.js 重生
```

## 注意

- 生成的文件体积：网盘 A/B 各约 500KB，OmniBox 粘贴/保存可能较慢。
- 上游 `Silent1566/OmniBox-Spider` 最后 push 2026-09-23，若长期不更新，可把 `sync_upstream.py` 的数据源换成别的仓库。
- `@dependencies` 只声明 `axios,cheerio,crypto-js`；上游新源若引入其他依赖，需同步更新这一行。
