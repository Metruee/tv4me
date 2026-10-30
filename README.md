# tv4me · OmniBox 爬虫源自动同步

把上游/外部源转换成 OmniBox 爬虫源，并每天自动重新验活、重新生成、版本自增。


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



## 本地验证

```bash
cd scripts && npm install axios cheerio crypto-js
NODE_PATH="$PWD/sdk:$PWD/node_modules" node verify_spider.js ../spiders/omnibox-短剧.js 重生
```

## 注意

- 生成的文件体积：网盘 A/B 各约 500KB，OmniBox 粘贴/保存可能较慢。
- 上游 `Silent1566/OmniBox-Spider` 最后 push 2026-09-23，若长期不更新，可把 `sync_upstream.py` 的数据源换成别的仓库。
- `@dependencies` 只声明 `axios,cheerio,crypto-js`；上游新源若引入其他依赖，需同步更新这一行。
