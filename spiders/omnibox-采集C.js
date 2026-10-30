// @name 影视采集C(合并5源)
// @version 3.20261030.1219
// @description 自动同步：采集聚合
// @downloadURL https://gh-proxy.com/https://raw.githubusercontent.com/Metruee/tv4me/main/spiders/omnibox-采集C.js
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


_load(0, "在线之家", function (module, exports, require) {
// @name 在线之家
// @author @PFR001, @lucky_TJQ
// @description 刮削：支持，弹幕：支持，嗅探：支持
// @dependencies: axios, cheerio
// @version 1.2.6
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/在线之家.js

/**
 * ============================================================================
 * 在线之家 (ZXZJ)
 * https://www.zxzjhd.com
 * 
 * 功能特性：
 * - 刮削：支持 (集成 TMDB 元数据)
 * - 弹幕：支持 (通过弹幕 API 匹配)
 * - 嗅探：支持 (智能视频地址提取)
 * ============================================================================
 */
const axios = require("axios");
const cheerio = require("cheerio");
const OmniBox = require("omnibox_sdk");

// ========== 全局配置 ==========
const host = 'https://www.zxzjhd.com';

// 弹幕 API 地址 (优先使用环境变量)
const DANMU_API = process.env.DANMU_API || "";

// 基础 Headers (用于列表页等普通请求)
const baseHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': host + '/',
    'Origin': host,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
};

const axiosInstance = axios.create({
    timeout: 15000,
    headers: baseHeaders,
    validateStatus: status => true
});

/**
 * 日志工具函数
 */
const logInfo = (message, data = null) => {
    const output = data ? `${message}: ${JSON.stringify(data)}` : message;
    OmniBox.log("info", `[ZXZJ-DEBUG] ${output}`);
};

const logError = (message, error) => {
    OmniBox.log("error", `[ZXZJ-DEBUG] ${message}: ${error.message || error}`);
};

/**
 * 修复 HTML 被 JSON 包裹的反爬响应
 */
const fixJsonWrappedHtml = (html) => {
    if (!html || typeof html !== "string") return html;
    const trimmed = html.trim();
    if (trimmed.startsWith("<") || trimmed.startsWith("<!DOCTYPE")) return trimmed;
    if (trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
        try {
            const parsed = JSON.parse(trimmed);
            if (typeof parsed === "string" && parsed.trim().startsWith("<")) {
                return parsed.trim();
            }
        } catch { }
    }
    return trimmed;
};

/**
 * 元数据编解码 (用于透传参数)
 */
const encodeMeta = (obj) => {
    try {
        return Buffer.from(JSON.stringify(obj || {}), "utf8").toString("base64");
    } catch {
        return "";
    }
};

const decodeMeta = (str) => {
    try {
        const raw = Buffer.from(str || "", "base64").toString("utf8");
        return JSON.parse(raw || "{}");
    } catch {
        return {};
    }
};

/**
 * 标准化 URL
 */
const fixUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return 'https:' + url;
    return url.startsWith('/') ? `${host}${url}` : `${host}/${url}`;
};

/**
 * 处理图片 URL，如果是外部 URL 则通过代理
 * @param {string} imageUrl - 原始图片 URL
 * @param {string} baseURL - 代理服务器基础 URL
 * @param {string} referer - 图片来源的 Referer (默认取 imageUrl 的域名)
 * @returns {string} 处理后的图片 URL
 */
const processImageUrl = (imageUrl, baseURL = "", referer = "") => {
    if (!imageUrl) return '';

    // 标准化 URL
    let url = fixUrl(imageUrl);

    // 检查是否是外部 URL（不是当前 host 的 URL）
    const isExternalUrl = !url.includes(host) && url.startsWith('http');

    // 如果是外部 URL 且有 baseURL，则通过代理
    if (isExternalUrl && baseURL) {
        try {
            // 如果没有指定 referer，从 imageUrl 的域名提取
            let finalReferer = referer;
            if (!finalReferer) {
                try {
                    const urlObj = new URL(url);
                    finalReferer = `${urlObj.protocol}//${urlObj.host}`;
                } catch (e) {
                    finalReferer = host;
                }
            }

            // 构建带 headers 的 URL 格式: url@Referer=value
            const urlWithHeaders = `${url}@Referer=${finalReferer}`;
            // 编码 URL 参数
            const encodedUrl = encodeURIComponent(urlWithHeaders);
            // 返回代理 URL
            return `${baseURL}/api/proxy/image?url=${encodedUrl}`;
        } catch (error) {
            logError("处理图片 URL 失败", error);
            return url;
        }
    }

    return url;
};

/**
 * 统一请求 HTML
 */
const requestHtml = async (url, options = {}) => {
    try {
        const res = await axiosInstance.get(url, {
            headers: {
                ...baseHeaders,
                ...(options.headers || {})
            },
            responseType: "text",
            ...options
        });
        return fixJsonWrappedHtml(res.data);
    } catch (e) {
        logError("请求失败", e);
        return "";
    }
};

// ========== 解密算法 ==========
const DecryptTools = {
    decrypt: function (encryptedData) {
        try {
            // 1. 翻转字符串
            const reversed = encryptedData.split('').reverse().join('');
            // 2. Hex 转 String
            let hexDecoded = '';
            for (let i = 0; i < reversed.length; i += 2) {
                hexDecoded += String.fromCharCode(parseInt(reversed.substr(i, 2), 16));
            }
            // 3. 移除中间混淆字符 (7位)
            const len = hexDecoded.length;
            const splitLen = Math.floor((len - 7) / 2);
            return hexDecoded.substring(0, splitLen) + hexDecoded.substring(splitLen + 7);
        } catch (e) {
            logError("解密失败", e);
            return null;
        }
    }
};

/**
 * 判断网盘线路名称
 */
const isPanLineName = (name) => {
    if (!name) return false;
    const n = String(name);
    return n.includes("网盘") || n.includes("百度") || n.includes("夸克") || n.includes("UC") || n.includes("阿里") || n.includes("迅雷") || n.includes("天翼") || n.includes("115") || n.includes("123");
};

/**
 * 判断是否为网盘分享链接
 */
const isPanUrl = (url) => {
    if (!url) return false;
    const u = url.toLowerCase();
    return u.includes("pan.baidu.com") || u.includes("quark.cn") || u.includes("pan.quark.cn") || u.includes("drive.uc.cn") || u.includes("aliyundrive.com") || u.includes("alipan.com") || u.includes("xunlei.com") || u.includes("cloud.189.cn") || u.includes("115.com") || u.includes("123pan.com");
};

const normalizeShareUrl = (url) => {
    if (!url) return "";
    let u = String(url).trim();
    if (u.startsWith("push://")) {
        u = u.slice("push://".length);
    }
    if (u.startsWith("push:")) {
        u = u.slice("push:".length);
    }
    return u.trim();
};

/**
 * 从播放页提取网盘链接
 */
