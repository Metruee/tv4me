// @name 影视采集B(合并11源)
// @version 2.20261030.1
// @description 合并可用采集站 11 个
// @downloadURL https://gh-proxy.com/https://raw.githubusercontent.com/Metruee/tv4me/main/spiders/omnibox-采集B.js
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


_load(0, "123TV", function (module, exports, require) {
// @name 123TV
// @author 
// @description 刮削：支持，弹幕：支持，嗅探：支持，广告：菠菜
// @dependencies: axios
// @version 1.0.5
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/123TV.js

/**
 * ============================================================================
 * 123TV
 * 刮削：支持
 * 弹幕：支持
 * 嗅探：支持
 * ============================================================================
 */
const axios = require("axios");
const https = require("https");
const OmniBox = require("omnibox_sdk");

// ========== 全局配置 ==========
const host = 'https://a123tv.com';
const def_headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    'Accept': '*/*'
};

const axiosInstance = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    timeout: 15000
});

// 弹幕API配置
const DANMU_API = process.env.DANMU_API || '';

/**
 * 日志工具函数
 */
const logInfo = (message, data = null) => {
    const output = data ? `${message}: ${JSON.stringify(data)}` : message;
    OmniBox.log("info", `[123TV-DEBUG] ${output}`);
};

const logError = (message, error) => {
    OmniBox.log("error", `[123TV-DEBUG] ${message}: ${error.message || error}`);
};

const encodeMeta = (obj) => {
    try {
        return Buffer.from(JSON.stringify(obj || {}), 'utf8').toString('base64');
    } catch (_) {
        return '';
    }
};

const decodeMeta = (str) => {
    try {
        return JSON.parse(Buffer.from(str || '', 'base64').toString('utf8'));
    } catch (_) {
        return null;
    }
};

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

// ========== 弹幕相关函数 ==========

/**
 * 预处理标题,去掉常见干扰项
 */
function preprocessTitle(title) {
    if (!title) return '';
    return title
        .replace(/4[kK]|[xX]26[45]|720[pP]|1080[pP]|2160[pP]/g, ' ')
        .replace(/[hH]\.?26[45]/g, ' ')
        .replace(/BluRay|WEB-DL|HDR|REMUX/gi, ' ')
        .replace(/\.mp4|\.mkv|\.avi|\.flv/gi, ' ');
}

/**
 * 将中文数字转换为阿拉伯数字
 */
function chineseToArabic(cn) {
    const map = { '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };
    if (!isNaN(cn)) return parseInt(cn, 10);
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
    if (!title) return '';
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
        if (!['720', '1080', '480'].includes(num)) return num;
    }

    return '';
}

/**
 * 构建用于弹幕匹配的文件名
 */
function buildFileNameForDanmu(vodName, episodeTitle) {
    if (!vodName) return '';
    if (!episodeTitle || episodeTitle === '正片' || episodeTitle === '播放') {
        return vodName;
    }
    const digits = extractEpisode(episodeTitle);
    if (digits) {
        const epNum = parseInt(digits, 10);
        if (epNum > 0) {
            return epNum < 10 ? `${vodName} S01E0${epNum}` : `${vodName} S01E${epNum}`;
        }
    }
    return vodName;
}

function buildScrapedDanmuFileName(scrapeData, scrapeType, mapping, fallbackVodName, fallbackEpisodeName) {
    if (!scrapeData) {
        return buildFileNameForDanmu(fallbackVodName, fallbackEpisodeName);
    }
    if (scrapeType === 'movie') {
        return scrapeData.title || fallbackVodName;
    }
    const title = scrapeData.title || fallbackVodName;
    const seasonAirYear = scrapeData.seasonAirYear || '';
    const seasonNumber = mapping?.seasonNumber || 1;
    const episodeNumber = mapping?.episodeNumber || 1;
    return `${title}.${seasonAirYear}.S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}`;
}

/**
 * 匹配弹幕
 */
async function matchDanmu(fileName) {
    if (!DANMU_API || !fileName) return [];
    try {
        logInfo(`匹配弹幕: ${fileName}`);
        const matchUrl = `${DANMU_API}/api/v2/match`;
        const response = await OmniBox.request(matchUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            body: JSON.stringify({ fileName })
        });

        if (response.statusCode !== 200) {
            logInfo(`弹幕匹配失败: HTTP ${response.statusCode}`);
            return [];
        }

        const matchData = JSON.parse(response.body || '{}');
        if (!matchData.isMatched) {
            logInfo('弹幕未匹配到');
            return [];
        }

        const matches = matchData.matches || [];
        if (matches.length === 0) return [];

        const firstMatch = matches[0];
        const episodeId = firstMatch.episodeId;
        const animeTitle = firstMatch.animeTitle || '';
        const episodeTitle = firstMatch.episodeTitle || '';
        if (!episodeId) return [];

        let danmakuName = '弹幕';
        if (animeTitle && episodeTitle) danmakuName = `${animeTitle} - ${episodeTitle}`;
        else if (animeTitle) danmakuName = animeTitle;
        else if (episodeTitle) danmakuName = episodeTitle;

        const danmakuURL = `${DANMU_API}/api/v2/comment/${episodeId}?format=xml`;
        logInfo(`弹幕匹配成功: ${danmakuName}`);
        return [{ name: danmakuName, url: danmakuURL }];
    } catch (error) {
        logInfo(`弹幕匹配失败: ${error.message}`);
        return [];
    }
}

/**
 * 图像地址修复
 */
const fixPicUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return url.startsWith('//') ? `https:${url}` : `https://${url}`;
};

/**
 * 嗅探播放页，兜底提取真实视频地址
 */
const sniff123tvPlay = async (playUrl) => {
    if (!playUrl) return null;
    try {
        logInfo("尝试嗅探播放页", playUrl);
        const sniffed = await OmniBox.sniffVideo(playUrl);
        if (sniffed && sniffed.url) {
            logInfo("嗅探成功", sniffed.url);
            return {
                urls: [{ name: "嗅探线路", url: sniffed.url }],
                parse: 0,
                header: sniffed.header || { ...def_headers, Referer: playUrl }
            };
        }
    } catch (error) {
        logInfo(`嗅探失败: ${error.message}`);
    }
    return null;
};

/**
 * 核心:解析 CMS 字符串为结构化播放源 [1]
 * T3格式转T4格式的关键函数
 */
const parsePlaySources = (fromStr, urlStr, videoId = '', vodName = '') => {
    logInfo("开始解析播放源字符串", { from: fromStr, url: urlStr });
    const playSources = [];
    if (!fromStr || !urlStr) return playSources;

    const froms = fromStr.split('$$$');
    const urls = urlStr.split('$$$');

    for (let i = 0; i < froms.length; i++) {
        const sourceName = froms[i] || `线路${i + 1}`;
        const sourceItems = urls[i] ? urls[i].split('#') : [];

        const episodes = sourceItems.map((item, episodeIndex) => {
            const parts = item.split('$');
            const episodeName = parts[0] || '正片';
            const rawPlayId = parts[1] || parts[0];
            const fid = `${videoId}#${i}#${episodeIndex}`;
            const playMeta = {
                sid: videoId,
                fid,
                v: vodName,
                e: episodeIndex + 1
            };
            return {
                name: episodeName,
                playId: `${rawPlayId}|||${encodeMeta(playMeta)}`,
                _fid: fid,
                _rawName: episodeName
            };
        }).filter(e => e.playId);

        if (episodes.length > 0) {
            playSources.push({
                name: sourceName,
                episodes: episodes
            });
        }
    }
    logInfo("播放源解析结果", playSources);
    return playSources;
};

const buildPosterUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `https://image.tmdb.org/t/p/w500${path}`;
};

/**
 * 首页接口 [2]
 */
async function home(params) {
    logInfo("进入首页");

    try {
        const res = await axiosInstance.get(host, { headers: def_headers });
        const html = res.data;

        // 解析视频列表
        const regex = /<a class="w4-item" href="([^"]+)".*?<img.*?data-src="([^"]+)".*?<div class="s">.*?<span>([^<]+)<\/span>.*?<div class="t"[^>]*title="([^"]+)">.*?<div class="i">([^<]+)<\/div>/gs;
        const videos = [];
        let match;

        while ((match = regex.exec(html)) !== null) {
            videos.push({
                vod_id: match[1],
                vod_name: match[4].trim(),
                vod_pic: fixPicUrl(match[2]),
                vod_remarks: match[3].trim()
            });
        }

        return {
            page: 1,
            total: videos.length,
            list: videos,

            class: [
                { 'type_id': '10', 'type_name': '电影' },
                { 'type_id': '11', 'type_name': '连续剧' },
                { 'type_id': '12', 'type_name': '综艺' },
                { 'type_id': '13', 'type_name': '动漫' },
                // { 'type_id': '15', 'type_name': '福利' }
            ],
            filters: {
                '10': [{
                    "key": "class", "name": "类型", "value": [
                        { "name": "全部", "value": "" }, { "name": "动作片", "value": "1001" }, { "name": "喜剧片", "value": "1002" },
                        { "name": "爱情片", "value": "1003" }, { "name": "科幻片", "value": "1004" }, { "name": "恐怖片", "value": "1005" },
                        { "name": "剧情片", "value": "1006" }, { "name": "战争片", "value": "1007" }, { "name": "纪录片", "value": "1008" },
                        { "name": "动漫电影", "value": "1010" }, { "name": "奇幻片", "value": "1011" }, { "name": "动画片", "value": "1013" },
                        { "name": "犯罪片", "value": "1014" }, { "name": "悬疑片", "value": "1016" }, { "name": "邵氏电影", "value": "1019" },
                        { "name": "歌舞片", "value": "1022" }, { "name": "家庭片", "value": "1024" }, { "name": "古装片", "value": "1025" },
                        { "name": "历史片", "value": "1026" }, { "name": "4K电影", "value": "1027" }
                    ]
                }],
                '11': [{
                    "key": "class", "name": "地区", "value": [
                        { "name": "全部", "value": "" }, { "name": "国产剧", "value": "1101" }, { "name": "香港剧", "value": "1102" },
                        { "name": "台湾剧", "value": "1105" }, { "name": "韩国剧", "value": "1103" }, { "name": "欧美剧", "value": "1104" },
                        { "name": "日本剧", "value": "1106" }, { "name": "泰国剧", "value": "1108" }, { "name": "港台剧", "value": "1110" },
                        { "name": "日韩剧", "value": "1111" }, { "name": "海外剧", "value": "1107" }
                    ]
                }],
                '12': [{
                    "key": "class", "name": "类型", "value": [
                        { "name": "全部", "value": "" }, { "name": "内地综艺", "value": "1201" }, { "name": "港台综艺", "value": "1202" },
                        { "name": "日韩综艺", "value": "1203" }, { "name": "欧美综艺", "value": "1204" }, { "name": "国外综艺", "value": "1205" }
                    ]
                }],
                '13': [{
                    "key": "class", "name": "类型", "value": [
                        { "name": "全部", "value": "" }, { "name": "国产动漫", "value": "1301" }, { "name": "日韩动漫", "value": "1302" },
                        { "name": "欧美动漫", "value": "1303" }, { "name": "海外动漫", "value": "1305" }, { "name": "里番", "value": "1307" }
                    ]
                }],
                '15': [{
                    "key": "class", "name": "分类", "value": [
                        { "name": "全部", "value": "" }, { "name": "韩国情色片", "value": "1551" }, { "name": "日本情色片", "value": "1552" },
                        { "name": "大陆情色片", "value": "1555" }, { "name": "香港情色片", "value": "1553" }, { "name": "台湾情色片", "value": "1554" },
                        { "name": "美国情色片", "value": "1556" }, { "name": "欧洲情色片", "value": "1557" }, { "name": "印度情色片", "value": "1558" },
                        { "name": "东南亚情色片", "value": "1559" }, { "name": "其它情色片", "value": "1550" }
                    ]
                }]
            }
        };
    } catch (e) {
        logError("分类请求失败", e);
        return { list: [], page: 1, pagecount: 0 };
    }
}

/**
 * 分类接口 [2]
 */
async function category(params) {
    const { categoryId, page, filters } = params;
    const pg = parseInt(page) || 1;

    // 处理筛选参数
    let tid = categoryId;
    if (filters && filters.class) {
        tid = filters.class;
    }

    const url = pg === 1
        ? `${host}/t/${tid}.html`
        : `${host}/t/${tid}/p${pg}.html`;

    logInfo(`请求分类: ${tid}, 页码: ${pg}, URL: ${url}`);

    try {
        const res = await axiosInstance.get(url, { headers: def_headers });
        const html = res.data;

        // 解析视频列表
        const regex = /<a class="w4-item" href="([^"]+)".*?<img.*?data-src="([^"]+)".*?<div class="s">.*?<span>([^<]+)<\/span>.*?<div class="t"[^>]*title="([^"]+)">.*?<div class="i">([^<]+)<\/div>/gs;
        const videos = [];
        let match;

        while ((match = regex.exec(html)) !== null) {
            videos.push({
                vod_id: match[1],
                vod_name: match[4].trim(),
                vod_pic: fixPicUrl(match[2]),
                vod_remarks: match[3].trim()
            });
        }

        // 解析总页数
        const pageRegex = /\/p(\d+)\.html"[^>]*>(\d+)<\/a>/g;
        let maxPage = pg;
        let pageMatch;
        while ((pageMatch = pageRegex.exec(html)) !== null) {
            maxPage = Math.max(maxPage, parseInt(pageMatch[2]));
        }

        logInfo(`分类结果: ${videos.length}条, 总页数: ${maxPage}`);

        return {
            list: videos,
            page: pg,
            pagecount: maxPage
        };
    } catch (e) {
        logError("分类请求失败", e);
        return { list: [], page: pg, pagecount: 0 };
    }
}

/**
 * 搜索接口 [2]
 */
async function search(params) {
    const wd = params.keyword || params.wd || "";
    const pg = parseInt(params.page) || 1;

    const encodedKw = encodeURIComponent(wd);
    const url = pg === 1
        ? `${host}/s/${encodedKw}.html`
        : `${host}/s/${encodedKw}/p${pg}.html`;

    logInfo(`搜索关键词: ${wd}, 页码: ${pg}, URL: ${url}`);

    try {
        const res = await axiosInstance.get(url, { headers: def_headers });
        const html = res.data;

        // 解析搜索结果
        const regex = /<a class="w4-item" href="([^"]+)".*?<img.*?data-src="([^"]+)".*?<div class="t"[^>]*>([^<]+)<\/div>.*?<div class="i">([^<]+)<\/div>/gs;
        const videos = [];
        let match;

        while ((match = regex.exec(html)) !== null) {
            videos.push({
                vod_id: match[1],
                vod_name: match[3].trim(),
                vod_pic: fixPicUrl(match[2]),
                vod_remarks: match[4].trim()
            });
        }

        logInfo(`搜索结果: ${videos.length}条`);

        return {
            list: videos,
            page: pg,
            pagecount: 10
        };
    } catch (e) {
        logError("搜索失败", e);
        return { list: [], page: pg, pagecount: 0 };
    }
}

/**
 * 详情接口 [1][2]
 * 关键：将T3的vod_play_from/vod_play_url转换为T4的vod_play_sources
 */
async function detail(params, context) {
    const videoId = params.videoId;
    const url = videoId.startsWith('http') ? videoId : `${host}${videoId}`;

    logInfo(`请求详情: ${videoId}, URL: ${url}`);

    try {
        const res = await axiosInstance.get(url, { headers: def_headers });
        const html = res.data;

        const vod = {
            vod_id: videoId,
            vod_name: '',
            vod_pic: '',
            vod_type: '',
            vod_year: '',
            vod_area: '',
            vod_remarks: '',
            vod_actor: '',
            vod_director: '',
            vod_content: ''
        };

        // 解析标题
        const titleMatch = html.match(/<li class="on"><h1>([^<]+)<\/h1><\/li>/);
        if (titleMatch) vod.vod_name = titleMatch[1];

        // 解析封面
        const picMatch = html.match(/data-poster="([^"]+)"/);
        if (picMatch) vod.vod_pic = fixPicUrl(picMatch[1]);

        // 解析描述和演员信息
        const descMatch = html.match(/name="description" content="(.*?)"/);
        if (descMatch) {
            const content = descMatch[1];
            vod.vod_content = content;

            const actorMatch = content.match(/演员:(.*?)(。|$)/);
            if (actorMatch) vod.vod_actor = actorMatch[1];

            const areaMatch = content.match(/地区:(.*?)(。|$)/);
            if (areaMatch) vod.vod_area = areaMatch[1];

            const directorMatch = content.match(/导演:(.*?)(。|$)/);
            if (directorMatch) vod.vod_director = directorMatch[1];
        }

        // 解析播放源数据 [2]
        const scriptMatch = html.match(/var pp=({.*?});/s);
        if (scriptMatch) {
            try {
                const ppData = JSON.parse(scriptMatch[1]);
                const vno = ppData.no;
                const playFromArr = [];
                const playUrlArr = [];

                for (const line of ppData.la || []) {
                    const [lineId, lineName, episodeCount] = line;
                    const episodes = [];

                    for (let i = 0; i < episodeCount; i++) {
                        episodes.push(`第${i + 1}集$/v/${vno}/${lineId}z${i}.html`);
                    }

                    if (episodes.length > 0) {
                        playFromArr.push(lineName);
                        playUrlArr.push(episodes.join('#'));
                    }
                }

                // T3格式数据
                const vodPlayFrom = playFromArr.join('$$$');
                const vodPlayUrl = playUrlArr.join('$$$');

                // 转换为T4格式 [1]
                vod.vod_play_sources = parsePlaySources(vodPlayFrom, vodPlayUrl, videoId, vod.vod_name);

                logInfo("播放源解析完成", {
                    fromCount: playFromArr.length,
                    sources: vod.vod_play_sources.length
                });

                const scrapeCandidates = [];
                for (const source of vod.vod_play_sources || []) {
                    for (const episode of source.episodes || []) {
                        if (!episode || !episode._fid) continue;
                        const name = episode._rawName || episode.name || '正片';
                        scrapeCandidates.push({
                            fid: episode._fid,
                            file_id: episode._fid,
                            file_name: name,
                            name,
                            format_type: 'video'
                        });
                    }
                }

                if (scrapeCandidates.length > 0 && vod.vod_name) {
                    const sourceId = `spider_source_${context.sourceId}_${videoId}`;
                    const scrapingResult = await OmniBox.processScraping(
                        sourceId,
                        vod.vod_name,
                        vod.vod_name,
                        scrapeCandidates
                    );
                    logInfo(`刮削处理完成,结果: ${JSON.stringify(scrapingResult).substring(0, 200)}`);

                    const metadata = await OmniBox.getScrapeMetadata(sourceId);
                    const scrapeData = metadata?.scrapeData || null;
                    const videoMappings = metadata?.videoMappings || [];

                    if (scrapeData) {
                        vod.vod_name = scrapeData.title || scrapeData.name || vod.vod_name;
                        const poster = scrapeData.posterPath || scrapeData.poster_path || scrapeData.poster || '';
                        vod.vod_pic = poster ? buildPosterUrl(poster) : vod.vod_pic;
                        const releaseDate = scrapeData.releaseDate || scrapeData.release_date || '';
                        vod.vod_year = releaseDate ? String(releaseDate).substring(0, 4) : vod.vod_year;
                        vod.vod_content = scrapeData.overview || vod.vod_content;
                        vod.vod_actor = scrapeData.actors || vod.vod_actor;
                        vod.vod_director = scrapeData.director || vod.vod_director;

                        if (scrapeData.credits?.cast) {
                            const actors = scrapeData.credits.cast
                                .slice(0, 5)
                                .map((c) => c?.name)
                                .filter(Boolean)
                                .join(',');
                            if (actors) vod.vod_actor = actors;
                        }
                        if (scrapeData.credits?.crew) {
                            const directors = scrapeData.credits.crew
                                .filter((c) => c?.job === 'Director' || c?.department === 'Directing')
                                .slice(0, 3)
                                .map((c) => c?.name)
                                .filter(Boolean)
                                .join(',');
                            if (directors) vod.vod_director = directors;
                        }

                        vod.vod_play_sources = (vod.vod_play_sources || []).map((source) => {
                            const episodes = (source.episodes || []).map((ep) => {
                                const mapping = videoMappings.find((m) => m?.fileId === ep._fid);
                                if (!mapping) return ep;
                                const oldName = ep.name || '';
                                const newName = buildScrapedEpisodeName(scrapeData, mapping, oldName);
                                if (oldName !== newName) {
                                    logInfo(`应用刮削后源文件名: ${oldName} -> ${newName}`);
                                }
                                return {
                                    ...ep,
                                    name: newName,
                                    _sortSeason: mapping.seasonNumber || 0,
                                    _sortEpisode: mapping.episodeNumber || 0
                                };
                            }).sort((a, b) => {
                                if ((a._sortSeason || 0) !== (b._sortSeason || 0)) {
                                    return (a._sortSeason || 0) - (b._sortSeason || 0);
                                }
                                return (a._sortEpisode || 0) - (b._sortEpisode || 0);
                            }).map((ep) => ({
                                name: ep.name,
                                playId: ep.playId
                            }));

                            return {
                                ...source,
                                episodes
                            };
                        });
                    }
                }
            } catch (e) {
                logError("解析播放源数据失败", e);
            }
        }

        return { list: [vod] };
    } catch (e) {
        logError("详情获取失败", e);
        return { list: [] };
    }
}

/**
 * 播放接口 [2]
 */
async function play(params, context) {
    const rawInputPlayId = params.playId || '';
    const [rawPlayId, encodedMeta] = String(rawInputPlayId).split('|||');
    const meta = decodeMeta(encodedMeta || '') || {};
    const playId = rawPlayId || rawInputPlayId;
    const url = `${host}${playId}`;
    const vodId = params.vodId || meta.sid || '';

    let vodName = meta.v || '';
    const episodeName = meta.fid || '';
    let scrapedDanmuFileName = '';

    logInfo(`准备播放: ${playId}, URL: ${url}`);

    try {
        if (vodId) {
            const sourceId = `spider_source_${context.sourceId}_${vodId}`;
            const metadata = await OmniBox.getScrapeMetadata(sourceId);
            logInfo('播放阶段读取刮削元数据', {
                vodId,
                hit: !!(metadata && metadata.data),
                episode: meta.fid || ''
            });

            if (metadata && metadata.scrapeData) {
                const mapping = (metadata.videoMappings || []).find((m) => m?.fileId === meta?.fid);
                scrapedDanmuFileName = buildScrapedDanmuFileName(
                    metadata.scrapeData,
                    metadata.scrapeType || '',
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

        const res = await axiosInstance.get(url, { headers: def_headers });
        const html = res.data;

        // 解析真实播放地址
        const match = html.match(/data-src="([^"]+)"/);
        if (match) {
            const playUrl = match[1];
            logInfo(`解析到播放地址: ${playUrl}`);

            // 检查是否是直接播放链接
            if (playUrl.match(/\.(m3u8|mp4|flv|avi|mkv|ts)/i)) {
                const response = {
                    urls: [{ name: '默认', url: playUrl }],
                    parse: 0,
                    header: def_headers
                };

                if (DANMU_API && (vodName || meta.v)) {
                    const fallbackVodName = meta.v || vodName;
                    const fileName = scrapedDanmuFileName || buildFileNameForDanmu(fallbackVodName, episodeName);
                    logInfo(`尝试匹配弹幕文件名: ${fileName}`);
                    if (fileName) {
                        const danmakuList = await matchDanmu(fileName);
                        if (danmakuList && danmakuList.length > 0) {
                            response.danmaku = danmakuList;
                            logInfo('弹幕已添加到播放响应');
                        }
                    }
                }

                return response;

            }
        }

        const sniffResult = await sniff123tvPlay(url);
        if (sniffResult) {
            return sniffResult;
        }
    } catch (e) {
        logError("解析播放地址失败", e);
        const fallbackSniff = await sniff123tvPlay(url);
        if (fallbackSniff) {
            return fallbackSniff;
        }
    }

    return {
        urls: [{ name: "默认", url: "" }],
        parse: 0,
        header: def_headers
    };
}

module.exports = { home, category, search, detail, play };

const runner = require("spider_runner");
runner.run(module.exports);

});

