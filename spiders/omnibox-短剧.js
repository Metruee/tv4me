// @name 短剧聚合(合并)
// @version 2.20261030.3
// @description 自动同步：短剧
// @downloadURL https://gh-proxy.com/https://raw.githubusercontent.com/Metruee/tv4me/main/spiders/omnibox-短剧.js
// @dependencies axios,cheerio,crypto-js
// @note 由 tv4me 自动生成 · 聚合自 Silent1566/OmniBox-Spider，仅供个人使用

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");

const SUBS = [];

function _load(i, name, fn) {
  const mod = { exports: {} };
  let captured = null;
  const fakeRunner = { run: function (h) { captured = h; } };
  const fakeRequire = function (n) { return n === "spider_runner" ? fakeRunner : require(n); };
  try {
    fn(mod, mod.exports, fakeRequire);
    SUBS[i] = { name: name, h: captured || mod.exports };
  } catch (e) {
    SUBS[i] = { name: name, h: null, err: String((e && e.message) || e) };
  }
}

function _pfx(i, id) { return String(i) + ":" + String(id == null ? "" : id); }
function _split(id) {
  const s = String(id == null ? "" : id);
  const c = s.indexOf(":");
  if (c < 0) return [0, s];
  return [parseInt(s.slice(0, c), 10) || 0, s.slice(c + 1)];
}
function _timeout(p, ms) {
  let t;
  const to = new Promise(function (_, rej) { t = setTimeout(function () { rej(new Error("timeout")); }, ms); });
  return Promise.race([p, to]).finally(function () { clearTimeout(t); });
}
function _empty() { return { page: 1, pagecount: 1, total: 0, list: [] }; }
function _subOk(s, k) { return s && s.h && typeof s.h[k] === "function"; }

async function home(params, context) {
  const results = await Promise.allSettled(SUBS.map(function (s, i) {
    if (!_subOk(s, "home")) return Promise.resolve(null);
    return _timeout(Promise.resolve().then(function () { return s.h.home(params, context); }), 4500).then(function (v) { return { i: i, v: v }; });
  }));
  const cls = [], list = [];
  results.forEach(function (r) {
    if (r.status !== "fulfilled" || !r.value || !r.value.v) return;
    const i = r.value.i, v = r.value.v;
    (v.class || []).forEach(function (c) { cls.push({ type_id: _pfx(i, c.type_id), type_name: c.type_name }); });
    (v.list || []).slice(0, 20).forEach(function (x) { x.vod_id = _pfx(i, x.vod_id); list.push(x); });
  });
  return { class: cls, list: list.slice(0, 200) };
}

async function category(params, context) {
  const parts = _split(params.categoryId);
  const sub = SUBS[parts[0]];
  if (!_subOk(sub, "category")) return _empty();
  const p = Object.assign({}, params, { categoryId: parts[1] });
  try {
    const r = await _timeout(sub.h.category(p, context), 15000);
    if (r && r.list) r.list.forEach(function (x) { x.vod_id = _pfx(parts[0], x.vod_id); });
    return r;
  } catch (e) { return _empty(); }
}

async function search(params, context) {
  const kw = params.keyword || "";
  if (!kw) return _empty();
  const results = await Promise.allSettled(SUBS.map(function (s, i) {
    if (!_subOk(s, "search")) return Promise.resolve(null);
    return _timeout(Promise.resolve().then(function () { return s.h.search(params, context); }), 9000).then(function (v) { return { i: i, v: v }; });
  }));
  const list = [];
  results.forEach(function (r) {
    if (r.status !== "fulfilled" || !r.value || !r.value.v) return;
    const i = r.value.i;
    (r.value.v.list || []).forEach(function (x) { x.vod_id = _pfx(i, x.vod_id); list.push(x); });
  });
  return { page: 1, pagecount: 1, total: list.length, list: list };
}

async function detail(params, context) {
  const parts = _split(params.videoId);
  const sub = SUBS[parts[0]];
  if (!_subOk(sub, "detail")) return { list: [] };
  const p = Object.assign({}, params, { videoId: parts[1] });
  try {
    const r = await _timeout(sub.h.detail(p, context), 20000);
    if (r && r.list) r.list.forEach(function (v) {
      v.vod_id = _pfx(parts[0], v.vod_id);
      (v.vod_play_sources || []).forEach(function (src) {
        (src.episodes || []).forEach(function (ep) { ep.playId = _pfx(parts[0], ep.playId); });
      });
    });
    return r;
  } catch (e) { return { list: [] }; }
}

async function play(params, context) {
  const parts = _split(params.playId);
  const sub = SUBS[parts[0]];
  if (!_subOk(sub, "play")) return { urls: [] };
  const p = Object.assign({}, params, { playId: parts[1] });
  try { return await _timeout(sub.h.play(p, context), 25000); }
  catch (e) { return { urls: [] }; }
}

module.exports = { home, category, detail, search, play };
runner.run(module.exports);