const extractPanUrlFromPage = async (playPageUrl) => {
    const html = await requestHtml(playPageUrl, {});
    if (!html) return "";

    const playerMatch = html.match(/var\s+player_aaaa\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/i);
    if (!playerMatch) return "";

    try {
        const cleanStr = playerMatch[1]
            .replace(/\\"/g, "\u0001")
            .replace(/\"/g, "\"")
            .replace(/\u0001/g, "\"")
            .replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => String.fromCharCode(parseInt(grp, 16)))
            .replace(/\\\//g, "/");

        const playerData = JSON.parse(cleanStr);
        return playerData.url || "";
    } catch (e) {
        logInfo(`解析 player_aaaa 失败: ${e.message}`);
        return "";
    }
};

/**
 * 判断是否为视频文件
 */
const isVideoFile = (file) => {
    if (!file || !file.file_name) return false;
    const fileName = String(file.file_name).toLowerCase();
    const videoExtensions = [".mp4", ".mkv", ".avi", ".flv", ".mov", ".wmv", ".m3u8", ".ts", ".webm", ".m4v"];
    for (const ext of videoExtensions) {
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
 * 递归获取所有视频文件
 */
const getAllVideoFiles = async (shareURL, files) => {
    const videoFiles = [];
    for (const file of files || []) {
        if (file.file && isVideoFile(file)) {
            videoFiles.push(file);
        } else if (file.dir) {
            try {
                const subFileId = getFileId(file);
                if (!subFileId) continue;
                const subFileList = await OmniBox.getDriveFileList(shareURL, subFileId);
                if (subFileList && Array.isArray(subFileList.files)) {
                    const subVideoFiles = await getAllVideoFiles(shareURL, subFileList.files);
                    videoFiles.push(...subVideoFiles);
                }
            } catch (error) {
                logInfo(`获取子目录文件失败: ${error.message}`);
            }
        }
    }
    return videoFiles;
};

/**
 * 获取网盘分享的文件列表（带缓存）
 */
const panShareCache = new Map();

const loadPanFiles = async (shareURL) => {
    if (!shareURL) return null;
    if (panShareCache.has(shareURL)) return panShareCache.get(shareURL);
    try {
        const driveInfo = await OmniBox.getDriveInfoByShareURL(shareURL);
        const fileList = await OmniBox.getDriveFileList(shareURL, "0");
        const files = Array.isArray(fileList?.files) ? fileList.files : [];
        const videos = await getAllVideoFiles(shareURL, files);
        const result = { driveInfo, videos };
        panShareCache.set(shareURL, result);
        return result;
    } catch (error) {
        logInfo(`读取网盘文件失败: ${error.message}`);
        return null;
    }
};

/**
 * 嗅探播放页，兜底提取真实视频地址
 */
const sniffZxzjPlay = async (playUrl) => {
    if (!playUrl) return null;
    try {
        logInfo("尝试嗅探播放页", playUrl);
        const sniffed = await OmniBox.sniffVideo(playUrl);
        if (sniffed && sniffed.url) {
            logInfo("嗅探成功", sniffed.url);
            return {
                urls: [{ name: "嗅探线路", url: sniffed.url }],
                parse: 0,
                header: sniffed.header || baseHeaders
            };
        }
    } catch (error) {
        logInfo(`嗅探失败: ${error.message}`);
    }
    return null;
};

/**
 * 从标题中提取集数
 */
function extractEpisode(title) {
    if (!title) return "";

    const processedTitle = title.trim();

    // 1. S01E03 格式
    const seMatch = processedTitle.match(/[Ss](?:\d{1,2})?[-._\s]*[Ee](\d{1,3})/i);
    if (seMatch) return seMatch[1];

    // 2. 中文格式：第XX集/话
    const cnMatch = processedTitle.match(/第\s*([0-9]+)\s*[集话章节回期]/);
    if (cnMatch) return cnMatch[1];

    // 3. EP/E 格式
    const epMatch = processedTitle.match(/\b(?:EP|E)[-._\s]*(\d{1,3})\b/i);
    if (epMatch) return epMatch[1];

    // 4. 括号格式 [03]
    const bracketMatch = processedTitle.match(/[\[\(【（](\d{1,3})[\]\)】）]/);
    if (bracketMatch) {
        const num = bracketMatch[1];
        if (!["720", "1080", "480"].includes(num)) return num;
    }

    return "";
}

/**
 * 构建用于弹幕匹配的文件名
 */
function buildFileNameForDanmu(vodName, episodeTitle) {
    if (!vodName) return "";

    // 如果没有集数信息，直接返回视频名（电影）
    if (!episodeTitle || episodeTitle === '正片' || episodeTitle === '播放') {
        return vodName;
    }

    // 提取集数
    const digits = extractEpisode(episodeTitle);
    if (digits) {
        const epNum = parseInt(digits, 10);
        if (epNum > 0) {
            // 构建标准格式：视频名 S01E01
            if (epNum < 10) {
                return `${vodName} S01E0${epNum}`;
            } else {
                return `${vodName} S01E${epNum}`;
            }
        }
    }

    // 无法提取集数，返回视频名
    return vodName;
}

const buildScrapedEpisodeName = (scrapeData, mapping, originalName) => {
    if (!mapping || mapping.episodeNumber === 0 || (mapping.confidence && mapping.confidence < 0.5)) {
        return originalName;
    }
    if (mapping.episodeName) {
        const epName = mapping.episodeNumber + "." + mapping.episodeName;
        return epName;
    }
    if (scrapeData && Array.isArray(scrapeData.episodes)) {
        const hit = scrapeData.episodes.find(
            (ep) => ep.episodeNumber === mapping.episodeNumber && ep.seasonNumber === mapping.seasonNumber
        );
        if (hit?.name) {
            return `${hit.episodeNumber}.${hit.name}`;
        }
    }
    return originalName;
};

const buildScrapedDanmuFileName = (scrapeData, scrapeType, mapping, fallbackVodName, fallbackEpisodeName) => {
    if (!scrapeData) {
        return buildFileNameForDanmu(fallbackVodName, fallbackEpisodeName);
    }
    if (scrapeType === "movie") {
        return scrapeData.title || fallbackVodName;
    }
    const title = scrapeData.title || fallbackVodName;
    const seasonAirYear = scrapeData.seasonAirYear || "";
    const seasonNumber = mapping?.seasonNumber || 1;
    const episodeNumber = mapping?.episodeNumber || 1;
    return `${title}.${seasonAirYear}.S${String(seasonNumber).padStart(2, "0")}E${String(episodeNumber).padStart(2, "0")}`;
};

/**
 * 匹配弹幕
 */
async function matchDanmu(fileName) {
    if (!DANMU_API || !fileName) {
        return [];
    }

    try {
        logInfo(`匹配弹幕: ${fileName}`);

        const matchUrl = `${DANMU_API}/api/v2/match`;
        const response = await OmniBox.request(matchUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            body: JSON.stringify({ fileName: fileName }),
        });

        if (response.statusCode !== 200) {
            logInfo(`弹幕匹配失败: HTTP ${response.statusCode}`);
            return [];
        }

        const matchData = JSON.parse(response.body);

        // 检查是否匹配成功
        if (!matchData.isMatched) {
            logInfo("弹幕未匹配到");
            return [];
        }

        // 获取matches数组
        const matches = matchData.matches || [];
        if (matches.length === 0) {
            return [];
        }

        // 取第一个匹配项
        const firstMatch = matches[0];
        const episodeId = firstMatch.episodeId;
        const animeTitle = firstMatch.animeTitle || "";
        const episodeTitle = firstMatch.episodeTitle || "";

        if (!episodeId) {
            return [];
        }

        // 构建弹幕名称
        let danmakuName = "弹幕";
        if (animeTitle && episodeTitle) {
            danmakuName = `${animeTitle} - ${episodeTitle}`;
        } else if (animeTitle) {
            danmakuName = animeTitle;
        } else if (episodeTitle) {
            danmakuName = episodeTitle;
        }

        // 构建弹幕URL
        const danmakuURL = `${DANMU_API}/api/v2/comment/${episodeId}?format=xml`;

        logInfo(`弹幕匹配成功: ${danmakuName}`);

        return [
            {
                name: danmakuName,
                url: danmakuURL,
            },
        ];
    } catch (error) {
        logInfo(`弹幕匹配失败: ${error.message}`);
        return [];
    }
}

// ========== 列表解析逻辑 ==========
/**
 * 解析视频列表
 * @param {Object} $ - cheerio 实例
 * @param {string} baseURL - 代理服务器基础 URL
 * @returns {Array} 视频列表
 */
const parseVideoList = ($, baseURL = "") => {
    const list = [];
    const items = $('.stui-vodlist__item, .stui-vodlist li, .v-item, .public-list-box');
    items.each((_, element) => {
        const $item = $(element);
        const $link = $item.find('a.stui-vodlist__thumb, a.v-thumb, a.public-list-exp');
        if ($link.length === 0) return;

        const title = $link.attr('title') || $item.find('.title a').text().trim();
        const href = $link.attr('href');
        let pic = $link.attr('data-original') || $link.attr('data-src') || $link.attr('src');

        // 处理背景图样式
        if (!pic) {
            const style = $link.attr('style') || '';
            const match = style.match(/url\((['"]?)(.*?)\1\)/);
            if (match) pic = match[2];
        }

        const remarks = $item.find('.pic-text, .v-remarks, .public-list-prb').text().trim();

        if (title && href) {
            list.push({
                vod_id: href,
                vod_name: title,
                vod_pic: processImageUrl(pic, baseURL),
                vod_remarks: remarks || ''
            });
        }
    });
    return list;
};

// ========== 分类与筛选配置 ==========
const CLASS_LIST = [
    { type_id: '1', type_name: '电影' },
    { type_id: '2', type_name: '美剧' },
    { type_id: '3', type_name: '韩剧' },
    { type_id: '4', type_name: '日剧' },
    { type_id: '5', type_name: '泰剧' },
    { type_id: '6', type_name: '动漫' }
];

const buildFilterOptions = (values = [], allName = "全部") => [
    { name: allName, value: "" },
    ...values.filter(Boolean).map((item) => ({ name: item, value: item }))
];

const buildYearOptions = () => {
    const currentYear = Math.max(new Date().getFullYear(), 2026);
    const years = [];
    for (let year = currentYear; year >= 2000; year--) {
        years.push(String(year));
    }
    return buildFilterOptions(years);
};

const buildFilterList = ({ classes = [], areas = [], includeClass = true, includeArea = true } = {}) => {
    const list = [];
    if (includeClass && classes.length > 0) {
        list.push({ key: "class", name: "按剧情", init: "", value: buildFilterOptions(classes) });
    }
    if (includeArea && areas.length > 0) {
        list.push({ key: "area", name: "按地区", init: "", value: buildFilterOptions(areas) });
    }
    list.push({ key: "year", name: "按年份", init: "", value: buildYearOptions() });
    return list;
};

const DRAMA_CLASSES = ["剧情", "喜剧", "爱情", "动作", "悬疑", "恐怖", "奇幻", "惊悚", "犯罪", "科幻", "音乐", "其他"];

const FILTERS = {
    "1": buildFilterList({
        classes: ["喜剧", "爱情", "恐怖", "动作", "科幻", "剧情", "战争", "警匪", "犯罪", "动画", "奇幻", "冒险", "悬疑", "惊悚", "青春", "情色"],
        areas: ["大陆", "香港", "台湾", "欧美", "韩国", "日本", "泰国", "印度", "俄罗斯", "其他"]
    }),
    "2": buildFilterList({ classes: DRAMA_CLASSES, areas: ["欧美"] }),
    "3": buildFilterList({ classes: DRAMA_CLASSES, areas: ["韩国"] }),
    "4": buildFilterList({ classes: DRAMA_CLASSES, areas: ["日本"] }),
    "5": buildFilterList({ includeClass: false, includeArea: false }),
    "6": buildFilterList({
        classes: ["情感", "科幻", "热血", "推理", "搞笑", "冒险", "萝莉", "校园", "动作", "机战", "运动", "战争", "少年", "少女", "社会", "原创", "亲子", "益智", "励志", "其他"],
        areas: ["国产", "日本", "欧美", "其他"]
    })
};

const parseFilters = (filters) => {
    if (!filters) return {};
    if (typeof filters === "object") return filters;
    if (typeof filters === "string") {
        try {
            const parsed = JSON.parse(filters);
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch {
            return {};
        }
    }
    return {};
};

const normalizeFilters = (...sources) => Object.assign({}, ...sources.map(parseFilters));

const getFilterValue = (filters, keys = []) => {
    for (const key of keys) {
        const value = filters?.[key];
        if (value !== undefined && value !== null && String(value).trim() !== "") {
            return String(value).trim();
        }
    }
    return "";
};

const encodeVodshowPart = (value) => encodeURIComponent(String(value || "").trim());

const buildCategoryUrl = (categoryId, page, filters = {}) => {
    const tid = encodeVodshowPart(categoryId || "1");
    const area = encodeVodshowPart(getFilterValue(filters, ["area"]));
    const by = encodeVodshowPart(getFilterValue(filters, ["by", "sort"]));
    const genre = encodeVodshowPart(getFilterValue(filters, ["class", "type", "genre"]));
    const year = encodeVodshowPart(getFilterValue(filters, ["year"]));
    const pg = Math.max(1, parseInt(page) || 1);
    return `${host}/vodshow/${tid}-${area}-${by}-${genre}-----${pg}---${year}.html`;
};

// ========== 核心功能函数 ==========

/**
 * 首页
 */
async function home(params, context) {
    logInfo("进入首页");

    const baseURL = context?.baseURL || "";
    const url = `${host}`;
    const html = await requestHtml(url);
    const $ = cheerio.load(html || "");
    const list = parseVideoList($, baseURL);

    logInfo(`获取到 ${list.length} 个视频`);
    return {
        list: list,
        class: CLASS_LIST,
        filters: FILTERS
    };
}

/**
 * 分类
 */
async function category(params, context) {
    const categoryId = String(params.categoryId || params.type_id || "1");
    const filters = normalizeFilters(params.extend, params.ext, params.filter, params.filters);
    const { page } = params;
    const pg = parseInt(page) || 1;
    const baseURL = context?.baseURL || "";
    logInfo(`请求分类: ${categoryId}, 页码: ${pg}, 筛选: ${JSON.stringify(filters)}`);

    try {
        const url = buildCategoryUrl(categoryId, pg, filters);
        const html = await requestHtml(url);
        const $ = cheerio.load(html || "");
        const list = parseVideoList($, baseURL);

        logInfo(`获取到 ${list.length} 个视频`);
        return { list: list, page: pg, pagecount: list.length >= 12 ? pg + 1 : pg, filters: FILTERS[categoryId] || [] };
    } catch (e) {
        logError("分类请求失败", e);
        return { list: [], page: pg, pagecount: 0, filters: FILTERS[categoryId] || [] };
    }
}

/**
 * 搜索
 */
async function search(params, context) {
    const wd = params.keyword || params.wd || "";
    const pg = parseInt(params.page) || 1;
    const baseURL = context?.baseURL || "";
    logInfo(`搜索关键词: ${wd}, 页码: ${pg}`);

    try {
        const url = `${host}/vodsearch/${encodeURIComponent(wd)}----------${pg}---.html`;
        const html = await requestHtml(url);
        const $ = cheerio.load(html || "");
        const list = parseVideoList($, baseURL);

        logInfo(`搜索到 ${list.length} 个结果`);
        return { list: list, page: pg, pagecount: list.length >= 20 ? pg + 1 : pg };
    } catch (e) {
        logError("搜索失败", e);
        return { list: [], page: pg, pagecount: 0 };
    }
}

/**
 * 详情
 */
async function detail(params, context) {
    const videoId = params.videoId;
    const url = fixUrl(videoId);
    const baseURL = context?.baseURL || "";
    logInfo(`请求详情 ID: ${videoId}`);

    try {
        const html = await requestHtml(url);
        const $ = cheerio.load(html);

        // 兼容多种详情页布局
        const title = $('h1.title').text().trim() || $('.stui-content__detail .title').text().trim() || $('title').text().split('-')[0].trim();
        let pic = $('.stui-content__thumb img').attr('data-original') || $('.stui-content__thumb img').attr('src') || '';
        const desc = $('.stui-content__detail .desc').text().trim() || $('meta[name="description"]').attr('content') || '';

        // 处理图片 URL
        pic = processImageUrl(pic, baseURL);

        const playSources = [];
        const $playlists = $(".stui-content__playlist, .stui-pannel__data ul, .playlist");

        const playlistTasks = [];
        const playlistResults = [];

        $playlists.each((index, listElem) => {
            let sourceName = "默认线路";
            const $prevHead = $(listElem).prev(".stui-vodlist__head, .stui-pannel__head");
            if ($prevHead.length > 0) {
                sourceName = $prevHead.find("h3").text().trim() || sourceName;
            }

            const isPanLine = isPanLineName(sourceName);
            const $links = $(listElem).find("li a");

            playlistTasks.push(
                (async () => {
                    const episodes = [];

                    if (isPanLine) {
                        const panTasks = [];
                        $links.each((idx, a) => {
                            const $a = $(a);
                            const episodeName = $a.text().trim() || `第${idx + 1}集`;
                            const href = $a.attr("href") || "";
                            const playPageUrl = fixUrl(href);
                            panTasks.push(
                                (async () => {
                                    const panUrl = await extractPanUrlFromPage(playPageUrl);
                                    if (!panUrl) return null;

                                    const shareURL = normalizeShareUrl(panUrl);
                                    if (!isPanUrl(shareURL)) {
                                        return null;
                                    }

                                    const panInfo = await loadPanFiles(shareURL);
                                    const files = panInfo?.videos || [];

                                    if (!files.length) {
                                        const pushUrl = shareURL.startsWith("push://") ? shareURL : `push://${shareURL}`;
                                        const fid = `${videoId}#pan#${idx}`;
                                        const combinedId = `${pushUrl}|||${encodeMeta({ sid: String(videoId || ""), fid, v: title || "", e: episodeName })}`;
                                        return [{
                                            name: episodeName,
                                            playId: combinedId,
                                            _fid: fid,
                                            _rawName: episodeName
                                        }];
                                    }

                                    const seriesEpisodes = [];
                                    for (const file of files) {
                                        const fileId = getFileId(file);
                                        if (!fileId) continue;
                                        const fileName = getFileName(file) || episodeName;
                                        const filePlayId = `${shareURL}|${fileId}`;
                                        const fid = `${videoId}#pan#${fileId}`;
                                        const combinedId = `${filePlayId}|||${encodeMeta({ sid: String(videoId || ""), fid, v: title || "", e: fileName })}`;
                                        seriesEpisodes.push({
                                            name: fileName,
                                            playId: combinedId,
                                            _fid: fid,
                                            _rawName: fileName
                                        });
                                    }

                                    return seriesEpisodes.length ? seriesEpisodes : null;
                                })()
                            );
                        });

                        const panEpisodes = await Promise.all(panTasks);
                        panEpisodes.filter(Boolean).forEach((batch) => {
                            if (Array.isArray(batch)) {
                                batch.forEach((ep) => episodes.push(ep));
                            } else if (batch) {
                                episodes.push(batch);
                            }
                        });
                    } else {
                        $links.each((idx, a) => {
                            const $a = $(a);
                            const episodeName = $a.text().trim() || `第${idx + 1}集`;
                            const playId = $a.attr("href") || "";
                            const fid = `${videoId}#0#${episodes.length}`;
                            const combinedId = `${playId}|||${encodeMeta({ sid: String(videoId || ""), fid, v: title || "", e: episodeName })}`;
                            episodes.push({
                                name: episodeName,
                                playId: combinedId,
                                _fid: fid,
                                _rawName: episodeName
                            });
                        });
                    }

                    if (episodes.length > 0) {
                        playlistResults[index] = { name: sourceName, episodes: episodes };
                    }
                })()
            );
        });

        if (playlistTasks.length > 0) {
            await Promise.all(playlistTasks);
            for (const item of playlistResults) {
                if (item && item.episodes && item.episodes.length > 0) {
                    playSources.push(item);
                }
            }
        }

        logInfo(`视频标题: ${title}, 播放链接数: ${playSources.length}`);

        // 准备刮削候选项
        const scrapeCandidates = [];
        for (const source of playSources) {
            for (const ep of source.episodes || []) {
                if (!ep._fid) continue;
                scrapeCandidates.push({
                    fid: ep._fid,
                    file_id: ep._fid,
                    file_name: ep._rawName || ep.name || "正片",
                    name: ep._rawName || ep.name || "正片",
                    format_type: "video",
                });
            }
        }

        let scrapeData = null;
        let videoMappings = [];
        let scrapeType = "";

        // 执行刮削
        if (scrapeCandidates.length > 0) {
            try {
                const videoIdForScrape = String(videoId || "");
                const scrapingResult = await OmniBox.processScraping(videoIdForScrape, title || "", title || "", scrapeCandidates);
                logInfo(`刮削处理完成`, { resultLength: JSON.stringify(scrapingResult || {}).length });

                const metadata = await OmniBox.getScrapeMetadata(videoIdForScrape);
                scrapeData = metadata?.scrapeData || null;
                videoMappings = metadata?.videoMappings || [];
                scrapeType = metadata?.scrapeType || "";
                logInfo("刮削元数据读取完成", { hasScrapeData: !!scrapeData, mappingCount: videoMappings.length, scrapeType });
            } catch (error) {
                logError("刮削处理失败", error);
            }
        }

        // 应用刮削结果
        for (const source of playSources) {
            for (const ep of source.episodes || []) {
                const mapping = videoMappings.find((m) => m?.fileId === ep._fid);
                if (!mapping) continue;
                const oldName = ep.name;
                const newName = buildScrapedEpisodeName(scrapeData, mapping, oldName);
                if (newName && newName !== oldName) {
                    ep.name = newName;
                    logInfo(`应用刮削后源文件名: ${oldName} -> ${newName}`);
                }
                ep._seasonNumber = mapping.seasonNumber;
                ep._episodeNumber = mapping.episodeNumber;
            }

            const hasEpisodeNumber = (source.episodes || []).some(
                (ep) => ep._episodeNumber !== undefined && ep._episodeNumber !== null
            );
            if (hasEpisodeNumber) {
                source.episodes.sort((a, b) => {
                    const seasonA = a._seasonNumber || 0;
                    const seasonB = b._seasonNumber || 0;
                    if (seasonA !== seasonB) return seasonA - seasonB;
                    const episodeA = a._episodeNumber || 0;
                    const episodeB = b._episodeNumber || 0;
                    return episodeA - episodeB;
                });
            }
        }

        const vod = {
            vod_id: videoId,
            vod_name: title,
            vod_pic: pic,
            vod_content: desc,
            vod_play_sources: playSources.map((source) => ({
                name: source.name,
                episodes: (source.episodes || []).map((ep) => ({
                    name: ep.name,
                    playId: ep.playId,
                })),
            }))
        };

        // 应用刮削元数据
        if (scrapeData) {
            vod.vod_name = scrapeData.title || vod.vod_name;
            if (scrapeData.posterPath) {
                // 处理 TMDB 图片 URL (referer 自动从 URL 域名提取)
                vod.vod_pic = processImageUrl(`https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`, baseURL);
            }
            if (scrapeData.overview) {
                vod.vod_content = scrapeData.overview;
            }
            if (scrapeData.releaseDate) {
                vod.vod_year = String(scrapeData.releaseDate).substring(0, 4) || "";
            }
            const actors = (scrapeData.credits?.cast || []).slice(0, 5).map((c) => c?.name).filter(Boolean).join(",");
            if (actors) {
                vod.vod_actor = actors;
            }
            const directors = (scrapeData.credits?.crew || [])
                .filter((c) => c?.job === "Director" || c?.department === "Directing")
                .slice(0, 3)
                .map((c) => c?.name)
                .filter(Boolean)
                .join(",");
            if (directors) {
                vod.vod_director = directors;
            }
        }

        return {
            list: [vod]
        };
    } catch (e) {
        logError("详情获取失败", e);
        return { list: [] };
    }
}

// ========== 播放解析 (核心) ==========
/**
 * 播放解析
 * 支持：直接解密、嗅探、弹幕匹配
 */
async function play(params) {
    let playId = params.playId;
    const flag = params.flag || "";
    logInfo(`准备播放 ID: ${playId}, flag: ${flag}`);

    let vodName = "";
    let episodeName = "";
    let playMeta = {};

    // 解析透传参数
    if (playId && playId.includes("|||")) {
        const [mainPlayId, metaB64] = playId.split("|||");
        playId = mainPlayId;
        playMeta = decodeMeta(metaB64 || "");
        vodName = playMeta.v || "";
        episodeName = playMeta.e || "";
        logInfo(`解析透传信息 - 视频: ${vodName}, 集数: ${episodeName}`);
    }

    let scrapedDanmuFileName = "";
    let scrapeType = "";
    try {
        const videoIdFromParam = params.vodId ? String(params.vodId) : "";
        const videoIdFromMeta = playMeta?.sid ? String(playMeta.sid) : "";
        const videoIdForScrape = videoIdFromParam || videoIdFromMeta;

        if (videoIdForScrape) {
            const metadata = await OmniBox.getScrapeMetadata(videoIdForScrape);
            if (metadata && metadata.scrapeData) {
                const mapping = (metadata.videoMappings || []).find((m) => m?.fileId === playMeta?.fid);
                scrapeType = metadata.scrapeType || "";
                scrapedDanmuFileName = buildScrapedDanmuFileName(
                    metadata.scrapeData,
                    scrapeType,
                    mapping,
                    vodName,
                    episodeName
                );
                if (metadata.scrapeData.title) {
                    vodName = metadata.scrapeData.title;
                }
                if (mapping?.episodeName) {
                    episodeName = mapping.episodeName;
                }
            }
        }
    } catch (error) {
        logInfo(`读取刮削元数据失败: ${error.message}`);
    }

    try {
        if (playId && playId.includes("|")) {
            const [rawShareURL, fileId] = playId.split("|");
            const shareURL = normalizeShareUrl(rawShareURL);
            if (shareURL && fileId) {
                try {
                    const playInfo = await OmniBox.getDriveVideoPlayInfo(shareURL, fileId, flag || "");
                    const urlList = Array.isArray(playInfo?.url) ? playInfo.url : [];
                    const urlsResult = urlList.map((item) => ({
                        name: item.name || "播放",
                        url: item.url
                    }));
                    return {
                        urls: urlsResult,
                        header: playInfo?.header || {},
                        parse: 0,
                        danmaku: playInfo?.danmaku || []
                    };
                } catch (error) {
                    logInfo(`网盘播放失败: ${error.message}`);
                }
            }
        }

        if (playId && playId.startsWith("push://")) {
            return {
                urls: [{ name: "网盘资源", url: playId }],
                parse: 0,
                header: {}
            };
        }

        if (isPanUrl(playId)) {
            const shareURL = normalizeShareUrl(playId);
            const pushUrl = shareURL.startsWith("push://") ? shareURL : `push://${shareURL}`;
            return {
                urls: [{ name: "网盘资源", url: pushUrl }],
                parse: 0,
                header: {}
            };
        }

        if (flag && isPanLineName(flag) && playId) {
            const shareURL = normalizeShareUrl(playId);
            const pushUrl = shareURL.startsWith("push://") ? shareURL : `push://${shareURL}`;
            return {
                urls: [{ name: "网盘资源", url: pushUrl }],
                parse: 0,
                header: {}
            };
        }

        const playPageUrl = fixUrl(playId);

        // 1. 请求播放页
        const html = await requestHtml(playPageUrl);

        // 2. 提取中间页 URL
        const urlMatch = html.match(/"url"\s*:\s*"(https:[^"]*?jx\.zxzj[^"]*?)"/);

        if (urlMatch && urlMatch[1]) {
            const targetUrl = urlMatch[1].replace(/\\/g, '');
            logInfo(`提取中间页 URL: ${targetUrl}`);

            // 3. 构造严格匹配的 Headers (关键!)
            const sniffHeaders = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Referer": host + "/",
                "Sec-Fetch-Dest": "iframe",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "same-site",
                "Upgrade-Insecure-Requests": "1"
            };

            // 4. 请求中间页获取源码
            try {
                const iframeHtml = await requestHtml(targetUrl, { headers: sniffHeaders });

                // 5. 提取 result_v2 并解密
                const v2Match = iframeHtml.match(/var\s+result_v2\s*=\s*(\{[\s\S]*?\});/);
                if (v2Match && v2Match[1]) {
                    const v2Json = JSON.parse(v2Match[1]);
                    const encryptedData = v2Json.data || v2Json.url;

                    if (encryptedData) {
                        const decrypted = DecryptTools.decrypt(encryptedData);
                        if (decrypted && decrypted.startsWith("http")) {
                            logInfo(`解密成功: ${decrypted.substring(0, 50)}...`);

                            // 弹幕匹配
                            let danmakuList = [];
                            if (DANMU_API && (vodName || params.vodName)) {
                                const finalVodName = vodName || params.vodName;
                                const finalEpisodeName = episodeName || params.episodeName || '';
                                const fileName = scrapedDanmuFileName || buildFileNameForDanmu(finalVodName, finalEpisodeName);

                                logInfo(`尝试匹配弹幕文件名: ${fileName}`);
                                if (fileName) {
                                    danmakuList = await matchDanmu(fileName);
                                }
                            }

                            const result = {
                                urls: [{ name: "极速直连", url: decrypted }],
                                parse: 0,
                                header: sniffHeaders
                            };

                            if (danmakuList && danmakuList.length > 0) {
                                result.danmaku = danmakuList;
                            }

                            return result;
                        }
                    }
                }
            } catch (innerErr) {
                logInfo(`中间页解析失败: ${innerErr.message}`);
            }

            // 6. 兜底方案：智能嗅探
            logInfo("尝试智能嗅探");
            const sniffRes = await sniffZxzjPlay(targetUrl);
            if (sniffRes) {
                // 弹幕匹配
                if (DANMU_API && (vodName || params.vodName)) {
                    const finalVodName = vodName || params.vodName;
                    const finalEpisodeName = episodeName || params.episodeName || '';
                    const fileName = scrapedDanmuFileName || buildFileNameForDanmu(finalVodName, finalEpisodeName);

                    logInfo(`尝试匹配弹幕文件名: ${fileName}`);
                    if (fileName) {
                        const danmakuList = await matchDanmu(fileName);
                        if (danmakuList && danmakuList.length > 0) {
                            sniffRes.danmaku = danmakuList;
                        }
                    }
                }
                return sniffRes;
            }
        }

    } catch (e) {
        logError("播放解析失败", e);
    }

    // 7. 最后的失败回退
    logInfo("使用回退方案");
    return {
        urls: [{ name: "解析失败", url: fixUrl(playId) }],
        parse: 1,
        header: baseHeaders
    };
}

module.exports = { home, category, search, detail, play };

const runner = require("spider_runner");
runner.run(module.exports);

});

_load(1, "影猫仓库", function (module, exports, require) {
// @name 影猫仓库
// @author 
// @description 刮削：支持，弹幕：支持，嗅探：支持，并发：安全
// @description 03 + 开心 + 真狼 (并发解析)
// @dependencies: axios, crypto, cheerio, http, https
// @version 1.0.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/影猫仓库.js

const axios = require("axios");
const cheerio = require("cheerio");
const OmniBox = require("omnibox_sdk");
const crypto = require("crypto");
const http = require("http");
const https = require("https");

// ==================== 全局配置 ====================
const HOST = "https://www.ymck.pro";
const PAGE_LIMIT = 20;
const DANMU_API = process.env.DANMU_API || "";

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
  "Referer": `${HOST}/`,
};

const axiosInstance = axios.create({ 
    timeout: 15000,
    httpAgent: new http.Agent({ keepAlive: true }),
    httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false })
});

// ==================== 日志工具 ====================
const logInfo = (message, data = null) => {
  OmniBox.log("info", `[影猫] ${message}${data ? ': ' + JSON.stringify(data) : ''}`);
};
const logWarn = (message, error = null) => {
  OmniBox.log("warn", `[影猫] ⚠️ ${message}${error ? ': ' + (error.message || error) : ''}`);
};
const logError = (message, error) => {
  OmniBox.log("error", `[影猫] ❌ ${message}: ${error?.message || error}`);
};

// ==================== 辅助工具函数 ====================
function d64(text) {
  try { return Buffer.from(String(text || ""), "base64").toString("utf8"); } catch { return ""; }
}

const encodeMeta = (obj) => {
  try { return Buffer.from(JSON.stringify(obj || {}), "utf8").toString("base64"); } catch { return ""; }
};
const decodeMeta = (str) => {
  try { return JSON.parse(Buffer.from(str || "", "base64").toString("utf8")); } catch { return {}; }
};

function safeDecode(str) {
  try { return decodeURIComponent(str); } catch (e) { return unescape(str); }
}

function toAbsUrl(url, base = HOST) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return "https:" + url;
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

async function fetchWithCookieRedirect(url, customHeaders = {}, timeoutMs = 4000) {
  let headers = { "User-Agent": DEFAULT_HEADERS["User-Agent"], ...customHeaders };
  
  let res = await axiosInstance.get(url, {
    headers: headers,
    timeout: timeoutMs,
    maxRedirects: 0,
    validateStatus: status => status >= 200 && status < 400
  });

  if (res.status === 301 || res.status === 302) {
    const cookies = res.headers['set-cookie'];
    const location = res.headers['location'];
    
    let baseUrl = url;
    try { baseUrl = new URL(url).origin; } catch (e) {}
    const nextUrl = location ? toAbsUrl(location, baseUrl) : url;
    
    if (cookies) {
      headers["Cookie"] = cookies.map(c => c.split(';')[0]).join('; ');
    }
    res = await axiosInstance.get(nextUrl, { headers: headers, timeout: timeoutMs, maxRedirects: 0 });
  }
  return res;
}

// ==================== 刮削与弹幕辅助模块 ====================
const RE_CLEAN_1 = /4[kK]|[xX]26[45]|720[pP]|1080[pP]|2160[pP]|1280x720|1920x1080/g;
const RE_CLEAN_2 = /[hH]\.?26[45]/g;
const RE_CLEAN_3 = /BluRay|WEB-DL|HDR|REMUX/gi;
const RE_CLEAN_4 = /\.mp4|\.mkv|\.avi|\.flv/gi;
const RE_SE = /[Ss](?:\d{1,2})?[-._\s]*[Ee](\d{1,3})/i;
const RE_CN = /第\s*([零一二三四五六七八九十0-9]+)\s*[集话章节回期]/;
const RE_EP = /\b(?:EP|E)[-._\s]*(\d{1,3})\b/i;
const RE_STANDALONE = /(?:^|[\s\-\._\[\]])(\d{1,3})(?![0-9pP])/g;

function preprocessTitle(title) {
    if (!title) return "";
    return title
        .replace(RE_CLEAN_1, " ")
        .replace(RE_CLEAN_2, " ")
        .replace(RE_CLEAN_3, " ")
        .replace(RE_CLEAN_4, " ");
}

function chineseToArabic(cn) {
    const map = { '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };
    if (!isNaN(cn)) return parseInt(cn);
    if (cn.length === 1) return map[cn] || cn;
    if (cn.length === 2) {
        if (cn[0] === '十') return 10 + map[cn[1]];
        if (cn[1] === '十') return map[cn[0]] * 10;
    }
    if (cn.length === 3) return map[cn[0]] * 10 + map[cn[2]];
    return cn;
}

function extractEpisode(title) {
    if (!title) return "";
    const processedTitle = preprocessTitle(title).trim();
    const seMatch = processedTitle.match(RE_SE);
    if (seMatch) return seMatch[1];
    const cnMatch = processedTitle.match(RE_CN);
    if (cnMatch) return String(chineseToArabic(cnMatch[1]));
    const epMatch = processedTitle.match(RE_EP);
    if (epMatch) return epMatch[1];
    const standaloneMatches = processedTitle.match(RE_STANDALONE);
    if (standaloneMatches) {
        const candidates = standaloneMatches.map(m => m.match(/\d+/)[0]).filter(n => parseInt(n) > 0 && parseInt(n) < 300);
        if (candidates.length > 0) return candidates[0];
    }
    return "";
}

function extractSeason(title) {
    if (!title) return 1;
    const cnMatch = title.match(/第\s*([零一二三四五六七八九十0-9]+)\s*季/);
    if (cnMatch) return chineseToArabic(cnMatch[1]);
    const enMatch = title.match(/Season\s*(\d+)/i) || title.match(/S(\d+)/i);
    if (enMatch) return parseInt(enMatch[1]);
    return 1;
}

function buildFileNameForDanmu(vodName, episodeTitle, seasonNum, episodeNum) {
    if (!vodName) return "";
    if (!episodeTitle || episodeTitle === '正片' || episodeTitle === '播放') return vodName;
    
    let s = seasonNum > 0 ? seasonNum : 1;
    let e = episodeNum;

    if (e === undefined || e === null) {
        const digits = extractEpisode(episodeTitle);
        if (digits) e = parseInt(digits, 10);
    }

    if (e > 0) {
        const sStr = s < 10 ? `S0${s}` : `S${s}`;
        const eStr = e < 10 ? `E0${e}` : `E${e}`;
        return `${vodName} ${sStr}${eStr}`;
    }
    return vodName;
}

const buildScrapedEpisodeName = (scrapeData, mapping, originalName) => {
    if (!mapping || mapping.episodeNumber === 0 || (mapping.confidence && mapping.confidence < 0.5)) {
        return originalName;
    }
    if (mapping.episodeName) {
        return `${mapping.episodeNumber}.${mapping.episodeName}`;
    }
    if (scrapeData && Array.isArray(scrapeData.episodes)) {
        const hit = scrapeData.episodes.find(
            ep => ep.episodeNumber === mapping.episodeNumber && ep.seasonNumber === mapping.seasonNumber
        );
        if (hit?.name) {
            return `${hit.episodeNumber}.${hit.name}`;
        }
    }
    return originalName;
};

async function matchDanmu(fileName) {
    if (!DANMU_API || !fileName) return [];
    try {
        const matchUrl = `${DANMU_API}/api/v2/match`;
        const response = await OmniBox.request(matchUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "User-Agent": DEFAULT_HEADERS["User-Agent"] },
            body: JSON.stringify({ fileName: fileName }),
        });
        if (response.statusCode !== 200) return [];
        const matchData = JSON.parse(response.body);
        if (!matchData.isMatched || !matchData.matches || matchData.matches.length === 0) return [];
        
        const firstMatch = matchData.matches[0];
        const episodeId = firstMatch.episodeId;
        const danmakuName = firstMatch.animeTitle && firstMatch.episodeTitle ? `${firstMatch.animeTitle} - ${firstMatch.episodeTitle}` : (firstMatch.animeTitle || firstMatch.episodeTitle || "弹幕");
        
        if (!episodeId) return [];
        return [{ name: danmakuName, url: `${DANMU_API}/api/v2/comment/${episodeId}?format=xml` }];
    } catch (error) {
        return [];
    }
}

// ==================== 详情页并发解析策略 ====================

async function parse03yySource(url) {
  const res = await fetchWithCookieRedirect(url, { "Referer": "https://www.03yy.live/" }, 4000);
  const $$ = cheerio.load(res.data);
  const tabs = [];
  const sources = [];
  $$("#playlist li").each((_, el) => { tabs.push($$(el).text().replace(/[\uE000-\uF8FF]/g, '').trim()); });

  $$(".play-box .play_list").each((index, el) => {
    const episodes = [];
    $$(el).find("ul li a").each((_, a) => {
      episodes.push({ name: $$(a).text().trim(), playId: toAbsUrl($$(a).attr("href"), "https://www.03yy.live") });
    });
    if (episodes.length > 0) sources.push({ name: `03影院 - ${tabs[index] || '线路'+(index+1)}`, episodes });
  });
  
  if (sources.length === 0) throw new Error("03yy未匹配到任何剧集");
  return { type: '03yy', sources };
}

// 【核心修复】增强版真狼解析器，增加 URL 去重，防止集数重复
async function parseZhenlangSource(url) {
  const res = await fetchWithCookieRedirect(url, { "Referer": "https://www.zhenlang.cc/" }, 4000);
  const $$ = cheerio.load(res.data);
  const sources = [];

  // 1. 尝试通用 MacCMS 结构抓取线路名称
  const tabs = [];
  $$(".nav-tabs li a, .stui-vodlist__head h3, .myui-panel__head h3, .module-tab-item, .play_source_tab a").each((_, el) => {
     let text = $$(el).text().replace(/[\uE000-\uF8FF]/g, '').trim();
     if (text) tabs.push(text);
  });

  // 2. 尝试通用 MacCMS 结构抓取播放列表
  const lists = $$(".stui-content__playlist, .myui-content__list, .module-play-list-content, .content_playlist, [id^='playlist']");
  lists.each((index, el) => {
    const episodes = [];
    const seenUrls = new Set(); // 【新增】用于记录已经提取过的链接，防止重复

    $$(el).find("a").each((_, a) => {
      const href = $$(a).attr("href");
      if (href && (href.includes("/play") || href.includes("/vodplay") || href.includes("vod-play"))) {
        const playId = toAbsUrl(href, "https://www.zhenlang.cc");
        
        // 【核心修复】如果这个链接还没被提取过，才加入列表
        if (!seenUrls.has(playId)) {
            seenUrls.add(playId);
            let epName = $$(a).text().trim() || "播放";
            // 清理可能存在的多余换行符
            epName = epName.replace(/\s+/g, ' '); 
            episodes.push({ name: epName, playId: playId });
        }
      }
    });
    
    if (episodes.length > 0) {
        let tabName = tabs[index] || `线路${index + 1}`;
        sources.push({ name: `真狼 - ${tabName}`, episodes });
    }
  });

  // 3. 尝试旧版结构兜底
  if (sources.length === 0) {
    $$(".play_list_box").each((index, el) => {
      let tabName = `线路${index + 1}`;
      const tipMatch = ($$(el).find(".player_infotip").text() || "").match(/当前资源由(.*?)提供/);
      if (tipMatch && tipMatch[1]) tabName = tipMatch[1].trim();

      const episodes = [];
      const seenUrls = new Set(); // 旧版结构也加上去重

      $$(el).find(".content_playlist a").each((_, a) => {
        const href = $$(a).attr("href");
        if (href) {
            const playId = toAbsUrl(href, "https://www.zhenlang.cc");
            if (!seenUrls.has(playId)) {
                seenUrls.add(playId);
                episodes.push({ name: $$(a).text().trim(), playId: playId });
            }
        }
      });
      if (episodes.length > 0) sources.push({ name: `真狼 - ${tabName}`, episodes });
    });
  }

  if (sources.length === 0) throw new Error("真狼网页结构变更，未匹配到任何剧集");
  
  return { type: 'zhenlang', sources };
}

async function parseKaixinSource(url) {
  const res = await axiosInstance.get(url, { headers: { "User-Agent": DEFAULT_HEADERS["User-Agent"] }, timeout: 4000 });
  const $$ = cheerio.load(res.data);
  const tabs = [];
  const sources = [];
  
  $$("ul.nav-tabs li a").each((_, el) => {
    const tabName = $$(el).text().replace(/\s*\d+$/, '').trim();
    const targetId = $$(el).attr("href");
    if (tabName && targetId) tabs.push({ name: tabName, id: targetId });
  });

  tabs.forEach(tab => {
    if (!tab.id || !tab.id.startsWith('#')) return;
    try {
      const episodes = [];
      $$(tab.id).find(".btn-group a").each((_, a) => {
        episodes.push({ name: $$(a).text().trim(), playId: toAbsUrl($$(a).attr("href"), "https://www.kxyytv.com") });
      });
      if (episodes.length > 0) sources.push({ name: `开心 - ${tab.name}`, episodes });
    } catch (e) {}
  });
  
  if (sources.length === 0) throw new Error("开心未匹配到任何剧集");
  return { type: 'kaixin', sources };
}

// ==================== 核心接口 ====================

async function home(params) {
  const classes = [
    { type_id: "1", type_name: "电影" },
    { type_id: "2", type_name: "电视剧" },
    { type_id: "5", type_name: "综艺" },
    { type_id: "4", type_name: "动漫" },
    { type_id: "3", type_name: "纪录片" }
  ];
  
  const filters = {
    "1": [{ key: "cateId", name: "类型", value: [{ n: "最新", v: "1", name: "最新", value: "1" }, { n: "动作", v: "6", name: "动作", value: "6" }, { n: "喜剧", v: "7", name: "喜剧", value: "7" }, { n: "爱情", v: "8", name: "爱情", value: "8" }, { n: "科幻", v: "9", name: "科幻", value: "9" }, { n: "恐怖", v: "10", name: "恐怖", value: "10" }, { n: "剧情", v: "11", name: "剧情", value: "11" }, { n: "战争", v: "12", name: "战争", value: "12" }] }],
    "2": [{ key: "cateId", name: "类型", value: [{ n: "最新", v: "2", name: "最新", value: "2" }, { n: "国产剧", v: "13", name: "国产剧", value: "13" }, { n: "港台剧", v: "14", name: "港台剧", value: "14" }, { n: "日韩剧", v: "15", name: "日韩剧", value: "15" }, { n: "海外剧", v: "16", name: "海外剧", value: "16" }] }],
    "4": [{ key: "cateId", name: "类型", value: [{ n: "最新", v: "4", name: "最新", value: "4" }, { n: "国产动漫", v: "24", name: "国产动漫", value: "24" }, { n: "日韩动漫", v: "25", name: "日韩动漫", value: "25" }, { n: "港台动漫", v: "26", name: "港台动漫", value: "26" }, { n: "欧美动漫", v: "27", name: "欧美动漫", value: "27" }] }],
    "5": [{ key: "cateId", name: "类型", value: [{ n: "最新", v: "5", name: "最新", value: "5" }, { n: "大陆综艺", v: "17", name: "大陆综艺", value: "17" }, { n: "港台综艺", v: "18", name: "港台综艺", value: "18" }, { n: "日韩综艺", v: "20", name: "日韩综艺", value: "20" }, { n: "欧美综艺", v: "21", name: "欧美综艺", value: "21" }] }],
    "3": [{ key: "cateClass", name: "类型", value: [{ n: "最新", v: "", name: "最新", value: "" }, { n: "记录", v: "记录", name: "记录", value: "记录" }, { n: "传记", v: "传记", name: "传记", value: "传记" }, { n: "历史", v: "历史", name: "历史", value: "历史" }, { n: "音乐", v: "音乐", name: "音乐", value: "音乐" }, { n: "运动", v: "运动", name: "运动", value: "运动" }, { n: "犯罪", v: "犯罪", name: "犯罪", value: "犯罪" }, { n: "情", v: "情", name: "情", value: "情" }, { n: "战争", v: "战争", name: "战争", value: "战争" }, { n: "冒险", v: "冒险", name: "冒险", value: "冒险" }, { n: "灾难", v: "灾难", name: "灾难", value: "灾难" }] }]
  };

  try {
    const url = `${HOST}/api.php/xiao/vod?page=1&limit=20`;
    const res = await axiosInstance.get(url, { 
        headers: { ...DEFAULT_HEADERS, "X-Requested-With": "XMLHttpRequest" } 
    });
    
    let list = [];
    if (res.data && res.data.list) {
        list = res.data.list.map(item => ({
            vod_id: item.vod_id.toString(),
            vod_name: item.vod_name,
            vod_pic: item.vod_pic,
            vod_remarks: parseFloat(item.vod_score) > 0 ? item.vod_score.toString() : ""
        }));
    }
    
    return { class: classes, filters: filters, list: list, page: 1, pagecount: res.data.pagecount || 99, limit: 20, total: res.data.total || 999 };
  } catch (e) { 
    return { class: classes, filters: filters, list: [], page: 1, pagecount: 1 }; 
  }
}


async function category(params) {
  let tid = params?.categoryId || params?.id || "1";
  const pg = params?.page || 1;
  let filterClass = "";

  if (params?.filters) {
      if (params.filters.cateId) {
          tid = params.filters.cateId;
      }
      if (params.filters.cateClass) {
          filterClass = encodeURIComponent(params.filters.cateClass);
      }
  }

  try {
    let url = `${HOST}/api.php/xiao/vod?type=${tid}&page=${pg}&limit=20`;
    if (filterClass) {
        url += `&class=${filterClass}`;
    }

    const res = await axiosInstance.get(url, { 
        headers: { 
            ...DEFAULT_HEADERS, 
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest" 
        } 
    });
    
    const data = res.data;
    let list = [];
    
    if (data && data.list) {
        list = data.list.map(item => ({
            vod_id: item.vod_id.toString(),
            vod_name: item.vod_name,
            vod_pic: item.vod_pic,
            vod_remarks: parseFloat(item.vod_score) > 0 ? item.vod_score.toString() : ""
        }));
    }

    return { 
        list: list, 
        page: parseInt(data.page || pg), 
        pagecount: parseInt(data.pagecount || 99), 
        limit: 20, 
        total: parseInt(data.total || 999) 
    };
  } catch (e) { 
    return { list: [], page: 1, pagecount: 1 }; 
  }
}

async function search(params) {
  const wd = params?.keyword || params?.wd || "";
  const pg = params?.page || 1;
  
  if (pg > 1) return { list: [], page: pg, pagecount: 1 };

  try {
    const apiUrl = `${HOST}/API/v2.php?q=${encodeURIComponent(wd)}&size=50`;
    const apiRes = await axiosInstance.get(apiUrl, { headers: { ...DEFAULT_HEADERS, "Accept": "*/*" } });
    
    let apiData = [];
    try {
        const parsed = JSON.parse(d64(apiRes.data));
        apiData = Array.isArray(parsed) ? parsed : (parsed.data || []);
    } catch (e) {
        logWarn("搜索API数据解析失败", e);
    }

    const groups = {};
    for (let i = 0; i < apiData.length; i++) {
        const item = apiData[i];
        if (typeof item === 'object' && item.text && item.url) {
            const title = item.text.trim();
            if (!groups[title]) {
                groups[title] = {
                    vod_id: `search_${title}`, 
                    vod_name: title,
                    vod_pic: "https://www.ymck.pro/upload/site/20230825-1/5c00fbcfb4ff0737d3c8320d30b2d1de.png", 
                    vod_remarks: "全网聚合"
                };
            }
        }
    }

    const list = Object.values(groups);
    return { list: list, page: 1, pagecount: 1, limit: 50, total: list.length };
  } catch (e) { 
    return { list: [], page: 1, pagecount: 1 }; 
  }
}

async function detail(params) {
  const t0 = Date.now();
  const id = params?.videoId || params?.id || "";
  if (!id) return { list: [] };

  try {
    let vodName = "";
    let vodPic = "";
    let vodContent = "";
    let vodYear = "";
    let vodActor = "";
    let vodDirector = "";

    if (id.startsWith("search_")) {
        vodName = id.replace("search_", "");
        vodPic = "https://www.ymck.pro/upload/site/20230825-1/5c00fbcfb4ff0737d3c8320d30b2d1de.png";
        vodContent = "全网聚合搜索结果，正在通过 TMDB 刮削获取详细信息...";
    } else {
        let targetUrl = id;
        if (/^\d+$/.test(id)) {
            targetUrl = `${HOST}/movie/${id}.html`;
        } else if (!id.startsWith("http")) {
            targetUrl = toAbsUrl(id);
        }

        const res = await axiosInstance.get(targetUrl, { headers: DEFAULT_HEADERS });
        const $ = cheerio.load(res.data);

        vodName = $(".movie-title").first().text().trim().replace(/影片信息$/, "").trim();
        if (!vodName) return { list: [] };
        
        vodPic = toAbsUrl($(".poster img").attr("src"));
        vodContent = $(".summary.detailsTxt").last().text().replace("简介：", "").trim();
    }

    let playSources = [];
    let parsedFlags = { '03yy': false, 'zhenlang': false, 'kaixin': false };

    const tApi = Date.now();
    const apiUrl = `${HOST}/API/v2.php?q=${encodeURIComponent(vodName)}&size=50`;
    try {
      const apiRes = await axiosInstance.get(apiUrl, { headers: { ...DEFAULT_HEADERS, "Accept": "*/*" } });
      
      let apiData = [];
      try {
          const parsed = JSON.parse(d64(apiRes.data));
          apiData = Array.isArray(parsed) ? parsed : (parsed.data || []);
      } catch (e) {
          logWarn("聚合API数据解析失败", e);
      }

      const target03yy = apiData.find(item => item && item.url && item.url.includes("03yy.live"));
      const targetZhenlang = apiData.find(item => item && item.url && item.url.includes("zhenlang.cc"));
      const targetKaixin = apiData.find(item => item && item.url && item.url.includes("kxyytv.com"));

      const tSource = Date.now();
      const tasks = [];

      const wrapTask = async (name, taskPromise) => {
          const tStart = Date.now();
          try {
              const res = await taskPromise;
              return { name, status: '成功', time: Date.now() - tStart, data: res };
          } catch (e) {
              return { name, status: '失败', time: Date.now() - tStart };
          }
      };

      if (target03yy) tasks.push(wrapTask('03影院', parse03yySource(target03yy.url)));
      if (targetZhenlang) tasks.push(wrapTask('真狼', parseZhenlangSource(targetZhenlang.url)));
      if (targetKaixin) tasks.push(wrapTask('开心', parseKaixinSource(targetKaixin.url)));

      if (tasks.length > 0) {
        const results = await Promise.all(tasks);
        
        let logDetails = [];
        results.forEach(r => {
            // 【核心修复】必须确保 sources 里面真的有数据，才算真正成功
            if (r.status === '成功' && r.data && r.data.sources && r.data.sources.length > 0) {
                logDetails.push(`${r.name}:成功(${r.time}ms)`);
                playSources.push(...r.data.sources);
                parsedFlags[r.data.type] = true;
            } else {
                logDetails.push(`${r.name}:无数据/失败(${r.time}ms)`);
            }
        });
        logInfo(`源站解析完成, 耗时: ${Date.now() - tSource}ms, 详情: [ ${logDetails.join(' | ')} ]`);
      }

      const fallbackEpisodes = [];
      for (let i = 0; i < apiData.length; i++) {
        const item = apiData[i];
        if (item && item.website && item.url) {
          if (parsedFlags['03yy'] && item.url.includes("03yy.live")) continue;
          if (parsedFlags['zhenlang'] && item.url.includes("zhenlang.cc")) continue;
          if (parsedFlags['kaixin'] && item.url.includes("kxyytv.com")) continue;
          fallbackEpisodes.push({ name: `${item.website} (需嗅探)`, playId: item.url });
        }
      }
      if (fallbackEpisodes.length > 0) playSources.push({ name: "全网聚合备用源", episodes: fallbackEpisodes });

    } catch (e) {
      logWarn("聚合API请求失败", e);
    }

    // ================= 2. 刮削处理 =================
    const tScrape = Date.now();
    let scrapeData = null;
    let videoMappings = [];
    const scrapeCandidates = [];

    const currentSeason = extractSeason(vodName);
    const sStr = currentSeason < 10 ? `S0${currentSeason}` : `S${currentSeason}`;

    playSources.forEach((source, sIdx) => {
        source.episodes.forEach((ep, eIdx) => {
            const fid = `${id}_${sIdx}_${eIdx}`;
            ep._fid = fid; 
            
            const epNumStr = extractEpisode(ep.name);
            let fileNameForScrape = `${vodName} ${ep.name}`; 
            
            if (epNumStr) {
                const epNum = parseInt(epNumStr, 10);
                const eStr = epNum < 10 ? `E0${epNum}` : `E${epNum}`;
                fileNameForScrape = `${vodName} ${sStr}${eStr}`;
            }

            scrapeCandidates.push({
                fid: fid, 
                file_id: fid, 
                file_name: fileNameForScrape, 
                name: ep.name, 
                format_type: "video"
            });
        });
    });

    if (scrapeCandidates.length > 0) {
        try {
            await OmniBox.processScraping(id, vodName, vodName, scrapeCandidates);
            const metadata = await OmniBox.getScrapeMetadata(id);
            scrapeData = metadata?.scrapeData || null;
            videoMappings = metadata?.videoMappings || [];
            
            if (scrapeData) {
                vodName = scrapeData.title || vodName;
                if (scrapeData.posterPath) vodPic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
                if (scrapeData.overview) vodContent = scrapeData.overview;
                if (scrapeData.releaseDate) vodYear = String(scrapeData.releaseDate).substring(0, 4);
                const actors = (scrapeData.credits?.cast || []).slice(0, 5).map(c => c?.name).filter(Boolean).join(",");
                if (actors) vodActor = actors;
                const directors = (scrapeData.credits?.crew || []).filter(c => c?.job === "Director").slice(0, 3).map(c => c?.name).filter(Boolean).join(",");
                if (directors) vodDirector = directors;
            }

            playSources.forEach(source => {
                source.episodes.forEach(ep => {
                    let meta = { fid: ep._fid, v: vodName, e: ep.name };
                    const mapping = videoMappings.find(m => m?.fileId === ep._fid);
                    
                    if (mapping) {
                        const newName = buildScrapedEpisodeName(scrapeData, mapping, ep.name);
                        if (newName && newName !== ep.name) ep.name = newName;
                        meta.s = mapping.seasonNumber;
                        meta.n = mapping.episodeNumber;
                        meta.e = ep.name;
                        
                        ep._s = mapping.seasonNumber;
                        ep._n = mapping.episodeNumber;
                    }
                    ep.playId = `${ep.playId}|||${encodeMeta(meta)}`;
                });

                const hasEpisodeNumber = source.episodes.some(ep => ep._n !== undefined);
                
                if (hasEpisodeNumber) {
                    source.episodes.sort((a, b) => {
                        const seasonA = a._s || 0;
                        const seasonB = b._s || 0;
                        if (seasonA !== seasonB) return seasonA - seasonB;
                        const episodeA = a._n || 0;
                        const episodeB = b._n || 0;
                        return episodeA - episodeB;
                    });
                }
            });
        } catch (e) {}
    }

    logInfo(`详情页加载完成, 影片: ${vodName}, 刮削耗时: ${Date.now() - tScrape}ms, 总耗时: ${Date.now() - t0}ms`);

    return { 
        list: [{ 
            vod_id: id, vod_name: vodName, vod_pic: vodPic, vod_content: vodContent, 
            vod_year: vodYear, vod_actor: vodActor, vod_director: vodDirector,
            vod_play_sources: playSources 
        }] 
    };
  } catch (e) { 
    return { list: [] }; 
  }
}

// ==================== 播放页策略模式解析器 ====================

async function play03yy(url, baseResult) {
  try {
    logInfo(`[03影院] 开始解析播放页: ${url}`);
    const res = await fetchWithCookieRedirect(url, { "Referer": "https://www.03yy.live/" }, 5000);
    const html = res.data;

    const nowMatch = html.match(/var now=base64decode\("([^"]+)"\)/);
    const pnMatch = html.match(/var pn="([^"]+)"/);

    if (nowMatch && nowMatch[1]) {
      const nowStr = d64(nowMatch[1]);
      const pn = pnMatch ? pnMatch[1] : "未知";
      
      logInfo(`[03影院] 提取参数成功 -> pn: ${pn}, now: ${nowStr}`);

      if (pn === "btiyikk" || pn === "03yyhd") {
        logInfo(`[03影院] 匹配为【高速线路】(${pn}), 准备请求 btiyikk 接口...`);
        const apiUrl = `https://www.03yy.live/api/btiyikk.php?url=${encodeURIComponent(nowStr)}&ref=${encodeURIComponent(url)}`;
        const apiRes = await fetchWithCookieRedirect(apiUrl, { "Referer": url }, 5000);
        const videoMatch = apiRes.data.match(/const videoUrl\s*=\s*"([^"]+)"/);
        
        if (videoMatch && videoMatch[1]) {
          const finalUrl = videoMatch[1].replace(/\\\//g, '/');
          logInfo(`[03影院] 高速线路解析成功: ${finalUrl}`);
          baseResult.urls = [{ name: "03高速直链", url: finalUrl }];
          return baseResult;
        }
      } 
            else if (pn === "qq") {
        logInfo(`[03影院] 匹配为【高清备用】(${pn}), 准备请求 playlink 接口...`);
        const apiUrl = `https://www.03yy.live/api/playlink.php?url=${encodeURIComponent(nowStr)}`;
        const apiRes = await fetchWithCookieRedirect(apiUrl, { "Referer": url }, 5000);
        const videoMatch = apiRes.data.match(/const videoUrl\s*=\s*"([^"]+)"/);
        
        if (videoMatch && videoMatch[1]) {
          const finalUrl = videoMatch[1].replace(/\\\//g, '/');
          logInfo(`[03影院] 高清备用解析成功: ${finalUrl}`);
          baseResult.urls = [{ name: "03高清备用", url: finalUrl }];
          baseResult.header = { "Referer": "https://www.03yy.live/", "User-Agent": DEFAULT_HEADERS["User-Agent"] };
          return baseResult;
        }
      }
      else if (pn === "1080zyk") {
        logInfo(`[03影院] 匹配为【普通线路】(${pn}), 准备请求 e1080 接口...`);
        const apiUrl = `https://www.03yy.live/api/e1080.php?url=${encodeURIComponent(nowStr)}`;
        const apiRes = await fetchWithCookieRedirect(apiUrl, { "Referer": url }, 5000);
        const videoMatch = apiRes.data.match(/var videoUrl\s*=\s*"([^"]+)"/);
        
        if (videoMatch && videoMatch[1]) {
          const finalUrl = videoMatch[1].replace(/\\\//g, '/');
          logInfo(`[03影院] 普通线路解析成功: ${finalUrl}`);
          baseResult.urls = [{ name: "03普线直链", url: finalUrl }];
          baseResult.header = { "Referer": "https://www.03yy.live/", "User-Agent": DEFAULT_HEADERS["User-Agent"] };
          return baseResult;
        }
      } 
      else {
        logInfo(`[03影院] 未知的线路标识 pn: ${pn}，尝试原生直链兜底`);
      }

      if (nowStr.includes(".m3u8") || nowStr.includes(".mp4")) {
        logInfo(`[03影院] 触发原生直链兜底成功: ${nowStr}`);
        baseResult.urls = [{ name: "03原生直链", url: nowStr }];
        return baseResult;
      }
    } else {
      logWarn(`[03影院] 网页源码中未找到 now 变量，可能网页结构已改变`);
    }
  } catch (e) {
    logWarn(`[03影院] 播放解析发生代码异常: ${e.message}`);
  }
  
  logInfo(`[03影院] 所有直链尝试均失败，交由外层嗅探器处理`);
  return null; 
}

async function playKaixin(url, baseResult) {
  try {
    const res = await axiosInstance.get(url, { headers: { "User-Agent": DEFAULT_HEADERS["User-Agent"] }, timeout: 5000 });
    const playerMatch = res.data.match(/var player_data\s*=\s*(\{[\s\S]+?\})\s*;?\s*</);
    if (playerMatch && playerMatch[1]) {
      const playerObj = JSON.parse(playerMatch[1]);
      let targetUrl = playerObj.url;
      let encrypt = playerObj.encrypt || 0;
      if (encrypt === 1) targetUrl = safeDecode(targetUrl);
      else if (encrypt === 2) targetUrl = safeDecode(Buffer.from(targetUrl, "base64").toString("utf8"));
      if (targetUrl) {
        baseResult.urls = [{ name: "直链秒播", url: targetUrl }];
        return baseResult;
      }
    }
  } catch (e) {}
  return null;
}

async function playZhenlang(url, baseResult) {
  try {
    const res = await axiosInstance.get(url, { headers: { "User-Agent": DEFAULT_HEADERS["User-Agent"] }, timeout: 5000 });
    let targetUrl = "";
    let encrypt = 0;
    const playerMatch = res.data.match(/var player_aaaa\s*=\s*(\{[\s\S]+?\})\s*;?\s*</);
    if (playerMatch && playerMatch[1]) {
      try {
        const playerObj = JSON.parse(playerMatch[1]);
        targetUrl = playerObj.url;
        encrypt = playerObj.encrypt;
      } catch (e) {
        const uMatch = playerMatch[1].match(/"url":"([^"]+)"/);
        const eMatch = playerMatch[1].match(/"encrypt":(\d)/);
        if (uMatch) targetUrl = uMatch[1];
        if (eMatch) encrypt = parseInt(eMatch[1]);
      }
    }
    
    if (targetUrl) {
      if (encrypt === 1) targetUrl = safeDecode(targetUrl);
      else if (encrypt === 2) targetUrl = safeDecode(Buffer.from(targetUrl, "base64").toString("utf8"));
      
      if (targetUrl.includes(".m3u8") || targetUrl.includes(".mp4")) {
        baseResult.urls = [{ name: "直链秒播", url: targetUrl }];
        return baseResult;
      }

      try {
        const sniffUrl = `https://super.playr.top/?url=${encodeURIComponent(targetUrl)}`;
        const playerRes = await axiosInstance.get(sniffUrl, { headers: { "Referer": "https://www.zhenlang.cc/" }, timeout: 5000 });
        const keyMatch = playerRes.data.match(/var\s+precomputedKey\s*=\s*['"]([^'"]+)['"]/);
        const ivMatch = playerRes.data.match(/var\s+precomputedIv\s*=\s*['"]([^'"]+)['"]/);
        
        if (keyMatch && ivMatch) {
          const dynamicKey = keyMatch[1];
          const dynamicIv = ivMatch[1];
          const tokenRes = await axiosInstance.get(`https://super.playr.top/token.php?url=${encodeURIComponent(targetUrl)}`, { headers: { "Referer": "https://www.zhenlang.cc/" }, timeout: 5000 });
          if (tokenRes.data && tokenRes.data.code === 0) {
            const apiRes = await axiosInstance.get(`https://super.playr.top/api.php?url=${encodeURIComponent(targetUrl)}&token=${tokenRes.data.token}&t=${tokenRes.data.t}`, { headers: { "Referer": "https://www.zhenlang.cc/" }, timeout: 5000 });
            if (apiRes.data && apiRes.data.e === 1 && apiRes.data.d) {
              const decipher = crypto.createDecipheriv("aes-128-cbc", Buffer.from(dynamicKey), Buffer.from(dynamicIv));
              let decrypted = decipher.update(apiRes.data.d, "base64", "utf8");
              decrypted += decipher.final("utf8");
              const parsedData = JSON.parse(decrypted);
              if (parsedData.url) {
                baseResult.urls = [{ name: "逆向秒播", url: parsedData.url }];
                return baseResult;
              }
            } else if (apiRes.data && apiRes.data.url) {
              baseResult.urls = [{ name: "逆向秒播", url: apiRes.data.url }];
              return baseResult;
            }
          }
        }
      } catch (crackErr) {}

      const sniffUrl = `https://super.playr.top/?url=${encodeURIComponent(targetUrl)}`;
      const sniffResult = await OmniBox.sniffVideo(sniffUrl);
      if (sniffResult && sniffResult.url) {
          baseResult.urls = [{ name: "嗅探线路", url: sniffResult.url }];
          baseResult.header = sniffResult.header || DEFAULT_HEADERS;
          return baseResult;
      }
    }
  } catch (e) {}
  return null;
}