_load(1, "HDmoli", function (module, exports, require) {
// @name HDmoli
// @version 1.0.8
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/HDmoli.js
// @dependencies cheerio

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const cheerio = require("cheerio");

const BASE_URL = (process.env.HDMOLI_HOST || "https://www.hdmoli.me").replace(/\/$/, "");
const USER_AGENT = process.env.HDMOLI_UA || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";
const REQUEST_TIMEOUT = Number(process.env.HDMOLI_TIMEOUT || 20000);

const CLASS_LIST = [
  { type_id: "1", type_name: "电影", url: "/show/1-----------.html" },
  { type_id: "2", type_name: "剧集", url: "/show/2-----------.html" },
  { type_id: "4", type_name: "动画", url: "/show/4-----------.html" },
  { type_id: "3", type_name: "综艺", url: "/show/3-----------.html" },
  { type_id: "5", type_name: "纪录片", url: "/show/5-----------.html" },
  { type_id: "6", type_name: "动作", url: "/show/6-----------.html" },
  { type_id: "7", type_name: "喜剧", url: "/show/7-----------.html" },
  { type_id: "8", type_name: "爱情", url: "/show/8-----------.html" },
  { type_id: "9", type_name: "科幻", url: "/show/9-----------.html" },
  { type_id: "10", type_name: "剧情", url: "/show/10-----------.html" },
  { type_id: "11", type_name: "悬疑", url: "/show/11-----------.html" },
  { type_id: "12", type_name: "惊悚", url: "/show/12-----------.html" },
];

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

async function request(url, extra = {}, redirectCount = 0) {
  const finalUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
  const headers = {
    "User-Agent": USER_AGENT,
    Referer: BASE_URL + "/",
    ...extra.headers,
  };

  await OmniBox.log("info", `[request] ${finalUrl}`);
  const res = await OmniBox.request(finalUrl, {
    method: extra.method || "GET",
    headers,
    timeout: REQUEST_TIMEOUT,
  });

  const statusCode = Number(res.statusCode || 0);
  const responseHeaders = res.headers || {};
  const location = responseHeaders.location || responseHeaders.Location || responseHeaders["LOCATION"] || "";
  if ([301, 302, 303, 307, 308].includes(statusCode)) {
    if (redirectCount >= 5) throw new Error(`重定向次数过多 @ ${finalUrl}`);
    if (!location) throw new Error(`HTTP ${statusCode} 未返回 Location @ ${finalUrl}`);
    const nextUrl = absoluteUrl(location, finalUrl);
    await OmniBox.log("info", `[redirect] ${finalUrl} -> ${nextUrl}`);
    return request(nextUrl, extra, redirectCount + 1);
  }

  if (statusCode !== 200) throw new Error(`HTTP ${statusCode} @ ${finalUrl}`);

  return res.body || "";
}

function getClassById(categoryId) {
  return CLASS_LIST.find(item => item.type_id === String(categoryId));
}

function buildPageUrl(basePath, page = 1) {
  if (!basePath) return "/";
  if (page <= 1) return basePath;
  return basePath.replace(/-{11}\.html$/, `--------${page}---.html`);
}

function normalizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function absoluteUrl(url, currentUrl = BASE_URL) {
  if (!url) return "";
  const value = String(url).trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  try {
    return new URL(value, currentUrl).toString();
  } catch {
    return `${BASE_URL}${value.startsWith("/") ? "" : "/"}${value}`;
  }
}

function extractIdFromPath(path) {
  const match = String(path || "").match(/\/([a-z]+)\/index(\d+)\.html/i);
  if (!match) return "";
  return `${match[1]}:${match[2]}`;
}

function splitVideoId(videoId) {
  const [prefix, id] = String(videoId || "").split(":");
  return { prefix: prefix || "movie", id: id || "" };
}

function buildDetailUrlFromPlay(playUrl) {
  const match = String(playUrl || "").match(/\/play\/(\d+)-(\d+)-(\d+)\.html/i);
  if (!match) return BASE_URL + "/";
  return `${BASE_URL}/movie/index${match[1]}.html`;
}

function mapListItem($, el) {
  const box = $(el);
  const linkEl = box.find("a.myui-vodlist__thumb").first();
  const titleEl = box.find("h4.title a").first();
  const href = linkEl.attr("href") || titleEl.attr("href") || "";
  const pic = linkEl.attr("data-original") || linkEl.find("img").attr("data-original") || linkEl.attr("src") || linkEl.find("img").attr("src") || "";
  const remarks = normalizeText(linkEl.find(".pic-text").first().text() || box.find(".pic-text").first().text());
  const score = normalizeText(linkEl.find(".pic-tag-right").first().text());
  const meta = normalizeText(box.find("p.text").first().text());
  const looksLikeMetadata = /^[0-9]{4}\s*\//.test(meta);
  let parts = looksLikeMetadata ? meta.split("/").map(s => normalizeText(s)).filter(Boolean) : [];

  if (!parts.length) {
    const info = normalizeText(box.find("p").filter((_, p) => $(p).text().includes("分类：")).first().text());
    const typeMatch = info.match(/分类：([^地]*?)地区：/);
    const areaMatch = info.match(/地区：([^年]*?)年份：/);
    const yearMatch = info.match(/年份：([0-9]{4})/);
    parts = [
      yearMatch ? yearMatch[1] : "",
      areaMatch ? areaMatch[1].trim() : "",
      typeMatch ? typeMatch[1].trim() : "",
    ].filter(Boolean);
  }

  return {
    vod_id: extractIdFromPath(href),
    vod_name: normalizeText(titleEl.text() || linkEl.attr("title")),
    vod_pic: absoluteUrl(pic),
    vod_remarks: remarks || score,
    vod_year: parts[0] || "",
    vod_area: parts[1] || "",
    type_name: parts.slice(2).join("/") || "",
    vod_douban_score: score.replace(/分$/, ""),
  };
}

function parseListPage(html) {
  const $ = cheerio.load(html, { decodeEntities: false });
  const list = [];
  // 针对该站点的 col- 布局和 myui-vodlist 混合结构进行匹配
  $("ul.myui-vodlist li, ul.myui-vodlist__bd li, #searchList li, li[class*='col-'], li.clearfix").each((_, el) => {
    const box = $(el);
    // 必须包含链接和标题，且不是广告或菜单项
    if (box.find("a[href*='/movie/index']").length > 0 || box.find("a[href*='/juji/index']").length > 0) {
        const item = mapListItem($, el);
        if (item.vod_id && item.vod_name) list.push(item);
    }
  });
  // 去重
  const seen = new Set();
  return list.filter(item => {
    if (seen.has(item.vod_id)) return false;
    seen.add(item.vod_id);
    return true;
  });
}

function parsePageCount(html) {
  const nums = new Set();
  const regex = /--------(\d+)---\.html/g;
  let match;
  while ((match = regex.exec(html))) {
    nums.add(Number(match[1]));
  }
  const maxPage = Math.max(1, ...nums);
  return Number.isFinite(maxPage) ? maxPage : 1;
}

function decodeHexString(input) {
  const hex = String(input || "").replace(/[^0-9a-f]/gi, "");
  if (!hex || hex.length % 2 !== 0) return "";
  try {
    return Buffer.from(hex, "hex").toString("utf8");
  } catch {
    return "";
  }
}

function decodePlayerUrl(rawUrl, encrypt) {
  let value = String(rawUrl || "").trim();
  if (!value) return "";

  if (encrypt === 1) {
    try { value = unescape(value); } catch {}
    try { value = decodeURIComponent(value); } catch {}
    return value;
  }

  if (encrypt === 2) {
    try {
      value = Buffer.from(value, "base64").toString("utf8");
    } catch {}
    try { value = unescape(value); } catch {}
    try { value = decodeURIComponent(value); } catch {}
    return value;
  }

  if (encrypt === 3) {
    const hexDecoded = decodeHexString(value);
    if (hexDecoded) value = hexDecoded;
    try { value = unescape(value); } catch {}
    try { value = decodeURIComponent(value); } catch {}
    return value;
  }

  return value;
}

function parsePlaySources($) {
  const tabs = [];
  $(".nav-tabs li a[href^='#playlist']").each((index, el) => {
    const tab = $(el);
    tabs.push({
      target: tab.attr("href") || `#playlist${index + 1}`,
      name: normalizeText(tab.text()) || `线路${index + 1}`,
    });
  });

  if (!tabs.length) {
    $("div[id^='playlist']").each((index, el) => {
      tabs.push({ target: `#${$(el).attr("id")}`, name: `线路${index + 1}` });
    });
  }

  return tabs.map(tab => {
    const episodes = [];
    $(tab.target).find(".myui-content__list a").each((_, a) => {
      const node = $(a);
      const href = node.attr("href") || "";
      const name = normalizeText(node.text()) || "播放";
      if (!href) return;
      episodes.push({
        name,
        playId: JSON.stringify({
          source: tab.name,
          playUrl: absoluteUrl(href),
          referer: buildDetailUrlFromPlay(absoluteUrl(href)),
        }),
      });
    });
    return { name: tab.name, episodes };
  }).filter(item => item.episodes.length > 0);
}

function parseDownloadLinks($) {
  const links = [];
  $(".myui-panel_bd p.text-muted a[title]").each((_, el) => {
    const node = $(el);
    const href = node.attr("href") || "";
    const title = normalizeText(node.closest("p").find("b").text()).replace(/[:：]/g, "") || normalizeText(node.attr("title"));
    if (/pan\.quark\.cn|pan\.baidu\.com|drive\.uc\.cn/i.test(href)) {
      links.push({ name: title || "网盘", url: href });
    }
  });
  return links;
}

function filterOutDriveSources(playSources = []) {
  const driveKeywordRegex = /(夸克|百度|阿里|UC|网盘|迅雷盘|115|123云盘|天翼)/i;
  return playSources.filter(source => {
    const sourceName = String(source?.name || "");
    if (driveKeywordRegex.test(sourceName)) return false;
    const episodes = Array.isArray(source?.episodes) ? source.episodes : [];
    const hasDriveEpisode = episodes.some(ep => {
      const rawPlayId = String(ep?.playId || "");
      return /pan\.quark\.cn|pan\.baidu\.com|drive\.uc\.cn/i.test(rawPlayId);
    });
    return !hasDriveEpisode;
  });
}

async function home(params, context) {
  try {
    await OmniBox.log("info", `[home] from=${context?.from || "web"}`);
    const html = await request("/");
    const list = parseListPage(html).slice(0, 24);
    await OmniBox.log("info", `[home] list=${list.length}`);
    return { class: CLASS_LIST.map(({ type_id, type_name }) => ({ type_id, type_name })), list };
  } catch (error) {
    await OmniBox.log("error", `[home] ${error.message}`);
    return { class: CLASS_LIST.map(({ type_id, type_name }) => ({ type_id, type_name })), list: [] };
  }
}

async function category(params, context) {
  try {
    const categoryId = String(params?.categoryId || "1");
    const page = Number(params?.page || 1) || 1;
    const category = getClassById(categoryId);
    if (!category) return { page, pagecount: 0, total: 0, list: [] };

    const url = buildPageUrl(category.url, page);
    await OmniBox.log("info", `[category] categoryId=${categoryId} page=${page} url=${url}`);
    const html = await request(url);
    const list = parseListPage(html);
    const pagecount = Math.max(page, parsePageCount(html));
    await OmniBox.log("info", `[category] list=${list.length} pagecount=${pagecount}`);
    return {
      page,
      pagecount,
      total: pagecount * Math.max(list.length, 24),
      list,
    };
  } catch (error) {
    await OmniBox.log("error", `[category] ${error.message}`);
    return { page: Number(params?.page || 1) || 1, pagecount: 0, total: 0, list: [] };
  }
}

async function detail(params, context) {
  try {
    const { prefix, id } = splitVideoId(params?.videoId);
    if (!id) return { list: [] };

    const detailUrl = `/${prefix}/index${id}.html`;
    await OmniBox.log("info", `[detail] videoId=${params?.videoId} url=${detailUrl}`);
    const html = await request(detailUrl);
    const $ = cheerio.load(html, { decodeEntities: false });

    const title = normalizeText($(".myui-content__detail h1.title").clone().children().remove().end().text() || $("title").text().replace(/\s*-\s*HDmoli.*$/, ""));
    const remarks = normalizeText($(".myui-content__detail h1.title font").text());
    const pic = absoluteUrl($(".myui-content__thumb img").attr("data-original") || $(".myui-content__thumb img").attr("src"));
    const score = normalizeText($("#rating .branch").text()).replace(/分$/, "");
    const content = normalizeText($(".myui-panel p.text-muted").first().text().replace(/^剧情简介：/, ""));

    let vodArea = "";
    let vodYear = "";
    let vodActor = "";
    let vodDirector = "";
    let typeName = "";

    $(".myui-content__detail p.data").each((_, el) => {
      const text = normalizeText($(el).text());
      if (text.startsWith("分类：")) typeName = text.replace(/^分类：/, "").split("地区：")[0].trim();
      if (text.includes("地区：")) {
        const m = text.match(/地区：([^\s]+)/);
        if (m) vodArea = m[1].trim();
      }
      if (text.includes("年份：")) {
        const m = text.match(/年份：([^\s]+)/);
        if (m) vodYear = m[1].trim();
      }
      if (text.startsWith("演员：")) vodActor = text.replace(/^演员：/, "").trim();
      if (text.startsWith("导演：")) vodDirector = text.replace(/^导演：/, "").trim();
    });

    let vod_play_sources = parsePlaySources($);
    const downloadLinks = parseDownloadLinks($);

    if (downloadLinks.length) {
      await OmniBox.log("info", `[detail] hide drive links=${downloadLinks.length}`);
    }

    vod_play_sources = filterOutDriveSources(vod_play_sources);

    await OmniBox.log("info", `[detail] sources=${vod_play_sources.length}`);
    return {
      list: [{
        vod_id: `${prefix}:${id}`,
        vod_name: title,
        vod_pic: pic,
        vod_content: content,
        vod_actor: vodActor,
        vod_director: vodDirector,
        vod_area: vodArea,
        vod_year: vodYear,
        vod_remarks: remarks,
        vod_douban_score: score,
        type_name: typeName,
        vod_play_sources,
      }],
    };
  } catch (error) {
    await OmniBox.log("error", `[detail] ${error.message}`);
    return { list: [] };
  }
}

async function search(params, context) {
  try {
    const keyword = String(params?.keyword || params?.wd || "").trim();
    const page = Number(params?.page || 1) || 1;
    if (!keyword) return { page: 1, pagecount: 0, total: 0, list: [] };

    let url = `/search/-------------.html?wd=${encodeURIComponent(keyword)}`;
    if (page > 1) {
      url = `/search/----------${page}---.html?wd=${encodeURIComponent(keyword)}`;
    }
    await OmniBox.log("info", `[search] keyword=${keyword} page=${page} url=${url}`);
    const html = await request(url);
    const list = parseListPage(html);
    const pagecount = Math.max(page, parsePageCount(html));
    await OmniBox.log("info", `[search] list=${list.length} pagecount=${pagecount}`);
    return {
      page,
      pagecount,
      total: pagecount * Math.max(list.length, 20),
      list,
    };
  } catch (error) {
    await OmniBox.log("error", `[search] ${error.message}`);
    return { page: Number(params?.page || 1) || 1, pagecount: 0, total: 0, list: [] };
  }
}

async function play(params, context) {
  try {
    const raw = String(params?.playId || "");
    if (!raw) throw new Error("playId 不能为空");

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { directUrl: raw, source: params?.flag || "play" };
    }

    if (payload.directUrl) {
      const directUrl = String(payload.directUrl || "").trim();
      const sniff = !/\.(m3u8|mp4|flv)(\?|$)/i.test(directUrl);
      await OmniBox.log("info", `[play] direct source=${payload.source} sniff=${sniff} url=${directUrl}`);
      return {
        urls: [{ name: payload.source || "播放", url: directUrl }],
        header: {},
        parse: sniff ? 1 : 0};
    }

    if (payload.sniffUrl) {
      const sniffHeaders = {
        Referer: payload.referer || BASE_URL + "/",
        "User-Agent": USER_AGENT,
      };
      await OmniBox.log("info", `[play] sdk sniff source=${payload.source} sniffUrl=${payload.sniffUrl}`);
      try {
        const sniffed = await OmniBox.sniffVideo(payload.sniffUrl, sniffHeaders);
        const sniffedUrl = String(sniffed?.url || "").trim();
        if (sniffedUrl) {
          await OmniBox.log("info", `[play] sdk sniff success url=${sniffedUrl}`);
          return {
            urls: [{ name: payload.source || "播放", url: sniffedUrl }],
            header: sniffed?.header || {},
            parse: 0};
        }
      } catch (sniffError) {
        await OmniBox.log("warn", `[play] sdk sniff failed: ${sniffError.message}`);
      }

      return {
        urls: [{ name: payload.source || "播放", url: payload.sniffUrl }],
        header: sniffHeaders,
        parse: 1};
    }

    if (!payload.playUrl) throw new Error("缺少 playUrl");

    await OmniBox.log("info", `[play] source=${payload.source} playUrl=${payload.playUrl}`);
    const html = await request(payload.playUrl, {
      headers: {
        Referer: payload.referer || BASE_URL + "/",
      },
    });

    const match = html.match(/var\s+player_aaaa\s*=\s*(\{.*?\})\s*<\/script>/s);
    if (!match) throw new Error("未找到 player_aaaa");

    const player = JSON.parse(match[1]);
    const encrypt = Number(player.encrypt || 0);
    const finalUrl = decodePlayerUrl(player.url || "", encrypt);

    if (!finalUrl) throw new Error("播放器未给出 url");

    const isDirectMedia = /\.(m3u8|mp4|flv)(\?|$)/i.test(finalUrl);
    const finalHeaders = {};
    if (player.from && !isDirectMedia) {
      finalHeaders.Referer = payload.playUrl;
      finalHeaders["User-Agent"] = USER_AGENT;
    }

    await OmniBox.log("info", `[play] from=${player.from} encrypt=${encrypt} direct=${isDirectMedia} sniff=${!isDirectMedia} url=${finalUrl}`);

    if (!isDirectMedia) {
      try {
        const sniffed = await OmniBox.sniffVideo(payload.playUrl, {
          Referer: payload.referer || BASE_URL + "/",
          "User-Agent": USER_AGENT,
        });
        const sniffedUrl = String(sniffed?.url || "").trim();
        if (sniffedUrl) {
          await OmniBox.log("info", `[play] sdk sniff success from player page url=${sniffedUrl}`);
          return {
            urls: [{ name: payload.source || player.from || "播放", url: sniffedUrl }],
            header: sniffed?.header || {},
            parse: 0};
        }
      } catch (sniffError) {
        await OmniBox.log("warn", `[play] sdk sniff from player page failed: ${sniffError.message}`);
      }

      return {
        urls: [{ name: payload.source || player.from || "播放", url: payload.playUrl }],
        header: {
          Referer: payload.referer || BASE_URL + "/",
          "User-Agent": USER_AGENT
        },
        parse: 1};
    }

    return {
      urls: [{ name: payload.source || player.from || "播放", url: finalUrl }],
      header: finalHeaders,
      parse: 0};
  } catch (error) {
    await OmniBox.log("error", `[play] ${error.message}`);
    return {
      urls: [],
      header: {},
      parse: 0};
  }
}

});