_load(0, "星星短剧", function (module, exports, require) {
// @name 星星短剧 ᵈᶻ[短]
// @version 1.0.4
// @push 0
// @dependencies axios
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/短剧/星星短剧.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");

const HOST = "http://read.api.duodutek.com";
const UA = "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.87 Safari/537.36";

// 固定参数（来自原 PHP）
const COMMON_PARAMS = {
  productId: "2a8c14d1-72e7-498b-af23-381028eb47c0",
  vestId: "2be070e0-c824-4d0e-a67a-8f688890cadb",
  channel: "oppo19",
  osType: "android",
  version: "20",
  token: "202509271001001446030204698626"
};

const CATEGORIES = [
  { type_id: "1287", type_name: "甜宠" },
  { type_id: "1288", type_name: "逆袭" },
  { type_id: "1289", type_name: "热血" },
  { type_id: "1290", type_name: "现代" },
  { type_id: "1291", type_name: "古代" }
];

function text(v) {
  return String(v == null ? "" : v).trim();
}

async function apiGet(path, params = {}) {
  const url = `${HOST}${path}?${new URLSearchParams({ ...COMMON_PARAMS, ...params }).toString()}`;
  const res = await OmniBox.request(url, {
    method: "GET",
    headers: { "User-Agent": UA }
  });
  if (res.statusCode !== 200) throw new Error(`HTTP ${res.statusCode}`);
  return JSON.parse(res.body || "{}") || {};
}

function mapVod(v) {
  return {
    vod_id: `${v.id}@@${v.name}@@${text(v.introduction)}`,
    vod_name: text(v.name),
    vod_pic: text(v.icon),
    vod_remarks: `${text(v.heat)}万播放`
  };
}

async function home(params, context) {
  try {
    const list = (await category({ categoryId: "1287", page: 1 }, context)).list || [];
    return {
      class: CATEGORIES,
      list: list.slice(0, 12),
      filters: {}
    };
  } catch (e) {
    await OmniBox.log("error", `[home] ${e.message}`);
    return { class: CATEGORIES, list: [], filters: {} };
  }
}

async function category(params, context) {
  try {
    const tid = text(params?.categoryId || "1287");
    const page = Number(params?.page || 1);
    const json = await apiGet("/novel-api/app/pageModel/getResourceById", {
      resourceId: tid,
      pageNum: String(page),
      pageSize: "10"
    });
    const list = (json?.data?.datalist || []).map(mapVod);
    const total =
      Number(json?.data?.total) ||
      Number(json?.data?.totalCount) ||
      Number(json?.total) ||
      list.length;
    return {
      page,
      pagecount: 999,
      total,
      list
    };
  } catch (e) {
    await OmniBox.log("error", `[category] ${e.message}`);
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }
}

async function detail(params, context) {
  try {
    const vid = text(params?.videoId || "");
    if (!vid) return { list: [] };

    let bookId = "";
    let bookName = "";
    let intro = "";
    const parts = vid.split("@@");
    if (parts.length >= 2) {
      bookId = parts[0];
      bookName = parts[1];
      intro = parts[2] || "";
    } else {
      const parts2 = vid.split("@");
      bookId = parts2[0];
      intro = parts2[1] || "";
    }

    const json = await apiGet("/novel-api/basedata/book/getChapterList", { bookId });
    const chapters = json?.data || [];
    const episodes = [];

    chapters.forEach((ch, idx) => {
      const url = ch?.shortPlayList?.[0]?.chapterShortPlayVoList?.[0]?.shortPlayUrl;
      if (url) episodes.push({ name: `第${idx + 1}集`, playId: url });
    });

    const vod = {
      vod_id: vid,
      vod_name: bookName || "",
      vod_content: intro,
      vod_play_sources: episodes.length ? [{ name: "短剧专线", episodes }] : []
    };

    return { list: [vod] };
  } catch (e) {
    await OmniBox.log("error", `[detail] ${e.message}`);
    return { list: [] };
  }
}

async function search(params, context) {
  // 原脚本未实现搜索，保持空结果
  const page = Number(params?.page || 1);
  return { page, pagecount: 0, total: 0, list: [] };
}

async function play(params, context) {
  try {
    const playId = text(params?.playId || "");
    const flag = text(params?.flag || "短剧专线");
    if (!playId) throw new Error("playId 为空");
    return {
      urls: [{ name: "播放", url: playId }],
      header: { "User-Agent": UA },
      parse: 0
    };
  } catch (e) {
    await OmniBox.log("error", `[play] ${e.message}`);
    return { url: "", header: {} };
  }
}

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

});

_load(1, "河马短剧", function (module, exports, require) {
// @name 河马短剧
// @author
// @description
// @dependencies: axios, crypto-js
// @version 1.0.2
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/短剧/河马短剧.js

/**
 * ==========================================================================
 * 河马短剧 - OmniBox 爬虫脚本（新格式）
 * ==========================================================================
 * 数据来源: https://www.kuaikaw.cn
 * 核心功能:
 *   - 首页/分类列表
 *   - 搜索
 *   - 详情/剧集
 *   - 播放直链解析（优先直链，APP 接口兜底）
 * 注意事项:
 *   - 页面为 Next.js，需要解析 __NEXT_DATA__
 *   - 付费章节需按 chapterId 请求 APP 播放接口
 * 更新时间: 2026-07-31
 * ==========================================================================
 */

const axios = require("axios");
const CryptoJS = require("crypto-js");
const https = require("https");
const OmniBox = require("omnibox_sdk");

// ========== 全局配置 ==========
const hemaConfig = {
    siteUrl: "https://www.kuaikaw.cn",
    headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
        "Referer": "https://www.kuaikaw.cn",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
    },
    apiHeaders: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
        "Referer": "https://www.kuaikaw.cn/search",
        "Origin": "https://www.kuaikaw.cn",
        "Content-Type": "application/json",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "pname": "www.kuaikaw.cn"
    },
    timeout: 12000
};

const appApiConfig = {
    apiUrl: "https://freevideo.zqqds.cn",
    key: CryptoJS.enc.Base64.parse("ZHpramdmeXhnc2h5bGd6bQ=="),
    iv: CryptoJS.enc.Base64.parse("YXBpdXBkb3duZWRjcnlwdA=="),
    device: {
        utdidTmp: "A20260731163429368CCKSq5",
        utdid: "80e5f8f1406e0cd7ab8aecaab158d693",
        installTime: 1785483288736
    }
};

// 分类映射（站点固定分类）
const classMapping = {
    "462": "甜宠",
    "1102": "古装仙侠",
    "1145": "现代言情",
    "1170": "青春",
    "585": "豪门恩怨",
    "417-464": "逆袭",
    "439-465": "重生",
    "1159": "系统",
    "1147": "总裁",
    "943": "职场商战"
};

// ========== 请求实例 ==========
const axiosInstance = axios.create({
    timeout: hemaConfig.timeout,
    httpsAgent: new https.Agent({ rejectUnauthorized: false })
});

// ========== 日志工具 ==========
const logInfo = (message, data) => {
    if (data !== undefined && data !== null) {
        OmniBox.log("info", `[河马短剧] ${message}: ${JSON.stringify(data)}`);
    } else {
        OmniBox.log("info", `[河马短剧] ${message}`);
    }
};

const logError = (message, error) => {
    OmniBox.log("error", `[河马短剧] ${message}: ${error.message || error}`);
};

// ========== 工具函数 ==========

/**
 * 发送 GET 请求
 * @param {string} url
 * @returns {Promise<string>} HTML 文本
 */
const requestHtml = async (url) => {
    try {
        const res = await axiosInstance.get(url, { headers: hemaConfig.headers });
        return res.data;
    } catch (error) {
        logError("请求失败", error);
        throw error;
    }
};

/**
 * 解析 Next.js 数据
 * @param {string} html
 * @returns {Object|null}
 */
const parseNextData = (html) => {
    try {
        const pattern = /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s;
        const match = html.match(pattern);
        if (match && match[1]) {
            return JSON.parse(match[1]);
        }
    } catch (e) {
        logError("解析 __NEXT_DATA__ 失败", e);
    }
    return null;
};

/**
 * 生成分类列表
 */
const buildClasses = () => {
    return Object.keys(classMapping).map((key) => ({
        type_id: key,
        type_name: classMapping[key]
    }));
};

/**
 * 判断是否直链
 */
const isDirectPlayable = (url) => {
    return !!(url && url.match(/\.(m3u8|mp4|flv|avi|mkv|ts)(\?|$)/i));
};

/**
 * 安全转换页码
 */