async function play(params) {
  const t0 = Date.now();
  const playId = params?.playId || params?.id || "";
  if (!playId) return { urls: [] };

  let rawPlayId = playId;
  let playMeta = {};
  if (playId.includes('|||')) {
      const parts = playId.split('|||');
      rawPlayId = parts[0];
      playMeta = decodeMeta(parts[1] || "");
  }

  let playResult = { urls: [], parse: 0, header: DEFAULT_HEADERS };

  let danmakuPromise = Promise.resolve([]);
  if (DANMU_API) {
      let vodName = params.vodName || playMeta.v || "";
      let episodeName = params.episodeName || playMeta.e || "";
      const fileName = buildFileNameForDanmu(vodName, episodeName, playMeta.s, playMeta.n);
      if (fileName) danmakuPromise = matchDanmu(fileName).catch(() => []);
  }

  let specificResultPromise = Promise.resolve(null);
  if (rawPlayId.includes("03yy.live")) specificResultPromise = play03yy(rawPlayId, playResult);
  else if (rawPlayId.includes("kxyytv.com")) specificResultPromise = playKaixin(rawPlayId, playResult);
  else if (rawPlayId.includes("zhenlang.cc")) specificResultPromise = playZhenlang(rawPlayId, playResult);

  const [specificResult, danmakuList] = await Promise.all([specificResultPromise, danmakuPromise]);

  if (danmakuList && danmakuList.length > 0) {
      if (specificResult) specificResult.danmaku = danmakuList;
      playResult.danmaku = danmakuList;
  }

  if (specificResult && specificResult.urls.length > 0) {
      logInfo(`播放解析完成 (直链), 耗时: ${Date.now() - t0}ms`);
      return specificResult;
  }

  try {
    const sniffResult = await OmniBox.sniffVideo(rawPlayId);
    if (sniffResult && sniffResult.url) {
      playResult.urls = [{ name: "嗅探线路", url: sniffResult.url }];
      playResult.header = sniffResult.header || DEFAULT_HEADERS;
      logInfo(`播放解析完成 (嗅探), 耗时: ${Date.now() - t0}ms`);
      return playResult;
    }
  } catch (e) {}

  playResult.urls = [{ name: "网页解析", url: rawPlayId }];
  playResult.parse = 1;
  logInfo(`播放解析完成 (交由播放器), 耗时: ${Date.now() - t0}ms`);
  return playResult;
}