_load(2, "PPnix", function (module, exports, require) {
// @name PPnix
// @author 梦
// @description 刮削：暂不支持，弹幕：暂不支持，分类筛选：支持，播放链：兼容 TVBox，优先返回已重写的内联 m3u8 以规避代理链路问题
// @dependencies: axios, cheerio
// @version 1.7.4
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/PPnix.js

const OmniBox = require("omnibox_sdk");
const cheerio = require("cheerio");
const axios = require("axios");
const runner = require("spider_runner");
const { execFile } = require("child_process");
const { promisify } = require("util");

const BASE_URL = process.env.PPNIX_HOST || "https://www.ppnix.com";
const BASE_PATH = process.env.PPNIX_LANG_PATH || "/cn";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36";

const CATEGORIES = [
  { type_id: "movie", type_name: "电影" },
  { type_id: "tv", type_name: "电视剧" },
];

function normalizeBasePath(path = "") {
  const p = String(path || "").trim();
  if (!p) return "/cn";
  return p.startsWith("/") ? p.replace(/\/+$/, "") : `/${p.replace(/\/+$/, "")}`;
}

const LANG_PATH = normalizeBasePath(BASE_PATH);

const PPNIX_SEGMENT_HOST = process.env.PPNIX_SEGMENT_HOST || "https://1.ppnix.com";
const PPNIX_REWRITE_M3U8 = process.env.PPNIX_REWRITE_M3U8 === "1";
const PPNIX_CF_COOKIE = process.env.PPNIX_CF_COOKIE || process.env.PPNIX_COOKIE || "";
const PPNIX_CF_AUTO = process.env.PPNIX_CF_AUTO !== "0";
const PPNIX_CF_CACHE_KEY = process.env.PPNIX_CF_CACHE_KEY || "ppnix:cf_clearance";
const PPNIX_CF_MAX_AGE_SECONDS = parseInt(process.env.PPNIX_CF_MAX_AGE_SECONDS || "21600", 10) || 21600;
const PPNIX_CF_TIMEOUT_MS = parseInt(process.env.PPNIX_CF_TIMEOUT_MS || "45000", 10) || 45000;
// FlareSolverr 服务地址，优先读取站点专用变量，其次回退通用 FLARESOLVERR_URL。
// 项目地址：https://github.com/FlareSolverr/FlareSolverr
const PPNIX_FLARESOLVERR_URL = process.env.PPNIX_FLARESOLVERR_URL || process.env.FLARESOLVERR_URL || "http://192.168.50.50:8191/v1";
// FlareSolverr 会话名，用于复用已过验证的浏览器会话。
const PPNIX_FLARESOLVERR_SESSION = process.env.PPNIX_FLARESOLVERR_SESSION || "";
// FlareSolverr 单次请求最大等待时间（毫秒），默认沿用 CF 自动处理超时配置。
const PPNIX_FLARESOLVERR_TIMEOUT_MS = parseInt(process.env.PPNIX_FLARESOLVERR_TIMEOUT_MS || String(PPNIX_CF_TIMEOUT_MS), 10) || PPNIX_CF_TIMEOUT_MS;
const PPNIX_ENABLE_SUBTITLES = process.env.PPNIX_ENABLE_SUBTITLES === "1";
const execFileAsync = promisify(execFile);

const SORT_MAP = {
  time: "newstime",
  hits: "onclick",
  score: "rating",
  newstime: "newstime",
  onclick: "onclick",
  rating: "rating",
};

function joinUrl(path = "") {
  const raw = String(path || "").trim();
  if (!raw) return `${BASE_URL}${LANG_PATH}/`;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${BASE_URL}${raw}`;
  return `${BASE_URL}/${raw}`;
}

function buildCookieHeader(cookie = "") {
  const value = text(cookie);
  return value ? { Cookie: value } : {};
}

function toCookieString(cookieMap = {}) {
  return Object.entries(cookieMap || {})
    .map(([k, v]) => [text(k), text(v)])
    .filter(([k, v]) => k && v)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function cookiesArrayToString(cookies = []) {
  return (Array.isArray(cookies) ? cookies : [])
    .map((item) => ({ name: text(item?.name || ""), value: text(item?.value || "") }))
    .filter((item) => item.name && item.value)
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");
}

async function getCachedCfCookie() {
  if (text(PPNIX_CF_COOKIE)) return text(PPNIX_CF_COOKIE);
  try {
    const cached = await OmniBox.getCache(PPNIX_CF_CACHE_KEY);
    return text(cached || "");
  } catch (error) {
    OmniBox.log("warn", `[cf] 读取缓存失败: ${error.message}`);
    return "";
  }
}

async function setCachedCfCookie(cookie) {
  const value = text(cookie);
  if (!value || text(PPNIX_CF_COOKIE)) return;
  try {
    await OmniBox.setCache(PPNIX_CF_CACHE_KEY, value, PPNIX_CF_MAX_AGE_SECONDS);
  } catch (error) {
    OmniBox.log("warn", `[cf] 写入缓存失败: ${error.message}`);
  }
}

async function fetchCfClearanceWithFlareSolverr(targetUrl = `${BASE_URL}${LANG_PATH}/`) {
  const endpoint = text(PPNIX_FLARESOLVERR_URL);
  if (!endpoint) {
    throw new Error("未配置 FlareSolverr 地址");
  }

  const payload = {
    cmd: "request.get",
    url: targetUrl,
    maxTimeout: PPNIX_FLARESOLVERR_TIMEOUT_MS,
  };
  if (text(PPNIX_FLARESOLVERR_SESSION)) {
    payload.session = text(PPNIX_FLARESOLVERR_SESSION);
  }

  const res = await axios.post(endpoint, payload, {
    timeout: PPNIX_FLARESOLVERR_TIMEOUT_MS + 5000,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    validateStatus: () => true,
  });

  if (res.status !== 200 || !res.data || res.data.status !== "ok") {
    throw new Error(`FlareSolverr HTTP ${res.status}`);
  }

  const solution = res.data.solution || {};
  const cookies = Array.isArray(solution.cookies) ? solution.cookies : [];
  const cookie = cookiesArrayToString(cookies);
  const cf = cookies.find((item) => text(item?.name) === "cf_clearance" && /ppnix\.com$/i.test(text(item?.domain || "ppnix.com")));

  if (!cf?.value) {
    throw new Error(`FlareSolverr 未返回 cf_clearance，message=${text(res.data.message || "") || "unknown"}`);
  }

  OmniBox.log("info", `[cf] FlareSolverr 已返回 cookies=${cookies.length}, ua=${text(solution.userAgent || "")}`);
  return cookie;
}

async function fetchCfClearanceWithBrowser() {
  const script = String.raw`
const { execFile } = require("child_process");
const { promisify } = require("util");
const http = require("http");
const execFileAsync = promisify(execFile);
const BASE_URL = process.env.PPNIX_BASE_URL;
const USER_AGENT = process.env.PPNIX_USER_AGENT;
const timeoutMs = Number(process.env.PPNIX_CF_TIMEOUT_MS || 45000);

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (c) => { data += c; });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

async function waitForDebugger(port, deadline) {
  while (Date.now() < deadline) {
    try {
      const info = await getJson("http://127.0.0.1:" + port + "/json/version");
      if (info && info.webSocketDebuggerUrl) return info;
    } catch (_) {}
    await delay(500);
  }
  throw new Error("等待 Chromium 调试端口超时");
}

async function readCookies(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let seq = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  const send = (method, params = {}) => new Promise((resolve) => {
    const id = ++seq;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
  const res = await send("Storage.getCookies", {});
  ws.close();
  return (res.result && res.result.cookies) || [];
}

(async () => {
  const port = 9223 + Math.floor(Math.random() * 200);
  const userDataDir = await execFileAsync("mktemp", ["-d", "/tmp/ppnix-cf-XXXXXX"]);
  const profileDir = String(userDataDir.stdout || "").trim();
  const chrome = ["/snap/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/chromium"];
  const bin = chrome.find(Boolean);
  if (!bin) throw new Error("未找到 Chromium");

  const child = execFile(bin, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--user-data-dir=" + profileDir,
    "--remote-debugging-port=" + port,
    "--user-agent=" + USER_AGENT,
    BASE_URL + "/cn/"
  ], { stdio: "ignore" });

  try {
    const deadline = Date.now() + timeoutMs;
    const version = await waitForDebugger(port, deadline);
    while (Date.now() < deadline) {
      const cookies = await readCookies(version.webSocketDebuggerUrl);
      const hit = cookies.find((c) => c && c.name === "cf_clearance" && String(c.domain || "").includes("ppnix.com"));
      if (hit && hit.value) {
        process.stdout.write("cf_clearance=" + hit.value);
        return;
      }
      await delay(1200);
    }
    throw new Error("未在时限内获取到 cf_clearance");
  } finally {
    try { child.kill("SIGKILL"); } catch (_) {}
  }
})().catch((error) => {
  console.error(error && error.message ? error.message : String(error));
  process.exit(1);
});`;

  const { stdout, stderr } = await execFileAsync("node", ["-e", script], {
    timeout: PPNIX_CF_TIMEOUT_MS,
    env: {
      ...process.env,
      PPNIX_BASE_URL: BASE_URL,
      PPNIX_USER_AGENT: USER_AGENT,
      PPNIX_CF_TIMEOUT_MS: String(PPNIX_CF_TIMEOUT_MS),
    },
    maxBuffer: 1024 * 1024,
  });

  const cookie = text(stdout || "");
  if (!/^cf_clearance=/.test(cookie)) {
    throw new Error(text(stderr || "未获取到 cf_clearance"));
  }
  return cookie;
}

async function ensureCfCookie(forceRefresh = false, targetUrl = `${BASE_URL}${LANG_PATH}/`) {
  if (text(PPNIX_CF_COOKIE)) return text(PPNIX_CF_COOKIE);
  if (!forceRefresh) {
    const cached = await getCachedCfCookie();
    if (cached) return cached;
  }
  if (!PPNIX_CF_AUTO) return "";

  let cookie = "";
  try {
    OmniBox.log("info", `[cf] 开始通过 FlareSolverr 自动获取 cf_clearance`);
    cookie = await fetchCfClearanceWithFlareSolverr(targetUrl);
  } catch (error) {
    OmniBox.log("warn", `[cf] FlareSolverr 获取失败，回退 headless Chromium: ${error.message}`);
    cookie = await fetchCfClearanceWithBrowser();
  }

  if (cookie) {
    await setCachedCfCookie(cookie);
    OmniBox.log("info", `[cf] 已自动获取 cf_clearance，长度=${cookie.length}`);
  }
  return cookie;
}

async function requestPage(path) {
  const url = joinUrl(path);
  OmniBox.log("info", `[request] ${url}`);
  let cookie = await getCachedCfCookie();
  let res = await axios.get(url, {
    timeout: 20000,
    headers: {
      "User-Agent": USER_AGENT,
      "Referer": `${BASE_URL}${LANG_PATH}/`,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      ...buildCookieHeader(cookie),
    },
    validateStatus: () => true,
  });

  if ((res.status === 403 || res.status === 503) && PPNIX_CF_AUTO) {
    cookie = await ensureCfCookie(!cookie, url);
    res = await axios.get(url, {
      timeout: 20000,
      headers: {
        "User-Agent": USER_AGENT,
        "Referer": `${BASE_URL}${LANG_PATH}/`,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        ...buildCookieHeader(cookie),
      },
      validateStatus: () => true,
    });
  }

  if (res.status !== 200 || !res.data) {
    throw new Error(`HTTP ${res.status}`);
  }

  return {
    url,
    html: typeof res.data === "string" ? res.data : String(res.data || ""),
  };
}

function text(v) {
  return String(v == null ? "" : v).trim();
}

function fixImage(url) {
  const u = text(url);
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("/")) return `${BASE_URL}${u}`;
  return `${BASE_URL}/${u}`;
}

function stripTags(s = "") {
  return text(String(s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));
}

function decodeHtmlEntity(str = "") {
  return text(str)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function mapListItems($, scope, typeId = "") {
  const list = [];
  const seen = new Set();
  $(scope).each((_, el) => {
    const $el = $(el);
    const $a = $el.find("a.thumbnail, h2 a, a").first();
    const href = $a.attr("href") || $el.find("h2 a").attr("href") || "";
    const vodId = text(href);
    if (!vodId || seen.has(vodId)) return;
    seen.add(vodId);

    const vodName = text($el.find("img.thumb").attr("alt") || $el.find("h2 a").text() || $a.text());
    const vodPic = fixImage($el.find("img.thumb").attr("src") || $el.find("img.thumb").attr("data-src") || "");
    const vodRemarks = text($el.find("footer .rate").text() || $el.find("footer").text());

    if (!vodName) return;

    list.push({
      vod_id: vodId,
      vod_name: vodName,
      vod_pic: vodPic,
      type_id: typeId,
      type_name: typeId === "movie" ? "电影" : typeId === "tv" ? "电视剧" : "",
      vod_remarks: vodRemarks,
    });
  });
  return list;
}

function parseM3u8List(html = "") {
  const infoId = (html.match(/infoid\s*=\s*(\d+)/) || [])[1] || "";
  const m = html.match(/m3u8\s*=\s*\[(.*?)\]/s);
  if (!m) return { infoId, items: [] };
  const items = [];
  const re = /'([^']*)'|"([^"]*)"/g;
  let mm;
  while ((mm = re.exec(m[1])) !== null) {
    const value = text(mm[1] || mm[2] || "");
    if (value) items.push(value);
  }
  return { infoId, items };
}

function buildPlayId(meta) {
  const infoId = text(meta.infoId || "");
  const param = encodeURIComponent(text(meta.param || ""));
  const referer = encodeURIComponent(text(meta.referer || ""));
  const name = encodeURIComponent(text(meta.name || ""));
  const episodeName = encodeURIComponent(text(meta.episodeName || ""));
  return `${infoId}|${param}|${referer}|${name}|${episodeName}`;
}

function parsePlayId(playId) {
  const parts = String(playId || "").split("|");
  return {
    infoId: text(parts[0] || ""),
    param: decodeURIComponent(parts[1] || ""),
    referer: decodeURIComponent(parts[2] || ""),
    name: decodeURIComponent(parts[3] || ""),
    episodeName: decodeURIComponent(parts[4] || ""),
  };
}

async function fetchText(url, headers = {}) {
  let cookie = await getCachedCfCookie();
  let res = await axios.get(url, {
    timeout: 20000,
    headers: {
      "User-Agent": USER_AGENT,
      ...headers,
      ...buildCookieHeader(cookie),
    },
    validateStatus: () => true,
  });
  if ((res.status === 403 || res.status === 503) && PPNIX_CF_AUTO) {
    cookie = await ensureCfCookie(!cookie, url);
    res = await axios.get(url, {
      timeout: 20000,
      headers: {
        "User-Agent": USER_AGENT,
        ...headers,
        ...buildCookieHeader(cookie),
      },
      validateStatus: () => true,
    });
  }
  if (res.status !== 200) {
    throw new Error(`HTTP ${res.status}`);
  }
  return typeof res.data === "string" ? res.data : String(res.data || "");
}

function rewritePpnixM3u8(m3u8Text, referer) {
  const keyUrl = `${BASE_URL}/info/m3u8/key`;
  return String(m3u8Text || "")
    .replace(/URI="\.\.\/key"/g, `URI="${keyUrl}"`)
    .replace(/https:\/\/ipfs\.ppnix\.com\/ipfs\//g, `${PPNIX_SEGMENT_HOST}/ipfs/`);
}

function buildSubtitleSelector(infoId, param, langs = ["cn", "tw", "en"]) {
  const items = [];
  for (const lang of langs) {
    const code = text(lang);
    if (!code) continue;
    items.push({
      name: code,
      url: `${BASE_URL}/info/subtitle/${infoId}/${encodeURIComponent(param)}/${code}.srt`,
    });
  }
  return items;
}

function uniqValues(values = []) {
  return [...new Set(values.map((v) => text(v)).filter(Boolean))];
}

function normalizeCategoryFilters(raw = {}) {
  const filters = raw && typeof raw === "object" ? raw : {};
  return {
    class: text(filters.class || filters.type || filters.cate || ""),
    area: text(filters.area || ""),
    year: text(filters.year || ""),
    by: text(filters.by || filters.sort || "newstime") || "newstime",
  };
}

function buildFilterPath(categoryId, page = 1, rawFilters = {}) {
  const filters = normalizeCategoryFilters(rawFilters);
  const genre = filters.class;
  const area = filters.area;
  const year = filters.year;
  const sort = SORT_MAP[filters.by] || "newstime";
  const pagePart = page <= 1 ? "" : `${page - 1}`;
  return `${LANG_PATH}/${categoryId}/${genre}-${area}-${year}-${pagePart}-${sort}.html`;
}

function extractFilterValues($, root, currentText = "") {
  const values = [];
  $(root).find("a").each((_, el) => {
    const name = text($(el).text());
    if (!name || name === currentText) return;
    values.push(name);
  });
  return uniqValues(values);
}

function buildCategoryFilters($) {
  const groups = [];
  const dls = $(".lists-content.filter dl");
  if (!dls.length) return groups;

  const typeValues = extractFilterValues($, dls.eq(0), "全部");
  if (typeValues.length) {
    groups.push({
      key: "class",
      name: "类型",
      init: "",
      value: [{ name: "全部", value: "" }, ...typeValues.map((v) => ({ name: v, value: v }))],
    });
  }

  const areaValues = extractFilterValues($, dls.eq(1), "全部");
  if (areaValues.length) {
    groups.push({
      key: "area",
      name: "地区",
      init: "",
      value: [{ name: "全部", value: "" }, ...areaValues.map((v) => ({ name: v, value: v }))],
    });
  }

  const yearValues = extractFilterValues($, dls.eq(2), "全部");
  if (yearValues.length) {
    groups.push({
      key: "year",
      name: "年份",
      init: "",
      value: [{ name: "全部", value: "" }, ...yearValues.map((v) => ({ name: v, value: v }))],
    });
  }

  groups.push({
    key: "by",
    name: "排序",
    init: "newstime",
    value: [
      { name: "按时间", value: "newstime" },
      { name: "按人气", value: "onclick" },
      { name: "按评分", value: "rating" },
    ],
  });

  return groups;
}

function buildM3u8DataUrl(m3u8Text) {
  return `data:application/vnd.apple.mpegurl;base64,${Buffer.from(String(m3u8Text || ""), "utf8").toString("base64")}`;
}

function rewritePpnixM3u8LikeWeb(m3u8Text) {
  const keyUrl = `${BASE_URL}/info/m3u8/key`;
  return String(m3u8Text || "")
    .replace(/URI="\.\.\/key"/g, `URI="${keyUrl}"`);
}

function rewritePpnixM3u8ForTvbox(m3u8Text) {
  const keyUrl = `${BASE_URL}/info/m3u8/key`;
  return String(m3u8Text || "")
    .replace(/URI="\.\.\/key"/g, `URI="${keyUrl}"`)
    .replace(/https:\/\/ipfs\.ppnix\.com\/ipfs\//g, `${PPNIX_SEGMENT_HOST}/ipfs/`);
}

async function home(params, context) {
  try {
    const [homePage, moviePage, tvPage] = await Promise.all([
      requestPage(`${LANG_PATH}/`),
      requestPage(buildFilterPath("movie", 1, {})),
      requestPage(buildFilterPath("tv", 1, {})),
    ]);

    const $home = cheerio.load(homePage.html);
    const $movie = cheerio.load(moviePage.html);
    const $tv = cheerio.load(tvPage.html);

    const blocks = $home(".lists-content ul");
    const movieList = blocks.eq(0).length ? mapListItems($home, blocks.eq(0).find("li"), "movie") : [];
    const tvList = blocks.eq(1).length ? mapListItems($home, blocks.eq(1).find("li"), "tv") : [];
    const list = [...movieList, ...tvList].slice(0, 30);

    const filters = {
      movie: buildCategoryFilters($movie),
      tv: buildCategoryFilters($tv),
    };

    OmniBox.log("info", `[home] 分类=${CATEGORIES.length}, 推荐=${list.length}, movieFilters=${filters.movie?.length || 0}, tvFilters=${filters.tv?.length || 0}`);
    return {
      class: CATEGORIES,
      filters,
      list,
    };
  } catch (error) {
    OmniBox.log("error", `[home] 失败: ${error.message}`);
    return { class: CATEGORIES, filters: {}, list: [] };
  }
}

async function category(params, context) {
  try {
    const categoryId = text(params.categoryId || params.type_id || "movie");
    const page = parseInt(params.page || "1", 10) || 1;
    const rawFilters = params.filters || params.extend || {};
    const path = buildFilterPath(categoryId, page, rawFilters);
    const { html } = await requestPage(path);
    const $ = cheerio.load(html);

    const list = mapListItems($, ".lists-content > ul > li, .lists .lists-content ul li", categoryId)
      .filter((item) => item.vod_id.includes(`/${categoryId}/`));

    let pagecount = page;
    const pagerHtml = $(".pagination, .pages, .pagenavi").html() || "";
    const matches = [...pagerHtml.matchAll(/---(\d+)-\.html/g)].map((m) => Number(m[1]) + 1);
    if (matches.length > 0) {
      pagecount = Math.max(page, ...matches);
    }

    const categoryFilters = buildCategoryFilters($);
    OmniBox.log("info", `[category] categoryId=${categoryId}, page=${page}, path=${path}, list=${list.length}, pagecount=${pagecount}`);
    return {
      list,
      page,
      pagecount,
      total: list.length,
      filters: categoryFilters.length ? { [categoryId]: categoryFilters } : {},
    };
  } catch (error) {
    OmniBox.log("error", `[category] 失败: ${error.message}`);
    return { list: [], page: 1, pagecount: 0, total: 0, filters: {} };
  }
}

async function detail(params, context) {
  try {
    const videoId = text(params.videoId || "");
    if (!videoId) return { list: [] };

    const { html, url } = await requestPage(videoId);
    const $ = cheerio.load(html);

    const titleRaw = text($("h1.product-title").text());
    const vodName = titleRaw.replace(/\s*\([^)]*\)\s*$/, "").trim() || text($("title").text()).replace(/\s*\([^)]*\).*/, "");
    const vodPic = fixImage($("header.product-header img.thumb").attr("src") || "");
    const vodContent = text($(".product-excerpt").filter((_, el) => $(el).text().includes("简介：")).text()).replace(/^简介：/, "").trim();
    const vodDirector = text($(".product-excerpt").filter((_, el) => $(el).text().includes("导演：")).find("span").text());
    const vodActor = text($(".product-excerpt").filter((_, el) => $(el).text().includes("主演：")).find("span").text()).replace(/\s*\/\s*/g, ",");
    const vodYear = ((titleRaw.match(/\((\d{4})\)/) || [])[1]) || "";

    const { infoId, items } = parseM3u8List(html);
    const episodes = items.map((item, idx) => ({
      name: item,
      playId: buildPlayId({
        infoId: infoId || ((videoId.match(/(\d+)\.html/) || [])[1] || ""),
        param: item,
        referer: url,
        name: vodName,
        episodeName: item,
        subtitleBase: `${BASE_URL}/info/subtitle/${infoId || ((videoId.match(/(\d+)\.html/) || [])[1] || "")}/${item}`,
      }),
    }));

    const vod = {
      vod_id: videoId,
      vod_name: vodName,
      vod_pic: vodPic,
      vod_year: vodYear,
      vod_director: vodDirector,
      vod_actor: vodActor,
      vod_content: vodContent,
      vod_play_sources: episodes.length ? [{ name: "PPnix", episodes }] : undefined,
    };

    OmniBox.log("info", `[detail] infoId=${infoId}, episodes=${episodes.length}`);
    return { list: [vod] };
  } catch (error) {
    OmniBox.log("error", `[detail] 失败: ${error.message}`);
    return { list: [] };
  }
}

async function search(params, context) {
  try {
    const keyword = text(params.keyword || params.wd || "");
    const page = parseInt(params.page || "1", 10) || 1;
    if (!keyword) return { list: [], page: 1, pagecount: 0, total: 0 };

    const encoded = encodeURIComponent(keyword);
    const sortSuffix = page <= 1 ? "" : `-page-${page}`;
    const path = `${LANG_PATH}/search/${encoded}--.html${sortSuffix}`;
    const { html } = await requestPage(path);
    const $ = cheerio.load(html);

    const list = mapListItems($, ".lists-content > ul > li, .lists .lists-content ul li")
      .filter((item) => /\/(movie|tv)\/\d+\.html/.test(item.vod_id));

    OmniBox.log("info", `[search] keyword=${keyword}, page=${page}, list=${list.length}`);
    return {
      list,
      page,
      pagecount: page,
      total: list.length,
    };
  } catch (error) {
    OmniBox.log("error", `[search] 失败: ${error.message}`);
    return { list: [], page: 1, pagecount: 0, total: 0 };
  }
}

async function play(params, context) {
  try {
    const meta = parsePlayId(params.playId || "");
    const infoId = text(meta.infoId || "");
    const param = text(meta.param || "");
    if (!infoId || !param) {
      throw new Error("playId 参数不完整");
    }

    const referer = text(meta.referer || `${BASE_URL}${LANG_PATH}/`);
    const from = text(context?.from || "") || "unknown";
    const shouldUseLeanHeader = from === "tvbox";
    const cfCookie = shouldUseLeanHeader ? "" : await ensureCfCookie(false, referer);
    const header = shouldUseLeanHeader ? {} : {
      Referer: referer,
      Origin: BASE_URL,
      "User-Agent": USER_AGENT,
      ...buildCookieHeader(cfCookie),
    };

    const sourceUrl = `${BASE_URL}/info/m3u8/${infoId}/${encodeURIComponent(param)}.m3u8`;
    const episodeName = text(meta.episodeName || param || "播放");
    const subtitles = PPNIX_ENABLE_SUBTITLES ? buildSubtitleSelector(infoId, param) : [];

    if (from === "tvbox") {
      try {
        const rawM3u8 = await fetchText(sourceUrl, {});
        const rewritten = rewritePpnixM3u8ForTvbox(rawM3u8);
        const finalUrl = buildM3u8DataUrl(rewritten);
        OmniBox.log("info", `[play] 返回 tvbox 专用内联 m3u8: infoId=${infoId}, param=${param}, from=${from}, leanHeader=${shouldUseLeanHeader ? "yes" : "no"}, cookie=${cfCookie ? "yes" : "no"}, subtitles=${subtitles.length}`);
        return {
          urls: [{ name: episodeName, url: finalUrl }],
          header,
          parse: 0,
          danmaku: [],
          subtitles};
      } catch (error) {
        OmniBox.log("warn", `[play] tvbox 内联 m3u8 失败，回退原始地址: ${error.message}`);
      }
    }

    if (PPNIX_REWRITE_M3U8) {
      try {
        const rawM3u8 = await fetchText(sourceUrl, header);
        const rewritten = rewritePpnixM3u8LikeWeb(rawM3u8);
        const finalUrl = buildM3u8DataUrl(rewritten);
        OmniBox.log("info", `[play] 返回重写 data-url: infoId=${infoId}, param=${param}, from=${from}, leanHeader=${shouldUseLeanHeader ? "yes" : "no"}, cookie=${cfCookie ? "yes" : "no"}, subtitles=${subtitles.length}`);
        return {
          urls: [{ name: episodeName, url: finalUrl }],
          header,
          parse: 0,
          danmaku: [],
          subtitles};
      } catch (error) {
        OmniBox.log("warn", `[play] 官网链路重写失败，回退原始地址: ${error.message}`);
      }
    }

    OmniBox.log("info", `[play] 返回原始 m3u8: infoId=${infoId}, param=${param}, from=${from}, leanHeader=${shouldUseLeanHeader ? "yes" : "no"}, cookie=${cfCookie ? "yes" : "no"}, subtitles=${subtitles.length}`);
    return {
      urls: [{ name: episodeName, url: sourceUrl }],
      header,
      parse: 0,
      danmaku: [],
      subtitles};
  } catch (error) {
    OmniBox.log("error", `[play] 失败: ${error.message}`);
    return { urls: [], header: {}, parse: 1, danmaku: [] };
  }
}

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

});

_load(3, "七味", function (module, exports, require) {
// @name 七味
// @author https://github.com/hjdhnx/drpy-node/blob/main/spider/js/%E4%B8%83%E5%91%B3%5B%E4%BC%98%5D.js
// @description 刮削：支持，弹幕：支持，嗅探：支持
// @dependencies: axios, cheerio
// @version 1.3.1
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/七味.js

/**
 * ============================================================================
 * 七味 (QW)
 * 站点族：pcmp4 / qwnull / qwmkv / qwfilm / qnmp4 / qnnull / qnhot
 *
 * 说明：
 * - 由旧版 drpy rule 脚本转换为 OmniBox 标准五接口格式
 * - 保留原站分类筛选 URL 规则与详情页播放线路解析逻辑
 * - 增强日志输出，便于排查线路、解析和故障切换问题
 * ============================================================================
 */

const axios = require("axios");
const cheerio = require("cheerio");
const OmniBox = require("omnibox_sdk");

// 弹幕接口地址；留空表示不启用弹幕匹配；示例：https://danmu.example.com
const DANMU_API = process.env.DANMU_API || "";
function splitConfigList(value) {
    return String(value || "")
        .split(/[;,]/)
        .map((item) => item.trim())
        .filter(Boolean);
}

// 单个网盘链接最多生成多少条可用路线；同时也作为同一种网盘最多处理多少个成功分享的阈值；正整数；默认 3
const MAX_PAN_VALID_ROUTES = (() => {
    const raw = String(process.env.MAX_PAN_VALID_ROUTES || "3").trim();
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 3;
})();
// 需要展开“本地代理/服务端代理/直连”多路线的网盘类型；分号或逗号分隔；示例：quark;uc
const DRIVE_TYPE_CONFIG = splitConfigList(process.env.DRIVE_TYPE_CONFIG || "quark;uc");
// 可供网盘检测与播放使用的路线名称；分号或逗号分隔；示例：本地代理;服务端代理;直连
const SOURCE_NAMES_CONFIG = splitConfigList(process.env.SOURCE_NAMES_CONFIG || "本地代理;服务端代理;直连");
// 是否允许外网地址使用服务端代理；填 true 或 false；默认 false
const EXTERNAL_SERVER_PROXY_ENABLED = String(process.env.EXTERNAL_SERVER_PROXY_ENABLED || "false").toLowerCase() === "true";
// 网盘线路排序优先级；分号或逗号分隔；示例：baidu;tianyi;quark;uc;115;xunlei;ali;123pan
const DRIVE_ORDER = splitConfigList(process.env.DRIVE_ORDER || "baidu;tianyi;quark;uc;115;xunlei;ali;123pan").map((s) => s.toLowerCase());
// 七味网盘文件与刮削元数据缓存时长，单位秒；默认 43200（12 小时）
const QIWEI_CACHE_EX_SECONDS = Number(process.env.QIWEI_CACHE_EX_SECONDS || 43200);
const PAN_ROUTE_NAMES = SOURCE_NAMES_CONFIG.slice(0, MAX_PAN_VALID_ROUTES);

// ==================== 全局配置 ====================
const HOSTS = [
    "https://www.pcmp4.com",
    "https://www.qwnull.com",
    "https://www.qwmkv.com",
    "https://www.qwfilm.com",
    "https://www.qnmp4.com",
    "https://www.qnnull.com",
    "https://www.qnhot.com",
];

let currentHostIndex = 0;

const DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Connection": "keep-alive",
};

const CLASSES = [
    { type_id: "1", type_name: "电影" },
    { type_id: "2", type_name: "剧集" },
    { type_id: "3", type_name: "综艺" },
    { type_id: "4", type_name: "动漫" },
    { type_id: "30", type_name: "短剧" },
];

const FULL_TYPE_OPTIONS = [
    "剧情", "科幻", "动作", "喜剧", "爱情", "冒险", "儿童", "歌舞", "音乐", "奇幻", "动画", "恐怖", "惊悚", "丧尸", "战争", "传记", "纪录", "犯罪", "悬疑", "西部", "灾难", "古装", "武侠", "家庭", "短片", "校园", "文艺", "运动", "青春", "同性", "励志", "人性", "美食", "女性", "治愈", "历史",
];
const FULL_YEAR_OPTIONS = ["2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016", "2015", "2014", "2013", "2012", "2011", "2010"];
const FULL_AREA_OPTIONS = ["大陆", "香港", "台湾", "日本", "韩国", "泰国", "美国", "英国", "法国", "德国", "印度", "丹麦", "瑞典", "荷兰", "加拿大", "俄罗斯", "意大利", "比利时", "西班牙", "澳大利亚", "其他"];
const FULL_LANG_OPTIONS = ["国语", "粤语", "英语", "法语", "日语", "韩语", "泰语", "德语", "俄语", "闽南语", "丹麦语", "波兰语", "瑞典语", "印地语", "挪威语", "意大利语", "西班牙语", "无对白", "其他"];
const FULL_SORT_OPTIONS = [
    { name: "按时间", value: "time" },
    { name: "按人气", value: "hits" },
    { name: "按评分", value: "score" },
];

function buildFilterOptionList(list = []) {
    return [{ name: "全部", value: "" }, ...list.map((item) => ({ name: item, value: item }))];
}

function buildCategoryFilters({ includeType = true, includeYear = true, includeArea = true, includeLang = true } = {}) {
    const filters = [
        {
            key: "sort",
            name: "排序",
            init: "time",
            value: FULL_SORT_OPTIONS,
        },
    ];
    if (includeType) {
        filters.push({
            key: "type",
            name: "类型",
            init: "",
            value: buildFilterOptionList(FULL_TYPE_OPTIONS),
        });
    }
    if (includeYear) {
        filters.push({
            key: "year",
            name: "年代",
            init: "",
            value: buildFilterOptionList(FULL_YEAR_OPTIONS),
        });
    }
    if (includeArea) {
        filters.push({
            key: "area",
            name: "地区",
            init: "",
            value: buildFilterOptionList(FULL_AREA_OPTIONS),
        });
    }
    if (includeLang) {
        filters.push({
            key: "lang",
            name: "语言",
            init: "",
            value: buildFilterOptionList(FULL_LANG_OPTIONS),
        });
    }
    return filters;
}

const FILTERS = {
    "1": buildCategoryFilters(),
    "2": buildCategoryFilters(),
    "3": buildCategoryFilters({ includeYear: false, includeArea: false, includeLang: false }),
    "4": buildCategoryFilters({ includeArea: false, includeLang: false }),
    "30": buildCategoryFilters({ includeArea: false, includeLang: false }),
};

const axiosInstance = axios.create({
    timeout: 15000,
    validateStatus: (status) => status >= 200 && status < 500,
    responseType: "text",
});

// ==================== 日志工具 ====================
function logInfo(message, data = null) {
    const suffix = data == null ? "" : `: ${JSON.stringify(data)}`;
    OmniBox.log("info", `[七味] ${message}${suffix}`);
}

function logWarn(message, data = null) {
    const suffix = data == null ? "" : `: ${JSON.stringify(data)}`;
    OmniBox.log("warn", `[七味] ${message}${suffix}`);
}

function logError(message, error) {
    OmniBox.log("error", `[七味] ${message}: ${error?.message || error}`);
}

function encodeMeta(obj) {
    try {
        return Buffer.from(JSON.stringify(obj || {}), "utf8").toString("base64");
    } catch {
        return "";
    }
}

function decodeMeta(str) {
    try {
        const raw = Buffer.from(str || "", "base64").toString("utf8");
        return JSON.parse(raw || "{}");
    } catch {
        return {};
    }
}

function extractEpisode(title) {
    if (!title) return "";
    const processedTitle = title.trim();
    const seMatch = processedTitle.match(/[Ss](?:\d{1,2})?[-._\s]*[Ee](\d{1,3})/i);
    if (seMatch) return seMatch[1];
    const cnMatch = processedTitle.match(/第\s*([0-9]+)\s*[集话章节回期]/);
    if (cnMatch) return cnMatch[1];
    const epMatch = processedTitle.match(/\b(?:EP|E)[-._\s]*(\d{1,3})\b/i);
    if (epMatch) return epMatch[1];
    const bracketMatch = processedTitle.match(/[\[\(【（](\d{1,3})[\]\)】）]/);
    if (bracketMatch) {
        const num = bracketMatch[1];
        if (!["720", "1080", "480"].includes(num)) return num;
    }
    return "";
}

function buildFileNameForDanmu(vodName, episodeTitle) {
    if (!vodName) return "";
    if (!episodeTitle || episodeTitle === "正片" || episodeTitle === "播放") {
        return vodName;
    }
    const digits = extractEpisode(episodeTitle);
    if (digits) {
        const epNum = parseInt(digits, 10);
        if (epNum > 0) {
            return `${vodName} S01E${String(epNum).padStart(2, "0")}`;
        }
    }
    return vodName;
}

function buildScrapedEpisodeName(scrapeData, mapping, originalName) {
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
}

function buildScrapedDanmuFileName(scrapeData, scrapeType, mapping, fallbackVodName, fallbackEpisodeName) {
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
}

function inferDriveTypeFromSourceName(name = "") {
    const raw = String(name || "").toLowerCase();
    if (raw.includes("百度")) return "baidu";
    if (raw.includes("天翼")) return "tianyi";
    if (raw.includes("夸克")) return "quark";
    if (raw === "uc" || raw.includes("uc")) return "uc";
    if (raw.includes("115")) return "115";
    if (raw.includes("迅雷")) return "xunlei";
    if (raw.includes("阿里")) return "ali";
    if (raw.includes("123")) return "123pan";
    return raw;
}

function isPanSourceName(name = "") {
    const value = String(name || "");
    if (!value) return false;
    return ["百度", "天翼", "夸克", "UC", "115", "迅雷", "阿里", "123"].some((keyword) => value.includes(keyword));
}

function sortPlaySourcesByDriveOrder(playSources = []) {
    if (!Array.isArray(playSources) || playSources.length <= 1) {
        return playSources;
    }
    const orderMap = new Map(DRIVE_ORDER.map((name, index) => [name, index]));
    return [...playSources].sort((a, b) => {
        const aIsPan = isPanSourceName(a?.name || "");
        const bIsPan = isPanSourceName(b?.name || "");
        if (aIsPan !== bIsPan) {
            return aIsPan ? 1 : -1;
        }
        if (!aIsPan && !bIsPan) {
            return 0;
        }
        if (DRIVE_ORDER.length === 0) {
            return 0;
        }
        const aType = inferDriveTypeFromSourceName(a?.name || "");
        const bType = inferDriveTypeFromSourceName(b?.name || "");
        const aOrder = orderMap.has(aType) ? orderMap.get(aType) : Number.MAX_SAFE_INTEGER;
        const bOrder = orderMap.has(bType) ? orderMap.get(bType) : Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return 0;
    });
}

function resolveCallerSource(params = {}, context = {}) {
    return String(context?.from || params?.source || "").toLowerCase();
}

function getBaseURLHost(context = {}) {
    const baseURL = String(context?.baseURL || "").trim();
    if (!baseURL) return "";
    try {
        return new URL(baseURL).hostname.toLowerCase();
    } catch {
        return baseURL.toLowerCase();
    }
}

function isPrivateHost(hostname = "") {
    const host = String(hostname || "").toLowerCase();
    if (!host) return false;
    if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "0.0.0.0") return true;
    if (/^(10\.|192\.168\.|169\.254\.)/.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
    if (host.endsWith(".local") || host.endsWith(".lan") || host.endsWith(".internal") || host.endsWith(".intra")) return true;
    if (host.includes(":")) return host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80");
    return false;
}

function canUseServerProxy(context = {}) {
    if (EXTERNAL_SERVER_PROXY_ENABLED) return true;
    return isPrivateHost(getBaseURLHost(context));
}

function filterSourceNamesForCaller(sourceNames = [], callerSource = "", context = {}) {
    let filtered = Array.isArray(sourceNames) ? [...sourceNames] : [];
    const allowServerProxy = canUseServerProxy(context);

    if (callerSource === "web") {
        filtered = filtered.filter((name) => name !== "本地代理");
    } else if (callerSource === "emby") {
        if (allowServerProxy) {
            filtered = filtered.filter((name) => name === "服务端代理");
        } else {
            filtered = filtered.filter((name) => name !== "服务端代理");
        }
    } else if (callerSource === "uz") {
        filtered = filtered.filter((name) => name !== "本地代理");
    }

    if (!allowServerProxy) {
        filtered = filtered.filter((name) => name !== "服务端代理");
    }

    return filtered.length > 0 ? filtered : ["直连"];
}

function resolveRouteType(flag = "", callerSource = "", context = {}) {
    const allowServerProxy = canUseServerProxy(context);
    const validRouteTypes = new Set(["本地代理", "服务端代理", "直连"]);
    let routeType = "直连";

    if (callerSource === "web" || callerSource === "emby") {
        routeType = allowServerProxy ? "服务端代理" : "直连";
    }

    if (flag) {
        if (flag.includes("-")) {
            const flagParts = flag.split("-");
            routeType = flagParts[flagParts.length - 1];
        } else {
            routeType = flag;
        }
    }

    if (!validRouteTypes.has(routeType)) {
        routeType = "直连";
    }

    if (!allowServerProxy && routeType === "服务端代理") {
        routeType = "直连";
    }

    if (callerSource === "uz" && routeType === "本地代理") {
        routeType = "直连";
    }

    return routeType;
}

async function matchDanmu(fileName) {
    if (!DANMU_API || !fileName) {
        return [];
    }

    try {
        logInfo("匹配弹幕", { fileName });
        const response = await OmniBox.request(`${DANMU_API}/api/v2/match`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            body: JSON.stringify({ fileName }),
        });

        if (response.statusCode !== 200) {
            logWarn("弹幕匹配失败", { statusCode: response.statusCode });
            return [];
        }

        const data = JSON.parse(response.body || "{}");
        if (!data.isMatched) {
            return [];
        }

        const first = (data.matches || [])[0] || {};
        if (!first.episodeId) {
            return [];
        }

        const animeTitle = first.animeTitle || "";
        const episodeTitle = first.episodeTitle || "";
        let danmakuName = "弹幕";
        if (animeTitle && episodeTitle) {
            danmakuName = `${animeTitle} - ${episodeTitle}`;
        } else if (animeTitle) {
            danmakuName = animeTitle;
        } else if (episodeTitle) {
            danmakuName = episodeTitle;
        }

        return [{ name: danmakuName, url: `${DANMU_API}/api/v2/comment/${first.episodeId}?format=xml` }];
    } catch (error) {
        logWarn("弹幕匹配异常", { error: error.message || String(error) });
        return [];
    }
}

// ==================== 基础工具 ====================
function getCurrentHost() {
    return HOSTS[currentHostIndex] || HOSTS[0];
}

function rotateHost() {
    currentHostIndex = (currentHostIndex + 1) % HOSTS.length;
    return getCurrentHost();
}

function fixJsonWrappedHtml(html) {
    if (html == null) {
        return "";
    }
    if (typeof html === "object") {
        try {
            return JSON.stringify(html);
        } catch {
            return "";
        }
    }
    const raw = String(html);
    const trimmed = raw.trim();
    if (!trimmed) {
        return "";
    }
    if (trimmed.startsWith("<") || trimmed.startsWith("<!DOCTYPE")) {
        return trimmed;
    }
    if (trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
        try {
            const parsed = JSON.parse(trimmed);
            if (typeof parsed === "string") {
                return parsed.trim();
            }
        } catch {
            return trimmed;
        }
    }
    return trimmed;
}

function safeJsonParse(value, fallback = null) {
    if (value == null || value === "") {
        return fallback;
    }
    if (typeof value === "object") {
        return value;
    }
    try {
        return JSON.parse(String(value));
    } catch {
        return fallback;
    }
}

function isAbsoluteUrl(url) {
    return /^https?:\/\//i.test(String(url || ""));
}

function fixUrl(url, host = getCurrentHost()) {
    const value = String(url || "").trim();
    if (!value) {
        return "";
    }
    if (isAbsoluteUrl(value)) {
        return value;
    }
    if (value.startsWith("//")) {
        return `https:${value}`;
    }
    if (value.startsWith("/")) {
        return `${host}${value}`;
    }
    return `${host}/${value}`;
}

function normalizeImage(url, host = getCurrentHost()) {
    const normalized = fixUrl(url, host);
    return normalized || "";
}

function parsePage(value, fallback = 1) {
    const n = parseInt(value, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseFilters(params = {}) {
    const merged = {};
    const candidates = [params.filters, params.extend, params.ext];
    for (const item of candidates) {
        if (!item) {
            continue;
        }
        if (typeof item === "object") {
            Object.assign(merged, item);
            continue;
        }
        if (typeof item === "string") {
            try {
                const parsed = JSON.parse(item);
                if (parsed && typeof parsed === "object") {
                    Object.assign(merged, parsed);
                }
            } catch {
                // ignore invalid filter json
            }
        }
    }
    const normalized = {};
    for (const [key, value] of Object.entries(merged)) {
        if (!["sort", "type", "area", "lang", "year"].includes(key)) {
            continue;
        }
        normalized[key] = String(value || "").trim();
    }
    if (!FULL_SORT_OPTIONS.some((item) => item.value === normalized.sort)) {
        normalized.sort = "time";
    }
    return normalized;
}

async function requestHtml(url, options = {}) {
    const response = await axiosInstance.get(url, {
        ...options,
        headers: {
            ...DEFAULT_HEADERS,
            Referer: `${getCurrentHost()}/`,
            Origin: getCurrentHost(),
            ...(options.headers || {}),
        },
    });
    return fixJsonWrappedHtml(response.data || "");
}

/**
 * 按 host 列表自动重试。
 * - 绝对 URL：直接请求一次
 * - 相对 URL：按当前 host 开始轮询，成功即返回
 */
async function requestHtmlWithFailover(pathOrUrl, options = {}) {
    if (isAbsoluteUrl(pathOrUrl)) {
        return requestHtml(pathOrUrl, options);
    }

    let lastError = null;
    const startIndex = currentHostIndex;

    for (let i = 0; i < HOSTS.length; i++) {
        const host = HOSTS[currentHostIndex];
        const url = fixUrl(pathOrUrl, host);
        try {
            logInfo("请求页面", { host, path: pathOrUrl });
            const html = await requestHtml(url, {
                ...options,
                headers: {
                    ...(options.headers || {}),
                    Referer: `${host}/`,
                    Origin: host,
                },
            });

            if (html) {
                const trimmed = String(html).trim();
                const isHtml = trimmed.includes("<html") || trimmed.startsWith("<!DOCTYPE");
                const isJson = trimmed.startsWith("{") || trimmed.startsWith("[");
                if (isHtml || isJson) {
                    if (i > 0) {
                        logInfo("站点切换成功", { from: HOSTS[startIndex], to: host });
                    }
                    return { html, host };
                }
            }

            lastError = new Error("empty or invalid html");
            logWarn("页面内容异常，切换下一个 host", { host });
        } catch (error) {
            lastError = error;
            logWarn("请求失败，切换下一个 host", { host, error: error.message || String(error) });
        }

        rotateHost();
    }

    throw lastError || new Error("all hosts failed");
}

// ==================== 列表解析 ====================
function pickFirstText($root, selectors = []) {
    for (const selector of selectors) {
        const value = $root.find(selector).first().text().trim();
        if (value) {
            return value;
        }
    }
    return "";
}

function pickFirstAttr($root, selectors = [], attrName = "href") {
    for (const selector of selectors) {
        const value = $root.find(selector).first().attr(attrName);
        if (value) {
            return String(value).trim();
        }
    }
    return "";
}

function parsePosterItem($, element, host) {
    const $item = $(element);

    const title =
        pickFirstAttr($item, ["h3 a", ".title a", ".li-img a", "a"], "title") ||
        pickFirstText($item, ["h3 a", ".title a", "a"]);

    if (!title) {
        return null;
    }

    const desc = pickFirstText($item, [".tag", ".label", ".remark"]);
    const img = pickFirstAttr($item, [".li-img img", "img"], "src");
    const href = pickFirstAttr($item, ["h3 a", ".title a", ".li-img a", "a"], "href");

    if (!href) {
        return null;
    }

    return {
        vod_id: fixUrl(href, host),
        vod_name: title,
        vod_pic: normalizeImage(img, host),
        vod_remarks: desc || "",
    };
}

function parseVideoList(html, host) {
    const $ = cheerio.load(html || "");
    const nodes = $(".content-list li");
    const list = [];
    nodes.each((_, element) => {
        const item = parsePosterItem($, element, host);
        if (item) {
            list.push(item);
        }
    });
    return list;
}

function buildCategoryPath(categoryId, page, filters = {}) {
    const area = encodeURIComponent(String(filters.area || "").trim());
    const sort = String(filters.sort || "time").trim() || "time";
    const type = encodeURIComponent(String(filters.type || "").trim());
    const lang = encodeURIComponent(String(filters.lang || "").trim());
    const year = encodeURIComponent(String(filters.year || "").trim());
    return `/ms/${categoryId}-${area}-${sort}-${type}-${lang}-------${year}.html?page=${page}`;
}

function parsePanTypeKey(url) {
    const source = String(url || "").toLowerCase();
    if (!source) {
        return "";
    }
    const mapping = {
        "pan.baidu.com": "baidu",
        "pan.baiduimg.com": "baidu",
        "pan.quark.cn": "quark",
        "drive.uc.cn": "uc",
        "cloud.189.cn": "tianyi",
        "yun.139.com": "mobile",
        "alipan.com": "ali",
        "pan.aliyun.com": "ali",
        "115.com": "115",
        "115cdn.com": "115",
    };

    for (const [key, type] of Object.entries(mapping)) {
        if (source.includes(key)) {
            return type;
        }
    }
    return "";
}

function parsePanType(url) {
    const typeKey = parsePanTypeKey(url);
    const typeMap = {
        baidu: "百度",
        quark: "夸克",
        uc: "UC",
        tianyi: "天翼",
        mobile: "移动",
        ali: "阿里",
        115: "115",
    };
    return typeMap[typeKey] || "其他";
}

function isPanUrl(url) {
    const source = String(url || "");
    if (!source) {
        return false;
    }
    return [
        "pan.baidu.com",
        "pan.baiduimg.com",
        "pan.quark.cn",
        "drive.uc.cn",
        "cloud.189.cn",
        "yun.139.com",
        "alipan.com",
        "pan.aliyun.com",
        "115.com",
        "115cdn.com",
    ].some((key) => source.includes(key));
}

function isDirectVideoUrl(url) {
    if (!url) {
        return false;
    }
    return /\.(m3u8|mp4|flv|avi|mkv|ts|mov|webm)(\?|$)/i.test(String(url));
}

function normalizeShareUrl(url) {
    if (!url) {
        return "";
    }
    let value = String(url).trim();
    if (value.startsWith("push://")) {
        value = value.slice("push://".length);
    }
    if (value.startsWith("push:")) {
        value = value.slice("push:".length);
    }
    const dnIndex = value.toLowerCase().indexOf("&dn=");
    if (dnIndex !== -1) {
        value = value.slice(0, dnIndex);
    }
    return value.trim();
}

function isVideoFile(file) {
    if (!file || !file.file_name) {
        return false;
    }
    const fileName = String(file.file_name).toLowerCase();
    const videoExtensions = [".mp4", ".mkv", ".avi", ".flv", ".mov", ".wmv", ".m3u8", ".ts", ".webm", ".m4v"];
    for (const ext of videoExtensions) {
        if (fileName.endsWith(ext)) {
            return true;
        }
    }
    if (file.format_type) {
        const formatType = String(file.format_type).toLowerCase();
        if (formatType.includes("video") || formatType.includes("mpeg") || formatType.includes("h264")) {
            return true;
        }
    }
    return false;
}

function getFileId(file) {
    return file?.fid || file?.file_id || "";
}

function getFileName(file) {
    return file?.file_name || file?.name || "";
}

async function getAllVideoFiles(shareURL, files) {
    const videoFiles = [];
    for (const file of files || []) {
        if (file.file && isVideoFile(file)) {
            videoFiles.push(file);
        } else if (file.dir) {
            try {
                const subFileId = getFileId(file);
                if (!subFileId) {
                    continue;
                }
                const subFileList = await OmniBox.getDriveFileList(shareURL, subFileId);
                if (subFileList && Array.isArray(subFileList.files)) {
                    const subVideos = await getAllVideoFiles(shareURL, subFileList.files);
                    videoFiles.push(...subVideos);
                }
            } catch (error) {
                logWarn("获取网盘子目录文件失败", { shareURL, fileId: getFileId(file), error: error.message || String(error) });
            }
        }
    }
    return videoFiles;
}

function buildCacheKey(prefix, value) {
    return `${prefix}:${String(value || "")}`;
}

async function getCachedJSON(key) {
    try {
        return await OmniBox.getCache(key);
    } catch (error) {
        logWarn("读取缓存失败", { key, error: error.message || String(error) });
        return null;
    }
}

async function setCachedJSON(key, value, exSeconds = QIWEI_CACHE_EX_SECONDS) {
    try {
        await OmniBox.setCache(key, value, exSeconds);
    } catch (error) {
        logWarn("写入缓存失败", { key, error: error.message || String(error) });
    }
}

async function getDriveInfoCached(shareURL) {
    const cacheKey = buildCacheKey("qiwei:driveInfo", shareURL);
    let driveInfo = await getCachedJSON(cacheKey);
    if (!driveInfo) {
        driveInfo = await OmniBox.getDriveInfoByShareURL(shareURL);
        if (driveInfo) {
            await setCachedJSON(cacheKey, driveInfo);
        }
    } else {
        logInfo("命中网盘信息缓存", { shareURL });
    }
    return driveInfo;
}

async function getRootFileListCached(shareURL) {
    const cacheKey = buildCacheKey("qiwei:rootFiles", shareURL);
    let fileList = await getCachedJSON(cacheKey);
    if (!fileList) {
        fileList = await OmniBox.getDriveFileList(shareURL, "0");
        if (fileList && Array.isArray(fileList.files)) {
            await setCachedJSON(cacheKey, fileList);
        }
    } else {
        logInfo("命中网盘根目录缓存", { shareURL, count: Array.isArray(fileList?.files) ? fileList.files.length : 0 });
    }
    return fileList;
}

async function getAllVideoFilesCached(shareURL, rootFiles = []) {
    const cacheKey = buildCacheKey("qiwei:videoFiles", shareURL);
    let videos = await getCachedJSON(cacheKey);
    if (!Array.isArray(videos) || videos.length === 0) {
        videos = await getAllVideoFiles(shareURL, rootFiles);
        if (Array.isArray(videos) && videos.length > 0) {
            await setCachedJSON(cacheKey, videos);
        }
    } else {
        logInfo("命中网盘视频文件缓存", { shareURL, count: videos.length });
    }
    return Array.isArray(videos) ? videos : [];
}

async function getMergedMetadataCached(videoId, vodName, scrapeCandidates = []) {
    const metadataCacheKey = buildCacheKey("qiwei:metadata", videoId);
    const metadataRefreshLockKey = buildCacheKey("qiwei:metadataRefreshLock", videoId);

    let scrapeData = null;
    let videoMappings = [];
    let scrapeType = "";
    const cachedMetadata = await getCachedJSON(metadataCacheKey);

    if (cachedMetadata) {
        scrapeData = cachedMetadata.scrapeData || null;
        videoMappings = Array.isArray(cachedMetadata.videoMappings) ? cachedMetadata.videoMappings : [];
        scrapeType = cachedMetadata.scrapeType || "";
        logInfo("命中刮削元数据缓存", { videoId, mappingCount: videoMappings.length, scrapeType });
    }

    const refreshMetadataInBackground = async () => {
        const refreshLock = await getCachedJSON(metadataRefreshLockKey);
        if (refreshLock || scrapeCandidates.length === 0) {
            return;
        }
        await setCachedJSON(metadataRefreshLockKey, { refreshing: true }, QIWEI_CACHE_EX_SECONDS);
        try {
            logInfo("后台刷新刮削元数据", { videoId, candidateCount: scrapeCandidates.length });
            await OmniBox.processScraping(String(videoId || ""), vodName || "", vodName || "", scrapeCandidates);
            const metadata = await OmniBox.getScrapeMetadata(String(videoId || ""));
            await setCachedJSON(metadataCacheKey, {
                scrapeData: metadata?.scrapeData || null,
                videoMappings: metadata?.videoMappings || [],
                scrapeType: metadata?.scrapeType || "",
            }, QIWEI_CACHE_EX_SECONDS);
        } catch (error) {
            logWarn("后台刷新刮削元数据失败", { videoId, error: error.message || String(error) });
        }
    };

    if (!cachedMetadata && scrapeCandidates.length > 0) {
        try {
            logInfo("未命中刮削元数据缓存，开始同步刮削", { videoId, candidateCount: scrapeCandidates.length });
            const scrapingResult = await OmniBox.processScraping(String(videoId || ""), vodName || "", vodName || "", scrapeCandidates);
            logInfo("刮削处理完成", { videoId, length: JSON.stringify(scrapingResult || {}).length });
            const metadata = await OmniBox.getScrapeMetadata(String(videoId || ""));
            scrapeData = metadata?.scrapeData || null;
            videoMappings = metadata?.videoMappings || [];
            scrapeType = metadata?.scrapeType || "";
            await setCachedJSON(metadataCacheKey, {
                scrapeData,
                videoMappings,
                scrapeType,
            }, QIWEI_CACHE_EX_SECONDS);
            logInfo("刮削元数据读取完成", { videoId, hasScrapeData: !!scrapeData, mappingCount: videoMappings.length, scrapeType });
        } catch (error) {
            logWarn("刮削处理失败", { videoId, error: error.message || String(error) });
        }
    } else if (cachedMetadata) {
        refreshMetadataInBackground().catch((error) => {
            logWarn("异步刷新刮削元数据失败", { videoId, error: error.message || String(error) });
        });
    }

    return {
        scrapeData,
        videoMappings,
        scrapeType,
        cachedMetadata,
    };
}

const panRouteCache = new Map();

async function loadPanFiles(shareURL) {
    if (!shareURL) {
        return null;
    }
    try {
        await getDriveInfoCached(shareURL);
        const fileList = await getRootFileListCached(shareURL);
        const files = Array.isArray(fileList?.files) ? fileList.files : [];
        const videos = await getAllVideoFilesCached(shareURL, files);
        return { videos };
    } catch (error) {
        logWarn("读取网盘文件失败", { shareURL, error: error.message || String(error) });
        return null;
    }
}

function extractRouteTypeFromFlag(flag) {
    const value = String(flag || "").trim();
    if (!value) {
        return "";
    }
    if (value.includes("-")) {
        const last = value.split("-").pop();
        return String(last || "").trim();
    }
    return value;
}

function hasValidPlayUrls(playInfo) {
    return Array.isArray(playInfo?.url) && playInfo.url.some((item) => item?.url);
}

async function detectValidPanRoutes(shareURL, videos = [], callerSource = "", context = {}, maxNeeded = MAX_PAN_VALID_ROUTES) {
    const routeLimit = Math.max(1, Math.min(MAX_PAN_VALID_ROUTES, parseInt(maxNeeded, 10) || MAX_PAN_VALID_ROUTES));
    const filteredCandidates = filterSourceNamesForCaller(PAN_ROUTE_NAMES.length > 0 ? PAN_ROUTE_NAMES : ["直连"], callerSource, context);
    const cacheKey = `${shareURL}::${callerSource || "default"}::${routeLimit}::${filteredCandidates.join(",")}`;
    if (panRouteCache.has(cacheKey)) {
        return panRouteCache.get(cacheKey);
    }

    const sample = (videos || []).find((x) => getFileId(x));
    if (!sample) {
        const fallback = filteredCandidates.length > 0 ? filteredCandidates : ["直连"];
        const result = fallback.slice(0, routeLimit);
        panRouteCache.set(cacheKey, result);
        return result;
    }

    const sampleFileId = getFileId(sample);
    const validRoutes = [];

    for (const routeName of filteredCandidates.slice(0, routeLimit)) {
        try {
            const playInfo = await OmniBox.getDriveVideoPlayInfo(shareURL, sampleFileId, routeName);
            if (hasValidPlayUrls(playInfo)) {
                validRoutes.push(routeName);
            }
        } catch (error) {
            logWarn("网盘线路有效性检测失败", { shareURL, routeName, error: error.message || String(error) });
        }
    }

    const result = validRoutes.slice(0, routeLimit);
    panRouteCache.set(cacheKey, result);
    logInfo("网盘线路有效性检测完成", {
        shareURL,
        callerSource,
        candidates: filteredCandidates,
        validRoutes: result,
        routeLimit,
    });
    return result;
}

function isBlockedLineName(name) {
    if (!name) {
        return false;
    }
    return String(name).includes("磁力");
}

// ==================== 标准接口 ====================
async function home(params) {
    try {
        const { html, host } = await requestHtmlWithFailover("/");
        const list = parseVideoList(html, host);
        logInfo("首页加载完成", { host, count: list.length });
        return {
            class: CLASSES,
            filters: FILTERS,
            list,
        };
    } catch (error) {
        logError("首页加载失败", error);
        return {
            class: CLASSES,
            filters: FILTERS,
            list: [],
        };
    }
}

async function category(params) {
    const categoryId = String(params.categoryId || "1");
    const page = parsePage(params.page, 1);
    const filters = parseFilters(params);

    try {
        const path = buildCategoryPath(categoryId, page, filters);
        const { html, host } = await requestHtmlWithFailover(path);
        const list = parseVideoList(html, host);
        logInfo("分类加载完成", { categoryId, page, host, count: list.length, filters });
        return {
            page,
            pagecount: list.length >= 20 ? page + 1 : page,
            total: list.length,
            list,
        };
    } catch (error) {
        logError("分类加载失败", error);
        return {
            page,
            pagecount: page,
            total: 0,
            list: [],
        };
    }
}

async function search(params) {
    const keyword = String(params.keyword || params.wd || "").trim();
    const page = parsePage(params.page, 1);

    if (!keyword) {
        logWarn("搜索关键词为空");
        return {
            page,
            pagecount: page,
            total: 0,
            list: [],
        };
    }

    try {
        const path = `/index.php/ajax/suggest?mid=1&limit=20&wd=${encodeURIComponent(keyword)}`;
        const { html, host } = await requestHtmlWithFailover(path, {
            headers: {
                Accept: "application/json, text/plain, */*",
                "X-Requested-With": "XMLHttpRequest",
                Referer: `${getCurrentHost()}/`,
            },
        });
        const data = safeJsonParse(html, {});
        const items = Array.isArray(data?.list) ? data.list : [];
        const list = items.map((item) => {
            const vodId = String(item?.id || "").trim();
            const pic = normalizeImage(item?.pic || "", host);
            return {
                vod_id: vodId,
                vod_name: String(item?.name || "").trim(),
                vod_pic: pic,
                vod_remarks: "",
            };
        }).filter((item) => item.vod_id && item.vod_name);
        const pageCount = Number(data?.pagecount) || (list.length >= 20 ? page + 1 : page);
        const total = Number(data?.total) || list.length;
        logInfo("搜索完成", { keyword, page, host, count: list.length, api: path, total, pageCount });
        return {
            page,
            pagecount: pageCount,
            total,
            list,
        };
    } catch (error) {
        logError("搜索失败", error);
        return {
            page,
            pagecount: page,
            total: 0,
            list: [],
        };
    }
}

function parseDetailInfo(html, host) {
    const $ = cheerio.load(html || "");

    const title =
        $(".main-ui-meta h1").first().clone().children("span").remove().end().text().trim() ||
        $(".detail-title").first().text().trim() ||
        "";

    let typeName = "";
    const typeBox = html.match(/<div><span>类型：<\/span>[\s\S]*?<\/div>/);
    if (typeBox && typeBox[0]) {
        const names = [...typeBox[0].matchAll(/<a[^>]*>([^<]+)<\/a>/g)].map((m) => m[1]);
        typeName = [...new Set(names)].join("/");
    }

    let area = "";
    const areaBox = html.match(/<div><span>地区：<\/span>[\s\S]*?<\/div>/);
    if (areaBox && areaBox[0]) {
        const names = [...areaBox[0].matchAll(/<a[^>]*>([^<]+)<\/a>/g)].map((m) => m[1]);
        area = [...new Set(names)].join("/");
    }

    const showContent = $(".movie-introduce .zkjj_a").first().text().replace(/\s*\[展开全部\]/g, "").trim();
    const hideContent = $(".movie-introduce .sqjj_a").first().text().replace(/\s*\[收起部分\]/g, "").trim();

    const directorMatch = html.match(/<div>[\s\S]*?导演：[\s\S]*?<\/div>/);
    const director = directorMatch?.[0]?.match(/<a[^>]*>([^<]+)<\/a>/)?.[1] || "";

    return {
        vod_name: title,
        type_name: typeName || $(".main-ui-meta div:nth-child(9) a").first().text().trim(),
        vod_pic: normalizeImage($(".img img").first().attr("src"), host),
        vod_content: hideContent || showContent || $(".detail-content").first().text().trim() || "",
        vod_remarks: $(".otherbox").first().text().trim() || "",
        vod_year: ($(".main-ui-meta h1 span.year").first().text() || "").replace(/[()]/g, "").trim(),
        vod_area: area || $(".main-ui-meta div:nth-child(11) a").first().text().trim(),
        vod_actor: ($(".main-ui-meta div.text-overflow").first().text() || "").replace(/^主演：/, "").trim(),
        vod_director: director,
    };
}

function normalizeCollectLineName(name = "") {
    return String(name || "")
        .replace(/[\u00a0\u2000-\u200f\u2028-\u202f\u205f\u3000]/g, " ")
        .replace(/\s+/g, " ")
        .replace(/\s+(\d+)$/u, "")
        .trim();
}

function formatPanSourceName(type = "", index = 0) {
    const baseName = String(type || "").trim() || "网盘";
    const suffix = index > 0 ? ` ${index + 1}` : "";
    return `${baseName}${suffix}`;
}

async function parsePlaySources(html, videoId, host, callerSource = "", context = {}) {
    const $ = cheerio.load(html || "");
    const playSources = [];

    const tabItems = $(".py-tabs li").toArray();
    const episodeContainers = $(".bd ul.player").toArray();
    const normalizedLineNames = tabItems.map((tab, index) => {
        const rawName = $(tab).text().trim();
        const normalizedName = normalizeCollectLineName(rawName);
        return normalizedName || `线路${index + 1}`;
    });
    const lineNameCounter = normalizedLineNames.reduce((acc, name) => {
        acc.set(name, (acc.get(name) || 0) + 1);
        return acc;
    }, new Map());
    const lineNameSeen = new Map();

    const lineCount = Math.min(tabItems.length, episodeContainers.length);
    for (let i = 0; i < lineCount; i++) {
        const baseLineName = normalizedLineNames[i] || `线路${i + 1}`;
        const duplicatedCount = lineNameCounter.get(baseLineName) || 0;
        const currentIndex = (lineNameSeen.get(baseLineName) || 0) + 1;
        lineNameSeen.set(baseLineName, currentIndex);
        const lineName = duplicatedCount > 1 ? `${baseLineName} ${currentIndex}` : baseLineName;

        if (isBlockedLineName(lineName)) {
            continue;
        }

        const episodes = [];
        $(episodeContainers[i])
            .find("a")
            .each((idx, node) => {
                const name = $(node).text().trim() || `第${idx + 1}集`;
                const fid = `${videoId}#${i}#${idx}`;
                episodes.push({
                    name,
                    playId: `${videoId}|${i}|${idx}|||${encodeMeta({ sid: String(videoId || ""), fid, e: name })}`,
                    _fid: fid,
                    _rawName: name,
                });
            });

        if (episodes.length === 0) {
            const fid = `${videoId}#${i}#0`;
            episodes.push({
                name: "正片",
                playId: `${videoId}|${i}|0|||${encodeMeta({ sid: String(videoId || ""), fid, e: "正片" })}`,
                _fid: fid,
                _rawName: "正片",
            });
        }

        playSources.push({
            name: lineName,
            episodes,
        });
    }

    // 网盘链接
    const panRegex = /https?:\/\/(pan\.baidu\.com|pan\.quark\.cn|drive\.uc\.cn|cloud\.189\.cn|yun\.139\.com|alipan\.com|pan\.aliyun\.com|115\.com|115cdn\.com)\/[^"'\s>]+/g;
    const htmlPanLinks = html.match(panRegex) || [];
    const anchorPanLinks = $("a")
        .toArray()
        .flatMap((a) => {
            const links = [];
            const href = $(a).attr("href") || "";
            const clipboard = $(a).attr("data-clipboard-text") || "";
            if (isPanUrl(href)) {
                links.push(href);
            }
            if (isPanUrl(clipboard)) {
                links.push(clipboard);
            }
            return links;
        });

    const allPanLinks = [...new Set([...htmlPanLinks, ...anchorPanLinks])];
    const grouped = {};

    for (const link of allPanLinks) {
        const type = parsePanType(link);
        if (type === "其他") {
            continue;
        }
        if (!grouped[type]) {
            grouped[type] = [];
        }
        grouped[type].push(link);
    }

    for (const [type, links] of Object.entries(grouped)) {
        const maxRoutesPerLink = Math.max(1, MAX_PAN_VALID_ROUTES);
        const maxShareCount = maxRoutesPerLink;
        let builtShareCount = 0;

        for (let index = 0; index < links.length; index++) {
            if (builtShareCount >= maxShareCount) {
                logInfo("已达到同类网盘分享阈值，跳过后续分享", { type, maxShareCount, skipped: links.length - index });
                break;
            }

            const link = links[index];
            const shareURL = normalizeShareUrl(link);
            if (!isPanUrl(shareURL)) {
                continue;
            }

            const sourceName = formatPanSourceName(type, builtShareCount);
            const driveTypeKey = parsePanTypeKey(shareURL);
            const multiRouteEnabled = driveTypeKey && DRIVE_TYPE_CONFIG.includes(driveTypeKey);

            const panInfo = await loadPanFiles(shareURL);
            const files = panInfo?.videos || [];
            if (!files.length) {
                logInfo("网盘分享未解析到有效视频文件，跳过当前分享", { type, shareURL });
                continue;
            }

            const panEpisodes = [];

            for (const file of files) {
                const fileId = getFileId(file);
                if (!fileId) {
                    continue;
                }
                const fileName = getFileName(file) || sourceName;
                const fid = `${videoId}#pan#${builtShareCount}#${fileId}`;
                const combinedId = `${shareURL}|${fileId}|||${encodeMeta({ sid: String(videoId || ""), fid, e: fileName })}`;
                panEpisodes.push({
                    name: fileName,
                    playId: combinedId,
                    _fid: fid,
                    _rawName: fileName,
                });
            }

            if (panEpisodes.length === 0) {
                logInfo("网盘分享视频文件缺少可用 fileId，跳过当前分享", { type, shareURL, files: files.length });
                continue;
            }

            if (!multiRouteEnabled) {
                playSources.push({
                    name: sourceName,
                    episodes: panEpisodes.map((ep) => ({
                        name: ep.name,
                        playId: ep.playId,
                        _fid: ep._fid,
                        _rawName: ep._rawName,
                    })),
                });
                builtShareCount += 1;
                continue;
            }

            const validRoutes = await detectValidPanRoutes(shareURL, files, callerSource, context, maxRoutesPerLink);
            if (validRoutes.length === 0) {
                logInfo("网盘分享未检测到有效播放路线，跳过当前分享", { type, shareURL });
                continue;
            }

            for (const routeName of validRoutes.slice(0, maxRoutesPerLink)) {
                playSources.push({
                    name: `${sourceName} ${routeName}`,
                    episodes: panEpisodes.map((ep) => ({
                        name: ep.name,
                        playId: ep.playId,
                        _fid: ep._fid,
                        _rawName: ep._rawName,
                    })),
                });
            }
            builtShareCount += 1;
        }
    }

    if (playSources.length === 0) {
        playSources.push({
            name: "默认线路",
            episodes: [
                {
                    name: "正片",
                    playId: `${videoId}|0|0|||${encodeMeta({ sid: String(videoId || ""), fid: `${videoId}#0#0`, e: "正片" })}`,
                    _fid: `${videoId}#0#0`,
                    _rawName: "正片",
                },
            ],
        });
    }

    logInfo("解析播放线路完成", { host, lines: playSources.length });
    return playSources;
}