const toPage = (value, def) => {
    const p = parseInt(value, 10);
    return Number.isNaN(p) ? def : p;
};

const buildTmpId = () => Math.random().toString(36).slice(2, 18);

const randomHex = (length) => {
    let value = "";
    for (let i = 0; i < length; i += 1) {
        value += Math.floor(Math.random() * 16).toString(16);
    }
    return value;
};

const buildUuid = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
        const random = Math.floor(Math.random() * 16);
        return (char === "x" ? random : ((random & 3) | 8)).toString(16);
    });
};

const aesEncrypt = (text) => {
    const encrypted = CryptoJS.AES.encrypt(
        CryptoJS.enc.Utf8.parse(text),
        appApiConfig.key,
        {
            iv: appApiConfig.iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        }
    );
    return encrypted.ciphertext.toString(CryptoJS.enc.Base64);
};

const aesDecrypt = (text) => {
    const cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: CryptoJS.enc.Base64.parse(text)
    });
    return CryptoJS.AES.decrypt(
        cipherParams,
        appApiConfig.key,
        {
            iv: appApiConfig.iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        }
    ).toString(CryptoJS.enc.Utf8);
};

const buildAppHeaders = () => {
    const session = buildUuid();
    const commonData = {
        freeflow: 0,
        version: "3.7.0",
        pname: "com.dz.hmjc",
        channelCode: "VHSE1000000",
        utdidTmp: appApiConfig.device.utdidTmp,
        token: "",
        utdid: appApiConfig.device.utdid,
        os: "android",
        osv: 28,
        brand: "OnePlus",
        model: "HD1910",
        manu: "OnePlus",
        userId: "",
        launch: "shortcut",
        mchid: "",
        nchid: "VHSE1000000",
        session1: session,
        session2: session,
        startScene: "shortcut",
        recSwitch: false,
        ds: -1,
        installTime: appApiConfig.device.installTime,
        p: 59,
        nonce: randomHex(32),
        timeZone: "Asia/Shanghai",
        timestamp: String(Date.now())
    };

    return {
        "alg": "HG45LKBS",
        "datas": aesEncrypt(JSON.stringify(commonData)),
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": "okhttp/4.10.0"
    };
};

const requestAppApi = async (portal, payload) => {
    const url = `${appApiConfig.apiUrl}/free-video-portal/portal/${portal}`;
    const response = await axiosInstance.post(
        url,
        aesEncrypt(JSON.stringify(payload)),
        {
            headers: buildAppHeaders(),
            transformRequest: [(data) => data]
        }
    );
    const result = typeof response.data === "string" ? JSON.parse(response.data) : response.data;

    if (!result || !result.data) {
        const message = result && (result.message || result.msg || result.code);
        throw new Error(`APP 接口 ${portal} 返回无效数据${message !== undefined ? `: ${message}` : ""}`);
    }

    const decrypted = aesDecrypt(result.data);
    return JSON.parse(decrypted);
};

const normalizeSearchBook = (book) => {
    if (!book || !book.bookId) return null;
    return {
        vod_id: `/drama/${book.bookId}`,
        vod_name: book.bookName,
        vod_pic: book.coverWap,
        vod_remarks: `${book.statusDesc || (book.status === 1 ? "完本" : "更新中") || ""} ${book.totalChapterNum || ""}集`.trim()
    };
};

// ========== 核心逻辑 ==========

/**
 * 首页：返回分类 + 推荐列表
 */
async function home(params) {
    logInfo("进入首页", params);

    try {
        const classes = buildClasses();
        const homeResult = await getCategoryList(null, 1);
        return {
            class: classes,
            list: homeResult.list,
            page: 1,
            pagecount: homeResult.pagecount,
            limit: homeResult.limit,
            total: homeResult.total
        };
    } catch (e) {
        logError("首页获取失败", e);
        return { class: [], list: [] };
    }
}

/**
 * 分类列表
 */
async function category(params) {
    const categoryId = params.categoryId;
    const page = toPage(params.page, 1);

    logInfo("请求分类", { categoryId, page });

    if (!categoryId) {
        return { list: [], page: 1, pagecount: 1 };
    }

    return await getCategoryList(categoryId, page);
}

/**
 * 搜索
 */
async function search(params) {
    const keyword = params.keyword || params.wd || "";
    const page = toPage(params.page, 1);

    if (!keyword) {
        return { list: [], page: 1, pagecount: 0 };
    }

    logInfo("搜索", { keyword, page });
    return await searchContent(keyword, page);
}

/**
 * 详情
 */
async function detail(params) {
    const videoId = params.videoId;
    if (!videoId) {
        return { list: [] };
    }

    logInfo("请求详情", { videoId });
    const item = await getDetail(videoId);
    return { list: item ? [item] : [] };
}

/**
 * 播放解析
 */
async function play(params) {
    const playId = params.playId;
    if (!playId) {
        return { urls: [], parse: 0 };
    }

    logInfo("播放解析", { playId });
    return await getPlayUrl(playId);
}

// ========== 数据解析实现 ==========

/**
 * 获取首页/分类列表
 * @param {string|null} tid 分类ID，为 null 表示首页
 * @param {number} page 页码
 */
const getCategoryList = async (tid, page = 1) => {
    try {
        let url;
        const isHome = !tid;

        if (isHome) {
            url = hemaConfig.siteUrl;
        } else {
            url = `${hemaConfig.siteUrl}/browse/${tid}/${page}`;
        }

        const html = await requestHtml(url);
        const json = parseNextData(html);
        if (!json) return { list: [], page: 1, pagecount: 1 };

        const pageProps = json.props && json.props.pageProps ? json.props.pageProps : {};
        let videos = [];

        if (isHome) {
            // 首页：Banner + SEO Columns
            if (pageProps.bannerList) {
                pageProps.bannerList.forEach((banner) => {
                    if (banner.bookId) {
                        videos.push({
                            vod_id: `/drama/${banner.bookId}`,
                            vod_name: banner.bookName,
                            vod_pic: banner.coverWap,
                            vod_remarks: `${banner.statusDesc || ""} ${banner.totalChapterNum || ""}集`.trim()
                        });
                    }
                });
            }

            if (pageProps.seoColumnVos) {
                pageProps.seoColumnVos.forEach((column) => {
                    if (column.bookInfos) {
                        column.bookInfos.forEach((book) => {
                            if (book.bookId) {
                                videos.push({
                                    vod_id: `/drama/${book.bookId}`,
                                    vod_name: book.bookName,
                                    vod_pic: book.coverWap,
                                    vod_remarks: `${book.statusDesc || ""} ${book.totalChapterNum || ""}集`.trim()
                                });
                            }
                        });
                    }
                });
            }

            // 去重
            const seen = new Set();
            videos = videos.filter((v) => {
                const duplicate = seen.has(v.vod_id);
                seen.add(v.vod_id);
                return !duplicate;
            });
        } else {
            // 分类页
            const bookList = pageProps.bookList || [];
            bookList.forEach((book) => {
                if (book.bookId) {
                    videos.push({
                        vod_id: `/drama/${book.bookId}`,
                        vod_name: book.bookName,
                        vod_pic: book.coverWap,
                        vod_remarks: `${book.statusDesc || ""} ${book.totalChapterNum || ""}集`.trim()
                    });
                }
            });
        }

        return {
            list: videos,
            page: toPage(page, 1),
            pagecount: pageProps.pages || 1,
            limit: 20,
            total: 999
        };
    } catch (error) {
        logError("分类获取失败", error);
        return { list: [], page: 1, pagecount: 1 };
    }
};

