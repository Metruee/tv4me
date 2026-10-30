# tv4me · OmniBox 爬虫源自动同步

把上游 / 外部源转换成 OmniBox 爬虫源，每天自动重新验活、去重、按体积分片、版本自增。



## 目录结构

```
tv4me/
├── spiders/                    # 生成的爬虫源（OmniBox 导入/更新用）
├── config/
│   ├── merged.json             # 上游分组（自动生成，勿手改）
│   ├── static.json             # 固定站点清单（）
│   └── health.json             # 每个源的连续失败计数（容错用）
├── scripts/
│   ├── build_merged.py         # 合并器：多源 → 一个蜘蛛（序号: 前缀路由）
│   ├── build_static.py         # 生成固定清单类源（）
│   ├── sync_upstream.py        # 拉上游 → 验活 → 去重 → 分片 → 版本自增
│   ├── convert_maccms.py       # 转源器：TVBox 配置 / 苹果CMS 列表 → 蜘蛛
│   ├── verify_spider.js        # 单源验活
│   ├── templates/              # 苹果CMS 通用层模板
│   └── sdk/                    # omnibox_sdk / spider_runner 本地桩（仅验证用）
└── .github/workflows/sync.yml  # 每周日 UTC 18:00（北京周一 02:00）自动同步
```

## 自动同步做了什么

1. 下载 `Silent1566/OmniBox-Spider`；
2. 跳过非点播目录（模板 / 拦截器 / 定时任务 / Emby / 直播 / 流媒体 / 已失效待修复）；
3. 8 线程逐个实跑验活，**只合并真能返回内容的**；
4. 去重：内容 SHA256 + 归一化站名；
5. 按体积分片，单文件默认上限 `MAX_KB=200`；
6. 版本号 `3.<YYYYMMDD>.<HHMM>`，有变化自动 commit + push。

容错：某源连续失败 ≤2 次仍保留（`config/health.json`），连续失败 3 次才剔除，避免网络抖动误删。

## 导入 / 更新

- **首次**：OmniBox 后台 → **GitHub 导入** → 仓库填 `https://github.com/Metruee/tv4me` → 勾选 `spiders/` 整个目录。
- **之后**：源列表勾选 → 检查更新 → 从远端同步（依赖脚本内的 `@downloadURL` 与 `@version`，且仓库必须为 public）。

## 转新源

```bash
# TVBox / 影视仓 配置（只取 type 0/1 的苹果CMS 站点，type 3 jar 蜘蛛会跳过）
python3 scripts/convert_maccms.py --tvbox <url或本地文件> \
        --name "外部源转换" --out spiders/omnibox-tvbox.js

# 自己的列表
python3 scripts/convert_maccms.py --list /tmp/list.json --name "我的源" --out spiders/omnibox-mine.js
```

转换器会逐个请求 `ac=list` 验活，只保留返回数据的站。

## 本地验证

```bash
cd scripts && npm install axios cheerio crypto-js
NODE_PATH="$PWD/sdk:$PWD/node_modules" node verify_spider.js ../spiders/omnibox-短剧.js 重生
```

---

## 致谢

本仓库的爬虫代码与配置来自以下开源项目，感谢作者的无私分享：

- [Silent1566/OmniBox-Spider](https://github.com/Silent1566/OmniBox-Spider)
- [JE668/LunaTV-config-to-OmniBox-config](https://github.com/JE668/LunaTV-config-to-OmniBox-config)
- [yujian0815/fnmedia-ext](https://github.com/yujian0815/fnmedia-ext)

以及 OmniBox 本体作者，和所有提供公开接口的资源站站长。

以上项目的版权与许可证归各自作者所有；本仓库仅做聚合、转换与可用性验证，不存储、不分发任何影视内容。

---

## 注意

- 单文件体积由 `MAX_KB` 控制（默认 200），可在 Actions 里改环境变量。
- 上游 `Silent1566/OmniBox-Spider` 最后 push 2026-09-23，若长期不更新，可把 `sync_upstream.py` 的数据源换成别的仓库。
- `@dependencies` 只声明 `axios,cheerio,crypto-js`；上游新源若引入其他依赖，需同步更新这一行。