function extractVideoId(urlOrId) {
    const value = String(urlOrId || "");
    const match = value.match(/\/mv\/(\d+)\.html/);
    return match ? match[1] : value;
}

async function detail(params, context = {}) {
    const inputId = params.videoId || "";
    const videoId = extractVideoId(inputId);

    if (!videoId) {
        logWarn("详情请求缺少有效 videoId", { inputId });
        return { list: [] };
    }

    const path = `/mv/${videoId}.html`;

    try {
        const { html, host } = await requestHtmlWithFailover(path);
        const info = parseDetailInfo(html, host);
        const callerSource = resolveCallerSource(params, context);
        let playSources = await parsePlaySources(html, videoId, host, callerSource, context);

        let scrapeData = null;
        let videoMappings = [];
        let scrapeType = "";
        const scrapeCandidates = [];
        const seenFids = new Set();

        for (const source of playSources) {
            for (const ep of source.episodes || []) {
                if (!ep._fid) continue;
                if (seenFids.has(ep._fid)) continue;
                seenFids.add(ep._fid);
                scrapeCandidates.push({
                    fid: ep._fid,
                    file_id: ep._fid,
                    file_name: ep._rawName || ep.name || "正片",
                    name: ep._rawName || ep.name || "正片",
                    format_type: "video",
                });
            }
        }

        if (scrapeCandidates.length > 0) {
            ({ scrapeData, videoMappings, scrapeType } = await getMergedMetadataCached(
                String(videoId || ""),
                info.vod_name || "",
                scrapeCandidates
            ));
        }

        for (const source of playSources) {
            for (const ep of source.episodes || []) {
                const mapping = videoMappings.find((m) => m?.fileId === ep._fid);
                if (!mapping) continue;
                const newName = buildScrapedEpisodeName(scrapeData, mapping, ep.name);
                if (newName && newName !== ep.name) {
                    logInfo("应用刮削后源文件名", { old: ep.name, new: newName });
                    ep.name = newName;
                }
                ep._seasonNumber = mapping.seasonNumber;
                ep._episodeNumber = mapping.episodeNumber;
            }

            const hasEpisodeNumber = (source.episodes || []).some((ep) => ep._episodeNumber !== undefined && ep._episodeNumber !== null);
            if (hasEpisodeNumber) {
                source.episodes.sort((a, b) => {
                    const sa = a._seasonNumber || 0;
                    const sb = b._seasonNumber || 0;
                    if (sa !== sb) return sa - sb;
                    const ea = a._episodeNumber || 0;
                    const eb = b._episodeNumber || 0;
                    return ea - eb;
                });
            }
        }

        const normalizedPlaySources = sortPlaySourcesByDriveOrder(playSources).map((source) => ({
            name: source.name,
            episodes: (source.episodes || []).map((ep) => ({
                name: ep.name,
                playId: ep.playId,
            })),
        }));

        const vod = {
            vod_id: videoId,
            ...info,
            vod_play_sources: normalizedPlaySources,
        };

        if (scrapeData) {
            vod.vod_name = scrapeData.title || vod.vod_name;
            if (scrapeData.posterPath) {
                vod.vod_pic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
            }
            if (scrapeData.overview) {
                vod.vod_content = scrapeData.overview;
            }
            if (scrapeData.releaseDate) {
                vod.vod_year = String(scrapeData.releaseDate).substring(0, 4) || vod.vod_year || "";
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
            list: [vod],
        };
    } catch (error) {
        logError("详情解析失败", error);
        return { list: [] };
    }
}

async function play(params, context = {}) {
    let playId = String(params.playId || "").trim();
    const flag = String(params.flag || "").trim();
    const callerSource = resolveCallerSource(params, context);
    let playMeta = {};

    logInfo("开始播放解析", { playId, flag });

    if (!playId) {
        return {
            urls: [{ name: "解析失败", url: "" }],
            parse: 1,
            header: {
                ...DEFAULT_HEADERS,
                Referer: `${getCurrentHost()}/`,
            },
        };
    }

    if (playId.includes("|||")) {
        const [mainPlayId, metaB64] = playId.split("|||");
        playId = mainPlayId;
        playMeta = decodeMeta(metaB64 || "");
        logInfo("解析透传信息", { sid: playMeta.sid || "", fid: playMeta.fid || "", e: playMeta.e || "" });
    }

    if (playId && playId.includes("|")) {
        const [rawShareURL, fileId] = playId.split("|");
        const shareURL = normalizeShareUrl(rawShareURL);
        if (shareURL && fileId && isPanUrl(shareURL)) {
            try {
                const routeType = resolveRouteType(flag, callerSource, context);
                logInfo("网盘播放路线解析", { shareURL, fileId, flag, callerSource, routeType });
                const playInfoPromise = OmniBox.getDriveVideoPlayInfo(shareURL, fileId, routeType);
                const metadataPromise = (async () => {
                    const result = {
                        danmakuList: [],
                        scrapeTitle: "",
                        scrapePic: "",
                        episodeNumber: null,
                        episodeName: String(params.episodeName || playMeta.e || "").trim(),
                    };

                    const videoIdForScrape = String(params.vodId || playMeta.sid || "").trim();
                    if (!videoIdForScrape) {
                        return result;
                    }

                    try {
                        const metadata = await OmniBox.getScrapeMetadata(videoIdForScrape);
                        if (!metadata || !metadata.scrapeData || !Array.isArray(metadata.videoMappings)) {
                            return result;
                        }

                        const formattedFileId = `${shareURL}|${fileId}|${videoIdForScrape}`;
                        const mapping = metadata.videoMappings.find((m) => m?.fileId === formattedFileId);
                        if (!mapping) {
                            return result;
                        }

                        const scrapeData = metadata.scrapeData;
                        result.scrapeTitle = scrapeData.title || "";
                        if (scrapeData.posterPath) {
                            result.scrapePic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
                        }
                        if (mapping.episodeNumber) {
                            result.episodeNumber = mapping.episodeNumber;
                        }
                        if (mapping.episodeName && !result.episodeName) {
                            result.episodeName = mapping.episodeName;
                        }

                        const fileName = buildScrapedDanmuFileName(
                            scrapeData,
                            metadata.scrapeType || "",
                            mapping,
                            String(params.vodName || playMeta.v || scrapeData.title || "").trim(),
                            result.episodeName
                        );
                        if (fileName) {
                            const matchedDanmaku = typeof OmniBox.getDanmakuByFileName === "function"
                                ? await OmniBox.getDanmakuByFileName(fileName)
                                : await matchDanmu(fileName);
                            if (Array.isArray(matchedDanmaku) && matchedDanmaku.length > 0) {
                                result.danmakuList = matchedDanmaku;
                            }
                        }
                    } catch (error) {
                        logWarn("读取网盘弹幕元数据失败", { error: error.message || String(error) });
                    }

                    return result;
                })();

                const [playInfoResult, metadataResult] = await Promise.allSettled([playInfoPromise, metadataPromise]);
                if (playInfoResult.status !== "fulfilled") {
                    throw playInfoResult.reason || new Error("无法获取播放地址");
                }

                const playInfo = playInfoResult.value;
                const urlList = Array.isArray(playInfo?.url) ? playInfo.url : [];
                logInfo("网盘播放信息返回", {
                    shareURL,
                    fileId,
                    flag,
                    callerSource,
                    routeType,
                    urlCount: urlList.length,
                    routeFlags: urlList.map((item) => item?.name || "播放").filter(Boolean),
                    hasHeader: !!playInfo?.header && Object.keys(playInfo.header || {}).length > 0,
                });
                const urlsResult = urlList.map((item) => ({
                    name: item.name || "播放",
                    url: item.url,
                }));
                if (urlsResult.length > 0) {
                    const header = playInfo?.header || {};
                    const shareURLLower = String(shareURL || "").toLowerCase();
                    const isUcDrive = shareURLLower.includes("drive.uc.cn") || shareURLLower.includes("pc-api.uc.cn") || shareURLLower.includes("uc.cn/s/");
                    logInfo("网盘播放结果出参", {
                        shareURL,
                        fileId,
                        flag,
                        callerSource,
                        routeType,
                        isUcDrive,
                        headerKeys: Object.keys(header || {}),
                        urlsPreview: urlsResult.map((item) => ({ name: item.name, url: String(item.url || "").slice(0, 160) })),
                    });

                    const metadataValue = metadataResult.status === "fulfilled" ? metadataResult.value : null;
                    const finalDanmaku = metadataValue?.danmakuList?.length ? metadataValue.danmakuList : (playInfo?.danmaku || []);

                    return {
                        urls: urlsResult,
                        header,
                        parse: 0,
                        danmaku: finalDanmaku};
                }
            } catch (error) {
                logWarn("网盘文件播放失败，回退 push", { shareURL, fileId, flag, callerSource, error: error.message || String(error) });
                const pushUrl = shareURL.startsWith("push://") ? shareURL : `push://${shareURL}`;
                return {
                    urls: [{ name: "网盘资源", url: pushUrl }],
                    parse: 0,
                    header: {},
                };
            }
        }
    }

    // 磁力直出
    if (playId.startsWith("magnet:")) {
        return {
            urls: [{ name: "磁力资源", url: playId }],
            parse: 0,
            header: {
                ...DEFAULT_HEADERS,
                Referer: `${getCurrentHost()}/`,
            },
        };
    }

    // 网盘走 push
    if (isPanUrl(playId)) {
        const pushUrl = playId.startsWith("push://") ? playId : `push://${playId}`;
        return {
            urls: [{ name: "网盘资源", url: pushUrl }],
            parse: 0,
            header: {},
        };
    }

    // 常规剧集 ID: videoId|lineIndex|episodeIndex
    let resolvedPlayUrl = "";
    const parts = playId.split("|");
    if (parts.length === 3 && parts.every((x) => x !== "")) {
        const videoId = parts[0];
        const lineIndex = parseInt(parts[1], 10);
        const episodeIndex = parseInt(parts[2], 10);

        if (Number.isFinite(lineIndex) && Number.isFinite(episodeIndex)) {
            resolvedPlayUrl = `${getCurrentHost()}/py/${videoId}-${lineIndex + 1}-${episodeIndex + 1}.html`;
        }
    }

    if (!resolvedPlayUrl) {
        resolvedPlayUrl = fixUrl(playId, getCurrentHost());
    }

    const defaultHeader = {
        ...DEFAULT_HEADERS,
        Referer: `${getCurrentHost()}/`,
        Origin: getCurrentHost(),
    };

    // 直接视频地址不再二次嗅探
    if (isDirectVideoUrl(resolvedPlayUrl)) {
        logInfo("检测到直链视频，直接返回", { url: resolvedPlayUrl });
        return {
            urls: [{ name: "默认线路", url: resolvedPlayUrl }],
            parse: 0,
            header: defaultHeader,
        };
    }

    // 非视频后缀：走嗅探提取真实地址
    try {
        logInfo("检测到非视频格式，开始嗅探", { url: resolvedPlayUrl });
        const sniffed = await OmniBox.sniffVideo(resolvedPlayUrl);
        if (sniffed && sniffed.url) {
            logInfo("嗅探成功", { url: sniffed.url });

            let danmaku = [];
            if (DANMU_API) {
                let vodName = String(params.vodName || "").trim();
                let episodeName = String(params.episodeName || playMeta.e || "").trim();
                let scrapedDanmuFileName = "";

                try {
                    const videoIdFromParam = params.vodId ? String(params.vodId) : "";
                    const videoIdFromMeta = playMeta?.sid ? String(playMeta.sid) : "";
                    const videoIdForScrape = videoIdFromParam || videoIdFromMeta;
                    if (videoIdForScrape) {
                        const metadata = await OmniBox.getScrapeMetadata(videoIdForScrape);
                        if (metadata && metadata.scrapeData) {
                            const mapping = (metadata.videoMappings || []).find((m) => m?.fileId === playMeta?.fid);
                            scrapedDanmuFileName = buildScrapedDanmuFileName(
                                metadata.scrapeData,
                                metadata.scrapeType || "",
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
                    logWarn("读取刮削元数据失败", { error: error.message || String(error) });
                }

                const fileName = scrapedDanmuFileName || buildFileNameForDanmu(vodName, episodeName);
                if (fileName) {
                    danmaku = await matchDanmu(fileName);
                    if (danmaku.length > 0) {
                        logInfo("弹幕匹配成功", { count: danmaku.length, fileName });
                    }
                }
            }

            return {
                urls: [{ name: "嗅探线路", url: sniffed.url }],
                parse: 0,
                header: sniffed.header || defaultHeader,
                danmaku,
            };
        }
        logWarn("嗅探未返回有效直链，回退解析页", { url: resolvedPlayUrl });
    } catch (error) {
        logWarn("嗅探失败，回退解析页", { error: error.message || String(error) });
    }

    return {
        urls: [{ name: "默认线路", url: resolvedPlayUrl }],
        parse: 1,
        header: defaultHeader,
    };
}

module.exports = { home, category, search, detail, play };

const runner = require("spider_runner");
runner.run(module.exports);

});

_load(4, "乐兔", function (module, exports, require) {
// @name 乐兔
// @author 
// @description 刮削：支持，弹幕：支持，嗅探：支持，广告：有
// @dependencies: axios, cheerio
// @version 1.1.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/乐兔.js

const axios = require("axios");
const http = require("http");
const https = require("https");
const cheerio = require("cheerio");
const OmniBox = require("omnibox_sdk");

// ==================== 配置区域 ====================
const HOST = process.env.LETU_HOST || process.env.QQYS_HOST || "https://www.qqys01.com";
const DANMU_API = process.env.DANMU_API || "";
const PAGE_LIMIT = 20;

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
  Referer: `${HOST}/`,
};

const axiosInstance = axios.create({
  timeout: 15000, // 正向优化：将 60s 超时缩短为 15s，防止网络不佳时 App 长时间卡死
  httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false, family: 4 }),
  httpAgent: new http.Agent({ keepAlive: true }),
});

// ==================== 日志工具 ====================
function logInfo(message, data = null) {
  const output = data ? `${message}: ${JSON.stringify(data)}` : message;
  OmniBox.log("info", `[乐兔] ${output}`);
}

function logError(message, error) {
  OmniBox.log("error", `[乐兔] ${message}: ${error?.message || error}`);
}

// ==================== 通用工具 ====================
function e64(text) {
  try { return Buffer.from(String(text || ""), "utf8").toString("base64"); } catch { return ""; }
}

function d64(text) {
  try { return Buffer.from(String(text || ""), "base64").toString("utf8"); } catch { return ""; }
}

function encodeMeta(obj) {
  try { return e64(JSON.stringify(obj || {})); } catch { return ""; }
}

function decodeMeta(str) {
  try { return JSON.parse(d64(str || "") || "{}"); } catch { return {}; }
}

function toAbsUrl(pathOrUrl) {
  const v = String(pathOrUrl || "");
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return `${HOST}${v.startsWith("/") ? "" : "/"}${v}`;
}

function getClasses() {
  return [
    { type_id: "1", type_name: "电影" },
    { type_id: "2", type_name: "电视剧" },
    { type_id: "3", type_name: "综艺" },
    { type_id: "4", type_name: "动漫" },
    // 新站分类只有 1-4，5 是资讯页，不能作为影视分类
  ];
}

function getFilters() {
  return {};
}

function normalizeVodId(href) {
  const value = String(href || "");
  const match = value.match(/\/voddetail(\d+)\.html/);
  return match ? `/voddetail${match[1]}.html` : value;
}

function normalizePicUrl(value) {
  const pic = String(value || "");
  return pic ? toAbsUrl(pic) : "";
}

function parseCardList(html) {
  const $ = cheerio.load(html || "");
  const list = [];
  const seen = new Set();

  $(".module-poster-item, .module-card-item").each((_, element) => {
    const $el = $(element);
    const $link = $el.is("a") ? $el : $el.find("a").first();
    const href = normalizeVodId($link.attr("href"));
    const name = ($el.attr("title") || $link.attr("title") || $el.find(".module-poster-item-title").first().text() ||
      $el.find(".module-card-item-title strong").first().text() || $link.find("strong").first().text()).trim();
    const pic = normalizePicUrl($el.find("img[data-original]").first().attr("data-original") || $el.find("img").first().attr("src"));
    const remark = $el.find(".module-item-note").first().text().trim() ||
      ($el.find(".module-info-item-content").first().text().trim() ? $el.find(".module-info-item-content").first().text().trim().split("/")[0].trim() : "");

    if (name && href && !seen.has(href)) {
      seen.add(href);
      list.push({
        vod_id: href,
        vod_name: name,
        vod_pic: pic,
        vod_remarks: remark,
      });
    }
  });

  return list;
}

function parsePageCount($, fallbackPage = 1) {
  const pages = [fallbackPage];
  $(".page-number").each((_, element) => {
    const page = parseInt($(element).text().trim(), 10);
    if (page > 0) pages.push(page);
  });
  const tail = $(".page-next[title='尾页']").attr("href") || "";
  const tailMatch = tail.match(/(?:page\/|-)(\d+)(?:\.html)?(?:---\d+)?\.html?$/);
  if (tailMatch) pages.push(parseInt(tailMatch[1], 10));
  return Math.max(...pages);
}

function convertToPlaySources($, vodName = "", videoId = "") {
  const sourceNames = $(".module-tab-items .module-tab-item")
    .map((_, element) => ($(element).attr("data-dropdown-value") || $(element).text().trim() || `线路${_ + 1}`).trim())
    .get();

  const sourcePanels = $(".module-list.sort-list.tab-list").toArray();

  return sourcePanels
    .map((panel, sourceIndex) => {
      const sourceName = sourceNames[sourceIndex] || `线路${sourceIndex + 1}`;
      const episodes = $(panel).find("a.module-play-list-link").toArray()
        .map((element, episodeIndex) => {
          const $link = $(element);
          const href = $link.attr("href") || "";
          if (!href) return null;
          const epName = ($link.attr("title") || $link.text() || `第${episodeIndex + 1}集`)
            .replace(/^播放/, "")
            .trim();
          const fid = `${videoId}#${sourceIndex}#${episodeIndex}`;
          const playData = { id: href, v: vodName, e: epName, sid: String(videoId || ""), fid };
          return {
            name: epName,
            playId: `${href}|||${e64(JSON.stringify(playData))}`,
            _fid: fid,
            _rawName: epName,
          };
        })
        .filter(Boolean);

      return episodes.length ? { name: sourceName, episodes } : null;
    })
    .filter(Boolean);
}

function preprocessTitle(title) {
  if (!title) return "";
  return title
    .replace(/4[kK]|[xX]26[45]|720[pP]|1080[pP]|2160[pP]/g, " ")
    .replace(/[hH]\.?26[45]/g, " ")
    .replace(/BluRay|WEB-DL|HDR|REMUX/gi, " ")
    .replace(/\.mp4|\.mkv|\.avi|\.flv/gi, " ");
}

function chineseToArabic(cn) {
  const map = { 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  if (!isNaN(cn)) return parseInt(cn, 10);
  if (cn.length === 1) return map[cn] || cn;
  if (cn.length === 2) {
    if (cn[0] === "十") return 10 + map[cn[1]];
    if (cn[1] === "十") return map[cn[0]] * 10;
  }
  if (cn.length === 3) return map[cn[0]] * 10 + map[cn[2]];
  return cn;
}

function extractEpisode(title) {
  if (!title) return "";
  const processedTitle = preprocessTitle(title).trim();
  const cnMatch = processedTitle.match(/第\s*([零一二三四五六七八九十0-9]+)\s*[集话章节回期]/);
  if (cnMatch) return String(chineseToArabic(cnMatch[1]));
  const seMatch = processedTitle.match(/[Ss](?:\d{1,2})?[-._\s]*[Ee](\d{1,3})/i);
  if (seMatch) return seMatch[1];
  const epMatch = processedTitle.match(/\b(?:EP|E)[-._\s]*(\d{1,3})\b/i);
  if (epMatch) return epMatch[1];
  return "";
}

function buildFileNameForDanmu(vodName, episodeTitle) {
  if (!vodName) return "";
  if (!episodeTitle || episodeTitle === "正片" || episodeTitle === "播放") return vodName;
  const digits = extractEpisode(episodeTitle);
  if (digits) {
    const epNum = parseInt(digits, 10);
    if (epNum > 0) {
      if (epNum < 10) return `${vodName} S01E0${epNum}`;
      return `${vodName} S01E${epNum}`;
    }
  }
  return vodName;
}

function buildScrapedEpisodeName(scrapeData, mapping, originalName) {
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
}

function buildScrapedDanmuFileName(scrapeData, scrapeType, mapping, fallbackVodName, fallbackEpisodeName) {
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
}

async function sniffLetuPlay(playUrl) {
  if (!playUrl) return null;
  try {
    logInfo("尝试嗅探播放页", playUrl);
    const sniffed = await OmniBox.sniffVideo(playUrl);
    if (sniffed && sniffed.url) {
      logInfo("嗅探成功", { sniffUrl: sniffed.url?.slice(0, 120) });
      return {
        urls: [{ name: "嗅探线路", url: sniffed.url }],
        parse: 0,
        header: sniffed.header || { ...DEFAULT_HEADERS, Referer: playUrl },
      };
    }
  } catch (error) {
    logInfo(`嗅探失败: ${error.message}`);
  }
  return null;
}

async function matchDanmu(fileName) {
  if (!DANMU_API || !fileName) return [];

  try {
    const response = await OmniBox.request(`${DANMU_API}/api/v2/match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: JSON.stringify({ fileName }),
    });

    if (response.statusCode !== 200) return [];
    const matchData = JSON.parse(response.body);
    if (!matchData.isMatched) return [];

    const matches = matchData.matches || [];
    if (matches.length === 0) return [];

    const firstMatch = matches[0];
    const episodeId = firstMatch.episodeId;
    if (!episodeId) return [];

    const animeTitle = firstMatch.animeTitle || "";
    const episodeTitle = firstMatch.episodeTitle || "";
    let danmakuName = "弹幕";
    if (animeTitle && episodeTitle) {
      danmakuName = `${animeTitle} - ${episodeTitle}`;
    } else if (animeTitle) {
      danmakuName = animeTitle;
    } else if (episodeTitle) {
      danmakuName = episodeTitle;
    }

    return [{
      name: danmakuName,
      url: `${DANMU_API}/api/v2/comment/${episodeId}?format=xml`,
    }];
  } catch (error) {
    return [];
  }
}

async function getCategoryList(type, page = 1) {
  try {
    const tid = type || "1";
    const pg = page || 1;
    const url = `${HOST}/vodshow/${tid}--------${pg}---1.html`;
    const fallbackUrl = pg === 1 ? `${HOST}/vodtype/${tid}.html` : url;

    logInfo("获取分类列表", { type: tid, page: pg, url });
    let response;
    try {
      response = await axiosInstance.get(url, { headers: DEFAULT_HEADERS });
    } catch (error) {
      if (pg === 1) {
        logInfo("分类分页请求失败，尝试备用页", fallbackUrl);
        response = await axiosInstance.get(fallbackUrl, { headers: DEFAULT_HEADERS });
      } else {
        throw error;
      }
    }

    const $ = cheerio.load(response.data || "");
    const list = parseCardList(response.data);
    const pagecount = parsePageCount($, pg);
    logInfo("分类列表获取成功", { count: list.length, page: pg, pagecount });

    return {
      list,
      page: parseInt(pg, 10),
      pagecount,
      limit: PAGE_LIMIT,
      total: pagecount * PAGE_LIMIT,
    };
  } catch (error) {
    logError("获取分类失败", error);
    return { list: [], page: 1, pagecount: 1, limit: PAGE_LIMIT, total: 0 };
  }
}

async function getDetailById(id) {
  try {
    const detailUrl = toAbsUrl(id);
    logInfo("获取详情页", { detailUrl });
    const response = await axiosInstance.get(detailUrl, { headers: DEFAULT_HEADERS });
    const $ = cheerio.load(response.data || "");

    const vodName = $("h1").first().text().trim();
    const vodPic = normalizePicUrl($(".module-info-poster img[data-original]").first().attr("data-original") ||
      $(".module-info-poster img").first().attr("src") || $("img").first().attr("src"));

    const metadataTitles = $(".module-info-item-title").map((_, element) => $(element).text().trim()).get();
    const metadataContents = $(".module-info-item-content").map((_, element) => $(element).text().trim()).get();
    const findMeta = (...names) => {
      for (const name of names) {
        const index = metadataTitles.findIndex((title) => title.startsWith(name));
        if (index >= 0 && metadataContents[index]) return metadataContents[index];
      }
      return "";
    };
    const vodDirector = findMeta("导演", "導演");
    const vodActor = findMeta("主演", "主演");
    const vodArea = findMeta("地区", "地區");
    const vodRemarks = findMeta("备注", "備註");
    const vodYear = ($(".module-info-tag-link a").first().attr("title") || "").trim();
    const vodTypeName = $(".module-info-tag-link a").map((_, element) => $(element).text().trim()).get().filter(Boolean).slice(2).join(",");
    const vodContent = $(".module-info-introduction-content").last().text().trim();

    const videoIdForScrape = String(id || "");
    const playSources = convertToPlaySources($, vodName, videoIdForScrape);

    let scrapeData = null;
    let videoMappings = [];
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

    if (scrapeCandidates.length > 0) {
      try {
        const scrapingResult = await OmniBox.processScraping(videoIdForScrape, vodName || "", vodName || "", scrapeCandidates);
        logInfo("刮削处理完成", { count: scrapeCandidates.length, result: JSON.stringify(scrapingResult || {}).slice(0, 120) });
        const metadata = await OmniBox.getScrapeMetadata(videoIdForScrape);
        scrapeData = metadata?.scrapeData || null;
        videoMappings = metadata?.videoMappings || [];
      } catch (error) {
        logError("刮削处理失败", error);
      }
    }

    for (const source of playSources) {
      for (const ep of source.episodes || []) {
        const mapping = videoMappings.find((m) => m?.fileId === ep._fid);
        if (!mapping) continue;
        const oldName = ep.name;
        const newName = buildScrapedEpisodeName(scrapeData, mapping, oldName);
        if (newName && newName !== oldName) {
          ep.name = newName;
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

    const normalizedPlaySources = playSources.map((source) => ({
      name: source.name,
      episodes: (source.episodes || []).map((ep) => ({
        name: ep.name,
        playId: ep.playId,
      })),
    }));

    return {
      vod_id: id,
      vod_name: scrapeData?.title || vodName,
      vod_pic: scrapeData?.posterPath ? `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}` : vodPic,
      vod_type: vodTypeName || findMeta("类型", "類型"),
      vod_year: vodYear,
      vod_remarks: vodRemarks,
      vod_area: vodArea,
      vod_actor:
        (scrapeData?.credits?.cast || []).slice(0, 5).map((c) => c?.name).filter(Boolean).join(",") || vodActor,
      vod_director:
        (scrapeData?.credits?.crew || [])
          .filter((c) => c?.job === "Director" || c?.department === "Directing")
          .slice(0, 3)
          .map((c) => c?.name)
          .filter(Boolean)
          .join(",") || vodDirector,
      vod_content: scrapeData?.overview || vodContent,
      vod_play_sources: normalizedPlaySources,
    };
  } catch (error) {
    logError("获取详情失败", error);
    return null;
  }
}

async function getPlay(playId, vodName = "", episodeName = "", vodId = "") {
  try {
    let realPlayId = playId;
    let playMeta = {};
    let scrapedDanmuFileName = "";

    if (typeof playId === "string" && playId.includes("|||")) {
      const [rawPlayId, metaB64] = playId.split("|||");
      realPlayId = rawPlayId || playId;
      const passedMeta = decodeMeta(metaB64 || "");
      if (passedMeta && typeof passedMeta === "object") {
        playMeta = { ...passedMeta, ...playMeta };
        vodName = passedMeta.v || vodName;
        episodeName = passedMeta.e || episodeName;
      }
    }

    try {
      const sourceVideoId = String(vodId || playMeta.sid || "");
      if (sourceVideoId) {
        const metadata = await OmniBox.getScrapeMetadata(sourceVideoId);
        if (metadata && metadata.scrapeData) {
          const mapping = (metadata.videoMappings || []).find((m) => m?.fileId === playMeta?.fid);
          scrapedDanmuFileName = buildScrapedDanmuFileName(
            metadata.scrapeData,
            metadata.scrapeType || "",
            mapping,
            vodName,
            episodeName
          );
          if (metadata.scrapeData.title) vodName = metadata.scrapeData.title;
          if (mapping?.episodeName) episodeName = mapping.episodeName;
        }
      }
    } catch (error) {}

    const playPageUrl = toAbsUrl(realPlayId);
    const response = await axiosInstance.get(playPageUrl, { headers: DEFAULT_HEADERS });
    const html = String(response.data || "");

    let directVideoUrl = "";

    try {
      const playerMatch = html.match(/var\s+player_data\s*=\s*(\{[\s\S]*?\})\s*<\/script>/i) ||
        html.match(/player_\w+\s*=\s*(\{[\s\S]*?\})\s*[;,]/i);
      if (playerMatch && playerMatch[1]) {
        const conf = JSON.parse(playerMatch[1].replace(/'/g, '"'));
        let videoUrl = conf.url || "";

        if (String(conf.encrypt) === "1") {
          videoUrl = decodeURIComponent(videoUrl);
        } else if (String(conf.encrypt) === "2") {
          try {
            videoUrl = decodeURIComponent(Buffer.from(videoUrl, "base64").toString("utf8"));
          } catch {
            try {
              videoUrl = Buffer.from(decodeURIComponent(videoUrl), "base64").toString("utf8");
            } catch {
              videoUrl = Buffer.from(videoUrl, "base64").toString("utf8");
            }
          }
        }

        if (videoUrl.startsWith("rose_")) {
          try {
            videoUrl = Buffer.from(decodeURIComponent(videoUrl.substring(5)), "base64").toString("utf8");
          } catch {
            videoUrl = Buffer.from(videoUrl.substring(5), "base64").toString("utf8");
          }
        }

        if (videoUrl && !/^https?:\/\//i.test(videoUrl) && videoUrl.startsWith("/")) {
          videoUrl = toAbsUrl(videoUrl);
        }

        if (videoUrl && (/^https?:\/\//i.test(videoUrl) || videoUrl.match(/\.(m3u8|mp4|flv|avi|mkv|ts)(?:$|\?)/i))) {
          directVideoUrl = videoUrl;
        } else if (videoUrl) {
          logInfo("播放配置未得到直链", videoUrl.slice(0, 160));
        }
      }
    } catch (error) {
      logInfo("解析播放配置失败", error?.message || error);
    }

    if (!directVideoUrl) {
      const linkMatch = html.match(/(?:data-src|data-url|src)\s*=\s*["']([^"']*\.(?:m3u8|mp4|flv|avi|mkv|ts)[^"']*)["']/i);
      if (linkMatch) directVideoUrl = linkMatch[1].startsWith("/") ? toAbsUrl(linkMatch[1]) : linkMatch[1];
    }

    if (directVideoUrl) {
      const playResponse = {
        urls: [{ name: "播放", url: directVideoUrl }],
        parse: 0,
        header: {
          ...DEFAULT_HEADERS,
          Referer: `${HOST}/`,
        },
      };

      if (DANMU_API && vodName) {
        const fileName = scrapedDanmuFileName || buildFileNameForDanmu(vodName, episodeName);
        if (fileName) {
          const danmakuList = await matchDanmu(fileName);
          if (danmakuList.length > 0) playResponse.danmaku = danmakuList;
        }
      }
      return playResponse;
    }

    const sniffResult = await sniffLetuPlay(playPageUrl);
    if (sniffResult) return sniffResult;

    return {
      urls: [{ name: "解析", url: playPageUrl }],
      parse: 1,
      header: { ...DEFAULT_HEADERS, Referer: `${HOST}/` },
    };
  } catch (error) {
    const fallbackPlayUrl = toAbsUrl(playId.split("|||")[0]);
    const sniffResult = await sniffLetuPlay(fallbackPlayUrl);
    if (sniffResult) return sniffResult;

    return {
      urls: [{ name: "解析", url: fallbackPlayUrl }],
      parse: 1,
      header: { ...DEFAULT_HEADERS, Referer: `${HOST}/` },
    };
  }
}

// ==================== 核心修复：搜索功能 ====================
async function getSearch(keyword, page = 1) {
  try {
    const pg = page || 1;
    const wd = encodeURIComponent(String(keyword || "").trim());
    
    // 新站表单为 /vodsearch.html?wd=...，查询式结果更精确
    const url = pg > 1
      ? `${HOST}/vodsearch/page/${pg}.html?wd=${wd}`
      : `${HOST}/vodsearch.html?wd=${wd}`;
    const backupUrl = `${HOST}/vodsearch/${wd}----------${pg}---.html`;

    logInfo("执行搜索", { keyword, page: pg, url });

    let response;
    try {
      response = await axiosInstance.get(url, { headers: DEFAULT_HEADERS });
    } catch (e) {
      logInfo("Query 搜索失败，尝试伪静态形式", backupUrl);
      response = await axiosInstance.get(backupUrl, { headers: DEFAULT_HEADERS });
    }

    const html = response.data;
    const $ = cheerio.load(html);
    const list = parseCardList(html);
    const pagecount = parsePageCount($, pg);

    logInfo("搜索完成", { keyword, count: list.length, page: pg, pagecount });

    return {
      list,
      page: parseInt(pg, 10),
      pagecount,
      limit: PAGE_LIMIT,
      total: pagecount * PAGE_LIMIT,
    };
  } catch (error) {
    logError("搜索失败", error);
    return { list: [], page: 1, pagecount: 1, limit: PAGE_LIMIT, total: 0 };
  }
}

// ==================== 标准接口 ====================
async function home(params) {
  const classes = getClasses();
  const result = await getCategoryList("1", 1);

  return {
    class: classes,
    filters: getFilters(),
    list: result.list || [],
    page: 1,
    pagecount: result.pagecount || 1,
    total: result.total || 0,
    limit: result.limit || PAGE_LIMIT,
  };
}

async function category(params) {
  const type = params?.categoryId || params?.id || "1";
  const page = parseInt(params?.page, 10) || 1;
  return getCategoryList(type, page);
}

async function detail(params) {
  try {
    const id = params?.videoId || params?.id || "";
    if (!id) return { list: [] };
    const vod = await getDetailById(id);
    return { list: vod ? [vod] : [] };
  } catch (error) {
    logError("detail 失败", error);
    return { list: [] };
  }
}

async function search(params) {
  const wd = params?.keyword || params?.wd || "";
  const page = parseInt(params?.page, 10) || 1;
  if (!wd) return { list: [], page: 1, pagecount: 1, limit: PAGE_LIMIT, total: 0 };
  return getSearch(wd, page);
}

async function play(params) {
  const playId = params?.playId || params?.id || "";
  const vodName = params?.vodName || "";
  const episodeName = params?.episodeName || "";
  const vodId = params?.vodId || "";
  if (!playId) {
    return {
      urls: [{ name: "解析", url: "" }],
      parse: 1,
      header: DEFAULT_HEADERS,
    };
  }
  return getPlay(playId, vodName, episodeName, vodId);
}

module.exports = {
  home,
  category,
  detail,
  search,
  play,
};


const runner = require("spider_runner");
runner.run(module.exports);

});

_load(5, "在线之家", function (module, exports, require) {
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

_load(6, "太二影视", function (module, exports, require) {
// @name 太二影视
// @description 太二追剧页面解析，支持首页、分类、搜索、详情、多线路播放和嗅探兜底
// @version 1.0.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/太二影视.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");

const HOST = String(process.env.TAI2_HOST || "https://v.tai2.lol").replace(/\/+$/, "");
const UA = "Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const HEADERS = {
  "User-Agent": UA,
  Referer: `${HOST}/`,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9",
};
const CLASS_LIST = [
  { type_id: "21", type_name: "剧集" },
  { type_id: "22", type_name: "综艺" },
];

module.exports = { home, category, search, detail, play };
runner.run(module.exports);

function getBodyText(response) {
  const body = response && typeof response === "object"
    ? ("body" in response ? response.body : ("data" in response ? response.data : response))
    : response;
  if (Buffer.isBuffer(body) || body instanceof Uint8Array) return body.toString();
  return String(body || "");
}

async function requestText(url, options = {}) {
  const headers = {
    ...HEADERS,
    ...(options.headers || {}),
    Referer: options.referer || options.headers?.Referer || `${HOST}/`,
  };
  const attempts = options.retries === undefined ? 2 : Math.max(1, Number(options.retries) + 1);
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await OmniBox.request(url, {
        method: options.method || "GET",
        headers,
        timeout: options.timeout || 30000,
        body: options.body,
      });
      const statusCode = Number(response?.statusCode || 200);
      if (statusCode === 520 && attempt + 1 < attempts) continue;
      if (statusCode < 200 || statusCode >= 400) {
        const error = new Error(`HTTP ${statusCode || "unknown"} @ ${url}`);
        error.retryable = false;
        throw error;
      }
      return getBodyText(response);
    } catch (error) {
      lastError = error;
      if (error?.retryable === false || attempt + 1 >= attempts) break;
    }
  }
  throw lastError || new Error(`请求失败 @ ${url}`);
}

function decodeHtml(text) {
  return String(text || "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function cleanText(text) {
  return decodeHtml(
    String(text || "")
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?\s*>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ").trim();
}

function absUrl(url, base = HOST) {
  let value = decodeHtml(String(url || "").trim()).replace(/^['"]|['"]$/g, "");
  if (!value || /^data:/i.test(value)) return "";
  if (value.startsWith("//")) value = `https:${value}`;
  try {
    return new URL(value, base).toString();
  } catch (_) {
    return value;
  }
}

function getAttribute(attrs, name) {
  const match = String(attrs || "").match(new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i"));
  return match ? decodeHtml(match[2]).trim() : "";
}

function lastCaptured(text, pattern) {
  let value = "";
  let match;
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const regex = new RegExp(pattern.source, flags);
  while ((match = regex.exec(String(text || ""))) !== null) {
    value = match[1] || "";
    if (!match[0]) regex.lastIndex += 1;
  }
  return value;
}

function parseCards(html) {
  const text = String(html || "");
  const videos = [];
  const seen = new Set();
  const anchorRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorRegex.exec(text)) !== null) {
    const attrs = match[1] || "";
    const href = getAttribute(attrs, "href");
    const idMatch = href.match(/\/vod\/detail\/id\/(\d+)\.html/i);
    if (!idMatch) continue;
    const videoId = idMatch[1];
    if (seen.has(videoId)) continue;

    const inner = match[2] || "";
    const before = text.slice(Math.max(0, match.index - 700), match.index);
    const after = text.slice(match.index + match[0].length, match.index + match[0].length + 700);
    let vodName = cleanText(getAttribute(attrs, "title"));
    if (!vodName) {
      const alt = lastCaptured(inner, /\balt\s*=\s*["']([^"']+)["']/i);
      vodName = cleanText(alt).replace(/封面图$/u, "").trim();
    }
    if (!vodName) {
      const titleMatch = after.match(/class=["'][^"']*time-title[^"']*["'][^>]*[^>]*title=["']([^"']+)["']/i);
      vodName = cleanText(titleMatch ? titleMatch[1] : "");
    }
    if (!vodName) continue;

    let vodPic = lastCaptured(inner, /\bdata-src\s*=\s*["']([^"']+)["']/i);
    if (!vodPic) vodPic = lastCaptured(inner, /\bsrc\s*=\s*["']([^"']+)["']/i);
    if (!vodPic) vodPic = lastCaptured(before, /\bdata-src\s*=\s*["']([^"']+)["']/i);
    const remarkMatch = inner.match(/public-list-prb[^>]*>([\s\S]*?)<\/span>/i)
      || after.match(/public-list-prb[^>]*>([\s\S]*?)<\/span>/i);

    seen.add(videoId);
    videos.push({
      vod_id: videoId,
      vod_name: vodName,
      vod_pic: absUrl(vodPic),
      vod_remarks: cleanText(remarkMatch ? remarkMatch[1] : ""),
    });
  }

  return videos;
}

function extractPeopleBlock(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(html || "").match(
    new RegExp(`<div[^>]*class=["'][^"']*slide-info[^"']*["'][^>]*>[\\s\\S]*?<strong[^>]*>\\s*${escaped}\\s*[：:]?\\s*<\\/strong>([\\s\\S]*?)<\\/div>`, "i"),
  );
  if (!match) return "";
  const names = [];
  const linkRegex = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(match[1])) !== null) {
    const name = cleanText(linkMatch[1]);
    if (name) names.push(name);
  }
  return names.length ? names.join(" ") : cleanText(match[1]);
}

function extractParameter(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(html || "").match(
    new RegExp(`<li[^>]*>[\\s\\S]*?<em[^>]*>\\s*${escaped}\\s*[：:]\\s*<\\/em>([\\s\\S]*?)<\\/li>`, "i"),
  );
  return cleanText(match ? match[1] : "");
}

function parsePlaySources(html) {
  const text = String(html || "");
  const tabStart = text.search(/\banthology-tab\b/i);
  const listStart = tabStart >= 0 ? text.slice(tabStart).search(/\banthology-list\b/i) : -1;
  const tabHtml = tabStart >= 0 && listStart > 0 ? text.slice(tabStart, tabStart + listStart) : "";
  const sourceNames = [];
  const sourceRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = sourceRegex.exec(tabHtml)) !== null) {
    if (!/\bswiper-slide\b/i.test(getAttribute(match[1], "class"))) continue;
    const withoutBadge = match[2].replace(/<span\b[^>]*class=["'][^"']*badge[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, "");
    const name = cleanText(withoutBadge);
    if (name) sourceNames.push(name);
  }

  const sources = [];
  const listRegex = /<ul\b[^>]*class=["'][^"']*anthology-list-play[^"']*["'][^>]*>([\s\S]*?)<\/ul>/gi;
  let index = 0;
  while ((match = listRegex.exec(text)) !== null) {
    const episodes = [];
    const episodeRegex = /<a\b[^>]*href=["']([^"']*\/vod\/play\/id\/\d+\/sid\/\d+\/nid\/\d+\.html)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let episodeMatch;
    while ((episodeMatch = episodeRegex.exec(match[1])) !== null) {
      const name = cleanText(episodeMatch[2]);
      const playId = absUrl(episodeMatch[1]);
      if (name && playId) episodes.push({ name, playId });
    }
    if (episodes.length) sources.push({ name: sourceNames[index] || `线路${index + 1}`, episodes });
    index += 1;
  }
  return sources;
}

function decodePlayerUrl(value, encrypt) {
  let url = String(value || "").replace(/\\\//g, "/");
  try {
    if (String(encrypt) === "1") return decodeURIComponent(url);
    if (String(encrypt) === "2") return decodeURIComponent(Buffer.from(url, "base64").toString("utf8"));
  } catch (_) {}
  return url;
}

function isDirectMedia(url) {
  return /\.(?:m3u8|mp4|flv|mkv)(?:$|[?#])/i.test(String(url || ""));
}

function normalizeSniffUrls(result, defaultName) {
  const urls = [];
  const seen = new Set();
  const append = (item) => {
    const value = typeof item === "string" ? item : (item?.url || item?.playUrl || item?.src || "");
    const url = String(value || "").trim();
    if (!url || seen.has(url)) return;
    seen.add(url);
    urls.push({ name: String(item?.name || defaultName || "嗅探线路"), url });
  };
  if (Array.isArray(result?.urls)) result.urls.forEach(append);
  if (!urls.length) append(result);
  return urls;
}

function directPlayResult(url, referer, name = "播放") {
  const header = { "User-Agent": UA, Referer: referer || `${HOST}/` };
  return { parse: 0, jx: 0, url, urls: [{ name, url }], header, headers: header };
}

function browserSniffResult(url, referer, name = "播放页") {
  const header = { "User-Agent": UA, Referer: referer || url || `${HOST}/` };
  return { parse: 1, jx: 1, url, urls: [{ name, url }], header, headers: header };
}

async function serverSniffOrBrowserFallback(targetUrl, referer, name = "播放") {
  const header = { "User-Agent": UA, Referer: referer || `${HOST}/` };
  if (typeof OmniBox.sniffVideo === "function") {
    try {
      const sniffed = await OmniBox.sniffVideo(targetUrl, header);
      const urls = normalizeSniffUrls(sniffed, name);
      if (urls.length) {
        const playHeader = sniffed?.header || sniffed?.headers || header;
        await OmniBox.log("info", `[太二影视][play] 服务端嗅探成功 urls=${urls.length}`);
        return {
          parse: 0,
          jx: 0,
          url: urls[0].url,
          urls,
          header: playHeader,
          headers: playHeader,
          danmaku: sniffed?.danmaku || [],
        };
      }
      await OmniBox.log("warn", "[太二影视][play] 服务端嗅探无结果，转浏览器嗅探");
    } catch (error) {
      await OmniBox.log("warn", `[太二影视][play] 服务端嗅探失败，转浏览器嗅探: ${error.message}`);
    }
  }
  return browserSniffResult(targetUrl, referer, name);
}

async function resolveM3u8Child(url, referer) {
  try {
    const text = await requestText(url, { referer, timeout: 20000, retries: 0 });
    if (!text.includes("#EXTM3U") || !text.includes("#EXT-X-STREAM-INF")) return url;
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (let index = 0; index < lines.length; index += 1) {
      if (!lines[index].startsWith("#EXT-X-STREAM-INF")) continue;
      const child = lines.slice(index + 1).find((line) => !line.startsWith("#"));
      if (child) return absUrl(child, url);
    }
  } catch (_) {}
  return url;
}

async function home() {
  let list = [];
  try {
    list = parseCards(await requestText(`${HOST}/`));
  } catch (error) {
    await OmniBox.log("warn", `[太二影视][home] 首页请求失败: ${error.message}`);
  }
  if (!list.length) {
    const results = await Promise.allSettled(CLASS_LIST.map((item) => requestText(`${HOST}/index.php/vod/type/id/${item.type_id}.html`)));
    const seen = new Set();
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      for (const video of parseCards(result.value)) {
        if (seen.has(video.vod_id)) continue;
        seen.add(video.vod_id);
        list.push(video);
      }
    }
  }
  return { class: CLASS_LIST, filters: {}, list: list.slice(0, 72) };
}

async function category(params) {
  const page = Math.max(1, parseInt(params.page || 1, 10));
  try {
    const categoryId = String(params.categoryId || params.type_id || "21").trim() || "21";
    const pagePath = page > 1 ? `/page/${page}` : "";
    const url = `${HOST}/index.php/vod/type/id/${categoryId}${pagePath}.html`;
    const list = parseCards(await requestText(url));
    return { page, pagecount: 1, total: list.length, list };
  } catch (error) {
    await OmniBox.log("error", `[太二影视][category] ${error.message}`);
    return { page, pagecount: 0, total: 0, list: [] };
  }
}

async function search(params) {
  const page = Math.max(1, parseInt(params.page || 1, 10));
  const keyword = String(params.keyword || params.wd || params.key || "").trim();
  if (!keyword) return { page, pagecount: 0, total: 0, list: [] };
  const encoded = encodeURIComponent(keyword);
  const urls = [
    `${HOST}/index.php/vod/search.html?wd=${encoded}&page=${page}`,
    `${HOST}/vodsearch/${encoded}----------${page}.html`,
    `${HOST}/search.html?wd=${encoded}&page=${page}`,
  ];
  for (const url of urls) {
    try {
      const list = parseCards(await requestText(url));
      if (list.length) return { page, pagecount: 1, total: list.length, list };
    } catch (error) {
      await OmniBox.log("warn", `[太二影视][search] ${url} ${error.message}`);
    }
  }
  return { page, pagecount: 0, total: 0, list: [] };
}

async function detail(params) {
  try {
    const input = String(params.videoId || params.id || params.categoryId || "").trim();
    const idMatch = input.match(/\/vod\/detail\/id\/(\d+)\.html/i) || input.match(/^(\d+)$/);
    const videoId = idMatch ? idMatch[1] : "";
    if (!videoId) return { list: [] };
    const html = await requestText(`${HOST}/index.php/vod/detail/id/${videoId}.html`);
    const titleMatch = html.match(/<h3\b[^>]*class=["'][^"']*slide-info-title[^"']*["'][^>]*>([\s\S]*?)<\/h3>/i)
      || html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
    const picMatch = html.match(/detail-pic[\s\S]*?<img\b[^>]*(?:data-src|src)=["']([^"']+)["']/i);
    const contentMatch = html.match(/id=["']height_limit["'][^>]*>([\s\S]*?)<\/div>/i);
    const remarkMatch = html.match(/slide-info-remarks[^>]*>([\s\S]*?)<\/span>/i);
    const playSources = parsePlaySources(html);

    return {
      list: [{
        vod_id: videoId,
        vod_name: cleanText(titleMatch ? titleMatch[1] : ""),
        vod_pic: absUrl(picMatch ? picMatch[1] : ""),
        type_name: extractPeopleBlock(html, "类型"),
        vod_year: extractParameter(html, "年份") || cleanText((html.match(/vod\/search\/year\/(\d{4})\.html/i) || [])[1] || ""),
        vod_area: extractParameter(html, "地区"),
        vod_remarks: cleanText(remarkMatch ? remarkMatch[1] : ""),
        vod_actor: extractPeopleBlock(html, "演员") || extractParameter(html, "主演"),
        vod_director: extractPeopleBlock(html, "导演") || extractParameter(html, "导演"),
        vod_content: cleanText(contentMatch ? contentMatch[1] : "") || "暂无简介",
        vod_play_sources: playSources,
      }],
    };
  } catch (error) {
    await OmniBox.log("error", `[太二影视][detail] ${error.message}`);
    return { list: [] };
  }
}

async function play(params) {
  const input = String(params.playId || params.id || params.url || params.input || "").trim();
  if (!input) return { parse: 0, jx: 0, url: "", urls: [], header: {}, headers: {} };
  if (isDirectMedia(input)) return directPlayResult(absUrl(input), `${HOST}/`);
  const playUrl = absUrl(input);

  let html = "";
  try {
    html = await requestText(playUrl, { referer: `${HOST}/`, timeout: 30000 });
  } catch (error) {
    await OmniBox.log("warn", `[太二影视][play] 播放页请求失败，尝试嗅探: ${error.message}`);
    return await serverSniffOrBrowserFallback(playUrl, playUrl, "太二播放");
  }

  const playerMatch = html.match(/var\s+player_[a-zA-Z0-9_$]+\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/i)
    || html.match(/var\s+player_[a-zA-Z0-9_$]+\s*=\s*(\{[\s\S]*?\})\s*;/i);
  if (playerMatch) {
    try {
      const playerData = JSON.parse(playerMatch[1]);
      let realUrl = decodePlayerUrl(playerData.url, playerData.encrypt);
      if (isDirectMedia(realUrl)) {
        if (/\.m3u8(?:$|[?#])/i.test(realUrl)) realUrl = await resolveM3u8Child(realUrl, playUrl);
        return directPlayResult(realUrl, playUrl);
      }
      if (realUrl) return await serverSniffOrBrowserFallback(absUrl(realUrl, playUrl), playUrl, playerData.vod_data?.vod_name || "播放");
    } catch (error) {
      await OmniBox.log("warn", `[太二影视][play] player 数据解析失败: ${error.message}`);
    }
  }

  let sniffTarget = playUrl;
  const iframeMatch = html.match(/<iframe\b[^>]*src=["']([^"']+)["']/i);
  if (iframeMatch) {
    const iframeUrl = absUrl(iframeMatch[1], playUrl);
    sniffTarget = iframeUrl || playUrl;
    try {
      const iframeHtml = await requestText(iframeUrl, { referer: playUrl, timeout: 30000, retries: 0 });
      const iframePlayer = iframeHtml.match(/["']url["']\s*:\s*["']([^"']+)["']/i);
      let iframeMedia = decodeHtml(iframePlayer ? iframePlayer[1] : "").replace(/\\\//g, "/");
      if (!iframeMedia) {
        const mediaMatch = iframeHtml.match(/["'](https?:\/\/[^"']+\.(?:m3u8|mp4|flv|mkv)(?:\?[^"']*)?)["']/i);
        iframeMedia = mediaMatch ? mediaMatch[1] : "";
      }
      if (isDirectMedia(iframeMedia)) {
        if (/\.m3u8(?:$|[?#])/i.test(iframeMedia)) iframeMedia = await resolveM3u8Child(iframeMedia, iframeUrl);
        return directPlayResult(iframeMedia, iframeUrl);
      }
      if (iframeMedia) return await serverSniffOrBrowserFallback(absUrl(iframeMedia, iframeUrl), iframeUrl, "播放");
    } catch (error) {
      await OmniBox.log("warn", `[太二影视][play] iframe 解析失败: ${error.message}`);
    }
  }

  const directMatch = html.match(/["'](https?:\/\/[^"']+\.(?:m3u8|mp4|flv|mkv)(?:\?[^"']*)?)["']/i);
  if (directMatch) return directPlayResult(directMatch[1].replace(/\\\//g, "/"), playUrl);
  return await serverSniffOrBrowserFallback(sniffTarget, playUrl, "太二播放");
}

});

_load(7, "影视大全", function (module, exports, require) {
// @name 影视大全
// @author 梦
// @description 影视站：https://www.iysdq.tv ，支持首页、分类、搜索、详情与播放解析
// @version 1.0.2
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/影视大全.js
// @dependencies cheerio

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const cheerio = require("cheerio");

const HOST = "https://www.iysdq.tv";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const HEADERS = { "User-Agent": UA, Referer: `${HOST}/` };

const CLASS_LIST = [
  { type_id: "1", type_name: "电影" },
  { type_id: "2", type_name: "电视剧" },
  { type_id: "3", type_name: "综艺" },
  { type_id: "4", type_name: "动漫" },
  { type_id: "5", type_name: "短剧" },
];

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

function getBodyText(res) {
  const body = res && typeof res === "object" && "body" in res ? res.body : res;
  if (Buffer.isBuffer(body) || body instanceof Uint8Array) return body.toString();
  return String(body || "");
}

function absUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `${HOST}${value}`;
  return `${HOST}/${value.replace(/^\/+/, "")}`;
}

function cleanText(text) {
  return String(text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fetchText(url, options = {}) {
  return OmniBox.request(url, {
    method: options.method || "GET",
    headers: {
      ...HEADERS,
      ...(options.headers || {}),
      Referer: options.referer || `${HOST}/`,
    },
    timeout: options.timeout || 20000,
    body: options.body,
  }).then((res) => {
    if (!res || Number(res.statusCode) < 200 || Number(res.statusCode) >= 400) {
      throw new Error(`HTTP ${res?.statusCode || "unknown"} @ ${url}`);
    }
    return getBodyText(res);
  });
}

function extractVideos(html) {
  const $ = cheerio.load(html);
  const videos = [];
  const seen = new Set();

  $("a.public-list-exp[href*='/voddetail/']").each((_, el) => {
    const a = $(el);
    const href = String(a.attr("href") || "").trim();
    const m = href.match(/\/voddetail\/(\d+)\.html/);
    const vodId = m ? m[1] : "";
    const vodName = cleanText(a.attr("title") || a.text());
    if (!vodId || !vodName || seen.has(vodId)) return;
    seen.add(vodId);

    const block = a.parent().html() || a.closest(".public-list-box").html() || a.html() || "";
    let vodPic = absUrl(a.find("img").attr("data-src") || a.find("img").attr("src") || "");
    if (!vodPic) {
      const img = block.match(/<img[^>]*(?:data-src|src)="([^"]*)"/i);
      vodPic = absUrl(img ? img[1] : "");
    }
    let vodRemarks = cleanText(a.find(".public-list-prb").text());
    if (!vodRemarks) vodRemarks = cleanText(a.find(".public-list-subtitle").text());

    videos.push({
      vod_id: vodId,
      vod_name: vodName,
      vod_pic: vodPic,
      vod_remarks: vodRemarks,
      vod_content: "",
    });
  });

  return videos;
}

function extractHomeVideos(html) {
  const sections = [
    "最新热播",
    "最新Netflix",
    "最新电影",
    "最新连续剧",
    "最新资讯",
    "最新动漫",
    "最新综艺",
    "最新纪录片",
  ];
  for (const sectionName of sections) {
    const idx = html.indexOf(sectionName);
    if (idx < 0) continue;
    const slice = html.slice(idx, idx + 50000);
    const videos = extractVideos(slice);
    if (videos.length) return videos;
  }
  return extractVideos(html);
}

function buildDetailFromHtml(html, vodId) {
  const $ = cheerio.load(html);
  let vodName = cleanText($(".this-desc-title").first().text());
  if (!vodName) vodName = cleanText($("h1").first().text());

  let vodPic = absUrl($("img").first().attr("data-src") || $("img").first().attr("src") || "");
  if (!vodPic) {
    const pm = html.match(/<img[^>]*(?:data-src|src)="([^"]*(?:upload|cover|vod)[^"]*)"/i);
    vodPic = absUrl(pm ? pm[1] : "");
  }

  let vodContent = cleanText($("meta[name='description']").attr("content") || "");
  if (vodContent) {
    vodContent = vodContent.replace(/^.*?(?:剧情|简介)[：:]\s*/g, "").replace(/^.*?(?:在线|免费观看)[，,]?\s*/g, "");
    vodContent = `【by：轻狂书生】\n${vodContent}`;
  } else {
    vodContent = "【by：轻狂书生】";
  }

  const sourceNames = [];
  $(".anthology-tab a.swiper-slide").each((_, el) => {
    let text = cleanText($(el).text()).replace(/\d+\s*$/, "").trim();
    if (text && !text.includes("下载")) sourceNames.push(text);
  });

  const vodPlaySources = [];

  const boxes = $(".anthology-list-box");
  if (boxes.length) {
    boxes.each((idx, el) => {
      if (sourceNames.length && idx >= sourceNames.length) return;
      const srcName = sourceNames[idx] || `线路${idx + 1}`;
      const episodes = [];
      $(el)
        .find('a[href*="/vodplay/"]')
        .each((_, ael) => {
          const a = $(ael);
          const epName = cleanText(a.text());
          const epUrl = absUrl(a.attr("href") || "");
          if (epName && epUrl) episodes.push({ name: epName, playId: epUrl });
        });
      if (episodes.length) {
        vodPlaySources.push({ name: srcName, episodes });
      }
    });
  }

  if (!vodPlaySources.length) {
    const listBox = $(".anthology-list-play").first();
    if (listBox.length) {
      const episodes = [];
      listBox.find('a[href*="/vodplay/"]').each((_, ael) => {
        const a = $(ael);
        const epName = cleanText(a.text());
        const epUrl = absUrl(a.attr("href") || "");
        if (epName && epUrl) episodes.push({ name: epName, playId: epUrl });
      });
      if (episodes.length) {
        vodPlaySources.push({ name: sourceNames[0] || "默认", episodes });
      }
    }
  }

  return {
    vod_id: String(vodId || ""),
    vod_name: vodName,
    vod_pic: vodPic,
    vod_content: vodContent,
    vod_play_sources: vodPlaySources,
  };
}

async function home(params, context) {
  try {
    const html = await fetchText(`${HOST}/`);
    const list = extractHomeVideos(html);
    return { class: CLASS_LIST, filters: {}, list };
  } catch (e) {
    await OmniBox.log("error", `[影视大全][home] ${e.message}`);
    return { class: CLASS_LIST, filters: {}, list: [] };
  }
}

async function category(params, context) {
  try {
    const tid = String(params.categoryId || params.type_id || "1");
    const page = Math.max(1, parseInt(params.page || 1, 10));
    const url = `${HOST}/vodshow/${tid}--time------${page}---.html`;
    const html = await fetchText(url);
    const list = extractVideos(html);
    let total = 0;
    const totalMatch = html.match(/\$\('\.hl-total'\)\.html\('(\d+)'\)/);
    if (totalMatch) total = parseInt(totalMatch[1], 10) || 0;
    const pagecount = total > 0 ? Math.max(1, Math.ceil(total / 40)) : page + (list.length >= 40 ? 1 : 0);
    return { page, pagecount, total, list };
  } catch (e) {
    await OmniBox.log("error", `[影视大全][category] ${e.message}`);
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }
}

async function detail(params, context) {
  try {
    const id = String(params.videoId || params.id || params.categoryId || "").trim();
    if (!id) return { list: [] };
    const vodId = id.includes("/") ? (id.match(/(\d+)/) || ["", id])[1] : id;
    const html = await fetchText(`${HOST}/voddetail/${vodId}.html`);
    const vod = buildDetailFromHtml(html, vodId);
    return { list: [vod] };
  } catch (e) {
    await OmniBox.log("error", `[影视大全][detail] ${e.message}`);
    return { list: [] };
  }
}

async function search(params, context) {
  try {
    const keyword = String(params.keyword || params.wd || params.key || "").trim();
    const page = Math.max(1, parseInt(params.page || 1, 10));
    if (!keyword) return { page, pagecount: 0, total: 0, list: [] };

    const url = `${HOST}/index.php/ajax/suggest?mid=1&wd=${encodeURIComponent(keyword)}&page=${page}`;
    const text = await fetchText(url);
    let data = {};
    try {
      data = JSON.parse(text || "{}");
    } catch (_) {
      data = {};
    }

    const list = [];
    for (const item of data.list || []) {
      const pic = absUrl(item.pic || "");
      list.push({
        vod_id: String(item.id || ""),
        vod_name: String(item.name || ""),
        vod_pic: pic,
        vod_remarks: "",
        vod_content: "",
      });
    }
    return {
      page,
      pagecount: Number(data.pagecount || 1),
      total: Number(data.total || list.length),
      list,
    };
  } catch (e) {
    await OmniBox.log("error", `[影视大全][search] ${e.message}`);
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }
}

async function play(params, context) {
  try {
    const input = String(params.playId || params.url || params.input || "").trim();
    await OmniBox.log("info", `[影视大全][play] input=${input}`);
    if (!input) return { parse: 0, jx: 0, url: "", header: {} };

    const playUrl = input.startsWith("http") ? input : absUrl(input);
    await OmniBox.log("info", `[影视大全][play] playUrl=${playUrl}`);
    const html = await fetchText(playUrl, { referer: `${HOST}/` });
    await OmniBox.log("info", `[影视大全][play] htmlLen=${html.length}`);

    // 1) 直接解析 player_aaaa JSON
    let videoUrl = "";
    let playerRaw = "";
    const m = html.match(/var\s+player_aaaa\s*=\s*(\{[\s\S]*?\})\s*<\/script>/i)
      || html.match(/var\s+player_aaaa\s*=\s*(\{[\s\S]*?\})\s*;/i)
      || html.match(/player_aaaa\s*=\s*(\{[\s\S]*?\})\s*<\/script>/i)
      || html.match(/player_aaaa\s*=\s*(\{[\s\S]*?\})\s*;/i);

    if (m) {
      playerRaw = m[1] || "";
      await OmniBox.log("info", `[影视大全][play] player_aaaa matched len=${playerRaw.length}`);
      try {
        const data = JSON.parse(playerRaw);
        videoUrl = String(data.url || "").trim();
        await OmniBox.log("info", `[影视大全][play] player_url=${videoUrl}`);
      } catch (err) {
        await OmniBox.log("error", `[影视大全][play] player json parse fail: ${err.message}`);
        videoUrl = "";
      }
    } else {
      await OmniBox.log("info", `[影视大全][play] player_aaaa not matched`);
    }

    // 2) 兜底：页面里直接找 m3u8/mp4
    if (!videoUrl) {
      const m2 = html.match(/https?:\/\/[^\"'\s>]+\.(?:m3u8|mp4)(?:\?[^\"'\s>]*)?/i);
      if (m2) {
        videoUrl = m2[0];
        await OmniBox.log("info", `[影视大全][play] fallback_url=${videoUrl}`);
      } else {
        await OmniBox.log("info", `[影视大全][play] fallback_url=none`);
      }
    }

    if (!videoUrl) {
      return { parse: 0, jx: 0, url: "", header: {} };
    }

    return {
      parse: 0,
      jx: 0,
      url: videoUrl,
      header: {
        "User-Agent": UA,
        Referer: `${HOST}/`,
      },
    };
  } catch (e) {
    await OmniBox.log("error", `[影视大全][play] ${e.message}`);
    return { parse: 0, jx: 0, url: "", header: {} };
  }
}

});

_load(8, "毒舌03", function (module, exports, require) {
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

_load(9, "独播库", function (module, exports, require) {
// @name 独播库
// @author @caipeibin
// @description 
// @dependencies: axios
// @version 1.1.1
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/独播库.js


/** 
 * OmniBox 爬虫脚本 - 独播库
 * 
 * 说明：
 * 1. 基于原始 TVBox T4 脚本逻辑转换为 OmniBox 标准 JS 模板。
 * 2. 实现了 `home` / `category` / `search` / `detail` / `play` 五个标准接口。
 * 3. 保留了原脚本的签名 (`sign`, `token`, `ssid`) 和 Base64 解码逻辑。
 */

const axios = require("axios");
const http = require("http");
const https = require("https");
const OmniBox = require("omnibox_sdk");

// ==================== 配置区域 ====================
const HOST = "https://api.dbokutv.com";
const REFERER_HOST = "https://www.duboku.tv";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Content-Type": "application/json",
    "Referer": `${REFERER_HOST}/`,
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive"
};

const DANMU_API = process.env.DANMU_API || "";

const axiosInstance = axios.create({
    timeout: 15 * 1000,
    httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
    httpAgent: new http.Agent({ keepAlive: true }),
});

// ==================== 日志工具 ====================
function logInfo(message, data = null) {
    const output = data ? `${message}: ${JSON.stringify(data)}` : message;
    OmniBox.log("info", `[独播库] ${output}`);
}
function logError(message, error) {
    OmniBox.log("error", `[独播库] ${message}: ${error?.message || error}`);
}

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

// ==================== 辅助函数 ====================
const decodeDubokuData = (data) => {
    if (!data || typeof data !== 'string') return '';
    const strippedStr = data.trim().replace(/['"]/g, '');
    if (!strippedStr) return '';
    const segmentLength = 10;
    try {
        let processedBase64 = '';
        for (let i = 0; i < strippedStr.length; i += segmentLength) {
            const segment = strippedStr.slice(i, i + segmentLength);
            processedBase64 += segment.split('').reverse().join('');
        }
        processedBase64 = processedBase64.replace(/\./g, '=');
        const paddingNeeded = 4 - (processedBase64.length % 4);
        if (paddingNeeded !== 4) {
            processedBase64 += '='.repeat(paddingNeeded);
        }
        const decodedBytes = Buffer.from(processedBase64, 'base64');
        return decodedBytes.toString('utf-8');
    } catch (error) {
        logError('解码错误', error);
        return '';
    }
};

const generateRandomString = (length) => {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }
    return result;
};

const interleaveStrings = (str1, str2) => {
    const result = [];
    const minLength = Math.min(str1.length, str2.length);
    for (let i = 0; i < minLength; i++) {
        result.push(str1[i]);
        result.push(str2[i]);
    }
    result.push(str1.slice(minLength));
    result.push(str2.slice(minLength));
    return result.join('');
};

const generateSignature = (url) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const randomNumber = Math.floor(Math.random() * 800000000);
    const valueA = randomNumber + 100000000;
    const valueB = 900000000 - randomNumber;
    const interleaved = interleaveStrings(`${valueA}${valueB}`, timestamp.toString());
    const ssid = Buffer.from(interleaved).toString('base64').replace(/=/g, '.');
    const sign = generateRandomString(60);
    const token = generateRandomString(38);
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}sign=${sign}&token=${token}&ssid=${ssid}`;
};

const isDirectVideoUrl = (url) => {
    if (!url) return false;
    return /\.(m3u8|mp4|flv|avi|mkv|ts)(\?|$)/i.test(url);
};

const sniffDubokuPlay = async (playUrl) => {
    if (!playUrl) return null;
    try {
        logInfo("尝试嗅探播放页", playUrl);
        const sniffed = await OmniBox.sniffVideo(playUrl);
        if (sniffed && sniffed.url) {
            logInfo("嗅探成功", sniffed.url);
            return {
                urls: [{ name: "嗅探线路", url: sniffed.url }],
                parse: 0,
                header: sniffed.header || {
                    "User-Agent": UA,
                    "Referer": playUrl
                }
            };
        }
    } catch (error) {
        logInfo(`嗅探失败: ${error.message || error}`);
    }
    return null;
};

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

function preprocessTitle(title) {
    if (!title) return "";
    return title
        .replace(/4[kK]|[xX]26[45]|720[pP]|1080[pP]|2160[pP]|1280x720|1920x1080/g, " ")
        .replace(/[hH]\.?26[45]/g, " ")
        .replace(/BluRay|WEB-DL|HDR|REMUX/gi, " ")
        .replace(/\.mp4|\.mkv|\.avi|\.flv/gi, " ");
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
    const seMatch = processedTitle.match(/[Ss](?:\d{1,2})?[-._\s]*[Ee](\d{1,3})/i);
    if (seMatch) return seMatch[1];
    const cnMatch = processedTitle.match(/第\s*([零一二三四五六七八九十0-9]+)\s*[集话章节回期]/);
    if (cnMatch) return String(chineseToArabic(cnMatch[1]));
    const epMatch = processedTitle.match(/\b(?:EP|E)[-._\s]*(\d{1,3})\b/i);
    if (epMatch) return epMatch[1];
    const bracketMatch = processedTitle.match(/[\[\(【（](\d{1,3})[\]\)】）]/);
    if (bracketMatch) {
        const num = bracketMatch[1];
        if (!["720", "1080", "480"].includes(num)) return num;
    }
    const standaloneMatches = processedTitle.match(/(?:^|[\s\-\._\[\]])(\d{1,3})(?![0-9pP])/g);
    if (standaloneMatches) {
        const candidates = standaloneMatches
            .map(m => m.match(/\d+/)[0])
            .filter(num => {
                const n = parseInt(num);
                return n > 0 && n < 300 && !["720", "480", "264", "265"].includes(num);
            });
        if (candidates.length > 0) {
            const normalEp = candidates.find(n => parseInt(n) < 100);
            return normalEp || candidates[0];
        }
    }
    return "";
}

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
            }
            return `${vodName} S01E${epNum}`;
        }
    }
    return vodName;
}

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
                "User-Agent": UA
            },
            body: JSON.stringify({ fileName: fileName })
        });
        if (response.statusCode !== 200) {
            logInfo(`弹幕匹配失败: HTTP ${response.statusCode}`);
            return [];
        }
        const matchData = JSON.parse(response.body);
        if (!matchData.isMatched) {
            logInfo("弹幕未匹配到");
            return [];
        }
        const matches = matchData.matches || [];
        if (matches.length === 0) return [];
        const firstMatch = matches[0];
        const episodeId = firstMatch.episodeId;
        const animeTitle = firstMatch.animeTitle || "";
        const episodeTitle = firstMatch.episodeTitle || "";
        if (!episodeId) return [];
        let danmakuName = "弹幕";
        if (animeTitle && episodeTitle) {
            danmakuName = `${animeTitle} - ${episodeTitle}`;
        } else if (animeTitle) {
            danmakuName = animeTitle;
        } else if (episodeTitle) {
            danmakuName = episodeTitle;
        }
        const danmakuURL = `${DANMU_API}/api/v2/comment/${episodeId}?format=xml`;
        logInfo(`弹幕匹配成功: ${danmakuName}`);
        return [{ name: danmakuName, url: danmakuURL }];
    } catch (error) {
        logInfo(`弹幕匹配失败: ${error.message || error}`);
        return [];
    }
}

// ==================== OmniBox 标准接口实现 ====================
async function home(params) {
    const classes = [
        { type_id: "2", type_name: "连续剧" },
        { type_id: "3", type_name: "综艺" },
        { type_id: "1", type_name: "电影" },
        { type_id: "4", type_name: "动漫" }
    ];
    const filters = {}; // 独播库无筛选

    try {
        const url = generateSignature(`${HOST}/home`);
        logInfo("获取首页推荐", { url });
        const response = await axiosInstance.get(url, { headers: DEFAULT_HEADERS });
        const data = response.data;
        const list = [];
        if (Array.isArray(data)) {
            data.forEach(category => {
                const vodList = category.VodList || [];
                vodList.forEach(vod => {
                    const vodId = vod.DId || vod.DuId || '';
                    const vodPic = vod.TnId || '';
                    list.push({
                        vod_id: decodeDubokuData(vodId),
                        vod_name: vod.Name || '',
                        vod_pic: decodeDubokuData(vodPic),
                        vod_remarks: vod.Tag || ''
                    });
                });
            });
        }
        logInfo(`获取到 ${list.length} 个首页推荐`);
        return { class: classes, filters, list: list.slice(0, 20) };
    } catch (error) {
        logError("获取首页数据失败", error);
        return { class: classes, filters, list: [] };
    }
}

async function category(params) {
    const categoryId = params.categoryId;
    const page = parseInt(params.page, 10) || 1;

    try {
        const pageStr = page === 1 ? '' : page.toString();
        const path = `/vodshow/${categoryId}--------${pageStr}---`;
        const url = generateSignature(HOST + path);
        logInfo(`获取分类列表: ${categoryId} 第 ${page} 页`, { url });
        const response = await axiosInstance.get(url, { headers: DEFAULT_HEADERS });
        const data = response.data;
        const list = [];

        if (data && data.VodList && Array.isArray(data.VodList)) {
            data.VodList.forEach(vod => {
                const vodId = vod.DId || vod.DuId || '';
                const vodPic = vod.TnId || '';
                list.push({
                    vod_id: decodeDubokuData(vodId),
                    vod_name: vod.Name || '',
                    vod_pic: decodeDubokuData(vodPic),
                    vod_remarks: vod.Tag || ''
                });
            });
        }

        // 简化分页，假设总页数很大
        return { list, page, pagecount: 9999, limit: 20, total: 999999 };
    } catch (error) {
        logError("获取分类数据失败", error);
        return { list: [], page: 1, pagecount: 0, limit: 0, total: 0 };
    }
}

async function search(params) {
    const keyword = params.keyword || "";
    const page = parseInt(params.page, 10) || 1;

    try {
        const baseUrl = generateSignature(`${HOST}/vodsearch`);
        const url = `${baseUrl}&wd=${encodeURIComponent(keyword)}`;
        logInfo(`搜索 "${keyword}"`, { url });
        const response = await axiosInstance.get(url, { headers: DEFAULT_HEADERS });
        const data = response.data;
        const list = [];
        if (Array.isArray(data)) {
            data.forEach(vod => {
                const vodId = vod.DId || vod.DuId || '';
                const vodPic = vod.TnId || '';
                list.push({
                    vod_id: decodeDubokuData(vodId),
                    vod_name: vod.Name || '',
                    vod_pic: decodeDubokuData(vodPic),
                    vod_remarks: vod.Tag || '',
                    vod_actor: vod.Actor || '',
                    vod_score: vod.Rating || ''
                });
            });
        }
        logInfo(`搜索 "${keyword}" 找到 ${list.length} 个结果`);
        return { list, page, pagecount: 1, limit: list.length, total: list.length };
    } catch (error) {
        logError("搜索失败", error);
        return { list: [], page: 1, pagecount: 0, limit: 0, total: 0 };
    }
}

async function detail(params) {
    const vodId = params.videoId;

    try {
        let detailPath = vodId.startsWith('/') ? vodId : '/' + vodId;
        const url = generateSignature(HOST + detailPath);
        logInfo("获取详情", { url });
        const response = await axiosInstance.get(url, { headers: DEFAULT_HEADERS });
        const data = response.data;
        if (!data) return { list: [] };

        let vod_play_url = '';
        const playList = [];
        let vod_play_sources = [];
        if (data.Playlist && Array.isArray(data.Playlist)) {
            data.Playlist.forEach(episode => {
                const episodeName = episode.EpisodeName || `第${playList.length + 1}集`;
                const videoId = decodeDubokuData(episode.VId || '');
                if (videoId) {
                    playList.push(`${episodeName}$${videoId}`);
                }
            });
            vod_play_url = playList.join('#');
            const videoIdForScrape = String(vodId || vod_id || "");
            vod_play_sources = [
                {
                    name: '独播库',
                    episodes: playList.map((item, epIndex) => {
                        const parts = item.split('$');
                        const episodeName = parts[0] || '播放';
                        const actualUrl = parts[1] || parts[0];
                        const fid = `${videoIdForScrape}#0#${epIndex}`;
                        const combinedId = `${actualUrl}|||${encodeMeta({ sid: String(videoIdForScrape || ""), fid, v: data.Name || "", e: episodeName })}`;
                        return {
                            name: episodeName,
                            playId: combinedId,
                            _fid: fid,
                            _rawName: episodeName
                        };
                    }).filter(ep => ep.playId)
                }
            ];
        }

        const vod_pic = decodeDubokuData(data.TnId || '');
        const vod_id = decodeDubokuData(data.DId || data.DuId || '') || vodId;
        const detail = {
            vod_id: vod_id,
            vod_name: data.Name || '',
            vod_pic: vod_pic || '',
            vod_remarks: data.Tag ? `评分：${data.Rating || '暂无'}` : '',
            vod_year: data.ReleaseYear || '',
            vod_area: data.Region || '',
            vod_actor: Array.isArray(data.Actor) ? data.Actor.join(',') : data.Actor || '',
            vod_director: data.Director || '',
            vod_content: data.Description || '',
            vod_play_from: '独播库',
            vod_play_url: vod_play_url,
            vod_play_sources: vod_play_sources,
            type_name: `${data.Genre || ''},${data.Scenario || ''},${data.Language || ''}`
        };

        if (vod_play_sources.length > 0) {
            const scrapeCandidates = [];
            for (const source of vod_play_sources) {
                for (const ep of source.episodes || []) {
                    if (!ep._fid) continue;
                    scrapeCandidates.push({
                        fid: ep._fid,
                        file_id: ep._fid,
                        file_name: ep._rawName || ep.name || "正片",
                        name: ep._rawName || ep.name || "正片",
                        format_type: "video"
                    });
                }
            }

            if (scrapeCandidates.length > 0) {
                try {
                    const videoIdForScrape = String(vod_id || "");
                    await OmniBox.processScraping(videoIdForScrape, detail.vod_name || "", detail.vod_name || "", scrapeCandidates);
                    const metadata = await OmniBox.getScrapeMetadata(videoIdForScrape);
                    const scrapeData = metadata?.scrapeData || null;
                    const videoMappings = metadata?.videoMappings || [];
                    const scrapeType = metadata?.scrapeType || "";
                    logInfo("刮削元数据读取完成", { hasScrapeData: !!scrapeData, mappingCount: videoMappings.length, scrapeType });

                    for (const source of vod_play_sources) {
                        for (const ep of source.episodes || []) {
                            const mapping = videoMappings.find((m) => m?.fileId === ep._fid);
                            if (!mapping) continue;
                            const oldName = ep.name;
                            const newName = buildScrapedEpisodeName(scrapeData, mapping, oldName);
                            if (newName && newName !== oldName) {
                                ep.name = newName;
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

                    detail.vod_play_sources = vod_play_sources.map((source) => ({
                        name: source.name,
                        episodes: (source.episodes || []).map((ep) => ({
                            name: ep.name,
                            playId: ep.playId
                        }))
                    }));

                    if (scrapeData) {
                        detail.vod_name = scrapeData.title || detail.vod_name;
                        if (scrapeData.posterPath) {
                            detail.vod_pic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
                        }
                        if (scrapeData.overview) {
                            detail.vod_content = scrapeData.overview;
                        }
                        if (scrapeData.releaseDate) {
                            detail.vod_year = String(scrapeData.releaseDate).substring(0, 4) || detail.vod_year;
                        }
                        const actors = (scrapeData.credits?.cast || []).slice(0, 5).map((c) => c?.name).filter(Boolean).join(",");
                        if (actors) {
                            detail.vod_actor = actors;
                        }
                        const directors = (scrapeData.credits?.crew || [])
                            .filter((c) => c?.job === "Director" || c?.department === "Directing")
                            .slice(0, 3)
                            .map((c) => c?.name)
                            .filter(Boolean)
                            .join(",");
                        if (directors) {
                            detail.vod_director = directors;
                        }
                    }
                } catch (error) {
                    logError("刮削处理失败", error);
                }
            }
        }

        logInfo(`详情获取成功，找到 ${playList.length} 个剧集`);
        return { list: [detail] };
    } catch (error) {
        logError("获取详情失败", error);
        return { list: [] };
    }
}

async function play(params) {
    let playUrl = params.playId;
    let vodName = "";
    let episodeName = "";
    let playMeta = {};

    try {
        if (playUrl && playUrl.includes("|||")) {
            const [mainPlayId, metaB64] = playUrl.split("|||");
            playUrl = mainPlayId;
            playMeta = decodeMeta(metaB64 || "");
            vodName = playMeta.v || "";
            episodeName = playMeta.e || "";
        }
        logInfo('处理播放URL', { playUrl });
        let finalUrl = playUrl;
        if (!playUrl.startsWith('http')) {
            if (playUrl.startsWith('/')) {
                finalUrl = HOST + playUrl;
            } else {
                finalUrl = HOST + '/' + playUrl;
            }
        }
        const signedUrl = generateSignature(finalUrl);
        logInfo('签名后的播放URL', { signedUrl });

        const response = await axiosInstance.get(signedUrl, { headers: DEFAULT_HEADERS });
        const data = response.data;
        if (!data || !data.HId) {
            logInfo('未找到播放地址，回退 parse=1');
            return {
                urls: [{ name: "回退", url: playUrl }],
                parse: 1,
                header: {
                    "User-Agent": UA,
                    "Referer": REFERER_HOST + "/",
                    "Origin": REFERER_HOST
                }
            };
        }

        const videoUrl = decodeDubokuData(data.HId);
        if (!videoUrl) {
            logInfo('视频地址解码失败，回退 parse=1');
            return {
                urls: [{ name: "回退", url: playUrl }],
                parse: 1,
                header: {
                    "User-Agent": UA,
                    "Referer": REFERER_HOST + "/",
                    "Origin": REFERER_HOST
                }
            };
        }

        logInfo('解码后的视频地址', { videoUrl });
        let playResponse = {
            urls: [{ name: "播放", url: videoUrl }],
            parse: isDirectVideoUrl(videoUrl) ? 0 : 1,
            header: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                "Accept-Encoding": "gzip, deflate",
                "origin": "https://w.duboku.io",
                "referer": "https://w.duboku.io/",
                "priority": "u=1, i"
            }
        };

        if (playResponse.parse === 1 && playResponse.urls[0]?.url) {
            const sniffResult = await sniffDubokuPlay(playResponse.urls[0].url);
            if (sniffResult) {
                playResponse = sniffResult;
            }
        }

        if (DANMU_API && (vodName || params.vodName)) {
            let scrapedDanmuFileName = "";
            try {
                const videoIdFromParam = params.vodId ? String(params.vodId) : "";
                const videoIdFromMeta = playMeta?.sid ? String(playMeta.sid) : "";
                const videoIdForScrape = videoIdFromParam || videoIdFromMeta;
                if (videoIdForScrape) {
                    const metadata = await OmniBox.getScrapeMetadata(videoIdForScrape);
                    if (metadata && metadata.scrapeData) {
                        const mapping = (metadata.videoMappings || []).find((m) => m?.fileId === playMeta?.fid);
                        scrapedDanmuFileName = buildScrapedDanmuFileName(
                            metadata.scrapeData,
                            metadata.scrapeType || "",
                            mapping,
                            vodName || params.vodName,
                            episodeName || params.episodeName
                        );
                    }
                }
            } catch (error) {
                logInfo(`读取刮削元数据失败: ${error.message || error}`);
            }

            const finalVodName = vodName || params.vodName;
            const finalEpisodeName = episodeName || params.episodeName || '';
            const fileName = scrapedDanmuFileName || buildFileNameForDanmu(finalVodName, finalEpisodeName);
            if (fileName) {
                const danmakuList = await matchDanmu(fileName);
                if (danmakuList && danmakuList.length > 0) {
                    playResponse.danmaku = danmakuList;
                }
            }
        }

        return playResponse;
    } catch (error) {
        logError("播放解析失败", error);
        const fallbackSniff = await sniffDubokuPlay(playUrl);
        if (fallbackSniff) {
            return fallbackSniff;
        }
        return {
            urls: [{ name: "回退", url: playUrl }],
            parse: 1,
            header: {
                "User-Agent": UA,
                "Referer": REFERER_HOST + "/",
                "Origin": REFERER_HOST
            }
        };
    }
}

module.exports = { home, category, search, detail, play };
const runner = require("spider_runner");
runner.run(module.exports);

});

_load(10, "袋鼠影视", function (module, exports, require) {
// @name 袋鼠影视
// @author 梦
// @description 影视站：https://dsystv.com ，支持首页、分类、详情、搜索与播放
// @dependencies cheerio
// @version 1.0.1
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/袋鼠影视.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const cheerio = require("cheerio");

const BASE_URL = "https://dsystv.com";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const LIST_CACHE_TTL = Number(process.env.DAISHU_LIST_CACHE_TTL || 900);
const DETAIL_CACHE_TTL = Number(process.env.DAISHU_DETAIL_CACHE_TTL || 1800);
const SEARCH_CACHE_TTL = Number(process.env.DAISHU_SEARCH_CACHE_TTL || 600);

const CATEGORY_CONFIG = [
  { id: "1", name: "电影" },
  { id: "2", name: "电视剧" },
  { id: "3", name: "综艺" },
  { id: "4", name: "动漫" },
];

const FILTERS = {
  "1": [
    { key: "tid", name: "类型", value: [{ name: "全部", value: "1" }, { name: "动作片", value: "5" }, { name: "喜剧片", value: "10" }, { name: "爱情片", value: "6" }, { name: "科幻片", value: "7" }, { name: "恐怖片", value: "8" }, { name: "战争片", value: "9" }, { name: "剧情片", value: "12" }, { name: "动画片", value: "41" }, { name: "纪录片", value: "11" }] },
    { key: "area", name: "地区", value: [{ name: "全部", value: "" }, { name: "大陆", value: "大陆" }, { name: "香港", value: "香港" }, { name: "台湾", value: "台湾" }, { name: "日本", value: "日本" }, { name: "韩国", value: "韩国" }, { name: "美国", value: "美国" }, { name: "英国", value: "英国" }, { name: "印度", value: "印度" }, { name: "法国", value: "法国" }, { name: "泰国", value: "泰国" }] },
    { key: "year", name: "年份", value: [{ name: "全部", value: "" }, { name: "2026", value: "2026" }, { name: "2025", value: "2025" }, { name: "2024", value: "2024" }, { name: "2023", value: "2023" }, { name: "2022", value: "2022" }, { name: "2021", value: "2021" }, { name: "2020", value: "2020" }] },
  ],
  "2": [
    { key: "tid", name: "类型", value: [{ name: "全部", value: "2" }, { name: "国产剧", value: "13" }, { name: "港台剧", value: "14" }, { name: "欧美剧", value: "15" }, { name: "日韩剧", value: "16" }] },
    { key: "area", name: "地区", value: [{ name: "全部", value: "" }, { name: "大陆", value: "大陆" }, { name: "香港", value: "香港" }, { name: "台湾", value: "台湾" }, { name: "日本", value: "日本" }, { name: "韩国", value: "韩国" }, { name: "美国", value: "美国" }, { name: "英国", value: "英国" }] },
    { key: "year", name: "年份", value: [{ name: "全部", value: "" }, { name: "2026", value: "2026" }, { name: "2025", value: "2025" }, { name: "2024", value: "2024" }, { name: "2023", value: "2023" }, { name: "2022", value: "2022" }] },
  ],
  "3": [
    { key: "area", name: "地区", value: [{ name: "全部", value: "" }, { name: "大陆", value: "大陆" }, { name: "日本", value: "日本" }, { name: "韩国", value: "韩国" }, { name: "美国", value: "美国" }] },
    { key: "year", name: "年份", value: [{ name: "全部", value: "" }, { name: "2026", value: "2026" }, { name: "2025", value: "2025" }, { name: "2024", value: "2024" }] },
  ],
  "4": [
    { key: "area", name: "地区", value: [{ name: "全部", value: "" }, { name: "大陆", value: "大陆" }, { name: "日本", value: "日本" }, { name: "韩国", value: "韩国" }, { name: "美国", value: "美国" }] },
    { key: "year", name: "年份", value: [{ name: "全部", value: "" }, { name: "2026", value: "2026" }, { name: "2025", value: "2025" }, { name: "2024", value: "2024" }] },
  ],
};

const FILTER_DEF = {
  "1": { tid: "1", area: "", year: "" },
  "2": { tid: "2", area: "", year: "" },
  "3": { tid: "3", area: "", year: "" },
  "4": { tid: "4", area: "", year: "" },
};

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

async function requestText(url, options = {}, redirectCount = 0) {
  await OmniBox.log("info", `[袋鼠影视][request] ${options.method || "GET"} ${url}`);
  const res = await OmniBox.request(url, {
    method: options.method || "GET",
    headers: {
      "User-Agent": UA,
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      Referer: options.referer || `${BASE_URL}/`,
      ...(options.headers || {}),
    },
    body: options.body,
    timeout: options.timeout || 20000,
  });
  const statusCode = Number(res?.statusCode || 0);
  if ([301, 302, 303, 307, 308].includes(statusCode) && redirectCount < 5) {
    const location = res?.headers?.location || res?.headers?.Location || res?.headers?.LOCATION;
    if (location) {
      const nextUrl = absoluteUrl(location);
      await OmniBox.log("info", `[袋鼠影视][redirect] ${url} -> ${nextUrl}`);
      return requestText(nextUrl, options, redirectCount + 1);
    }
  }
  if (!res || statusCode !== 200) {
    throw new Error(`HTTP ${statusCode || "unknown"} @ ${url}`);
  }
  return String(res.body || "");
}

async function getCachedText(cacheKey, ttl, producer) {
  try {
    const cached = await OmniBox.getCache(cacheKey);
    if (cached) return String(cached);
  } catch (_) {}
  const value = String(await producer());
  try {
    await OmniBox.setCache(cacheKey, value, ttl);
  } catch (_) {}
  return value;
}

function absoluteUrl(url) {
  try {
    return new URL(String(url || ""), BASE_URL).toString();
  } catch (_) {
    return String(url || "");
  }
}

function normalizeText(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/gi, " ")
    .replace(/&emsp;/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePageCount($) {
  let max = 1;
  $(".hy-page a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const match = href.match(/[?&]page=(\d+)/);
    if (match) max = Math.max(max, Number(match[1] || 1));
  });
  return max;
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

function parseCardFromThumb($, anchor) {
  const node = $(anchor);
  const href = node.attr("href") || "";
  const title = normalizeText(node.attr("title") || node.find("img").attr("alt") || node.closest(".item, dt").siblings(".title,.head").find("a,h3,h5").first().text());
  const pic = node.attr("data-original") || node.find("img").attr("data-original") || node.find("img").attr("src") || "";
  const remarks = normalizeText(node.find(".note").first().text() || node.closest("dt").find(".note").first().text() || node.closest(".item").find(".note").first().text());
  return {
    vod_id: absoluteUrl(href),
    vod_name: title,
    vod_pic: absoluteUrl(pic),
    vod_remarks: remarks,
  };
}

function parseHomeList(htmlText) {
  const $ = cheerio.load(htmlText);
  const list = [];
  $(".swiper-container.hy-slide a.videopic[href]").each((_, el) => {
    list.push(parseCardFromThumb($, el));
  });
  $(".hy-video-list .item a.videopic[href]").each((_, el) => {
    list.push(parseCardFromThumb($, el));
  });
  return dedupeVodList(list).filter((item) => item.vod_id && item.vod_name);
}

function parseCategoryList(htmlText) {
  const $ = cheerio.load(htmlText);
  const list = [];
  $(".hy-video-list .item a.videopic[href]").each((_, el) => {
    list.push(parseCardFromThumb($, el));
  });
  $(".hy-video-details .item dl.content").each((_, el) => {
    const box = $(el);
    const anchor = box.find("dt a.videopic[href]").first();
    const href = anchor.attr("href") || "";
    const title = normalizeText(box.find("dd .head a, dd .head h3, dd .head h5").first().text());
    const picStyle = anchor.attr("style") || "";
    const pic = anchor.attr("data-original") || anchor.find("img").attr("src") || ((picStyle.match(/url\(([^)]+)\)/) || [])[1] || "");
    const remarks = normalizeText(anchor.find(".note").first().text());
    list.push({
      vod_id: absoluteUrl(href),
      vod_name: title,
      vod_pic: absoluteUrl(pic.replace(/^['"]|['"]$/g, "")),
      vod_remarks: remarks,
      vod_actor: normalizeText(box.find("li:contains('主演')").first().text().replace(/^主演：/, "")),
      vod_director: normalizeText(box.find("li:contains('导演')").first().text().replace(/^导演：/, "")),
      vod_area: normalizeText(box.find("li:contains('地区')").first().text().replace(/^地区：/, "")),
      vod_lang: normalizeText(box.find("li:contains('语言')").first().text().replace(/^语言：/, "")),
      vod_year: normalizeText(box.find("li:contains('年份')").first().text().replace(/^年份：/, "")),
      vod_douban_score: normalizeText(box.find("li:contains('豆瓣')").first().text().replace(/^豆瓣：/, "")),
    });
  });
  return {
    list: dedupeVodList(list).filter((item) => item.vod_id && item.vod_name),
    pagecount: parsePageCount($),
  };
}

function parseSearchList(htmlText) {
  return parseCategoryList(htmlText);
}

function parseDetail(htmlText, detailUrl) {
  const $ = cheerio.load(htmlText);
  const title = normalizeText($("h1.h4, h1").first().text());
  const detailAnchor = $(".hy-video-details .content dt a.videopic").first();
  const pic = detailAnchor.find("img").attr("src") || detailAnchor.attr("data-original") || "";
  const remarks = normalizeText(detailAnchor.find(".note").first().text());
  const actor = $(".hy-video-details li").filter((_, el) => normalizeText($(el).text()).startsWith("主演：")).first();
  const director = $(".hy-video-details li").filter((_, el) => normalizeText($(el).text()).startsWith("导演：")).first();
  const year = $(".hy-video-details li").filter((_, el) => normalizeText($(el).text()).startsWith("年份：")).first();
  const area = $(".hy-video-details li").filter((_, el) => normalizeText($(el).text()).startsWith("地区：")).first();
  const typeLi = $(".hy-video-details li").filter((_, el) => normalizeText($(el).text()).startsWith("类型：")).first();
  const lang = $(".hy-video-details li").filter((_, el) => normalizeText($(el).text()).startsWith("语言：")).first();
  const alias = $(".hy-video-details li").filter((_, el) => normalizeText($(el).text()).startsWith("又名：")).first();
  const douban = $(".hy-video-details li").filter((_, el) => normalizeText($(el).text()).startsWith("豆瓣：")).first();
  const content = normalizeText($(".video-plot[data-video-plot]").html() || $("#list3 .plot").html() || $(".plot").html() || "");

  const playSources = [];
  $("#playlist .panel").each((_, panel) => {
    const sourceName = normalizeText($(panel).find("a.option").first().attr("title") || $(panel).find("a.option").first().clone().children().remove().end().text()) || `线路${playSources.length + 1}`;
    const episodes = [];
    $(panel).find(".playlist a[href]").each((__, a) => {
      const href = $(a).attr("href") || "";
      const epName = normalizeText($(a).attr("title") || $(a).text());
      if (!href || !epName) return;
      episodes.push({ name: epName, playId: absoluteUrl(href) });
    });
    if (episodes.length) playSources.push({ name: sourceName, episodes });
  });

  return {
    list: [{
      vod_id: detailUrl,
      vod_name: title,
      vod_pic: absoluteUrl(pic),
      type_name: normalizeText(typeLi.text().replace(/^类型：/, "")),
      vod_remarks: remarks,
      vod_actor: normalizeText(actor.text().replace(/^主演：/, "")),
      vod_director: normalizeText(director.text().replace(/^导演：/, "")),
      vod_year: normalizeText(year.text().replace(/^年份：/, "")),
      vod_area: normalizeText(area.text().replace(/^地区：/, "")),
      vod_lang: normalizeText(lang.text().replace(/^语言：/, "")),
      vod_douban_score: normalizeText(douban.text().replace(/^豆瓣：/, "")),
      vod_content: content,
      vod_play_sources: playSources,
      other: normalizeText(alias.text().replace(/^又名：/, "")),
    }],
  };
}

function buildCategoryUrl(categoryId, page, filters = {}) {
  const baseFilter = FILTER_DEF[String(categoryId)] || { tid: String(categoryId) };
  const merged = { ...baseFilter, ...(filters || {}) };
  const tid = String(merged.tid || categoryId || "1");
  const params = new URLSearchParams({ searchtype: "5", tid, page: String(page || 1) });
  if (merged.area) params.set("area", String(merged.area));
  if (merged.year) params.set("year", String(merged.year));
  return `${BASE_URL}/search.php?${params.toString()}`;
}

async function home(params, context) {
  try {
    const html = await getCachedText("daishu:home", LIST_CACHE_TTL, async () => requestText(`${BASE_URL}/`));
    return {
      class: CATEGORY_CONFIG.map((item) => ({ type_id: item.id, type_name: item.name })),
      filters: FILTERS,
      list: parseHomeList(html),
    };
  } catch (e) {
    await OmniBox.log("error", `[袋鼠影视][home] ${e.message}`);
    return { class: CATEGORY_CONFIG.map((item) => ({ type_id: item.id, type_name: item.name })), filters: FILTERS, list: [] };
  }
}

async function category(params, context) {
  try {
    const categoryId = String(params.categoryId || params.type_id || "1");
    const page = Math.max(1, Number(params.page || 1));
    const filters = params.extend || params.filters || params.ext || {};
    const url = buildCategoryUrl(categoryId, page, filters);
    const html = await getCachedText(`daishu:category:${url}`, LIST_CACHE_TTL, async () => requestText(url));
    const parsed = parseCategoryList(html);
    const pagecount = parsed.pagecount || (parsed.list.length >= 20 ? page + 1 : page);
    return {
      page,
      pagecount,
      total: pagecount * Math.max(parsed.list.length, 1),
      list: parsed.list,
    };
  } catch (e) {
    await OmniBox.log("error", `[袋鼠影视][category] ${e.message}`);
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }
}

async function detail(params, context) {
  try {
    const videoId = String(params.videoId || params.id || "").trim();
    if (!videoId) return { list: [] };
    const url = /^https?:\/\//.test(videoId) ? videoId : absoluteUrl(videoId);
    const html = await getCachedText(`daishu:detail:${url}`, DETAIL_CACHE_TTL, async () => requestText(url));
    return parseDetail(html, url);
  } catch (e) {
    await OmniBox.log("error", `[袋鼠影视][detail] ${e.message}`);
    return { list: [] };
  }
}

async function search(params, context) {
  try {
    const wd = String(params.keyword || params.wd || params.key || "").trim();
    const page = Math.max(1, Number(params.page || 1));
    if (!wd) return { page, pagecount: 0, total: 0, list: [] };
    const body = `searchword=${encodeURIComponent(wd)}`;
    const html = await getCachedText(`daishu:search:${wd}:${page}`, SEARCH_CACHE_TTL, async () => requestText(`${BASE_URL}/search.php?page=${page}`, {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      referer: `${BASE_URL}/search.php`,
    }));
    const parsed = parseSearchList(html);
    const totalMatch = html.match(/相关的.{0,40}“(\d+)”.{0,20}条结果/);
    const total = totalMatch ? Number(totalMatch[1] || 0) : parsed.list.length;
    return {
      page,
      pagecount: parsed.pagecount || page,
      total,
      list: parsed.list,
    };
  } catch (e) {
    await OmniBox.log("error", `[袋鼠影视][search] ${e.message}`);
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }
}

async function play(params, context) {
  try {
    const playId = String(params.playId || params.id || "").trim();
    if (!playId) return { parse: 1, url: "", urls: [], header: {} };
    const url = absoluteUrl(playId);
    const html = await requestText(url, { referer: url });
    const match = html.match(/var\s+now\s*=\s*"([^"]+)"/);
    const directUrl = match ? String(match[1] || "").trim() : "";
    if (directUrl) {
      return {
        parse: 0,
        url: directUrl,
        urls: [{ name: "播放", url: directUrl }],
        header: {
          "User-Agent": UA,
          Referer: url,
        },
      };
    }
    return {
      parse: 1,
      url,
      urls: [{ name: "播放页", url }],
      header: {
        "User-Agent": UA,
        Referer: url,
      },
    };
  } catch (e) {
    await OmniBox.log("error", `[袋鼠影视][play] ${e.message}`);
    return { parse: 1, url: String(params.playId || params.id || ""), urls: [], header: {} };
  }
}

});