/**
 * 搜索
 */
const searchContent = async (key, page = 1) => {
    try {
        const apiUrl = `${hemaConfig.siteUrl}/seo/video/6007`;
        const payload = {
            sourceType: 1,
            keyword: key,
            index: toPage(page, 1)
        };
        const headers = {
            ...hemaConfig.apiHeaders,
            Referer: `${hemaConfig.siteUrl}/search?searchValue=${encodeURIComponent(key)}`,
            tmpid: buildTmpId()
        };

        logInfo("搜索接口请求", { apiUrl, payload });
        const apiRes = await axiosInstance.post(apiUrl, payload, { headers });
        const apiData = apiRes && apiRes.data ? apiRes.data : {};
        const result = apiData.data || {};
        const apiBookList = Array.isArray(result.bookList) ? result.bookList : [];

        if (apiRes.status === 200 && apiData.retCode === 0) {
            const list = apiBookList.map(normalizeSearchBook).filter(Boolean);
            const total = Number(result.totalSize) || list.length;
            return {
                list,
                page: toPage(page, 1),
                pagecount: Math.max(1, Math.ceil(total / 10)),
                limit: 10,
                total
            };
        }

        logInfo("搜索接口返回非成功状态，回退页面解析", {
            status: apiRes.status,
            retCode: apiData.retCode
        });

        const url = `${hemaConfig.siteUrl}/search?searchValue=${encodeURIComponent(key)}&page=${page}`;
        const html = await requestHtml(url);
        const json = parseNextData(html);
        if (!json) return { list: [], page: 1, pagecount: 1 };

        const pageProps = json.props && json.props.pageProps ? json.props.pageProps : {};
        const bookList = pageProps.bookList || [];
        const list = bookList.map(normalizeSearchBook).filter(Boolean);

        return {
            list,
            page: toPage(page, 1),
            pagecount: pageProps.pages || 1,
            limit: 20,
            total: list.length
        };
    } catch (error) {
        logError("搜索失败", error);
        return { list: [], page: 1, pagecount: 1 };
    }
};

/**
 * 获取详情和剧集
 */
const getDetail = async (id) => {
    try {
        let pathId = id;
        if (!pathId.startsWith("/drama/")) {
            pathId = `/drama/${pathId}`;
        }

        const url = `${hemaConfig.siteUrl}${pathId}`;
        const html = await requestHtml(url);
        const json = parseNextData(html);
        if (!json) return null;

        const pageProps = json.props && json.props.pageProps ? json.props.pageProps : {};
        const bookInfo = pageProps.bookInfoVo || {};
        const chapterList = pageProps.chapterList || [];

        if (!bookInfo.bookId) return null;

        // 构建播放列表: 标题$播放地址
        const playList = [];
        const episodes = [];
        const dramaId = pathId.replace("/drama/", "");
        const lastChapter = chapterList.length ? chapterList[chapterList.length - 1] : null;
        const lastChapterId = lastChapter && lastChapter.chapterId ? lastChapter.chapterId : "";
        chapterList.forEach((chapter) => {
            const chapterId = chapter.chapterId;
            const chapterName = chapter.chapterName;

            // 尝试获取直链
            let videoUrl = null;
            if (chapter.chapterVideoVo) {
                const v = chapter.chapterVideoVo;
                if (v.mp4) videoUrl = v.mp4;
                else if (v.mp4720p) videoUrl = v.mp4720p;
                else if (v.vodMp4Url) videoUrl = v.vodMp4Url;
            }

            if (videoUrl && isDirectPlayable(videoUrl)) {
                playList.push(`${chapterName}$${videoUrl}`);
                episodes.push({ name: chapterName, playId: videoUrl });
            } else {
                // APP 播放接口需要剧目、目标章节和末章 ID。
                const fallbackId = `${dramaId}+${chapterId}+${lastChapterId || chapterId}`;
                playList.push(`${chapterName}$${fallbackId}`);
                episodes.push({ name: chapterName, playId: fallbackId });
            }
        });

        return {
            vod_id: pathId,
            vod_name: bookInfo.title || bookInfo.bookName,
            type_name: (bookInfo.categoryList || []).map((c) => c.name).join(","),
            vod_pic: bookInfo.coverWap,
            vod_area: bookInfo.countryName,
            vod_remarks: `${bookInfo.statusDesc || ""} ${bookInfo.totalChapterNum || ""}集`.trim(),
            vod_actor: (bookInfo.performerList || []).map((p) => p.name).join(", "),
            vod_content: bookInfo.introduction,
            vod_play_from: "河马剧场",
            vod_play_url: playList.join("#"),
            vod_play_sources: [
                {
                    name: "河马剧场",
                    episodes: episodes
                }
            ]
        };
    } catch (error) {
        logError("详情解析失败", error);
        return null;
    }
};

/**
 * 按章节 ID 请求 APP 播放接口。
 */
const getAppVideoUrl = async (bookId, chapterId, lastChapterId) => {
    const data = await requestAppApi("1139", {
        bookId,
        chapterIds: [chapterId],
        unClockType: "load",
        chapterId: lastChapterId || chapterId,
        resolutionRate: "720P"
    });
    const chapterInfoList = data && Array.isArray(data.chapterInfo) ? data.chapterInfo : [];
    const chapterInfo = chapterInfoList.find((item) => {
        return item && String(item.chapterId) === String(chapterId);
    }) || (chapterInfoList.length === 1 ? chapterInfoList[0] : null);

    if (!chapterInfo || !chapterInfo.content) return "";

    const content = chapterInfo.content;
    const candidates = Array.isArray(content.mp4SwitchUrl) ? content.mp4SwitchUrl.slice() : [];
    candidates.push(content.mp4, content.mp4720p, content.vodMp4Url, content.mp4Url);
    return candidates.find((url) => isDirectPlayable(url)) || "";
};

/**
 * 获取播放链接
 * - 直链直接返回
 * - 付费章节优先按 chapterId 请求 APP 接口
 * - APP 接口失败时仅解析网页中对应章节，禁止盲取页面首个 MP4
 */
