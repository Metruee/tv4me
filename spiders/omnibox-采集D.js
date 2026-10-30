// @name 影视采集D(合并6源)
// @version 3.20261030.1223
// @description 自动同步：采集聚合
// @downloadURL https://gh-proxy.com/https://raw.githubusercontent.com/Metruee/tv4me/main/spiders/omnibox-采集D.js
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

_load(1, "iKanBot", function (module, exports, require) {
// @name iKanBot
// @author 
// @description 刮削：支持，弹幕：支持，嗅探：支持
// @dependencies: axios, cheerio
// @version 1.0.3
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/iKanBot.js


/**
 * ============================================================================
 * iKanBot资源 - OmniBox 爬虫脚本
 * ============================================================================
 */
const axios = require("axios");
const cheerio = require("cheerio");
const http = require("http");
const https = require("https");
const OmniBox = require("omnibox_sdk");

// ========== 全局配置 ==========
const ikanbotConfig = {
    host: "https://www1.ikanbot.com",
    headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1"
    }
};
const DANMU_API = process.env.DANMU_API || "";

const axiosInstance = axios.create({
    timeout: 15000,
    httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
    httpAgent: new http.Agent({ keepAlive: true })
});

const PAGE_LIMIT = 20;

/**
 * 日志工具函数
 */
const logInfo = (message, data = null) => {
    const output = data ? `${message}: ${JSON.stringify(data)}` : message;
    OmniBox.log("info", `[iKanBot-DEBUG] ${output}`);
};

const logError = (message, error) => {
    OmniBox.log("error", `[iKanBot-DEBUG] ${message}: ${error.message || error}`);
};

const encodeMeta = (obj) => {
    try {
        return Buffer.from(JSON.stringify(obj || {}), 'utf8').toString('base64');
    } catch {
        return '';
    }
};

const decodeMeta = (str) => {
    try {
        const raw = Buffer.from(str || '', 'base64').toString('utf8');
        return JSON.parse(raw || '{}');
    } catch {
        return {};
    }
};

/**
 * 图像地址修复 - 保留原版复杂逻辑
 */
const fixImageUrl = (imageUrl, baseURL = "", referer = "") => {
    if (!imageUrl) return '';

    let url = '';

    if (imageUrl.startsWith('http')) {
        url = imageUrl;
    } else if (imageUrl.startsWith('//')) {
        url = 'https:' + imageUrl;
    } else if (imageUrl.startsWith('/')) {
        url = ikanbotConfig.host + imageUrl;
    } else {
        url = ikanbotConfig.host + '/' + imageUrl.replace(/^\.?\//, '');
    }

    const isExternalUrl = !url.includes(ikanbotConfig.host) && url.startsWith('http');
    const isDouban = url.includes('doubanio.com');

    if (isDouban) {
        try {
            const finalReferer = referer || 'https://movie.douban.com';
            const urlWithHeaders = `${url}@Referer=${finalReferer}`;
            const encodedUrl = encodeURIComponent(urlWithHeaders);
            const proxyUrl = `${baseURL}/api/proxy/image?url=${encodedUrl}`;
            // logInfo("图片分组: 豆瓣代理", { input: imageUrl, finalUrl: url, referer: finalReferer, result: proxyUrl });
            return proxyUrl;
        } catch (error) {
            logError("处理豆瓣图片失败", error);
            return url;
        }
    }

    if (isExternalUrl) {
        try {
            let finalReferer = referer;
            if (!finalReferer) {
                try {
                    const urlObj = new URL(url);
                    finalReferer = `${urlObj.protocol}//${urlObj.host}`;
                } catch {
                    finalReferer = ikanbotConfig.host;
                }
            }
            const urlWithHeaders = `${url}@Referer=${finalReferer}`;
            const encodedUrl = encodeURIComponent(urlWithHeaders);
            const proxyUrl = `${baseURL}/api/proxy/image?url=${encodedUrl}`;
            // logInfo("图片分组: 外部代理", { input: imageUrl, finalUrl: url, referer: finalReferer, result: proxyUrl });
            return proxyUrl;
        } catch (error) {
            logError("处理图片 URL 失败", error);
            return url;
        }
    }

    // logInfo("图片分组: 直连", { input: imageUrl, finalUrl: url, result: url });
    return url;
};

// ========== 弹幕工具函数 ==========
const preprocessTitle = (title) => {
    if (!title) return "";
    return title
        .replace(/4[kK]|[xX]26[45]|720[pP]|1080[pP]|2160[pP]/g, " ")
        .replace(/[hH]\\.?26[45]/g, " ")
        .replace(/BluRay|WEB-DL|HDR|REMUX/gi, " ")
        .replace(/\.mp4|\.mkv|\.avi|\.flv/gi, " ");
};

const chineseToArabic = (cn) => {
    const map = { '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };
    if (!isNaN(cn)) return parseInt(cn, 10);
    if (cn.length === 1) return map[cn] || cn;
    if (cn.length === 2) {
        if (cn[0] === '十') return 10 + map[cn[1]];
        if (cn[1] === '十') return map[cn[0]] * 10;
    }
    if (cn.length === 3) return map[cn[0]] * 10 + map[cn[2]];
    return cn;
};

const extractEpisode = (title) => {
    if (!title) return "";
    const processedTitle = preprocessTitle(title).trim();

    const cnMatch = processedTitle.match(/第\s*([零一二三四五六七八九十0-9]+)\s*[集话章节回期]/);
    if (cnMatch) return String(chineseToArabic(cnMatch[1]));

    const seMatch = processedTitle.match(/[Ss](?:\d{1,2})?[-._\s]*[Ee](\d{1,3})/i);
    if (seMatch) return seMatch[1];

    const epMatch = processedTitle.match(/\b(?:EP|E)[-._\s]*(\d{1,3})\b/i);
    if (epMatch) return epMatch[1];

    const bracketMatch = processedTitle.match(/[\[\(【(](\d{1,3})[\]\)】)]/);
    if (bracketMatch) {
        const num = bracketMatch[1];
        if (!["720", "1080", "480"].includes(num)) return num;
    }

    return "";
};

const buildFileNameForDanmu = (vodName, episodeTitle) => {
    if (!vodName) return "";
    if (!episodeTitle || episodeTitle === '正片' || episodeTitle === '播放') return vodName;

    const digits = extractEpisode(episodeTitle);
    if (digits) {
        const epNum = parseInt(digits, 10);
        if (epNum > 0) {
            if (epNum < 10) return `${vodName} S01E0${epNum}`;
            return `${vodName} S01E${epNum}`;
        }
    }
    return vodName;
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
        const hit = scrapeData.episodes.find((ep) => ep.episodeNumber === mapping.episodeNumber && ep.seasonNumber === mapping.seasonNumber);
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
    if (scrapeType === 'movie') {
        return scrapeData.title || fallbackVodName;
    }
    const title = scrapeData.title || fallbackVodName;
    const seasonAirYear = scrapeData.seasonAirYear || '';
    const seasonNumber = mapping?.seasonNumber || 1;
    const episodeNumber = mapping?.episodeNumber || 1;
    return `${title}.${seasonAirYear}.S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}`;
};

const matchDanmu = async (fileName) => {
    if (!DANMU_API || !fileName) return [];

    try {
        logInfo(`匹配弹幕: ${fileName}`);
        const matchUrl = `${DANMU_API}/api/v2/match`;
        const response = await OmniBox.request(matchUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            body: JSON.stringify({ fileName }),
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

        return [{
            name: danmakuName,
            url: `${DANMU_API}/api/v2/comment/${episodeId}?format=xml`,
        }];
    } catch (error) {
        logInfo(`弹幕匹配失败: ${error.message}`);
        return [];
    }
};

/**
 * 获取HTML内容
 */
const getHtml = async (url, headers = ikanbotConfig.headers) => {
    try {
        const response = await axiosInstance.get(url, { headers });
        return response.data;
    } catch (error) {
        logError(`获取HTML失败: ${url}`, error);
        return null;
    }
};

/**
 * 提取token逻辑 - 保留原版算法
 */
const extractToken = ($) => {
    const currentId = $('#current_id').val();
    let eToken = $('#e_token').val();
    if (!currentId || !eToken) return '';
    
    const idLength = currentId.length;
    const subId = currentId.substring(idLength - 4, idLength);
    let keys = [];
    
    for (let i = 0; i < subId.length; i++) {
        const curInt = parseInt(subId[i]);
        const splitPos = curInt % 3 + 1;
        keys[i] = eToken.substring(splitPos, splitPos + 8);
        eToken = eToken.substring(splitPos + 8, eToken.length);
    }
    
    return keys.join('');
};

/**
 * 解析播放源 - 适配 OmniBox 格式
 */
const parsePlaySourcesFromIkan = (playFrom, playList, vodName = '', videoId = '') => {
    // logInfo("开始解析iKanBot播放源", { from: playFrom, list: playList });
    
    const playSources = [];
    if (!playFrom || !playList) return playSources;
    
    const froms = playFrom.split('$$$');
    const urls = playList.split('$$$');
    
    for (let i = 0; i < froms.length; i++) {
        const sourceName = froms[i] || `线路${i + 1}`;
        const sourceItems = urls[i] ? urls[i].split('#') : [];
        
        const episodes = sourceItems.map((item, epIndex) => {
            const parts = item.split('$');
            const episodeName = parts[0] || '正片';
            const actualPlayId = parts[1] || parts[0];
            const fid = `${videoId}#${i}#${epIndex}`;
            return {
                name: episodeName,
                playId: `${actualPlayId}|||${encodeMeta({ sid: videoId, fid, v: vodName || '', e: episodeName })}`,
                _fid: fid,
                _rawName: episodeName,
            };
        }).filter(e => e.playId);
        
        if (episodes.length > 0) {
            playSources.push({
                name: sourceName,
                episodes: episodes
            });
        }
    }
    
    // logInfo("播放源解析结果", playSources);
    return playSources;
};

// ========== 接口实现 ==========

/**
 * 首页
 */
async function home(params, context) {
    logInfo("进入首页");
    
    try {
        const baseURL = params?.context?.baseURL || params?.baseURL || "";
        // 获取分类
        const classes = [];
        
        // 电影分类
        const movieHtml = await getHtml(ikanbotConfig.host + "/hot/index-movie-热门.html");
        if (movieHtml) {
            const $ = cheerio.load(movieHtml);
            const title = $('title:first').text().split('-')[0].substring(2);
            classes.push({
                type_id: "/hot/index-movie-热门.html",
                type_name: title
            });
        }
        
        // 电视剧分类
        const tvHtml = await getHtml(ikanbotConfig.host + "/hot/index-tv-热门.html");
        if (tvHtml) {
            const $ = cheerio.load(tvHtml);
            const title = $('title:first').text().split('-')[0].substring(2);
            classes.push({
                type_id: "/hot/index-tv-热门.html",
                type_name: title
            });
        }
        
        // 获取首页推荐
        const html = await getHtml(ikanbotConfig.host);
        const list = [];
        
        if (html) {
            const $ = cheerio.load(html);
            const items = $('div.v-list a.item');
            
            items.each((_, item) => {
                const img = $(item).find('img:first');
                const imgSrc = img.attr('data-src') || img.attr('src') || '';
                
                list.push({
                    vod_id: $(item).attr('href'),
                    vod_name: img.attr('alt') || $(item).find('.title').text() || '未知标题',
                    vod_pic: fixImageUrl(imgSrc, context.baseURL),
                    vod_remarks: $(item).find('.label').text() || ''
                });
            });
        }
        
        return {
            class: classes,
            list: list.slice(0, 20)
        };
    } catch (e) {
        logError("首页获取失败", e);
        return { class: [], list: [] };
    }
}

/**
 * 分类列表
 */
async function category(params, context) {
    const { categoryId, page } = params;
    const pg = parseInt(page) || 1;
    const baseURL = context?.baseURL || params?.baseURL || "";
    
    logInfo(`请求分类: ${categoryId}, 页码: ${pg}`);
    
    try {
        const link = ikanbotConfig.host + categoryId.replace('.html', pg > 1 ? `-p-${pg}.html` : '.html');
        const html = await getHtml(link);
        
        if (!html) {
            return { list: [], page: pg, pagecount: 1 };
        }
        
        const $ = cheerio.load(html);
        const items = $('div.v-list a.item');
        const list = [];
        
        items.each((_, item) => {
            const img = $(item).find('img:first');
            const imgSrc = img.attr('data-src') || img.attr('src') || '';
            
            list.push({
                vod_id: $(item).attr('href'),
                vod_name: img.attr('alt') || $(item).text().trim(),
                vod_pic: fixImageUrl(imgSrc, baseURL),
                vod_remarks: $(item).find('.label').text() || ''
            });
        });
        
        return {
            list: list,
            page: pg,
            pagecount: list.length >= PAGE_LIMIT ? pg + 1 : pg
        };
    } catch (e) {
        logError("分类请求失败", e);
        return { list: [], page: pg, pagecount: 0 };
    }
}

/**
 * 详情页
 */
async function detail(params, context) {
    const videoId = params.videoId;
    const baseURL = context?.baseURL || params?.baseURL || "";
    logInfo(`请求详情 ID: ${videoId}`);
    
    try {
        const html = await getHtml(ikanbotConfig.host + videoId);
        if (!html) return { list: [] };
        
        const $ = cheerio.load(html);
        const detail = $('div.detail');
        
        // 获取封面图片
        const coverImg = $('div.item-root > img');
        const coverSrc = coverImg.attr('data-src') || coverImg.attr('src') || '';
        
        // 提取token
        const token = extractToken($);
        const pureVideoId = videoId.substring(videoId.lastIndexOf('/') + 1);
        
        // 获取播放资源
        const resUrl = ikanbotConfig.host + '/api/getResN?videoId=' + pureVideoId + '&mtype=2&token=' + token;
        const resResponse = await axiosInstance.get(resUrl, {
            headers: {
                ...ikanbotConfig.headers,
                'Referer': ikanbotConfig.host
            }
        });
        
        const resData = resResponse.data;
        const apiList = resData.data?.list || [];
        
        let playlist = {};
        let arr = [];
        
        // 解析播放源
        for (const l of apiList) {
            try {
                const flagData = JSON.parse(l.resData);
                for (const f of flagData) {
                    const from = f.flag;
                    const urls = f.url;
                    if (!from || !urls) continue;
                    if (playlist[from]) continue;
                    playlist[from] = urls;
                }
            } catch (e) {
                logError('解析播放源失败', e);
            }
        }
        
        // 排序播放源
        for (const key in playlist) {
            if ('kuaikan' === key) {
                arr.push({ flag: '快看', url: playlist[key], sort: 1 });
            } else if ('bfzym3u8' === key) {
                arr.push({ flag: '暴风', url: playlist[key], sort: 2 });
            } else if ('ffm3u8' === key) {
                arr.push({ flag: '非凡', url: playlist[key], sort: 3 });
            } else if ('lzm3u8' === key) {
                arr.push({ flag: '量子', url: playlist[key], sort: 4 });
            } else {
                arr.push({ flag: key, url: playlist[key], sort: 5 });
            }
        }
        
        arr.sort((a, b) => a.sort - b.sort);
        
        // 获取影片基本信息
        const title = $(detail).find('h2').text().trim();
        const actor = $(detail).find('h3:nth-child(5)').text();
        const director = $(detail).find('h3:nth-child(4)').text() || '';

        const playFrom = arr.map(val => val.flag).join("$$$");
        const playList = arr.map(val => val.url).join("$$$");
        
        // 解析为 OmniBox 格式
        const playSources = parsePlaySourcesFromIkan(playFrom, playList, title, String(videoId || ''));

        // 刮削处理
        let scrapeData = null;
        let videoMappings = [];
        let scrapeType = '';
        const scrapeCandidates = [];

        for (const source of playSources) {
            for (const ep of source.episodes || []) {
                if (!ep._fid) continue;
                scrapeCandidates.push({
                    fid: ep._fid,
                    file_id: ep._fid,
                    file_name: ep._rawName || ep.name || '正片',
                    name: ep._rawName || ep.name || '正片',
                    format_type: 'video',
                });
            }
        }

        if (scrapeCandidates.length > 0) {
            try {
                const videoIdForScrape = String(videoId || '');
                const scrapingResult = await OmniBox.processScraping(videoIdForScrape, title || '', title || '', scrapeCandidates);
                OmniBox.log('info', `[iKanBot-DEBUG] 刮削处理完成,结果: ${JSON.stringify(scrapingResult || {}).substring(0, 200)}`);

                const metadata = await OmniBox.getScrapeMetadata(videoIdForScrape);
                scrapeData = metadata?.scrapeData || null;
                videoMappings = metadata?.videoMappings || [];
                scrapeType = metadata?.scrapeType || '';
            } catch (e) {
                logError('刮削处理失败', e);
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
                    OmniBox.log('info', `[iKanBot-DEBUG] 应用刮削后源文件名: ${oldName} -> ${newName}`);
                }
                ep._seasonNumber = mapping.seasonNumber;
                ep._episodeNumber = mapping.episodeNumber;
            }

            const hasEpisodeNumber = (source.episodes || []).some((ep) => ep._episodeNumber !== undefined && ep._episodeNumber !== null);
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
        
        const fixedRemarks = '(线路利用网络爬虫技术获取,各线路的版本、清晰度、播放速度等存在差异请自行切换。建议避开晚上高峰时段。)';
        
        return {
            list: [{
                vod_id: videoId,
                vod_name: scrapeData?.title || title,
                vod_pic: scrapeData?.posterPath ? fixImageUrl(`https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`, baseURL) : fixImageUrl(coverSrc, baseURL),
                vod_content: fixedRemarks,
                vod_actor: (scrapeData?.credits?.cast || []).slice(0, 5).map((c) => c?.name).filter(Boolean).join(',') || actor,
                vod_director: (scrapeData?.credits?.crew || []).filter((c) => c?.job === 'Director' || c?.department === 'Directing').slice(0, 3).map((c) => c?.name).filter(Boolean).join(',') || director,
                vod_remarks: '',
                vod_play_sources: normalizedPlaySources
            }]
        };
    } catch (e) {
        logError("详情获取失败", e);
        return { list: [] };
    }
}

/**
 * 搜索 - 保留严格匹配逻辑
 */
async function search(params, context) {
    const wd = params.keyword || params.wd || "";
    const pg = parseInt(params.page) || 1;
    const baseURL = context?.baseURL || params?.baseURL || "";
    
    logInfo(`搜索关键词: ${wd}, 页码: ${pg}`);
    
    try {
        const link = pg === 1
            ? ikanbotConfig.host + '/search?q=' + encodeURIComponent(wd)
            : ikanbotConfig.host + '/search?q=' + encodeURIComponent(wd) + '&p=' + pg;
        
        const html = await getHtml(link);
        if (!html) return { list: [], page: pg, pagecount: 1 };
        
        const $ = cheerio.load(html);
        const items = $('div.media');
        
        // 获取所有结果
        const allResults = [];
        items.each((_, item) => {
            const a = $(item).find('a:first');
            const img = $(item).find('img:first');
            const imgSrc = img.attr('data-src') || img.attr('src') || '';
            const remarks = $(item).find('span.label').first().text().trim();
            const title = img.attr('alt') || a.text().trim();
            
            allResults.push({
                vod_id: a.attr('href'),
                vod_name: title,
                vod_pic: fixImageUrl(imgSrc, baseURL),
                vod_remarks: remarks || '',
                originalTitle: title
            });
        });
        
        // 严格过滤:检查标题是否包含完整的搜索关键字
        const lowerKeyword = wd.toLowerCase().trim();
        const filteredList = allResults.filter(item => {
            const lowerTitle = item.vod_name.toLowerCase();
            
            // 1. 完全包含关键字
            if (lowerTitle.includes(lowerKeyword)) {
                return true;
            }
            
            // 2. 处理可能的关键字分割
            if (lowerKeyword.length >= 2) {
                const cleanTitle = lowerTitle.replace(/[·\-_:()()《》【】\s]/g, '');
                const cleanKeyword = lowerKeyword.replace(/[·\-_:()()《》【】\s]/g, '');
                
                if (cleanTitle.includes(cleanKeyword)) {
                    return true;
                }
                
                // 如果是中文,尝试字符级别匹配
                if (/[\u4e00-\u9fa5]/.test(lowerKeyword)) {
                    const keywordChars = cleanKeyword.split('');
                    return keywordChars.every(char => cleanTitle.includes(char));
                }
            }
            
            return false;
        });
        
        // 移除用于过滤的字段
        const finalList = filteredList.map(({ originalTitle, ...rest }) => rest);
        
        return {
            list: finalList,
            page: pg,
            pagecount: finalList.length >= PAGE_LIMIT ? pg + 1 : pg
        };
    } catch (e) {
        logError("搜索失败", e);
        return { list: [], page: pg, pagecount: 0 };
    }
}

/**
 * 播放
 */
async function play(params) {
    let playId = params.playId;
    logInfo(`准备播放 ID: ${playId}`);
    let vodName = "";
    let episodeName = "";
    let playMeta = {};
    let scrapedDanmuFileName = "";

    if (playId && playId.includes('|||')) {
        const [mainPlayId, metaB64] = playId.split('|||');
        playId = mainPlayId || '';
        playMeta = decodeMeta(metaB64 || '');
        vodName = playMeta.v || '';
        episodeName = playMeta.e || '';
        logInfo(`解析透传信息 - 视频: ${vodName}, 集数: ${episodeName}`);
    } else if (playId && playId.includes('|')) {
        const parts = playId.split('|');
        playId = parts.shift() || '';
        vodName = parts.shift() || '';
        episodeName = parts.join('|') || '';
        logInfo(`解析旧透传信息 - 视频: ${vodName}, 集数: ${episodeName}`);
    }

    try {
        const sourceVideoId = String(params.vodId || playMeta.sid || '');
        if (sourceVideoId) {
            const metadata = await OmniBox.getScrapeMetadata(sourceVideoId);
            if (metadata && metadata.scrapeData) {
                const mapping = (metadata.videoMappings || []).find((m) => m?.fileId === playMeta?.fid);
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
    } catch (e) {
        logInfo(`读取刮削元数据失败: ${e.message}`);
    }
    
    // iKanBot 播放地址处理，支持嗅探
    let playUrl = playId;
    if (playUrl && !playUrl.startsWith('http')) {
        playUrl = playUrl.startsWith('/') ? ikanbotConfig.host + playUrl : ikanbotConfig.host + '/' + playUrl;
    }

    const isDirectPlayable = playUrl && playUrl.match(/\.(m3u8|mp4|flv|avi|mkv|ts)/i);
    let finalUrl = playUrl;
    let finalHeader = { ...ikanbotConfig.headers, Referer: ikanbotConfig.host };

    if (!isDirectPlayable && playUrl) {
        try {
            const sniffResult = await OmniBox.sniffVideo(playUrl);
            if (sniffResult && sniffResult.url) {
                finalUrl = sniffResult.url;
                finalHeader = sniffResult.header || finalHeader;
                logInfo("嗅探成功", { url: finalUrl });
            } else {
                logInfo("嗅探未返回有效地址");
            }
        } catch (e) {
            logInfo(`嗅探失败: ${e.message}`);
        }
    }

    const playResponse = {
        urls: [{ name: "默认", url: finalUrl }],
        parse: 0,
        header: finalHeader
    };

    if (DANMU_API && vodName) {
        const fileName = scrapedDanmuFileName || buildFileNameForDanmu(vodName, episodeName);
        logInfo(`尝试匹配弹幕文件名: ${fileName}`);
        if (fileName) {
            const danmakuList = await matchDanmu(fileName);
            if (danmakuList.length > 0) {
                playResponse.danmaku = danmakuList;
                logInfo("弹幕已添加到播放响应");
            }
        }
    } else if (!DANMU_API) {
        logInfo("DANMU_API 未配置，跳过弹幕匹配");
    }

    return playResponse;
}

module.exports = { home, category, search, detail, play };

const runner = require("spider_runner");
runner.run(module.exports);

});

_load(2, "两个BT", function (module, exports, require) {
// @name 两个BT
// @author 
// @description 刮削：支持，弹幕：支持，嗅探：支持
// @dependencies: axios, cheerio
// @version 1.0.8
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/两个BT.js
/**
 * ============================================================================
 * 两个BT资源 - OmniBox 爬虫脚本
 * ============================================================================
 */
const axios = require("axios");
const http = require("http");
const https = require("https");
const cheerio = require("cheerio");
const OmniBox = require("omnibox_sdk");

// ========== 全局配置 ==========
const host = "https://www.bttwoo.com";
const def_headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
  Referer: "https://www.bttwoo.com/",
};

const axiosInstance = axios.create({
  timeout: 15000,
  httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
  httpAgent: new http.Agent({ keepAlive: true }),
});

const PAGE_LIMIT = 20;

/**
 * 日志工具函数
 */
const logInfo = (message, data = null) => {
  const output = data ? `${message}: ${JSON.stringify(data)}` : message;
  OmniBox.log("info", `[两个BT-DEBUG] ${output}`);
};

const logError = (message, error) => {
  OmniBox.log("error", `[两个BT-DEBUG] ${message}: ${error.message || error}`);
};

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

/**
 * 图像地址修复
 */
const fixPicUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return "https:" + url;
  return url.startsWith("/") ? `${host}${url}` : `${host}/${url}`;
};

const cleanText = (text) => (text || "").replace(/\s+/g, " ").trim();

const isBadPic = (url) => {
  if (!url) return true;
  return (
    url.includes("placeholder") ||
    url.includes("blank.gif") ||
    url.includes("base64") ||
    url.includes("/static/icons/") ||
    url.includes("favicon") ||
    url.includes("logo.png")
  );
};

const getPlaySlug = (url) => {
  if (!url) return "";
  const match = String(url).match(/\/play\/([^/?#"' ]+)/);
  return match ? match[1] : "";
};

const getPlayPath = (url) => {
  const slug = getPlaySlug(url);
  return slug ? `/play/${slug}` : "";
};

const getDetailField = ($, label) => {
  let value = "";
  $("div").each((_, elem) => {
    const $elem = $(elem);
    if (cleanText($elem.text()) !== label) return;
    const text = cleanText($elem.next().text());
    if (text) {
      value = text;
      return false;
    }
  });
  return value;
};

const CLASS_LIST = [
  { type_id: "movie", type_name: "电影" },
  { type_id: "tv", type_name: "电视剧" },
  { type_id: "anime", type_name: "动漫" },
  { type_id: "variety", type_name: "综艺" },
];

const makeFilterValues = (items) => [
  { name: "全部", value: "" },
  ...items.map(([value, name]) => ({ name, value })),
];

const AREA_VALUES = makeFilterValues([
  ["5", "美国"],
  ["6", "法国"],
  ["7", "中国"],
  ["9", "unknown"],
  ["11", "日本"],
  ["12", "韩国"],
  ["14", "中国香港"],
  ["16", "俄罗斯"],
  ["17", "波兰"],
  ["18", "德国"],
  ["19", "意大利"],
  ["21", "中国台湾"],
  ["22", "澳大利亚"],
  ["24", "西班牙"],
  ["30", "英国"],
  ["32", "加拿大"],
  ["33", "泰国"],
  ["34", "印度"],
  ["41", "丹麦"],
  ["52", "中国大陆"],
  ["65", "马来西亚"],
  ["74", "菲律宾"],
  ["78", "其他"],
  ["79", "瑞典"],
  ["80", "挪威"],
  ["81", "阿根廷"],
  ["82", "冰岛"],
  ["83", "保加利亚"],
]);

const TYPE_VALUES = makeFilterValues([
  ["1", "剧情"],
  ["2", "悬疑"],
  ["3", "恐怖"],
  ["4", "惊悚"],
  ["5", "喜剧"],
  ["6", "爱情"],
  ["9", "犯罪"],
  ["10", "动作"],
  ["11", "动画"],
  ["12", "奇幻"],
  ["13", "音乐"],
  ["14", "科幻"],
  ["15", "历史"],
  ["16", "战争"],
  ["18", "冒险"],
  ["19", "家庭"],
  ["20", "纪录"],
  ["23", "西部"],
  ["24", "电视电影"],
  ["25", "情色"],
  ["26", "真人秀"],
  ["27", "古装"],
  ["28", "传记"],
  ["29", "同性"],
  ["30", "运动"],
  ["31", "武侠"],
  ["32", "歌舞"],
  ["33", "纪录片"],
  ["34", "灾难"],
  ["35", "短片"],
]);

const YEAR_VALUES = makeFilterValues([
  ["1", "2026"], ["3", "2025"], ["4", "2024"], ["56", "2023"], ["13", "2022"],
  ["2", "2021"], ["6", "2020"], ["8", "2019"], ["9", "2018"], ["12", "2017"],
  ["11", "2016"], ["14", "2015"], ["15", "2014"], ["22", "2013"], ["10", "2012"],
  ["17", "2011"], ["25", "2010"], ["20", "2009"], ["23", "2008"], ["30", "2007"],
  ["31", "2006"], ["7", "2005"], ["24", "2004"], ["28", "2003"], ["19", "2002"],
  ["29", "2001"], ["43", "2000"], ["45", "1999"], ["33", "1998"], ["34", "1997"],
  ["37", "1996"], ["21", "1995"], ["27", "1994"], ["26", "1993"], ["35", "1992"],
  ["18", "1991"], ["42", "1990"], ["44", "1989"], ["60", "1988"], ["73", "1987"],
  ["32", "1986"], ["40", "1985"], ["63", "1984"], ["59", "1983"], ["36", "1982"],
  ["5", "1981"], ["39", "1980"], ["61", "1979"], ["66", "1978"], ["48", "1977"],
  ["38", "1976"], ["57", "1975"], ["62", "1974"], ["53", "1973"], ["54", "1972"],
  ["51", "1971"], ["41", "1969"], ["58", "1965"], ["46", "1963"], ["65", "1962"],
  ["71", "1961"], ["75", "1960"], ["16", "1959"], ["67", "1958"], ["50", "1957"],
  ["49", "1956"], ["47", "1955"], ["68", "1954"], ["72", "1952"], ["70", "1949"],
  ["64", "1948"], ["52", "1938"], ["55", "1931"], ["69", "1925"], ["74", "1921"],
]);

const TAG_VALUES = makeFilterValues([
  ["1", "4k"],
  ["36", "院线"],
]);

const SORT_VALUES = [
  { name: "最新上映", value: "update_time:desc" },
  { name: "最受欢迎", value: "hits:desc" },
  { name: "评分最高", value: "score:desc" },
];

const buildCategoryFilterList = () => [
  { key: "areas", name: "地区", value: AREA_VALUES },
  { key: "types", name: "类型", value: TYPE_VALUES },
  { key: "years", name: "年份", value: YEAR_VALUES },
  { key: "tags", name: "标签", value: TAG_VALUES },
  { key: "sort", name: "排序", value: SORT_VALUES },
];

const FILTERS = CLASS_LIST.reduce((filters, item) => {
  filters[item.type_id] = buildCategoryFilterList();
  return filters;
}, {});

const CATEGORY_BASE_FILTERS = {
  movie: { classify: "1" },
  tv: { classify: "2" },
  anime: { classify: "3" },
  variety: { classify: "4" },
  zgjun: { classify: "2", areas: "7,52" },
  meiju: { classify: "2", areas: "5" },
  jpsrtv: { classify: "2", areas: "11,12" },
  gf: { sort_by: "score", order: "desc" },
};

const appendQuery = (url, params = {}) => {
  const parts = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  if (parts.length === 0) return url;
  return url + (url.includes("?") ? "&" : "?") + parts.join("&");
};

const parseFilterObject = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  if (typeof value !== "string") return {};

  try {
    return JSON.parse(value);
  } catch {
    try {
      return JSON.parse(Buffer.from(value, "base64").toString("utf8"));
    } catch {
      return {};
    }
  }
};

const getRequestFilters = (params = {}) => ({
  ...parseFilterObject(params.filters),
  ...parseFilterObject(params.extend),
  ...parseFilterObject(params.ext),
  ...parseFilterObject(params.filter),
});

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

/**
 * 检查搜索结果相关性
 */
const isRelevantSearchResult = (title, searchKey) => {
  if (!title || !searchKey) return false;

  const titleLower = title.toLowerCase();
  const searchKeyLower = searchKey.toLowerCase();

  if (titleLower.includes(searchKeyLower)) {
    return true;
  }

  const searchChars = new Set(searchKeyLower.replace(/\s+/g, ""));
  const titleChars = new Set(titleLower.replace(/\s+/g, ""));

  if (searchChars.size > 0) {
    const intersection = new Set([...searchChars].filter((x) => titleChars.has(x)));
    const matchRatio = intersection.size / searchChars.size;
    if (matchRatio >= 0.6) {
      return true;
    }
  }

  if (searchKeyLower.length <= 2) {
    return titleLower.includes(searchKeyLower);
  }

  return false;
};

/**
 * 从HTML提取视频列表
 */
const extractVideoList = ($, keyword = null) => {
  const list = [];
  const seenIds = new Set();

  $('a[href*="/play/"], li:has(a[href*="/movie/"]), .item li:has(a[href*="/movie/"])').each((i, elem) => {
    const $elem = $(elem);

    const link = $elem.is("a") ? $elem.attr("href") : $elem.find('a[href*="/play/"], a[href*="/movie/"]').attr("href");
    if (!link) return;

    const playSlug = getPlaySlug(link);
    const oldVodIdMatch = link.match(/\/movie\/(\d+)\.html/);
    if (!playSlug && !oldVodIdMatch) return;

    const vodId = playSlug || oldVodIdMatch[1];
    if (seenIds.has(vodId)) return;

    let title = "";
    const titleSelectors = ["[data-title]", "h3 a", "h3", "h2", "a[title]", ".title", ".name", "img[alt]"];

    for (const selector of titleSelectors) {
      const titleElem = $elem.find(selector);
      if (titleElem.length > 0) {
        title =
          cleanText(titleElem.first().attr("data-title")) ||
          cleanText(titleElem.first().attr("title")) ||
          cleanText(titleElem.first().attr("alt")) ||
          cleanText(titleElem.first().text());
        if (title && title.length > 1) break;
      }
    }

    if (!title) return;

    // 搜索时检查相关性
    if (keyword && !isRelevantSearchResult(title, keyword)) {
      return;
    }

    seenIds.add(vodId);

    let pic = "";
    const picSelectors = ["img[data-original]", "img[data-src]", "img[src]"];

    for (const selector of picSelectors) {
      const img = $elem.find(selector);
      if (img.length > 0) {
        for (let j = 0; j < img.length; j++) {
          const item = img.eq(j);
          const imgUrl = item.attr("data-original") || item.attr("data-src") || item.attr("src");
          if (!isBadPic(imgUrl)) {
            pic = imgUrl;
            break;
          }
        }
        if (pic) break;
      }
    }

    const rating = cleanText($elem.find("[data-rating]").first().attr("data-rating"));
    const text = cleanText($elem.text());
    const remarkMatch = text.match(/(4k|4K|1080p|1080P|HD|更新至\s*\d+|第\s*\d+\s*集|\d+(?:\.\d)?分)/);
    const remarks = rating ? `${rating}分` : remarkMatch ? remarkMatch[1] : "";

    list.push({
      vod_id: vodId,
      vod_name: title,
      vod_pic: fixPicUrl(pic),
      vod_remarks: remarks || "",
    });
  });

  return list;
};

/**
 * 解析播放源为 OmniBox 格式
 */
const parsePlaySources = ($, vodId) => {
  try {
    logInfo("开始解析播放源");
    const sourceMap = new Map();
    const lineNames = {};
    const episodeManager = ($.html().match(/episodeManager\([^[]*\[([\s\S]*?)\]\)/) || [])[1] || "";

    episodeManager.replace(/lineName:\s*['"]([^'"]+)['"]/g, (_, name) => {
      const idx = Object.keys(lineNames).length + 1;
      lineNames[String(idx)] = name;
      return "";
    });

    const addEpisode = (line, ep) => {
      const lineId = String(line || "1");
      if (!sourceMap.has(lineId)) {
        sourceMap.set(lineId, {
          name: lineNames[lineId] || (lineId === "1" ? "默认播放" : `线路${lineId}`),
          episodes: [],
          seen: new Set(),
        });
      }

      const source = sourceMap.get(lineId);
      if (source.seen.has(ep.playId)) return;
      source.seen.add(ep.playId);
      source.episodes.push(ep);
    };

    $('a[href*="/play/"]').each((i, elem) => {
      const $elem = $(elem);
      if (!$elem.attr("dataid") && !$elem.attr("data-episode")) return;

      const epUrl = $elem.attr("href");
      const playPath = getPlayPath(epUrl);
      if (!playPath) return;

      const dataEpisode = $elem.attr("data-episode") || "";
      const dataLine = $elem.attr("data-line") || "1";
      const dataId = $elem.attr("dataid") || "";
      const rawTitle = cleanText($elem.text());
      const epTitle = rawTitle || (dataEpisode ? `第${dataEpisode}集` : "正片");
      const normalizedTitle = /^\d+$/.test(epTitle) ? `第${epTitle}集` : epTitle;
      const fid = dataId || `${vodId}#${dataLine}#${dataEpisode || i}`;

      addEpisode(dataLine, {
        name: normalizedTitle,
        playId: `${playPath}|||${encodeMeta({ sid: String(vodId || ""), fid, e: normalizedTitle, dataid: dataId })}`,
        _fid: fid,
        _rawName: normalizedTitle,
        _episodeIndex: Number(dataEpisode) || i,
      });
    });

    $('a[href*="/v_play/"]').each((i, elem) => {
      const $elem = $(elem);
      const epTitle = cleanText($elem.text());
      const epUrl = $elem.attr("href");

      if (epTitle && epUrl) {
        const playIdMatch = epUrl.match(/\/v_play\/([^.]+)\.html/);
        if (playIdMatch) {
          const fid = `${vodId}#0#${i}`;
          addEpisode("1", {
            name: epTitle,
            playId: `${playIdMatch[1]}|||${encodeMeta({ sid: String(vodId || ""), fid, e: epTitle })}`,
            _fid: fid,
            _rawName: epTitle,
            _episodeIndex: i,
          });
        }
      }
    });

    const playSources = [...sourceMap.values()].map((source) => ({
      name: source.name,
      episodes: source.episodes.sort((a, b) => {
        const episodeA = a._episodeIndex || Number((a._fid || "").match(/#(\d+)$/)?.[1] || 0);
        const episodeB = b._episodeIndex || Number((b._fid || "").match(/#(\d+)$/)?.[1] || 0);
        return episodeA - episodeB;
      }),
    }));

    if (playSources.length === 0) {
      const currentPath = getPlayPath($('link[rel="canonical"]').attr("href")) || "";
      const fallbackPath = currentPath || `/play/${vodId}`;
      playSources.push({
        name: "默认播放",
        episodes: [
          {
            name: "正片",
            playId: `${fallbackPath}|||${encodeMeta({ sid: String(vodId || ""), fid: `${vodId}#1#1`, e: "正片" })}`,
            _fid: `${vodId}#1#1`,
            _rawName: "正片",
            _episodeIndex: 1,
          },
        ],
      });
    }

    if (playSources.length > 0) {
      playSources.forEach((source) => {
        delete source.seen;
      });
    } else {
      playSources.push({
        name: "默认播放",
        episodes: [{ name: "第1集", playId: "bXZfMTM0NTY4LW5tXzE=" }],
      });
    }

    logInfo("播放源解析结果", playSources);
    return playSources;
  } catch (e) {
    logError("解析播放源失败", e);
    return [{ name: "默认播放", episodes: [{ name: "第1集", playId: "bXZfMTM0NTY4LW5tXzE=" }] }];
  }
};

/**
 * 构建URL
 */
const buildUrl = (tid, pg, extend = {}) => {
  try {
    const tidStr = String(tid || "movie");
    const query = { ...(CATEGORY_BASE_FILTERS[tidStr] || (/^\d+$/.test(tidStr) ? { classify: tidStr } : { classify: "1" })) };

    const setFilter = (targetKey, sourceKeys) => {
      for (const key of sourceKeys) {
        if (!hasOwn(extend, key)) continue;
        const value = extend[key];
        if (value === "" || value === undefined || value === null) {
          delete query[targetKey];
        } else {
          query[targetKey] = String(value);
        }
        return;
      }
    };

    setFilter("classify", ["classify"]);
    setFilter("areas", ["areas", "area"]);
    setFilter("types", ["types", "type", "class"]);
    setFilter("years", ["years", "year"]);
    setFilter("tags", ["tags", "tag"]);

    if (hasOwn(extend, "sort") || hasOwn(extend, "by") || hasOwn(extend, "sort_by") || hasOwn(extend, "order")) {
      const rawSort = String(extend.sort || extend.by || "");
      if (rawSort) {
        const [field, order] = rawSort.split(/[:|,]/);
        query.sort_by = field;
        query.order = order || query.order || "desc";
      } else if (hasOwn(extend, "sort") || hasOwn(extend, "by")) {
        delete query.sort_by;
        delete query.order;
      }

      if (extend.sort_by) {
        query.sort_by = String(extend.sort_by);
        query.order = String(extend.order || query.order || "desc");
      } else if (hasOwn(extend, "sort_by") && !extend.sort_by) {
        delete query.sort_by;
        delete query.order;
      }

      if (extend.order) {
        query.order = String(extend.order);
      }
    }

    if (pg && Number(pg) > 1) {
      query.page = String(pg);
    }

    return appendQuery(`${host}/filter`, query);
  } catch (error) {
    logError("构建URL错误", error);
    return host + "/filter";
  }
};

// ========== 接口实现 ==========

async function home(params) {
  logInfo("进入首页");
  const result = {
    class: CLASS_LIST,
    filters: FILTERS,
    list: [],
  };

  try {
    const url = host;
    logInfo(`首页URL: ${url}`);
    const res = await axiosInstance.get(url, { headers: def_headers });
    const $ = cheerio.load(res.data);
    const list = extractVideoList($);
    logInfo(`首页获取到 ${list.length} 个项目`);
    result.list = list;
  } catch (e) {
    logError("首页请求失败", e);
  }

  return result;
}

async function category(params) {
  const categoryId = params.categoryId || params.type_id || params.tid || "movie";
  const filters = getRequestFilters(params);
  const pg = parseInt(params.page) || 1;
  logInfo(`请求分类: ${categoryId}, 页码: ${pg}, 筛选: ${JSON.stringify(filters)}`);

  try {
    const url = buildUrl(categoryId, pg, filters);
    logInfo(`分类URL: ${url}`);

    const res = await axiosInstance.get(url, { headers: def_headers });
    const $ = cheerio.load(res.data);

    const list = extractVideoList($);

    logInfo(`分类 ${categoryId} 第 ${pg} 页获取到 ${list.length} 个项目`);

    return {
      list: list,
      page: pg,
      pagecount: list.length >= PAGE_LIMIT ? pg + 1 : pg,
      filters: FILTERS[String(categoryId)] || [],
    };
  } catch (e) {
    logError("分类请求失败", e);
    return { list: [], page: pg, pagecount: 0 };
  }
}

async function search(params) {
  const wd = params.keyword || params.wd || "";
  const pg = parseInt(params.page) || 1;
  logInfo(`搜索关键词: ${wd}, 页码: ${pg}`);

  try {
    let searchUrl = `${host}/search?q=${encodeURIComponent(wd)}`;
    if (pg && pg !== 1) {
      searchUrl += `&page=${pg}`;
    }

    logInfo(`搜索URL: ${searchUrl}`);

    const res = await axiosInstance.get(searchUrl, { headers: def_headers });
    const $ = cheerio.load(res.data);

    const list = extractVideoList($, wd);

    logInfo(`搜索 "${wd}" 找到 ${list.length} 个结果`);

    return {
      list: list,
      page: pg,
      pagecount: list.length >= PAGE_LIMIT ? pg + 1 : pg,
    };
  } catch (e) {
    logError("搜索失败", e);
    return { list: [], page: pg, pagecount: 0 };
  }
}

async function detail(params) {
  const videoId = params.videoId;
  logInfo(`请求详情 ID: ${videoId}`);

  try {
    let detailUrl = String(videoId || "");
    if (detailUrl.includes("://")) {
      detailUrl = detailUrl;
    } else if (detailUrl.startsWith("/play/") || detailUrl.startsWith("/movie/")) {
      detailUrl = host + detailUrl;
    } else if (detailUrl.startsWith("play/") || detailUrl.startsWith("movie/")) {
      detailUrl = host + "/" + detailUrl;
    } else if (/^\d+$/.test(detailUrl)) {
      detailUrl = `${host}/movie/${detailUrl}.html`;
    } else {
      detailUrl = `${host}/play/${detailUrl}`;
    }

    logInfo(`详情URL: ${detailUrl}`);

    const res = await axiosInstance.get(detailUrl, { headers: def_headers });
    const $ = cheerio.load(res.data);
    const detailVodId = getPlaySlug(detailUrl) || String(videoId || "");

    let title = "";
    const titleSelectors = ["h1", "h2", "title"];
    for (const selector of titleSelectors) {
      const titleElem = $(selector);
      if (titleElem.length > 0) {
        title = cleanText(titleElem.text());
        if (title) break;
      }
    }

    let pic = "";
    pic = $(".video-player[data-poster]").first().attr("data-poster") || "";
    const picSelectors = [".movie-poster img", ".video-player img", "main img[data-src]", "main img[src]", "img[src]"];
    if (!pic) {
      for (const selector of picSelectors) {
        const img = $(selector);
        if (img.length > 0) {
          for (let i = 0; i < img.length; i++) {
            const item = img.eq(i);
            const imgUrl = item.attr("data-original") || item.attr("data-src") || item.attr("src");
            const alt = cleanText(item.attr("alt"));
            if (!isBadPic(imgUrl) && (!title || !alt || title.includes(alt) || alt.includes(title))) {
              pic = imgUrl;
              break;
            }
          }
          if (pic) break;
        }
      }
    }

    if (!pic) {
      for (const selector of picSelectors) {
        const img = $(selector);
        if (img.length > 0) {
          for (let i = 0; i < img.length; i++) {
            const item = img.eq(i);
            const imgUrl = item.attr("data-original") || item.attr("data-src") || item.attr("src");
            if (!isBadPic(imgUrl)) {
              pic = imgUrl;
              break;
            }
          }
          if (pic) break;
        }
      }
    }

    let desc = "";
    const descSelectors = ['h3:contains("剧情简介")', 'h3:contains("简介")', ".intro", ".description", ".desc"];
    for (const selector of descSelectors) {
      const descElem = $(selector);
      if (descElem.length > 0) {
        desc = selector.startsWith("h3")
          ? cleanText(descElem.first().parent().find("p").first().text())
          : cleanText(descElem.first().text());
        if (desc) break;
      }
    }

    let actor = getDetailField($, "主演");
    const actorSelectors = ['li:contains("主演")', 'span:contains("主演") + span'];
    for (const selector of actorSelectors) {
      if (actor) break;
      const actorElem = $(selector);
      if (actorElem.length > 0) {
        actor = actorElem
          .text()
          .trim()
          .replace(/主演[:：]?/g, "")
          .trim();
        if (actor) break;
      }
    }

    let director = getDetailField($, "导演");
    const directorSelectors = ['li:contains("导演")', 'span:contains("导演") + span'];
    for (const selector of directorSelectors) {
      if (director) break;
      const directorElem = $(selector);
      if (directorElem.length > 0) {
        director = directorElem
          .text()
          .trim()
          .replace(/导演[:：]?/g, "")
          .trim();
        if (director) break;
      }
    }

    const playSources = parsePlaySources($, detailVodId);

    let scrapeData = null;
    let videoMappings = [];
    let scrapeType = "";
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
        const videoIdForScrape = String(detailVodId || videoId || "");
        const scrapingResult = await OmniBox.processScraping(videoIdForScrape, title || "", title || "", scrapeCandidates);
        OmniBox.log("info", `[两个BT-DEBUG] 刮削处理完成,结果: ${JSON.stringify(scrapingResult || {}).substring(0, 200)}`);

        const metadata = await OmniBox.getScrapeMetadata(videoIdForScrape);
        scrapeData = metadata?.scrapeData || null;
        videoMappings = metadata?.videoMappings || [];
        scrapeType = metadata?.scrapeType || "";
        logInfo("刮削元数据读取完成", { hasScrapeData: !!scrapeData, mappingCount: videoMappings.length, scrapeType });
      } catch (e) {
        logError("刮削处理失败", e);
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
          OmniBox.log("info", `[两个BT-DEBUG] 应用刮削后源文件名: ${oldName} -> ${newName}`);
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

    logInfo("详情接口返回数据");

    return {
      list: [
        {
          vod_id: String(detailVodId || videoId),
          vod_name: scrapeData?.title || title || "未知标题",
          vod_pic: scrapeData?.posterPath ? `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}` : fixPicUrl(pic),
          vod_content: scrapeData?.overview || desc || "",
          vod_play_sources: normalizedPlaySources,
          vod_year: "",
          vod_area: "",
          vod_actor: (scrapeData?.credits?.cast || []).slice(0, 5).map((c) => c?.name).filter(Boolean).join(",") || actor || "",
          vod_director:
            (scrapeData?.credits?.crew || [])
              .filter((c) => c?.job === "Director" || c?.department === "Directing")
              .slice(0, 3)
              .map((c) => c?.name)
              .filter(Boolean)
              .join(",") ||
            director ||
            "",
          type_name: "",
        },
      ],
    };
  } catch (e) {
    logError("详情获取失败", e);
    return { list: [] };
  }
}

async function play(params) {
  const rawPlayId = params.playId;
  logInfo(`准备播放 ID: ${rawPlayId}`);

  try {
    let playUrl = rawPlayId;
    let playMeta = {};
    if (rawPlayId && rawPlayId.includes("|||")) {
      const [mainPlayId, metaB64] = rawPlayId.split("|||");
      playUrl = mainPlayId;
      playMeta = decodeMeta(metaB64 || "");
    }

    const legacyCandidate =
      playUrl &&
      !playUrl.includes("://") &&
      !playUrl.startsWith("/") &&
      !playUrl.startsWith("play/") &&
      !playUrl.startsWith("v_play/") &&
      /^[A-Za-z0-9+/=]{10,}$/.test(playUrl);
    let legacyDecoded = "";
    if (legacyCandidate) {
      try {
        legacyDecoded = Buffer.from(playUrl, "base64").toString("utf-8");
      } catch {
        legacyDecoded = "";
      }
    }
    const isLegacyPlayId = legacyCandidate && /(mv_|nm_|v_play)/.test(legacyDecoded);

    // 旧版是 Base64 播放 ID，新版是 /play/slug 页面。
    if (isLegacyPlayId) {
      logInfo(`解码播放ID: ${legacyDecoded}`);
      playUrl = `${host}/v_play/${playUrl}.html`;
    } else if (
      playUrl &&
      !playUrl.includes("://") &&
      !playUrl.startsWith("/") &&
      !playUrl.startsWith("play/") &&
      !playUrl.startsWith("v_play/") &&
      !playUrl.match(/\.(m3u8|mp4|flv|avi|mkv|ts)(?:\?|$)/i)
    ) {
      playUrl = `/play/${playUrl}`;
    }

    try {
      const videoIdFromParam = params.vodId ? String(params.vodId) : "";
      const videoIdFromMeta = playMeta?.sid ? String(playMeta.sid) : "";
      const videoIdForScrape = videoIdFromParam || videoIdFromMeta;
      if (videoIdForScrape) {
        await OmniBox.getScrapeMetadata(videoIdForScrape);
      }
    } catch (e) {
      logInfo(`读取刮削元数据失败: ${e.message}`);
    }

    // 确保URL格式正确
    if (playUrl && !playUrl.startsWith("http")) {
      playUrl = playUrl.startsWith("/") ? host + playUrl : host + "/" + playUrl;
    }

    logInfo(`处理后的播放URL: ${playUrl}`);

    // 检查是否是直接播放链接
    const isDirectPlayable = playUrl.match(/\.(m3u8|mp4|flv|avi|mkv|ts)/i);

    if (isDirectPlayable) {
      logInfo(`直接播放地址`);
      return {
        urls: [{ name: "默认线路", url: playUrl }],
        parse: 0,
        header: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Referer: host + "/",
          Origin: host,
        },
      };
    } else {
      logInfo(`需要解析的播放页`);
      const { url, header } = await OmniBox.sniffVideo(playUrl);
      // 返回播放页URL，让播放器解析
      return {
        urls: [{ name: "默认线路", url: url }],
        parse: 0,
        header: header,
      };
    }
  } catch (e) {
    logError("解析播放地址失败", e);
    // 错误时也构建完整URL
    const fallbackMain = String(rawPlayId || "").split("|||")[0];
    const fallbackUrl = fallbackMain.startsWith("/play/")
      ? host + fallbackMain
      : fallbackMain.startsWith("play/")
        ? host + "/" + fallbackMain
        : `${host}/v_play/${fallbackMain}.html`;
    return {
      urls: [{ name: "默认线路", url: fallbackUrl }],
      parse: 1,
      header: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Referer: host + "/",
        Origin: host,
      },
    };
  }
}

module.exports = { home, category, search, detail, play };

const runner = require("spider_runner");
runner.run(module.exports);

});

_load(3, "枝枝影视", function (module, exports, require) {
// @name 枝枝影视
// @description 页面解析：https://zzoc.cc，支持CF处理、首页、筛选分类、搜索、详情、多线路播放和嗅探兜底；依赖 axios
// @version 1.1.1
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/枝枝影视.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const axios = require("axios");
// ==================== CF 盾绕过配置 ====================
// 项目地址：https://github.com/FlareSolverr/FlareSolverr
// 优先读取站点专用变量，其次回退通用 FLARESOLVERR_URL；设置 ZHIZHI_CF_AUTO=0 可关闭自动处理。
const ZHIZHI_CF_COOKIE = process.env.ZHIZHI_CF_COOKIE || process.env.ZHIZHI_COOKIE || "";
const ZHIZHI_CF_AUTO = process.env.ZHIZHI_CF_AUTO !== "0";
const ZHIZHI_CF_CACHE_KEY = process.env.ZHIZHI_CF_CACHE_KEY || "zhizhi:cf_clearance";
const ZHIZHI_CF_MAX_AGE_SECONDS = parseInt(process.env.ZHIZHI_CF_MAX_AGE_SECONDS || "21600", 10) || 21600;
const ZHIZHI_CF_TIMEOUT_MS = parseInt(process.env.ZHIZHI_CF_TIMEOUT_MS || "45000", 10) || 45000;
const ZHIZHI_FLARESOLVERR_URL = process.env.ZHIZHI_FLARESOLVERR_URL || process.env.FLARESOLVERR_URL || "http://192.168.50.50:8191/v1";
const ZHIZHI_FLARESOLVERR_SESSION = process.env.ZHIZHI_FLARESOLVERR_SESSION || "";
const ZHIZHI_FLARESOLVERR_TIMEOUT_MS = parseInt(process.env.ZHIZHI_FLARESOLVERR_TIMEOUT_MS || String(ZHIZHI_CF_TIMEOUT_MS), 10) || ZHIZHI_CF_TIMEOUT_MS;
const ZHIZHI_CHROMIUM_BIN = process.env.ZHIZHI_CHROMIUM_BIN || "";
const ZHIZHI_BROWSER_DEBUGGING = process.env.ZHIZHI_BROWSER_DEBUGGING === "1";
let ZHIZHI_BROWSER_UA = text(process.env.ZHIZHI_BROWSER_UA || "");
const { promisify } = require("util");
const execFileAsync = promisify(require("child_process").execFile);

const HOST = String(process.env.ZHIZHI_HOST || "https://zzoc.cc").replace(/\/+$/, "");
const UA = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";
const HEADERS = {
  "User-Agent": UA,
  Referer: `${HOST}/`,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "same-origin",
  "Upgrade-Insecure-Requests": "1",
};
const CLASS_LIST = [
  { type_id: "1", type_name: "电影" },
  { type_id: "2", type_name: "电视剧" },
  { type_id: "3", type_name: "综艺" },
  { type_id: "4", type_name: "动漫" },
];
const FILTER_VALUES = [
  {
    key: "area",
    name: "地区",
    value: ["", "大陆", "香港", "台湾", "美国", "日本", "韩国"]
      .map((value) => ({ name: value || "全部", value })),
  },
  {
    key: "year",
    name: "年份",
    value: ["", "2026", "2025", "2024", "2023", "2022", "2021", "2020"]
      .map((value) => ({ name: value || "全部", value })),
  },
];
const FILTERS = Object.fromEntries(CLASS_LIST.map((item) => [item.type_id, FILTER_VALUES]));

module.exports = { home, category, search, detail, play };
runner.run(module.exports);

function getBodyText(response) {
  const body = response && typeof response === "object"
    ? ("body" in response ? response.body : ("data" in response ? response.data : response))
    : response;
  if (Buffer.isBuffer(body) || body instanceof Uint8Array) return body.toString();
  return String(body || "");
}

function cookiesFromSetCookie(values) {
  return (Array.isArray(values) ? values : [values])
    .map((item) => String(item || "").split(";")[0])
    .filter(Boolean);
}

function mergeCookies(current, incoming) {
  const map = new Map();
  const append = (value) => {
    String(value || "").split(/;\s*/).forEach((pair) => {
      const index = pair.indexOf("=");
      if (index <= 0) return;
      map.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
    });
  };
  append(current);
  append(incoming);
  return [...map.entries()].filter(([, value]) => value).map(([key, value]) => `${key}=${value}`).join("; ");
}

function text(value) {
  return String(value ?? "").trim();
}

function buildCookieHeader(cookie = "") {
  const value = text(cookie);
  return value ? { Cookie: value } : {};
}

function cookiesArrayToString(cookies = []) {
  return (Array.isArray(cookies) ? cookies : [])
    .map((item) => ({ name: text(item?.name || ""), value: text(item?.value || "") }))
    .filter((item) => item.name && item.value)
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");
}

async function getCachedCfCookie() {
  if (text(ZHIZHI_CF_COOKIE)) return text(ZHIZHI_CF_COOKIE);
  try {
    return text((await OmniBox.getCache(ZHIZHI_CF_CACHE_KEY)) || "");
  } catch (error) {
    OmniBox.log("warn", `[cf] 读取缓存失败: ${error.message}`);
    return "";
  }
}

async function setCachedCfCookie(cookie) {
  const value = text(cookie);
  if (!value || text(ZHIZHI_CF_COOKIE)) return;
  try {
    await OmniBox.setCache(ZHIZHI_CF_CACHE_KEY, value, ZHIZHI_CF_MAX_AGE_SECONDS);
  } catch (error) {
    OmniBox.log("warn", `[cf] 写入缓存失败: ${error.message}`);
  }
}

async function requestWithFlareSolverr(targetUrl) {
  const endpoint = text(ZHIZHI_FLARESOLVERR_URL);
  if (!endpoint) throw new Error("未配置 FlareSolverr 地址");
  const payload = {
    cmd: "request.get",
    url: targetUrl,
    maxTimeout: ZHIZHI_FLARESOLVERR_TIMEOUT_MS,
  };
  if (text(ZHIZHI_FLARESOLVERR_SESSION)) payload.session = text(ZHIZHI_FLARESOLVERR_SESSION);
  const res = await axios.post(endpoint, payload, {
    timeout: ZHIZHI_FLARESOLVERR_TIMEOUT_MS + 5000,
    headers: { "Content-Type": "application/json", "User-Agent": UA },
    validateStatus: () => true,
  });
  if (res.status !== 200 || !res.data || res.data.status !== "ok") {
    throw new Error(`FlareSolverr HTTP ${res.status}${res.data?.message ? `: ${res.data.message}` : ""}`);
  }
  const solution = res.data.solution || {};
  const cookies = Array.isArray(solution.cookies) ? solution.cookies : [];
  return {
    cookie: cookiesArrayToString(cookies),
    html: String(solution.response || ""),
    statusCode: Number(solution.status || 200),
    headers: solution.headers || {},
    userAgent: text(solution.userAgent || ""),
  };
}

async function fetchCfClearanceWithFlareSolverr(targetUrl = `${HOST}/`) {
  const solved = await requestWithFlareSolverr(targetUrl);
  if (!/cf_clearance=/.test(solved.cookie)) {
    throw new Error("FlareSolverr 未返回 cf_clearance");
  }
  return solved.cookie;
}

async function fetchCfClearanceWithBrowser(targetUrl = `${HOST}/`) {
  const script = String.raw`
const { execFile } = require("child_process");
const { promisify } = require("util");
const http = require("http");
const fs = require("fs");
const execFileAsync = promisify(execFile);
const BASE_URL = process.env.ZHIZHI_HOST;
const USER_AGENT = process.env.ZHIZHI_BROWSER_USER_AGENT;
const timeoutMs = Number(process.env.ZHIZHI_CF_TIMEOUT_MS || 45000);

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch (error) { reject(error); }
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

async function waitForCfCookie(wsUrl, baseUrl, deadline) {
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
  const host = new URL(baseUrl).hostname;
  try {
    while (Date.now() < deadline) {
      const cookies = (await send("Storage.getCookies", {})).result?.cookies || [];
      const hit = cookies.find((item) => item.name === "cf_clearance" && String(item.domain || "").includes(host));
      if (hit && hit.value) return "cf_clearance=" + hit.value;
      await delay(1200);
    }
    throw new Error("未在时限内获取到 cf_clearance");
  } finally {
    ws.close();
  }
}

(async () => {
  const port = 9400 + Math.floor(Math.random() * 200);
  const profile = (await execFileAsync("mktemp", ["-d", "/tmp/zhizhi-cf-XXXXXX"])).stdout.trim();
  const candidates = process.env.ZHIZHI_CHROMIUM_BIN
    ? [process.env.ZHIZHI_CHROMIUM_BIN]
    : ["/snap/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/chromium"];
  const bin = candidates.find((item) => item && fs.existsSync(item));
  if (!bin) throw new Error("未找到 Chromium，可设置 ZHIZHI_CHROMIUM_BIN");
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--user-data-dir=" + profile,
    "--remote-debugging-port=" + port,
    "--user-agent=" + USER_AGENT,
    BASE_URL + "/"
  ];
  if (process.env.ZHIZHI_BROWSER_DEBUGGING === "1") args.push("--remote-allow-origins=*");
  const child = execFile(bin, args, { stdio: "ignore" });
  try {
    const deadline = Date.now() + timeoutMs;
    const version = await waitForDebugger(port, deadline);
    process.stdout.write(await waitForCfCookie(version.webSocketDebuggerUrl, BASE_URL, deadline));
  } finally {
    try { child.kill("SIGKILL"); } catch (_) {}
  }
})().catch((error) => {
  console.error(error && error.message ? error.message : String(error));
  process.exit(1);
});`;

  const { stdout, stderr } = await execFileAsync(process.execPath, ["-e", script], {
    timeout: ZHIZHI_CF_TIMEOUT_MS + 5000,
    env: {
      ...process.env,
      ZHIZHI_HOST: HOST,
      ZHIZHI_BROWSER_USER_AGENT: ZHIZHI_BROWSER_UA || UA,
      ZHIZHI_CF_TIMEOUT_MS: String(ZHIZHI_CF_TIMEOUT_MS),
      ZHIZHI_CHROMIUM_BIN: ZHIZHI_CHROMIUM_BIN,
      ZHIZHI_BROWSER_DEBUGGING: ZHIZHI_BROWSER_DEBUGGING ? "1" : "0",
    },
    maxBuffer: 1024 * 1024,
  });
  const cookie = text(stdout);
  if (!/^cf_clearance=/.test(cookie)) {
    throw new Error(text(stderr) || "未获取到 cf_clearance");
  }
  return cookie;
}

async function ensureCfCookie(forceRefresh = false, targetUrl = `${HOST}/`) {
  if (text(ZHIZHI_CF_COOKIE)) return text(ZHIZHI_CF_COOKIE);
  if (!forceRefresh) {
    const cached = await getCachedCfCookie();
    if (cached) return cached;
  }
  if (!ZHIZHI_CF_AUTO) return "";
  let cookie = "";
  try {
    OmniBox.log("info", `[cf] 开始通过 FlareSolverr 自动获取 cf_clearance`);
    cookie = await fetchCfClearanceWithFlareSolverr(targetUrl);
  } catch (error) {
    OmniBox.log("warn", `[cf] FlareSolverr 获取失败，回退 headless Chromium: ${error.message}`);
    cookie = await fetchCfClearanceWithBrowser(targetUrl);
  }
  if (cookie) {
    await setCachedCfCookie(cookie);
    OmniBox.log("info", `[cf] 已自动获取 cf_clearance，长度=${cookie.length}`);
  }
  return cookie;
}

function isBlockedHtml(body = "") {
  const lower = String(body || "").toLowerCase();
  return lower.includes("just a moment")
    || lower.includes("cf-browser-verification")
    || lower.includes("cf_chl_opt")
    || lower.includes("enable javascript and cookies to continue")
    || (lower.includes("captcha") && !lower.includes('name="cf-turnstile-response"'));
}

async function requestText(url, options = {}) {
  const referer = options.referer || options.headers?.Referer || `${HOST}/`;
  const cookie = await getCachedCfCookie();
  const headers = {
    ...HEADERS,
    ...(options.headers || {}),
    Referer: referer,
    ...buildCookieHeader(cookie),
  };
  const response = await OmniBox.request(url, {
    method: options.method || "GET",
    headers,
    timeout: options.timeout || 30000,
    body: options.body,
  });
  const statusCode = Number(response?.statusCode || 200);
  const body = getBodyText(response);
  if (statusCode >= 200 && statusCode < 400 && body && !isBlockedHtml(body)) return body;
  if (!ZHIZHI_CF_AUTO) throw new Error(`HTTP ${statusCode || "unknown"} @ ${url}`);

  OmniBox.log("warn", `[cf] ${url} 被CF盾拦截，尝试自动处理`);
  const solved = await requestWithFlareSolverr(url).catch(() => null);
  let solvedCookie = solved?.cookie || "";
  if (!solvedCookie && solved?.statusCode >= 200 && solved?.statusCode < 400 && solved?.html && !isBlockedHtml(solved.html)) {
    solvedCookie = mergeCookies(solvedCookie, cookiesFromSetCookie(solved.headers?.["set-cookie"]));
  }
  let solvedHtml = solved?.html || "";
  if ((!solvedHtml || isBlockedHtml(solvedHtml)) && ZHIZHI_FLARESOLVERR_URL) {
    OmniBox.log("warn", `[cf] FlareSolverr 结果无效，尝试刷新 cf_clearance`);
    const refreshed = await ensureCfCookie(true, url).catch(() => "");
    solvedCookie = refreshed;
    solvedHtml = "";
  }
  if (!solvedHtml && ZHIZHI_FLARESOLVERR_URL) {
    const retry = await requestWithFlareSolverr(url).catch(() => null);
    if (retry?.html && !isBlockedHtml(retry.html)) {
      solvedCookie = retry.cookie || solvedCookie;
      solvedHtml = retry.html;
    }
  }
  if (!solvedHtml && !ZHIZHI_FLARESOLVERR_URL) {
    const refreshed = await ensureCfCookie(true, url).catch(() => "");
    if (refreshed) {
      const retryResponse = await OmniBox.request(url, {
        method: options.method || "GET",
        headers: { ...headers, ...buildCookieHeader(refreshed) },
        timeout: options.timeout || 30000,
        body: options.body,
      });
      const retryStatus = Number(retryResponse?.statusCode || 200);
      const retryBody = getBodyText(retryResponse);
      if (retryStatus >= 200 && retryStatus < 400 && retryBody && !isBlockedHtml(retryBody)) {
        solvedCookie = refreshed;
        solvedHtml = retryBody;
      }
    }
  }
  if (solvedCookie) {
    await setCachedCfCookie(solvedCookie);
    const solvedUa = text(solved?.userAgent || "");
    if (solvedUa && !text(ZHIZHI_BROWSER_UA)) ZHIZHI_BROWSER_UA = solvedUa;
  }
  if (solvedHtml && !isBlockedHtml(solvedHtml)) return solvedHtml;
  throw new Error(`Cloudflare challenge unresolved @ ${url}`);
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
  let value = decodeHtml(String(url || "").trim()).replace(/^['"]|['"]$/g, "").replace(/\\\//g, "/");
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

function parseCards(html) {
  const parts = String(html || "").split(/<div\s+class=["']myui-vodbox-content["']>/i);
  const videos = [];
  const seen = new Set();

  for (const part of parts.slice(1)) {
    const idMatch = part.match(/href=["']\/voddetail\/(\d+)\.html["']/i);
    if (!idMatch || seen.has(idMatch[1])) continue;
    const videoId = idMatch[1];
    const block = part.slice(0, 5000);
    let name = cleanText((block.match(/\balt=["']([^"']+)["']/i) || [])[1] || "");
    if (!name) name = cleanText((block.match(/<div[^>]*class=["']title["'][^>]*>([\s\S]*?)<\/div>/i) || [])[1] || "");
    if (!name) continue;

    let pic = String((block.match(/<img\b[^>]*src=["']([^"']+)["']/i) || [])[1] || "");
    if (/load\.gif/i.test(pic)) {
      pic = String((block.match(/<!--\s*<img\b[^>]*src=["']([^"']+)["']/i) || [])[1] || pic);
    }
    const remarkMatch = block.match(/<div[^>]*class=["'][^"']*tag[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
      || block.match(/<div[^>]*class=["']score["'][^>]*>([\s\S]*?)<\/div>/i);

    seen.add(videoId);
    videos.push({
      vod_id: videoId,
      vod_name: name,
      vod_pic: absUrl(pic),
      vod_remarks: cleanText(remarkMatch ? remarkMatch[1] : ""),
    });
  }
  return videos;
}

function parsePageCount(html, currentPage) {
  const values = [];
  const patterns = [
    /\/vodshow\/\d+-[^"']*?(\d+)---\.html/gi,
    /\/vodsearch\/[^"']*?----------(\d+)---\.html/gi,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(String(html || ""))) !== null) values.push(Number(match[1]) || 0);
  }
  return values.length ? Math.max(...values) : (currentPage + 1);
}

function normalizeFilters(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}

function extractMeta(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(html || "").match(new RegExp(`<meta[^>]*property=["']${escaped}["'][^>]*content=["']([^"']*)["']`, "i"))
    || String(html || "").match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${escaped}["']`, "i"));
  return cleanText(match ? match[1] : "");
}

function extractField(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(html || "").match(new RegExp(`${escaped}\\s*[：:]\\s*([\\s\\S]*?)(?:<\\/div>|<\\/li>)`, "i"));
  return cleanText(match ? match[1] : "");
}

function extractNestedField(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(html || "").match(
    new RegExp(`<div[^>]*>[\\s\\S]*?<div[^>]*class=["']name["'][^>]*>\\s*${escaped}\\s*[：:]\\s*<\\/div>([\\s\\S]*?)<\\/div>`, "i"),
  );
  return cleanText(match ? match[1] : "");
}

function findPlaylistBlock(html, playlistId) {
  const text = String(html || "");
  const startMatch = text.match(new RegExp(`<div\\s+id=["']playlist${playlistId}["'][^>]*>`, "i"));
  if (!startMatch) return "";
  const start = startMatch.index;
  const rest = text.slice(start + startMatch[0].length);
  const next = rest.search(/<div\s+id=["']playlist\d+["']/i);
  return next >= 0 ? text.slice(start, start + startMatch[0].length + next) : text.slice(start, start + 20000);
}

function parsePlaySources(html) {
  const sources = [];
  const tabRegex = /<li[^>]*class=["'][^"']*player_name[^"']*["'][^>]*>[\s\S]*?<a[^>]*href=["']#playlist(\d+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = tabRegex.exec(String(html || ""))) !== null) {
    const playlistId = match[1];
    const name = cleanText(match[2]) || `线路${playlistId}`;
    const block = findPlaylistBlock(html, playlistId);
    const episodes = [];
    const episodeRegex = /<a\b[^>]*href=["']([^"']*\/vodplay\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let episodeMatch;
    while ((episodeMatch = episodeRegex.exec(block)) !== null) {
      const episodeName = cleanText(episodeMatch[2]) || "播放";
      const playId = absUrl(episodeMatch[1]);
      if (playId) episodes.push({ name: episodeName, playId });
    }
    if (episodes.length) sources.push({ name, episodes });
  }
  return sources;
}

function decodePlayerUrl(value, encrypt) {
  const raw = String(value || "").replace(/\\\//g, "/");
  if (!raw) return "";
  try {
    if (String(encrypt) === "2") return decodeURIComponent(Buffer.from(raw, "base64").toString("utf8"));
    if (String(encrypt) === "1") {
      const decoded = decodeURIComponent(raw);
      if (decoded !== raw || /^https?:\/\//i.test(decoded)) return decoded;
      if (/^[A-Za-z0-9+/=]+$/.test(raw)) return Buffer.from(raw, "base64").toString("utf8");
    }
  } catch (_) {}
  return raw;
}

function isDirectMedia(url) {
  return /\.(?:m3u8|mp4|flv|mkv|avi)(?:$|[?#])/i.test(String(url || ""));
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

function directPlayResult(url, referer, name = "播放", extras = {}) {
  const header = { "User-Agent": UA, Referer: referer || `${HOST}/` };
  return { parse: 0, jx: 0, url, urls: [{ name, url }], header, headers: header, ...extras };
}

function browserSniffResult(url, referer, name = "播放页") {
  const header = { "User-Agent": UA, Referer: referer || `${HOST}/` };
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
        await OmniBox.log("info", `[枝枝影视][play] 服务端嗅探成功 urls=${urls.length}`);
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
      await OmniBox.log("warn", "[枝枝影视][play] 服务端嗅探无结果，转浏览器嗅探");
    } catch (error) {
      await OmniBox.log("warn", `[枝枝影视][play] 服务端嗅探失败，转浏览器嗅探: ${error.message}`);
    }
  }
  return browserSniffResult(targetUrl, referer, name);
}

async function resolveM3u8Child(url, referer) {
  try {
    const text = await requestText(url, { referer, timeout: 20000 });
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
  const results = await Promise.allSettled(CLASS_LIST.map((item) => requestText(`${HOST}/vodshow/${item.type_id}-----------.html`, { timeout: 30000 })));
  const list = [];
  const seen = new Set();
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const video of parseCards(result.value)) {
      if (seen.has(video.vod_id)) continue;
      seen.add(video.vod_id);
      list.push(video);
    }
  }
  if (!list.length) {
    try {
      for (const video of parseCards(await requestText(`${HOST}/`))) {
        if (seen.has(video.vod_id)) continue;
        seen.add(video.vod_id);
        list.push(video);
      }
    } catch (error) {
      await OmniBox.log("error", `[枝枝影视][home] ${error.message}`);
    }
  }
  return { class: CLASS_LIST, filters: FILTERS, list: list.slice(0, 72) };
}

async function category(params) {
  const page = Math.max(1, parseInt(params.page || 1, 10));
  try {
    const categoryId = String(params.categoryId || params.type_id || "1").trim() || "1";
    const filters = normalizeFilters(params.extend || params.filters || params.ext);
    const area = String(filters.area || "").trim();
    const year = String(filters.year || "").trim();
    let url;
    if (area || year) {
      url = `${HOST}/vodshow/${categoryId}-${encodeURIComponent(area)}-------${page}---${encodeURIComponent(year)}.html`;
    } else {
      url = page === 1
        ? `${HOST}/vodshow/${categoryId}-----------.html`
        : `${HOST}/vodshow/${categoryId}--------${page}---.html`;
    }
    const html = await requestText(url);
    const list = parseCards(html);
    return { page, pagecount: parsePageCount(html, page), limit: list.length || 20, total: 999999, list };
  } catch (error) {
    await OmniBox.log("error", `[枝枝影视][category] ${error.message}`);
    return { page, pagecount: 0, limit: 0, total: 0, list: [] };
  }
}

async function detail(params) {
  try {
    const input = String(params.videoId || params.id || params.categoryId || "").trim();
    const idMatch = input.match(/\/voddetail\/(\d+)\.html/i) || input.match(/^(\d+)$/);
    const videoId = idMatch ? idMatch[1] : "";
    if (!videoId) return { list: [] };
    const html = await requestText(`${HOST}/voddetail/${videoId}.html`);
    let name = extractMeta(html, "og:title").replace(/-高清.*$/u, "").trim();
    if (!name) name = cleanText((html.match(/<title>([\s\S]*?)-/i) || [])[1] || "");
    let content = extractMeta(html, "og:description");
    if (content.includes("剧情介绍：")) content = content.split("剧情介绍：", 2)[1];
    const yearMatch = html.match(/<div[^>]*class=["']right["'][^>]*>\s*(\d{4})\s*<\/div>/i);
    const remarkMatch = html.match(/<div[^>]*class=["'][^"']*tag[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

    return {
      list: [{
        vod_id: videoId,
        vod_name: name,
        vod_pic: absUrl(extractMeta(html, "og:image")),
        type_name: "",
        vod_year: yearMatch ? yearMatch[1] : "",
        vod_area: extractField(html, "地区"),
        vod_remarks: cleanText(remarkMatch ? remarkMatch[1] : ""),
        vod_actor: extractNestedField(html, "主演") || extractField(html, "主演"),
        vod_director: extractNestedField(html, "导演") || extractField(html, "导演"),
        vod_content: content || "暂无简介",
        vod_play_sources: parsePlaySources(html),
      }],
    };
  } catch (error) {
    await OmniBox.log("error", `[枝枝影视][detail] ${error.message}`);
    return { list: [] };
  }
}

async function search(params) {
  const page = Math.max(1, parseInt(params.page || 1, 10));
  try {
    const keyword = String(params.keyword || params.wd || params.key || "").trim();
    if (!keyword) return { page, pagecount: 0, total: 0, list: [] };
    const encoded = encodeURIComponent(keyword);
    const url = page === 1
      ? `${HOST}/vodsearch/${encoded}-------------.html`
      : `${HOST}/vodsearch/${encoded}----------${page}---.html`;
    const html = await requestText(url, { timeout: 60000 });
    const list = parseCards(html);
    return { page, pagecount: parsePageCount(html, page), limit: list.length || 20, total: 999999, list };
  } catch (error) {
    await OmniBox.log("error", `[枝枝影视][search] ${error.message}`);
    return { page, pagecount: 0, limit: 0, total: 0, list: [] };
  }
}

async function play(params) {
  const input = String(params.playId || params.id || params.url || params.input || "").trim();
  if (!input) return { parse: 0, jx: 0, url: "", urls: [], header: {}, headers: {} };
  const flag = String(params.flag || "");
  if (isDirectMedia(input)) return directPlayResult(absUrl(input), `${HOST}/`, flag || "播放");
  const playUrl = absUrl(input);

  let html = "";
  try {
    html = await requestText(playUrl, { referer: `${HOST}/`, timeout: 30000 });
  } catch (error) {
    await OmniBox.log("warn", `[枝枝影视][play] 播放页请求失败，尝试嗅探: ${error.message}`);
    return await serverSniffOrBrowserFallback(playUrl, playUrl, flag || "枝枝播放");
  }

  let realUrl = "";
  let jxFrom = "";
  const playerMatch = html.match(/var\s+player_[a-zA-Z0-9_$]+\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/i)
    || html.match(/var\s+player_[a-zA-Z0-9_$]+\s*=\s*(\{[\s\S]*?\})\s*;/i);
  if (playerMatch) {
    try {
      const data = JSON.parse(playerMatch[1]);
      realUrl = decodePlayerUrl(data.url, data.encrypt);
      jxFrom = String(data.from || "");
    } catch (error) {
      await OmniBox.log("warn", `[枝枝影视][play] player 数据解析失败: ${error.message}`);
    }
  }

  let sniffTarget = playUrl;
  if (!realUrl) {
    const iframeMatch = html.match(/<iframe\b[^>]*src=["']([^"']+)["']/i);
    if (iframeMatch) {
      const iframeUrl = absUrl(iframeMatch[1], playUrl);
      sniffTarget = iframeUrl || playUrl;
      try {
        const iframeHtml = await requestText(iframeUrl, { referer: playUrl, timeout: 30000 });
        realUrl = String((iframeHtml.match(/["']url["']\s*:\s*["']([^"']+)["']/i) || [])[1] || "").replace(/\\\//g, "/");
        if (!realUrl) {
          realUrl = String((iframeHtml.match(/src=["']([^"']+\.(?:m3u8|mp4|flv)(?:\?[^"']*)?)["']/i) || [])[1] || "");
        }
      } catch (error) {
        await OmniBox.log("warn", `[枝枝影视][play] iframe 解析失败: ${error.message}`);
      }
    }
  }

  if (!realUrl) {
    const directMatch = html.match(/["'](https?:\/\/[^"']+\.(?:m3u8|mp4|flv|mkv|avi)(?:\?[^"']*)?)["']/i);
    realUrl = directMatch ? directMatch[1].replace(/\\\//g, "/") : "";
  }

  if (isDirectMedia(realUrl)) {
    const mediaUrl = /\.m3u8(?:$|[?#])/i.test(realUrl) ? await resolveM3u8Child(realUrl, playUrl) : realUrl;
    return directPlayResult(mediaUrl, playUrl, flag || "播放", jxFrom ? { jxFrom } : {});
  }
  if (realUrl) return await serverSniffOrBrowserFallback(absUrl(realUrl, playUrl), playUrl, flag || "枝枝播放");
  return await serverSniffOrBrowserFallback(sniffTarget, playUrl, flag || "枝枝播放");
}

});

_load(4, "枫叶", function (module, exports, require) {
// @name 枫叶
// @author 梦
// @description 影视站：支持首页、分类、详情、搜索与播放，补齐刮削、弹幕与播放记录，基于 https://www.budaichuchen.net
// @dependencies cheerio
// @version 1.2.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/枫叶.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const cheerio = require("cheerio");
const https = require("https");
const http = require("http");

const BASE_URL = "https://www.budaichuchen.net";
const UA = "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36";
const PAGE_LIMIT = 20;
const LIST_CACHE_TTL = Number(process.env.FENGYE_LIST_CACHE_TTL || 900);
const DETAIL_CACHE_TTL = Number(process.env.FENGYE_DETAIL_CACHE_TTL || 1800);
const SEARCH_CACHE_TTL = Number(process.env.FENGYE_SEARCH_CACHE_TTL || 600);

function encodeMeta(meta = {}) {
  try {
    return Buffer.from(JSON.stringify(meta), "utf8").toString("base64url");
  } catch (_) {
    return "";
  }
}

function decodeMeta(encoded = "") {
  try {
    if (!encoded) return {};
    return JSON.parse(Buffer.from(String(encoded), "base64url").toString("utf8"));
  } catch (_) {
    return {};
  }
}

function buildScrapedEpisodeName(scrapeData, mapping, originalName) {
  if (!mapping || mapping.episodeNumber === 0 || (mapping.confidence && mapping.confidence < 0.5)) {
    return originalName;
  }
  if (mapping.episodeName) {
    return `${mapping.episodeNumber}.${mapping.episodeName}`;
  }
  if (scrapeData && Array.isArray(scrapeData.episodes)) {
    const hit = scrapeData.episodes.find(
      (ep) => ep.episodeNumber === mapping.episodeNumber && ep.seasonNumber === mapping.seasonNumber,
    );
    if (hit?.name) {
      return `${hit.episodeNumber}.${hit.name}`;
    }
  }
  return originalName;
}

function preprocessTitle(title) {
  if (!title) return "";
  return String(title)
    .replace(/4[kK]|[xX]26[45]|720[pP]|1080[pP]|2160[pP]/g, " ")
    .replace(/[hH]\.?26[45]/g, " ")
    .replace(/BluRay|WEB-DL|HDR|REMUX/gi, " ")
    .replace(/\.mp4|\.mkv|\.avi|\.flv/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  const processed = preprocessTitle(title);
  const cnMatch = processed.match(/第\s*([零一二三四五六七八九十0-9]+)\s*[集话章节回期]/);
  if (cnMatch) return String(chineseToArabic(cnMatch[1]));
  const seMatch = processed.match(/[Ss](?:\d{1,2})?[-._\s]*[Ee](\d{1,3})/i);
  if (seMatch) return seMatch[1];
  const epMatch = processed.match(/\b(?:EP|E)[-._\s]*(\d{1,3})\b/i);
  if (epMatch) return epMatch[1];
  const bracketMatch = processed.match(/[\[\(【(](\d{1,3})[\]\)】)]/);
  if (bracketMatch) {
    const num = bracketMatch[1];
    if (!["720", "1080", "480"].includes(num)) return num;
  }
  return "";
}

function buildFileNameForDanmu(vodName, episodeTitle) {
  if (!vodName) return "";
  if (!episodeTitle || episodeTitle === "正片" || episodeTitle === "播放") return vodName;
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
  if (!scrapeData) return buildFileNameForDanmu(fallbackVodName, fallbackEpisodeName);
  if (scrapeType === "movie") {
    return scrapeData.title || fallbackVodName;
  }
  const title = scrapeData.title || fallbackVodName;
  const seasonAirYear = scrapeData.seasonAirYear || "";
  const seasonNumber = mapping?.seasonNumber || 1;
  const episodeNumber = mapping?.episodeNumber || 1;
  return `${title}.${seasonAirYear}.S${String(seasonNumber).padStart(2, "0")}E${String(episodeNumber).padStart(2, "0")}`;
}

function buildHistoryEpisode(playId, episodeNumber, episodeName) {
  if (episodeNumber !== undefined && episodeNumber !== null && episodeNumber !== "") {
    if (episodeName) return `第${episodeNumber}集 ${episodeName}`;
    return `第${episodeNumber}集`;
  }
  return episodeName || playId || "播放";
}

const CATEGORY_CONFIG = [
  { id: "1", name: "电影" },
  { id: "2", name: "电视剧" },
  { id: "3", name: "综艺" },
  { id: "4", name: "动漫" },
  { id: "5", name: "短剧" },
];

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

async function requestText(url, options = {}, redirectCount = 0) {
  await OmniBox.log("info", `[枫叶][request] ${options.method || "GET"} ${url}`);
  const res = await OmniBox.request(url, {
    method: options.method || "GET",
    headers: {
      "User-Agent": UA,
      Referer: BASE_URL + "/",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      ...(options.headers || {}),
    },
    body: options.body,
    timeout: options.timeout || 20000,
  });
  const statusCode = Number(res?.statusCode || 0);
  if ([301, 302, 303, 307, 308].includes(statusCode) && redirectCount < 5) {
    const location = res?.headers?.location || res?.headers?.Location || res?.headers?.LOCATION;
    if (location) return requestText(absoluteUrl(location), options, redirectCount + 1);
  }
  if (!res || statusCode !== 200) {
    throw new Error(`HTTP ${res?.statusCode || "unknown"} @ ${url}`);
  }
  return String(res.body || "");
}

async function requestTextNative(url, options = {}) {
  await OmniBox.log("info", `[枫叶][native-request] ${options.method || "GET"} ${url}`);
  return new Promise((resolve, reject) => {
    const requestUrl = new URL(url);
    const body = options.body == null ? "" : String(options.body);
    const headers = {
      "User-Agent": UA,
      Referer: BASE_URL + "/",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      ...(options.headers || {}),
    };
    if (body && headers["Content-Length"] == null && headers["content-length"] == null) {
      headers["Content-Length"] = Buffer.byteLength(body);
    }
    const transport = requestUrl.protocol === "http:" ? http : https;
    const req = transport.request({
      protocol: requestUrl.protocol,
      hostname: requestUrl.hostname,
      port: requestUrl.port || (requestUrl.protocol === "http:" ? 80 : 443),
      path: `${requestUrl.pathname}${requestUrl.search}`,
      method: options.method || "GET",
      headers,
      timeout: options.timeout || 20000,
    }, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        const statusCode = Number(res.statusCode || 0);
        if (statusCode !== 200) {
          reject(new Error(`HTTP ${statusCode} @ ${url}`));
          return;
        }
        resolve(String(data || ""));
      });
    });
    req.on("timeout", () => {
      req.destroy(new Error(`timeout @ ${url}`));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
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
  return String(value || "").replace(/\s+/g, " ").trim();
}

function categoryNameById(categoryId) {
  return CATEGORY_CONFIG.find((item) => item.id === String(categoryId))?.name || "影视";
}

function extractVodId(href) {
  const match = String(href || "").match(/detail\/(.*?)\.html/i);
  return match?.[1] || "";
}

function extractPlayId(href) {
  const match = String(href || "").match(/play\/(.*?)\.html/i);
  return match?.[1] || "";
}

function buildVodCard($, el) {
  const box = $(el);
  const a = box.find(".public-list-exp").first();
  const href = a.attr("href") || "";
  const vodId = extractVodId(href);
  if (!vodId) return null;
  const pic = box.find("img").first().attr("data-src") || box.find("img").first().attr("src") || "";
  return {
    vod_id: vodId,
    vod_name: normalizeText(a.attr("title") || ""),
    vod_pic: absoluteUrl(pic),
    vod_remarks: normalizeText(box.find(".public-list-prb").first().text()),
  };
}

function parseHomeList(htmlText) {
  const $ = cheerio.load(htmlText);
  const list = [];
  const seen = new Set();
  $(".public-list-box").each((_, el) => {
    const item = buildVodCard($, el);
    if (!item?.vod_id || seen.has(item.vod_id)) return;
    seen.add(item.vod_id);
    list.push(item);
  });
  return list;
}

function parseSearchList(htmlText) {
  const $ = cheerio.load(htmlText);
  const list = [];
  const seen = new Set();
  $(".search-box").each((_, el) => {
    const box = $(el);
    const a = box.find(".public-list-exp").first();
    const href = a.attr("href") || "";
    const vodId = extractVodId(href);
    if (!vodId || seen.has(vodId)) return;
    seen.add(vodId);
    const pic = a.find("img").first().attr("data-src") || a.find("img").first().attr("src") || "";
    list.push({
      vod_id: vodId,
      vod_name: normalizeText(box.find(".thumb-txt a").first().text()),
      vod_pic: absoluteUrl(pic),
      vod_remarks: normalizeText(a.find(".public-list-prb").first().text()),
    });
  });
  return list;
}

function parseDetail(htmlText, videoId) {
  const $ = cheerio.load(htmlText);
  const vodName = normalizeText($(".slide-info-title").first().text());
  const vodPic = absoluteUrl($(".detail-pic img").first().attr("data-src") || $(".detail-pic img").first().attr("src") || "");
  const vodContent = normalizeText($("#height_limit").first().text());

  const sourceNames = [];
  $(".anthology-tab a").each((_, el) => {
    const name = normalizeText($(el).text()).replace(/\s/g, "").replace(/\(\d+\)/g, "");
    if (name) sourceNames.push(name);
  });

  const playSources = [];
  $(".anthology-list-box").each((idx, el) => {
    const lineName = sourceNames[idx] || `线路${idx + 1}`;
    const episodes = [];
    $(el).find("ul li a").each((epIdx, a) => {
      const name = normalizeText($(a).text()) || `第${epIdx + 1}集`;
      const rawPlayId = extractPlayId($(a).attr("href") || "");
      if (!rawPlayId) return;
      const fid = `${videoId}#${lineName}#${epIdx}`;
      const meta = {
        sid: String(videoId || ""),
        fid,
        v: vodName || "",
        e: name,
        t: lineName,
        i: epIdx,
      };
      episodes.push({ name, playId: `${rawPlayId}|||${encodeMeta(meta)}`, _fid: fid, _rawName: name });
    });
    episodes.reverse();
    if (episodes.length) {
      playSources.push({ name: lineName, episodes });
    }
  });

  if (!playSources.length) {
    const episodes = [];
    $(".anthology-list-play a").each((epIdx, a) => {
      const name = normalizeText($(a).attr("title") || $(a).text()) || `第${epIdx + 1}集`;
      const rawPlayId = extractPlayId($(a).attr("href") || "");
      if (!rawPlayId) return;
      const fid = `${videoId}#播放列表#${epIdx}`;
      const meta = {
        sid: String(videoId || ""),
        fid,
        v: vodName || "",
        e: name,
        t: "播放列表",
        i: epIdx,
      };
      episodes.push({ name, playId: `${rawPlayId}|||${encodeMeta(meta)}`, _fid: fid, _rawName: name });
    });
    if (episodes.length) {
      playSources.push({ name: "播放列表", episodes });
    }
  }

  const normalizedPlaySources = playSources.map((source) => ({
    name: source.name,
    episodes: (source.episodes || []).map((ep) => ({ name: ep.name, playId: ep.playId })),
  }));

  return {
    list: [{
      vod_id: String(videoId || ""),
      vod_name: vodName,
      vod_pic: vodPic,
      vod_content: vodContent,
      vod_play_sources: normalizedPlaySources,
    }],
    _play_sources_for_scrape: playSources,
  };
}

async function parsePlayPage(playUrl, html) {
  try {
    const playerMatch = html.match(/player_.*?=([^]*?)</);
    if (playerMatch?.[1]) {
      try {
        const config = JSON.parse(playerMatch[1]);
        const rawUrl = String(config.url || "");
        const from = String(config.from || "").toUpperCase();

        if (rawUrl.startsWith("http") && (rawUrl.includes(".m3u8") || rawUrl.includes(".mp4"))) {
          await OmniBox.log("info", `[枫叶][play] player config direct url=${rawUrl}`);
          return rawUrl;
        }

        if (from.includes("JD") || rawUrl.startsWith("JD-")) {
          const jxHost = "https://fgsrg.hzqingshan.com";
          const playPageUrl = `${jxHost}/player/?url=${encodeURIComponent(rawUrl)}`;
          const playPageHtml = await requestTextNative(playPageUrl, {
            headers: {
              Referer: playUrl,
              Origin: BASE_URL,
            },
          });
          const tokenMatch = playPageHtml.match(/data-te="([^"]+)"/);
          const token = tokenMatch?.[1] || "";
          if (token) {
            const params = new URLSearchParams();
            params.set("url", rawUrl);
            params.set("token", token);
            const apiRaw = await requestTextNative(`${jxHost}/player/mplayer.php`, {
              method: "POST",
              headers: {
                Accept: "application/json, text/javascript, */*; q=0.01",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "X-Requested-With": "XMLHttpRequest",
                Origin: jxHost,
                Referer: playPageUrl,
              },
              body: params.toString(),
            });
            const apiJson = JSON.parse(apiRaw || "{}");
            if (Number(apiJson.code) === 200 && apiJson.url) {
              await OmniBox.log("info", `[枫叶][play] JD parse success url=${apiJson.url}`);
              return String(apiJson.url);
            }
          }
        }
      } catch (e) {
        await OmniBox.log("warn", `[枫叶][play] parse player config failed: ${e.message}`);
      }
    }

    const m3u8Patterns = [
      /['"]((?:https?:)?\/\/[^'"]+\.m3u8[^'"]*)['"]/gi,
      /var\s+url\s*=\s*['"]([^'"]+)['"]/i,
      /url\s*:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/i,
    ];

    for (const pattern of m3u8Patterns) {
      const matches = html.match(pattern);
      if (!matches) continue;
      for (const match of matches) {
        const urlMatch = match.match(/['"]?(https?:\/\/[^'"]+\.(?:m3u8|mp4)[^'"]*)['"]?/i);
        if (urlMatch?.[1]) {
          let realUrl = urlMatch[1];
          if (realUrl.startsWith("//")) realUrl = `https:${realUrl}`;
          await OmniBox.log("info", `[枫叶][play] regex found url=${realUrl}`);
          return realUrl;
        }
      }
    }
    return "";
  } catch (error) {
    await OmniBox.log("warn", `[枫叶][play] parse play page failed: ${error.message}`);
    return "";
  }
}

async function home() {
  try {
    const html = await getCachedText("fengye:home", LIST_CACHE_TTL, () => requestText(`${BASE_URL}/`));
    const list = parseHomeList(html).slice(0, 40);
    await OmniBox.log("info", `[枫叶][home] list=${list.length}`);
    return {
      class: CATEGORY_CONFIG.map((item) => ({ type_id: item.id, type_name: item.name })),
      list,
    };
  } catch (e) {
    await OmniBox.log("error", `[枫叶][home] ${e.message}`);
    return { class: CATEGORY_CONFIG.map((item) => ({ type_id: item.id, type_name: item.name })), list: [] };
  }
}

async function category(params = {}) {
  try {
    const categoryId = String(params.categoryId || params.type_id || params.id || "1");
    const page = Math.max(1, Number(params.page) || 1);
    const extend = params.extend || params.filters || {};
    const area = String(extend.area || "");
    const by = String(extend.by || "time");
    const clazz = String(extend.class || "");
    const year = String(extend.year || "");
    const lang = String(extend.lang || "");
    const letter = String(extend.letter || "");
    const url = `${BASE_URL}/index.php/ajax/data?mid=1&tid=${encodeURIComponent(categoryId)}&page=${page}&limit=20${area ? `&area=${encodeURIComponent(area)}` : ""}${by !== "time" ? `&by=${encodeURIComponent(by)}` : ""}${clazz ? `&class=${encodeURIComponent(clazz)}` : ""}${year ? `&year=${encodeURIComponent(year)}` : ""}${lang ? `&lang=${encodeURIComponent(lang)}` : ""}`;
    const html = await requestText(url);
    const list = parseData(html);
    await OmniBox.log("info", `[枫叶][category] category=${categoryId} page=${page} count=${list.length}`);
    return {
      page,
      pagecount: list.length >= PAGE_LIMIT ? page + 1 : page,
      total: page * list.length + (list.length ? 1 : 0),
      list: list.map((item) => ({ ...item, type_name: categoryNameById(categoryId) })),
    };
  } catch (e) {
    await OmniBox.log("error", `[枫叶][category] ${e.message}`);
    return { page: Number(params.page) || 1, pagecount: Number(params.page) || 1, total: 0, list: [] };
  }
}

async function search(params = {}) {
  try {
    const wd = normalizeText(params.wd || params.keyword || params.key || "");
    const page = Math.max(1, Number(params.page) || 1);
    if (!wd) return { list: [] };
    const url = `${BASE_URL}/index.php/ajax/suggest?mid=1&wd=${encodeURIComponent(wd)}&limit=30`;
    const html = await requestText(url);
    const list = parseSuggest(html);
    await OmniBox.log("info", `[枫叶][search] wd=${wd} page=${page} count=${list.length}`);
    return {
      page,
      pagecount: list.length >= PAGE_LIMIT ? page + 1 : page,
      total: list.length,
      list,
    };
  } catch (e) {
    await OmniBox.log("warn", `[枫叶][search] ${e.message}`);
    return { page: Number(params.page) || 1, pagecount: Number(params.page) || 1, total: 0, list: [] };
  }
}

async function detail(params = {}) {
  try {
    const videoId = String(params.videoId || params.id || params.vod_id || "");
    if (!videoId) return { list: [] };
    const url = `${BASE_URL}/detail/${videoId}.html`;
    const html = await getCachedText(`fengye:detail:${videoId}`, DETAIL_CACHE_TTL, () => requestText(url));
    const result = parseDetail(html, videoId);
    const vod = result.list?.[0];
    const scrapePlaySources = Array.isArray(result._play_sources_for_scrape) ? result._play_sources_for_scrape : vod?.vod_play_sources || [];

    if (vod && Array.isArray(scrapePlaySources) && scrapePlaySources.length > 0 && typeof OmniBox.processScraping === "function" && typeof OmniBox.getScrapeMetadata === "function") {
      let scrapeData = null;
      let videoMappings = [];
      let scrapeType = "";
      const scrapeCandidates = [];

      for (const source of scrapePlaySources) {
        for (const ep of source.episodes || []) {
          const fid = ep._fid || decodeMeta(String(ep.playId || "").split("|||")[1] || "")?.fid || ep.playId;
          if (!fid) continue;
          scrapeCandidates.push({
            fid,
            file_id: fid,
            file_name: ep._rawName || ep.name || "正片",
            name: ep._rawName || ep.name || "正片",
            format_type: "video",
          });
        }
      }

      await OmniBox.log("info", `[枫叶][detail] 刮削候选 videoId=${videoId} count=${scrapeCandidates.length} preview=${scrapeCandidates.slice(0, 3).map((item) => `${item.fid}=>${item.file_name}`).join(" | ")}`);
      if (scrapeCandidates.length > 0) {
        try {
          const scrapeKeyword = normalizeText(vod.vod_name || "");
          const scrapingResult = await OmniBox.processScraping(videoId, scrapeKeyword, scrapeKeyword, scrapeCandidates);
          await OmniBox.log("info", `[枫叶][detail] 刮削完成 videoId=${videoId} keyword=${scrapeKeyword} result=${JSON.stringify(scrapingResult || {}).slice(0, 200)}`);
          const metadata = await OmniBox.getScrapeMetadata(videoId);
          scrapeData = metadata?.scrapeData || null;
          videoMappings = Array.isArray(metadata?.videoMappings) ? metadata.videoMappings : [];
          scrapeType = metadata?.scrapeType || "";
          await OmniBox.log("info", `[枫叶][detail] 刮削元数据 videoId=${videoId} hasScrapeData=${!!scrapeData} mappings=${videoMappings.length} scrapeType=${scrapeType}`);
        } catch (error) {
          await OmniBox.log("warn", `[枫叶][detail] 刮削失败 videoId=${videoId}: ${error.message}`);
        }
      }

      if (scrapeData) {
        vod.vod_name = scrapeData.title || vod.vod_name;
        if (scrapeData.posterPath) {
          vod.vod_pic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
        }
        if (scrapeData.overview) {
          vod.vod_content = scrapeData.overview;
        }
      }

      for (const source of vod.vod_play_sources || []) {
        for (const ep of source.episodes || []) {
          const parts = String(ep.playId || "").split("|||");
          const meta = decodeMeta(parts[1] || "");
          const fid = meta?.fid;
          if (!fid) continue;
          const mapping = videoMappings.find((item) => item?.fileId === fid);
          if (!mapping) continue;
          const oldName = ep.name;
          const newName = buildScrapedEpisodeName(scrapeData, mapping, oldName);
          if (newName && newName !== oldName) {
            ep.name = newName;
            await OmniBox.log("info", `[枫叶][detail] 应用刮削分集名 ${oldName} -> ${newName}`);
          }
          meta.e = ep.name;
          meta.s = mapping.seasonNumber;
          meta.n = mapping.episodeNumber;
          ep.playId = `${parts[0]}|||${encodeMeta(meta)}`;
        }
      }
    }

    await OmniBox.log("info", `[枫叶][detail] id=${videoId} sources=${result.list?.[0]?.vod_play_sources?.length || 0}`);
    return result;
  } catch (e) {
    await OmniBox.log("error", `[枫叶][detail] ${e.message}`);
    return { list: [] };
  }
}

async function play(params = {}, context = {}) {
  try {
    let rawPlayId = String(params.id || params.playId || "");
    let playMeta = {};
    let vodName = "";
    let episodeName = "";

    if (rawPlayId.includes("|||")) {
      const [mainPlayId, metaB64] = rawPlayId.split("|||");
      rawPlayId = mainPlayId;
      playMeta = decodeMeta(metaB64 || "");
      vodName = playMeta.v || "";
      episodeName = playMeta.e || "";
      await OmniBox.log("info", `[枫叶][play] 解析透传信息 vod=${vodName} episode=${episodeName} fid=${playMeta.fid || ""}`);
    }

    const playId = String(rawPlayId || "");
    if (!playId) return { parse: 1, url: "", urls: [], header: {} };
    const playUrl = `${BASE_URL}/play/${playId}.html`;

    const playInfoPromise = (async () => {
      const html = await requestText(playUrl);
      const realVideoUrl = await parsePlayPage(playUrl, html);
      const finalHeaders = {
        "User-Agent": UA,
        Referer: `${BASE_URL}/`,
        Origin: BASE_URL,
      };

      if (realVideoUrl) {
        await OmniBox.log("info", `[枫叶][play] direct success playId=${playId} url=${realVideoUrl}`);
        return {
          parse: 0,
          url: realVideoUrl,
          urls: [{ name: "播放", url: realVideoUrl }],
          header: finalHeaders,
          headers: finalHeaders,
          danmaku: []};
      }

      await OmniBox.log("warn", `[枫叶][play] fallback parse=1 playId=${playId}`);
      return {
        parse: 1,
        url: playUrl,
        urls: [{ name: "播放页", url: playUrl }],
        header: finalHeaders,
        headers: finalHeaders,
        danmaku: []};
    })();

    const metadataPromise = (async () => {
      const result = {
        danmakuList: [],
        scrapeTitle: "",
        scrapePic: "",
        episodeNumber: playMeta?.n ?? null,
        episodeName: episodeName || "",
        scrapeType: "",
        mapping: null,
      };

      const videoIdForScrape = String(playMeta?.sid || params.videoId || params.vod_id || "");
      if (!videoIdForScrape || typeof OmniBox.getScrapeMetadata !== "function") {
        await OmniBox.log("info", `[枫叶][play] 播放增强链路跳过 videoId=${videoIdForScrape || ""}`);
        return result;
      }

      try {
        const metadata = await OmniBox.getScrapeMetadata(videoIdForScrape);
        if (!metadata || !metadata.scrapeData) {
          await OmniBox.log("info", `[枫叶][play] 播放增强链路跳过: metadata 不完整 videoId=${videoIdForScrape}`);
          return result;
        }

        result.scrapeTitle = metadata.scrapeData.title || "";
        if (metadata.scrapeData.posterPath) {
          result.scrapePic = `https://image.tmdb.org/t/p/w500${metadata.scrapeData.posterPath}`;
        }
        result.scrapeType = metadata.scrapeType || "";

        const mappings = Array.isArray(metadata.videoMappings) ? metadata.videoMappings : [];
        await OmniBox.log("info", `[枫叶][play] 读取刮削元数据成功 videoId=${videoIdForScrape} mappings=${mappings.length} scrapeType=${result.scrapeType || "unknown"}`);
        const mapping = mappings.find((item) => item?.fileId === playMeta?.fid);
        result.mapping = mapping || null;
        if (mapping) {
          if (mapping.episodeName) {
            result.episodeName = buildScrapedEpisodeName(metadata.scrapeData, mapping, result.episodeName || episodeName || "");
          }
          if (mapping.episodeNumber !== undefined && mapping.episodeNumber !== null) {
            result.episodeNumber = mapping.episodeNumber;
          }
        } else if (mappings.length > 0) {
          await OmniBox.log("info", `[枫叶][play] 播放增强链路未命中 mapping fid=${playMeta?.fid || ""}`);
        }

        vodName = result.scrapeTitle || vodName;
        episodeName = result.episodeName || episodeName;
        const fileName = buildScrapedDanmuFileName(metadata.scrapeData, result.scrapeType, mapping, vodName, episodeName);
        if (fileName && typeof OmniBox.getDanmakuByFileName === "function") {
          const matchedDanmaku = await OmniBox.getDanmakuByFileName(fileName);
          const count = Array.isArray(matchedDanmaku) ? matchedDanmaku.length : 0;
          await OmniBox.log("info", `[枫叶][play] 弹幕匹配结果 fileName=${fileName} count=${count}`);
          if (count > 0) {
            result.danmakuList = matchedDanmaku;
          }
        }
      } catch (error) {
        await OmniBox.log("warn", `[枫叶][play] 读取刮削元数据失败: ${error.message}`);
      }

      return result;
    })();

    const [playInfoResult, metadataResult] = await Promise.allSettled([playInfoPromise, metadataPromise]);
    if (playInfoResult.status !== "fulfilled") {
      throw playInfoResult.reason || new Error("播放主链路失败");
    }

    const playResult = playInfoResult.value || { urls: [], parse: 0, header: {}, danmaku: [] };
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
      await OmniBox.log("warn", `[枫叶][play] 播放增强链路失败(不影响播放): ${metadataResult.reason?.message || metadataResult.reason}`);
    }

    playResult.danmaku = danmakuList.length > 0 ? danmakuList : (playResult.danmaku || []);

    const videoIdForScrape = String(playMeta?.sid || params.videoId || params.vod_id || "");
    if (videoIdForScrape && context?.sourceId && typeof OmniBox.addPlayHistory === "function") {
      const historyPayload = {
        vodId: videoIdForScrape,
        title: scrapeTitle || vodName || playMeta.v || "枫叶视频",
        pic: scrapePic || "",
        episode: buildHistoryEpisode(playId, episodeNumber, episodeName),
        sourceId: context.sourceId,
        episodeNumber,
        episodeName: episodeName || "",
      };
      OmniBox.addPlayHistory(historyPayload)
        .then((added) => {
          if (added) {
            OmniBox.log("info", `[枫叶][play] 已添加播放记录: ${historyPayload.title}`);
          } else {
            OmniBox.log("info", `[枫叶][play] 播放记录已存在，跳过添加: ${historyPayload.title}`);
          }
        })
        .catch((error) => {
          OmniBox.log("warn", `[枫叶][play] 添加播放记录失败: ${error.message}`);
        });
    }

    return playResult;
  } catch (e) {
    await OmniBox.log("error", `[枫叶][play] ${e.message}`);
    return { parse: 1, url: "", urls: [], header: {}, danmaku: [] };
  }
}


function parseData(htmlText) {
  try {
    const data = JSON.parse(htmlText);
    const arr = data && Array.isArray(data.list) ? data.list : [];
    return arr
      .map(function (it) {
        return {
          vod_id: String(it.vod_id),
          vod_name: normalizeText(it.vod_name || ''),
          vod_pic: fixPic(it.vod_pic || ''),
          vod_remarks: normalizeText(it.vod_remarks || ''),
        };
      })
      .filter(function (it) { return !!it.vod_id; });
  } catch (e) {
    return [];
  }
}

function parseSuggest(htmlText) {
  try {
    const data = JSON.parse(htmlText);
    const arr = data && Array.isArray(data.list) ? data.list : [];
    return arr
      .map(function (it) {
        return {
          vod_id: String(it.id),
          vod_name: normalizeText(it.name || ''),
          vod_pic: fixPic(it.pic || ''),
          vod_remarks: normalizeText(it.remarks || ''),
        };
      })
      .filter(function (it) { return !!it.vod_id; });
  } catch (e) {
    return [];
  }
}
function fixPic(u) {
  if (!u) return "";
  u = String(u).replace(/&amp;/g, "&");
  if (u.indexOf("//") === 0) return "https:" + u;
  if (u.indexOf("/") === 0) return absoluteUrl(u);
  return u;
}

});

_load(5, "爱奇艺资源站", function (module, exports, require) {
// @name 爱奇艺资源站(MacCMS API)-增强版
// @author OpenClaw Bingbu + 梦
// @description 刮削：支持，弹幕：支持，嗅探：支持，观看记录：支持，广告：菠菜
// @dependencies: axios
// @version 1.1.1
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/爱奇艺资源站.js

/**
 * ============================================================================
 * 爱奇艺资源站 OmniBox 站源（增强版）
 * 站点: https://iqiyizyapi.com
 * 接口: /api.php/provide/vod
 *
 * 新增能力：
 * - 支持 TMDB 刮削（detail 阶段触发 processScraping）
 * - 支持弹幕匹配（play 阶段通过 getDanmakuByFileName 获取）
 * - 支持观看记录（play 阶段 addPlayHistory）
 * - 保留原有：一级主类聚合、二级筛选、分类屏蔽、嗅探兼容
 *
 * 分类屏蔽配置：
 * - 环境变量 IQIYIZY_BLOCKED_MAIN
 * - 例："39" 或 "39,9"（按一级分类ID）
 * ============================================================================
 */

const axios = require("axios");
const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");

const HOST = "https://iqiyizy.cc";
const API = `${HOST}/api.php/provide/vod`;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36";

const MAIN_CATEGORIES = [
  { type_id: "7", type_name: "电影" },
  { type_id: "8", type_name: "连续剧" },
  { type_id: "9", type_name: "综艺" },
  { type_id: "40", type_name: "动漫" },
  { type_id: "39", type_name: "伦理片" }
];

const MAIN_CHILDREN_FALLBACK = {
  "7": [
    { type_id: "5", type_name: "动漫电影" },
    { type_id: "10", type_name: "动作片" },
    { type_id: "11", type_name: "喜剧片" },
    { type_id: "12", type_name: "爱情片" },
    { type_id: "13", type_name: "科幻片" },
    { type_id: "14", type_name: "恐怖片" },
    { type_id: "15", type_name: "剧情片" },
    { type_id: "16", type_name: "战争片" },
    { type_id: "17", type_name: "惊悚片" },
    { type_id: "18", type_name: "家庭片" },
    { type_id: "19", type_name: "古装片" },
    { type_id: "20", type_name: "历史片" },
    { type_id: "21", type_name: "悬疑片" },
    { type_id: "22", type_name: "犯罪片" },
    { type_id: "23", type_name: "灾难片" },
    { type_id: "24", type_name: "记录片" },
    { type_id: "25", type_name: "短片" }
  ],
  "8": [
    { type_id: "26", type_name: "国产剧" },
    { type_id: "27", type_name: "香港剧" },
    { type_id: "28", type_name: "韩国剧" },
    { type_id: "29", type_name: "欧美剧" },
    { type_id: "30", type_name: "台湾剧" },
    { type_id: "31", type_name: "日本剧" },
    { type_id: "32", type_name: "海外剧" },
    { type_id: "33", type_name: "泰国剧" },
    { type_id: "38", type_name: "短剧" }
  ],
  "9": [
    { type_id: "34", type_name: "大陆综艺" },
    { type_id: "35", type_name: "港台综艺" },
    { type_id: "36", type_name: "日韩综艺" },
    { type_id: "37", type_name: "欧美综艺" }
  ],
  "40": [
    { type_id: "1", type_name: "国产动漫" },
    { type_id: "2", type_name: "日韩动漫" },
    { type_id: "3", type_name: "欧美动漫" },
    { type_id: "4", type_name: "港台动漫" },
    { type_id: "6", type_name: "里番动漫" }
  ],
  "39": []
};

const DEFAULT_BLOCKED_MAIN = ["39"];

const http = axios.create({
  timeout: 20000,
  headers: {
    "User-Agent": UA,
    "Accept": "application/json,text/plain,*/*",
    "Referer": `${HOST}/`
  },
  validateStatus: () => true
});

const CLASS_CACHE = {
  list: [],
  mapById: {},
  childMap: {}
};

function safeJson(input, fallback = {}) {
  if (!input) return fallback;
  if (typeof input === "object") return input;
  try {
    return JSON.parse(input);
  } catch {
    return fallback;
  }
}

function text(v) {
  return String(v == null ? "" : v).trim();
}

function fixUrl(url) {
  const u = text(url);
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("/")) return `${HOST}${u}`;
  return `${HOST}/${u}`;
}

function b64Encode(obj) {
  try {
    return Buffer.from(JSON.stringify(obj || {}), "utf8").toString("base64");
  } catch {
    return "";
  }
}

function b64Decode(str) {
  try {
    return JSON.parse(Buffer.from(String(str || ""), "base64").toString("utf8"));
  } catch {
    return {};
  }
}

function getBlockedMainSet() {
  const env = text(process.env.IQIYIZY_BLOCKED_MAIN);
  const raw = env ? env.split(",").map((s) => s.trim()).filter(Boolean) : DEFAULT_BLOCKED_MAIN;
  return new Set(raw);
}

function updateClassCache(classList) {
  const classes = Array.isArray(classList)
    ? classList.map((c) => ({
        type_id: text(c.type_id),
        type_pid: text(c.type_pid),
        type_name: text(c.type_name)
      })).filter((c) => c.type_id && c.type_name)
    : [];

  if (!classes.length) return;

  const mapById = {};
  const childMap = {};
  classes.forEach((c) => {
    mapById[c.type_id] = c;
    const pid = c.type_pid || "0";
    if (!childMap[pid]) childMap[pid] = [];
    childMap[pid].push(c);
  });

  CLASS_CACHE.list = classes;
  CLASS_CACHE.mapById = mapById;
  CLASS_CACHE.childMap = childMap;
}

async function fetchApi(params = {}) {
  try {
    const res = await http.get(API, { params });
    const data = safeJson(res.data, {});
    if (Array.isArray(data.class)) updateClassCache(data.class);
    return data;
  } catch (error) {
    await OmniBox.log("warn", `fetchApi 失败: ${error.message}`);
    return {};
  }
}

async function ensureClassCache() {
  if (Array.isArray(CLASS_CACHE.list) && CLASS_CACHE.list.length > 0) return;
  await fetchApi({ ac: "list", pg: 1 });
}

function resolveMainTypeId(typeId, fallbackMain = "") {
  const t = text(typeId);
  if (!t) return text(fallbackMain);
  if (MAIN_CATEGORIES.some((m) => m.type_id === t)) return t;

  const mapById = CLASS_CACHE.mapById || {};
  let cur = mapById[t];
  let guard = 0;
  while (cur && guard < 10) {
    guard += 1;
    if (MAIN_CATEGORIES.some((m) => m.type_id === cur.type_id)) return cur.type_id;
    if (!cur.type_pid || cur.type_pid === cur.type_id) break;
    cur = mapById[cur.type_pid];
  }

  return text(fallbackMain);
}

function isMainBlocked(mainTypeId) {
  return getBlockedMainSet().has(text(mainTypeId));
}

function mapListItem(item) {
  const typeId = text(item.type_id || "");
  const mainTypeId = resolveMainTypeId(typeId, item.type_id_1 || "");
  return {
    vod_id: text(item.vod_id),
    vod_name: text(item.vod_name),
    vod_pic: fixUrl(item.vod_pic),
    vod_remarks: text(item.vod_remarks || item.type_name || ""),
    type_id: typeId,
    type_name: text(item.type_name || ""),
    main_type_id: mainTypeId,
    vod_year: text(item.vod_year || ""),
    vod_douban_score: text(item.vod_douban_score || "")
  };
}

function buildResourceId(vodId) {
  // 注意：OmniBox 刮削系统要求 resourceId 直接使用裸 videoId，不能加前缀
  // 参考瓜子.js: processScraping(videoId, ...) / getScrapeMetadata(videoId)
  return text(vodId);
}

function buildEpisodeFileId(vodId, flag, epName, idx) {
  // fileId 格式与瓜子.js 保持一致: `${videoId}#${index}`
  // index 从 1 开始，多线路时加上 flag 区分，避免重复
  return `${text(vodId)}#${text(flag)}#${idx}`;
}

function parsePlaySources(vodPlayFrom, vodPlayUrl, vodId, vodName = "") {
  // 这里做两件事：
  // 1) 把资源站返回的旧格式 vod_play_from / vod_play_url 转成 OmniBox 推荐的新格式 vod_play_sources
  // 2) 同时构造一份 videoFiles，供 processScraping(resourceId, keyword, resourceName, videoFiles) 使用
  //
  // 为什么要额外构造 videoFiles？
  // 因为本源不是网盘源，没有天然的 fileId，刮削系统依赖 fileId 把“某一集”映射到 TMDB 的某一集。
  // 所以这里人为构造一个稳定 fileId：iqiyizy:{vodId}:{flag}:{idx}:{epName}
  // detail 阶段用它去刮削，play 阶段再把同一个 fileId 塞回 playId，这样就能在播放时找回映射关系。
  const fromArr = text(vodPlayFrom).split("$$$").map((s) => s.trim()).filter(Boolean);
  const urlArr = text(vodPlayUrl).split("$$$").map((s) => s.trim()).filter(Boolean);
  const sourceCount = Math.max(fromArr.length, urlArr.length);
  const sources = [];
  const videoFiles = [];

  for (let i = 0; i < sourceCount; i += 1) {
    const flag = fromArr[i] || `线路${i + 1}`;
    const group = urlArr[i] || "";
    const episodesRaw = group.split("#").map((s) => s.trim()).filter(Boolean);

    const episodes = episodesRaw.map((item, idx) => {
      let epName = `第${idx + 1}集`;
      let epUrl = item;
      const cut = item.indexOf("$");
      if (cut > -1) {
        epName = text(item.slice(0, cut)) || epName;
        epUrl = text(item.slice(cut + 1));
      }

      const fileId = buildEpisodeFileId(vodId, flag, epName, idx + 1);
      videoFiles.push({
        fid: fileId,
        file_id: fileId,
        file_name: epName,
        name: epName,
        format_type: "video"
      });

      const playId = b64Encode({
        resourceId: buildResourceId(vodId),
        vodId: text(vodId),
        name: vodName,
        flag,
        epName,
        episodeIndex: idx + 1,
        fileId,
        url: epUrl
      });

      return { name: epName, playId, _fileId: fileId };
    });

    if (episodes.length > 0) {
      sources.push({ name: flag, episodes });
    }
  }

  return { sources, videoFiles };
}

async function enrichPlaySourcesWithMetadata(playSources, resourceId) {
  // 这里只负责“把刮削结果回填到剧集列表里”，不负责触发刮削。
  // 典型调用顺序：
  //   detail -> processScraping(...) -> getScrapeMetadata(...) -> enrichPlaySourcesWithMetadata(...)
  //
  // 注意：即使这里成功拿到了 metadata，页面上也不一定会“看起来变化很大”。
  // 因为前端主要展示 vod_name / vod_pic / 简介 / 剧集名称等字段；
  // 如果站点原始数据已经比较完整，或者前端没有展示 enrich 字段，就会产生“刮削似乎没生效”的错觉。
  // 所以这里额外加详细日志，帮助判断到底是：
  // - processScraping 没跑到
  // - getScrapeMetadata 没拿到数据
  // - videoMappings 没匹配上 fileId
  // - 还是拿到了但前端展示不明显
  try {
    await OmniBox.log("info", `[刮削回填] 开始读取元数据 resourceId=${resourceId}`);
    const metadata = await OmniBox.getScrapeMetadata(resourceId);
    const scrapeData = metadata?.scrapeData || null;
    const videoMappings = Array.isArray(metadata?.videoMappings) ? metadata.videoMappings : [];

    await OmniBox.log(
      "info",
      `[刮削回填] 元数据读取完成 resourceId=${resourceId}, hasScrapeData=${!!scrapeData}, mappingCount=${videoMappings.length}, playSourceCount=${playSources.length}`
    );

    if (scrapeData) {
      await OmniBox.log(
        "info",
        `[刮削回填] scrapeData 摘要 title=${text(scrapeData.title)}, releaseDate=${text(scrapeData.releaseDate)}, voteAverage=${text(scrapeData.voteAverage)}`
      );
    }

    if (!playSources.length || !videoMappings.length) {
      await OmniBox.log(
        "warn",
        `[刮削回填] 没有可回填的数据 playSources=${playSources.length}, videoMappings=${videoMappings.length}`
      );
      return { playSources, scrapeData, metadata };
    }

    const mappingMap = new Map();
    for (const m of videoMappings) {
      if (m?.fileId) mappingMap.set(String(m.fileId), m);
    }

    let matchedCount = 0;

    for (const source of playSources) {
      for (const ep of source.episodes || []) {
        const lookupKey = String(ep._fileId || "");
        const mapping = mappingMap.get(lookupKey);
        if (!mapping) {
          await OmniBox.log("info", `[刮削回填] 未命中映射 source=${source.name}, episode=${ep.name}, fileId=${lookupKey}`);
          continue;
        }

        matchedCount += 1;
        await OmniBox.log(
          "info",
          `[刮削回填] 命中映射 source=${source.name}, oldEpisode=${ep.name}, fileId=${lookupKey}, season=${mapping.seasonNumber ?? ""}, episode=${mapping.episodeNumber ?? ""}, tmdbEpisodeName=${text(mapping.episodeName)}`
        );

        if (mapping.episodeName) {
          const epName = mapping.episodeNumber + "." + mapping.episodeName;
          ep.episodeName = epName;
        }
        if (mapping.episodeOverview) ep.episodeOverview = mapping.episodeOverview;
        if (mapping.episodeAirDate) ep.episodeAirDate = mapping.episodeAirDate;
        if (mapping.episodeStillPath) ep.episodeStillPath = mapping.episodeStillPath;
        if (mapping.episodeVoteAverage != null) ep.episodeVoteAverage = mapping.episodeVoteAverage;
        if (mapping.episodeRuntime != null) ep.episodeRuntime = mapping.episodeRuntime;
        if (mapping.seasonNumber != null) ep._seasonNumber = mapping.seasonNumber;
        if (mapping.episodeNumber != null) ep._episodeNumber = mapping.episodeNumber;
        if (mapping.episodeName) {
          const epName = mapping.episodeNumber + "." + mapping.episodeName;
          ep.name = epName;
        }
      }

      const hasOrdering = (source.episodes || []).some((ep) => ep._episodeNumber != null);
      if (hasOrdering) {
        await OmniBox.log("info", `[刮削回填] 线路 ${source.name} 检测到剧集排序信息，按 season/episode 重排`);
        source.episodes.sort((a, b) => {
          const sa = Number(a._seasonNumber || 0);
          const sb = Number(b._seasonNumber || 0);
          if (sa !== sb) return sa - sb;
          return Number(a._episodeNumber || 0) - Number(b._episodeNumber || 0);
        });
      }

      for (const ep of source.episodes || []) {
        delete ep._seasonNumber;
        delete ep._episodeNumber;
        delete ep._fileId;
      }
    }

    await OmniBox.log("info", `[刮削回填] 完成 resourceId=${resourceId}, matchedEpisodeCount=${matchedCount}`);
    return { playSources, scrapeData, metadata };
  } catch (error) {
    await OmniBox.log("warn", `获取刮削元数据失败: ${error.message}`);
    for (const source of playSources) {
      for (const ep of source.episodes || []) delete ep._fileId;
    }
    return { playSources, scrapeData: null, metadata: null };
  }
}

function buildMainClasses() {
  return MAIN_CATEGORIES.filter((c) => !isMainBlocked(c.type_id));
}

function buildFiltersForMain(mainTypeId) {
  const key = text(mainTypeId);
  const cacheChildren = (CLASS_CACHE.childMap?.[key] || [])
    .filter((c) => c.type_id !== key)
    .map((c) => ({ type_id: c.type_id, type_name: c.type_name }));
  const children = (cacheChildren.length ? cacheChildren : (MAIN_CHILDREN_FALLBACK[key] || []))
    .sort((a, b) => String(a.type_id).localeCompare(String(b.type_id)));
  if (!children.length) return [];
  return [{
    key: "subtype",
    name: "子分类",
    init: "",
    value: [{ name: "全部", value: "" }, ...children.map((c) => ({ name: c.type_name, value: c.type_id }))]
  }];
}

function getChildTypeIds(mainTypeId) {
  const key = text(mainTypeId);
  const cacheChildren = (CLASS_CACHE.childMap?.[key] || [])
    .filter((c) => c.type_id && c.type_id !== key)
    .map((c) => c.type_id);
  if (cacheChildren.length) return cacheChildren;
  return (MAIN_CHILDREN_FALLBACK[key] || []).map((c) => c.type_id);
}

async function fetchMainAllByChildren(mainTypeId, page) {
  const childTypeIds = getChildTypeIds(mainTypeId);
  if (!childTypeIds.length) {
    const direct = await fetchApi({ ac: "list", t: text(mainTypeId), pg: page });
    const directList = (Array.isArray(direct.list) ? direct.list : [])
      .map(mapListItem)
      .filter((it) => !isMainBlocked(it.main_type_id || it.type_id));
    return {
      list: directList,
      page: Number(direct.page || page || 1),
      pagecount: Number(direct.pagecount || page || 1),
      total: Number(direct.total || directList.length || 0),
      limit: Number(direct.limit || 20)
    };
  }

  const results = await Promise.all(childTypeIds.map((tid) => fetchApi({ ac: "list", t: tid, pg: page })));
  const mergedRaw = [];
  let total = 0;
  let pagecount = 0;
  let limit = 20;

  results.forEach((data) => {
    const arr = Array.isArray(data.list) ? data.list : [];
    mergedRaw.push(...arr);
    total += Number(data.total || 0);
    pagecount = Math.max(pagecount, Number(data.pagecount || 0));
    if (Number(data.limit || 0) > 0) limit = Number(data.limit);
  });

  const seen = new Set();
  const merged = mergedRaw
    .map(mapListItem)
    .filter((it) => !isMainBlocked(it.main_type_id || it.type_id))
    .filter((it) => {
      if (!it.vod_id || seen.has(it.vod_id)) return false;
      seen.add(it.vod_id);
      return true;
    })
    .sort((a, b) => Number(b.vod_id || 0) - Number(a.vod_id || 0));

  return { list: merged, page, pagecount: pagecount || page, total: total || merged.length, limit };
}

function getFilterSubtype(params) {
  return text(params?.filters?.subtype || params?.filter?.subtype || params?.extend?.subtype || params?.ext?.subtype || "");
}

function isAllSelection(value) {
  const v = text(value).toLowerCase();
  return !v || v === "0" || v === "-1" || v === "all" || v === "全部";
}

function inferTypeName(mainTypeId, rawTypeName) {
  const hit = MAIN_CATEGORIES.find((m) => m.type_id === text(mainTypeId));
  return hit?.type_name || text(rawTypeName || "");
}

function buildScrapeKeyword(item) {
  // 只传片名，不加年份；加年份容易干扰 TMDB 搜索（如"你好1983 2026"）
  // 参考瓜子.js: processScraping(videoId, vod.vod_name, vod.vod_name, ...)
  return text(item.vod_name);
}

function buildDanmakuFileName(scrapeData, mapping, fallbackTitle, fallbackEpName) {
  if (!scrapeData) return `${fallbackTitle || ""} ${fallbackEpName || ""}`.trim();
  const title = text(scrapeData.title || fallbackTitle || "");
  const scrapeType = text(scrapeData.scrapeType || scrapeData.type || "").toLowerCase();
  const seasonAirYear = text(scrapeData.seasonAirYear || scrapeData.releaseDate || "").slice(0, 4);

  if (mapping && (mapping.episodeNumber != null || mapping.seasonNumber != null || scrapeType === "tv")) {
    const season = Number(mapping?.seasonNumber || 1);
    const episode = Number(mapping?.episodeNumber || 1);
    const yearPart = seasonAirYear ? `.${seasonAirYear}` : "";
    return `${title}${yearPart}.S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
  }

  return title || `${fallbackTitle || ""} ${fallbackEpName || ""}`.trim();
}

async function home(params, context) {
  const data = await fetchApi({ ac: "list", pg: 1 });
  const classes = buildMainClasses();
  const list = (Array.isArray(data.list) ? data.list : []).map(mapListItem).filter((it) => !isMainBlocked(it.main_type_id || it.type_id));
  const filters = {};
  classes.forEach((m) => {
    const f = buildFiltersForMain(m.type_id);
    if (f.length) filters[m.type_id] = f;
  });
  return { class: classes, filters, list };
}

async function category(params, context) {
  const page = parseInt(params?.page || "1", 10) || 1;
  const mainTypeId = text(params?.categoryId || params?.type_id || "");
  const subtype = getFilterSubtype(params);
  await ensureClassCache();

  if (isMainBlocked(mainTypeId)) {
    return { list: [], page, pagecount: 0, total: 0, limit: 20 };
  }

  let result;
  if (!isAllSelection(subtype)) {
    const data = await fetchApi({ ac: "list", t: subtype, pg: page });
    const list = (Array.isArray(data.list) ? data.list : []).map(mapListItem).filter((it) => !isMainBlocked(it.main_type_id || it.type_id));
    result = {
      list,
      page: Number(data.page || page || 1),
      pagecount: Number(data.pagecount || page || 1),
      total: Number(data.total || list.length || 0),
      limit: Number(data.limit || 20)
    };
  } else {
    result = await fetchMainAllByChildren(mainTypeId, page);
  }

  const f = buildFiltersForMain(mainTypeId);
  if (f.length && page === 1) result.filters = f;
  return result;
}

async function search(params, context) {
  const keyword = text(params?.keyword || params?.wd || "");
  const page = parseInt(params?.page || "1", 10) || 1;
  if (!keyword) return { list: [], page: 1, pagecount: 0, total: 0 };

  const data = await fetchApi({ ac: "list", wd: keyword, pg: page });
  const list = (Array.isArray(data.list) ? data.list : []).map(mapListItem).filter((it) => !isMainBlocked(it.main_type_id || it.type_id));
  return {
    list,
    page: Number(data.page || page || 1),
    pagecount: Number(data.pagecount || page || 1),
    total: Number(data.total || list.length || 0),
    limit: Number(data.limit || 20)
  };
}

async function detail(params, context) {
  try {
    const videoId = text(params?.videoId || "");
    if (!videoId) return { list: [] };

    await OmniBox.log("info", `[detail] 开始处理 videoId=${videoId}`);
    const data = await fetchApi({ ac: "detail", ids: videoId });
    const item = Array.isArray(data.list) && data.list.length ? data.list[0] : null;
    if (!item) {
      await OmniBox.log("warn", `[detail] 未获取到详情数据 videoId=${videoId}`);
      return { list: [] };
    }

    const mainTypeId = resolveMainTypeId(item.type_id, item.type_id_1 || "");
    if (isMainBlocked(mainTypeId)) {
      await OmniBox.log("warn", `[detail] 命中屏蔽主类 mainTypeId=${mainTypeId}, videoId=${videoId}`);
      return { list: [] };
    }

    const resourceId = buildResourceId(videoId);
    const { sources, videoFiles } = parsePlaySources(item.vod_play_from, item.vod_play_url, videoId, item.vod_name);

    await OmniBox.log(
      "info",
      `[detail] 播放数据已解析 videoId=${videoId}, resourceId=${resourceId}, sourceCount=${sources.length}, videoFileCount=${videoFiles.length}, vodName=${text(item.vod_name)}`
    );

    let scrapeData = null;
    if (videoFiles.length > 0) {
      const scrapeKeyword = buildScrapeKeyword(item);
      await OmniBox.log(
        "info",
        `[detail] 准备执行刮削 resourceId=${resourceId}, keyword=${scrapeKeyword}, resourceName=${text(item.vod_name)}, firstFile=${text(videoFiles[0]?.file_name)}`
      );
      try {
        // processScraping 在采集源中是同步阻塞的，等刮削完成后才返回
        // 调用完成后可立即读取元数据，不需要轮询
        const scrapingResult = await OmniBox.processScraping(resourceId, scrapeKeyword, text(item.vod_name), videoFiles);
        await OmniBox.log("info", `[detail] processScraping 调用完成 resourceId=${resourceId}, result=${JSON.stringify(scrapingResult || {}).substring(0, 300)}`);
      } catch (error) {
        await OmniBox.log("warn", `[detail] processScraping 失败 resourceId=${resourceId}, error=${error.message}`);
      }
    } else {
      await OmniBox.log("warn", `[detail] 未解析出任何 videoFiles，跳过刮削 resourceId=${resourceId}`);
    }

    const enriched = await enrichPlaySourcesWithMetadata(sources, resourceId);
    const playSources = enriched.playSources;
    scrapeData = enriched.scrapeData;

    await OmniBox.log(
      "info",
      `[detail] 刮削回填结束 resourceId=${resourceId}, hasScrapeData=${!!scrapeData}, finalSourceCount=${playSources.length}, totalEpisodeCount=${playSources.reduce((n, s) => n + ((s.episodes || []).length), 0)}`
    );

    const vod = {
      vod_id: text(item.vod_id),
      vod_name: text(scrapeData?.title || item.vod_name),
      vod_pic: scrapeData?.posterPath ? `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}` : fixUrl(item.vod_pic),
      vod_remarks: text(item.vod_remarks),
      vod_year: text((scrapeData?.releaseDate || item.vod_year || "").slice?.(0, 4) || item.vod_year || ""),
      vod_area: text(item.vod_area),
      vod_lang: text(item.vod_lang),
      vod_director: text(item.vod_director || scrapeData?.credits?.crew?.filter?.((x) => x.job === "Director").map?.((x) => x.name).join(",") || ""),
      vod_actor: text(item.vod_actor || scrapeData?.credits?.cast?.slice?.(0, 8).map?.((x) => x.name).join(",") || ""),
      vod_class: text(item.vod_class || inferTypeName(mainTypeId, item.type_name || "")),
      vod_content: text(scrapeData?.overview || item.vod_content).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
      vod_play_sources: playSources,
      vod_douban_score: text(scrapeData?.voteAverage != null ? Number(scrapeData.voteAverage).toFixed(1) : (item.vod_douban_score || ""))
    };

    await OmniBox.log(
      "info",
      `[detail] 最终返回 videoId=${videoId}, vodName=${vod.vod_name}, vodYear=${vod.vod_year}, vodScore=${vod.vod_douban_score}, hasPoster=${!!vod.vod_pic}, hasContent=${!!vod.vod_content}`
    );

    return { list: [vod] };
  } catch (error) {
    await OmniBox.log("error", `detail 失败: ${error.message}`);
    return { list: [] };
  }
}

async function play(params, context) {
  try {
    const playId = text(params?.playId || "");
    const meta = b64Decode(playId);
    const url = fixUrl(meta.url || "");
    const resourceId = text(meta.resourceId || "");
    const fileId = text(meta.fileId || "");
    const vodId = text(meta.vodId || "");
    const title = text(meta.name || params?.title || "");
    const epName = text(meta.epName || "");

    await OmniBox.log(
      "info",
      `[play] 开始处理 vodId=${vodId}, resourceId=${resourceId}, fileId=${fileId}, title=${title}, epName=${epName}, hasUrl=${!!url}`
    );

    if (!url) {
      await OmniBox.log("warn", `[play] playId 无法解出有效 URL, playId=${playId.slice(0, 120)}`);
      return {
        urls: [],
        parse: 1,
        header: {
          "User-Agent": UA,
          "Referer": `${HOST}/`
        },
        danmaku: []
      };
    }

    let danmaku = [];
    let scrapeData = null;
    let mapping = null;

    if (resourceId && fileId) {
      try {
        await OmniBox.log("info", `[play] 开始读取刮削元数据 resourceId=${resourceId}, fileId=${fileId}`);
        const metadata = await OmniBox.getScrapeMetadata(resourceId);
        scrapeData = metadata?.scrapeData || null;
        const mappings = Array.isArray(metadata?.videoMappings) ? metadata.videoMappings : [];
        mapping = mappings.find((m) => String(m?.fileId || "") === fileId) || null;

        await OmniBox.log(
          "info",
          `[play] 元数据读取完成 resourceId=${resourceId}, hasScrapeData=${!!scrapeData}, mappingCount=${mappings.length}, mappingMatched=${!!mapping}`
        );

        const fileName = buildDanmakuFileName(scrapeData, mapping, title, epName);
        await OmniBox.log("info", `[play] 构造弹幕匹配文件名 fileName=${fileName}`);

        if (fileName) {
          danmaku = await OmniBox.getDanmakuByFileName(fileName);
          await OmniBox.log("info", `[play] 弹幕匹配完成 fileName=${fileName}, danmakuCount=${Array.isArray(danmaku) ? danmaku.length : 0}`);
        }
      } catch (error) {
        await OmniBox.log("warn", `[play] 弹幕匹配失败: ${error.message}`);
      }
    } else {
      await OmniBox.log("warn", `[play] 缺少 resourceId 或 fileId，跳过弹幕匹配 resourceId=${resourceId}, fileId=${fileId}`);
    }

    const parse = /\.(m3u8|mp4|flv|webm)(\?|$)/i.test(url) ? 0 : 1;
    const header = {
      "User-Agent": UA,
      "Referer": `${HOST}/`
    };

    await OmniBox.log("info", `[play] 播放地址已确定 parse=${parse}, url=${url.slice(0, 200)}`);

    try {
      const historyPayload = {
        vodId: vodId || resourceId || title,
        title: title || vodId,
        episode: playId,
        episodeName: mapping?.episodeName || epName || undefined,
        episodeNumber: mapping?.episodeNumber != null ? mapping.episodeNumber : undefined,
        pic: scrapeData?.posterPath ? `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}` : undefined,
        playUrl: url,
        playHeader: header
      };
      await OmniBox.log("info", `[play] 准备写入观看记录 vodId=${historyPayload.vodId}, episodeName=${historyPayload.episodeName || ""}, episodeNumber=${historyPayload.episodeNumber ?? ""}`);
      await OmniBox.addPlayHistory(historyPayload);
      await OmniBox.log("info", `[play] 观看记录写入完成 vodId=${historyPayload.vodId}`);
    } catch (error) {
      await OmniBox.log("warn", `[play] 添加观看记录失败: ${error.message}`);
    }

    return {
      urls: [{ name: epName || meta.flag || "播放", url }],
      parse,
      header,
      danmaku: Array.isArray(danmaku) ? danmaku : []
    };
  } catch (error) {
    await OmniBox.log("error", `play 失败: ${error.message}`);
    return {
      urls: [],
      parse: 1,
      header: {
        "User-Agent": UA,
        "Referer": `${HOST}/`
      },
      danmaku: []
    };
  }
}

module.exports = { home, category, search, detail, play };
runner.run(module.exports);

});