module.exports = { home, category, detail, search, play };
const runner = require("spider_runner");
runner.run(module.exports);

});

_load(2, "歪比巴卜", function (module, exports, require) {
/**
 * @name 歪比巴卜
 * @key wbbb
 * @type 4
 * @api /video/wbbb
 * @searchable 1
 * @quickSearch 1
 * @changeable 0
 * @version 1.0.7
 * @downloadURL https://github.com/Silent1566/OmniBox-Spider/raw/main/影视/采集/歪比巴卜.js
 */

let OmniBox;
try {
  OmniBox = require('omnibox_sdk');
} catch (_) {
  OmniBox = {
    log(level, message) {
      console.log(`[${level}] ${message}`);
    },
  };
}
let runner;
try {
  runner = require('spider_runner');
} catch (_) {
  runner = { run() {} };
}
const axios = require('axios');
const http = require('http');
const https = require('https');
const CryptoJS = require('crypto-js');

const SITE = {
  key: 'wbbb',
  name: '歪比巴卜',
  api: '/video/wbbb',
  host: 'https://wbbb1.com',
  ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
  timeout: 20000,
};

const CATS = [
  { type_id: '1', type_name: '电影' },
  { type_id: '2', type_name: '剧集' },
  { type_id: '3', type_name: '动漫' },
  { type_id: '4', type_name: '综艺' },
];

const LINE_DIRECT_RE = /^(?:lzm3u8|bfzym3u8)$/i;

const httpClient = axios.create({
  timeout: SITE.timeout,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
  maxRedirects: 0,
  validateStatus: () => true,
  headers: {
    'User-Agent': SITE.ua,
    'Referer': `${SITE.host}/`,
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Upgrade-Insecure-Requests': '1',
  },
});

const siteCookies = new Map();

function mergeCookies(setCookie) {
  const items = Array.isArray(setCookie) ? setCookie : (setCookie ? [setCookie] : []);
  for (const raw of items) {
    const pair = String(raw || '').split(';')[0].trim();
    const pos = pair.indexOf('=');
    if (pos <= 0) continue;
    const name = pair.slice(0, pos).trim();
    const value = pair.slice(pos + 1).trim();
    if (name) siteCookies.set(name, value);
  }
}

function cookieHeader() {
  return [...siteCookies.entries()]
    .filter(([, value]) => value)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

function looksLikeCookieChallenge(html = '') {
  const text = String(html || '');
  return text.length <= 1024 && /window\.location\.href\s*=\s*["'](?:https?:\/\/wbbb1\.com)?\//i.test(text);
}

function looksLikeSlideChallenge(html = '') {
  const text = String(html || '');
  return /<title>\s*滑动验证\s*<\/title>/i.test(text)
    && /src=["'][^"']*\/huadong_[^"']*\.js(?:\?[^"']*)?["']/i.test(text);
}

function extractSlideChallengeToken(html) {
  const src = pickMatch(html, /src=["']([^"']*\/huadong_[^"']*\.js(?:\?[^"']*)?)["']/i, 1, '');
  if (!src) return null;
  const path = src.startsWith('/') ? src : `/${src}`;
  const jsUrl = absUrl(path);
  const id = pickMatch(jsUrl, /[?&]id=([0-9]+)/i, 1, '');
  if (!id) return null;
  const key = pickMatch(jsUrl, /([0-9a-f]{8})_([0-9a-f]{32})\.js/i, 2, '');
  if (!key) return null;
  return { jsUrl, id, key };
}

function slideChallengeSignature(value) {
  let text = '';
  for (let i = 0; i <= String(value || '').length - 1; i++) {
    text += String(String(value || '').charCodeAt(i) + 1);
  }
  return CryptoJS.MD5(text).toString();
}

async function resolveSlideChallenge(fullUrl) {
  const firstRes = await httpClient.get(fullUrl, { headers: { Cookie: cookieHeader() } });
  lastStatus = firstRes.status;
  mergeCookies(firstRes.headers?.['set-cookie']);
  if (!looksLikeSlideChallenge(firstRes.data)) return firstRes;

  const token = extractSlideChallengeToken(firstRes.data);
  if (!token) throw new Error('slide challenge token missing');

  const scriptRes = await httpClient.get(token.jsUrl, { headers: { Cookie: cookieHeader(), Referer: fullUrl } });
  lastStatus = scriptRes.status;
  mergeCookies(scriptRes.headers?.['set-cookie']);
  const scriptValue = pickMatch(scriptRes.data, /key=["']([^"']*)["']\s*,\s*value=["']([^"']*)["']/i, 2, '');
  if (!scriptValue) throw new Error('slide challenge value missing');

  const verifyUrl = `https://wbbb1.com/a20be899_96a6_40b2_88ba_32f1f75f1552_yanzheng_huadong.php?type=ad82060c2e67cc7e2cc47552a4fc1242&key=${encodeURIComponent(token.key)}&value=${encodeURIComponent(slideChallengeSignature(scriptValue))}`;
  const verifyRes = await httpClient.get(verifyUrl, { headers: { Cookie: cookieHeader(), Referer: fullUrl } });
  lastStatus = verifyRes.status;
  mergeCookies(verifyRes.headers?.['set-cookie']);

  return await httpClient.get(fullUrl, { headers: { Cookie: cookieHeader(), Referer: `${SITE.host}/` } });
}

async function getHtml(url) {
  const full = /^https?:\/\//.test(url) ? url : `${SITE.host}${url}`;
  let lastStatus = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    const cookie = cookieHeader();
    const res = await httpClient.get(full, cookie ? { headers: { Cookie: cookie } } : undefined);
    lastStatus = res.status;
    mergeCookies(res.headers?.['set-cookie']);
    if (res.status >= 200 && res.status < 300 && !looksLikeCookieChallenge(res.data)) {
      return res.data || '';
    }
    if (res.status === 403 && looksLikeSlideChallenge(res.data)) {
      OmniBox.log('info', `[wbbb][html][slide-challenge] url=${redactSensitive(full)}, attempt=${attempt + 1}`);
      const retryRes = await resolveSlideChallenge(full);
      mergeCookies(retryRes.headers?.['set-cookie']);
      if (retryRes.status >= 200 && retryRes.status < 300 && !looksLikeSlideChallenge(retryRes.data)) {
        return retryRes.data || '';
      }
      break;
    }
    if (res.status !== 403 || !cookieHeader()) break;
    OmniBox.log('info', `[wbbb][html][cookie-retry] url=${redactSensitive(full)}, attempt=${attempt + 1}, htmlLength=${String(res.data || '').length}`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`HTTP ${lastStatus || 'request failed'}`);
}

function pickMatch(str, reg, idx = 1, def = '') {
  const m = str.match(reg);
  return m ? (m[idx] || def) : def;
}

function stripTags(str = '') {
  return String(str)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanSlashText(str = '') {
  return stripTags(str)
    .replace(/\s*\/\s*/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .trim();
}

function escapeRegExp(str = '') {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toProtocolRelativeUrl(url = '') {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (raw.startsWith('//')) return raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      return `//${u.host}${u.pathname}${u.search}${u.hash}`;
    } catch (_) {}
  }
  if (raw.startsWith('/')) {
    try {
      return `//${new URL(SITE.host).host}${raw}`;
    } catch (_) {}
  }
  return raw;
}

function redactSensitive(value = '') {
  return String(value == null ? '' : value)
    .replace(/([?&](?:url|key|vkey|ckey|token|play|player|auth|sign)=)([^&]+)/ig, '$1[REDACTED]')
    .replace(/(cookie\s*[:=]\s*)([^;\n]+)/ig, '$1[REDACTED]')
    .replace(/[A-Za-z0-9+/=_-]{32,}/g, (token) => `[REDACTED:${token.length}]`);
}

function redactJson(value) {
  try {
    return redactSensitive(JSON.stringify(value));
  } catch (_) {
    return redactSensitive(String(value || ''));
  }
}

function buildCookieHeader(setCookie) {
  return (Array.isArray(setCookie) ? setCookie : [])
    .map((item) => String(item || '').split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
}

function isInvalidWbbbLineName(name = '') {
  const value = stripTags(String(name || '')).replace(/\s+/g, '').trim();
  return !value || /^(?:排序|选择播放源|切换播放源|更多|展开|收起)$/i.test(value);
}

function buildWbbbEpisode(item = '') {
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    const playUrl = absUrl(item.playUrl || item.playId || item.url || item.id || '');
    const name = stripTags(item.name || '').trim();
    if (!playUrl || !name) return null;
    return { name, id: playUrl, playId: playUrl, playUrl, url: playUrl };
  }
  const text = String(item || '').trim();
  if (!text) return null;
  const sep = text.indexOf('$');
  if (sep < 0) return null;
  const name = text.slice(0, sep).trim();
  const playUrl = absUrl(text.slice(sep + 1).trim());
  if (!name || !playUrl) return null;
  return { name, id: playUrl, playId: playUrl, playUrl, url: playUrl };
}

function buildWbbbPlaySource(lineName, items, idx = 0) {
  if (isInvalidWbbbLineName(lineName)) return null;
  const name = stripTags(String(lineName || '')).replace(/\s+/g, ' ').trim() || `线路${idx + 1}`;
  const seen = new Set();
  const episodes = [];
  for (const item of Array.isArray(items) ? items : []) {
    const episode = buildWbbbEpisode(item);
    if (!episode || seen.has(episode.playId)) continue;
    seen.add(episode.playId);
    episodes.push(episode);
  }
  if (!episodes.length) return null;
  return {
    name,
    url: episodes.map((episode) => `${episode.name}$${episode.playUrl}`).join('#'),
    episodes,
  };
}

function extractCurrentEpisodeName(html = '', vodName = '') {
  const activeText = stripTags(pickMatch(html, /<a[^>]+module-play-list-link[^"']*active[^"']*[^>]*>([\s\S]*?)<\/a>/i, 1, ''));
  const fallbackText = stripTags(pickMatch(html, /(?:正在播放|当前播放)[^：:]*[：:]\s*([\s\S]*?)(?:<|$)/i, 1, ''));
  let episodeName = activeText || fallbackText;
  if (vodName && episodeName) {
    episodeName = episodeName.replace(new RegExp(`^${escapeRegExp(vodName)}\s*`), '').trim();
    episodeName = episodeName.replace(new RegExp(`^《?${escapeRegExp(vodName)}》?\s*`), '').trim();
  }
  return episodeName.trim();
}

function buildWbbbResolveTitle(html = '', player = {}) {
  const vodName = String(player?.vod_data?.vod_name || '').trim();
  const episodeName = extractCurrentEpisodeName(html, vodName);
  const title = `在线播放${vodName}${episodeName ? ` ${episodeName}` : ''}`.trim();
  return title || vodName || '在线播放';
}

function absUrl(url = '') {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) return `${SITE.host}${url}`;
  return `${SITE.host}/${url}`;
}

function normalizeVodFromCard(block) {
  const vod_id = pickMatch(block, /href="\/detail\/(\d+)\.html"/, 1, '');
  const vod_name = stripTags(pickMatch(block, /<div class="module-(?:poster-item-title|card-item-title)">([\s\S]*?)<\/div>/, 1, '')) || pickMatch(block, /alt="([^"]+)"/, 1, '');
  const vod_pic = absUrl(pickMatch(block, /(?:data-original|data-src|src)="([^"]+)"/, 1, ''));
  const vod_remarks = stripTags(pickMatch(block, /<div class="module-item-note">([\s\S]*?)<\/div>/, 1, ''));
  return { vod_id, vod_name, vod_pic, vod_remarks };
}

function parseCards(html) {
  const list = [];
  const reg = /<a href="\/detail\/(\d+)\.html" title="([^"]+)" class="module-poster-item module-item">([\s\S]*?)<\/a>/g;
  let m;
  while ((m = reg.exec(html)) !== null) {
    const block = m[0];
    list.push({
      vod_id: m[1],
      vod_name: m[2],
      vod_pic: absUrl(pickMatch(block, /(?:data-original|data-src|src)="([^"]+)"/, 1, '')),
      vod_remarks: stripTags(pickMatch(block, /<div class="module-item-note">([\s\S]*?)<\/div>/, 1, '')),
    });
  }
  if (list.length) return list;

  const reg2 = /<div class="module-card-item module-item">([\s\S]*?)<\/div>\s*<\/div>/g;
  while ((m = reg2.exec(html)) !== null) {
    const vod = normalizeVodFromCard(m[1]);
    if (vod.vod_id && vod.vod_name) list.push(vod);
  }
  return list;
}

/**
 * 解析播放标签（线路）名称。
 *
 * 原实现只匹配了两种特定的 HTML 结构，导致在页面结构略有变化时返回空数组，
 * 从而使得后续的播放线路名全部回退为默认的 "线路N"，甚至导致播放列表
 * 完全为空。这里改用更宽松的正则捕获所有带有 `module-tab-item` 类的 div，
 * 优先读取 `data-dropdown-value`，没有则取标签内部文字（去除 HTML）。
 */
function parseTabs(detailHtml) {
  const tabs = [];
  // 捕获包含 class="module-tab-item"（或其它组合） 的 div 块
  const reg = /<div[^>]*class=["'][^"'>]*\bmodule-tab-item\b[^"'>]*["'][^>]*>([\s\S]*?)<\/div>/gi;
  let m;
  while ((m = reg.exec(detailHtml)) !== null) {
    const block = m[0];
    // 先尝试 data-dropdown-value 属性
    const value = pickMatch(block, /data-dropdown-value\s*=\s*['"]([^'"]+)['"]/i, 1, '').trim();
    if (value) {
      if (!isInvalidWbbbLineName(value)) tabs.push(value);
      continue;
    }
    // 否则提取块内部的文字作为名称（去除标签）
    const inner = stripTags(m[1] || '').trim();
    if (inner && !isInvalidWbbbLineName(inner)) tabs.push(inner);
  }
  // 若仍未解析到任何线路，保持空数组，后续逻辑会使用兜底方案
  return tabs;
}

function parsePlayGroups(detailHtml) {
  const groups = [];
  const blockReg = /<div class="module-play-list-content[^\"]*">([\s\S]*?)<\/div>/g;
  let m;
  while ((m = blockReg.exec(detailHtml)) !== null) {
    const block = m[1];
    const items = [];
    const aReg = /<a[^>]+class="module-play-list-link[^\"]*"[^>]+href="([^\"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let a;
    while ((a = aReg.exec(block)) !== null) {
      const href = absUrl(a[1]);
      const label = stripTags(a[2]).trim();
      if (!href || !label) continue;
      items.push(`${label}$${href}`);
    }
    if (items.length) groups.push(items);
  }

  if (groups.length) return groups;

  const hrefOnly = [...detailHtml.matchAll(/<a[^>]+href="([^\"]*\/(?:vplay|play)\/[^\"#]+)"[^>]*>([\s\S]*?)<\/a>/g)];
  if (hrefOnly.length) {
    return [hrefOnly.map((mm) => `${stripTags(mm[2]).trim() || '播放'}$${absUrl(mm[1])}`)];
  }
  return groups;
}

function parsePlayer(html) {
  const patterns = [
    /var\s+player_aaaa\s*=\s*(\{.*?\})<\/script>/s,
    /var\s+player_.*?=\s*(\{.*?\})<\/script>/s,
    /player_aaaa\s*=\s*(\{.*?\})\s*;/s,
    /player_data\s*=\s*(\{.*?\})\s*;/s,
  ];
  for (const reg of patterns) {
    const m = html.match(reg);
    if (!m) continue;
    try { return JSON.parse(m[1]); } catch (_) {}
  }
  return null;
}

function decodePlayUrl(raw, encrypt) {
  let url = String(raw || '').trim();
  const enc = String(encrypt || '').trim();
  if (enc === '1') {
    try { url = unescape(url); } catch (_) {}
  } else if (enc === '2') {
    try { url = Buffer.from(url, 'base64').toString('utf8'); } catch (_) {}
    try { url = unescape(url); } catch (_) {}
  }
  if (url.startsWith('//')) url = `https:${url}`;
  else if (url.startsWith('/')) url = absUrl(url);
  return url;
}

function isDirectMediaUrl(url, fromOrType) {
  const value = String(url || '').trim();
  const hint = String(fromOrType || '').trim();
  if (!value) return false;
  if (/\.(?:m3u8|mp4|m4v|m4a|mp3|flv|avi|mkv|mov|webm)(?:[?#]|$)/i.test(value)) return true;
  if (/^(?:m3u8|mp4|m4v|m4a|mp3|flv|avi|mkv|mov|webm)$/i.test(hint) && /^https?:\/\//i.test(value)) return true;
  if (LINE_DIRECT_RE.test(hint)) return true;
  try {
    const u = new URL(value);
    return /\.(?:m3u8|mp4|m4v|m4a|mp3|flv|avi|mkv|mov|webm)(?:$|\?)/i.test(u.pathname + u.search);
  } catch (_) {
    return false;
  }
}

function decodeAesMaybeBase64(value = '') {
  const text = String(value || '').trim();
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(text) && text.length % 4 === 0) {
    try { return CryptoJS.enc.Base64.parse(text); } catch (_) {}
  }
  return CryptoJS.enc.Utf8.parse(text);
}

function rc4b64(key, data) {
  const S = [];
  for (let i = 0; i < 256; i++) S[i] = i;
  let j = 0, x;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + key.charCodeAt(i % key.length)) & 255;
    x = S[i]; S[i] = S[j]; S[j] = x;
  }
  let i = 0; j = 0;
  const bytes = Buffer.from(data, 'utf8');
  const res = [];
  for (let c of bytes) {
    i = (i + 1) & 255;
    j = (j + S[i]) & 255;
    x = S[i]; S[i] = S[j]; S[j] = x;
    res.push(c ^ S[(S[i] + S[j]) & 255]);
  }
  return Buffer.from(res).toString('base64');
}

async function resolveWbbbPlayerUrl(playerToken, nextUrl, title, urlNextToken, linkNext) {
  const host = 'xn--qvr2v.850088.xyz';
  const salt = 'stray';
  const urlParam = String(playerToken || '').trim();
  if (!urlParam) throw new Error('playerToken missing');

  const domainNext = String(linkNext || '').trim()
    ? `//wbbb1.com${linkNext}`
    : String(urlNextToken || '').trim() || toProtocolRelativeUrl(nextUrl);
  const parsePageUrl = `https://${host}/player/?url=${encodeURIComponent(urlParam)}&next=${encodeURIComponent(domainNext)}&title=${encodeURIComponent(title || '')}`;

  const parseRes = await httpClient.get(parsePageUrl, {
    headers: { 'User-Agent': SITE.ua, 'Referer': `${SITE.host}/` },
  });
  const parserCookie = buildCookieHeader(parseRes.headers?.['set-cookie']);

  const t = String(Math.floor(Date.now() / 1000));
  const md5 = (s) => CryptoJS.MD5(String(s)).toString();
  const rc4key = (md5(urlParam) + ' P').slice(-22);

  const formPayload = {
    url: urlParam,
    key: rc4b64(rc4key, md5(urlParam + salt)),
    vkey: rc4b64(rc4key, t + md5(rc4key + salt)),
    ckey: rc4b64(rc4key, md5(host + salt)),
  };

  const apiUrl = `https://${host}/player/api.php`;
  const formData = new URLSearchParams(formPayload).toString();
  const apiRes = await httpClient.post(apiUrl, formData, {
    headers: {
      'User-Agent': SITE.ua,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': parsePageUrl,
      'Origin': `https://${host}`,
      ...(parserCookie ? { Cookie: parserCookie } : {}),
    },
  });

  const payload = typeof apiRes.data === 'string' ? JSON.parse(apiRes.data) : apiRes.data;
  if (!payload || !payload.url) {
    throw new Error(payload && payload.msg ? payload.msg : 'parse api failed');
  }

  const key = CryptoJS.enc.Utf8.parse('OddfJktEbGu7gCv9');
  const iv = CryptoJS.enc.Utf8.parse('okjutU3RjGpWqB8Z');
  const decryptResult = CryptoJS.AES.decrypt(payload.url, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const finalUrl = (decryptResult.toString(CryptoJS.enc.Utf8) || '').trim();

  if (!finalUrl) throw new Error('decrypt failed');
  let resultUrl = finalUrl;
  if (finalUrl.startsWith('//')) resultUrl = `https:${finalUrl}`;
  else if (finalUrl.startsWith('/')) resultUrl = `${SITE.host}${finalUrl}`;
  return { url: resultUrl, type: payload.type || '', parsePageUrl, cookie: parserCookie };
}

async function home(params = {}) {
  OmniBox.log('info', `[wbbb][home] params=${JSON.stringify(params)}`);
  try {
    const html = await getHtml('/');
    const list = parseCards(html).slice(0, 40);
    return { class: CATS, list };
  } catch (e) {
    OmniBox.log('error', `[wbbb][home] error=${e.message}`);
    return { class: CATS, list: [], error: e.message || String(e) };
  }
}

async function category(params = {}) {
  OmniBox.log('info', `[wbbb][category] params=${JSON.stringify(params)}`);
  try {
    const id = params.id || params.t || params.type_id || params.categoryId || '1';
    const page = parseInt(params.page || params.pg || '1', 10) || 1;
    const path = page > 1 ? `/show/${id}--------${page}---.html` : `/show/${id}-----------.html`;
    OmniBox.log('info', `[wbbb][category] url=${SITE.host}${path}`);
    const html = await getHtml(path);
    const list = parseCards(html);
    OmniBox.log('info', `[wbbb][category] id=${id} page=${page} count=${list.length}`);
    const hasNext = html.includes('title="下一页"');
    return { list, page, pagecount: hasNext ? page + 1 : page, total: list.length };
  } catch (e) {
    OmniBox.log('error', `[wbbb][category] error=${e.message}`);
    const page = parseInt(params.page || params.pg || '1', 10) || 1;
    return { list: [], page, pagecount: page, total: 0, error: e.message || String(e) };
  }
}

async function detail(params = {}) {
  OmniBox.log('info', `[wbbb][detail][01] 入口参数 params=${JSON.stringify(params)}`);
  try {
    OmniBox.log('info', '[wbbb][detail][02] 开始解析视频 ID');
    let ids = [];
    if (Array.isArray(params.id)) ids = params.id;
    else if (Array.isArray(params.ids)) ids = params.ids;
    else if (params.ids) ids = String(params.ids).split(',').map((s) => s.trim()).filter(Boolean);
    else if (params.id) ids = String(params.id).split(',').map((s) => s.trim()).filter(Boolean);
    else if (params.vod_id) ids = String(params.vod_id).split(',').map((s) => s.trim()).filter(Boolean);
    else if (params.videoId) ids = String(params.videoId).split(',').map((s) => s.trim()).filter(Boolean);
    else if (params.video_id) ids = String(params.video_id).split(',').map((s) => s.trim()).filter(Boolean);
    OmniBox.log('info', `[wbbb][detail][03] 解析到 ids=${JSON.stringify(ids)}`);

    if (!ids.length) {
      OmniBox.log('warn', '[wbbb][detail][04] 未解析到任何视频 ID，直接返回空列表');
      return { list: [] };
    }

    const list = [];
    for (const rawId of ids) {
      const mediaId = String(rawId).trim();
      const detailPath = `/detail/${mediaId}.html`;
      OmniBox.log('info', `[wbbb][detail][05] 准备请求详情页 mediaId=${mediaId}, url=${SITE.host}${detailPath}`);
      const html = await getHtml(detailPath);
      OmniBox.log('info', `[wbbb][detail][06] 详情页请求完成 mediaId=${mediaId}, htmlLength=${String(html || '').length}, hasVplay=${String(html || '').includes('/vplay/')}`);

      OmniBox.log('info', '[wbbb][detail][07] 开始解析基础信息：标题/封面/简介/标签/导演/主演');
      const vod_name = stripTags(pickMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/, 1, ''));
      const vod_pic = absUrl(pickMatch(html, /<div class="module-item-pic">[\s\S]*?<img[^>]+data-original="([^\"]+)"/, 1, ''))
        || absUrl(pickMatch(html, /<div class="module-item-pic">[\s\S]*?<img[^>]+(?:data-src|src)="([^\"]+)"/, 1, ''));
      const vod_content = stripTags(pickMatch(html, /<div class="module-info-introduction-content[^>]*>([\s\S]*?)<\/div>/, 1, ''));
      const tagLinks = [...html.matchAll(/<div class="module-info-tag-link">([\s\S]*?)<\/div>/g)].map(x => x[1]);
      const vod_year = stripTags(tagLinks[0] || '');
      const vod_area = stripTags(tagLinks[1] || '');
      const vod_type = cleanSlashText(tagLinks[2] || '');
      const vod_remarks = stripTags(pickMatch(html, /<div class="module-item-note">([\s\S]*?)<\/div>/, 1, '')) || stripTags(pickMatch(html, /\u66f4\u65b0\u81f3[^<\s]+/, 0, ''));
      const vod_director = cleanSlashText(pickMatch(html, /\u5bfc\u6f14：[\s\S]*?<div[^>]*class="module-info-item-content">([\s\S]*?)<\/div>/, 1, ''));
      const vod_actor = cleanSlashText(pickMatch(html, /\u4e3b\u6f14：[\s\S]*?<div[^>]*class="module-info-item-content">([\s\S]*?)<\/div>/, 1, ''));
      OmniBox.log('info', `[wbbb][detail][08] 基础信息完成 mediaId=${mediaId}, name=${vod_name || '空'}, pic=${vod_pic ? '有' : '空'}, contentLen=${vod_content.length}, tags=${tagLinks.length}`);

      OmniBox.log('info', '[wbbb][detail][09] 开始解析播放线路 tabs');
      const tabs = parseTabs(html);
      OmniBox.log('info', `[wbbb][detail][10] tabs 解析完成 count=${tabs.length}, tabs=${tabs.join(' / ') || '空'}`);

      OmniBox.log('info', '[wbbb][detail][11] 开始解析播放分组 groups');
      const groups = parsePlayGroups(html);
      OmniBox.log('info', `[wbbb][detail][12] groups 解析完成 count=${groups.length}, episodeCounts=${groups.map(g => g.length).join('/') || '空'}`);

      let playSources = [];
      OmniBox.log('info', '[wbbb][detail][13] 开始组装 vod_play_from / vod_play_url');
      groups.forEach((items, idx) => {
        const lineName = tabs[idx] || `线路${idx + 1}`;
        const source = buildWbbbPlaySource(lineName, items, idx);
        if (!source) {
          OmniBox.log('warn', `[wbbb][detail][13-${idx}] 跳过无效播放组 idx=${idx}, lineName=${lineName}, itemCount=${Array.isArray(items) ? items.length : 0}`);
          return;
        }
        playSources.push(source);
      });
      // 如果结构化分组解析失败，再直接抓取页面中所有 /vplay/ 或 /play/ 链接作为单线路兜底。
      if (playSources.length === 0) {
        const seenFallback = new Set();
        const fallbackItems = [...html.matchAll(/<a[^>]+href=["']([^"']*\/(?:vplay|play)\/[^"']+\.html)["'][^>]*>([\s\S]*?)<\/a>/gi)]
          .map((m, index) => {
            const href = absUrl(m[1]);
            const name = stripTags(m[2]).trim() || `第${index + 1}集`;
            if (!href || seenFallback.has(href)) return '';
            seenFallback.add(href);
            return `${name}$${href}`;
          })
          .filter(Boolean);
        const fallbackSource = buildWbbbPlaySource(tabs[0] || '播放线路', fallbackItems, 0);
        if (fallbackSource) {
          playSources = [fallbackSource];
          OmniBox.log('info', `[wbbb][detail][fallback] 结构化线路为空，捕获到 ${fallbackSource.episodes.length} 条 vplay/play 链接作为兜底线路`);
        }
      }
      const playFrom = playSources.map((source) => source.name);
      const playUrl = playSources.map((source) => source.url);
      const vodPlayFrom = playFrom.join('$$$');
      const vodPlayUrl = playUrl.join('$$$');
      OmniBox.log('info', `[wbbb][detail][14] 播放字段组装完成 fromCount=${playFrom.length}, urlGroupCount=${playUrl.length}, vod_play_url_length=${vodPlayUrl.length}, firstLine=${playFrom[0] || '空'}, firstEpisode=${playSources[0]?.episodes?.[0]?.playId || '空'}`);

      const vod = {
        videoId: mediaId,
        id: mediaId,
        vod_id: mediaId,
        vod_name,
        vod_pic,
        type_name: vod_type,
        vod_year,
        vod_area,
        vod_remarks,
        vod_actor,
        vod_director,
        vod_content,
        vod_play_from: vodPlayFrom,
        vod_play_url: vodPlayUrl,
        vod_play_list: playSources.map((source) => ({
          name: source.name,
          url: source.url,
          episodes: source.episodes.map((episode) => ({ ...episode })),
        })),
        vod_play_sources: playSources.map((source) => ({
          name: source.name,
          episodes: source.episodes.map((episode) => ({ ...episode })),
        })),
      };
      OmniBox.log('info', `[wbbb][detail][15] 结果对象完成 mediaId=${mediaId}, has_vod_play_from=${!!vod.vod_play_from}, has_vod_play_url=${!!vod.vod_play_url}, vod_play_list_count=${vod.vod_play_list.length}, vod_play_sources_count=${vod.vod_play_sources.length}`);
      OmniBox.log('info', `[wbbb][detail][final] 完整返回数据: ${JSON.stringify(vod, null, 2)}`);
      if (!vod.vod_play_url) {
        OmniBox.log('warn', `[wbbb][detail][16] 未生成 vod_play_url：htmlLength=${html.length}, hasVplay=${html.includes('/vplay/')}, tabs=${tabs.length}, groups=${groups.length}`);
      }
      list.push(vod);
    }
    OmniBox.log('info', `[wbbb][detail][17] 即将返回 list，总数=${list.length}, firstName=${list[0]?.vod_name || '空'}, firstPlayFrom=${list[0]?.vod_play_from || '空'}, firstPlayUrlLen=${list[0]?.vod_play_url?.length || 0}`);
    return { list };
  } catch (e) {
    OmniBox.log('error', `[wbbb][detail][ERR] error=${e.message}, stack=${e.stack || ''}`);
    return { list: [], error: e.message || String(e) };
  }
}

async function search(params = {}) {
  OmniBox.log('info', `[wbbb][search] params=${JSON.stringify(params)}`);
  try {
    const wd = params.wd || params.keyword || params.key || '';
    const page = parseInt(params.page || params.pg || '1', 10) || 1;
    if (!wd) return { list: [], page, pagecount: page, total: 0 };
    const path = page > 1 ? `/search/-------------.html?wd=${encodeURIComponent(wd)}&page=${page}` : `/search/-------------.html?wd=${encodeURIComponent(wd)}`;
    OmniBox.log('info', `[wbbb][search] url=${SITE.host}${path}`);
    const html = await getHtml(path);
    const list = parseCards(html);
    return { list, page, pagecount: list.length >= 20 ? page + 1 : page, total: list.length };
  } catch (e) {
    const page = parseInt(params.page || params.pg || '1', 10) || 1;
    OmniBox.log('error', `[wbbb][search] error=${e.message}`);
    return { list: [], page, pagecount: page, total: 0, error: e.message || String(e) };
  }
}

function buildPlayHeaders(extra = {}) {
  const headers = {
    'User-Agent': SITE.ua,
    Referer: `${SITE.host}/`,
    Origin: SITE.host,
  };
  return Object.assign(headers, extra || {});
}

function buildAppSniffFallback(sniffUrl, headers = {}) {
  const finalHeaders = buildPlayHeaders(headers);
  return {
    parse: 1,
    jx: 1,
    url: sniffUrl,
    playId: sniffUrl,
    urls: [{ name: '嗅探线路', url: sniffUrl, playId: sniffUrl }],
    header: finalHeaders,
  };
}

async function play(params = {}) {
  OmniBox.log('info', `[wbbb][play][start] raw params=${JSON.stringify(params)}`);
  const rawId = params.id || params.playId || params.play || params.url || (typeof params === 'string' ? params : '');
  if (!rawId) {
    OmniBox.log('error', '[wbbb][play][ERR] No identifier provided in params');
    return { parse: 1, jx: 1, url: '', playId: '', error: 'Missing playback identifier' };
  }
  const id = /^https?:\/\//i.test(rawId) ? rawId : absUrl(rawId);
  OmniBox.log('info', `[wbbb][play][id] rawId=${String(rawId).slice(0, 120)}, normalized=${id}`);
  try {
    const html = await getHtml(id);
    const player = parsePlayer(html);
    OmniBox.log('info', `[wbbb][play] player url=${redactSensitive(player?.url || '')} from=${player?.from || ''}`);
    // If player parsing fails, try SDK sniff directly on the vplay page
    if (!player) {
      if (typeof OmniBox.sniffVideo === 'function') {
        try {
          const sniffed = await OmniBox.sniffVideo(id, { 'User-Agent': SITE.ua, Referer: `${SITE.host}/` });
          if (sniffed?.url) {
            return { parse: 0, jx: 0, url: sniffed.url, playId: sniffed.url, header: sniffed.header || { 'User-Agent': SITE.ua, Referer: `${SITE.host}/` } };
          }
        } catch (e) {
          await OmniBox.log('warn', `[wbbb][play] sdk sniff failed: ${e.message || e}`);
        }
      }
      // final fallback: app sniff format
      const fallback = { parse: 0, jx: 0, url: id, playId: id, header: { 'User-Agent': SITE.ua, Referer: `${SITE.host}/` } };
      OmniBox.log('info', `[wbbb][play][fallback] ${redactJson(fallback)}`);
      return fallback;
    }
    // Attempt direct media URL
    const from = String(player.from || '').trim();
    const title = buildWbbbResolveTitle(html, player);
    OmniBox.log('info', `[wbbb][play][resolve-meta] current=${redactSensitive(id)}, from=${from}, title=${title}`);

    // 尝试通过静态 playerconfig.js 获取解析地址（在 SDK 嗅探前）
    const parseCandidates = [
      '/static/js/playerconfig.js',
      `/static/player/${from}.js`,
      '/static/player/config.js',
      '/js/playerconfig.js',
      '/player/config.js',
    ];
    for (const p of parseCandidates) {
      try {
        const conf = await getHtml(p);
        const escapedFrom = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regs = [
          new RegExp(`player_list\\s*\\[\\s*['\"]${escapedFrom}['\"]\\s*\\]\\s*=\\s*\\{[\\s\\S]*?parse\\s*[:=]\\s*['\"]([^'\"]+)['\"]`, 'i'),
          new RegExp(`${escapedFrom}[\\s\\S]*?parse\\s*[:=]\\s*['\"]([^'\"]+)['\"]`, 'i'),
          new RegExp(`"${escapedFrom}"\\s*:\\s*\\{[\\s\\S]*?"parse"\\s*[:=]\\s*"([^\"]*)"`, 'i'),
          /MacPlayerConfig[\s\S]*?parse['"]?\s*[:=]\s*['"]([^'\"]+)['"]/i,
        ];
        for (const reg of regs) {
          const m = conf.match(reg);
          if (m && typeof m[1] === 'string') {
            const prefix = m[1].trim();
            if (prefix) {
              const jump = /^https?:\/\//i.test(prefix)
                ? `${prefix}${encodeURIComponent(player.url)}`
                : absUrl(`${prefix}${encodeURIComponent(player.url)}`);
              if (isDirectMediaUrl(jump, from)) {
                return { parse: 0, jx: 0, url: jump, playId: jump, header: { 'User-Agent': SITE.ua, Referer: `${SITE.host}/` } };
              }
              // otherwise continue to other fallback mechanisms
            }
          }
        }
      } catch (_) {}
    }
    const directUrl = decodePlayUrl(player.url, player.encrypt);
    if (isDirectMediaUrl(directUrl, from)) {
      return { parse: 0, jx: 0, url: directUrl, playId: directUrl, header: { 'User-Agent': SITE.ua, Referer: `${SITE.host}/` } };
    }
    // parse API handling
    const parseApi = String(player.parse || player.jx || '').trim();
    if (parseApi) {
      const jump = /^https?:\/\//i.test(parseApi)
        ? `${parseApi}${encodeURIComponent(directUrl)}`
        : absUrl(`${parseApi}${encodeURIComponent(directUrl)}`);
      return { parse: 0, jx: 0, url: jump, playId: jump, header: { 'User-Agent': SITE.ua, Referer: `${SITE.host}/` } };
    }
    // Resolve via external service
    let resolved = null;
    try {
      resolved = await resolveWbbbPlayerUrl(String(player.url || ''), '', title, String(player.url_next || '').trim(), String(player.link_next || '').trim());
    } catch (_) {}
    // If we got a resolved URL, prefer direct media return for tvbox/非 sniff 宿主
    if (resolved && resolved.url) {
      const resolvedUrl = String(resolved.url || '').trim();
      const resolvedType = String(resolved.type || '').trim();
      const resolvedHeaders = buildPlayHeaders({
        Referer: resolved.parsePageUrl || `${SITE.host}/`,
        ...(resolved.cookie ? { Cookie: resolved.cookie } : {}),
      });
      OmniBox.log('info', `[wbbb][play][resolved] url=${redactSensitive(resolvedUrl)}, type=${resolvedType || 'unknown'}, parsePage=${redactSensitive(resolved.parsePageUrl || '')}, hasCookie=${!!resolved.cookie}`);
      if (isDirectMediaUrl(resolvedUrl, resolvedType)) {
        return { parse: 0, jx: 0, url: resolvedUrl, playId: resolvedUrl, header: resolvedHeaders };
      }
      if (typeof OmniBox.sniffVideo === 'function') {
        try {
          const sniffed = await OmniBox.sniffVideo(resolvedUrl, resolvedHeaders);
          if (sniffed?.url) {
            return { parse: 0, jx: 0, url: sniffed.url, playId: sniffed.url, header: sniffed.header || resolvedHeaders };
          }
        } catch (e) {
          await OmniBox.log('warn', `[wbbb][play] sdk sniff on resolved failed: ${e.message || e}`);
        }
      }
      // fallback on resolved URL
      return buildAppSniffFallback(resolvedUrl, resolvedHeaders);
    }
    // No resolved URL – final fallback on original id
    if (typeof OmniBox.sniffVideo === 'function') {
      try {
        const fallbackHeaders = buildPlayHeaders();
        const sniffed = await OmniBox.sniffVideo(id, fallbackHeaders);
        if (sniffed?.url) {
          return { parse: 0, jx: 0, url: sniffed.url, playId: sniffed.url, header: sniffed.header || fallbackHeaders };
        }
      } catch (e) {
        await OmniBox.log('warn', `[wbbb][play] final sdk sniff failed: ${e.message || e}`);
      }
    }
    const fallback = { parse: 0, jx: 0, url: id, playId: id, header: buildPlayHeaders() };
    OmniBox.log('info', `[wbbb][play][fallback] ${redactJson(fallback)}`);
    return fallback;
  } catch (e) {
    return { parse: 1, jx: 1, url: id, playId: id, error: e.message || String(e) };
  }
}

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

});

_load(3, "毒舌03", function (module, exports, require) {
// @name 毒舌03
// @author 梦
// @description 影视站：https://www.dushe03.com/ ，支持首页、分类、详情、搜索与播放
// @dependencies cheerio
// @version 1.0.8
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/毒舌03.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const cheerio = require("cheerio");
const crypto = require("crypto");

const BASE_URL = (process.env.DUSHE03_HOST || "https://www.dushe03.com").replace(/\/$/, "");
const UA = process.env.DUSHE03_UA || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";
const HOME_CACHE_TTL = Number(process.env.DUSHE03_HOME_CACHE_TTL || 900);
const CATEGORY_CACHE_TTL = Number(process.env.DUSHE03_CATEGORY_CACHE_TTL || 900);
const DETAIL_CACHE_TTL = Number(process.env.DUSHE03_DETAIL_CACHE_TTL || 1800);
const SEARCH_CACHE_TTL = Number(process.env.DUSHE03_SEARCH_CACHE_TTL || 600);
const PLAY_CACHE_TTL = Number(process.env.DUSHE03_PLAY_CACHE_TTL || 900);

const CATEGORY_CONFIG = [
  { id: "1", name: "电影" },
  { id: "2", name: "剧集" },
  { id: "3", name: "综艺" },
  { id: "4", name: "动漫" },
  { id: "6", name: "短剧" },
];

const CLASS_LIST = CATEGORY_CONFIG.map((item) => ({ type_id: item.id, type_name: item.name }));
const CATEGORY_SHOW_PATH = Object.fromEntries(CATEGORY_CONFIG.map((item) => [item.id, `/show/${item.id}------.html`]));
const STATIC_HOST = process.env.DUSHE03_STATIC_HOST || "https://vres.bavdxfg.cn";
const PIC_HEADERS = {
  Referer: `${BASE_URL}/`,
  Origin: BASE_URL,
  "User-Agent": UA,
};
const FILTERS = {
  "1": [
    { key: "type", name: "类型", init: "", value: [{ name: "全部", value: "" }, { name: "剧情", value: "剧情" }, { name: "爱情", value: "爱情" }, { name: "喜剧", value: "喜剧" }, { name: "动作", value: "动作" }, { name: "恐怖", value: "恐怖" }, { name: "科幻", value: "科幻" }, { name: "悬疑", value: "悬疑" }, { name: "惊悚", value: "惊悚" }, { name: "犯罪", value: "犯罪" }, { name: "冒险", value: "冒险" }, { name: "动画", value: "动画" }, { name: "奇幻", value: "奇幻" }, { name: "武侠", value: "武侠" }] },
    { key: "area", name: "地区", init: "", value: [{ name: "地区", value: "" }, { name: "大陆", value: "中国大陆" }, { name: "香港", value: "中国香港" }, { name: "韩国", value: "韩国" }, { name: "美国", value: "美国" }, { name: "日本", value: "日本" }, { name: "法国", value: "法国" }, { name: "英国", value: "英国" }, { name: "德国", value: "德国" }, { name: "台湾", value: "中国台湾" }, { name: "泰国", value: "泰国" }, { name: "印度", value: "印度" }, { name: "其他", value: "其他" }] },
    { key: "lang", name: "语言", init: "", value: [{ name: "全部", value: "" }, { name: "国语", value: "国语" }, { name: "粤语", value: "粤语" }, { name: "英语", value: "英语" }, { name: "日语", value: "日语" }, { name: "韩语", value: "韩语" }, { name: "法语", value: "法语" }, { name: "其他", value: "其他" }] },
    { key: "year", name: "年份", init: "", value: [{ name: "全部", value: "" }, { name: "2026", value: "2026" }, { name: "2025", value: "2025" }, { name: "2024", value: "2024" }, { name: "2023", value: "2023" }, { name: "2022", value: "2022" }, { name: "2021", value: "2021" }, { name: "2020", value: "2020" }, { name: "10年代", value: "2010_2019" }, { name: "00年代", value: "2000_2009" }, { name: "90年代", value: "1990_1999" }, { name: "80年代", value: "1980_1989" }, { name: "更早", value: "0_1979" }] },
    { key: "by", name: "排序", init: "3", value: [{ name: "综合", value: "1" }, { name: "最新", value: "2" }, { name: "最热", value: "3" }, { name: "评分", value: "4" }] },
  ],
  "2": [
    { key: "type", name: "类型", init: "", value: [{ name: "全部", value: "" }, { name: "剧情", value: "剧情" }, { name: "爱情", value: "爱情" }, { name: "喜剧", value: "喜剧" }, { name: "犯罪", value: "犯罪" }, { name: "悬疑", value: "悬疑" }, { name: "古装", value: "古装" }, { name: "动作", value: "动作" }, { name: "家庭", value: "家庭" }, { name: "惊悚", value: "惊悚" }, { name: "奇幻", value: "奇幻" }, { name: "美剧", value: "美剧" }, { name: "科幻", value: "科幻" }, { name: "历史", value: "历史" }, { name: "战争", value: "战争" }, { name: "韩剧", value: "韩剧" }, { name: "武侠", value: "武侠" }, { name: "言情", value: "言情" }, { name: "恐怖", value: "恐怖" }, { name: "冒险", value: "冒险" }, { name: "都市", value: "都市" }, { name: "职场", value: "职场" }] },
    { key: "area", name: "地区", init: "", value: [{ name: "地区", value: "" }, { name: "大陆", value: "中国大陆" }, { name: "香港", value: "中国香港" }, { name: "韩国", value: "韩国" }, { name: "美国", value: "美国" }, { name: "日本", value: "日本" }, { name: "法国", value: "法国" }, { name: "英国", value: "英国" }, { name: "德国", value: "德国" }, { name: "台湾", value: "中国台湾" }, { name: "泰国", value: "泰国" }, { name: "印度", value: "印度" }, { name: "其他", value: "其他" }] },
    { key: "lang", name: "语言", init: "", value: [{ name: "全部", value: "" }, { name: "国语", value: "国语" }, { name: "粤语", value: "粤语" }, { name: "英语", value: "英语" }, { name: "日语", value: "日语" }, { name: "韩语", value: "韩语" }, { name: "法语", value: "法语" }, { name: "其他", value: "其他" }] },
    { key: "year", name: "年份", init: "", value: [{ name: "全部", value: "" }, { name: "2026", value: "2026" }, { name: "2025", value: "2025" }, { name: "2024", value: "2024" }, { name: "2023", value: "2023" }, { name: "2022", value: "2022" }, { name: "2021", value: "2021" }, { name: "2020", value: "2020" }, { name: "10年代", value: "2010_2019" }, { name: "00年代", value: "2000_2009" }, { name: "90年代", value: "1990_1999" }, { name: "80年代", value: "1980_1989" }, { name: "更早", value: "0_1979" }] },
    { key: "by", name: "排序", init: "3", value: [{ name: "综合", value: "1" }, { name: "最新", value: "2" }, { name: "最热", value: "3" }, { name: "评分", value: "4" }] },
  ],
  "3": [
    { key: "type", name: "类型", init: "", value: [{ name: "全部", value: "" }, { name: "真人秀", value: "真人秀" }, { name: "脱口秀", value: "脱口秀" }, { name: "选秀", value: "选秀" }, { name: "美食", value: "美食" }, { name: "旅游", value: "旅游" }, { name: "晚会", value: "晚会" }, { name: "音乐", value: "音乐" }, { name: "纪实", value: "纪实" }] },
    { key: "area", name: "地区", init: "", value: [{ name: "地区", value: "" }, { name: "大陆", value: "中国大陆" }, { name: "香港", value: "中国香港" }, { name: "韩国", value: "韩国" }, { name: "美国", value: "美国" }, { name: "日本", value: "日本" }, { name: "台湾", value: "中国台湾" }, { name: "泰国", value: "泰国" }, { name: "其他", value: "其他" }] },
    { key: "lang", name: "语言", init: "", value: [{ name: "全部", value: "" }, { name: "国语", value: "国语" }, { name: "粤语", value: "粤语" }, { name: "英语", value: "英语" }, { name: "日语", value: "日语" }, { name: "韩语", value: "韩语" }, { name: "其他", value: "其他" }] },
    { key: "year", name: "年份", init: "", value: [{ name: "全部", value: "" }, { name: "2026", value: "2026" }, { name: "2025", value: "2025" }, { name: "2024", value: "2024" }, { name: "2023", value: "2023" }, { name: "2022", value: "2022" }, { name: "2021", value: "2021" }, { name: "2020", value: "2020" }, { name: "10年代", value: "2010_2019" }, { name: "00年代", value: "2000_2009" }, { name: "90年代", value: "1990_1999" }, { name: "80年代", value: "1980_1989" }, { name: "更早", value: "0_1979" }] },
    { key: "by", name: "排序", init: "3", value: [{ name: "综合", value: "1" }, { name: "最新", value: "2" }, { name: "最热", value: "3" }, { name: "评分", value: "4" }] },
  ],
  "4": [
    { key: "type", name: "类型", init: "", value: [{ name: "全部", value: "" }, { name: "热血", value: "热血" }, { name: "搞笑", value: "搞笑" }, { name: "冒险", value: "冒险" }, { name: "奇幻", value: "奇幻" }, { name: "恋爱", value: "恋爱" }, { name: "校园", value: "校园" }, { name: "科幻", value: "科幻" }, { name: "战斗", value: "战斗" }] },
    { key: "area", name: "地区", init: "", value: [{ name: "地区", value: "" }, { name: "大陆", value: "中国大陆" }, { name: "日本", value: "日本" }, { name: "美国", value: "美国" }, { name: "韩国", value: "韩国" }, { name: "其他", value: "其他" }] },
    { key: "lang", name: "语言", init: "", value: [{ name: "全部", value: "" }, { name: "国语", value: "国语" }, { name: "日语", value: "日语" }, { name: "英语", value: "英语" }, { name: "其他", value: "其他" }] },
    { key: "year", name: "年份", init: "", value: [{ name: "全部", value: "" }, { name: "2026", value: "2026" }, { name: "2025", value: "2025" }, { name: "2024", value: "2024" }, { name: "2023", value: "2023" }, { name: "2022", value: "2022" }, { name: "2021", value: "2021" }, { name: "2020", value: "2020" }, { name: "10年代", value: "2010_2019" }, { name: "00年代", value: "2000_2009" }, { name: "90年代", value: "1990_1999" }, { name: "80年代", value: "1980_1989" }, { name: "更早", value: "0_1979" }] },
    { key: "by", name: "排序", init: "3", value: [{ name: "综合", value: "1" }, { name: "最新", value: "2" }, { name: "最热", value: "3" }, { name: "评分", value: "4" }] },
  ],
  "6": [
    { key: "type", name: "类型", init: "", value: [{ name: "全部", value: "" }, { name: "爱情", value: "爱情" }, { name: "都市", value: "都市" }, { name: "逆袭", value: "逆袭" }, { name: "悬疑", value: "悬疑" }, { name: "古装", value: "古装" }, { name: "穿越", value: "穿越" }, { name: "甜宠", value: "甜宠" }] },
    { key: "area", name: "地区", init: "", value: [{ name: "地区", value: "" }, { name: "大陆", value: "中国大陆" }, { name: "台湾", value: "中国台湾" }, { name: "香港", value: "中国香港" }, { name: "其他", value: "其他" }] },
    { key: "lang", name: "语言", init: "", value: [{ name: "全部", value: "" }, { name: "国语", value: "国语" }, { name: "粤语", value: "粤语" }, { name: "其他", value: "其他" }] },
    { key: "year", name: "年份", init: "", value: [{ name: "全部", value: "" }, { name: "2026", value: "2026" }, { name: "2025", value: "2025" }, { name: "2024", value: "2024" }, { name: "2023", value: "2023" }, { name: "2022", value: "2022" }, { name: "2021", value: "2021" }, { name: "2020", value: "2020" }, { name: "10年代", value: "2010_2019" }, { name: "00年代", value: "2000_2009" }, { name: "90年代", value: "1990_1999" }, { name: "80年代", value: "1980_1989" }, { name: "更早", value: "0_1979" }] },
    { key: "by", name: "排序", init: "3", value: [{ name: "综合", value: "1" }, { name: "最新", value: "2" }, { name: "最热", value: "3" }, { name: "评分", value: "4" }] },
  ],
};

let cdndefendCookie = "";

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

function absUrl(raw = "") {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/vod1/")) {
    return new URL(value, `${STATIC_HOST}/`).toString();
  }
  try {
    return new URL(value, `${BASE_URL}/`).toString();
  } catch (_) {
    return value;
  }
}

function cleanText(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function encodeSegment(value) {
  return encodeURIComponent(String(value || "").trim());
}

function summarizeImageCandidates($, root, selectors = []) {
  const scope = root && typeof root.find === "function" ? root : $(root);
  const summary = [];
  for (const selector of selectors) {
    const nodes = scope.find(selector).toArray().slice(0, 3);
    for (const el of nodes) {
      const wrapped = $(el);
      summary.push({
        selector,
        self: {
          dataOriginal: String(wrapped.attr("data-original") || ""),
          dataSrc: String(wrapped.attr("data-src") || ""),
          src: String(wrapped.attr("src") || ""),
        },
        parentA: {
          dataOriginal: String(wrapped.parent("a").attr("data-original") || ""),
          dataSrc: String(wrapped.parent("a").attr("data-src") || ""),
          src: String(wrapped.parent("a").attr("src") || ""),
        },
        closestA: {
          dataOriginal: String(wrapped.closest("a").attr("data-original") || ""),
          dataSrc: String(wrapped.closest("a").attr("data-src") || ""),
          src: String(wrapped.closest("a").attr("src") || ""),
        },
      });
      if (summary.length >= 4) return summary;
    }
  }
  return summary;
}

function pickImage($, root, selectors = []) {
  const scope = root && typeof root.find === "function" ? root : $(root);
  for (const selector of selectors) {
    const nodes = scope.find(selector).toArray();
    for (const el of nodes) {
      const wrapped = $(el);
      const candidateGroups = [
        [wrapped.attr("data-original"), wrapped.attr("data-src"), wrapped.attr("src"), wrapped.attr("data-url"), wrapped.attr("data-lazy-src"), wrapped.attr("original")],
        [wrapped.parent("a").attr("data-original"), wrapped.parent("a").attr("data-src"), wrapped.parent("a").attr("src")],
        [wrapped.closest("a").attr("data-original"), wrapped.closest("a").attr("data-src"), wrapped.closest("a").attr("src")],
      ];
      for (const candidates of candidateGroups) {
        for (const raw of candidates.map((item) => String(item || "").trim()).filter(Boolean)) {
          if (/logo_placeholder|noneCoverImg|blank\.gif|base64|avatar\.png|empty-box/i.test(raw)) continue;
          return raw;
        }
      }
    }
  }
  return "";
}

function dedupeVodList(list) {
  const out = [];
  const seen = new Set();
  for (const item of Array.isArray(list) ? list : []) {
    const key = String(item?.vod_id || item?.vod_name || "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function dedupeEpisodes(episodes) {
  const out = [];
  const seen = new Set();
  for (const ep of Array.isArray(episodes) ? episodes : []) {
    const name = cleanText(ep?.name || "");
    const playId = String(ep?.playId || "").trim();
    const key = `${name}|${playId}`;
    if (!name || !playId || seen.has(key)) continue;
    seen.add(key);
    out.push({ ...ep, name, playId });
  }
  return out;
}

function encodeSearchToken(keyword) {
  return "";
}

function extractSearchToken(html) {
  const text = String(html || "");
  const match = text.match(/<input[^>]+name=["']t["'][^>]*value=["']([^"']+)["']/i);
  return decodeHtmlEntities(match?.[1] || "").trim();
}

function getCdndefendCookie(challengeHtml = "") {
  if (cdndefendCookie) return cdndefendCookie;
  const text = String(challengeHtml || "");
  const prefix = (
    process.env.DUSHE03_CDNDEFEND_PREFIX
    || (text.match(/\['([A-F0-9]{40})','cdndefend_js_cookie='/i)?.[1])
    || (text.match(/const\s+[a-zA-Z0-9_$]+\s*=\s*\['([A-F0-9]{40})','cdndefend_js_cookie='/i)?.[1])
    || ""
  ).trim();
  if (!prefix) return "";
  const idx = parseInt(prefix[0], 16);
  let counter = 0;
  while (counter < 5_000_000) {
    const candidate = `${prefix}${counter}`;
    const digest = crypto.createHash("sha1").update(candidate).digest();
    if (digest[idx] === 0xb0 && digest[idx + 1] === 0x0b) {
      cdndefendCookie = candidate;
      return candidate;
    }
    counter += 1;
  }
  return "";
}

async function requestText(url, options = {}) {
  const method = options.method || "GET";
  const retry850 = options.retry850 !== false;
  await OmniBox.log("info", `[毒舌03][request] ${method} ${url}`);
  const headers = {
    "User-Agent": UA,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Referer: options.referer || `${BASE_URL}/`,
    "Upgrade-Insecure-Requests": "1",
    ...(options.headers || {}),
  };
  const res = await OmniBox.request(url, {
    method,
    headers,
    body: options.body,
    timeout: options.timeout || 20000,
  });
  const statusCode = Number(res?.statusCode || 0);
  const body = res?.body;
  const text = typeof body === "string" ? body : Buffer.isBuffer(body) ? body.toString() : String(body || "");

  if (statusCode === 850 && retry850) {
    const cookie = getCdndefendCookie(text);
    if (cookie) {
      const retryHeaders = {
        ...headers,
        Cookie: [headers.Cookie, `cdndefend_js_cookie=${cookie}`].filter(Boolean).join("; "),
      };
      await OmniBox.log("warn", `[毒舌03][request] HTTP 850, retry with cdndefend cookie: ${url}`);
      const retryRes = await OmniBox.request(url, {
        method,
        headers: retryHeaders,
        body: options.body,
        timeout: options.timeout || 20000,
      });
      const retryStatus = Number(retryRes?.statusCode || 0);
      const retryBody = retryRes?.body;
      const retryText = typeof retryBody === "string" ? retryBody : Buffer.isBuffer(retryBody) ? retryBody.toString() : String(retryBody || "");
      if (retryStatus === 200) return retryText;
      throw new Error(`HTTP ${retryStatus || 850} @ ${url}`);
    }
  }

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode || "unknown"} @ ${url}`);
  }
  return text;
}

async function getCachedText(cacheKey, ttl, producer) {
  try {
    const cached = await OmniBox.getCache(cacheKey);
    if (cached) return String(cached);
  } catch (_) {}
  const text = String(await producer());
  try {
    await OmniBox.setCache(cacheKey, text, ttl);
  } catch (_) {}
  return text;
}

function extractYearFromTitle(title) {
  const match = String(title || "").match(/^(.*?)\s*-\s*.*?(\d{4})年最新/);
  return match?.[2] || "";
}

function buildCard($, el, options = {}) {
  const node = $(el);
  const anchor = node.find("a[href]").first();
  const href = anchor.attr("href") || "";
  const imageNodes = node.find("img");
  const images = imageNodes.toArray();
  const poster = images.length > 1 ? $(images[1]) : $(images[0] || []);
  const title = cleanText(
    node.find(".v-item-title:not([style*='display: none'])").first().text()
      || poster.attr("alt")
      || anchor.attr("title")
      || ""
  );
  const picSelectors = [
    "a[href]",
    ".v-item-cover img:not(#noneCoverImg)",
    ".v-item-main img:not(#noneCoverImg)",
    "img:not(#noneCoverImg)",
  ];
  const pic = pickImage($, node, picSelectors);
  if (options.logImageDebug) {
    const debug = summarizeImageCandidates($, node, picSelectors);
    options.logImageDebug({ title, href, pic, debug });
  }
  const remarks = cleanText(node.find(".v-item-bottom span").first().text());
  const score = cleanText(node.find(".v-item-top-left span").first().text());
  return {
    vod_id: absUrl(href),
    vod_name: title,
    vod_pic: absUrl(pic),
    vod_pic_headers: { ...PIC_HEADERS },
    vod_remarks: remarks || score,
    vod_douban_score: score.replace(/^豆瓣[:：]?/, ""),
  };
}

function parseModuleList(html, options = {}) {
  const $ = cheerio.load(html);
  const list = [];
  $(".module-item").each((_, el) => list.push(buildCard($, el, options)));
  return dedupeVodList(list).filter((item) => item.vod_id && item.vod_name);
}

function parseSearchList(html) {
  const $ = cheerio.load(html);
  const list = [];
  $(".search-result-item[href]").each((_, el) => {
    const node = $(el);
    const href = node.attr("href") || "";
    const title = cleanText(node.find(".title").first().text());
    const pic = pickImage($, node, [
      ".search-result-item-pic img:not(#noneCoverImg)",
      ".search-result-item-side img:not(#noneCoverImg)",
      "img:not(#noneCoverImg)",
    ]);
    const tags = node.find(".tags span").map((__, span) => cleanText($(span).text())).get().filter(Boolean);
    const actor = cleanText(node.find(".actors span").first().text());
    const desc = cleanText(node.find(".desc").first().text());
    list.push({
      vod_id: absUrl(href),
      vod_name: title,
      vod_pic: absUrl(pic),
      vod_pic_headers: { ...PIC_HEADERS },
      vod_remarks: tags.join("/") || actor,
      vod_actor: actor,
      vod_content: desc,
    });
  });
  return dedupeVodList(list).filter((item) => item.vod_id && item.vod_name);
}

function parsePageCount(html, currentPage) {
  const text = String(html || "");
  let pagecount = Math.max(1, Number(currentPage || 1));
  const patterns = [
    /href=["'][^"']*channel\/\d+\.html\?page=(\d+)/gi,
    /href=["'][^"']*channel\/\d+-(\d+)\.html["']/gi,
    /href=["'][^"']*search\?[^"']*page=(\d+)/gi,
    /href=["'][^"']*show\/\d+-[^"']*-([1-4])-(\d+)\.html["']/gi,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const n = Number(match[2] || match[1] || 1);
      if (Number.isFinite(n)) pagecount = Math.max(pagecount, n);
    }
  }
  return pagecount;
}

function parseDetailRows($) {
  const map = {};
  $(".detail-info-row").each((_, row) => {
    const label = cleanText($(row).find(".detail-info-row-side").first().text()).replace(/[：:]$/, "");
    const value = cleanText($(row).find(".detail-info-row-main").first().text());
    if (label && value) map[label] = value;
  });
  return map;
}

function parseDetailSources($) {
  const sourceNames = $(".source-list-box-main .source-item .source-item-label")
    .map((_, el) => cleanText($(el).text()))
    .get()
    .filter(Boolean);
  const episodeLists = $(".episode-list-box-main .episode-list").toArray();
  const sources = [];
  episodeLists.forEach((listNode, index) => {
    const episodes = [];
    $(listNode).find("a[href]").each((__, a) => {
      const href = $(a).attr("href") || "";
      const name = cleanText($(a).text());
      if (!href || !name) return;
      episodes.push({ name, playId: absUrl(href) });
    });
    if (episodes.length) {
      sources.push({
        name: sourceNames[index] || `线路${index + 1}`,
        episodes: dedupeEpisodes(episodes),
      });
    }
  });
  return sources;
}

function parseDetail(html, detailUrl, options = {}) {
  const $ = cheerio.load(html);
  const title = cleanText($(".detail-title strong").eq(1).text() || $("title").text().replace(/-.*$/, ""));
  const picSelectors = [
    "img:not(#noneCoverImg)",
    "img[data-original]",
    "img[data-src]",
    "img[src]",
  ];
  const pic = absUrl(pickImage($, $(".detail-box-side").first(), picSelectors));
  if (options.logImageDebug) {
    options.logImageDebug({
      title,
      href: detailUrl,
      pic,
      debug: summarizeImageCandidates($, $(".detail-box-side").first(), picSelectors),
    });
  }
  const tags = $(".detail-tags .detail-tags-item").map((_, el) => cleanText($(el).text())).get().filter(Boolean);
  const meta = parseDetailRows($);
  const desc = cleanText($(".detail-desc").first().text() || $("meta[name='description']").attr("content") || "");
  const remarks = meta["备注"] || meta["状态"] || "";
  const vod_play_sources = parseDetailSources($);
  return {
    vod_id: String(detailUrl || ""),
    vod_name: title,
    vod_pic: pic,
    vod_pic_headers: { ...PIC_HEADERS },
    vod_remarks: remarks,
    vod_year: meta["首映"] ? String(meta["首映"]).slice(0, 4) : tags.find((tag) => /^\d{4}$/.test(tag)) || "",
    vod_area: tags.find((tag) => /中国|美国|日本|韩国|英国|香港|台湾|泰国|法国|德国|印度/.test(tag)) || "",
    type_name: tags.filter((tag) => !/^\d{4}$/.test(tag) && !/中国|美国|日本|韩国|英国|香港|台湾|泰国|法国|德国|印度/.test(tag)).join(","),
    vod_actor: meta["演员"] || "",
    vod_director: meta["导演"] || "",
    vod_lang: meta["语言"] || "",
    vod_content: desc,
    vod_play_sources,
  };
}

function decodeUnicodeEscapes(value) {
  return String(value || "").replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function resolvePlayUrl(rawUrl) {
  let playUrl = decodeUnicodeEscapes(String(rawUrl || "")).replace(/\\\//g, "/").replace(/\\/g, "").trim();
  if (!playUrl) return "";
  if (/^https?:\/\//i.test(playUrl)) return playUrl;
  if (playUrl.startsWith("//")) return `https:${playUrl}`;
  return absUrl(playUrl);
}

function extractPlaySource(html) {
  const text = String(html || "");
  const match = text.match(/const\s+playSource\s*=\s*\{([\s\S]*?)\};/i);
  if (!match) return { url: "", type: "" };
  const body = decodeUnicodeEscapes(match[1]);
  const urlMatch = body.match(/['"]src['"]\s*:\s*['"]([^'"]+)['"]/i);
  const typeMatch = body.match(/['"]type['"]\s*:\s*['"]([^'"]+)['"]/i);
  return {
    url: resolvePlayUrl(urlMatch?.[1] || ""),
    type: decodeUnicodeEscapes(typeMatch?.[1] || ""),
  };
}

async function resolvePlayPage(playPageUrl, referer) {
  const html = await requestText(playPageUrl, { referer });
  const source = extractPlaySource(html);
  if (source.url) return source;
  return { url: "", type: "" };
}

async function trySniffVideo(sniffUrl, headers = {}) {
  if (!sniffUrl || typeof OmniBox.sniffVideo !== "function") return null;
  try {
    await OmniBox.log("info", `[毒舌03][play] sniffVideo start url=${sniffUrl} headers=${JSON.stringify(headers)}`);
    const sniffed = await OmniBox.sniffVideo(sniffUrl, headers);
    await OmniBox.log("info", `[毒舌03][play] sniffVideo result=${JSON.stringify(sniffed || null)}`);
    if (sniffed?.url) {
      return {
        parse: 0,
        url: sniffed.url,
        urls: [{ name: "嗅探线路", url: sniffed.url }],
        header: sniffed.header || headers,
      };
    }
  } catch (e) {
    await OmniBox.log("warn", `[毒舌03][play] sniffVideo failed: ${e.message || e}`);
  }
  return null;
}

function buildAppSniffFallback(sniffUrl, headers = {}) {
  return {
    parse: 1,
    url: sniffUrl,
    urls: [{ name: "嗅探线路", url: sniffUrl }],
    header: headers,
  };
}

function buildShowUrl(tid, ext = {}) {
  const type = encodeSegment(ext.type || "");
  const area = encodeSegment(ext.area || "");
  const lang = encodeSegment(ext.lang || "");
  const year = encodeSegment(ext.year || "");
  const by = encodeSegment(ext.by || "3");
  const page = Math.max(1, Number(ext.page || 1));
  return `${BASE_URL}/show/${encodeURIComponent(String(tid || "1"))}-${type}-${area}-${lang}-${year}-${by}-${page}.html`;
}

async function home() {
  try {
    const html = await getCachedText("dushe03:home", HOME_CACHE_TTL, () => requestText(`${BASE_URL}/`));
    let imageDebugLogged = 0;
    const list = parseModuleList(html, {
      logImageDebug: ({ title, href, pic, debug }) => {
        if (imageDebugLogged >= 2) return;
        imageDebugLogged += 1;
        OmniBox.log("info", `[毒舌03][image][home] title=${title} href=${href} picked=${pic} abs=${absUrl(pic)} headers=${JSON.stringify(PIC_HEADERS)} debug=${JSON.stringify(debug)}`);
      },
    }).slice(0, 24);
    await OmniBox.log("info", `[毒舌03][home] count=${list.length}`);
    return { class: CLASS_LIST, filters: FILTERS, list };
  } catch (e) {
    await OmniBox.log("error", `[毒舌03][home] failed: ${e.message || e}`);
    return { class: CLASS_LIST, filters: FILTERS, list: [] };
  }
}

async function category(params = {}) {
  try {
    const tid = String(params.type_id || params.categoryId || params.tid || "1");
    const page = Math.max(1, Number(params.page || params.pg || 1));
    const extend = params.filters || params.extend || params.ext || {};
    const hasFilter = ["type", "area", "lang", "year"].some((key) => String(extend[key] || "").length > 0) || String(extend.by || "") !== "";
    const url = hasFilter || page > 1
      ? buildShowUrl(tid, { ...extend, by: extend.by || "3", page })
      : `${BASE_URL}${CATEGORY_SHOW_PATH[tid] || `/channel/${encodeURIComponent(tid)}.html`}`;
    const html = await getCachedText(`dushe03:category:${tid}:${JSON.stringify(extend)}:${page}`, CATEGORY_CACHE_TTL, () => requestText(url));
    let imageDebugLogged = 0;
    const list = parseModuleList(html, {
      logImageDebug: ({ title, href, pic, debug }) => {
        if (imageDebugLogged >= 2) return;
        imageDebugLogged += 1;
        OmniBox.log("info", `[毒舌03][image][category] title=${title} href=${href} picked=${pic} abs=${absUrl(pic)} headers=${JSON.stringify(PIC_HEADERS)} debug=${JSON.stringify(debug)}`);
      },
    });
    const pagecount = parsePageCount(html, page);
    await OmniBox.log("info", `[毒舌03][category] tid=${tid} page=${page} filters=${JSON.stringify(extend)} url=${url.replace(BASE_URL, "")} count=${list.length} pagecount=${pagecount}`);
    return {
      page,
      pagecount,
      limit: list.length,
      total: list.length,
      filters: FILTERS[tid] || [],
      list,
    };
  } catch (e) {
    await OmniBox.log("error", `[毒舌03][category] failed: ${e.message || e}`);
    return {
      page: Number(params.page || params.pg || 1) || 1,
      pagecount: 1,
      limit: 0,
      total: 0,
      filters: FILTERS[String(params.type_id || params.categoryId || params.tid || "1")] || [],
      list: [],
    };
  }
}

async function detail(params = {}) {
  try {
    const vodId = absUrl(params.vod_id || params.videoId || params.id || "");
    if (!vodId) return { list: [] };
    const html = await getCachedText(`dushe03:detail:${vodId}`, DETAIL_CACHE_TTL, () => requestText(vodId));
    const vod = parseDetail(html, vodId, {
      logImageDebug: ({ title, href, pic, debug }) => {
        OmniBox.log("info", `[毒舌03][image][detail] title=${title} href=${href} picked=${pic} abs=${absUrl(pic)} headers=${JSON.stringify(PIC_HEADERS)} debug=${JSON.stringify(debug)}`);
      },
    });
    await OmniBox.log("info", `[毒舌03][detail] vod=${vod.vod_name || vodId} sources=${vod.vod_play_sources?.length || 0}`);
    return { list: [vod] };
  } catch (e) {
    await OmniBox.log("error", `[毒舌03][detail] failed: ${e.message || e}`);
    return { list: [] };
  }
}

async function search(params = {}) {
  try {
    const wd = String(params.wd || params.keyword || "").trim();
    const page = Math.max(1, Number(params.page || 1));
    if (!wd) return { page, pagecount: 1, limit: 0, total: 0, list: [] };
    const homeHtml = await getCachedText("dushe03:home", HOME_CACHE_TTL, () => requestText(`${BASE_URL}/`));
    const token = encodeURIComponent(extractSearchToken(homeHtml) || encodeSearchToken(wd));
    const url = page > 1
      ? `${BASE_URL}/search?k=${encodeURIComponent(wd)}&t=${token}&page=${page}`
      : `${BASE_URL}/search?k=${encodeURIComponent(wd)}&t=${token}`;
    const html = await getCachedText(`dushe03:search:${wd}:${page}`, SEARCH_CACHE_TTL, () => requestText(url, { referer: `${BASE_URL}/` }));
    const list = parseSearchList(html);
    const pagecount = parsePageCount(html, page);
    await OmniBox.log("info", `[毒舌03][search] wd=${wd} page=${page} count=${list.length}`);
    return {
      page,
      pagecount,
      limit: list.length,
      total: list.length,
      list,
    };
  } catch (e) {
    await OmniBox.log("error", `[毒舌03][search] failed: ${e.message || e}`);
    return {
      page: Number(params.page || 1) || 1,
      pagecount: 1,
      limit: 0,
      total: 0,
      list: [],
    };
  }
}

async function play(params = {}) {
  try {
    const playId = String(params.playId || params.id || "").trim();
    if (!playId) return { parse: 0, url: "", urls: [], header: {} };

    if (/\.(m3u8|mp4)(\?|#|$)/i.test(playId)) {
      const url = resolvePlayUrl(playId);
      return { parse: 0, url, urls: [{ name: "播放", url }], header: {} };
    }

    const absolutePlayId = absUrl(playId);
    const sniffHeaders = { "User-Agent": UA, Referer: absolutePlayId || `${BASE_URL}/`, Origin: BASE_URL };
    const cacheKey = `dushe03:play:${playId}`;
    const resolved = await getCachedText(cacheKey, PLAY_CACHE_TTL, async () => {
      if (/\/play\//.test(absolutePlayId)) {
        const source = await resolvePlayPage(absolutePlayId, `${BASE_URL}/`);
        return JSON.stringify({ ...source, pageUrl: absolutePlayId });
      }
      if (/\/detail\//.test(absolutePlayId)) {
        const detailHtml = await requestText(absolutePlayId);
        const vod = parseDetail(detailHtml, absolutePlayId);
        const first = vod?.vod_play_sources?.[0]?.episodes?.[0]?.playId || "";
        if (first && first !== absolutePlayId) {
          if (/\.(m3u8|mp4)(\?|#|$)/i.test(first)) return JSON.stringify({ url: resolvePlayUrl(first), type: "", pageUrl: absolutePlayId });
          if (/\/play\//.test(first)) {
            const source = await resolvePlayPage(first, absolutePlayId);
            return JSON.stringify({ ...source, pageUrl: absUrl(first) });
          }
          return JSON.stringify({ url: first, type: "", pageUrl: absolutePlayId });
        }
      }
      return JSON.stringify({ url: "", type: "", pageUrl: absolutePlayId });
    });

    const parsed = (() => {
      try {
        return JSON.parse(String(resolved || "{}"));
      } catch (_) {
        return { url: String(resolved || ""), pageUrl: absolutePlayId };
      }
    })();

    if (parsed?.url) {
      const url = resolvePlayUrl(parsed.url);
      const pageUrl = absUrl(parsed.pageUrl || absolutePlayId);
      const directHeaders = /\.(m3u8|mp4)(\?|#|$)/i.test(url) ? { Referer: pageUrl || `${BASE_URL}/`, Origin: BASE_URL, "User-Agent": UA } : {};
      await OmniBox.log("info", `[毒舌03][play] resolved type=${parsed.type || "unknown"} url=${url} pageUrl=${pageUrl}`);
      if (/\.(m3u8|mp4)(\?|#|$)/i.test(url)) {
        return { parse: 0, url, urls: [{ name: "播放", url }], header: directHeaders };
      }
      const sniffResult = await trySniffVideo(url, { ...sniffHeaders, Referer: pageUrl || url, Origin: BASE_URL });
      if (sniffResult) return sniffResult;
      await OmniBox.log("warn", `[毒舌03][play] sdk sniff failed, fallback parse=1 url=${url}`);
      return buildAppSniffFallback(url, { ...sniffHeaders, Referer: pageUrl || url, Origin: BASE_URL });
    }

    const sniffResult = await trySniffVideo(absolutePlayId, sniffHeaders);
    if (sniffResult) return sniffResult;

    await OmniBox.log("warn", `[毒舌03][play] final fallback parse=1 url=${absolutePlayId}`);
    return buildAppSniffFallback(absolutePlayId, sniffHeaders);
  } catch (e) {
    await OmniBox.log("error", `[毒舌03][play] failed: ${e.message || e}`);
    return { parse: 0, url: "", urls: [], header: {} };
  }
}

});

_load(4, "荐片", function (module, exports, require) {
// @name 荐片APP
// @author 
// @description 刮削：支持，弹幕：支持，播放记录：支持，嗅探：支持
// @version 1.1.1
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/荐片.js
/**
 * ============================================================================
 * 荐片APP - OmniBox 爬虫脚本
 * ============================================================================
 *
 * 功能说明:
 * - 提供荐片视频APP源的 OmniBox 格式接口
 * - 支持分类浏览、搜索、详情、播放等功能
 * - 集成 Netflix 分类(放在分类列表最后)
 * - 自动屏蔽 FTP/边下边播线路,保留其他线路
 * - 搜索过滤功能,精准匹配搜索结果
 *
 * 主要特性:
 * 1. 分类支持:电影、电视剧、动漫、综艺、短剧、纪录片、Netflix
 * 2. 筛选功能:支持类型、地区、年份、排序等筛选条件
 * 3. 线路过滤:自动过滤包含"FTP"、"边下边播"、"VIP"关键字的线路
 * 4. 图片域名:自动处理图片 URL,支持多域名
 * 5. 搜索过滤:精准匹配结果,删除多余无关条目
 *
 * 日期:2025.02.27
 * ============================================================================
 */

const OmniBox = require("omnibox_sdk");

/**
 * 配置信息
 */
const jpConfig = {
  // 主 API 域名
  host: "https://h5.jianpianips1.com",
  // 图片域名
  imgHost: "https://img.ztfgh.com",
  // 请求头
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Origin': 'https://h5.jianpianips1.com',
    'Referer': 'https://h5.jianpianips1.com/'
  },
  // 超时时间(毫秒)
  timeout: 10000
};

// 播放请求头
const PLAY_HEADERS = {
  'User-Agent': jpConfig.headers['User-Agent'],
  'Referer': jpConfig.host,
  'Origin': jpConfig.host
};

// 弹幕API配置(目前仅预留)
const DANMU_API = process.env.DANMU_API || "";

/**
 * 分类映射表
 */
const categoryMap = {
  '1': '电影',
  '2': '电视剧',
  '3': '动漫',
  '4': '综艺',
  '67': '短剧',
  '50': '纪录片',
  'netflix': 'Netflix'
};

/**
 * 日志工具函数
 */
const logInfo = (message, data = null) => {
  if (data) {
    OmniBox.log("info", `[荐片APP] ${message}: ${JSON.stringify(data)}`);
  } else {
    OmniBox.log("info", `[荐片APP] ${message}`);
  }
};

const logError = (message, error) => {
  OmniBox.log("error", `[荐片APP] ${message}: ${error.message || error}`);
};

const logWarn = (message) => {
  OmniBox.log("warn", `[荐片APP] ${message}`);
};

/**
 * 元数据编解码，用于透传刮削/弹幕信息
 */
const encodeMeta = (obj) => {
  try {
    return Buffer.from(JSON.stringify(obj || {}), "utf8").toString("base64");
  } catch {
    return "";
  }
};

const decodeMeta = (str) => {
  try {
    const raw = Buffer.from(str || "", "base64").toString("utf8");
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
};

/**
 * 预处理标题,去掉常见干扰项
 */
function preprocessTitle(title) {
  if (!title) return "";
  return title
    .replace(/4[kK]|[xX]26[45]|720[pP]|1080[pP]|2160[pP]/g, " ")
    .replace(/[hH]\.?26[45]/g, " ")
    .replace(/BluRay|WEB-DL|HDR|REMUX/gi, " ")
    .replace(/\.mp4|\.mkv|\.avi|\.flv/gi, " ");
}

/**
 * 将中文数字转换为阿拉伯数字
 */
function chineseToArabic(cn) {
  const map = { '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };
  if (!isNaN(cn)) return parseInt(cn);
  if (cn.length === 1) return map[cn] || cn;
  if (cn.length === 2) {
    if (cn[0] === '十') return 10 + map[cn[1]];
    if (cn[1] === '十') return map[cn[0]] * 10;
  }
  if (cn.length === 3) return map[cn[0]] * 10 + map[cn[2]];
  return cn;
}

/**
 * 从标题中提取集数数字
 */
function extractEpisode(title) {
  if (!title) return "";

  const processedTitle = preprocessTitle(title).trim();

  // 1. 中文格式:第XX集/话
  const cnMatch = processedTitle.match(/第\s*([零一二三四五六七八九十0-9]+)\s*[集话章节回期]/);
  if (cnMatch) return String(chineseToArabic(cnMatch[1]));

  // 2. S01E03 格式
  const seMatch = processedTitle.match(/[Ss](?:\d{1,2})?[-._\s]*[Ee](\d{1,3})/i);
  if (seMatch) return seMatch[1];

  // 3. EP/E 格式
  const epMatch = processedTitle.match(/\b(?:EP|E)[-._\s]*(\d{1,3})\b/i);
  if (epMatch) return epMatch[1];

  // 4. 括号格式 [03]
  const bracketMatch = processedTitle.match(/[\[\(【(](\d{1,3})[\]\)】)]/);
  if (bracketMatch) {
    const num = bracketMatch[1];
    if (!["720", "1080", "480"].includes(num)) return num;
  }

  return "";
}

/**
 * 构建用于弹幕匹配的文件名(后续扩展)
 */
function buildFileNameForDanmu(vodName, episodeTitle) {
  if (!vodName) return "";

  if (!episodeTitle || episodeTitle === '正片' || episodeTitle === '播放') {
    return vodName;
  }

  const digits = extractEpisode(episodeTitle);
  if (digits) {
    const epNum = parseInt(digits, 10);
    if (epNum > 0) {
      if (epNum < 10) {
        return `${vodName} S01E0${epNum}`;
      } else {
        return `${vodName} S01E${epNum}`;
      }
    }
  }

  return vodName;
}

function buildScrapedEpisodeName(scrapeData, mapping, originalName) {
  if (!mapping || mapping.episodeNumber === 0 || (mapping.confidence && mapping.confidence < 0.5)) {
    return originalName;
  }
  const prefix = mapping.episodeNumber ? `第${mapping.episodeNumber}集 ` : "";
  if (mapping.episodeName) {
    const epName = `${prefix}${mapping.episodeName}`.trim();
    return epName;
  }
  if (scrapeData && Array.isArray(scrapeData.episodes)) {
    const hit = scrapeData.episodes.find(
      (ep) => ep.episodeNumber === mapping.episodeNumber && ep.seasonNumber === mapping.seasonNumber
    );
    if (hit?.name) {
      return `${prefix}${hit.name}`.trim();
    }
  }
  return originalName;
}

function buildHistoryEpisode(playId, episodeNumber, episodeName) {
  if (episodeNumber !== undefined && episodeNumber !== null && episodeNumber !== "") {
    return `${playId || ""}@@${episodeNumber}`;
  }
  if (episodeName) {
    return `${playId || ""}@@${episodeName}`;
  }
  return playId || "";
}

/**
 * 发送HTTP请求
 * @param {string} url - 请求URL
 * @param {Object} options - 请求选项
 * @returns {Promise<Object>} 响应数据
 */
async function request(url, options = {}) {
  try {
    const response = await OmniBox.request(url, {
      method: options.method || "GET",
      headers: options.headers || jpConfig.headers,
      timeout: options.timeout || jpConfig.timeout,
      body: options.body
    });

    if (response.statusCode !== 200) {
      throw new Error(`HTTP ${response.statusCode}: ${response.body}`);
    }

    return JSON.parse(response.body);
  } catch (error) {
    logError(`请求失败: ${url}`, error);
    throw error;
  }
}

/**
 * 获取完整图片 URL
 * @param {string} path - 图片路径
 * @returns {string} 完整图片 URL
 */
const getPicUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  return `${jpConfig.imgHost}${normalizedPath}`;
};

/**
 * 格式化视频列表数据
 * @param {Array} data - 原始数据
 * @returns {Array} 格式化后的列表
 */
const formatList = (data) => {
  if (!Array.isArray(data)) {
    logWarn('formatList 接收到的数据不是数组: ' + typeof data);
    return [];
  }

  return data.filter(i => i.id && String(i.id) !== '0').map(i => {
    const picPath = i.path || i.tvimg || i.tagimg || '';
    return {
      vod_id: String(i.id),
      vod_name: i.title || '未知标题',
      vod_pic: getPicUrl(picPath),
      vod_remarks: i.mask || (i.score ? `评分:${i.score}` : '')
    };
  });
};

/* ============================================================================
 * Netflix 相关功能
 * ============================================================================ */

/**
 * Netflix API 地址映射表
 */
const netflixApiMap = {
  hot_movie: 'https://api.zxfmj.com/api/dyTag/tpl1_data?id=70&page=',
  hot_tv: 'https://api.zxfmj.com/api/dyTag/tpl1_data?id=73&page=',
  hot_love: 'https://api.zxfmj.com/api/dyTag/tpl2_data?id=74&page=',
  hot_thriller: 'https://api.zxfmj.com/api/dyTag/tpl2_data?id=76&page=',
  hot_action: 'https://api.zxfmj.com/api/dyTag/tpl1_data?id=71&page=',
  top_movie: 'https://api.zxfmj.com/api/dyTag/tpl1_data?id=72&page=',
  classic_movie: 'https://api.zxfmj.com/api/special/detail?id=134',
  classic_tv: 'https://api.zxfmj.com/api/special/detail?id=131'
};

/**
 * 获取 Netflix 分类列表
 * @param {string} subType - 子分类类型
 * @param {number} page - 页码
 * @returns {Object} 列表数据
 */
const getNetflixList = async (subType, page = 1) => {
  try {
    logInfo('获取Netflix列表', { subType, page });

    const url = netflixApiMap[subType];
    if (!url) {
      logWarn(`未知的Netflix子类型: ${subType}`);
      return { list: [], page, pagecount: 1, total: 0 };
    }

    let fullUrl = url + page;
    // 经典分类不需要分页参数
    if (subType.startsWith('classic')) fullUrl = url;

    const res = await request(fullUrl);

    let data = res.data || [];
    if (!Array.isArray(data) && data.list) data = data.list;

    const list = data.map(item => ({
      vod_id: (item.id || item._id?.$oid)?.toString() + '@netflix',
      vod_name: item.title,
      vod_pic: getPicUrl(item.tvimg || item.path),
      vod_remarks: (item.mask || '') + (item.score ? ` ⭐${item.score}` : '')
    }));

    logInfo('Netflix列表获取成功', { count: list.length });

    return {
      list,
      page: parseInt(page),
      pagecount: list.length ? parseInt(page) + 1 : parseInt(page),
      limit: list.length,
      total: list.length ? 9999 : 0
    };
  } catch (e) {
    logError('Netflix列表获取失败', e);
    return { list: [], page: parseInt(page), pagecount: 1, limit: 0, total: 0 };
  }
};

/* ============================================================================
 * 首页和分类功能
 * ============================================================================ */

/**
 * 获取首页内容和分类
 * @returns {Object} 分类和筛选数据
 */
const getHomeContent = async () => {
  try {
    logInfo('========== 开始获取首页分类 ==========');

    const res = await request(`${jpConfig.host}/api/v2/settings/homeCategory`);

    if (res.code !== 1) {
      throw new Error(res.msg || '获取分类失败');
    }

    OmniBox.log('info', `[荐片APP] 分类数据: ${JSON.stringify({
      code: res.code,
      dataLength: res.data?.length
    })}`);

    const classes = [];
    const filters = {};

    // 先添加普通分类
    for (const item of res.data) {
      if (item.id === 88 || item.id === 99) continue;

      const tid = String(item.id);
      const tName = categoryMap[tid] || item.name;

      classes.push({ type_id: tid, type_name: tName });

      // 获取该分类的筛选选项
      try {
        OmniBox.log('info', `\n[荐片APP] ===== 获取分类[${tName}(${tid})]筛选选项 =====`);

        const filterUrl = `${jpConfig.host}/api/crumb/filterOptions?fcate_pid=${tid}`;
        OmniBox.log('info', `[荐片APP] 请求URL: ${filterUrl}`);

        const filterRes = await request(filterUrl);

        OmniBox.log('info', `[荐片APP] 响应code: ${filterRes.code}, hasData: ${!!filterRes.data}`);

        if (filterRes.code === 1 && filterRes.data && Array.isArray(filterRes.data)) {
          OmniBox.log('info', `[荐片APP] 筛选数据keys: ${JSON.stringify(filterRes.data.map(f => f.key))}`);

          const fts = [];
          const filterData = filterRes.data;

          // 类型筛选
          const typeFilter = filterData.find(f => f.key === 'type');
          if (typeFilter && typeFilter.data && Array.isArray(typeFilter.data)) {
            const options = typeFilter.data
              .map(t => ({ name: t.name, value: String(t.id) }))  // 改为 name/value
              .filter(t => t.name !== '全部');
            options.unshift({ name: '全部', value: '' });
            fts.push({
              name: '类型',
              key: 'type',
              init: '',  // 添加默认值
              value: options
            });
          }

          // 地区筛选
          const areaFilter = filterData.find(f => f.key === 'area');
          if (areaFilter && areaFilter.data && Array.isArray(areaFilter.data)) {
            const options = areaFilter.data
              .map(a => ({ name: a.name, value: String(a.id) }))  // 改为 name/value
              .filter(a => a.name !== '全部');
            options.unshift({ name: '全部', value: '' });
            fts.push({
              name: '地区',
              key: 'area',
              init: '',  // 添加默认值
              value: options
            });
          }

          // 年份筛选
          const yearFilter = filterData.find(f => f.key === 'year');
          if (yearFilter && yearFilter.data && Array.isArray(yearFilter.data)) {
            const options = yearFilter.data
              .map(y => ({ name: y.name, value: String(y.id) }))  // 改为 name/value
              .filter(y => y.name !== '全部');
            options.unshift({ name: '全部', value: '' });
            fts.push({
              name: '年份',
              key: 'year',
              init: '',  // 添加默认值
              value: options
            });
          }

          // 排序筛选
          const sortFilter = filterData.find(f => f.key === 'sort');
          if (sortFilter && sortFilter.data && Array.isArray(sortFilter.data)) {
            const options = sortFilter.data
              .map(s => ({ name: s.name, value: String(s.id) }))  // 改为 name/value
              .filter(s => s.name !== '全部');
            options.unshift({ name: '默认', value: '' });
            fts.push({
              name: '排序',
              key: 'sort',
              init: '',  // 添加默认值
              value: options
            });
          }

          if (fts.length > 0) {
            filters[tid] = fts;
            OmniBox.log('info', `[荐片APP] ✅ 分类[${tName}]筛选项已添加: ${fts.length}个`);
          }
        }
      } catch (e) {
        OmniBox.log('error', `[荐片APP] ❌ 获取分类[${tName}]筛选失败: ${e.message}`);
      }
    }

    // Netflix 分类
    classes.push({ type_id: 'netflix', type_name: 'Netflix' });
    filters['netflix'] = [{
      key: "cateId",
      name: "Netflix分类",
      value: [
        { n: "热播电影", v: "hot_movie" },
        { n: "热播电视剧", v: "hot_tv" },
        { n: "热播爱情片", v: "hot_love" },
        { n: "热播惊悚片", v: "hot_thriller" },
        { n: "热播动作片", v: "hot_action" },
        { n: "高分电影", v: "top_movie" },
        { n: "经典电影", v: "classic_movie" },
        { n: "经典电视剧", v: "classic_tv" }
      ]
    }];

    OmniBox.log('info', `[荐片APP] ========== 首页获取完成 ==========`);
    OmniBox.log('info', `[荐片APP] 分类数: ${classes.length}, 筛选项数: ${Object.keys(filters).length}`);

    return { class: classes, filters: filters };
  } catch (e) {
    OmniBox.log('error', `[荐片APP] ❌ 获取首页失败: ${e.message}`);
    return { class: [], filters: {} };
  }
};

/**
 * 获取首页数据
 */
async function home(params) {
  try {
    logInfo('处理首页请求');
    const homeData = await getHomeContent();
    const recommendList = await getRecommendList();

    OmniBox.log('info', `[荐片APP] 首页数据: classes=${homeData.class.length}, filters=${Object.keys(homeData.filters).length}, list=${recommendList.length}`);

    return {
      class: homeData.class,
      filters: homeData.filters,
      list: recommendList
    };
  } catch (error) {
    logError('获取首页数据失败', error);
    return {
      class: [],
      filters: {},
      list: []
    };
  }
}


/**
 * 获取分类视频列表
 * @param {string} tid - 分类 ID
 * @param {number} pg - 页码
 * @param {Object} extend - 扩展筛选参数
 * @returns {Object} 视频列表
 */
const getCategoryList = async (tid, pg = 1, extend = {}) => {
  try {
    logInfo('获取分类列表', { tid, pg, extend });

    const params = new URLSearchParams();
    params.append('fcate_pid', tid);
    params.append('page', pg);
    params.append('category_id', extend.type || '');
    params.append('area', extend.area || '');
    params.append('year', extend.year || '');
    params.append('type', '');
    params.append('sort', extend.sort || '');

    const res = await request(`${jpConfig.host}/api/crumb/list?${params.toString()}`);

    if (res.code !== 1) {
      throw new Error(res.msg || '获取列表失败');
    }

    const list = formatList(res.data);
    const hasMore = list.length >= 15;

    if (list.length > 0) {
      logInfo('列表首条数据图片', {
        name: list[0].vod_name,
        pic: list[0].vod_pic.substring(0, 80) + '...'
      });
    }

    logInfo('分类列表获取成功', { count: list.length, page: pg });

    return {
      list: list,
      page: parseInt(pg),
      pagecount: hasMore ? parseInt(pg) + 1 : parseInt(pg),
      limit: 15
    };
  } catch (e) {
    logError('获取分类列表失败', e);
    return { list: [], page: pg, pagecount: pg, limit: 15 };
  }
};

/**
 * 获取首页推荐视频
 * @returns {Array} 推荐视频列表
 */
const getRecommendList = async () => {
  try {
    logInfo('正在获取首页推荐');

    const res = await request(`${jpConfig.host}/api/dyTag/hand_data?category_id=88`);

    if (res.code !== 1 || !res.data) {
      logWarn('获取推荐数据失败或为空');
      return [];
    }

    let list = [];
    for (const key in res.data) {
      if (Array.isArray(res.data[key])) {
        list = list.concat(res.data[key]);
      }
    }

    const formatted = formatList(list);

    if (formatted.length > 0) {
      logInfo('推荐首条数据图片', {
        name: formatted[0].vod_name,
        pic: formatted[0].vod_pic.substring(0, 80) + '...'
      });
    }

    logInfo('首页推荐获取成功', { count: formatted.length });
    return formatted;
  } catch (e) {
    logError('获取首页推荐失败', e);
    return [];
  }
};

/**
 * 搜索视频
 * @param {string} wd - 搜索关键词
 * @param {number} pg - 页码
 * @returns {Object} 搜索结果
 */
const searchVod = async (wd, pg = 1) => {
  try {
    logInfo('执行搜索', { keyword: wd, page: pg });

    const params = new URLSearchParams();
    params.append('keyword', wd);
    params.append('page', pg);

    const res = await request(`${jpConfig.host}/api/v2/search/videoV2?key=${params.toString()}`);

    if (res.code !== 1) {
      logWarn('搜索接口返回错误: ' + res.msg);
      return { list: [], page: pg, pagecount: pg };
    }

    // 原始格式化
    let list = formatList(res.data);

    // =========================
    // 🔍 搜索词二次过滤(核心)
    // =========================
    const keyword = String(wd).trim().toLowerCase();

    list = list.filter(item => {
      const name = (item.vod_name || item.name || item.title || '').toLowerCase();
      return name.includes(keyword);
    });

    const hasMore = list.length >= 15;

    logInfo('搜索完成(已过滤)', {
      keyword: wd,
      count: list.length
    });

    return {
      list,
      page: parseInt(pg),
      pagecount: hasMore ? parseInt(pg) + 1 : parseInt(pg)
    };
  } catch (e) {
    logError('搜索失败', e);
    return { list: [], page: pg, pagecount: pg };
  }
};

/* ============================================================================
 * 详情和播放功能
 * ============================================================================ */

/**
 * 检查线路是否需要屏蔽
 * 屏蔽包含 VIP、FTP、常规 关键字的线路
 * @param {string} sourceName - 线路名称
 * @returns {boolean} 是否屏蔽
 */
const shouldBlockSource = (sourceName) => {
  if (!sourceName) return false;
  const name = sourceName.toLowerCase();
  return name.includes('vip') ||
    name.includes('ftp') ||
    name === '常规线路' ||
    name === '常规';
};

/**
 * 将旧格式的播放源转换为新格式(vod_play_sources)
 * @param {Array} sourceListSource - 原始播放源列表
 * @param {string} vodId - 视频ID
 * @returns {Array} 新格式的播放源列表
 */
function convertToPlaySources(sourceListSource, vodId, vodName = "") {
  const playSources = [];

  if (!sourceListSource || !Array.isArray(sourceListSource)) {
    return playSources;
  }

  for (const source of sourceListSource) {
    // 跳过需要屏蔽的线路
    if (shouldBlockSource(source.name)) {
      logInfo(`屏蔽线路: ${source.name}`);
      continue;
    }

    if (source.source_list && source.source_list.length > 0) {
      const episodes = source.source_list.map((item, index) => {
        const episodeName = item.source_name || `第${index + 1}集`;
        const fid = `${vodId}#${source.name || "线路"}#${index}`;
        const safeUrl = encodeURIComponent(item.url || "");
        const playId = `${safeUrl}|||${encodeMeta({ sid: vodId, fid, v: vodName || "", e: episodeName })}`;
        return {
          name: episodeName,
          playId
        };
      });

      playSources.push({
        name: source.name,
        episodes: episodes
      });
    }
  }

  return playSources;
}

/**
 * 嗅探播放页，兜底提取真实视频地址
 */
const sniffJianpianPlay = async (playUrl) => {
  if (!playUrl) return null;
  try {
    logInfo("尝试嗅探播放页", playUrl);
    const sniffed = await OmniBox.sniffVideo(playUrl);
    if (sniffed && sniffed.url) {
      logInfo("嗅探成功", sniffed.url);
      return {
        urls: [{ name: "嗅探线路", url: sniffed.url }],
        parse: 0,
        header: sniffed.header || { ...PLAY_HEADERS, "Referer": playUrl }
      };
    }
  } catch (error) {
    logInfo(`嗅探失败: ${error.message}`);
  }
  return null;
};

/**
 * 获取视频详情
 * @param {string} ids - 视频 ID(可能包含 @netflix 后缀)
 * @returns {Object} 详情数据
 */
const getDetail = async (ids) => {
  try {
    logInfo('获取详情', { id: ids });

    // 处理 Netflix 类型的详情(移除 @netflix 后缀)
    const realId = ids.replace('@netflix', '');

    const res = await request(`${jpConfig.host}/api/video/detailv2?id=${realId}`);

    if (res.code !== 1 || !res.data) {
      throw new Error(res.msg || '获取详情失败');
    }

    const v = res.data;

    const picPath = v.tvimg || v.thumbnail || v.path || '';
    const fullPicUrl = getPicUrl(picPath);

    logInfo('详情图片处理', {
      original: picPath.substring(0, 50),
      full: fullPicUrl.substring(0, 80)
    });

    // 转换为新格式的播放源
    const vodPlaySources = convertToPlaySources(v.source_list_source, realId, v.title || "");

    // 刮削处理
    let scrapeData = null;
    let videoMappings = [];
    let scrapeType = "";
    const scrapeCandidates = [];
    for (const source of vodPlaySources) {
      for (const ep of source.episodes || []) {
        const metaPart = (ep.playId || "").split('|||')[1] || "";
        const meta = decodeMeta(metaPart);
        const fid = meta?.fid || ep.playId;
        if (!fid) continue;
        scrapeCandidates.push({
          fid,
          file_id: fid,
          file_name: ep.name || "正片",
          name: ep.name || "正片",
          format_type: "video"
        });
      }
    }

    if (scrapeCandidates.length > 0) {
      try {
        const scrapingResult = await OmniBox.processScraping(realId, v.title || "", v.title || "", scrapeCandidates);
        OmniBox.log("info", `[荐片APP] 刮削处理完成,结果: ${JSON.stringify(scrapingResult || {}).substring(0, 200)}`);
        const metadata = await OmniBox.getScrapeMetadata(realId);
        scrapeData = metadata?.scrapeData || null;
        videoMappings = metadata?.videoMappings || [];
        scrapeType = metadata?.scrapeType || "";
      } catch (error) {
        logError("刮削处理失败", error);
      }
    }

    for (const source of vodPlaySources) {
      for (const ep of source.episodes || []) {
        const metaPart = (ep.playId || "").split('|||')[1] || "";
        const meta = decodeMeta(metaPart);
        const fid = meta?.fid;
        if (!fid) continue;
        const mapping = videoMappings.find((m) => m?.fileId === fid);
        if (!mapping) continue;
        const oldName = ep.name;
        const newName = buildScrapedEpisodeName(scrapeData, mapping, oldName);
        if (newName && newName !== oldName) {
          ep.name = newName;
          OmniBox.log("info", `[荐片APP] 应用刮削后源文件名: ${oldName} -> ${newName}`);
        }
        meta.e = ep.name;
        meta.s = mapping.seasonNumber;
        meta.n = mapping.episodeNumber;
        ep.playId = `${(ep.playId || "").split('|||')[0]}|||${encodeMeta(meta)}`;
      }

      const hasEpisodeNumber = (source.episodes || []).some(
        (ep) => {
          const metaPart = (ep.playId || "").split('|||')[1] || "";
          const meta = decodeMeta(metaPart);
          return meta?.n !== undefined && meta?.n !== null;
        }
      );
      if (hasEpisodeNumber) {
        source.episodes.sort((a, b) => {
          const metaA = decodeMeta((a.playId || "").split('|||')[1] || "");
          const metaB = decodeMeta((b.playId || "").split('|||')[1] || "");
          const seasonA = metaA?.s || 0;
          const seasonB = metaB?.s || 0;
          if (seasonA !== seasonB) return seasonA - seasonB;
          const episodeA = metaA?.n || 0;
          const episodeB = metaB?.n || 0;
          return episodeA - episodeB;
        });
      }
    }

    logInfo('详情获取成功', {
      name: v.title,
      pic: fullPicUrl.substring(0, 50) + '...',
      sourcesCount: vodPlaySources.length
    });

    return {
      list: [{
        vod_id: ids,
        vod_name: scrapeData?.title || v.title || '未知标题',
        vod_pic: scrapeData?.posterPath ? `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}` : fullPicUrl,
        vod_content: scrapeData?.overview || v.description || '',
        vod_play_sources: vodPlaySources.length > 0 ? vodPlaySources : undefined,
        vod_remarks: v.mask || (v.score ? `评分:${v.score}` : ''),
        vod_year: v.year || '',
        vod_area: v.area || '',
        vod_actor: v.actors ? v.actors.map(a => a.name).join(' ') : '',
        vod_douban_score: v.score || ''
      }]
    };
  } catch (e) {
    logError('获取详情失败', e);
    return { list: [] };
  }
};

/**
 * 处理播放请求
 * @param {string} playId - 播放地址
 * @returns {Object} 播放信息
 */
const handlePlay = async (playId, vodId = "", context = {}) => {
  try {
    logInfo('处理播放请求', { url: playId.substring(0, 50) + '...' });

    const from = context?.from || "web";
    const isWeb = from === "web";

    let rawPlayId = playId;
    let playMeta = {};
    let vodName = "";
    let episodeName = "";

    // 解析透传参数
    if (rawPlayId && rawPlayId.includes('|||')) {
      const [mainPlayId, metaB64] = rawPlayId.split('|||');
      rawPlayId = mainPlayId;
      playMeta = decodeMeta(metaB64 || "");
      vodName = playMeta.v || "";
      episodeName = playMeta.e || "";
      logInfo(`解析透传信息 - 视频: ${vodName}, 集数: ${episodeName}`);
    }

    try {
      rawPlayId = decodeURIComponent(rawPlayId || "");
    } catch (error) {
      logInfo(`playId 解码失败，按原值继续: ${error.message}`);
    }

    const videoIdForScrape = vodId ? String(vodId).replace('@netflix', '') : (playMeta?.sid ? String(playMeta.sid) : "");

    const playInfoPromise = (async () => {
      const isDirectPlayable = rawPlayId && rawPlayId.match(/\.(m3u8|mp4|flv|avi|mkv|ts)/i);
      if (isDirectPlayable) {
        return {
          urls: [{ name: "直接播放", url: rawPlayId }],
          parse: 0,
          header: isWeb ? {} : PLAY_HEADERS
        };
      }

      const sniffResult = await sniffJianpianPlay(rawPlayId);
      if (sniffResult) {
        if (isWeb) {
          return {
            ...sniffResult,
            header: {}
          };
        }
        return sniffResult;
      }

      return {
        urls: [{ name: "播放", url: rawPlayId }],
        parse: 1,
        header: isWeb ? {} : PLAY_HEADERS
      };
    })();

    const metadataPromise = (async () => {
      const result = {
        danmakuList: [],
        scrapeTitle: "",
        scrapePic: "",
        episodeNumber: playMeta?.n ?? null,
        episodeName: episodeName || ""
      };

      if (!videoIdForScrape) {
        logInfo("播放增强链路跳过: videoIdForScrape 为空");
        return result;
      }

      try {
        const metadata = await OmniBox.getScrapeMetadata(videoIdForScrape);
        if (!metadata || !metadata.scrapeData) {
          logInfo(`播放增强链路跳过: metadata 不完整, videoId=${videoIdForScrape}`);
          return result;
        }

        result.scrapeTitle = metadata.scrapeData.title || "";
        if (metadata.scrapeData.posterPath) {
          result.scrapePic = `https://image.tmdb.org/t/p/w500${metadata.scrapeData.posterPath}`;
        }

        const mappings = Array.isArray(metadata.videoMappings) ? metadata.videoMappings : [];
        logInfo(`播放增强链路读取元数据成功: videoId=${videoIdForScrape}, mappings=${mappings.length}, scrapeType=${metadata.scrapeType || "unknown"}`);
        const mapping = mappings.find((m) => m?.fileId === playMeta?.fid);
        if (mapping) {
          if (mapping.episodeName) {
            result.episodeName = buildScrapedEpisodeName(metadata.scrapeData, mapping, result.episodeName || episodeName || "");
          }
          if (mapping.episodeNumber !== undefined && mapping.episodeNumber !== null) {
            result.episodeNumber = mapping.episodeNumber;
          }
        } else if (mappings.length > 0) {
          logInfo(`播放增强链路未命中 mapping: fid=${playMeta?.fid || ""}`);
        }

        vodName = result.scrapeTitle || vodName;
        episodeName = result.episodeName || episodeName;
        const scrapedDanmuFileName = buildFileNameForDanmu(vodName, episodeName);
        if (scrapedDanmuFileName && typeof OmniBox.getDanmakuByFileName === "function") {
          const matchedDanmaku = await OmniBox.getDanmakuByFileName(scrapedDanmuFileName);
          const count = Array.isArray(matchedDanmaku) ? matchedDanmaku.length : 0;
          logInfo(`播放增强链路弹幕匹配结果: fileName=${scrapedDanmuFileName}, count=${count}`);
          if (count > 0) {
            result.danmakuList = matchedDanmaku;
          }
        }
      } catch (error) {
        logInfo(`读取刮削元数据失败: ${error.message}`);
      }

      return result;
    })();

    const [playInfoResult, metadataResult] = await Promise.allSettled([playInfoPromise, metadataPromise]);

    if (playInfoResult.status !== "fulfilled") {
      throw playInfoResult.reason || new Error("播放主链路失败");
    }

    const playResult = playInfoResult.value || { urls: [], parse: 0, header: {} };

    let danmakuList = [];
    let scrapeTitle = "";
    let scrapePic = "";
    let episodeNumber = playMeta?.n ?? null;
    if (metadataResult.status === "fulfilled" && metadataResult.value) {
      danmakuList = metadataResult.value.danmakuList || [];
      scrapeTitle = metadataResult.value.scrapeTitle || "";
      scrapePic = metadataResult.value.scrapePic || "";
      if (metadataResult.value.episodeNumber !== undefined && metadataResult.value.episodeNumber !== null) {
        episodeNumber = metadataResult.value.episodeNumber;
      }
      episodeName = metadataResult.value.episodeName || episodeName;
      vodName = scrapeTitle || vodName;
    } else if (metadataResult.status === "rejected") {
      logInfo(`播放增强链路失败(不影响播放): ${metadataResult.reason?.message || metadataResult.reason}`);
    }

    if (videoIdForScrape && context?.sourceId && typeof OmniBox.addPlayHistory === "function") {
      const historyPayload = {
        vodId: videoIdForScrape,
        title: scrapeTitle || vodName || playMeta.v || "荐片视频",
        pic: scrapePic || "",
        episode: buildHistoryEpisode(rawPlayId, episodeNumber, episodeName),
        sourceId: context.sourceId,
        episodeNumber: episodeNumber,
        episodeName: episodeName || ""
      };
      OmniBox.addPlayHistory(historyPayload)
        .then((added) => {
          if (added) {
            logInfo(`已添加播放记录: ${historyPayload.title}`);
          } else {
            logInfo(`播放记录已存在，跳过添加: ${historyPayload.title}`);
          }
        })
        .catch((error) => {
          logInfo(`添加播放记录失败: ${error.message}`);
        });
    } else {
      logInfo(`跳过播放记录: sourceId=${context?.sourceId || ""}, hasApi=${typeof OmniBox.addPlayHistory === "function"}`);
    }

    if (danmakuList.length > 0) {
      playResult.danmaku = danmakuList;
    }

    return playResult;
  } catch (e) {
    logError('处理播放失败', e);
    return {
      urls: [],
      parse: 0,
      header: {}
    };
  }
};

/* ============================================================================
 * OmniBox 接口实现
 * ============================================================================ */

/**
 * 获取首页数据
 * @param {Object} params - 参数对象
 * @returns {Object} 返回分类列表和推荐视频列表
 */
async function home(params) {
  try {
    logInfo('处理首页请求');
    const homeData = await getHomeContent();
    const recommendList = await getRecommendList();

    logInfo('首页数据组装完成', {
      classCount: homeData.class.length,
      recommendCount: recommendList.length
    });

    return {
      class: homeData.class,
      filters: homeData.filters,
      list: recommendList
    };
  } catch (error) {
    logError('获取首页数据失败', error);
    return {
      class: [],
      filters: {},
      list: []
    };
  }
}

/**
 * 获取分类数据
 */
async function category(params) {
  try {
    const categoryId = params.categoryId;
    const page = params.page || 1;
    const filters = params.filters || {};

    if (!categoryId) {
      throw new Error("分类ID不能为空");
    }

    logInfo(`获取分类数据: categoryId=${categoryId}, page=${page}`);

    // 处理 Netflix 分类
    if (categoryId === 'netflix') {
      let subType = filters.cateId || 'hot_movie';
      const result = await getNetflixList(subType, page);

      // 只在第一页返回筛选选项
      if (page === 1) {
        result.filters = [
          {
            key: "cateId",
            name: "Netflix分类",
            value: [
              { n: "热播电影", v: "hot_movie" },
              { n: "热播电视剧", v: "hot_tv" },
              { n: "热播爱情片", v: "hot_love" },
              { n: "热播惊悚片", v: "hot_thriller" },
              { n: "热播动作片", v: "hot_action" },
              { n: "高分电影", v: "top_movie" },
              { n: "经典电影", v: "classic_movie" },
              { n: "经典电视剧", v: "classic_tv" }
            ]
          }
        ];
      }

      return result;
    }

    // 处理普通分类
    const result = await getCategoryList(categoryId, page, filters);

    return result;
  } catch (error) {
    logError('获取分类数据失败', error);
    return {
      page: 1,
      pagecount: 0,
      total: 0,
      list: []
    };
  }
}

/**
 * 获取视频详情
 * @param {Object} params - 参数对象
 *   - videoId: 视频ID(必填)
 * @returns {Object} 返回视频详情
 */
async function detail(params) {
  try {
    const videoId = params.videoId;

    if (!videoId) {
      throw new Error("视频ID不能为空");
    }

    logInfo(`获取视频详情: videoId=${videoId}`);

    return await getDetail(videoId);
  } catch (error) {
    logError('获取视频详情失败', error);
    return {
      list: []
    };
  }
}

/**
 * 搜索视频
 * @param {Object} params - 参数对象
 *   - keyword: 搜索关键词(必填)
 *   - page: 页码(可选,默认1)
 * @returns {Object} 返回搜索结果
 */
async function search(params) {
  try {
    const keyword = params.keyword || params.wd || "";
    const page = params.page || 1;

    if (!keyword) {
      return {
        page: 1,
        pagecount: 0,
        total: 0,
        list: []
      };
    }

    logInfo(`搜索视频: keyword=${keyword}, page=${page}`);

    return await searchVod(keyword, page);
  } catch (error) {
    logError('搜索视频失败', error);
    return {
      page: 1,
      pagecount: 0,
      total: 0,
      list: []
    };
  }
}

/**
 * 获取播放地址
 * @param {Object} params - 参数对象
 *   - playId: 播放地址ID(必填)
 *   - flag: 播放源标识(可选)
 * @returns {Object} 返回播放地址信息
 */
async function play(params, context) {
  try {
    const playId = params.playId;
    const vodId = params.vodId || "";

    if (!playId) {
      throw new Error("播放地址ID不能为空");
    }

    logInfo(`获取播放地址: playId=${playId}`);

    return await handlePlay(playId, vodId, context);
  } catch (error) {
    logError('获取播放地址失败', error);
    return {
      urls: [],
      parse: 0,
      header: {}
    };
  }
}

// 导出接口
module.exports = {
  home,
  category,
  search,
  detail,
  play
};

// 使用 OmniBox runner
const runner = require("spider_runner");
runner.run(module.exports);

});