const getPlayUrl = async (id) => {
    try {
        // 直链直接返回
        if (isDirectPlayable(id)) {
            return { parse: 0, urls: [{ name: "播放", url: id }], header: hemaConfig.headers };
        }

        // 兼容 dramaId+chapterId 和 dramaId+chapterId+lastChapterId
        const parts = id.split("+");
        if (parts.length < 2) {
            return { parse: 0, urls: [] };
        }

        const dramaId = parts[0];
        const chapterId = parts[1];
        const lastChapterId = parts[2] || chapterId;

        try {
            const appVideoUrl = await getAppVideoUrl(dramaId, chapterId, lastChapterId);
            if (appVideoUrl) {
                return {
                    parse: 0,
                    urls: [{ name: "播放", url: appVideoUrl }],
                    header: {
                        "User-Agent": "okhttp/4.10.0",
                        "Referer": appApiConfig.apiUrl
                    }
                };
            }
        } catch (error) {
            logError("APP 播放接口失败，回退网页解析", error);
        }

        const url = `${hemaConfig.siteUrl}/episode/${dramaId}/${chapterId}`;
        const html = await requestHtml(url);
        const json = parseNextData(html);
        if (json) {
            const pageProps = json.props && json.props.pageProps ? json.props.pageProps : {};
            // chapterInfo 没有明确章节 ID 时不能使用，避免拿到页面默认预览集。
            let chapterInfo = pageProps.chapterInfo &&
                String(pageProps.chapterInfo.chapterId) === String(chapterId)
                ? pageProps.chapterInfo
                : null;
            if (!chapterInfo && Array.isArray(pageProps.chapterList)) {
                chapterInfo = pageProps.chapterList.find((chapter) => {
                    return chapter && String(chapter.chapterId) === String(chapterId);
                }) || null;
            }

            const videoInfo = chapterInfo && chapterInfo.chapterVideoVo
                ? chapterInfo.chapterVideoVo
                : {};
            const videoUrl = videoInfo.mp4 || videoInfo.mp4720p || videoInfo.vodMp4Url;
            if (isDirectPlayable(videoUrl)) {
                return { parse: 0, urls: [{ name: "播放", url: videoUrl }], header: hemaConfig.headers };
            }
        }

        return { parse: 0, urls: [] };
    } catch (error) {
        logError("播放解析失败", error);
        return { parse: 0, urls: [] };
    }
};

// ========== 导出模块 ==========
module.exports = { home, category, search, detail, play };

const runner = require("spider_runner");
runner.run(module.exports);

});

_load(2, "短剧粉", function (module, exports, require) {
// @name 短剧粉
// @author 梦
// @description 页面解析：分类/详情/播放已接入；播放页直接解析 player_aaaa.url m3u8
// @dependencies cheerio
// @version 1.1.1
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/短剧/短剧粉.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const cheerio = require("cheerio");

const BASE_URL = "https://www.djfen.cc";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

const CLASS_LIST = [
  { type_id: "21", type_name: "现代都市" },
  { type_id: "2", type_name: "女频恋爱" },
  { type_id: "3", type_name: "反转爽剧" },
  { type_id: "5", type_name: "年代穿越" },
  { type_id: "4", type_name: "脑洞悬疑" },
  { type_id: "20", type_name: "古装仙侠" }
];

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

function getBodyText(res) {
  const body = res && typeof res === "object" && "body" in res ? res.body : res;
  if (Buffer.isBuffer(body) || body instanceof Uint8Array) return body.toString();
  return String(body || "");
}

function absUrl(url, base = BASE_URL) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  try {
    return new URL(value, /^https?:\/\//i.test(base) ? base : `${BASE_URL}/`).toString();
  } catch {
    if (value.startsWith("/")) return `${BASE_URL}${value}`;
    return `${BASE_URL}/${value.replace(/^\/+/, "")}`;
  }
}

function stripHtml(text) {
  return String(text || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function dedupeBy(list, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of list || []) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

async function fetchText(url, options = {}) {
  const res = await OmniBox.request(url, {
    method: options.method || "GET",
    headers: {
      "User-Agent": UA,
      Referer: options.referer || `${BASE_URL}/`,
      ...(options.headers || {})
    },
    timeout: options.timeout || 20000,
    body: options.body
  });

  if (!res || Number(res.statusCode) < 200 || Number(res.statusCode) >= 400) {
    throw new Error(`HTTP ${res?.statusCode || "unknown"} @ ${url}`);
  }

  return getBodyText(res);
}

function parseVodCards(html) {
  const $ = cheerio.load(html, { decodeEntities: false });
  const list = [];

  $(".pic-list .card a.pic-item[href*='/duanju/']").each((_, el) => {
    const $a = $(el);
    const href = $a.attr("href") || "";
    const vodId = (href.match(/\/duanju\/(\d+)\//i) || [])[1] || "";
    if (!vodId) return;

    const img = $a.find("img").first();
    const title = img.attr("alt") || stripHtml($a.closest(".card").find("h4 a").first().text()) || "";
    const pic = img.attr("data-original") || img.attr("data-src") || img.attr("src") || "";
    const score = stripHtml($a.closest(".card").find(".text-success").first().text());
    const metaText = stripHtml($a.closest(".card").find(".text-success").parent().text());
    const year = (metaText.match(/(20\d{2})/) || [])[1] || "";
    const status = stripHtml($a.find(".tips").first().text());
    const remarks = [year, status].filter(Boolean).join(" · ") || metaText;

    list.push({
      vod_id: vodId,
      vod_name: title,
      vod_pic: absUrl(pic),
      vod_year: year,
      vod_douban_score: score,
      vod_remarks: remarks
    });
  });

  return dedupeBy(list, (item) => item.vod_id);
}

function extractPageCount(html, currentPage = 1) {
  const pages = [...String(html || "").matchAll(/\/list\/\d+\/(\d+)\.html/gi)].map((m) => Number(m[1]));
  const maxPage = pages.length ? Math.max(...pages) : currentPage;
  return maxPage || currentPage;
}

async function home(params, context) {
  try {
    const html = await fetchText(`${BASE_URL}/`);
    const list = parseVodCards(html).slice(0, 40);
    await OmniBox.log("info", `[短剧粉][home] list=${list.length}`);
    return { class: CLASS_LIST, list };
  } catch (e) {
    await OmniBox.log("error", `[短剧粉][home] ${e.message}`);
    return { class: CLASS_LIST, list: [] };
  }
}

async function category(params, context) {
  try {
    const categoryId = String(params?.categoryId || "21").trim();
    const page = Math.max(1, Number(params?.page || 1) || 1);
    const path = page > 1 ? `/list/${categoryId}/${page}.html` : `/list/${categoryId}/`;
    const url = absUrl(path);
    const html = await fetchText(url);
    const list = parseVodCards(html);
    const pagecount = Math.max(page, extractPageCount(html, page));
    await OmniBox.log("info", `[短剧粉][category] category=${categoryId} page=${page} list=${list.length} pagecount=${pagecount}`);
    return { page, pagecount, total: list.length, list };
  } catch (e) {
    await OmniBox.log("error", `[短剧粉][category] ${e.message}`);
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }
}

async function detail(params, context) {
  try {
    const videoId = String(params?.videoId || "").trim();
    if (!videoId) return { list: [] };

    const detailUrl = /^https?:\/\//i.test(videoId) ? videoId : `${BASE_URL}/duanju/${videoId}/`;
    const html = await fetchText(detailUrl);
    const $ = cheerio.load(html, { decodeEntities: false });

    const vodName = stripHtml($("h1.fs-2").first().text()) || stripHtml($("title").first().text()).replace(/短剧免费观看.*$/, "").trim();
    const poster = $(".vod-pic img").first();
    const vodPic = absUrl(poster.attr("data-original") || poster.attr("src") || "");
    const remarks = stripHtml($(".vod-doc p:contains('状态')").first().text()).replace(/^状态[:：]?/, "").trim();
    const actor = stripHtml($(".vod-doc p:contains('主演')").first().text()).replace(/^主演[:：]?/, "").trim();
    const year = stripHtml($(".vod-detail-guild a[href*='/vod/show/year/']").first().text()) || (stripHtml($(".vod-doc p:contains('更新')").first().text()).match(/(20\d{2})/) || [])[1] || "";
    const score = stripHtml($(".text-success.fw-bold").first().text()) || "";
    const content = stripHtml($(".detail, .content, .vod-content, .introduce").first().text());

    const episodes = [];
    $("#myList a[href*='/play/']").each((_, el) => {
      const $a = $(el);
      const href = $a.attr("href") || "";
      const name = stripHtml($a.text()) || stripHtml($a.attr("title") || "");
      if (!href) return;
      episodes.push({
        name: name || `第${episodes.length + 1}集`,
        playId: absUrl(href, detailUrl)
      });
    });

    const vodPlaySources = episodes.length ? [{ name: "云播", episodes }] : [];
    await OmniBox.log("info", `[短剧粉][detail] videoId=${videoId} episodes=${episodes.length}`);

    return {
      list: [
        {
          vod_id: videoId,
          vod_name: vodName,
          vod_pic: vodPic,
          type_name: "短剧",
          vod_content: content,
          vod_actor: actor,
          vod_year: year,
          vod_douban_score: score,
          vod_remarks: [year, remarks].filter(Boolean).join(" · "),
          vod_play_sources: vodPlaySources
        }
      ]
    };
  } catch (e) {
    await OmniBox.log("error", `[短剧粉][detail] ${e.message}`);
    return { list: [] };
  }
}

async function search(params, context) {
  try {
    const keyword = String(params?.keyword || params?.wd || "").trim();
    const page = Math.max(1, Number(params?.page || 1) || 1);
    if (!keyword) return { page, pagecount: 0, total: 0, list: [] };

    // 站内搜索路径暂未确定，首版先做首页+分类首页聚合匹配。
    const pages = [`${BASE_URL}/`, ...CLASS_LIST.map((item) => `${BASE_URL}/list/${item.type_id}/`)];
    const all = [];
    for (const url of pages) {
      try {
        const html = await fetchText(url);
        all.push(...parseVodCards(html));
      } catch (err) {
        await OmniBox.log("warn", `[短剧粉][search] page.skip url=${url} message=${err.message}`);
      }
    }

    const merged = dedupeBy(all, (item) => item.vod_id);
    const key = keyword.toLowerCase();
    const list = merged.filter((item) => String(item.vod_name || "").toLowerCase().includes(key));
    await OmniBox.log("info", `[短剧粉][search] keyword=${keyword} totalScanned=${merged.length} list=${list.length}`);
    return { page, pagecount: 1, total: list.length, list };
  } catch (e) {
    await OmniBox.log("error", `[短剧粉][search] ${e.message}`);
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }
}

async function play(params, context) {
  try {
    const playId = String(params?.playId || "").trim();
    if (!playId) return { urls: [], parse: 0, header: {} };

    const html = await fetchText(playId, { referer: `${BASE_URL}/` });
    const match = String(html).match(/var\s+player_aaaa\s*=\s*(\{[\s\S]*?\})<\/script>/i);
    if (!match) {
      await OmniBox.log("warn", `[短剧粉][play] no player_aaaa playId=${playId}`);
      return { urls: [{ name: "播放页", url: playId }], parse: 1, header: { "User-Agent": UA, Referer: playId } };
    }

    let player = {};
    try {
      player = JSON.parse(match[1].replace(/\\\//g, '/'));
    } catch (err) {
      await OmniBox.log("error", `[短剧粉][play] player_aaaa parse error ${err.message}`);
    }

    const playUrl = String(player.url || '').trim();
    await OmniBox.log("info", `[短剧粉][play] playId=${playId} from=${player.from || ''} url=${playUrl}`);

    if (!/^https?:\/\//i.test(playUrl)) {
      return { urls: [{ name: "播放页", url: playId }], parse: 1, header: { "User-Agent": UA, Referer: playId } };
    }

    return {
      urls: [{ name: player.from || '默认线路', url: playUrl }],
      parse: 0,
      header: {
        "User-Agent": UA,
        Referer: playId
      }
    };
  } catch (e) {
    await OmniBox.log("error", `[短剧粉][play] ${e.message}`);
    return { urls: [], parse: 0, header: {} };
  }
}

});

_load(3, "短剧网", function (module, exports, require) {
// @name 短剧网
// @author https://github.com/hjdhnx/drpy-node/blob/main/spider/js/%E7%9F%AD%E5%89%A7%E7%BD%91%5B%E7%9B%98%5D.js
// @description 刮削：不支持，弹幕：不支持，嗅探：不支持（网盘直连）
// @dependencies: axios, cheerio
// @version 1.0.1
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/短剧/短剧网.js

/**
 * ============================================================================
 * 短剧网[盘] - OmniBox 爬虫脚本（新格式）
 * ============================================================================
 * 数据来源: https://sm3.cc
 * 核心能力:
 *   - 首页/分类列表
 *   - 搜索
 *   - 详情（提取网盘分享链接并展开视频文件）
 *   - 播放（调用 OmniBox 网盘直连能力）
 * 说明:
 *   - 本站主要提供网盘链接
 *   - 不走 push:// 推送，直接按网盘文件播放
 * ============================================================================
 */

const axios = require("axios");
const cheerio = require("cheerio");
const OmniBox = require("omnibox_sdk");

// ========== 全局配置 ==========
const siteConfig = {
    host: "https://sm3.cc",
    timeout: 12000,
    headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Referer": "https://sm3.cc/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
    },
    classes: [
        { type_id: "1", type_name: "短剧大全" },
        { type_id: "2", type_name: "更新短剧" }
    ]
};

const axiosInstance = axios.create({
    timeout: siteConfig.timeout,
    headers: siteConfig.headers,
    validateStatus: (status) => status >= 200 && status < 500
});

// ========== 日志工具 ==========
const logInfo = (message, data = null) => {
    if (data !== null && data !== undefined) {
        OmniBox.log("info", `[短剧网盘] ${message}: ${JSON.stringify(data)}`);
    } else {
        OmniBox.log("info", `[短剧网盘] ${message}`);
    }
};

const logError = (message, error) => {
    OmniBox.log("error", `[短剧网盘] ${message}: ${error?.message || error}`);
};

// ========== 工具函数 ==========

/**
 * 标准化 URL（补全相对路径）
 */
const fixUrl = (url) => {
    if (!url) return "";
    const u = String(url).trim();
    if (!u) return "";
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    if (u.startsWith("//")) return `https:${u}`;
    return u.startsWith("/") ? `${siteConfig.host}${u}` : `${siteConfig.host}/${u}`;
};

/**
 * 识别主流网盘分享链接
 */
const isPanUrl = (url) => {
    if (!url) return false;
    const u = String(url).toLowerCase();
    return u.includes("pan.baidu.com") || u.includes("quark.cn") || u.includes("pan.quark.cn") || u.includes("drive.uc.cn") || u.includes("aliyundrive.com") || u.includes("alipan.com") || u.includes("xunlei.com") || u.includes("cloud.189.cn") || u.includes("115.com") || u.includes("123pan.com");
};

/**
 * 去掉 push:// 或 push: 前缀，得到纯分享地址
 */
const normalizeShareUrl = (url) => {
    if (!url) return "";
    let value = String(url).trim();
    if (value.startsWith("push://")) value = value.slice("push://".length);
    if (value.startsWith("push:")) value = value.slice("push:".length);
    return value.trim();
};

/**
 * 请求 HTML 文本
 */
const requestHtml = async (url) => {
    try {
        const finalUrl = fixUrl(url);
        const res = await axiosInstance.get(finalUrl);
        if (res.status >= 400) {
            logInfo("请求返回异常状态码", { url: finalUrl, status: res.status });
        }
        return typeof res.data === "string" ? res.data : "";
    } catch (error) {
        logError(`请求失败: ${url}`, error);
        return "";
    }
};

/**
 * 提取条目列表（首页/分类/搜索共用）
 */
const parseCardList = ($) => {
    const list = [];
    const cards = $("li.col-6");

    cards.each((_, element) => {
        const $card = $(element);
        const $link = $card.find("h3.f-14 a");

        const href = fixUrl($link.attr("href") || "");
        const title = ($link.text() || "").trim() || ($link.attr("title") || "").trim();
        const titleAttr = ($link.attr("title") || "").trim();
        const image = fixUrl($card.find("img.lazy").attr("data-original") || "");

        if (!href || !title) return;

        const remarks = titleAttr
            ? titleAttr.replace(/^[^（]*（/, "").replace(/）$/, "")
            : "";

        list.push({
            vod_id: href,
            vod_name: title,
            vod_pic: image,
            vod_remarks: remarks,
            vod_content: ""
        });
    });

    return list;
};

/**
 * 从详情页提取网盘分享链接
 */
const parseShareUrls = ($) => {
    const urls = [];
    const seen = new Set();

    $(".content p a, .content a").each((_, link) => {
        const href = normalizeShareUrl($(link).attr("href") || "");
        if (!href || !isPanUrl(href)) return;
        if (seen.has(href)) return;
        seen.add(href);
        urls.push(href);
    });

    return urls;
};

/**
 * 判断是否视频文件
 */
const isVideoFile = (file) => {
    if (!file || !file.file_name) return false;
    const fileName = String(file.file_name).toLowerCase();
    const videoExt = [".mp4", ".mkv", ".avi", ".flv", ".mov", ".wmv", ".m3u8", ".ts", ".webm", ".m4v"];
    for (const ext of videoExt) {
        if (fileName.endsWith(ext)) return true;
    }
    if (file.format_type) {
        const formatType = String(file.format_type).toLowerCase();
        if (formatType.includes("video") || formatType.includes("mpeg") || formatType.includes("h264")) return true;
    }
    return false;
};

const getFileId = (file) => file?.fid || file?.file_id || "";
const getFileName = (file) => file?.file_name || file?.name || "";

/**
 * 递归获取分享中的全部视频文件
 */
const getAllVideoFiles = async (shareURL, files) => {
    const videos = [];
    for (const file of files || []) {
        if (file.file && isVideoFile(file)) {
            videos.push(file);
        } else if (file.dir) {
            const subFileId = getFileId(file);
            if (!subFileId) continue;
            try {
                const sub = await OmniBox.getDriveFileList(shareURL, subFileId);
                if (Array.isArray(sub?.files) && sub.files.length > 0) {
                    const subVideos = await getAllVideoFiles(shareURL, sub.files);
                    videos.push(...subVideos);
                }
            } catch (error) {
                logInfo("读取子目录失败", { shareURL, fileId: subFileId, error: error?.message || String(error) });
            }
        }
    }
    return videos;
};

const panShareCache = new Map();

/**
 * 加载网盘文件（带缓存）
 */
const loadPanFiles = async (shareURL) => {
    if (!shareURL) return null;
    if (panShareCache.has(shareURL)) return panShareCache.get(shareURL);

    try {
        const driveInfo = await OmniBox.getDriveInfoByShareURL(shareURL);
        const fileList = await OmniBox.getDriveFileList(shareURL, "0");
        const rootFiles = Array.isArray(fileList?.files) ? fileList.files : [];
        const videos = await getAllVideoFiles(shareURL, rootFiles);
        const data = { driveInfo, videos };
        panShareCache.set(shareURL, data);
        return data;
    } catch (error) {
        logError("读取网盘文件失败", error);
        return null;
    }
};

/**
 * 按网盘类型给播放源命名，重复类型自动编号
 */
const buildPanSourceNames = async (shareUrls) => {
    const rawNames = [];
    for (const shareURL of shareUrls) {
        try {
            const info = await OmniBox.getDriveInfoByShareURL(shareURL);
            rawNames.push(info?.displayName || "网盘");
        } catch {
            rawNames.push("网盘");
        }
    }

    const countMap = {};
    for (const name of rawNames) {
        countMap[name] = (countMap[name] || 0) + 1;
    }

    const indexMap = {};
    return rawNames.map((name) => {
        if ((countMap[name] || 0) <= 1) return name;
        indexMap[name] = (indexMap[name] || 0) + 1;
        return `${name}${indexMap[name]}`;
    });
};

// ========== 核心接口 ==========

/**
 * 首页
 * 返回固定分类 + 默认分类第一页列表
 */
async function home() {
    logInfo("进入首页");
    const list = await getCategoryList("1", 1);

    return {
        class: siteConfig.classes,
        list: list.list,
        page: 1,
        pagecount: list.pagecount
    };
}

/**
 * 分类
 */
async function category(params) {
    const categoryId = String(params?.categoryId || "1");
    const page = parseInt(params?.page, 10) || 1;
    logInfo("请求分类", { categoryId, page });
    return await getCategoryList(categoryId, page);
}

/**
 * 搜索
 */
async function search(params) {
    const keyword = (params?.keyword || params?.wd || "").trim();
    const page = parseInt(params?.page, 10) || 1;

    if (!keyword) {
        return { list: [], page: 1, pagecount: 0 };
    }

    logInfo("搜索关键词", { keyword, page });

    const url = `${siteConfig.host}/search.php?q=${encodeURIComponent(keyword)}&page=${page}`;
    const html = await requestHtml(url);
    if (!html) {
        return { list: [], page, pagecount: page };
    }

    const $ = cheerio.load(html);
    const list = parseCardList($);
    logInfo("搜索结果数量", list.length);

    return {
        list,
        page,
        pagecount: list.length > 0 ? page + 1 : page
    };
}

/**
 * 详情
 */
async function detail(params) {
    const videoId = params?.videoId || "";
    const url = fixUrl(videoId);

    if (!url) {
        return { list: [] };
    }

    logInfo("请求详情", { videoId: url });

    try {
        const html = await requestHtml(url);
        if (!html) return { list: [] };

        const $ = cheerio.load(html);
        const titleRaw = ($("title").text() || "").trim();
        const title = titleRaw.split("（")[0].trim() || titleRaw || "短剧";
        const pic = $(".tx-text img").attr("src");

        const shareUrls = parseShareUrls($);
        logInfo("提取网盘链接完成", { count: shareUrls.length, shareUrls });

        const sourceNames = await buildPanSourceNames(shareUrls);
        const playSources = [];

        for (let i = 0; i < shareUrls.length; i += 1) {
            const shareURL = shareUrls[i];
            const sourceName = sourceNames[i] || `网盘${i + 1}`;
            const panInfo = await loadPanFiles(shareURL);
            const files = panInfo?.videos || [];

            const episodes = [];
            if (files.length > 0) {
                for (const file of files) {
                    const fileId = getFileId(file);
                    if (!fileId) continue;
                    const fileName = getFileName(file) || `网盘资源${episodes.length + 1}`;
                    episodes.push({
                        name: fileName,
                        playId: `${shareURL}|${fileId}`
                    });
                }
            } else {
                episodes.push({
                    name: "网盘资源",
                    playId: shareURL
                });
            }

            if (episodes.length > 0) {
                playSources.push({
                    name: sourceName,
                    episodes
                });
            }
        }

        logInfo("详情解析完成", { title, sourceCount: playSources.length });

        const vod = {
            vod_id: videoId,
            vod_name: title,
            vod_pic: pic,
            vod_content: $(".tx-text h1").text() || "此规则为网盘直连模式，播放时直接调用 OmniBox 网盘能力。",
            vod_play_sources: playSources
        };

        return { list: [vod] };
    } catch (error) {
        logError("详情解析失败", error);
        return { list: [] };
    }
}

/**
 * 播放
 * 直接调用 OmniBox 网盘播放接口
 */
async function play(params) {
    const playId = (params?.playId || "").trim();
    const flag = params?.flag || "";

    if (!playId) {
        return { urls: [], parse: 0, header: {} };
    }

    try {
        // 标准网盘文件播放ID：shareURL|fileId
        if (playId.includes("|")) {
            const [rawShareURL, fileId] = playId.split("|");
            const shareURL = normalizeShareUrl(rawShareURL);
            if (shareURL && fileId) {
                const playInfo = await OmniBox.getDriveVideoPlayInfo(shareURL, fileId, flag || "");
                const urls = Array.isArray(playInfo?.url)
                    ? playInfo.url.map((item) => ({ name: item.name || "播放", url: item.url }))
                    : [];
                logInfo("网盘播放成功", { shareURL, fileId, lineCount: urls.length });
                return {
                    urls,
                    header: playInfo?.header || {},
                    parse: 0,
                    danmaku: playInfo?.danmaku || []
                };
            }
        }

        // 兜底：如果只有分享链接，尝试取首个视频文件播放
        const shareURL = normalizeShareUrl(playId);
        if (isPanUrl(shareURL)) {
            const panInfo = await loadPanFiles(shareURL);
            const files = panInfo?.videos || [];
            const firstFile = files[0];
            const fileId = getFileId(firstFile);

            if (fileId) {
                const playInfo = await OmniBox.getDriveVideoPlayInfo(shareURL, fileId, flag || "");
                const urls = Array.isArray(playInfo?.url)
                    ? playInfo.url.map((item) => ({ name: item.name || "播放", url: item.url }))
                    : [];
                logInfo("分享链接兜底播放成功", { shareURL, fileId, lineCount: urls.length });
                return {
                    urls,
                    header: playInfo?.header || {},
                    parse: 0,
                    danmaku: playInfo?.danmaku || []
                };
            }
        }

        logInfo("播放失败，未识别有效网盘播放ID", { playId });
        return { urls: [], parse: 1, header: {} };
    } catch (error) {
        logError("播放解析失败", error);
        return { urls: [], parse: 1, header: {} };
    }
}

// ========== 内部实现 ==========

/**
 * 分类列表抓取
 */
const getCategoryList = async (categoryId, page) => {
    try {
        const pg = parseInt(page, 10) || 1;
        const cid = String(categoryId || "1");
        const url = `${siteConfig.host}/?cate=${encodeURIComponent(cid)}&page=${pg}`;

        const html = await requestHtml(url);
        if (!html) {
            return { list: [], page: pg, pagecount: pg };
        }

        const $ = cheerio.load(html);
        const list = parseCardList($);

        logInfo("分类解析完成", { categoryId: cid, page: pg, count: list.length });

        return {
            list,
            page: pg,
            pagecount: list.length > 0 ? pg + 1 : pg
        };
    } catch (error) {
        logError("分类解析失败", error);
        return { list: [], page: 1, pagecount: 1 };
    }
};

module.exports = { home, category, search, detail, play };

const runner = require("spider_runner");
runner.run(module.exports);

});
