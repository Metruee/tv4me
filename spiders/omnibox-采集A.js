// @name 影视采集A(合并13源)
// @version 2.20261030.3
// @description 自动同步：采集聚合
// @downloadURL https://gh-proxy.com/https://raw.githubusercontent.com/Metruee/tv4me/main/spiders/omnibox-采集A.js
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

_load(1, "4KVM", function (module, exports, require) {
// @name 4KVM
// @author 
// @description 刮削：支持，弹幕：支持，嗅探：支持
// @dependencies: axios, cheerio
// @version 1.2.3
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/4KVM.js

/**
* ============================================================================
* 4KVM
* 刮削：支持
* 弹幕：支持
* 嗅探：支持
* ============================================================================
*/
const axios = require("axios");
const https = require("https");
const http = require("http");
const cheerio = require("cheerio");
const OmniBox = require("omnibox_sdk");

// ========== 全局配置 ========== 
const config = {
    host: "https://www.4kvm.org",
    headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Referer": "https://www.4kvm.org/",
        "Cache-Control": "no-cache"
    }
};

// 弹幕 API 地址(优先使用环境变量)
const DANMU_API = process.env.DANMU_API || "";

const axiosInstance = axios.create({
    timeout: 60 * 1000,
    httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
    httpAgent: new http.Agent({ keepAlive: true })
});

const PLAY_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    "Referer": "https://www.4kvm.org/",
    "Origin": "https://www.4kvm.org"
};

/**
* 日志工具函数
*/
const logInfo = (message, data = null) => {
    const output = data ? `${message}: ${JSON.stringify(data)}` : message;
    OmniBox.log("info", `[4KVM-DEBUG] ${output}`);
};

const logError = (message, error) => {
    OmniBox.log("error", `[4KVM-DEBUG] ${message}: ${error.message || error}`);
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

/**
 * 嗅探播放页，兜底提取真实视频地址
 */
const sniff4kvmPlay = async (playUrl) => {
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
* 标准化URL
*/
const normalizeUrl = (url) => {
    if (!url) return url;
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('/')) return `${config.host}${url}`;
    return url;
};

/**
* 提取视频基本信息
*/
const extractVideoBasic = ($item) => {
    try {
        const link = normalizeUrl(
            $item.find('a[href*="/play/"]').first().attr('href') ||
            $item.find('a').attr('href') ||
            $item.find('h3 a').attr('href') ||
            $item.find('.data h3 a').attr('href')
        );

        if (!link) return null;

        const title = (
            $item.find('h3').first().text().trim() ||
            $item.find('.data h3').text().trim() ||
            $item.find('img').attr('alt') ||
            $item.find('a').attr('title') ||
            '未知标题'
        );

        const img = normalizeUrl(
            $item.find('img').attr('data-src') ||
            $item.find('img').attr('src')
        );

        const remarks = (
            $item.find('.absolute.bottom-0 span').last().text().trim() ||
            $item.find('.text-xs.text-gray-400').last().text().trim() ||
            $item.find('.rating, .imdb, .vote').text().trim() ||
            $item.find('.year, .date, span').text().trim() ||
            $item.find('.type, .genre, .tag').text().trim() ||
            ''
        );

        return {
            vod_id: link,
            vod_name: title,
            vod_pic: img || '',
            vod_remarks: remarks
        };
    } catch (error) {
        logError("提取视频信息失败", error);
        return null;
    }
};

/**
* 获取视频列表
*/
const getVideoList = ($, selector = '.movie-card, article, .items article, .content article') => {
    const videos = [];
    $(selector).each((_, element) => {
        const videoInfo = extractVideoBasic($(element));
        if (videoInfo) {
            videos.push(videoInfo);
        }
    });
    return videos;
};

const getSearchVideoList = ($) => {
    const videos = [];
    const seen = new Set();

    $('a[href^="/play/"]').each((_, element) => {
        const $a = $(element);
        const href = normalizeUrl($a.attr('href'));
        if (!href || seen.has(href)) return;

        const title = (
            $a.find('h3').first().text().trim() ||
            $a.find('img').attr('alt') ||
            $a.attr('title') ||
            ''
        );
        if (!title) return;

        const pic = normalizeUrl($a.find('img').attr('data-src') || $a.find('img').attr('src'));
        const remarks = (
            $a.find('.absolute.top-2.right-2').text().trim() ||
            $a.find('.absolute.bottom-0 p').text().trim() ||
            ''
        );

        seen.add(href);
        videos.push({
            vod_id: href,
            vod_name: title,
            vod_pic: pic || '',
            vod_remarks: remarks,
        });
    });

    return videos;
};

/**
* 智能检测集数
*/
const getEpisodeCount = ($seasonData, pageHtml) => {
    try {
        // 方法1: 精确容器检测
        const episodeContainer = $seasonData('.jujiepisodios');
        if (episodeContainer.length) {
            const episodeLinks = episodeContainer.find('a');
            const episodeNumbers = [];
            episodeLinks.each((_, el) => {
                const text = $seasonData(el).text().trim();
                if (text) {
                    const num = parseInt(text);
                    if (num >= 1 && num <= 500) {
                        episodeNumbers.push(num);
                    }
                }
            });
            if (episodeNumbers.length > 0) {
                const result = Math.max(...episodeNumbers);
                logInfo("集数检测命中方法1: .jujiepisodios", { count: result, samples: episodeNumbers.slice(0, 10) });
                return result;
            }
            logInfo("集数检测方法1未命中: .jujiepisodios无有效数字");
        }

        // 方法2: JavaScript数据提取
        const videoMatches = pageHtml.match(/video.*?=.*?\[(.*?)\]/gi);
        if (videoMatches) {
            for (const match of videoMatches) {
                const episodeNames = match.match(/"name"\s*:\s*(\d+)/g);
                if (episodeNames && episodeNames.length >= 5) {
                    const numbers = episodeNames.map(m => parseInt(m.match(/\d+/)[0]));
                    const sorted = [...new Set(numbers)].sort((a, b) => a - b);
                    if (sorted[0] === 1 && sorted[sorted.length - 1] - sorted[0] === sorted.length - 1) {
                        const result = Math.max(...sorted);
                        logInfo("集数检测命中方法2: JS数据", { count: result, samples: sorted.slice(0, 10) });
                        return result;
                    }
                }
            }
            logInfo("集数检测方法2未命中: JS数据未形成连续集数");
        }

        // 方法3: 文本模式匹配
        const pageText = $seasonData.text();
        const patterns = [/共(\d+)集/, /全(\d+)集/, /更新至(\d+)集/, /第(\d+)集/];
        for (const pattern of patterns) {
            const matches = pageText.match(pattern);
            if (matches && matches[1]) {
                const result = parseInt(matches[1]);
                logInfo("集数检测命中方法3: 文本模式", { pattern: String(pattern), count: result });
                return result;
            }
        }
        logInfo("集数检测方法3未命中: 文本模式无匹配");

        // 默认值
        const fallbackCount = $seasonData('iframe, video, .player').length ? 24 : 1;
        logInfo("集数检测走默认值", { count: fallbackCount, hasPlayer: $seasonData('iframe, video, .player').length > 0 });
        return fallbackCount;
    } catch (error) {
        logError("检测集数失败", error);
        return 1;
    }
};

/**
* 获取季度集数信息
*/
const getSeasonEpisodes = async ($, detailUrl) => {
    const seasonSources = [];

    try {
        const seasonLinks = $('.seasons-list a, .season-item a, .se-c a, .se-a a, .seasons a');

        let episodeCount = 500;
        const customFields = $(".custom_fields");
        if (customFields.length) {
            const spanText = customFields.last().find("span").last().text().trim();
            const parsed = parseInt(spanText, 10);
            if (!Number.isNaN(parsed) && parsed > 0) {
                episodeCount = parsed;
                OmniBox.log("info", `集数检测命中方法0: .custom_fields span ${episodeCount}`)
            }
        }

        for (let i = 0; i < seasonLinks.length; i++) {
            const $season = seasonLinks.eq(i);
            const seasonTitle = $season.text().trim() || '第1季';
            const seasonUrl = normalizeUrl($season.attr('href'));

            if (!seasonUrl) continue;

            try {
                logInfo(`获取季度信息: ${seasonTitle}，seasonUrl：${seasonUrl}`);
                const seasonResp = await axiosInstance.get(seasonUrl, { headers: config.headers });
                const $seasonData = cheerio.load(seasonResp.data);
                if (seasonLinks.length > 1) {
                    episodeCount = getEpisodeCount($seasonData, seasonResp.data);
                }
                const limitedCount = Math.min(Math.max(episodeCount, 1), episodeCount);

                logInfo(`${seasonTitle} 集数: ${limitedCount}`);

                const episodes = [];
                if (limitedCount === 1) {
                    episodes.push({ name: '第1集', url: seasonUrl });
                } else {
                    for (let epNum = 1; epNum <= limitedCount; epNum++) {
                        const episodeTitle = `第${epNum}集`;
                        const episodeUrl = `${seasonUrl}?ep=${epNum}`;
                        episodes.push({ name: episodeTitle, url: episodeUrl });
                    }
                }

                if (episodes.length > 0) {
                    seasonSources.push({ name: seasonTitle, episodes });
                }
            } catch (error) {
                logError("获取季度失败", error);
                seasonSources.push({ name: seasonTitle, episodes: [{ name: '第1集', url: seasonUrl }] });
            }
        }
    } catch (error) {
        logError("获取季度列表失败", error);
    }

    return seasonSources;
};

/**
* 提取播放选项
*/
const extractPlayOptions = ($, detailUrl) => {
    const playLinks = [];
    const playOptions = $('#playeroptions ul li, .dooplay_player_option');

    playOptions.each((_, element) => {
        const $option = $(element);
        let title = $option.find('.title, span.title').text().trim() || '播放';
        const server = $option.find('.server, span.server').text().trim();

        if (server) {
            title = `${title}-${server}`;
        }

        const dataPost = $option.attr('data-post');
        const dataNume = $option.attr('data-nume');
        const dataType = $option.attr('data-type');

        if (dataPost && dataNume) {
            const playUrl = `${detailUrl}?post=${dataPost}&nume=${dataNume}&type=${dataType || 'movie'}`;
            playLinks.push(`${title}$${playUrl}`);
        }
    });

    return playLinks;
};

/**
* 将播放链接数组转换为 vod_play_sources 格式
* 拼接格式: URL|视频名|集数名
*/
const parsePlaySources = (playLinks, vodName, videoId = "") => {
    if (!playLinks || playLinks.length === 0) {
        return [];
    }
    const episodes = playLinks.map((link, epIndex) => {
        const parts = link.split('$');
        const episodeName = parts[0] || '正片';
        const actualUrl = parts[1] || parts[0];
        const fid = `${videoId}#0#${epIndex}`;
        const combinedId = `${actualUrl}|||${encodeMeta({ sid: String(videoId || ""), fid, v: vodName || "", e: episodeName })}`;

        return {
            name: episodeName,
            playId: combinedId,
            _fid: fid,
            _rawName: episodeName,
        };
    }).filter(e => e.playId);

    return [{
        name: '4KVM',
        episodes: episodes
    }];
};

const buildSeasonPlaySources = (seasonSources, vodName, videoId = "") => {
    if (!seasonSources || seasonSources.length === 0) {
        return [];
    }
    return seasonSources.map((season, seasonIndex) => {
        const episodes = (season.episodes || []).map((ep, epIndex) => {
            const episodeName = ep.name || '正片';
            const actualUrl = ep.url || '';
            const fid = `${videoId}#${seasonIndex}#${epIndex}`;
            const combinedId = `${actualUrl}|||${encodeMeta({ sid: String(videoId || ""), fid, v: vodName || "", e: episodeName })}`;
            return {
                name: episodeName,
                playId: combinedId,
                _fid: fid,
                _rawName: episodeName,
            };
        }).filter(e => e.playId);

        return {
            name: season.name || `线路${seasonIndex + 1}`,
            episodes: episodes
        };
    }).filter(source => (source.episodes || []).length > 0);
};

const extractEpisodePlaySources = ($, vodName, videoId = "") => {
    const sourcesMap = new Map();

    $('.episode-link[data-line][data-episode]').each((_, element) => {
        const $el = $(element);
        const line = String($el.attr('data-line') || '1');
        const episodeNo = String($el.attr('data-episode') || '').trim();
        const dataId = String($el.attr('dataid') || '').trim();
        const href = normalizeUrl($el.attr('href') || '');
        const rawName = $el.find('span').last().text().trim() || episodeNo || '播放';
        const episodeName = /^\d+$/.test(rawName) ? `第${rawName}集` : rawName;
        if (!href) return;

        const sourceName = `线路${line}`;
        if (!sourcesMap.has(sourceName)) {
            sourcesMap.set(sourceName, []);
        }

        const fid = dataId || `${videoId}#${line}#${episodeNo || sourcesMap.get(sourceName).length + 1}`;
        const combinedId = `${href}|||${encodeMeta({ sid: String(videoId || ""), fid, v: vodName || "", e: episodeName })}`;
        sourcesMap.get(sourceName).push({
            name: episodeName,
            playId: combinedId,
            _fid: fid,
            _rawName: rawName || episodeName,
            _episodeNumber: Number(episodeNo) || undefined,
        });
    });

    const sources = [];
    for (const [name, episodes] of sourcesMap.entries()) {
        episodes.sort((a, b) => Number(a._episodeNumber || 0) - Number(b._episodeNumber || 0));
        sources.push({ name, episodes });
    }
    return sources;
};
/**
* 过滤电视剧内容
*/
const filterTVShowsOnly = (videoList) => {
    const movieKeywords = ['/movies/', '/movie/'];
    const tvshowKeywords = ['/tvshows/', '/tvshow/', '/seasons/'];

    return videoList.filter(video => {
        const vodId = video.vod_id || '';
        const isMovie = movieKeywords.some(keyword => vodId.includes(keyword));
        if (isMovie) return false;

        const isTvshow = tvshowKeywords.some(keyword => vodId.includes(keyword));
        return isTvshow || !isMovie;
    });
};

/**
* 过滤搜索结果
*/
const filterSearchResults = (results, searchKey) => {
    if (!results || !searchKey) return results;

    const searchKeyLower = searchKey.toLowerCase().trim();
    const searchWords = searchKeyLower.split(/\s+/);
    const scoredResults = [];

    for (const result of results) {
        const title = (result.vod_name || '').toLowerCase();
        let score = 0;

        // 计算相关性分数
        if (searchKeyLower === title) {
            score = 100;
        } else if (title.includes(searchKeyLower)) {
            score = 80;
        } else if (title.startsWith(searchKeyLower)) {
            score = 70;
        } else if (searchWords.every(word => title.includes(word))) {
            score = 60;
        } else {
            const wordMatches = searchWords.filter(word => title.includes(word)).length;
            if (wordMatches > 0) {
                score = 30 + (wordMatches * 10);
            } else {
                continue;
            }
        }

        // 内容类型加分
        if (searchKeyLower.includes('剧') && result.vod_id.includes('tvshows')) {
            score += 5;
        } else if (searchKeyLower.includes('电影') && result.vod_id.includes('movies')) {
            score += 5;
        }

        scoredResults.push({ score, result });
    }

    // 排序
    scoredResults.sort((a, b) => b.score - a.score);

    // 过滤低分结果
    const minScore = searchWords.length > 1 ? 30 : 40;
    let filtered = scoredResults.filter(item => item.score >= minScore).map(item => item.result);

    // 如果结果太少,放宽标准
    if (filtered.length < 3 && scoredResults.length > 3) {
        filtered = scoredResults.slice(0, 10).map(item => item.result);
    }

    return filtered;
};

/**
 * 预处理标题，去掉常见干扰项
 */
function preprocessTitle(title) {
    if (!title) return "";
    return title
        .replace(/4[kK]|[xX]26[45]|720[pP]|1080[pP]|2160[pP]|1280x720|1920x1080/g, " ")
        .replace(/[hH]\.?26[45]/g, " ")
        .replace(/BluRay|WEB-DL|HDR|REMUX/gi, " ")
        .replace(/\.mp4|\.mkv|\.avi|\.flv/gi, " ");
}

/**
 * 将中文数字转换为阿拉伯数字 (简单实现)
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
 * 核心：从标题中提取集数数字
 */
function extractEpisode(title) {
    if (!title) return "";

    const processedTitle = preprocessTitle(title).trim();

    // 1. S01E03 格式
    const seMatch = processedTitle.match(/[Ss](?:\d{1,2})?[-._\s]*[Ee](\d{1,3})/i);
    if (seMatch) return seMatch[1];

    // 2. 中文格式：第XX集/话
    const cnMatch = processedTitle.match(/第\s*([零一二三四五六七八九十0-9]+)\s*[集话章节回期]/);
    if (cnMatch) return String(chineseToArabic(cnMatch[1]));

    // 3. EP/E 格式
    const epMatch = processedTitle.match(/\b(?:EP|E)[-._\s]*(\d{1,3})\b/i);
    if (epMatch) return epMatch[1];

    // 4. 括号格式 [03]
    const bracketMatch = processedTitle.match(/[\[\(【（](\d{1,3})[\]\)】）]/);
    if (bracketMatch) {
        const num = bracketMatch[1];
        // 排除常见分辨率
        if (!["720", "1080", "480"].includes(num)) return num;
    }

    // 5. 独立的数字 (排除常见的视频参数)
    const standaloneMatches = processedTitle.match(/(?:^|[\s\-\._\[\]])(\d{1,3})(?![0-9pP])/g);
    if (standaloneMatches) {
        const candidates = standaloneMatches
            .map(m => m.match(/\d+/)[0])
            .filter(num => {
                const n = parseInt(num);
                return n > 0 && n < 300 && !["720", "480", "264", "265"].includes(num);
            });

        if (candidates.length > 0) {
            // 优先取 1-99 之间的
            const normalEp = candidates.find(n => parseInt(n) < 100);
            return normalEp || candidates[0];
        }
    }

    return "";
}

/**
* 根据播放URL推断文件名(用于弹幕匹配)
*/
function inferFileNameFromURL(url) {
    try {
        const urlObj = new URL(url);
        let base = urlObj.pathname.split("/").pop() || "";

        // 去掉扩展名
        const dotIndex = base.lastIndexOf(".");
        if (dotIndex > 0) {
            base = base.substring(0, dotIndex);
        }

        // 清理分隔符
        base = base.replace(/[_-]/g, " ").replace(/\./g, " ").trim();

        return base || url;
    } catch (error) {
        return url;
    }
}

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

// ========== 接口实现 ==========

/**
* 首页
*/
async function home(params) {
    logInfo("进入首页");

    try {
        const response = await axiosInstance.get(config.host, { headers: config.headers });
        const $ = cheerio.load(response.data);

        const classes = [];
        const seen = new Set();
        $('nav a.nav-item').each((_, element) => {
            const $el = $(element);
            const link = normalizeUrl($el.attr('href'));
            const name = $el.text().trim();
            if (!link || !name || ['首页', '影片下载', '片单'].includes(name)) return;
            if (!/^https?:\/\/www\.4kvm\.org\/(movie|tv|anime|filter)/.test(link)) return;
            if (seen.has(link)) return;
            seen.add(link);
            classes.push({ type_id: link, type_name: name });
        });

        const homeList = getVideoList($, '.movie-card');

        logInfo(`分类获取完成,共 ${classes.length} 个`);

        return {
            class: classes,
            list: homeList
        };
    } catch (error) {
        logError("首页获取失败", error);
        return {
            class: [
                { 'type_id': `${config.host}/movie`, 'type_name': '电影' },
                { 'type_id': `${config.host}/tv`, 'type_name': '电视剧' },
                { 'type_id': `${config.host}/anime`, 'type_name': '动漫' },
                { 'type_id': `${config.host}/filter`, 'type_name': '筛选' }
            ],
            list: []
        };
    }
}

/**
* 分类
*/
async function category(params) {
    const { categoryId, page } = params;
    const pg = parseInt(page) || 1;
    logInfo(`请求分类: ${categoryId}, 页码: ${pg}`);

    try {
        let url = categoryId;
        if (pg > 1) {
            url = categoryId.includes('?')
                ? `${categoryId}&page=${pg}`
                : `${categoryId}?page=${pg}`;
        }

        const response = await axiosInstance.get(url, { headers: config.headers });
        const $ = cheerio.load(response.data);

        let videoList = getVideoList($, '.movie-card');

        if (categoryId.includes('/tv')) {
            videoList = filterTVShowsOnly(videoList);
        }

        logInfo(`获取到 ${videoList.length} 个视频`);

        return {
            list: videoList,
            page: pg,
            pagecount: videoList.length > 0 ? pg + 1 : pg
        };
    } catch (error) {
        logError("分类请求失败", error);
        return { list: [], page: pg, pagecount: 0 };
    }
}

/**
* 详情
*/
async function detail(params) {
    const videoId = params.videoId;
    logInfo(`请求详情 ID: ${videoId}`);

    try {
        const response = await axiosInstance.get(videoId, { headers: config.headers });
        const $ = cheerio.load(response.data);

        const detailMap = {};
        $('.grid .text-gray-500').each((_, el) => {
            const key = $(el).text().trim();
            const value = $(el).next('div').text().trim();
            if (key && value) detailMap[key] = value;
        });

        const metaDesc = $('meta[name="description"]').attr('content') || '';
        const metaPic = $('meta[property="og:image"]').attr('content') || '';
        const metaKeywords = $('meta[name="keywords"]').attr('content') || '';
        const keywordParts = metaKeywords.split(',').map((s) => s.trim()).filter(Boolean);

        const vod = {
            vod_id: videoId,
            vod_name: $('h1.text-xl, h1').first().text().trim() || $('meta[property="og:title"]').attr('content')?.replace(/\s*-\s*第\d+集.*$/, '') || '未知标题',
            vod_pic: normalizeUrl($('.video-player').attr('data-poster') || $('.video-player img').attr('src') || metaPic),
            vod_content: $('.bg-dark-800 p.text-xs.text-gray-300.leading-relaxed').first().text().trim() || metaDesc.trim(),
            vod_year: detailMap['年份'] || '',
            vod_area: detailMap['地区'] || detailMap['国家/地区'] || '',
            vod_remarks: detailMap['状态'] || $('.text-xs.text-gray-500').filter((_, el) => $(el).text().includes('更新')).first().text().trim() || '',
            vod_actor: detailMap['主演'] || '',
            vod_director: detailMap['导演'] || ''
        };

        const genres = [];
        if (detailMap['类型']) genres.push(...detailMap['类型'].split('/').map((s) => s.trim()).filter(Boolean));
        if (genres.length === 0 && keywordParts.length > 1) {
            const maybeType = keywordParts.filter((s) => !/^\d+(\.\d+)?$/.test(s) && s !== vod.vod_name && s !== vod.vod_director);
            if (maybeType.length > 0) genres.push(maybeType[0]);
        }
        if (genres.length > 0) {
            vod.type_name = genres.join(', ');
        }

        logInfo(`视频标题: ${vod.vod_name}`);

        // 获取播放链接：优先使用新前端已渲染好的选集锚点
        let playLinks = extractPlayOptions($, videoId);
        let seasonSources = [];
        const videoIdForScrape = String(videoId || "");
        let playSources = extractEpisodePlaySources($, vod.vod_name, videoIdForScrape);

        // 旧结构兜底
        if (playSources.length === 0) {
            const seasonLinks = $('.seasons-list a, .season-item a, .se-c a, .se-a a, .seasons a');
            if (playLinks.length === 0 && seasonLinks.length > 0) {
                seasonSources = await getSeasonEpisodes($, videoId);
                if (seasonSources.length === 0) {
                    playLinks = [`播放$${videoId}`];
                }
            } else if (playLinks.length === 0) {
                playLinks = [`播放$${videoId}`];
            }

            playSources = seasonSources.length > 0
                ? buildSeasonPlaySources(seasonSources, vod.vod_name, videoIdForScrape)
                : parsePlaySources(playLinks, vod.vod_name, videoIdForScrape);
        }

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
                const scrapingResult = await OmniBox.processScraping(videoIdForScrape, vod.vod_name || "", vod.vod_name || "", scrapeCandidates);
                OmniBox.log("info", `[4KVM-DEBUG] 刮削处理完成,结果: ${JSON.stringify(scrapingResult || {}).substring(0, 200)}`);

                const metadata = await OmniBox.getScrapeMetadata(videoIdForScrape);
                scrapeData = metadata?.scrapeData || null;
                videoMappings = metadata?.videoMappings || [];
                scrapeType = metadata?.scrapeType || "";
                logInfo("刮削元数据读取完成", { hasScrapeData: !!scrapeData, mappingCount: videoMappings.length, scrapeType });
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
                    OmniBox.log("info", `[4KVM-DEBUG] 应用刮削后源文件名: ${oldName} -> ${newName}`);
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

        vod.vod_play_sources = playSources.map((source) => ({
            name: source.name,
            episodes: (source.episodes || []).map((ep) => ({
                name: ep.name,
                playId: ep.playId,
            })),
        }));

        if (scrapeData) {
            vod.vod_name = scrapeData.title || vod.vod_name;
            if (scrapeData.posterPath) {
                vod.vod_pic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
            }
            if (scrapeData.overview) {
                vod.vod_content = scrapeData.overview;
            }
            if (scrapeData.releaseDate) {
                vod.vod_year = String(scrapeData.releaseDate).substring(0, 4) || vod.vod_year;
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

        const totalEpisodes = playSources.reduce((sum, source) => sum + (source.episodes || []).length, 0);
        logInfo(`播放线路数: ${playSources.length}, 总集数: ${totalEpisodes}`);

        return {
            list: [vod]
        };
    } catch (error) {
        logError("详情获取失败", error);
        return { list: [] };
    }
}

/**
* 搜索
*/
async function search(params) {
    const wd = params.keyword || params.wd || "";
    const pg = parseInt(params.page) || 1;
    logInfo(`搜索关键词: ${wd}, 页码: ${pg}`);

    try {
        let searchUrl = `${config.host}/search?q=${encodeURIComponent(wd)}`;
        if (pg > 1) {
            searchUrl += `&page=${pg}`;
        }

        const response = await axiosInstance.get(searchUrl, { headers: config.headers });
        const $ = cheerio.load(response.data);

        const rawResults = getSearchVideoList($);
        const filteredResults = filterSearchResults(rawResults, wd);

        logInfo(`搜索到 ${filteredResults.length} 个结果`);

        return {
            list: filteredResults,
            page: pg,
            pagecount: filteredResults.length > 0 ? pg + 1 : pg
        };
    } catch (error) {
        logError("搜索失败", error);
        return { list: [], page: pg, pagecount: 0 };
    }
}

/**
* 播放
*/
async function play(params) {
    let playId = params.playId;
    const flag = params.flag || "";
    logInfo(`准备播放 ID: ${playId}, flag: ${flag}`);

    let vodName = "";
    let episodeName = "";
    let playMeta = {};

    // 关键修改：解析透传参数
    if (playId && playId.includes("|||")) {
        const [mainPlayId, metaB64] = playId.split("|||");
        playId = mainPlayId;
        playMeta = decodeMeta(metaB64 || "");
        vodName = playMeta.v || "";
        episodeName = playMeta.e || "";
        logInfo(`解析透传信息 - 视频: ${vodName}, 集数: ${episodeName}`);
    } else if (playId && playId.includes('|')) {
        // 兼容旧格式
        const parts = playId.split('|');
        playId = parts[0];      // 真正的 URL
        vodName = parts[1] || "";
        episodeName = parts[2] || "";
        logInfo(`解析透传信息 - 视频: ${vodName}, 集数: ${episodeName}`);
    }

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
        logInfo(`读取刮削元数据失败: ${error.message}`);
    }

    try {
        // 解析参数
        let dataPost = null;
        let dataNume = null;
        let dataType = null;
        let baseUrl = playId;

        if (playId.includes('?')) {
            const [url, queryParams] = playId.split('?', 2);
            baseUrl = url;
            const paramPairs = queryParams.split('&');
            for (const pair of paramPairs) {
                const [key, value] = pair.split('=');
                if (key === 'post') dataPost = value;
                if (key === 'nume') dataNume = value;
                if (key === 'type') dataType = value;
            }
        }

        let playResponse = {
            urls: [{ name: "4KVM", url: playId }],
            parse: 1,
            header: PLAY_HEADERS
        };

        // API调用
        if (dataPost && dataNume) {
            try {
                const apiUrl = `${config.host}/wp-json/dooplayer/v1/post/${dataPost}`;
                const apiResponse = await axiosInstance.get(apiUrl, {
                    headers: config.headers,
                    params: {
                        type: dataType || 'movie',
                        source: dataNume
                    }
                });

                if (apiResponse.status === 200 && apiResponse.data.embed_url) {
                    const embedUrl = apiResponse.data.embed_url;
                    const parseFlag = ['.m3u8', '.mp4', '.flv', '.avi'].some(ext =>
                        embedUrl.toLowerCase().includes(ext)
                    ) ? 0 : 1;

                    logInfo(`API解析成功: ${embedUrl}`);
                    playResponse.urls = [{ name: "4KVM", url: embedUrl }];
                    playResponse.parse = parseFlag;
                }
            } catch (error) {
                logError("API调用失败", error);
            }
        }

        // 如果API调用失败，页面解析回退
        if (playResponse.urls[0].url === playId) {
            const response = await axiosInstance.get(baseUrl, { headers: config.headers });
            const $ = cheerio.load(response.data);

            // 查找iframe
            const iframe = $('iframe.metaframe, .dooplay_player iframe, .player iframe').first().attr('src');
            if (iframe) {
                const iframeUrl = normalizeUrl(iframe);
                const parseFlag = ['.m3u8', '.mp4', '.flv'].some(ext =>
                    iframeUrl.toLowerCase().includes(ext)
                ) ? 0 : 1;

                logInfo(`Iframe解析: ${iframeUrl}`);
                playResponse.urls = [{ name: "4KVM", url: iframeUrl }];
                playResponse.parse = parseFlag;
            } else {
                // 查找video标签
                const videoSrc = normalizeUrl($('video source, video').first().attr('src'));
                if (videoSrc) {
                    logInfo(`Video标签解析: ${videoSrc}`);
                    playResponse.urls = [{ name: "4KVM", url: videoSrc }];
                    playResponse.parse = 0;
                }
            }
        }

        if (playResponse.urls[0]?.url && !playResponse.urls[0]?.url.match(/\.(m3u8|mp4|flv|avi|mkv|ts)/i)) {
            const sniffResult = await sniff4kvmPlay(playResponse.urls[0].url);
            if (sniffResult) {
                playResponse = sniffResult;
            }
        }

        OmniBox.log("info", `使用默认播放：${playId}`);

        OmniBox.log("info", `DANMU_API: ${DANMU_API}, params.vodName：${params.vodName}`);

        // 弹幕匹配
        if (DANMU_API && (vodName || params.vodName)) {
            const finalVodName = vodName || params.vodName;
            const finalEpisodeName = episodeName || params.episodeName || '';

            const fileName = scrapedDanmuFileName || buildFileNameForDanmu(finalVodName, finalEpisodeName);
            logInfo(`尝试匹配弹幕文件名: ${fileName}`);

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
        const fallbackSniff = await sniff4kvmPlay(playId);
        if (fallbackSniff) {
            return fallbackSniff;
        }
        return {
            urls: [{ name: "4KVM", url: playId }],
            parse: 1,
            header: PLAY_HEADERS
        };
    }
}

module.exports = { home, category, search, detail, play };

const runner = require("spider_runner");
runner.run(module.exports);

});

_load(2, "88看球", function (module, exports, require) {
// @name 88看球
// @dependencies: axios, cheerio, crypto-js
// @version 1.1.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/88看球.js
/**
 * 刮削：不支持
 * 弹幕：不支持
 * 嗅探：不支持
 *
 * 说明：
 * 1. 本脚本由 `本地调试/88看球.js` 转换为 OmniBox 标准模板结构。
 * 2. 接口包含：`home` / `category` / `search` / `detail` / `play`。
 * 3. 详情接口将旧式 `vod_play_from + vod_play_url` 转换为 `vod_play_sources`。
 * 4. `playId` 使用 Base64(JSON) 透传，播放阶段解码后按原逻辑返回 `parse=1`。
 *
 * 变更记录：
 * - v1.1.0：网站改版，分类由4大类改为24子类，移除无效筛选；play-url API 改为 /source
 *
 * 环境变量：
 * - `KANQIU_HOST`：88看球域名，默认 `http://www.88kanqiu.cc`
 */

const axios = require("axios");
const http = require("http");
const https = require("https");
const cheerio = require("cheerio");
const CryptoJS = require("crypto-js");
const OmniBox = require("omnibox_sdk");

// ==================== 配置区域 ====================
const HOST = process.env.KANQIU_HOST || "http://www.88kanqiu.cc";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const DEFAULT_PIC = "https://pic.imgdb.cn/item/657673d6c458853aeff94ab9.jpg";

const DEFAULT_HEADERS = {
  "User-Agent": UA,
  Referer: `${HOST}/`,
};

const axiosInstance = axios.create({
  timeout: 60 * 1000,
  httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
  httpAgent: new http.Agent({ keepAlive: true }),
});

// ==================== 日志工具 ====================
function logInfo(message, data = null) {
  const output = data ? `${message}: ${JSON.stringify(data)}` : message;
  OmniBox.log("info", `[88看球] ${output}`);
}

function logError(message, error) {
  OmniBox.log("error", `[88看球] ${message}: ${error?.message || error}`);
}

// ==================== 编解码工具 ====================
function e64(text) {
  try {
    return CryptoJS.enc.Utf8.parse(String(text || "")).toString(CryptoJS.enc.Base64);
  } catch {
    return "";
  }
}

function d64(encodedText) {
  try {
    return CryptoJS.enc.Base64.parse(String(encodedText || "")).toString(CryptoJS.enc.Utf8);
  } catch {
    return "";
  }
}

/**
 * 兼容多种 id 格式，提取真实详情 URL 与展示名称
 * 支持：
 * 1) 新格式：Base64(JSON.stringify({ gameId, playUrl, name }))
 * 2) 旧格式：Base64(JSON.stringify({ vid, name }))
 * 3) 旧格式：`${vid}###${encodeURIComponent(name)}`
 * 4) 兜底：直接把入参当 URL
 */
function parseVodId(rawId) {
  const idText = String(rawId || "");
  let realId = idText;
  let displayName = "赛事直播";
  let gameId = "";
  let playUrl = "";

  const jsonText = d64(idText);
  if (jsonText && (jsonText.startsWith("{") || jsonText.startsWith("["))) {
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed?.gameId || parsed?.playUrl) {
        realId = String(parsed.playUrl || parsed.vid || "");
        displayName = String(parsed.name || displayName);
        gameId = String(parsed.gameId || "");
        playUrl = String(parsed.playUrl || "");
        return { realId, displayName, gameId, playUrl };
      }
      if (parsed?.vid) {
        realId = String(parsed.vid);
        displayName = String(parsed.name || displayName);
        const match = realId.match(/\/live\/(\d+)\//);
        if (match) gameId = match[1];
        playUrl = realId;
        return { realId, displayName, gameId, playUrl };
      }
    } catch {
      // 忽略，继续尝试旧格式
    }
  }

  if (idText.includes("###")) {
    const parts = idText.split("###", 2);
    realId = parts[0] || "";
    displayName = decodeURIComponent(parts[1] || "赛事直播");
    const match = realId.match(/\/live\/(\d+)\//);
    if (match) gameId = match[1];
    playUrl = realId;
    return { realId, displayName, gameId, playUrl };
  }

  const m = idText.match(/\/live\/(\d+)\//);
  if (m) gameId = m[1];
  playUrl = idText;
  return { realId, displayName, gameId, playUrl };
}

/**
 * 从 `-url` 接口返回中提取 links，兼容不同返回形态
 */
function parseLinksFromPlayApiResponse(responseData) {
  const raw = responseData?.data;

  if (Array.isArray(raw?.links)) {
    return raw.links;
  }

  if (typeof raw === "object" && Array.isArray(raw?.links)) {
    return raw.links;
  }

  if (typeof raw !== "string") {
    return [];
  }

  const candidates = [
    raw,
    raw.substring(6, Math.max(6, raw.length - 2)),
  ].filter(Boolean);

  for (const item of candidates) {
    // 尝试直接 JSON
    try {
      const direct = JSON.parse(item);
      if (Array.isArray(direct?.links)) return direct.links;
    } catch {
      // ignore
    }

    // 尝试 Base64(JSON)
    try {
      const decoded = Buffer.from(item, "base64").toString();
      const parsed = JSON.parse(decoded || "{}");
      if (Array.isArray(parsed?.links)) return parsed.links;
    } catch {
      // ignore
    }
  }

  return [];
}

// ==================== 业务工具 ====================
function getClasses() {
  return [
    { type_id: "", type_name: "全部直播" },
    { type_id: "1", type_name: "NBA" },
    { type_id: "2", type_name: "CBA" },
    { type_id: "20", type_name: "WNBA" },
    { type_id: "4", type_name: "篮球综合" },
    { type_id: "3", type_name: "世界杯" },
    { type_id: "8", type_name: "英超" },
    { type_id: "9", type_name: "西甲" },
    { type_id: "10", type_name: "意甲" },
    { type_id: "14", type_name: "德甲" },
    { type_id: "15", type_name: "法甲" },
    { type_id: "12", type_name: "欧冠" },
    { type_id: "13", type_name: "欧联" },
    { type_id: "7", type_name: "中超" },
    { type_id: "11", type_name: "亚冠" },
    { type_id: "27", type_name: "足总杯" },
    { type_id: "26", type_name: "美职联" },
    { type_id: "31", type_name: "中甲" },
    { type_id: "23", type_name: "足球综合" },
    { type_id: "21", type_name: "体育电视台" },
    { type_id: "29", type_name: "网球" },
    { type_id: "25", type_name: "NFL" },
    { type_id: "19", type_name: "羽毛球" },
    { type_id: "38", type_name: "棒球" },
  ];
}

function getFilters() {
  return {};
}

/**
 * 获取分类列表
 * @param {string} type 分类 ID
 * @param {Object} extend 扩展筛选
 * @returns {Promise<{list:Array,page:number,pagecount:number,limit:number}>}
 */
async function getCategoryList(type, extend = {}) {
  try {
    const cateId = extend?.cateId || type || "";
    const path = cateId ? `/match/${cateId}/live` : "";
    const url = `${HOST}${path}`;

    const response = await axiosInstance.get(url, { headers: { ...DEFAULT_HEADERS } });
    const $ = cheerio.load(response.data || "");

    const list = [];
    $(".list-group-item.group-game-item").each((_, element) => {
      const $el = $(element);
      const time = $el.find(".category-game-time").text()?.trim() || "";
      const gameType = $el.find(".game-type").text()?.trim() || "";
      const teamNames = $el.find(".team-name");
      const homeTeam = teamNames.length > 0 ? teamNames.first().text().trim() : "";
      const awayTeam = teamNames.length > 1 ? teamNames.last().text().trim() : "";

      const name = `${time} ${gameType} ${homeTeam} vs ${awayTeam}`.trim();
      if (!name || name === "vs") return;

      const payBtn = $el.find(".pay-btn");
      const gameId = payBtn.attr("data-id") || "";

      const btnPrimary = $el.find(".btn.btn-primary");
      const btnDefault = $el.find(".btn.btn-default");
      const btn = btnPrimary.length > 0 ? btnPrimary : btnDefault;

      let playUrl = "";
      let remark = "暂无";
      if (btn.length > 0) {
        playUrl = `${HOST}${btn.attr("href") || ""}`;
        remark = btn.text().trim().replace(/\s+/g, " ") || "暂无";
      }

      const imgs = $el.find("img.team-logo");
      let pic = imgs.length > 0 ? imgs.first().attr("data-src") || imgs.first().attr("src") || "" : "";
      if (!pic) pic = DEFAULT_PIC;
      if (!String(pic).startsWith("http")) pic = `${HOST}${pic}`;

      if (!gameId && !playUrl) return;

      const encodedId = e64(JSON.stringify({ gameId, playUrl, name }));
      list.push({
        vod_id: encodedId,
        vod_name: name,
        vod_pic: pic,
        vod_remarks: remark,
      });
    });

    return {
      list,
      page: 1,
      pagecount: 1,
      limit: list.length,
    };
  } catch (error) {
    logError("获取分类列表失败", error);
    return { list: [], page: 1, pagecount: 1, limit: 0 };
  }
}

/**
 * 拉取详情并转换播放源
 * @param {string} rawId 列表中的 vod_id
 * @returns {Promise<Object|null>}
 */
async function getDetailById(rawId) {
  try {
    const { realId, displayName, gameId, playUrl } = parseVodId(rawId);

    if (!realId && !gameId) {
      return null;
    }

    const gid = gameId || realId.match(/\/live\/(\d+)\//)?.[1] || "";
    const pageUrl = playUrl || realId;

    if (gid) {
      const playUrlApi = `${HOST}/live/${gid}/source`;
      try {
        const response = await axiosInstance.get(playUrlApi, {
          headers: {
            ...DEFAULT_HEADERS,
            Referer: `${HOST}/live/${gid}/play`,
          },
        });

        const links = parseLinksFromPlayApiResponse(response?.data);

        if (links && links.length > 0) {
          const episodes = links
            .filter((it) => it?.url)
            .map((it, index) => {
              const playData = {
                url: String(it.url || "").replace(/\*\*\*/g, "#"),
                headers: {
                  ...DEFAULT_HEADERS,
                  Referer: `${HOST}/live/${gid}/play`,
                },
                name: String(it.name || `直播源${index + 1}`),
              };
              return {
                name: String(it.name || `直播源${index + 1}`),
                playId: e64(JSON.stringify(playData)),
              };
            });

          return {
            vod_id: realId || gid,
            vod_name: displayName,
            vod_pic: "",
            vod_content: "实时体育直播",
            vod_play_sources: [
              {
                name: "88看球",
                episodes,
              },
            ],
          };
        }
      } catch (apiError) {
        logError("source 接口失败，回退到页面直链", apiError);
      }
    }

    if (pageUrl && pageUrl.startsWith("http")) {
      const playData = {
        url: pageUrl,
        headers: {
          ...DEFAULT_HEADERS,
        },
        name: "直播页",
      };
      return {
        vod_id: realId || gid,
        vod_name: displayName,
        vod_pic: "",
        vod_content: "实时体育直播",
        vod_play_sources: [
          {
            name: "88看球",
            episodes: [
              {
                name: "直播页",
                playId: e64(JSON.stringify(playData)),
              },
            ],
          },
        ],
      };
    }

    return null;
  } catch (error) {
    logError("获取详情失败", error);
    return null;
  }
}

// ==================== 标准接口：home ====================
/**
 * 首页数据（分类 + 筛选 + 推荐）
 */
async function home(params) {
  try {
    const classes = getClasses();
    const result = await getCategoryList("");

    return {
      class: classes,
      filters: getFilters(),
      list: result.list || [],
      page: 1,
      pagecount: 1,
      total: (result.list || []).length,
      limit: result.limit || (result.list || []).length,
    };
  } catch (error) {
    logError("home 失败", error);
    return {
      class: getClasses(),
      filters: getFilters(),
      list: [],
      page: 1,
      pagecount: 1,
      total: 0,
      limit: 0,
    };
  }
}

// ==================== 标准接口：category ====================
/**
 * 分类列表
 */
async function category(params) {
  try {
    const type = params?.id || params?.categoryId || params?.tid || "";
    const extend = params?.extend || params?.filters || {};
    const result = await getCategoryList(type, extend);

    return {
      list: result.list || [],
      page: 1,
      pagecount: 1,
      total: (result.list || []).length,
      limit: result.limit || (result.list || []).length,
    };
  } catch (error) {
    logError("category 失败", error);
    return {
      list: [],
      page: 1,
      pagecount: 1,
      total: 0,
      limit: 0,
    };
  }
}

// ==================== 标准接口：detail ====================
/**
 * 视频详情
 */
async function detail(params) {
  try {
    const id = params?.id || params?.videoId || "";
    const vod = await getDetailById(id);
    return {
      list: vod ? [vod] : [],
    };
  } catch (error) {
    logError("detail 失败", error);
    return { list: [] };
  }
}

// ==================== 标准接口：search ====================
/**
 * 搜索（源站暂无关键词搜索能力）
 */
async function search(params) {
  return {
    list: [],
    page: Number(params?.page || 1),
    pagecount: 1,
    total: 0,
    limit: 0,
  };
}

// ==================== 标准接口：play ==================== 
/**
 * 播放解析
 */
async function play(params) {
  try {
    const encoded = params?.id || params?.playId || "";
    const decoded = d64(encoded);
    const playData = JSON.parse(decoded || "{}");

    if (!playData?.url) {
      return {
        parse: 1,
        url: "",
        header: { ...DEFAULT_HEADERS },
      };
    }

    return {
      parse: 1,
      url: playData.url,
      header: {
        ...DEFAULT_HEADERS,
        ...(playData.headers || {}),
      },
    };
  } catch (error) {
    logError("play 失败", error);
    return {
      parse: 1,
      url: "",
      header: { ...DEFAULT_HEADERS },
    };
  }
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

_load(3, "LIBVIO", function (module, exports, require) {
// @name LIBVIO
// @author 梦
// @description 刮削：已接入，弹幕：已接入，播放记录：已接入，嗅探：不需要（直链优先，支持网盘线路展开）
// @dependencies
// @version 1.5.7
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/LIBVIO.js

const http = require("http");
const https = require("https");
const crypto = require("crypto");
const { URL } = require("url");
const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");

const HOST_CANDIDATES = [
    "https://www.libvio.lat",
    "https://www.libvios.com",
    "https://libvio.run",
    "https://www.libvio.mov",
    "https://www.libhd.com",
].map((item) => normalizeHost(item)).filter(Boolean);
const LIBVIO_RELEASE_URL = "https://www.libvio.app";
const HOST_CACHE_KEY = "libvio:active_host";
const HOST_CACHE_TTL = 60 * 60 * 24 * 30;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
let ACTIVE_HOST = HOST_CANDIDATES[0];

const DEFAULT_PAGE_SIZE = 12;
const HOME_CACHE_TTL = 60 * 15;
const CATEGORY_CACHE_TTL = 60 * 10;
const SEARCH_CACHE_TTL = 60 * 10;
const DETAIL_CACHE_TTL = 60 * 20;
const FILTER_CACHE_TTL = 60 * 20;
const PAN_SHARE_CACHE_TTL = 60 * 60;
const PLAY_CACHE_TTL = 60 * 3;
const DRIVE_TYPE_CONFIG = (process.env.DRIVE_TYPE_CONFIG || "quark;uc").split(";").map((t) => t.trim().toLowerCase()).filter(Boolean);
const SOURCE_NAMES_CONFIG = (process.env.SOURCE_NAMES_CONFIG || "本地代理;服务端代理;直连").split(";").map((s) => s.trim()).filter(Boolean);
const DRIVE_ORDER = (process.env.DRIVE_ORDER || "baidu;tianyi;quark;uc;115;xunlei;ali;123pan").split(";").map((s) => s.trim().toLowerCase()).filter(Boolean);
const panShareCache = new Map();

// 分类映射（根据实际页面结构更新）
const CLASS_LIST = [
    { type_id: "1", type_name: "电影" },
    { type_id: "2", type_name: "电视剧" }, // 原 "剧集" → "电视剧" 兼容新版页面
    { type_id: "4", type_name: "动漫" },
    { type_id: "15", type_name: "日韩剧" },
    { type_id: "16", type_name: "欧美剧" }
];

const FILTERS = {
    "1": {
        genre: ["喜剧", "爱情", "恐怖", "动作", "科幻", "剧情", "战争", "警匪", "犯罪", "动画", "奇幻", "武侠", "冒险", "枪战", "悬疑", "惊悚", "经典", "青春", "文艺", "微电影", "古装", "历史", "运动", "农村", "儿童", "网络电影"],
        area: ["大陆", "香港", "台湾", "美国", "法国", "英国", "日本", "韩国", "德国", "泰国", "印度", "意大利", "西班牙", "加拿大", "其他"],
        lang: ["国语", "英语", "粤语", "闽南语", "韩语", "日语", "其它"]
    },
    "2": {
        genre: ["喜剧", "科幻", "悬疑", "欧美", "剧情", "奇幻", "古装", "动作", "犯罪", "冒险", "惊悚", "恐怖", "历史", "爱情", "音乐", "家庭", "国产", "运动", "动画", "西部", "战争", "传记", "灾难", "纪录片", "短片", "海外", "真人秀"],
        area: ["美国", "韩国", "英国", "日本", "大陆", "台湾", "德国", "哥伦比亚", "意大利", "西班牙", "丹麦", "挪威", "法国", "香港", "泰国", "其它"],
        lang: ["国语", "英语", "粤语", "闽南语", "韩语", "日语", "其它"]
    },
    "4": {
        genre: ["情感", "科幻", "热血", "推理", "搞笑", "冒险", "萝莉", "校园", "动作", "机战", "运动", "战争", "少年", "少女", "社会", "原创", "亲子", "益智", "励志", "其他"],
        area: ["中国大陆", "日本", "欧美", "其他"],
        lang: ["国语", "英语", "粤语", "闽南语", "韩语", "日语", "其它"]
    },
    "15": {
        genre: ["悬疑", "爱情", "科幻", "青春", "偶像", "喜剧", "古装", "武侠", "家庭", "犯罪", "动作", "奇幻", "剧情", "历史", "经典", "乡村", "情景", "商战", "网剧", "其他"],
        area: ["韩国", "日本", "其他"],
        lang: ["国语", "英语", "粤语", "闽南语", "韩语", "日语", "其它"]
    },
    "16": {
        genre: ["悬疑", "科幻", "青春", "偶像", "喜剧", "犯罪", "动作", "奇幻", "剧情", "历史", "经典", "乡村", "情景", "商战", "网剧", "其他"],
        area: ["美国", "英国", "泰国", "其他"],
        lang: ["国语", "英语", "粤语", "闽南语", "韩语", "日语", "其它"]
    }
};

const SORT_OPTIONS = [
    { name: "最新", value: "time" },
    { name: "人气", value: "hits" },
    { name: "评分", value: "score" }
];

function normalizeHost(url = "") {
    const value = String(url || "").trim();
    if (!value) return "";
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    try {
        const target = new URL(withProtocol);
        return `${target.protocol}//${target.host}`;
    } catch {
        return withProtocol.replace(/\/+$/, "");
    }
}

function getCurrentHost() {
    return ACTIVE_HOST || HOST_CANDIDATES[0];
}

async function saveActiveHostCache(host) {
    const normalized = normalizeHost(host);
    if (!normalized) return;
    try {
        await OmniBox.setCache(HOST_CACHE_KEY, normalized, HOST_CACHE_TTL);
        logInfo("写入域名缓存", { host: normalized, ttl: HOST_CACHE_TTL });
    } catch (error) {
        logInfo("写入域名缓存失败", { host: normalized, error: error.message });
    }
}

async function readActiveHostCache() {
    try {
        const cached = await OmniBox.getCache(HOST_CACHE_KEY);
        const normalized = normalizeHost(cached || "");
        if (normalized) {
            logInfo("命中域名缓存", { host: normalized });
            return normalized;
        }
    } catch (error) {
        logInfo("读取域名缓存失败", { error: error.message });
    }
    return "";
}

async function fetchReleaseHosts() {
    const html = await requestTextAbsolute(LIBVIO_RELEASE_URL, {
        timeout: 12000,
        hostForHeaders: normalizeHost(LIBVIO_RELEASE_URL),
    });
    const found = [];
    const pushHost = (value) => {
        const normalized = normalizeHost(value);
        if (!normalized) return;
        if (/libvio\.app$/i.test(new URL(normalized).host)) return;
        found.push(normalized);
    };

    const domainRegex = /https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?::\d+)?/g;
    const hrefRegex = /href=["']([^"']+)["']/g;

    let m;
    while ((m = domainRegex.exec(html))) pushHost(m[0]);
    while ((m = hrefRegex.exec(html))) {
        const href = String(m[1] || "").trim();
        if (/^https?:\/\//i.test(href)) pushHost(href);
    }

    const unique = found.filter((item, idx, arr) => arr.indexOf(item) === idx);
    logInfo("发布页候选域名", { release: LIBVIO_RELEASE_URL, count: unique.length, hosts: unique.slice(0, 12) });
    return unique;
}

function buildHeadersForHost(host, extra = {}) {
    return {
        "User-Agent": UA,
        "Referer": `${host}/`,
        "Origin": host,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        ...extra,
    };
}

async function requestTextAbsolute(url, options = {}) {
    const target = new URL(url);
    const lib = target.protocol === "https:" ? https : http;
    const hostForHeaders = normalizeHost(options.hostForHeaders || `${target.protocol}//${target.host}`);
    const headers = buildHeadersForHost(hostForHeaders, options.headers || {});

    return await new Promise((resolve, reject) => {
        const req = lib.request(target, {
            method: options.method || "GET",
            headers,
            timeout: options.timeout || 15000,
        }, (res) => {
            const chunks = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () => {
                const body = Buffer.concat(chunks).toString("utf8");
                const statusCode = Number(res.statusCode || 0);
                if (statusCode < 200 || statusCode >= 400) {
                    reject(new Error(`请求失败: ${statusCode} ${target.href}`));
                    return;
                }
                resolve(body);
            });
        });

        req.on("error", reject);
        req.on("timeout", () => {
            req.destroy(new Error(`请求超时: ${target.href}`));
        });
        req.end();
    });
}

async function probeHost(host) {
    try {
        await requestTextAbsolute(`${host}/`, { timeout: 8000, hostForHeaders: host });
        return true;
    } catch (error) {
        logInfo("域名探测失败", { host, error: error.message });
        return false;
    }
}

async function ensureActiveHost(preferredHost = "") {
    const preferred = normalizeHost(preferredHost);
    const cachedHost = await readActiveHostCache();

    let releaseHosts = [];
    try {
        releaseHosts = await fetchReleaseHosts();
    } catch (error) {
        logInfo("读取发布页域名失败", { release: LIBVIO_RELEASE_URL, error: error.message });
    }

    const ordered = [
        preferred,
        cachedHost,
        getCurrentHost(),
        ...releaseHosts,
        ...HOST_CANDIDATES,
    ].filter(Boolean).filter((item, idx, arr) => arr.indexOf(item) === idx);

    for (const host of ordered) {
        if (await probeHost(host)) {
            if (ACTIVE_HOST !== host) {
                logInfo("切换可用域名", { from: ACTIVE_HOST, to: host });
            }
            ACTIVE_HOST = host;
            await saveActiveHostCache(host);
            return ACTIVE_HOST;
        }
    }
    throw new Error(`未找到可用域名: ${ordered.join(", ")}`);
}

async function requestText(url, options = {}) {
    const raw = String(url || "").trim();
    if (!raw) throw new Error("请求地址为空");

    if (/^https?:\/\//i.test(raw)) {
        return await requestTextAbsolute(raw, options);
    }

    const hosts = [getCurrentHost(), ...HOST_CANDIDATES].filter(Boolean).filter((item, idx, arr) => arr.indexOf(item) === idx);
    let lastError = null;
    for (const host of hosts) {
        try {
            await ensureActiveHost(host);
            const absoluteUrl = raw.startsWith("/") ? `${ACTIVE_HOST}${raw}` : `${ACTIVE_HOST}/${raw}`;
            return await requestTextAbsolute(absoluteUrl, { ...options, hostForHeaders: ACTIVE_HOST });
        } catch (error) {
            lastError = error;
            logInfo("候选域名请求失败", { host, url: raw, error: error.message });
        }
    }
    throw lastError || new Error(`请求失败: ${raw}`);
}

function md5Short(input = "") {
    return crypto.createHash("md5").update(String(input || "")).digest("hex").slice(0, 16);
}

function buildCacheKey(prefix = "", ...parts) {
    const rawParts = parts
        .flat()
        .map((item) => item === undefined || item === null ? "" : String(item))
        .filter((item) => item !== "");
    const raw = rawParts.join("|");
    const short = raw ? md5Short(raw) : "empty";
    return `${prefix}:${short}`;
}

async function getCachedText(cacheKey, ttl, producer) {
    try {
        const cached = await OmniBox.getCache(cacheKey);
        if (cached) return String(cached);
    } catch (error) {
        logInfo("读取文本缓存失败", { cacheKey, error: error.message });
    }
    const text = String(await producer());
    try {
        await OmniBox.setCache(cacheKey, text, ttl);
    } catch (error) {
        logInfo("写入文本缓存失败", { cacheKey, error: error.message });
    }
    return text;
}

async function getCachedJson(cacheKey, ttl, producer) {
    try {
        const cached = await OmniBox.getCache(cacheKey);
        if (cached) return JSON.parse(String(cached));
    } catch (error) {
        logInfo("读取 JSON 缓存失败", { cacheKey, error: error.message });
    }
    const value = await producer();
    try {
        await OmniBox.setCache(cacheKey, JSON.stringify(value), ttl);
    } catch (error) {
        logInfo("写入 JSON 缓存失败", { cacheKey, error: error.message });
    }
    return value;
}

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

function logInfo(message, data = null) {
    OmniBox.log("info", `[LIBVIO] ${data ? `${message}: ${safeJson(data)}` : message}`);
}

function logError(message, error) {
    OmniBox.log("error", `[LIBVIO] ${message}: ${error?.message || error}`);
}

function safeJson(data) {
    try {
        return JSON.stringify(data);
    } catch {
        return String(data);
    }
}

function ensureArray(value) {
    return Array.isArray(value) ? value : [];
}

function stripTags(text = "") {
    return String(text)
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeText(text = "") {
    return stripTags(String(text || ""))
        .normalize("NFKC")
        .replace(/[【】\[\]()（）]/g, " ")
        .replace(/[·•・]/g, " ")
        .replace(/[：:]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function buildMappingPreview(mappings = [], limit = 3) {
    return ensureArray(mappings)
        .slice(0, limit)
        .map((item) => `${item?.fileId || "<empty>"}=>${item?.episodeName || item?.name || "<empty>"}`)
        .join(" | ");
}

function buildScrapedEpisodeName(scrapeData, mapping, fallbackName = "") {
    const fallback = normalizeText(fallbackName || "") || String(fallbackName || "").trim() || "正片";
    if (!mapping) return fallback;
    const seasonNumber = mapping.seasonNumber;
    const episodeNumber = mapping.episodeNumber;
    const rawEpisodeName = normalizeText(mapping.episodeName || "");
    const title = normalizeText(scrapeData?.title || "");
    const episodeTitle = rawEpisodeName && rawEpisodeName !== title ? rawEpisodeName : "";

    if (episodeNumber !== undefined && episodeNumber !== null && episodeNumber !== "") {
        const epLabel = `第${episodeNumber}集`;
        if (episodeTitle) {
            return seasonNumber ? `S${seasonNumber}E${episodeNumber} ${episodeTitle}` : `${epLabel} ${episodeTitle}`;
        }
        return seasonNumber ? `S${seasonNumber}E${episodeNumber}` : epLabel;
    }

    if (episodeTitle) return episodeTitle;
    return fallback;
}

function buildDanmakuFileName(vodName = "", episodeName = "") {
    const title = normalizeText(vodName || "");
    if (!title) return "";
    const episode = normalizeText(episodeName || "");
    return episode ? `${title} ${episode}` : title;
}

function buildHistoryEpisode(playId, episodeNumber, episodeName) {
    if (episodeNumber !== undefined && episodeNumber !== null && episodeNumber !== "") {
        return `${playId || ""}@@${episodeNumber}`;
    }
    return `${playId || ""}@@${normalizeText(episodeName || "正片") || "正片"}`;
}

function sortEpisodesByMeta(episodes = []) {
    if (!Array.isArray(episodes) || episodes.length <= 1) return episodes;
    const items = episodes.map((ep, index) => {
        const meta = decodePlayId(String(ep?.playId || "").split("|||")[1] || "");
        const season = Number(meta?.s);
        const episode = Number(meta?.n);
        return {
            ep,
            index,
            hasSeason: Number.isFinite(season) && season > 0,
            hasEpisode: Number.isFinite(episode) && episode > 0,
            season: Number.isFinite(season) ? season : Number.MAX_SAFE_INTEGER,
            episode: Number.isFinite(episode) ? episode : Number.MAX_SAFE_INTEGER,
        };
    });
    const hasSortable = items.some((item) => item.hasEpisode);
    if (!hasSortable) return episodes;
    items.sort((a, b) => {
        if (a.hasEpisode !== b.hasEpisode) return a.hasEpisode ? -1 : 1;
        if (a.season !== b.season) return a.season - b.season;
        if (a.episode !== b.episode) return a.episode - b.episode;
        return a.index - b.index;
    });
    return items.map((item) => item.ep);
}

function fixUrl(url = "") {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("//")) return `https:${url}`;
    const host = getCurrentHost();
    return url.startsWith("/") ? `${host}${url}` : `${host}/${url}`;
}

function encodePlayId(payload) {
    return Buffer.from(JSON.stringify(payload || {}), "utf8").toString("base64");
}

function decodePlayId(playId = "") {
    const input = String(playId || "").trim();
    if (!input) return {};

    // 1) 标准 base64 JSON
    try {
        const text = Buffer.from(input, "base64").toString("utf8").trim();
        if (text.startsWith("{") && text.endsWith("}")) {
            return JSON.parse(text);
        }
    } catch {}

    // 2) URL-safe base64 JSON（-/_）
    try {
        const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
        const text = Buffer.from(padded, "base64").toString("utf8").trim();
        if (text.startsWith("{") && text.endsWith("}")) {
            return JSON.parse(text);
        }
    } catch {}

    // 3) 直接 JSON 字符串
    try {
        if (input.startsWith("{") && input.endsWith("}")) {
            return JSON.parse(input);
        }
    } catch {}

    return {};
}

function resolveCollectPlayPageUrl(rawPlayId = "", meta = {}) {
    const raw = String(rawPlayId || "").trim();

    // 优先用编码后的 meta.url
    const metaUrl = fixUrl(String(meta?.url || "").trim());
    if (/^https?:\/\//i.test(metaUrl)) return metaUrl;

    // raw 已是绝对/相对路径
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^\//.test(raw)) return fixUrl(raw);
    if (/^[^\s]+\.html?(\?.*)?$/i.test(raw)) return fixUrl(`/${raw}`);

    // raw 可能本身是 base64/json 打包过的 playId
    const nested = decodePlayId(raw);
    const nestedUrl = fixUrl(String(nested?.url || "").trim());
    if (/^https?:\/\//i.test(nestedUrl)) return nestedUrl;

    return "";
}

function buildFilterList(categoryId) {
    const preset = FILTERS[String(categoryId)] || {};
    const list = [];
    if (preset.genre?.length) {
        list.push({
            key: "genre",
            name: "剧情",
            init: "",
            value: [{ name: "全部", value: "" }, ...preset.genre.map((item) => ({ name: item, value: item }))]
        });
    }
    if (preset.area?.length) {
        list.push({
            key: "area",
            name: "地区",
            init: "",
            value: [{ name: "全部", value: "" }, ...preset.area.map((item) => ({ name: item, value: item }))]
        });
    }
    list.push({
        key: "year",
        name: "年份",
        init: "",
        value: [{ name: "全部", value: "" }, ...buildYearOptions()]
    });
    if (preset.lang?.length) {
        list.push({
            key: "lang",
            name: "语言",
            init: "",
            value: [{ name: "全部", value: "" }, ...preset.lang.map((item) => ({ name: item, value: item }))]
        });
    }
    list.push({
        key: "sort",
        name: "排序",
        init: "time",
        value: SORT_OPTIONS.map((item) => ({ name: item.name, value: item.value }))
    });
    return list;
}

function buildFilterListFromHtml(html = "", categoryId = "") {
    const groups = parseFilterGroups(html);
    const list = [];
    for (const group of groups) {
        const key = mapFilterTitleToKey(group.title);
        if (!key || !Array.isArray(group.items) || !group.items.length) continue;
        const title = String(group.title || "").replace(/^按/, "").replace(/[：:]\s*$/u, "").trim();
        const values = group.items.map((item) => ({
            name: item.name,
            value: item.name,
        })).filter((item) => item.name);
        if (!values.length) continue;
        list.push({
            key,
            name: title,
            init: key === "sort" ? "time" : "",
            value: key === "sort" ? SORT_OPTIONS.map((item) => ({ name: item.name, value: item.value })) : values,
        });
    }
    return list.length ? list : buildFilterList(categoryId);
}

function buildYearOptions() {
    const current = new Date().getFullYear();
    const list = [];
    for (let year = current; year >= 1998; year -= 1) {
        list.push({ name: String(year), value: String(year) });
    }
    return list;
}

function getCategoryBasePath(categoryId, page = 1) {
    const cid = encodeURIComponent(String(categoryId));
    return page > 1 ? `/type/${cid}-${page}.html` : `/type/${cid}.html`;
}

function parseFilterGroups(html = "") {
    const groups = [];
    const text = String(html || "").replace(/<!--[\s\S]*?-->/g, "");
    const ulRegex = /<ul class="clearfix">([\s\S]*?)<\/ul>/g;
    let match;
    while ((match = ulRegex.exec(text))) {
        const block = match[1] || "";
        const title = stripTags(block.match(/<li[^>]*>\s*<span[^>]*>\s*([\s\S]*?)\s*<\/span>\s*<\/li>/)?.[1] || "")
            .replace(/[：:]\s*$/u, "")
            .trim();
        if (!title) continue;
        const items = [...block.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((item) => ({
            name: stripTags(item[2]),
            href: fixUrl(item[1]),
        })).filter((item) => item.name && item.href);
        if (items.length) groups.push({ title, items });
    }
    return groups;
}

function mapFilterTitleToKey(title = "") {
    const text = String(title || "").trim();
    if (text.includes("剧情") || text.includes("类型")) return "genre";
    if (text.includes("地区")) return "area";
    if (text.includes("年份")) return "year";
    if (text.includes("语言")) return "lang";
    if (text.includes("排序") || text.includes("时间") || text.includes("人气") || text.includes("评分")) return "sort";
    return "";
}

function normalizeFilterValue(key, value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (key === "sort") {
        if (["最新", "时间", "time"].includes(raw)) return "time";
        if (["人气", "热门", "hits"].includes(raw)) return "hits";
        if (["评分", "高分", "score"].includes(raw)) return "score";
    }
    return raw;
}

function resolveFilterHref(groups, key, value) {
    const normalizedValue = normalizeFilterValue(key, value);
    const targetNames = new Set();
    if (!normalizedValue) {
        targetNames.add("全部");
        if (key === "sort") {
            targetNames.add("时间");
            targetNames.add("最新");
        }
    } else if (key === "sort") {
        if (normalizedValue === "time") {
            targetNames.add("时间");
            targetNames.add("最新");
        } else if (normalizedValue === "hits") {
            targetNames.add("人气");
            targetNames.add("热门");
        } else if (normalizedValue === "score") {
            targetNames.add("评分");
            targetNames.add("高分");
        }
    } else {
        targetNames.add(normalizedValue);
    }

    for (const group of groups) {
        if (mapFilterTitleToKey(group.title) !== key) continue;
        const found = group.items.find((item) => targetNames.has(item.name));
        if (found?.href) return found.href;
    }
    return "";
}

function parseObjectParam(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
    const text = String(value || "").trim();
    if (!text) return {};
    try {
        const parsed = JSON.parse(text);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

function pickFilterValue(source = {}, keys = []) {
    for (const key of keys) {
        const value = source?.[key];
        if (value === 0 || value === "0") return "0";
        if (typeof value === "string" && value.trim()) return value.trim();
        if (value !== undefined && value !== null && value !== "" && typeof value !== "object") {
            return String(value).trim();
        }
    }
    return "";
}

function normalizeCategoryFilters(params = {}) {
    const merged = {
        ...parseObjectParam(params?.ext),
        ...parseObjectParam(params?.filter),
        ...parseObjectParam(params?.extend),
        ...parseObjectParam(params?.filters),
    };
    return {
        genre: normalizeFilterValue("genre", pickFilterValue(merged, ["genre", "class", "type", "cate", "subType", "subtype", "剧情", "类型"])),
        area: normalizeFilterValue("area", pickFilterValue(merged, ["area", "region", "地区"])),
        year: normalizeFilterValue("year", pickFilterValue(merged, ["year", "年份"])),
        lang: normalizeFilterValue("lang", pickFilterValue(merged, ["lang", "language", "语言"])),
        sort: normalizeFilterValue("sort", pickFilterValue(merged, ["sort", "by", "order", "排序"])),
    };
}

function findCategoryPageHref(html = "", targetPage = 1) {
    const text = String(html || "");
    if (targetPage <= 1) return "";
    const exact = text.match(new RegExp(`<a[^>]*href="([^"]+)"[^>]*>\\s*${targetPage}\\s*<\\/a>`, "i"))?.[1];
    if (exact) return fixUrl(exact);
    return "";
}

async function resolveCategoryPageUrl(baseUrl, targetPage = 1) {
    if (targetPage <= 1) return fixUrl(baseUrl);
    let currentUrl = fixUrl(baseUrl);
    let currentPage = 1;
    while (currentPage < targetPage) {
        const html = await fetchHtml(currentUrl, { ttl: FILTER_CACHE_TTL });
        const directHref = findCategoryPageHref(html, targetPage);
        if (directHref) return directHref;
        const nextHref = findCategoryPageHref(html, currentPage + 1)
            || (targetPage === currentPage + 1 ? fixUrl(html.match(/<a[^>]*href="([^"]+)"[^>]*>\s*下一页\s*<\/a>/)?.[1] || "") : "");
        if (!nextHref || nextHref === currentUrl) {
            logInfo("category 分页到达末页", { baseUrl: currentUrl.replace(getCurrentHost(), ""), targetPage, currentPage });
            return "";
        }
        currentUrl = nextHref;
        currentPage += 1;
    }
    return currentUrl;
}

async function resolveCategoryUrl(categoryId, page, filters = {}) {
    const normalizedFilters = normalizeCategoryFilters({ filters });
    const filterKey = buildCacheKey("libvio:category-filter-url", categoryId, page, JSON.stringify(normalizedFilters));
    return await getCachedText(filterKey, FILTER_CACHE_TTL, async () => {
        let currentUrl = fixUrl(getCategoryBasePath(categoryId, 1));
        const order = ["genre", "area", "year", "lang", "sort"];

        for (const key of order) {
            if (!normalizedFilters[key]) continue;
            const html = await fetchHtml(currentUrl, { ttl: FILTER_CACHE_TTL });
            const groups = parseFilterGroups(html);
            const targetHref = resolveFilterHref(groups, key, normalizedFilters[key]);
            if (targetHref) currentUrl = targetHref;
        }

        return await resolveCategoryPageUrl(currentUrl, page);
    });
}

function buildSearchPath(keyword, page = 1) {
    const pageSeg = page > 1 ? String(page) : "";
    return `/search/------------${pageSeg}---.html?wd=${encodeURIComponent(keyword)}`;
}

async function fetchHtml(url, options = {}) {
    const ttl = Number(options?.ttl || 0);
    if (ttl > 0) {
        const cacheKey = buildCacheKey("libvio:html", url);
        return await getCachedText(cacheKey, ttl, async () => String(await requestText(url, options)));
    }
    return String(await requestText(url, options));
}

function parseVodList(html = "") {
    const text = String(html || "");
    const candidates = [];

    const patterns = [
        /<li[^>]*>[\s\S]*?<a[^>]*href="([^"]*\/detail\/\d+\.html)"[^>]*title="([^"]+)"[^>]*>[\s\S]*?<\/li>/g,
        /<a[^>]*href="([^"]*\/detail\/\d+\.html)"[^>]*title="([^"]+)"[^>]*>[\s\S]*?(?:<\/a>)/g,
    ];

    for (const regex of patterns) {
        let match;
        while ((match = regex.exec(text))) {
            const whole = match[0] || "";
            const href = fixUrl(match[1] || "");
            const title = stripTags(match[2] || "");
            if (!href || !title) continue;
            const pic = fixUrl(
                whole.match(/data-original="([^"]+)"/)?.[1]
                || whole.match(/data-src="([^"]+)"/)?.[1]
                || whole.match(/src="([^"]+)"/)?.[1]
                || ""
            );
            const remark = stripTags(
                whole.match(/<span class="pic-text[^>]*">([\s\S]*?)<\/span>/)?.[1]
                || whole.match(/<span class="jidi[^>]*">([\s\S]*?)<\/span>/)?.[1]
                || whole.match(/<p class="remarks[^>]*">([\s\S]*?)<\/p>/)?.[1]
                || ""
            );
            const score = stripTags(
                whole.match(/<span class="pic-tag[^>]*">([\s\S]*?)<\/span>/)?.[1]
                || whole.match(/<span class="score[^>]*">([\s\S]*?)<\/span>/)?.[1]
                || ""
            );
            candidates.push({
                vod_id: href,
                vod_name: title,
                vod_pic: pic,
                vod_remarks: remark || score,
                vod_score: score,
            });
        }
        if (candidates.length >= 12) break;
    }

    const dedup = [];
    const seen = new Set();
    for (const item of candidates) {
        const key = `${item.vod_id}@@${item.vod_name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        dedup.push(item);
    }
    return dedup;
}

function normalizePanSourceName(name = "") {
    const text = stripTags(name);
    if (/UC/i.test(text)) return "UC网盘";
    if (/百度/i.test(text)) return "百度网盘";
    if (/夸克/i.test(text)) return "夸克网盘";
    if (/天翼/i.test(text)) return "天翼网盘";
    if (/115/i.test(text)) return "115网盘";
    if (/迅雷/i.test(text)) return "迅雷网盘";
    if (/阿里|ALi|Ali/i.test(text)) return "阿里网盘";
    if (/123/i.test(text)) return "123网盘";
    const match = text.match(/\(([^()]+)\)/);
    if (match?.[1]) return match[1].trim();
    return text.replace(/^视频下载\s*/u, "").trim() || text;
}

function splitNetdiskPanels(html = "") {
    const text = String(html || "");
    const panels = [];

    // LIBVIO 详情页常见结构：<div class="stui-vodlist__head"><h3>UC网盘</h3></div><ul>...</ul>
    // 标题与 ul 之间有 </div>，不能只匹配 h3 后紧跟 ul。
    const regex = /<div class="stui-vodlist__head"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?(?:网盘|视频下载)[\s\S]*?)<\/h3>[\s\S]*?<\/div>\s*<ul[^>]*>([\s\S]*?)<\/ul>/gi;
    let match;
    while ((match = regex.exec(text))) {
        panels.push(`<h3>${match[1] || "网盘"}</h3><ul>${match[2] || ""}</ul>`);
    }

    logInfo("detail 网盘面板提取", { count: panels.length, titles: panels.map((panel) => stripTags(panel.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1] || "")).join(" | ") });
    return panels;
}

function isCollectPlayHref(url = "") {
    return /\/play\/[^/?#]+\.html(?:[?#].*)?$/i.test(String(url || "").trim());
}

function extractPlaylistSources(html = "", videoId = "", vodName = "") {
    const text = String(html || "");
    const sources = [];
    const seenSources = new Set();
    const patterns = [
        /<div class="stui-vodlist__head"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<\/div>\s*<ul class="stui-content__playlist[^"]*"[^>]*>([\s\S]*?)<\/ul>/g,
        /<div class="playlist-panel(?:\s+netdisk-panel)?"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/g,
        /<div class="module-tab-item[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div class="module-play-list[^"]*"[^>]*>([\s\S]*?)<\/div>/g,
    ];

    for (const regex of patterns) {
        let match;
        while ((match = regex.exec(text))) {
            const sourceName = stripTags(match[1] || "播放").replace(/^播放线路[：:]?/u, "").trim();
            if (!sourceName || /猜你喜欢|相关推荐/i.test(sourceName)) continue;
            const listHtml = match[2] || "";
            const episodes = [];
            const seenEpisodes = new Set();

            for (const item of listHtml.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
                const playUrl = fixUrl(item[1] || "");
                if (!isCollectPlayHref(playUrl)) continue;
                const episodeName = stripTags(item[2] || "") || `第${episodes.length + 1}集`;
                const dedupeKey = `${playUrl}@@${episodeName}`;
                if (seenEpisodes.has(dedupeKey)) continue;
                seenEpisodes.add(dedupeKey);
                const episodeIndex = episodes.length;
                const fid = `${videoId}#${sourceName}#${episodeIndex}`;
                const meta = {
                    mode: "collect",
                    url: playUrl,
                    flag: sourceName,
                    name: episodeName,
                    v: vodName,
                    e: episodeName,
                    sid: videoId,
                    fid,
                    t: sourceName,
                    i: episodeIndex,
                };
                episodes.push({
                    name: episodeName,
                    playId: `${playUrl}|||${encodePlayId(meta)}`,
                    _fid: fid,
                    _rawName: episodeName,
                });
            }

            if (!episodes.length) continue;
            const sourceKey = `${sourceName}@@${episodes.map((ep) => ep.playId).join("|")}`;
            if (seenSources.has(sourceKey)) continue;
            seenSources.add(sourceKey);
            sources.push({ name: sourceName, episodes });
        }
    }

    return sources;
}

function buildLegacyPlayFields(playSources = []) {
    const sourceNames = [];
    const sourceUrls = [];
    for (const source of playSources || []) {
        const episodes = Array.isArray(source?.episodes) ? source.episodes : [];
        if (!episodes.length) continue;
        sourceNames.push(String(source.name || "播放").trim() || "播放");
        sourceUrls.push(episodes.map((ep, index) => {
            const episodeName = String(ep?.name || `第${index + 1}集`).replace(/[#$]/g, " ").trim() || `第${index + 1}集`;
            const playId = String(ep?.playId || "").trim();
            return playId ? `${episodeName}$${playId}` : "";
        }).filter(Boolean).join("#"));
    }
    return {
        vod_play_from: sourceNames.join("$$$"),
        vod_play_url: sourceUrls.join("$$$"),
    };
}

function parseMetaItems(html = "") {
    return ensureArray(html.match(/<span class="meta-item">([\s\S]*?)<\/span>/g)).map((item) => stripTags(item));
}

function isPanUrl(url = "") {
    const u = String(url || "").toLowerCase();
    return u.includes("pan.baidu.com") || u.includes("quark.cn") || u.includes("pan.quark.cn") || u.includes("drive.uc.cn") || u.includes("aliyundrive.com") || u.includes("alipan.com") || u.includes("xunlei.com") || u.includes("cloud.189.cn") || u.includes("115.com") || u.includes("123pan.com");
}

function normalizeShareUrl(url = "") {
    let value = String(url || "").trim();
    if (value.startsWith("push://")) value = value.slice("push://".length);
    if (value.startsWith("push:")) value = value.slice("push:".length);
    return value.trim();
}

function isVideoFile(file) {
    if (!file) return false;
    const fileName = String(file.file_name || file.name || "").toLowerCase();
    const exts = [".mp4", ".mkv", ".avi", ".flv", ".mov", ".wmv", ".m3u8", ".ts", ".webm", ".m4v"];
    if (exts.some((ext) => fileName.endsWith(ext))) return true;
    const formatType = String(file.format_type || "").toLowerCase();
    return formatType.includes("video") || formatType.includes("mpeg") || formatType.includes("h264");
}

function getFileId(file) {
    return file?.fid || file?.file_id || "";
}

function getFileName(file) {
    return file?.file_name || file?.name || "";
}

async function getAllVideoFiles(shareURL, files) {
    const result = [];
    for (const file of files || []) {
        if (file?.file && isVideoFile(file)) {
            result.push(file);
            continue;
        }
        if (file?.dir) {
            try {
                const subFileId = getFileId(file);
                if (!subFileId) continue;
                const subFileList = await OmniBox.getDriveFileList(shareURL, subFileId);
                if (Array.isArray(subFileList?.files)) {
                    const subVideos = await getAllVideoFiles(shareURL, subFileList.files);
                    result.push(...subVideos);
                }
            } catch (error) {
                logInfo("获取网盘子目录失败", { shareURL, name: getFileName(file), error: error.message });
            }
        }
    }
    return result;
}

async function loadPanFiles(shareURL) {
    if (!shareURL) return null;
    if (panShareCache.has(shareURL)) return panShareCache.get(shareURL);
    const cacheKey = buildCacheKey("libvio:pan-share", shareURL);
    try {
        const result = await getCachedJson(cacheKey, PAN_SHARE_CACHE_TTL, async () => {
            const driveInfo = await OmniBox.getDriveInfoByShareURL(shareURL);
            const fileList = await OmniBox.getDriveFileList(shareURL, "0");
            const files = Array.isArray(fileList?.files) ? fileList.files : [];
            const videos = await getAllVideoFiles(shareURL, files);
            return { driveInfo, videos };
        });
        panShareCache.set(shareURL, result);
        return result;
    } catch (error) {
        logInfo("读取网盘文件失败", { shareURL, error: error.message });
        return null;
    }
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

function sortPlaySourcesByDriveOrder(playSources = []) {
    if (!Array.isArray(playSources) || playSources.length <= 1 || DRIVE_ORDER.length === 0) {
        return playSources;
    }
    const orderMap = new Map(DRIVE_ORDER.map((name, index) => [name, index]));
    return [...playSources].sort((a, b) => {
        const aType = inferDriveTypeFromSourceName(a?.name || "");
        const bType = inferDriveTypeFromSourceName(b?.name || "");
        const aOrder = orderMap.has(aType) ? orderMap.get(aType) : Number.MAX_SAFE_INTEGER;
        const bOrder = orderMap.has(bType) ? orderMap.get(bType) : Number.MAX_SAFE_INTEGER;
        return aOrder - bOrder;
    });
}

function buildPanEpisodePlayId(shareURL, fileId, meta = {}) {
    return `${shareURL}|${fileId}|||${encodePlayId(meta)}`;
}

function decodeCombinedPlayId(playId = "") {
    if (!String(playId).includes("|||")) return { main: String(playId || ""), meta: {} };
    const [main, metaB64] = String(playId).split("|||");
    return { main, meta: decodePlayId(metaB64 || "") };
}

function expandPanSourcesWithRoutes(playSources = [], from = "web") {
    const result = [];
    for (const source of playSources) {
        const driveType = inferDriveTypeFromSourceName(source?.name || "");
        const shouldExpandRoutes = DRIVE_TYPE_CONFIG.length === 0 || !driveType || DRIVE_TYPE_CONFIG.includes(driveType);

        if (!shouldExpandRoutes) {
            result.push(source);
            continue;
        }

        let routeNames = [...SOURCE_NAMES_CONFIG];
        if (from === "web") {
            routeNames = routeNames.filter((name) => name !== "本地代理");
        }
        if (!routeNames.length) {
            result.push(source);
            continue;
        }

        for (const routeName of routeNames) {
            result.push({
                name: `${source.name}-${routeName}`,
                episodes: (source.episodes || []).map((ep) => {
                    const decoded = decodeCombinedPlayId(ep.playId);
                    const baseMeta = decoded.meta || {};
                    const fileId = String(baseMeta.fileId || baseMeta.fid || "").trim();
                    const shareUrl = String(baseMeta.shareUrl || baseMeta.shareURL || "").trim();
                    const fid = shareUrl && fileId ? `${shareUrl}|${fileId}` : fileId;
                    const meta = { ...(decoded.meta || {}), routeType: routeName, flag: `${source.name}-${routeName}`, fid: fid || baseMeta.fid || "" };
                    return {
                        name: ep.name,
                        playId: `${decoded.main}|||${encodePlayId(meta)}`
                    };
                })
            });
        }
    }
    return result;
}

function decodePlayerUrl(url = "", encrypt = 0) {
    let value = String(url || "").trim();
    const mode = Number(encrypt || 0);
    if (!value) return "";
    try {
        if (mode === 1) {
            value = unescape(value);
        } else if (mode === 2) {
            value = unescape(Buffer.from(value, "base64").toString("utf8"));
        }
    } catch (error) {
        logError("播放地址解码失败", error);
    }
    return value.replace(/\\\//g, "/");
}

function buildPlayUrl(rawUrl = "") {
    const value = String(rawUrl || "").trim();
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith("//")) return `https:${value}`;
    return fixUrl(value);
}

function isDirectMediaUrl(url = "") {
    const value = String(url || "").trim();
    if (!/^https?:\/\//i.test(value)) return false;
    try {
        const target = new URL(value);
        const pathname = target.pathname.toLowerCase();
        return /\.(m3u8|mp4|m4v|m4a|mp3|flv|avi|mkv|mov|webm)(?:$|\?)/i.test(pathname) || /\.(m3u8|mp4|m4v|m4a|mp3|flv|avi|mkv|mov|webm)$/i.test(value.toLowerCase());
    } catch {
        return /\.(m3u8|mp4|m4v|m4a|mp3|flv|avi|mkv|mov|webm)(?:$|\?)/i.test(value.toLowerCase());
    }
}

function buildProviderIframeUrl(player = {}) {
    const from = String(player?.from || '').trim();
    const rawUrl = String(player?.url || '').trim();
    const id = String(player?.id || '').trim();
    const nid = String(player?.nid || '').trim();
    const next = String(player?.link_next || '').trim();
    if (!from || !rawUrl) return "";

    if (from === 'ty_new1') {
        return `${getCurrentHost()}/vid/ty4.php?url=${encodeURIComponent(rawUrl)}&next=${encodeURIComponent(next)}&id=${encodeURIComponent(id)}&nid=${encodeURIComponent(nid)}`;
    }
    if (from === 'vr2') {
        return `${getCurrentHost()}/vid/plyr/vr2.php?url=${encodeURIComponent(rawUrl)}&next=${encodeURIComponent(next)}&id=${encodeURIComponent(id)}&nid=${encodeURIComponent(nid)}`;
    }
    return "";
}

function emptyPlay(flag = "LIBVIO") {
    return { parse: 0, urls: [] };
}

function emptyPage(page = 1) {
    return { page, pagecount: 0, total: 0, limit: DEFAULT_PAGE_SIZE, list: [] };
}

async function home(params, context) {
    try {
        logInfo("home 进入", { params, host: getCurrentHost(), from: context?.from || "web" });
        const html = await fetchHtml("/", { ttl: HOME_CACHE_TTL });
        let list = parseVodList(html).slice(0, 24);

        if (!list.length) {
            logInfo("home 主站首页解析为空，尝试分类页回退", { fallback: "/type/1.html" });
            const fallbackHtml = await fetchHtml("/type/1.html", { ttl: HOME_CACHE_TTL });
            list = parseVodList(fallbackHtml).slice(0, 24);
            logInfo("home 分类页回退完成", { fallbackListCount: list.length });
        }

        const classes = CLASS_LIST.map((item) => ({ ...item }));
        const filters = {};
        for (const item of classes) {
            filters[item.type_id] = buildFilterList(item.type_id);
        }
        logInfo("home 完成", { classCount: classes.length, listCount: list.length });
        return { class: classes, filters, list };
    } catch (error) {
        logError("home 失败", error);
        return { class: [], filters: {}, list: [] };
    }
}

async function category(params, context) {
    const categoryId = String(params?.categoryId || "1");
    const page = Number(params?.page || 1);
    const filters = normalizeCategoryFilters(params);
    try {
        const finalUrl = await resolveCategoryUrl(categoryId, page, filters);
        if (!finalUrl) {
            logInfo("category 无可用分页链接，返回空页", { categoryId, page });
            return { ...emptyPage(page - 1), filters: buildFilterList(categoryId) };
        }
        logInfo("category 请求", { categoryId, page, filters, rawFilters: { filters: params?.filters || {}, extend: params?.extend || {}, ext: params?.ext || {}, filter: params?.filter || {} }, host: getCurrentHost(), path: finalUrl.replace(getCurrentHost(), ""), from: context?.from || "web" });
        const html = await fetchHtml(finalUrl, { ttl: CATEGORY_CACHE_TTL });
        const list = parseVodList(html);
        const hasNext = Boolean(findCategoryPageHref(html, page + 1));
        const pagecount = list.length === DEFAULT_PAGE_SIZE && hasNext ? page + 1 : (page > 1 || list.length ? page : 0);
        logInfo("category 完成", { categoryId, page, listCount: list.length, pagecount });
        return {
            page,
            pagecount,
            total: pagecount ? pagecount * DEFAULT_PAGE_SIZE : list.length,
            limit: DEFAULT_PAGE_SIZE,
            filters: buildFilterList(categoryId),
            list
        };

    } catch (error) {


        logError("category 失败", error);
        return { ...emptyPage(page), filters: buildFilterList(categoryId) };
    }
}

async function detail(params, context) {
    const videoId = String(params?.videoId || "").trim();
    if (!videoId) return { list: [] };
    try {
        logInfo("detail 请求", { videoId, host: getCurrentHost(), from: context?.from || "web" });
        const html = await fetchHtml(videoId, { ttl: DETAIL_CACHE_TTL });
        const name = stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] || "");
        const poster = fixUrl(html.match(/class="lazyload"[^>]*data-original="([^"]+)"/)?.[1] || html.match(/data-original="([^"]+)"/)?.[1] || "");
        const intro = stripTags(html.match(/<span class="detail-content"[^>]*>([\s\S]*?)<\/span>/)?.[1] || "");
        const score = stripTags(html.match(/<span class="score">([^<]+)<\/span>/)?.[1] || "");
        const metaItems = parseMetaItems(html);
        const typeName = metaItems[0] || "";
        const area = metaItems[1] || "";
        const year = metaItems[2]?.replace(/[^\d]/g, "") || "";
        const remarks = metaItems[5] || html.match(/<span class="pic-text[^>]*">([\s\S]*?)<\/span>/)?.[1] || "";
        const actor = metaItems.find((item) => item.startsWith("主演："))?.replace(/^主演：/, "") || "";
        const director = metaItems.find((item) => item.startsWith("导演："))?.replace(/^导演：/, "") || "";

        const allCollectSources = extractPlaylistSources(html, videoId, name);

        const netdiskPanels = splitNetdiskPanels(html);
        const netdiskSources = [];
        const processedHrefs = new Set();
        for (const panelHtml of netdiskPanels) {
            const rawSourceTitle = stripTags(panelHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1] || "网盘");
            if (!/(网盘|下载)/u.test(rawSourceTitle)) {
                logInfo("detail 跳过非网盘/下载线路", { sourceName: rawSourceTitle });
                continue;
            }
            const sourceName = normalizePanSourceName(rawSourceTitle);
            // 记录正在处理的网盘/下载线路（包括 UC）
            logInfo("detail 开始处理网盘线路", { sourceName, rawTitle: rawSourceTitle });
            const playLinks = [...panelHtml.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
            const episodes = [];
            for (const item of playLinks) {
                const href = fixUrl(item[1] || "");
                if (!/\/play\/[^\/]+\.html/i.test(href)) continue;
                if (processedHrefs.has(href)) continue;
                const label = stripTags(item[2] || "").trim() || "合集";
                const linkTextForPan = `${rawSourceTitle} ${label}`;
                if (!/(网盘|下载)/u.test(linkTextForPan)) continue;
                processedHrefs.add(href);
                const playPageHtml = await fetchHtml(href, { ttl: DETAIL_CACHE_TTL });
                const playerJson = playPageHtml.match(/player_aaaa\s*=\s*(\{[\s\S]*?\})<\/script>/)?.[1];
                let episodeList = [];
                // 如果没有 playerJson 且是 UC 网盘，尝试直接用 href 作为分享链接解析
                if (!playerJson && /UC/i.test(sourceName)) {
                    // UC 的播放页本身不是网盘链接，尝试在页面源码里寻找真实的 UC 分享链接
                    const possibleUrls = [];
                    const ucUrlMatch = playPageHtml.match(/https?:\/\/[^\s'"<>]*drive\.uc\.cn[^\s'"<>]*/i);
                    if (ucUrlMatch) possibleUrls.push(ucUrlMatch[0]);
                    const ucAltMatch = playPageHtml.match(/https?:\/\/[^\s'"<>]*uc\.cn\/s\/[^\s'"<>]*/i);
                    if (ucAltMatch) possibleUrls.push(ucAltMatch[0]);
                    let found = false;
                    for (const shareUrl of possibleUrls) {
                        if (isPanUrl(shareUrl)) {
                            const panInfo = await loadPanFiles(shareUrl);
                            episodeList = Array.isArray(panInfo?.videos) ? panInfo.videos : [];
                            if (episodeList.length) {
                                logInfo("detail UC 网盘通过页面提取解析成功", { sourceName, href, shareUrl, episodeCount: episodeList.length });
                                found = true;
                                break;
                            } else {
                                logInfo("detail UC 网盘通过页面提取无文件", { sourceName, href, shareUrl });
                            }
                        }
                    }
                    if (!found) {
                        logInfo("detail UC 网盘未能提取有效分享链接", { sourceName, href });
                    }
                }
                if (playerJson) {
                    try {
                        const player = JSON.parse(playerJson);
                        const rawFrom = String(player.from || "").toLowerCase();
                        const isPan = rawFrom.includes("uc") || rawFrom.includes("pan") || rawFrom.includes("baidu") || rawFrom.includes("quark") || rawFrom.includes("ali");
                        if (isPan && player.url) {
                            const shareUrl = normalizeShareUrl(decodePlayerUrl(player.url, player.encrypt));
                            if (isPanUrl(shareUrl)) {
                                const panInfo = await loadPanFiles(shareUrl);
                                episodeList = Array.isArray(panInfo?.videos) ? panInfo.videos : [];
                            }
                        }
                    } catch (error) {
                        logInfo("detail 网盘播放页解析失败", { href, error: error.message });
                    }
                }

                if (episodeList.length > 0) {
                    for (const file of episodeList) {
                        const fileId = getFileId(file);
                        if (!fileId) continue;
                        const rawFileName = getFileName(file) || label || "网盘资源";
                        const episodeName = /第\d+集/.test(rawFileName) ? rawFileName : (rawFileName !== "合集" ? rawFileName : (remarks.match(/第\d+集/)?.[0] || rawFileName));
                        episodes.push({
                            name: episodeName,
                            playId: buildPanEpisodePlayId(normalizeShareUrl(decodePlayerUrl(playerJson ? JSON.parse(playerJson).url : "", playerJson ? JSON.parse(playerJson).encrypt : 0)), fileId, {
                                mode: "pan-file",
                                shareUrl: normalizeShareUrl(decodePlayerUrl(playerJson ? JSON.parse(playerJson).url : "", playerJson ? JSON.parse(playerJson).encrypt : 0)),
                                fileId,
                                flag: sourceName,
                                name: episodeName,
                                vodName: name,
                                vodId: String(videoId || "")
                            })
                        });
                    }
                } else {
                    // 没有展开到具体文件时，不要把“合集”当做一集；直接跳过这个网盘源
                    logInfo("detail 网盘线路无具体集数，跳过合集占位", { sourceName, href, label });
                }
            }
            if (episodes.length) {
                logInfo("detail 网盘线路解析完成", { sourceName, episodeCount: episodes.length });
                netdiskSources.push({ name: sourceName, episodes });
            } else {
                logInfo("detail 网盘线路解析失败，已排除", { sourceName, playLinkCount: playLinks.length });
            }
        }

        // 过滤掉已经展开的网盘线路以及 UC 网盘（目前不解析）
        const parsedNetdiskSourceNames = new Set(netdiskSources.map((source) => source.name));
        // 处理 UC 网盘可能被误放入 collectSources 的情况
        const ucCollectSources = allCollectSources.filter((src) => normalizePanSourceName(src?.name || "") === "UC网盘");
        for (const src of ucCollectSources) {
            const rawSourceTitle = src.name || "UC网盘";
            const sourceName = normalizePanSourceName(rawSourceTitle);
            logInfo("detail 开始处理 UC 网盘采集线路", { sourceName, rawSourceTitle });
            const episodes = [];
            for (const ep of src.episodes || []) {
                // ep.playId 在 collectSources 里是普通集合链接 (play page)
                const href = fixUrl((ep.playId || "").split("|||")[0] || "");
                if (!href) continue;
                const playPageHtml = await fetchHtml(href, { ttl: DETAIL_CACHE_TTL });
                // 首先尝试直接从 player_aaaa 中取分享链接（UC 典型）
                let resolvedShareUrl = "";
                try {
                    const playerJsonMatch = playPageHtml.match(/player_aaaa\s*=\s*(\{[\s\S]*?\})<\/script>/);
                    if (playerJsonMatch) {
                        const player = JSON.parse(playerJsonMatch[1]);
                        if (player && typeof player.url === "string" && isPanUrl(player.url)) {
                            resolvedShareUrl = player.url;
                        }
                    }
                } catch (e) {
                    logInfo("detail UC 解析 player_aaaa 失败", { sourceName, href, error: e.message });
                }
                // 若未从 player_aaaa 取到，再尝试正则匹配普通 UC 分享链接
                const possibleUrls = [];
                if (resolvedShareUrl) {
                    possibleUrls.push(resolvedShareUrl);
                } else {
                    const ucUrlMatch = playPageHtml.match(/https?:\/\/[^\s'"<>]*drive\.uc\.cn[^\s'"<>]*/i);
                    if (ucUrlMatch) possibleUrls.push(ucUrlMatch[0]);
                    const ucAltMatch = playPageHtml.match(/https?:\/\/[^\s'"<>]*uc\.cn\/s\/[^\s'"<>]*/i);
                    if (ucAltMatch) possibleUrls.push(ucAltMatch[0]);
                }
                let found = false;
                for (const shareUrl of possibleUrls) {
                    if (!isPanUrl(shareUrl)) continue;
                    const panInfo = await loadPanFiles(shareUrl);
                    const videoList = panInfo?.videos || [];
                    if (videoList.length) {
                        for (const file of videoList) {
                            const fileId = getFileId(file);
                            const rawFileName = getFileName(file);
                            const episodeName = /第\d+集/.test(rawFileName) ? rawFileName : (rawFileName || ep.name);
                            episodes.push({
                                name: episodeName,
                                playId: buildPanEpisodePlayId(normalizeShareUrl(shareUrl), fileId, {
                                    mode: "pan-file",
                                    shareUrl: normalizeShareUrl(shareUrl),
                                    fileId,
                                    flag: sourceName,
                                    name: episodeName,
                                    vodName: name,
                                    vodId: videoId
                                })
                            });
                        }
                        logInfo("detail UC 网盘通过采集线路解析成功", { sourceName, href, shareUrl, episodeCount: videoList.length });
                        found = true;
                        break;
                    } else {
                        logInfo("detail UC 网盘通过采集线路解析无文件", { sourceName, href, shareUrl });
                    }
                }
                if (!found) {
                    logInfo("detail UC 网盘未能提取有效分享链接", { sourceName, href });
                }
            }
            if (episodes.length) {
                netdiskSources.push({ name: sourceName, episodes });
            } else {
                logInfo("detail UC 网盘解析失败，已排除", { sourceName });
            }
        }
        const collectSources = allCollectSources.filter((source) => {
            const normName = normalizePanSourceName(source?.name || "");
            // 已经在 netdiskSources 中的（已展开）
            if (parsedNetdiskSourceNames.has(normName)) return false;
            // 已经在 UC 处理后加入 netdiskSources 的也排除
            if (netdiskSources.some((s) => normalizePanSourceName(s.name) === normName)) return false;
            return true;
        });
        if (allCollectSources.length !== collectSources.length) {
            logInfo("detail 移除未展开或不支持的网盘线路", {
                videoId,
                removed: allCollectSources.length - collectSources.length,
                parsedNetdiskSources: Array.from(parsedNetdiskSourceNames).join(" | ")
            });
        }
        const sortedNetdiskSources = sortPlaySourcesByDriveOrder(netdiskSources);
        const expandedNetdiskSources = expandPanSourcesWithRoutes(sortedNetdiskSources, context?.from || "web");


        // --------- Unified scraping logic (replace previous per-source buckets) ---------
        // 1️⃣ 把所有已经展开的网盘线路（netdiskSources）和普通采集线路（collectSources）统一放进 allSources
        const allSources = [];
        // 2️⃣ 为每条 episode 计算唯一的 fid（shareUrl|fileId），并收集成一次性刮削候选列表
        const scrapeCandidates = [];
        // ---- 处理已展开的网盘线路 ----
        for (const src of netdiskSources) {
            if (Array.isArray(src?.episodes) && src.episodes.length) {
                src.episodes = src.episodes.map((ep) => {
                    const meta = decodeCombinedPlayId(ep.playId || "")?.meta || {};
                    const shareUrl = String(meta.shareUrl || meta.shareURL || "").trim();
                    const fileId = String(meta.fileId || meta.fid || "").trim();
                    const fid = shareUrl && fileId ? `${shareUrl}|${fileId}` : (fileId || ep.playId);
                    ep._fid = fid;
                    return ep;
                });
                allSources.push(src);
                for (const ep of src.episodes) {
                    if (!ep._fid) continue;
                    scrapeCandidates.push({
                        fid: ep._fid,
                        file_id: ep._fid,
                        file_name: ep.name || "正片",
                        name: ep.name || "正片",
                        format_type: "video",
                    });
                }
            }
        }
        // ---- 处理普通采集线路（如果有展开文件） ----
        for (const src of collectSources) {
            if (Array.isArray(src?.episodes) && src.episodes.length) {
                src.episodes = src.episodes.map((ep) => {
                    const meta = decodeCombinedPlayId(ep.playId || "")?.meta || {};
                    const shareUrl = String(meta.shareUrl || meta.shareURL || "").trim();
                    const fileId = String(meta.fileId || meta.fid || "").trim();
                    const fid = shareUrl && fileId ? `${shareUrl}|${fileId}` : (fileId || ep.playId);
                    ep._fid = fid;
                    return ep;
                });
                allSources.push(src);
                for (const ep of src.episodes) {
                    if (!ep._fid) continue;
                    scrapeCandidates.push({
                        fid: ep._fid,
                        file_id: ep._fid,
                        file_name: ep.name || "正片",
                        name: ep.name || "正片",
                        format_type: "video",
                    });
                }
            }
        }
        logInfo("detail 刮削候选", {
            videoId,
            count: scrapeCandidates.length,
            preview: scrapeCandidates.slice(0, 3).map((i) => `${String(i.fid || "").split("|").slice(-1)[0] || "unknown"}=>${i.file_name}`).join(" | ")
        });
        // --------- 一次统一刮削 ---------
        let scrapeData = null;
        let videoMappings = [];
        if (scrapeCandidates.length) {
            const keyword = normalizeText(name || "");
            try {
                await OmniBox.processScraping(videoId, keyword, keyword, scrapeCandidates);
                const metadata = await OmniBox.getScrapeMetadata(videoId);
                scrapeData = metadata?.scrapeData || null;
                videoMappings = Array.isArray(metadata?.videoMappings) ? metadata.videoMappings : [];
                logInfo("detail 刮削完成", { videoId, keyword, mappings: videoMappings.length });
            } catch (e) {
                logInfo("detail 刮削失败", { videoId, error: e.message });
            }
        } else {
            logInfo("detail 刮削候选为空，跳过刮削", { videoId });
        }
        // --------- 将刮削映射回填到每条 episode 上，并在回填后按集数排序 ---------
        const mappingMap = new Map();
        for (const mapping of videoMappings) {
            if (!mapping || typeof mapping !== "object") continue;
            const keys = [mapping.fileId, mapping.file_id, mapping.fid]
                .map((item) => String(item || "").trim())
                .filter(Boolean);
            for (const key of keys) {
                if (!mappingMap.has(key)) {
                    mappingMap.set(key, mapping);
                }
            }
        }
        for (const src of allSources) {
            for (const ep of src.episodes || []) {
                const fid = String(ep?._fid || "").trim();
                if (!fid) continue;
                const mapping = mappingMap.get(fid);
                const fidLog = fid.split("|").slice(-1)[0] || fid;
                if (!mapping) {
                    logInfo("detail 分集未命中刮削映射", { fid: fidLog, episodeName: ep.name });
                    continue;
                }
                const oldName = ep.name || "";
                const newName = buildScrapedEpisodeName(scrapeData, mapping, oldName);
                if (newName && newName !== oldName) {
                    ep.name = newName;
                    logInfo("detail 应用刮削分集名", { fid: fidLog, from: oldName, to: newName });
                }
                const decoded = decodeCombinedPlayId(ep.playId || "");
                const meta = decoded?.meta || {};
                meta.fid = fid;
                meta.e = ep.name;
                meta.sid = meta.sid || videoId;
                meta.vodId = meta.vodId || videoId;
                meta.vodName = meta.vodName || name;
                if (mapping.seasonNumber !== undefined && mapping.seasonNumber !== null) meta.s = mapping.seasonNumber;
                if (mapping.episodeNumber !== undefined && mapping.episodeNumber !== null) meta.n = mapping.episodeNumber;
                ep.playId = `${decoded?.main || ""}|||${encodePlayId(meta)}`;
            }
            if (Array.isArray(src.episodes)) {
                src.episodes = sortEpisodesByMeta(src.episodes);
            }
        }

        // --------- 合并并去重所有来源 ---------
        const mergedPlaySourcesMap = new Map();
        for (const src of allSources) {
            const sourceName = String(src?.name || "").trim();
            if (!sourceName) continue;
            if (!mergedPlaySourcesMap.has(sourceName)) {
                mergedPlaySourcesMap.set(sourceName, { name: sourceName, episodes: [] });
            }
            const target = mergedPlaySourcesMap.get(sourceName);
            const seen = new Set(target.episodes.map((e) => e.playId));
            for (const ep of src.episodes || []) {
                if (!ep.playId || seen.has(ep.playId)) continue;
                target.episodes.push(ep);
                seen.add(ep.playId);
            }
            target.episodes = sortEpisodesByMeta(target.episodes);
        }
        const vod_play_sources = Array.from(mergedPlaySourcesMap.values()).filter((s) => s.episodes && s.episodes.length);

        // --------- 排序并展开线路（保持原有的 drive 排序、路由逻辑） ---------
        const sortedFinalPlaySources = sortPlaySourcesByDriveOrder(vod_play_sources);
        const expandedFinalPlaySources = expandPanSourcesWithRoutes(sortedFinalPlaySources, context?.from || "web");

        // --------- 刮削详情回填 ---------
        let finalName = name;
        let finalPoster = poster;
        let finalTypeName = typeName;
        let finalYear = year;
        let finalArea = area;
        let finalActor = actor;
        let finalDirector = director;
        let finalIntro = intro;
        let finalScore = score.replace(/分$/, "");
        const finalRemarks = stripTags(remarks);
        let finalVodClass = "";

        if (scrapeData && typeof scrapeData === "object") {
            if (scrapeData.title) {
                finalName = String(scrapeData.title).trim() || finalName;
            }
            if (scrapeData.posterPath) {
                finalPoster = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
            }
            const releaseDate = String(scrapeData.releaseDate || scrapeData.release_date || scrapeData.firstAirDate || scrapeData.first_air_date || scrapeData.seasonAirYear || "").trim();
            if (releaseDate) {
                finalYear = releaseDate.slice(0, 4) || finalYear;
            }
            if (scrapeData.overview) {
                finalIntro = String(scrapeData.overview).trim() || finalIntro;
            }
            const voteAverage = Number(scrapeData.voteAverage ?? scrapeData.vote_average);
            if (Number.isFinite(voteAverage) && voteAverage > 0) {
                finalScore = voteAverage.toFixed(1);
            }
            const genreNames = Array.isArray(scrapeData.genres)
                ? scrapeData.genres.map((item) => item?.name).filter(Boolean)
                : [];
            if (genreNames.length) {
                finalTypeName = genreNames.join("/") || finalTypeName;
                finalVodClass = genreNames.join(",");
            }
            const actorNames = Array.isArray(scrapeData.credits?.cast)
                ? scrapeData.credits.cast.slice(0, 5).map((item) => item?.name || item?.character || "").filter(Boolean)
                : [];
            if (actorNames.length) {
                finalActor = actorNames.join(",");
            } else if (scrapeData.actors) {
                finalActor = String(scrapeData.actors).trim() || finalActor;
            }
            const directorNames = Array.isArray(scrapeData.credits?.crew)
                ? scrapeData.credits.crew
                    .filter((item) => item?.job === "Director" || item?.department === "Directing")
                    .slice(0, 3)
                    .map((item) => item?.name || "")
                    .filter(Boolean)
                : [];
            if (directorNames.length) {
                finalDirector = directorNames.join(",");
            } else if (scrapeData.director) {
                finalDirector = String(scrapeData.director).trim() || finalDirector;
            }
            const areaNames = [
                ...(Array.isArray(scrapeData.productionCountries) ? scrapeData.productionCountries.map((item) => item?.name) : []),
                ...(Array.isArray(scrapeData.originCountry) ? scrapeData.originCountry : []),
                ...(Array.isArray(scrapeData.origin_country) ? scrapeData.origin_country : []),
            ].map((item) => String(item || "").trim()).filter(Boolean);
            if (areaNames.length) {
                finalArea = Array.from(new Set(areaNames)).slice(0, 3).join("/");
            }
        }

        // --------- 构建最终返回结构（不再使用 _play_sources_for_scrape） ---------
        const result = {
            list: [{
                vod_id: videoId,
                vod_name: finalName,
                vod_pic: finalPoster,
                type_name: finalTypeName,
                vod_class: finalVodClass,
                vod_year: finalYear,
                vod_area: finalArea,
                vod_actor: finalActor,
                vod_director: finalDirector,
                vod_content: finalIntro,
                vod_douban_score: finalScore,
                vod_remarks: finalRemarks,
                vod_play_sources: expandedFinalPlaySources
            }]
        };
        const vod = result.list?.[0];
        if (vod) {
            Object.assign(vod, buildLegacyPlayFields(vod.vod_play_sources || []));
        }
        logInfo("detail 完成", {
            videoId,
            sourceCount: vod_play_sources.length,
            episodeCount: vod_play_sources.reduce((n, item) => n + item.episodes.length, 0),
            scraped: !!scrapeData,
            actor: finalActor,
            director: finalDirector
        });
        return result;
    } catch (error) {
        logError("detail 失败", error);
        return { list: [] };
    }
}

async function search(params, context) {
    const keyword = String(params?.keyword || "").trim();
    const page = Number(params?.page || 1);
    if (!keyword) return emptyPage(page);
    try {
        const path = buildSearchPath(keyword, page);
        logInfo("search 请求", { keyword, page, host: getCurrentHost(), path, quick: params?.quick ? 1 : 0, from: context?.from || "web" });
        const html = await fetchHtml(path, { ttl: SEARCH_CACHE_TTL });
        const list = parseVodList(html);
        const pagecount = list.length === DEFAULT_PAGE_SIZE ? page + 1 : page;
        logInfo("search 完成", { keyword, page, listCount: list.length, pagecount });
        return {
            page,
            pagecount,
            total: list.length + (pagecount > page ? DEFAULT_PAGE_SIZE : 0),
            limit: DEFAULT_PAGE_SIZE,
            list
        };
    } catch (error) {
        logError("search 失败", error);
        return emptyPage(page);
    }
}

async function play(params, context) {
    const flag = String(params?.flag || "LIBVIO");
    const playId = String(params?.playId || "").trim();
    if (!playId) return emptyPlay(flag);
    try {
        const { main: rawPlayId, meta } = decodeCombinedPlayId(playId);
        const playPageUrl = resolveCollectPlayPageUrl(rawPlayId, meta);
        const playFlag = String(meta.flag || flag || "LIBVIO");
        if (!playPageUrl) {
            logInfo("play 无法解析播放页地址", { rawPlayId, flag: playFlag, meta });
            return emptyPlay(playFlag);
        }

        if (meta.mode === "pan-file") {
            const shareURL = normalizeShareUrl(meta.shareUrl || "");
            const fileId = String(meta.fileId || "");
            const routeType = String(meta.routeType || "").trim() || (context?.from === "web" ? "服务端代理" : "直连");
            if (shareURL && fileId) {
                const playInfoPromise = OmniBox.getDriveVideoPlayInfo(shareURL, fileId, routeType);
                const metadataPromise = (async () => {
                    const result = {
                        danmakuList: [],
                        scrapeTitle: "",
                        scrapePic: "",
                        episodeNumber: meta?.n ?? null,
                        episodeName: meta?.name || meta?.e || "",
                    };
                    if (!meta?.fid || typeof OmniBox.getScrapeMetadata !== "function") {
                        logInfo("play 网盘增强链路跳过", { shareURL, fid: meta?.fid || "" });
                        return result;
                    }
                    try {
                        const metadata = await OmniBox.getScrapeMetadata(String(meta.sid || meta.vodId || ""));
                        if (!metadata || !metadata.scrapeData) {
                            logInfo("play 网盘增强链路跳过: metadata 不完整", { shareURL, vodId: meta.sid || meta.vodId || "" });
                            return result;
                        }
                        result.scrapeTitle = metadata.scrapeData.title || "";
                        if (metadata.scrapeData.posterPath) {
                            result.scrapePic = `https://image.tmdb.org/t/p/w500${metadata.scrapeData.posterPath}`;
                        }
                        const mappings = Array.isArray(metadata.videoMappings) ? metadata.videoMappings : [];
                        const mapping = mappings.find((item) => item?.fileId === meta.fid);
                        if (mapping) {
                            result.episodeName = buildScrapedEpisodeName(metadata.scrapeData, mapping, result.episodeName || meta.name || "");
                            if (mapping.episodeNumber !== undefined && mapping.episodeNumber !== null) {
                                result.episodeNumber = mapping.episodeNumber;
                            }
                        }
                        const fileName = buildDanmakuFileName(result.scrapeTitle || meta.vodName || "", result.episodeName || meta.name || "");
                        if (fileName && typeof OmniBox.getDanmakuByFileName === "function") {
                            const matchedDanmaku = await OmniBox.getDanmakuByFileName(fileName);
                            if (Array.isArray(matchedDanmaku) && matchedDanmaku.length > 0) {
                                result.danmakuList = matchedDanmaku;
                            }
                            logInfo("play 网盘弹幕匹配", { fileName, count: Array.isArray(matchedDanmaku) ? matchedDanmaku.length : 0 });
                        }
                    } catch (error) {
                        logInfo("play 网盘增强链路失败", { shareURL, error: error.message });
                    }
                    return result;
                })();
                const [playInfoResult, metadataResult] = await Promise.allSettled([playInfoPromise, metadataPromise]);
                if (playInfoResult.status === "fulfilled") {
                    const playInfo = playInfoResult.value || {};
                    const urlList = Array.isArray(playInfo?.url) ? playInfo.url : [];
                    const metadataValue = metadataResult.status === "fulfilled" ? metadataResult.value : {};
                    const danmakuList = metadataValue?.danmakuList?.length ? metadataValue.danmakuList : (playInfo?.danmaku || []);
                    if (meta?.fid && context?.sourceId && typeof OmniBox.addPlayHistory === "function") {
                        const historyPayload = {
                            vodId: String(meta.sid || meta.vodId || ""),
                            title: metadataValue?.scrapeTitle || meta.vodName || meta.name || "LIBVIO视频",
                            pic: metadataValue?.scrapePic || "",
                            episode: buildHistoryEpisode(playId, metadataValue?.episodeNumber, metadataValue?.episodeName || meta.name || meta.e || ""),
                            sourceId: context.sourceId,
                            episodeNumber: metadataValue?.episodeNumber,
                            episodeName: metadataValue?.episodeName || meta.name || meta.e || "",
                        };
                        OmniBox.addPlayHistory(historyPayload).then((added) => {
                            OmniBox.log("info", `[LIBVIO] play 网盘播放记录${added ? "已添加" : "已存在"}: ${historyPayload.title}`);
                        }).catch((error) => {
                            OmniBox.log("info", `[LIBVIO] play 网盘添加播放记录失败: ${error.message}`);
                        });
                    }
                    return {
                        urls: urlList.map((item) => ({ name: item.name || meta.name || "播放", url: item.url })),
                        header: playInfo?.header || {},
                        parse: 0,
                        danmaku: danmakuList};
                }
                logInfo("play 网盘直取失败", { shareURL, fileId, routeType, error: playInfoResult.reason?.message || String(playInfoResult.reason || "") });
                return {
                    parse: 0,
                    urls: [{ name: meta.name || "网盘资源", url: `push://${shareURL}` }]
                };
            }
        }

        const sniffHeaders = {
            Referer: `${getCurrentHost()}/`,
            Origin: getCurrentHost(),
            "User-Agent": UA
        };
        const playInfoPromise = (async () => {
            const cacheKey = buildCacheKey("libvio:play", playPageUrl, playFlag, context?.from || "web");
            return await getCachedJson(cacheKey, PLAY_CACHE_TTL, async () => {
                logInfo("play 请求", { playPageUrl, flag: playFlag, from: context?.from || "web" });
                const html = await fetchHtml(playPageUrl, { ttl: PLAY_CACHE_TTL });
                const playerJson = html.match(/player_aaaa\s*=\s*(\{[\s\S]*?\})<\/script>/)?.[1];
                if (!playerJson) {
                    logInfo("play 未找到 player_aaaa", { playPageUrl });
                    return {
                        parse: 1,
                        header: sniffHeaders,
                        urls: [{ name: meta.name || "播放", url: playPageUrl }],
                        danmaku: []
                    };
                }

                const player = JSON.parse(playerJson);
                const realUrl = buildPlayUrl(decodePlayerUrl(player.url, player.encrypt));
                if (realUrl && isDirectMediaUrl(realUrl)) {
                    logInfo("play 直链完成", { playPageUrl, from: player.from, finalUrl: realUrl });
                    return {
                        parse: 0,
                        header: sniffHeaders,
                        urls: [{ name: meta.name || "播放", url: realUrl }],
                        danmaku: []
                    };
                }

                const iframeUrl = buildProviderIframeUrl(player);
                const sniffTarget = iframeUrl || playPageUrl;
                try {
                    const sniffResult = await OmniBox.sniffVideo(sniffTarget, sniffHeaders);
                    const sniffUrls = Array.isArray(sniffResult?.urls) ? sniffResult.urls.filter((item) => item?.url) : [];
                    if (!sniffUrls.length && sniffResult?.url) {
                        sniffUrls.push({ name: meta.name || "播放", url: sniffResult.url });
                    }
                    if (sniffUrls.length) {
                        logInfo("play SDK嗅探完成", { playPageUrl, from: player.from, sniffTarget, sniffCount: sniffUrls.length, first: sniffUrls[0] || null });
                        return {
                            parse: 0,
                            header: sniffResult?.header || sniffHeaders,
                            urls: sniffUrls.map((item) => ({ name: item.name || meta.name || "播放", url: item.url })),
                            danmaku: sniffResult?.danmaku || []
                        };
                    }
                    logInfo("play SDK嗅探无结果", { playPageUrl, from: player.from, sniffTarget, sniffResult: sniffResult || null });
                } catch (sniffError) {
                    logInfo("play SDK嗅探失败", { playPageUrl, from: player.from, sniffTarget, error: sniffError.message });
                }

                logInfo("play 使用嗅探兜底", { playPageUrl, decodedUrl: realUrl, iframeUrl, sniffTarget });
                return {
                    parse: 1,
                    header: sniffHeaders,
                    urls: [{ name: meta.name || "播放", url: sniffTarget }],
                    danmaku: []
                };
            });
        })();

        const metadataPromise = (async () => {
            const result = {
                danmakuList: [],
                scrapeTitle: "",
                scrapePic: "",
                episodeNumber: meta?.n ?? null,
                episodeName: meta?.e || meta?.name || "",
            };
            if (!meta?.fid || !meta?.sid || typeof OmniBox.getScrapeMetadata !== "function") {
                logInfo("play 播放增强链路跳过", { fid: meta?.fid || "", sid: meta?.sid || "" });
                return result;
            }
            try {
                const metadata = await OmniBox.getScrapeMetadata(String(meta.sid || ""));
                if (!metadata || !metadata.scrapeData) {
                    logInfo("play 播放增强链路跳过: metadata 不完整", { videoId: meta.sid || "" });
                    return result;
                }
                result.scrapeTitle = metadata.scrapeData.title || "";
                if (metadata.scrapeData.posterPath) {
                    result.scrapePic = `https://image.tmdb.org/t/p/w500${metadata.scrapeData.posterPath}`;
                }
                const mappings = Array.isArray(metadata.videoMappings) ? metadata.videoMappings : [];
                logInfo("play 播放增强元数据", { videoId: meta.sid || "", mappings: mappings.length, fid: meta.fid });
                const mapping = mappings.find((item) => item?.fileId === meta.fid);
                if (mapping) {
                    result.episodeName = buildScrapedEpisodeName(metadata.scrapeData, mapping, result.episodeName || meta.name || "");
                    if (mapping.episodeNumber !== undefined && mapping.episodeNumber !== null) {
                        result.episodeNumber = mapping.episodeNumber;
                    }
                } else if (mappings.length > 0) {
                    logInfo("play 播放增强未命中 mapping", { expected: meta.fid, preview: mappings.slice(0, 2).map((item) => `${item?.fileId || "<empty>"}=>${item?.episodeName || ""}`).join(" | ") });
                }
                const fileName = buildDanmakuFileName(result.scrapeTitle || meta.v || "", result.episodeName || meta.name || "");
                if (fileName && typeof OmniBox.getDanmakuByFileName === "function") {
                    const matchedDanmaku = await OmniBox.getDanmakuByFileName(fileName);
                    const count = Array.isArray(matchedDanmaku) ? matchedDanmaku.length : 0;
                    logInfo("play 弹幕匹配", { fileName, count });
                    if (count > 0) {
                        result.danmakuList = matchedDanmaku;
                    }
                }
            } catch (error) {
                logInfo("play 读取刮削元数据失败", { error: error.message, videoId: meta.sid || "" });
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
        let episodeNumber = meta?.n ?? null;
        let episodeName = meta?.e || meta?.name || "";
        if (metadataResult.status === "fulfilled" && metadataResult.value) {
            danmakuList = metadataResult.value.danmakuList || [];
            scrapeTitle = metadataResult.value.scrapeTitle || "";
            scrapePic = metadataResult.value.scrapePic || "";
            if (metadataResult.value.episodeNumber !== undefined && metadataResult.value.episodeNumber !== null) {
                episodeNumber = metadataResult.value.episodeNumber;
            }
            episodeName = metadataResult.value.episodeName || episodeName;
        } else if (metadataResult.status === "rejected") {
            logInfo("play 播放增强链路失败(不影响播放)", { error: metadataResult.reason?.message || String(metadataResult.reason || "") });
        }
        if (danmakuList.length > 0) {
            playResult.danmaku = danmakuList;
        }
        if (meta?.fid && context?.sourceId && typeof OmniBox.addPlayHistory === "function") {
            const historyPayload = {
                vodId: String(meta.sid || ""),
                title: scrapeTitle || meta.v || meta.name || "LIBVIO视频",
                pic: scrapePic || "",
                episode: buildHistoryEpisode(playId, episodeNumber, episodeName),
                sourceId: context.sourceId,
                episodeNumber,
                episodeName: episodeName || "",
            };
            OmniBox.addPlayHistory(historyPayload)
                .then((added) => {
                    OmniBox.log("info", `[LIBVIO] play 已${added ? "添加" : "跳过"}播放记录: ${historyPayload.title}`);
                })
                .catch((error) => {
                    OmniBox.log("info", `[LIBVIO] play 添加播放记录失败: ${error.message}`);
                });
        } else {
            logInfo("play 跳过播放记录", { sourceId: context?.sourceId || "", fid: meta?.fid || "", hasApi: typeof OmniBox.addPlayHistory === "function" });
        }
        return playResult;
    } catch (error) {
        logError("play 失败", error);
        return emptyPlay(flag);
    }
}

});

_load(4, "两个BT", function (module, exports, require) {
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

_load(5, "乐兔", function (module, exports, require) {
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

_load(6, "人人影视PRO", function (module, exports, require) {
// @name 人人影视PRO
// @author 梦
// @description 页面解析：首页/分类/播放页已接入；播放页直接解析 Artplayer 的 m3u8 地址与剧集列表
// @dependencies cheerio
// @version 1.1.1
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/人人影视PRO.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const cheerio = require("cheerio");

const BASE_URL = "https://www.renren.pro";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

const CLASS_LIST = [
  { type_id: "all", type_name: "影视库" }
];

const CATEGORY_PATH = {
  all: "/list/all"
};

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

  $("a[href^='/play/']").each((_, el) => {
    const $a = $(el);
    const href = $a.attr("href") || "";
    if (!/^\/play\//.test(href)) return;

    const title = $a.attr("title") || stripHtml($a.text()) || stripHtml($a.find(".module-poster-item-title, .module-item-title, .title").first().text());
    if (!title) return;

    const card = $a.closest(".module-item, .module-item-cover, .module-list-item, .vod-item, .video-item");
    const img = card.find("img").first().length ? card.find("img").first() : $a.find("img").first();
    const pic = img.attr("data-src") || img.attr("data-original") || img.attr("src") || "";
    const remarks = stripHtml(card.find(".module-item-note, .remarks, .video-serial, .public-list-prb, .module-item-text").first().text());
    const vodId = href.replace(/^\//, "");

    list.push({
      vod_id: vodId,
      vod_name: title,
      vod_pic: absUrl(pic),
      vod_remarks: remarks
    });
  });

  return dedupeBy(list, (item) => item.vod_id);
}

async function resolvePosterByPlayId(playId) {
  const normalizedId = String(playId || "").replace(/^https?:\/\/[^/]+\//, "").replace(/^\//, "");
  if (!normalizedId) return "";

  const pages = [`${BASE_URL}/`, `${BASE_URL}/list/all`];
  for (const url of pages) {
    try {
      const html = await fetchText(url);
      const cards = parseVodCards(html);
      const hit = cards.find((item) => item.vod_id === normalizedId && item.vod_pic);
      if (hit?.vod_pic) return hit.vod_pic;
    } catch (e) {
      await OmniBox.log("warn", `[人人影视][poster] url=${url} message=${e.message}`);
    }
  }
  return "";
}

function parseEpisodeLinks(html, pageUrl) {
  const $ = cheerio.load(html, { decodeEntities: false });
  const list = [];
  $(".module-blocklist a[href^='/play/']").each((_, el) => {
    const $a = $(el);
    const href = $a.attr("href") || "";
    const name = stripHtml($a.text()) || stripHtml($a.attr("title") || "");
    if (!href || !name) return;
    list.push({ name, playId: absUrl(href, pageUrl) });
  });
  return dedupeBy(list, (item) => item.playId);
}

function extractPlayUrl(html) {
  const raw = String(html || "");
  const hit = raw.match(/url:\s*"([^"]+\.m3u8[^"]*)"/i) || raw.match(/url":"([^"]+\.m3u8[^"]*)"/i);
  if (!hit) return "";
  return String(hit[1] || "").replace(/\\\//g, "/").trim();
}

async function home(params, context) {
  try {
    const html = await fetchText(`${BASE_URL}/`);
    const list = parseVodCards(html).slice(0, 40);
    await OmniBox.log("info", `[人人影视][home] list=${list.length}`);
    return { class: CLASS_LIST, list };
  } catch (e) {
    await OmniBox.log("error", `[人人影视][home] ${e.message}`);
    return { class: CLASS_LIST, list: [] };
  }
}

async function category(params, context) {
  try {
    const categoryId = String(params?.categoryId || "all").trim();
    const page = Math.max(1, Number(params?.page || 1) || 1);
    const basePath = CATEGORY_PATH[categoryId] || CATEGORY_PATH.all;
    const url = page > 1 ? `${absUrl(basePath)}?page=${page}` : absUrl(basePath);
    const html = await fetchText(url);
    const list = parseVodCards(html);
    const pageNums = [...html.matchAll(/[?&]page=(\d+)/g)].map((m) => Number(m[1]));
    const pagecount = Math.max(page, ...(pageNums.length ? pageNums : [page]));
    await OmniBox.log("info", `[人人影视][category] category=${categoryId} page=${page} list=${list.length} pagecount=${pagecount}`);
    return { page, pagecount, total: list.length, list };
  } catch (e) {
    await OmniBox.log("error", `[人人影视][category] ${e.message}`);
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }
}

async function detail(params, context) {
  try {
    const videoId = String(params?.videoId || "").trim();
    if (!videoId) return { list: [] };

    const detailUrl = /^https?:\/\//i.test(videoId) ? videoId : `${BASE_URL}/${videoId.replace(/^\//, "")}`;
    const html = await fetchText(detailUrl);
    const $ = cheerio.load(html, { decodeEntities: false });

    const pageTitle = stripHtml($("title").first().text());
    const vodName = stripHtml($(".title-link").first().text()) || pageTitle.replace(/\s*-\s*第\d+集.*$/, "").replace(/\s*-\s*免费在线观看.*$/, "").trim();
    const poster = $(".video-cover img, .module-item-pic img, img").first();
    let vodPic = absUrl(poster.attr("data-src") || poster.attr("src") || "");
    if (!vodPic || /\/public\/statics\/images\/renren\.png$/i.test(vodPic) || /\/public\/.+\.gif$/i.test(vodPic)) {
      vodPic = await resolvePosterByPlayId(videoId);
    }
    const tagList = $(".video-info-aux .tag-link").map((_, el) => stripHtml($(el).text())).get().filter(Boolean);
    const typeName = tagList[0] || "";
    const vodLang = tagList[1] || "";
    const vodArea = tagList[2] || "";
    const sideTitle = stripHtml($(".title-info").first().text());
    const metaDesc = stripHtml($("meta[name='description']").attr("content") || "");
    const headings = $("h1, h2, h3, h4").map((_, el) => stripHtml($(el).text())).get().filter(Boolean);
    const episodeMatch = (pageTitle.match(/第\d+集/) || [])[0] || (headings.find((t) => /第\d+集/.test(t)) || "");
    const remarks = [typeName, vodLang, vodArea, episodeMatch].filter(Boolean).join(" · ");
    const vodContent = [sideTitle, metaDesc].filter(Boolean).join("\n");
    const yearMatch = html.match(/20\d{2}/);
    const vodYear = yearMatch ? yearMatch[0] : "";

    const episodes = parseEpisodeLinks(html, detailUrl);
    const vodPlaySources = episodes.length ? [{ name: "在线播放", episodes }] : [];

    await OmniBox.log("info", `[人人影视][detail] videoId=${videoId} episodes=${episodes.length}`);
    return {
      list: [
        {
          vod_id: videoId.replace(/^https?:\/\/[^/]+\//, ""),
          vod_name: vodName,
          vod_pic: vodPic,
          type_name: typeName,
          vod_area: vodArea,
          vod_year: vodYear,
          vod_subtitle: vodLang,
          vod_content: vodContent,
          vod_remarks: remarks,
          vod_play_sources: vodPlaySources
        }
      ]
    };
  } catch (e) {
    await OmniBox.log("error", `[人人影视][detail] ${e.message}`);
    return { list: [] };
  }
}

async function search(params, context) {
  try {
    const keyword = String(params?.keyword || params?.wd || "").trim();
    const page = Math.max(1, Number(params?.page || 1) || 1);
    if (!keyword) return { page, pagecount: 0, total: 0, list: [] };

    const url = `${BASE_URL}/search?wd=${encodeURIComponent(keyword)}`;
    const html = await fetchText(url);
    const list = parseVodCards(html);
    await OmniBox.log("info", `[人人影视][search] keyword=${keyword} list=${list.length}`);
    return { page, pagecount: 1, total: list.length, list };
  } catch (e) {
    await OmniBox.log("error", `[人人影视][search] ${e.message}`);
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }
}

async function play(params, context) {
  try {
    const playId = String(params?.playId || "").trim();
    if (!playId) return { urls: [], parse: 0, header: {} };

    const html = await fetchText(playId, { referer: `${BASE_URL}/` });
    const playUrl = extractPlayUrl(html);
    await OmniBox.log("info", `[人人影视][play] playId=${playId} url=${playUrl}`);

    if (!/^https?:\/\//i.test(playUrl)) {
      return {
        urls: [{ name: "播放页", url: playId }],
        parse: 1,
        header: { "User-Agent": UA, Referer: playId }
      };
    }

    return {
      urls: [{ name: "默认线路", url: playUrl }],
      parse: 0,
      header: { "User-Agent": UA, Referer: playId }
    };
  } catch (e) {
    await OmniBox.log("error", `[人人影视][play] ${e.message}`);
    return { urls: [], parse: 0, header: {} };
  }
}

});

_load(7, "凡客TV", function (module, exports, require) {
// @name 凡客TV
// @author 梦
// @description 刮削：已接入，弹幕：未接入，嗅探：官方 playback_v2 直链优先（失败时页面回退）；适配新版 /ysapi 接口
// @dependencies crypto-js
// @version 1.4.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/凡客TV.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const CryptoJS = require("crypto-js");
const https = require("https");

const BASE_URL = "https://fktv.me";
const API_BASE = `${BASE_URL}/ysapi`;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0";
const API_KEY = "9ed1a661a6ab787a";
const DEVICE_ID = "57nTmEknMZ146xw4KXGHDCHk1MjshRyY";
const PAGE_SIZE = 32;

const CATEGORIES = [
  { type_id: "movie", type_name: "电影" },
  { type_id: "tv", type_name: "电视剧" },
  { type_id: "comic", type_name: "动漫" },
  { type_id: "zy", type_name: "综艺" },
  { type_id: "short_tv", type_name: "短剧" },
  { type_id: "jlp", type_name: "纪录片" },
  { type_id: "js", type_name: "电影解说" }
];
const POSITION_NAMES = Object.fromEntries(CATEGORIES.map((it) => [it.type_id, it.type_name]));
const LEGACY_POSITIONS = {
  "1": "movie",
  "2": "tv",
  "3": "zy",
  "4": "comic",
  "5": "tv",
  "6": "jlp",
  "7": "js",
  "8": "short_tv"
};

function _json(data) {
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

async function _log(level, message, extra) {
  const suffix = typeof extra === "undefined" ? "" : ` | ${_json(extra)}`;
  await OmniBox.log(level, `[FKTV] ${message}${suffix}`);
}

function _safeJsonParse(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function _normalizePagination(page, pageSize, total, pagecount) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.min(Math.floor(pageSize), 100) : 20;
  const safeTotal = Number.isFinite(total) && total >= 0 ? total : 0;
  const safePagecount = Number.isFinite(pagecount) && pagecount > 0
    ? pagecount
    : (safeTotal > 0 ? Math.ceil(safeTotal / safePageSize) : (safePage > 1 ? safePage : 1));
  return { page: safePage, pagecount: safePagecount, limit: safePageSize, total: safeTotal };
}

function _apiTime() {
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

function _encryptPayload(data, referer) {
  const outer = {
    deviceId: DEVICE_ID,
    token: "",
    domain: "fktv.me",
    referer: referer || `${BASE_URL}/`,
    user_agent: UA,
    shareCode: "",
    channel: "",
    ip: "",
    data: data || {}
  };
  const key = CryptoJS.enc.Utf8.parse(API_KEY);
  return CryptoJS.AES.encrypt(JSON.stringify(outer), key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  }).toString();
}

function _decryptResponse(text) {
  const value = String(text || "").trim();
  if (!value) throw new Error("接口返回为空");
  if (value.startsWith("{") || value.startsWith("[")) return _safeJsonParse(value, null);
  const key = CryptoJS.enc.Utf8.parse(API_KEY);
  const plain = CryptoJS.AES.decrypt(value, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  }).toString(CryptoJS.enc.Utf8);
  return _safeJsonParse(plain, null);
}

function _httpsPost(url, body, referer, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = Buffer.from(body, "utf8");
    const req = https.request({
      hostname: u.hostname,
      port: u.port || 443,
      path: `${u.pathname}${u.search}`,
      method: "POST",
      rejectUnauthorized: false,
      timeout,
      headers: {
        "accept": "application/json, text/plain, */*",
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
        "content-type": "application/octet-stream",
        "content-length": String(data.length),
        "origin": BASE_URL,
        "referer": referer || `${BASE_URL}/`,
        "user-agent": UA,
        "deviceType": "pc",
        "version": "1.0",
        "time": _apiTime()
      }
    }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf8") }));
    });
    req.on("timeout", () => req.destroy(new Error("请求超时")));
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function _apiPost(endpoint, data = {}, referer = `${BASE_URL}/`) {
  const url = `${API_BASE}/${endpoint}`;
  const body = _encryptPayload(data, referer);
  let res;
  try {
    res = await _httpsPost(url, body, referer);
  } catch (e) {
    await _log("warn", "HTTPS 调用接口失败，回退 OmniBox.request", { endpoint, message: e.message });
    res = await OmniBox.request(url, {
      method: "POST",
      headers: {
        "accept": "application/json, text/plain, */*",
        "content-type": "application/octet-stream",
        "origin": BASE_URL,
        "referer": referer || `${BASE_URL}/`,
        "user-agent": UA,
        "deviceType": "pc",
        "version": "1.0",
        "time": _apiTime()
      },
      body,
      timeout: 20000
    });
    const raw = res && res.body ? res.body : res;
    res = { status: res?.statusCode || 200, body: Buffer.isBuffer(raw) ? raw.toString("utf8") : String(raw || "") };
  }

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`接口 HTTP ${res.status}: ${endpoint}`);
  }
  const json = _decryptResponse(res.body);
  if (!json || json.status !== "y") {
    throw new Error(json?.error || `接口返回异常: ${endpoint}`);
  }
  return json.data;
}

function _normalizePosition(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (POSITION_NAMES[raw]) return raw;
  if (LEGACY_POSITIONS[raw]) return LEGACY_POSITIONS[raw];
  const lowered = raw.toLowerCase();
  if (POSITION_NAMES[lowered]) return lowered;
  return Object.entries(POSITION_NAMES).find(([, name]) => name === raw)?.[0] || "";
}

function _absUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `${BASE_URL}${value}`;
  return `${BASE_URL}/${value}`;
}

function _movieDetailUrl(item) {
  const id = String(item?.id || item?.movie_id || "").trim();
  const slug = String(item?.seo_slug || item?.slug || "").trim();
  return slug ? `${BASE_URL}/movie/${id}/${slug}` : `${BASE_URL}/movie/detail/${id}`;
}

function _mapVod(item, typeId = "") {
  const id = String(item?.id || item?.movie_id || "").trim();
  const name = String(item?.name || item?.movie_name || "").trim();
  if (!id || !name) return null;
  const position = _normalizePosition(item.position || typeId);
  const pic = _absUrl(item.img_y_source || item.img_x_source || item.img_y || item.img_x || "");
  const remarks = [
    item.area,
    item.language,
    item.release_at,
    item.child_title || item.category || POSITION_NAMES[position]
  ].filter(Boolean).join(" | ");
  return {
    vod_id: id,
    vod_name: name,
    vod_pic: pic,
    vod_url: _absUrl(item.canonical_path) || _movieDetailUrl(item),
    type_id: position,
    type_name: POSITION_NAMES[position] || item.child_title || item.category || "",
    vod_remarks: remarks
  };
}

function _dedupVodList(list) {
  const seen = new Set();
  return (Array.isArray(list) ? list : []).filter((it) => {
    if (!it || !it.vod_id || seen.has(it.vod_id)) return false;
    seen.add(it.vod_id);
    return true;
  });
}

async function _fetchMovieList(payload, referer) {
  const data = await _apiPost("movie/search", payload, referer);
  const rows = Array.isArray(data?.data) ? data.data : [];
  return {
    list: _dedupVodList(rows.map((row) => _mapVod(row, payload.position))),
    total: Number(data?.total) || rows.length,
    page: Number(data?.current_page) || Number(payload.page) || 1,
    pagecount: Number(data?.last_page) || 0
  };
}

function _pickEpisodeName(item, index = 0) {
  return String(item?.name || item?.title || `第${index + 1}集`).trim() || `第${index + 1}集`;
}

function _encodePlayId(meta) {
  return JSON.stringify({
    movie_id: meta.movie_id || "",
    link_id: meta.link_id || "",
    line_id: meta.line_id || "",
    line_name: meta.line_name || "",
    episode_name: meta.episode_name || "",
    page: meta.page || ""
  });
}

function _normalizeLegacyLinks(links) {
  return (Array.isArray(links) ? links : []).map((item) => {
    const url = item?.m3u8_url || item?.preview_m3u8_url || "";
    if (!url) return null;
    return { name: item.name || item.id || "线路", url: _absUrl(url), lineId: item.id || "" };
  }).filter(Boolean);
}

function _normalizePlayback(playback) {
  if (!playback || playback.version !== 2) return [];
  const rows = Array.isArray(playback.video_lines) ? playback.video_lines : [];
  return rows.map((line) => {
    const media = line?.h264 || line?.hevc;
    const path = media?.url || playback.play_url;
    if (!path) return null;
    return {
      lineId: String(line.line || ""),
      name: String(line.name || line.line || "线路"),
      url: _absUrl(path)
    };
  }).filter((it) => it && it.url);
}

function _buildDirectResult(urls, referer) {
  const mapped = urls.map((it) => ({ name: it.name, url: it.url }));
  const headers = {
    "User-Agent": UA,
    "Referer": referer || `${BASE_URL}/`,
    "Origin": BASE_URL
  };
  return {
    parse: 0,
    url: mapped.length === 1 ? mapped[0].url : undefined,
    urls: mapped,
    header: headers,
    headers
  };
}

function _buildFallback(pageUrl, name = "FKTV 接口未返回可播地址") {
  const headers = {
    "User-Agent": UA,
    "Referer": pageUrl,
    "Origin": BASE_URL
  };
  return {
    parse: 1,
    url: pageUrl,
    urls: [{ name, url: pageUrl }],
    header: headers,
    headers
  };
}

async function home() {
  const payload = { page: 1, page_size: PAGE_SIZE, is_hot: "y", order: "new" };
  let result;
  try {
    result = await _fetchMovieList(payload, `${BASE_URL}/`);
  } catch (e) {
    await _log("warn", "home 热门列表失败，回退最新列表", { message: e.message });
    result = await _fetchMovieList({ page: 1, page_size: PAGE_SIZE }, `${BASE_URL}/`);
  }
  await _log("info", "home 解析结果", { count: result.list.length, first: result.list[0] || null });
  return { class: CATEGORIES, list: result.list.slice(0, 24) };
}

async function category(params) {
  const page = params.page ? Number(params.page) : 1;
  const pageSize = params.page_size ? Number(params.page_size) : PAGE_SIZE;
  const position = _normalizePosition(params.type_id || params.cat_id || params.typeId || params.type || params.categoryId);
  const payload = { page, page_size: pageSize };
  if (position) payload.position = position;

  await _log("info", "category 入参", { params, payload });
  const result = await _fetchMovieList(payload, `${BASE_URL}/channel/${position || "movie"}`);
  await _log("info", "category 解析结果", { count: result.list.length, first: result.list[0] || null });
  return { ..._normalizePagination(result.page, pageSize, result.total, result.pagecount), list: result.list };
}

async function detail(params) {
  const id = String(params.videoId || params.vod_id || params.id || "").trim();
  await _log("info", "detail 入参", params);
  if (!id) return { list: [] };

  const movieId = (id.match(/([0-9a-f]{16})/i) || [])[1] || id;
  const pageUrl = id.startsWith("http") ? id : _movieDetailUrl({ id: movieId, seo_slug: "" });
  const data = await _apiPost("movie/detail", { id: movieId, link_id: "", is_simple: "y" }, pageUrl);
  const links = Array.isArray(data.links) ? data.links : [];
  const fallbackLink = data.link_id || links.find((it) => it.is_selected === "y")?.id || links[0]?.id || "";
  const episodes = (links.length ? links : (fallbackLink ? [{ id: fallbackLink, name: "正片" }] : [])).map((item, index) => ({
    name: _pickEpisodeName(item, index),
    playId: _encodePlayId({
      movie_id: data.id || movieId,
      link_id: item.id || fallbackLink,
      line_id: "",
      line_name: "",
      episode_name: _pickEpisodeName(item, index),
      page: _movieDetailUrl(data)
    })
  }));

  const playSources = episodes.length ? [{ name: "默认线路", episodes }] : [];
  const remarks = [
    data.area,
    data.language,
    data.release_at,
    data.child_title || data.category,
    data.play_error_type && data.play_error_type !== "none" ? data.play_error : ""
  ].filter(Boolean).join(" | ");
  const vod = {
    vod_id: data.id || movieId,
    vod_name: data.name || movieId,
    vod_pic: _absUrl(data.img_y_source || data.img_x_source || data.img_y || data.img_x || ""),
    vod_url: _movieDetailUrl(data),
    vod_content: data.description || "",
    vod_actor: data.actor || "",
    vod_director: data.director || "",
    vod_area: data.area || "",
    vod_year: data.release_at || "",
    vod_remarks: remarks,
    vod_play_from: "FKTV",
    vod_play_url: episodes.map((it) => `${it.name}$${it.playId}`).join("#"),
    vod_play_sources: playSources
  };

  await _log("info", "detail 解析结果", {
    id: vod.vod_id,
    name: vod.vod_name,
    episodeCount: episodes.length,
    playErrorType: data.play_error_type,
    playbackV2: !!data.playback_v2
  });
  return { list: [vod] };
}

async function _requestPlayDetail(meta) {
  const movieId = String(meta.movie_id || "").trim();
  const linkId = String(meta.link_id || "").trim();
  const pageUrl = meta.page || _movieDetailUrl({ id: movieId });
  const payload = { id: movieId, link_id: linkId, is_simple: "y" };
  const data = await _apiPost("movie/detail", payload, pageUrl);
  const selectedLink = linkId
    || data.link_id
    || (Array.isArray(data.links) && (data.links.find((it) => it.is_selected === "y")?.id || data.links[0]?.id))
    || "";
  let urls = _normalizePlayback(data.playback_v2);
  if (meta.line_id) {
    const picked = urls.filter((it) => it.lineId === meta.line_id);
    if (picked.length) urls = picked;
  }
  if (!urls.length) urls = _normalizeLegacyLinks(data.play_links);
  return { data, urls, pageUrl, selectedLink };
}

async function play(params) {
  try {
    await _log("info", "play 入参", params);
    const raw = String(params.playId || params.play_id || params.url || "").trim();
    if (!raw) throw new Error("播放标识为空");

    if (/\.(m3u8|mp4|flv)(\?|$)/i.test(raw)) {
      return _buildDirectResult([{ name: "直链播放", url: raw }], BASE_URL);
    }

    let meta = _safeJsonParse(raw, null);
    if (!meta && /^[0-9a-f]{32}$/i.test(raw)) meta = { movie_id: "", link_id: raw, page: "" };
    if (!meta?.movie_id && !meta?.link_id && /^https?:\/\//i.test(raw)) {
      const fallback = _buildFallback(raw);
      await _log("warn", "play 仅收到页面地址，回退嗅探页", fallback);
      return fallback;
    }
    if (meta.movie_id && !meta.page) meta.page = _movieDetailUrl({ id: meta.movie_id });
    await _log("info", "play 解析后的 playId", meta);

    const result = await _requestPlayDetail(meta);
    await _log("info", "play 接口结果", {
      movieId: meta.movie_id,
      requestedLinkId: meta.link_id,
      selectedLink: result.selectedLink,
      playErrorType: result.data.play_error_type,
      urls: result.urls
    });

    if (result.urls.length) return _buildDirectResult(result.urls, result.pageUrl);

    if (["need_vip", "captcha"].includes(result.data.play_error_type)) {
      const fallback = _buildFallback(result.pageUrl, result.data.play_error || "站点播放受限");
      await _log("warn", "play 官方接口受限，回退页面", { playErrorType: result.data.play_error_type, fallback });
      return fallback;
    }

    try {
      const sniff = await OmniBox.sniffVideo(result.pageUrl, { "User-Agent": UA, "Referer": result.pageUrl });
      if (sniff?.url) {
        const direct = _buildDirectResult([{ name: "嗅探播放", url: sniff.url }], result.pageUrl);
        direct.header = sniff.header || direct.header;
        direct.headers = sniff.header || direct.headers;
        await _log("info", "play 使用 sniff 结果返回", direct);
        return direct;
      }
    } catch (e) {
      await _log("warn", "play sniffVideo 失败", { message: e.message, sniffUrl: result.pageUrl });
    }

    return _buildFallback(result.pageUrl, "FKTV 接口未返回当前剧集可播地址");
  } catch (e) {
    await _log("error", "play 异常", { message: e.message, stack: e.stack });
    return { parse: 0, urls: [], url: "", header: {}, headers: {} };
  }
}

async function search(params) {
  const keyword = String(params.keyword || params.key || params.wd || "").trim();
  const page = params.page ? Number(params.page) : 1;
  const pageSize = params.page_size ? Number(params.page_size) : 20;
  await _log("info", "search 入参", params);
  if (!keyword) return { ..._normalizePagination(page, pageSize, 0), list: [] };

  const payload = { keywords: keyword, page, page_size: pageSize, is_search: "y" };
  const result = await _fetchMovieList(payload, `${BASE_URL}/movie/search`);
  await _log("info", "search 解析结果", { keyword, count: result.list.length, first: result.list[0] || null });
  return { ..._normalizePagination(result.page, pageSize, result.total, result.pagecount), list: result.list };
}

runner.run({ home, category, detail, search, play });

});

_load(8, "影猫仓库", function (module, exports, require) {
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

_load(9, "柯南影视", function (module, exports, require) {
// @name 柯南影视
// @description 接口解析：https://www.knvod.com，支持首页、分类、搜索、详情与播放解析
// @version 1.0.2
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/柯南影视.js
// @dependencies crypto-js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const CryptoJS = require("crypto-js");

const HOST = "https://www.knvod.com";
const PARSER_HOST = "https://xn--ewr.211997.xyz";
const BFQ_HOST = "https://bfq.txnp.cn";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const HEADERS = {
  "User-Agent": UA,
  Referer: `${HOST}/`,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "same-origin",
  "Upgrade-Insecure-Requests": "1",
};

const siteCookies = new Map();

const CLASS_LIST = [
  { type_id: "1", type_name: "电影" },
  { type_id: "2", type_name: "电视剧" },
  { type_id: "3", type_name: "动漫" },
  { type_id: "4", type_name: "综艺" },
];

const UNSTABLE_LINES = new Set(["推荐", "推荐2", "超快③", "超快l", "超快I", "超快Ⅰ"]);

module.exports = { home, category, search, detail, play };
runner.run(module.exports);

function getBodyText(response) {
  const body = response && typeof response === "object"
    ? ("body" in response ? response.body : ("data" in response ? response.data : response))
    : response;
  if (Buffer.isBuffer(body) || body instanceof Uint8Array) return body.toString();
  return String(body || "");
}

function getHeader(headers, name) {
  if (!headers) return undefined;
  if (typeof headers.get === "function") return headers.get(name) || headers.get(name.toLowerCase());
  const wanted = String(name).toLowerCase();
  const key = Object.keys(headers).find((item) => item.toLowerCase() === wanted);
  return key ? headers[key] : undefined;
}

function mergeCookies(setCookie) {
  const items = Array.isArray(setCookie) ? setCookie : (setCookie ? [setCookie] : []);
  for (const item of items) {
    const pair = String(item || "").split(";", 1)[0].trim();
    const index = pair.indexOf("=");
    if (index <= 0) continue;
    siteCookies.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
  }
}

function currentCookie() {
  return [...siteCookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url, options = {}) {
  const headers = {
    ...HEADERS,
    ...(options.headers || {}),
    Referer: options.referer || options.headers?.Referer || `${HOST}/`,
  };
  const attempts = Math.max(2, Number(options.retries === undefined ? 3 : Number(options.retries)) + 1);
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const cookie = currentCookie();
    const requestHeaders = cookie ? { ...headers, Cookie: cookie } : headers;
    try {
      const response = await OmniBox.request(url, {
        method: options.method || "GET",
        headers: requestHeaders,
        timeout: options.timeout || 30000,
        body: options.body,
      });
      mergeCookies(getHeader(response?.headers, "set-cookie"));
      const statusCode = Number(response?.statusCode || 200);
      if ((statusCode === 403 || statusCode === 429 || statusCode === 520) && attempt + 1 < attempts) {
        await delay(1100);
        continue;
      }
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

function md5(text) {
  return CryptoJS.MD5(String(text || "")).toString();
}

async function apiVodList(body = {}, options = {}) {
  const time = Math.ceil(Date.now() / 1000);
  const payload = {
    type: "",
    class: "",
    area: "",
    lang: "",
    version: "",
    state: "",
    letter: "",
    ...body,
    page: Math.max(1, Number(body.page || options.page || 1) || 1),
    time,
    key: md5(`DS${time}DCC147D11943AF75`),
  };
  const encoded = Object.entries(payload)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value ?? ""))}`)
    .join("&");
  const text = await fetchText(`${HOST}/index.php/api/vod`, {
    ...options,
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      ...(options.headers || {}),
    },
    body: encoded,
  });
  let data;
  try {
    data = JSON.parse(text);
  } catch (_) {
    throw new Error(`API响应解析失败 @ ${HOST}/index.php/api/vod`);
  }
  if (Number(data.code) !== 1) throw new Error(`API错误 ${data.msg || data.code || "unknown"}`);
  const list = Array.isArray(data.list) ? data.list.map((item) => ({
    vod_id: String(item.vod_id || ""),
    vod_name: String(item.vod_name || "").trim(),
    vod_pic: fixPicUrl(item.vod_pic || item.vod_pic_thumb || ""),
    vod_remarks: String(item.vod_remarks || item.vod_serial || "").trim(),
  })).filter((item) => item.vod_id && item.vod_name) : [];
  return {
    list,
    page: Math.max(1, Number(data.page) || 1),
    pagecount: Math.max(0, Number(data.pagecount) || 0),
    total: Math.max(0, Number(data.total) || list.length),
  };
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
  return decodeHtml(String(text || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
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

function fixPicUrl(url) {
  let value = absUrl(url);
  const proxy = "https://xn--wcsw84d.921080.xyz/?url=";
  if (/^http:\/\//i.test(value)) value = value.replace(/^http:\/\//i, "https://");
  if (/\.(?:jpg|jpeg|png|webp|gif)(?:$|[?#])/i.test(value) && /(?:doubanio\.com|douban\.com)/i.test(value)) {
    return `${proxy}${encodeURIComponent(value)}`;
  }
  return value;
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
  while ((match = regex.exec(text)) !== null) {
    value = match[1] || "";
    if (match[0] === "") regex.lastIndex += 1;
  }
  return value;
}

function extractVideos(html) {
  const text = String(html || "");
  const videos = [];
  const seen = new Set();
  const anchorRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorRegex.exec(text)) !== null) {
    const attrs = match[1] || "";
    if (!/\bpublic-list-exp\b/i.test(getAttribute(attrs, "class"))) continue;

    const href = getAttribute(attrs, "href");
    const idMatch = href.match(/\/vdetail\/(\d+)\.html/i);
    const vodId = idMatch ? idMatch[1] : "";
    if (!vodId || seen.has(vodId)) continue;

    const inner = match[2] || "";
    const before = text.slice(Math.max(0, match.index - 800), match.index);
    const after = text.slice(match.index + match[0].length, match.index + match[0].length + 600);
    const context = `${before}${match[0]}${after}`;

    const stylePicPattern = /\bstyle\s*=\s*["'][^"']*url\(\s*["']?([^)'"\s]+)["']?\s*\)[^"']*["']/i;
    let vodPic = lastCaptured(inner, /\bdata-src\s*=\s*["']([^"']+)["']/i);
    if (!vodPic) vodPic = lastCaptured(inner, stylePicPattern);
    if (!vodPic) vodPic = lastCaptured(before, stylePicPattern);
    if (!vodPic) vodPic = lastCaptured(before, /\bdata-src\s*=\s*["']([^"']+)["']/i);
    if (!vodPic) vodPic = lastCaptured(context, /\bsrc\s*=\s*["']([^"']+)["']/i);

    let vodName = cleanText(getAttribute(attrs, "title"));
    if (!vodName) {
      const alt = lastCaptured(inner, /\balt\s*=\s*["']([^"']+)["']/i);
      vodName = cleanText(alt).replace(/封面图$/u, "").trim();
    }
    if (!vodName) continue;

    let vodRemarks = "";
    const remarkMatch = inner.match(/public-list-prb[^>]*>([\s\S]*?)<\/span>/i)
      || after.match(/public-list-prb[^>]*>([\s\S]*?)<\/span>/i);
    if (remarkMatch) vodRemarks = cleanText(remarkMatch[1]);

    seen.add(vodId);
    videos.push({
      vod_id: vodId,
      vod_name: vodName,
      vod_pic: fixPicUrl(vodPic),
      vod_remarks: vodRemarks,
    });
  }

  if (videos.length) return videos;

  const looseRegex = /href=["']\/vdetail\/(\d+)\.html["']/gi;
  while ((match = looseRegex.exec(text)) !== null) {
    const vodId = match[1];
    if (seen.has(vodId)) continue;
    const context = text.slice(Math.max(0, match.index - 500), match.index + 500);
    const title = lastCaptured(context, /\btitle\s*=\s*["']([^"']+)["']/i);
    const alt = lastCaptured(context, /\balt\s*=\s*["']([^"']+)["']/i);
    const pic = lastCaptured(context, /\bdata-src\s*=\s*["']([^"']+)["']/i)
      || lastCaptured(context, /url\(\s*["']?([^)'"\s]+)["']?\s*\)/i);
    const vodName = cleanText(title || alt).replace(/封面图$/u, "").trim();
    if (!vodName) continue;
    seen.add(vodId);
    videos.push({ vod_id: vodId, vod_name: vodName, vod_pic: fixPicUrl(pic), vod_remarks: "" });
  }

  return videos;
}

function parsePageCount(html, currentPage, listLength) {
  const match = String(html || "").match(/\d+\s*(?:&nbsp;|\s)*\/\s*(?:&nbsp;|\s)*(\d+)\s*页/i);
  if (match) return Math.max(1, Number(match[1]) || 1);
  return listLength > 0 ? currentPage + 1 : currentPage;
}

function extractLabeledBlock(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(html || "").match(
    new RegExp(`<(?:em|strong)[^>]*>\\s*${escaped}\\s*[：:]?\\s*<\\/(?:em|strong)>([\\s\\S]*?)(?:<\\/li>|<\\/div>)`, "i"),
  );
  return match ? match[1] : "";
}

function extractPeople(html, label) {
  const block = extractLabeledBlock(html, label);
  if (!block) return "";
  const people = [];
  const linkRegex = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkRegex.exec(block)) !== null) {
    const name = cleanText(match[1]);
    if (name) people.push(name);
  }
  return people.length ? people.join(" ") : cleanText(block);
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
    const name = cleanText(withoutBadge).replace(/\d+\s*集?$/u, "").trim();
    if (name) sourceNames.push(name);
  }

  const playSources = [];
  const nameCounts = new Map();
  const listRegex = /<ul\b[^>]*class=["'][^"']*anthology-list-play[^"']*["'][^>]*>([\s\S]*?)<\/ul>/gi;
  let index = 0;

  while ((match = listRegex.exec(text)) !== null) {
    const originalName = sourceNames[index] || `线路${index + 1}`;
    index += 1;
    if (UNSTABLE_LINES.has(originalName)) continue;

    const episodes = [];
    const episodeRegex = /<a\b[^>]*href=["'](\/vplay\/\d+-\d+-\d+\.html)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let episodeMatch;
    while ((episodeMatch = episodeRegex.exec(match[1])) !== null) {
      const name = cleanText(episodeMatch[2]);
      if (name) episodes.push({ name, playId: absUrl(episodeMatch[1]) });
    }
    if (!episodes.length) continue;
    episodes.reverse();

    const count = (nameCounts.get(originalName) || 0) + 1;
    nameCounts.set(originalName, count);
    const sourceName = count > 1 ? `${originalName}${count}` : originalName;
    playSources.push({ name: sourceName, episodes });
  }

  const rank = (name) => {
    if (name.startsWith("超稳")) return 0;
    if (name.startsWith("蓝光") || name.startsWith("移动")) return 1;
    return 2;
  };
  playSources.sort((a, b) => rank(a.name) - rank(b.name));
  return playSources;
}

function isDirectMedia(url) {
  return /\.(?:m3u8|mp4|flv|mkv)(?:$|[?#])/i.test(String(url || ""));
}

function isOfficialSource(url) {
  const value = String(url || "").toLowerCase();
  if (isDirectMedia(value)) return false;
  return [
    "mgtv.com", "youku.com", "iqiyi.com", "qiyi.com", "v.qq.com", "qq.com",
    "bilibili.com", "le.com", "sohu.com", "pptv.com", "1905.com",
  ].some((host) => value.includes(host));
}

function decodePlayerUrl(value, encrypt) {
  let url = String(value || "").replace(/\\\//g, "/");
  try {
    if (String(encrypt) === "1") return decodeURIComponent(url);
    if (String(encrypt) === "2") {
      url = Buffer.from(url, "base64").toString("utf8");
      return decodeURIComponent(url);
    }
  } catch (_) {}
  return url;
}

function decryptBfqResult(cipherText) {
  const value = String(cipherText || "");
  if (value.length <= 32) return null;
  try {
    const key = CryptoJS.enc.Utf8.parse(value.slice(-32, -16));
    const iv = CryptoJS.enc.Utf8.parse(value.slice(-16));
    const ciphertext = CryptoJS.enc.Base64.parse(value.slice(0, -32));
    const decrypted = CryptoJS.AES.decrypt({ ciphertext }, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }).toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
  } catch (_) {
    return null;
  }
}

async function resolveM3u8Child(url, referer) {
  try {
    const text = await fetchText(url, { referer: referer || `${HOST}/`, timeout: 20000, retries: 0 });
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

async function resolveOfficialSource(sourceUrl) {
  if (!isOfficialSource(sourceUrl)) return "";
  const encoded = encodeURIComponent(sourceUrl);
  const pageUrl = `${BFQ_HOST}/player?url=${encoded}`;
  const referer = `${BFQ_HOST}/excessive?url=${encoded}`;
  const html = await fetchText(pageUrl, { referer, timeout: 20000, retries: 0 });
  const match = html.match(/let\s+result\s*=\s*["']([^"']+)["']/i);
  const data = decryptBfqResult(match ? match[1] : "");
  let mediaUrl = String(data?.video_info?.video?.url || "").replace(/\\\//g, "/");
  if (mediaUrl && isDirectMedia(mediaUrl) && /\.m3u8(?:$|[?#])/i.test(mediaUrl)) {
    mediaUrl = await resolveM3u8Child(mediaUrl, pageUrl);
  }
  return isDirectMedia(mediaUrl) ? mediaUrl : "";
}

function buildParserUrl(playUrl, nextLink, title) {
  if (!playUrl) return "";
  let url = `${PARSER_HOST}/ppy.php?url=${playUrl}`;
  if (nextLink) {
    const next = String(nextLink);
    if (next.startsWith("//")) url += `&next=${next}`;
    else if (/^https?:\/\//i.test(next)) url += `&next=//${next.replace(/^https?:\/\//i, "")}`;
    else url += `&next=//www.knvod.com/${next.replace(/^\/+/, "")}`;
  }
  if (title) url += `&title=${encodeURIComponent(title)}`;
  return url;
}

function directPlayResult(url, referer) {
  const header = { "User-Agent": UA, Referer: referer || `${HOST}/` };
  return {
    parse: 0,
    jx: 0,
    url,
    urls: [{ name: "播放", url }],
    header,
    headers: header,
  };
}

function sniffPlayResult(url, referer, name = "播放页") {
  const header = { "User-Agent": UA, Referer: referer || `${HOST}/` };
  return {
    parse: 1,
    jx: 1,
    url,
    urls: [{ name, url }],
    header,
    headers: header,
  };
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

async function serverSniffOrBrowserFallback(targetUrl, referer, name = "播放") {
  const fallbackHeader = { "User-Agent": UA, Referer: referer || `${HOST}/` };
  if (typeof OmniBox.sniffVideo === "function") {
    try {
      const sniffed = await OmniBox.sniffVideo(targetUrl, fallbackHeader);
      const urls = normalizeSniffUrls(sniffed, name);
      if (urls.length) {
        const header = sniffed?.header || sniffed?.headers || fallbackHeader;
        await OmniBox.log("info", `[柯南影视][play] 服务端嗅探成功 sniffed=${JSON.stringify(sniffed)}`);
        return {
          parse: 0,
          jx: 0,
          url: urls[0].url,
          urls,
          header,
          headers: header,
          danmaku: sniffed?.danmaku || [],
        };
      }
      await OmniBox.log("warn", "[柯南影视][play] 服务端嗅探无结果，转浏览器嗅探");
    } catch (error) {
      await OmniBox.log("warn", `[柯南影视][play] 服务端嗅探失败，转浏览器嗅探: ${error.message}`);
    }
  }
  return sniffPlayResult(targetUrl, referer, name);
}

async function home() {
  const list = [];
  const seen = new Set();

  try {
    const pages = await Promise.allSettled([
      apiVodList({ page: 1 }),
      apiVodList({ page: 2 }),
      apiVodList({ page: 3 }),
    ]);
    for (const result of pages) {
      if (result.status === "fulfilled") list.push(...result.value.list);
    }
    if (!list.length && pages[0].status === "rejected") {
      await OmniBox.log("warn", `[柯南影视][home] api ${pages[0].reason.message}`);
    }
  } catch (error) {
    await OmniBox.log("warn", `[柯南影视][home] api ${error.message}`);
  }

  if (!list.length) {
    for (const item of CLASS_LIST) {
      try {
        const html = await fetchText(`${HOST}/vshow/${item.type_id}-----------.html`);
        for (const video of extractVideos(html)) {
          if (seen.has(video.vod_id)) continue;
          seen.add(video.vod_id);
          list.push(video);
        }
        if (list.length >= 72) break;
      } catch (error) {
        await OmniBox.log("warn", `[柯南影视][home] tid=${item.type_id} ${error.message}`);
      }
    }
  }

  if (!list.length) {
    try {
      const html = await fetchText(`${HOST}/`);
      for (const video of extractVideos(html)) {
        if (seen.has(video.vod_id)) continue;
        seen.add(video.vod_id);
        list.push(video);
      }
    } catch (error) {
      await OmniBox.log("warn", `[柯南影视][home] ${error.message}`);
    }
  }

  return { class: CLASS_LIST, filters: {}, list: list.slice(0, 72) };
}

async function category(params) {
  const page = Math.max(1, parseInt(params.page || 1, 10));
  try {
    const tid = String(params.categoryId || params.type_id || "1").trim();
    try {
      return await apiVodList({ type: tid, page });
    } catch (error) {
      await OmniBox.log("warn", `[柯南影视][category] api ${error.message}`);
    }
    const url = `${HOST}/vshow/${tid}--------${page}---.html`;
    const html = await fetchText(url);
    const list = extractVideos(html);
    return {
      page,
      pagecount: parsePageCount(html, page, list.length),
      total: list.length,
      list,
    };
  } catch (error) {
    await OmniBox.log("error", `[柯南影视][category] ${error.message}`);
    return { page, pagecount: 0, total: 0, list: [] };
  }
}

async function search(params) {
  const page = Math.max(1, parseInt(params.page || 1, 10));
  try {
    const keyword = String(params.keyword || params.wd || params.key || "").trim();
    if (!keyword) return { page, pagecount: 0, total: 0, list: [] };
    const url = `${HOST}/search/${encodeURIComponent(keyword)}-------------.html`;
    try {
      const html = await fetchText(url);
      const list = extractVideos(html);
      if (list.length) return { page, pagecount: 1, total: list.length, list };
    } catch (error) {
      await OmniBox.log("warn", `[柯南影视][search] page ${error.message}`);
    }
    try {
      return await apiVodList({ wd: keyword, tag: "", page });
    } catch (error) {
      await OmniBox.log("warn", `[柯南影视][search] api ${error.message}`);
    }
    const html = await fetchText(url);
    const list = extractVideos(html);
    return { page, pagecount: list.length ? 1 : 0, total: list.length, list };
  } catch (error) {
    await OmniBox.log("error", `[柯南影视][search] ${error.message}`);
    return { page, pagecount: 0, total: 0, list: [] };
  }
}

async function detail(params) {
  try {
    const input = String(params.videoId || params.id || params.categoryId || "").trim();
    const idMatch = input.match(/\/vdetail\/(\d+)\.html/i) || input.match(/^(\d+)$/);
    const vodId = idMatch ? idMatch[1] : "";
    if (!vodId) return { list: [] };

    const html = await fetchText(`${HOST}/vdetail/${vodId}.html`);
    const titleMatch = html.match(/<h3\b[^>]*class=["'][^"']*slide-info-title[^"']*["'][^>]*>([\s\S]*?)<\/h3>/i)
      || html.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i);
    const picMatch = html.match(/detail-pic[\s\S]*?<img\b[^>]*(?:data-src|src)=["']([^"']+)["']/i)
      || html.match(/slide-time-img2[\s\S]*?<img\b[^>]*(?:data-src|src)=["']([^"']+)["']/i);
    const contentMatch = html.match(/id=["']height_limit["'][^>]*>([\s\S]*?)<\/div>/i);
    const typeBlock = extractLabeledBlock(html, "类型");
    const areaBlock = extractLabeledBlock(html, "地区");
    const yearBlock = extractLabeledBlock(html, "年份");
    const playSources = parsePlaySources(html);

    return {
      list: [{
        vod_id: vodId,
        vod_name: cleanText(titleMatch ? titleMatch[1] : ""),
        vod_pic: fixPicUrl(picMatch ? picMatch[1] : ""),
        type_name: cleanText(typeBlock),
        vod_year: cleanText(yearBlock),
        vod_area: cleanText(areaBlock),
        vod_remarks: "",
        vod_actor: extractPeople(html, "主演"),
        vod_director: extractPeople(html, "导演"),
        vod_content: cleanText(contentMatch ? contentMatch[1] : ""),
        vod_play_sources: playSources,
      }],
    };
  } catch (error) {
    await OmniBox.log("error", `[柯南影视][detail] ${error.message}`);
    return { list: [] };
  }
}

async function play(params) {
  try {
    const input = String(params.playId || params.id || params.url || params.input || "").trim();
    if (!input) return { parse: 0, jx: 0, url: "", urls: [], header: {} };

    const playUrl = absUrl(input);
    if (isOfficialSource(playUrl)) {
      const officialUrl = await resolveOfficialSource(playUrl);
      if (officialUrl) return directPlayResult(officialUrl, `${BFQ_HOST}/`);
    }
    if (isDirectMedia(playUrl)) return directPlayResult(playUrl, `${HOST}/`);

    const html = await fetchText(playUrl, { referer: `${HOST}/`, timeout: 20000, retries: 0 });
    const iframeRegex = /<iframe\b[^>]*src=["']([^"']+)["']/gi;
    let iframeMatch;
    while ((iframeMatch = iframeRegex.exec(html)) !== null) {
      const iframeUrl = absUrl(iframeMatch[1], playUrl);
      if (isDirectMedia(iframeUrl)) return directPlayResult(iframeUrl, playUrl);
    }

    const playerMatch = html.match(/var\s+player_[a-zA-Z0-9_$]+\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/i)
      || html.match(/var\s+player_[a-zA-Z0-9_$]+\s*=\s*(\{[\s\S]*?\})\s*;/i);
    if (playerMatch) {
      let playerData;
      try {
        playerData = JSON.parse(playerMatch[1]);
      } catch (_) {
        playerData = null;
      }

      if (playerData) {
        let mediaUrl = decodePlayerUrl(playerData.url, playerData.encrypt);
        if (isDirectMedia(mediaUrl)) {
          if (/\.m3u8(?:$|[?#])/i.test(mediaUrl)) mediaUrl = await resolveM3u8Child(mediaUrl, playUrl);
          return directPlayResult(mediaUrl, `${HOST}/`);
        }
        if (isOfficialSource(mediaUrl)) {
          const officialUrl = await resolveOfficialSource(mediaUrl);
          if (officialUrl) return directPlayResult(officialUrl, `${BFQ_HOST}/`);
        }
        if (mediaUrl) {
          const parserUrl = buildParserUrl(mediaUrl, playerData.link_next, playerData.vod_data?.vod_name);
          return await serverSniffOrBrowserFallback(parserUrl, `${PARSER_HOST}/`, playerData.vod_data?.vod_name || "播放");
        }
      }
    }

    const directMatch = html.match(/["'](https?:\/\/[^"']+\.(?:m3u8|mp4|flv|mkv)(?:\?[^"']*)?)["']/i);
    if (directMatch) return directPlayResult(decodeHtml(directMatch[1]).replace(/\\\//g, "/"), `${HOST}/`);
    return await serverSniffOrBrowserFallback(playUrl, `${HOST}/`, "播放");
  } catch (error) {
    await OmniBox.log("error", `[柯南影视][play] ${error.message}`);
    return { parse: 0, jx: 0, url: "", urls: [], header: {} };
  }
}

});

_load(10, "独播库", function (module, exports, require) {
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

_load(11, "莫小影", function (module, exports, require) {
// @name 莫小影
// @description 莫小影（现千千影视）页面解析，支持首页、分类、搜索、详情、多线路播放与嗅探兜底
// @version 1.0.1
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/莫小影.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");

const HOST = String(process.env.QQYS_HOST || process.env.MOXY_HOST || "https://www.qqys01.com").replace(/\/+$/, "");
const SITE_ORIGIN = new URL(HOST).origin;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const HEADERS = {
  "User-Agent": UA,
  Referer: `${HOST}/`,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9",
};
const CLASS_LIST = [
  { type_id: "1", type_name: "电影" },
  { type_id: "2", type_name: "连续剧" },
  { type_id: "3", type_name: "综艺" },
  { type_id: "4", type_name: "动漫" },
  { type_id: "5", type_name: "短剧" },
];
const CATEGORY_IDS = new Set(CLASS_LIST.map((item) => item.type_id));
const AREA_NAMES = new Set([
  "中国大陆", "大陆", "中国", "香港", "中国香港", "台湾", "中国台湾",
  "美国", "日本", "韩国", "英国", "法国", "德国", "泰国", "印度",
  "加拿大", "西班牙", "意大利", "澳大利亚", "俄罗斯", "其他",
]);

module.exports = { home, category, search, detail, play };
runner.run(module.exports);

function getBodyText(response) {
  const body = response && typeof response === "object"
    ? ("body" in response ? response.body : ("data" in response ? response.data : response))
    : response;
  if (Buffer.isBuffer(body) || body instanceof Uint8Array) return Buffer.from(body).toString("utf8");
  return String(body || "");
}

async function requestText(url, options = {}) {
  const response = await OmniBox.request(url, {
    method: options.method || "GET",
    headers: {
      ...HEADERS,
      ...(options.headers || {}),
      Referer: options.referer || options.headers?.Referer || `${HOST}/`,
    },
    timeout: options.timeout || 30000,
    body: options.body,
  });
  const statusCode = Number(response?.statusCode || 200);
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`HTTP ${statusCode || "unknown"} @ ${url}`);
  }
  return getBodyText(response);
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&#(\d+);/g, (entity, code) => {
      const number = Number(code);
      return Number.isInteger(number) && number >= 0 && number <= 0x10FFFF ? String.fromCodePoint(number) : entity;
    })
    .replace(/&#x([0-9a-f]+);/gi, (entity, code) => {
      const number = parseInt(code, 16);
      return Number.isInteger(number) && number >= 0 && number <= 0x10FFFF ? String.fromCodePoint(number) : entity;
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function cleanText(value) {
  return decodeHtml(
    String(value || "")
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?\s*>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ").trim();
}

function absUrl(value, base = HOST) {
  let url = decodeHtml(String(value || "").trim())
    .replace(/^['"]|['"]$/g, "")
    .replace(/\\\//g, "/");
  if (!url || /^data:/i.test(url)) return "";
  if (url.startsWith("//")) url = `https:${url}`;
  try {
    return new URL(url, base).toString();
  } catch (_) {
    return url;
  }
}

function getAttribute(attrs, name) {
  const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(attrs || "").match(new RegExp(`\\b${escaped}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i"));
  return match ? decodeHtml(match[2]).trim() : "";
}

function findAttribute(html, names) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = String(html || "").match(new RegExp(`\\b${escaped}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i"));
    if (match && match[2]) return decodeHtml(match[2]).trim();
  }
  return "";
}

function parseCards(html) {
  const text = String(html || "");
  const list = [];
  const seen = new Set();
  const anchorRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorRegex.exec(text)) !== null) {
    const attrs = match[1] || "";
    const inner = match[2] || "";
    const href = getAttribute(attrs, "href");
    const idMatch = href.match(/\/voddetail\/?(\d+)\.html/i);
    if (!idMatch || seen.has(idMatch[1])) continue;

    const className = getAttribute(attrs, "class");
    if (!/module-(?:poster-item|card-item-poster)/i.test(className) && !/<img\b/i.test(inner)) continue;

    let name = cleanText(getAttribute(attrs, "title"));
    if (!name) name = cleanText(findAttribute(inner, ["alt", "title"]));
    if (!name) {
      const titleMatch = inner.match(/<div[^>]*class=["'][^"']*module-(?:poster|card)-item-title[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
      name = cleanText(titleMatch ? titleMatch[1] : "");
    }
    if (!name) continue;

    const pic = findAttribute(inner, ["data-original", "data-src", "src"]);
    const remarkMatch = inner.match(/<div[^>]*class=["'][^"']*module-item-note[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

    seen.add(idMatch[1]);
    list.push({
      vod_id: idMatch[1],
      vod_name: name,
      vod_pic: absUrl(pic),
      vod_remarks: cleanText(remarkMatch ? remarkMatch[1] : ""),
    });
  }

  return list;
}

function parsePageCount(html, currentPage) {
  const pages = [Math.max(1, Number(currentPage) || 1)];
  const regex = /\/vod(?:show|search)\/[^"'?#]*?(\d+)---\.html/gi;
  let match;
  while ((match = regex.exec(String(html || ""))) !== null) {
    const page = Number(match[1]);
    if (Number.isFinite(page) && page > 0 && page <= 100000) pages.push(page);
  }
  return Math.max(...pages);
}

function getInfoTagValues(html) {
  const text = String(html || "");
  const start = text.search(/class=["'][^"']*module-info-tag[^"']*["']/i);
  if (start < 0) return [];
  const tail = text.slice(start, start + 5000);
  const end = tail.search(/class=["'][^"']*module-(?:mobile-play|info-content)[^"']*["']/i);
  const block = end > 0 ? tail.slice(0, end) : tail;
  const values = [];
  const seen = new Set();
  const anchorRegex = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRegex.exec(block)) !== null) {
    const value = cleanText(match[1]);
    if (value && !seen.has(value)) {
      seen.add(value);
      values.push(value);
    }
  }
  return values;
}

function extractInfoItem(html, label) {
  const escaped = String(label).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(html || "").match(new RegExp(
    `<span[^>]*class=["'][^"']*module-info-item-title[^"']*["'][^>]*>\\s*${escaped}\\s*[：:]?\\s*<\\/span>\\s*<div[^>]*class=["'][^"']*module-info-item-content[^"']*["'][^>]*>([\\s\\S]*?)<\\/div>`,
    "i",
  ));
  return cleanText(match ? match[1] : "");
}

function normalizePeople(value) {
  return String(value || "").replace(/(?:\s*\/\s*)+$/g, "").trim();
}

function extractDescription(html) {
  const match = String(html || "").match(
    /<div[^>]*class=["'][^"']*module-info-introduction-content[^"']*["'][^>]*>\s*(?:<p[^>]*>)?([\s\S]*?)(?:<\/p>)?\s*<\/div>/i,
  );
  return cleanText(match ? match[1] : "");
}

function extractPoster(html) {
  const text = String(html || "");
  const start = text.search(/class=["'][^"']*module-info-poster[^"']*["']/i);
  const block = start >= 0 ? text.slice(start, start + 2500) : text;
  return absUrl(findAttribute(block, ["data-original", "data-src", "src"]));
}

function parsePlaySources(html) {
  const text = String(html || "");
  const sourceNames = [];
  const sourceNameRegex = /data-dropdown-value\s*=\s*(["'])([\s\S]*?)\1/gi;
  let match;
  while ((match = sourceNameRegex.exec(text)) !== null) {
    const name = cleanText(match[2]);
    if (name && !sourceNames.includes(name)) sourceNames.push(name);
  }

  const sources = [];
  const listRegex = /<div\b[^>]*class=["'][^"']*module-play-list-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
  let sourceIndex = 0;
  while ((match = listRegex.exec(text)) !== null) {
    const episodes = [];
    const seen = new Set();
    const episodeRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
    let episodeMatch;
    while ((episodeMatch = episodeRegex.exec(match[1])) !== null) {
      const href = getAttribute(episodeMatch[1], "href");
      if (!/\/vodplay\//i.test(href)) continue;
      const playId = absUrl(href);
      if (!playId || seen.has(playId)) continue;
      const title = cleanText(episodeMatch[2]) || cleanText(getAttribute(episodeMatch[1], "title")) || "播放";
      seen.add(playId);
      episodes.push({ name: title, playId });
    }
    const sourceName = sourceNames[sourceIndex] || `线路${sourceIndex + 1}`;
    sourceIndex += 1;
    if (episodes.length) sources.push({ name: sourceName, episodes });
  }
  return sources;
}

function toLegacyPlayFields(sources) {
  const safeName = (value) => String(value || "").replace(/[$#]/g, " ").trim();
  return {
    vod_play_from: sources.map((source) => safeName(source.name)).join("$$$"),
    vod_play_url: sources
      .map((source) => source.episodes.map((episode) => `${safeName(episode.name)}$${episode.playId}`).join("#"))
      .join("$$$"),
  };
}

function extractPlayerData(html) {
  const match = String(html || "").match(
    /(?:(?:var|let|const)\s+)?player_[A-Za-z0-9_$]+\s*=\s*(\{[\s\S]*?\})\s*;?/i,
  );
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch (_) {
    return null;
  }
}

function safeDecodeURIComponent(value) {
  let result = String(value || "");
  for (let i = 0; i < 2; i += 1) {
    try {
      const decoded = decodeURIComponent(result);
      if (decoded === result) break;
      result = decoded;
    } catch (_) {
      break;
    }
  }
  return result;
}

function decodePlayerUrl(value, encrypt) {
  const raw = String(value || "").trim().replace(/\\\//g, "/");
  if (!raw) return "";
  try {
    if (String(encrypt) === "2") {
      const normalized = raw.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
      return safeDecodeURIComponent(Buffer.from(padded, "base64").toString("utf8"));
    }
    if (String(encrypt) === "1") return safeDecodeURIComponent(raw);
  } catch (_) {}
  return raw;
}

function isDirectMedia(url) {
  return /\.(?:m3u8|mp4|flv|m4s|mpd|mkv|avi)(?:$|[?#])/i.test(String(url || ""));
}

function directPlayResult(url, referer, name = "播放") {
  const header = { "User-Agent": UA, Referer: referer || `${HOST}/` };
  return { parse: 0, jx: 0, url, urls: [{ name, url }], header, headers: header };
}

function browserSniffResult(url, referer, name = "播放页") {
  const header = { "User-Agent": UA, Referer: referer || `${HOST}/` };
  return { parse: 1, jx: 1, url, urls: url ? [{ name, url }] : [], header, headers: header };
}

function emptyPlayResult() {
  return { parse: 0, jx: 0, url: "", urls: [], header: {}, headers: {} };
}

function isHttpUrl(url) {
  try {
    const protocol = new URL(String(url || "")).protocol;
    return protocol === "https:" || protocol === "http:";
  } catch (_) {
    return false;
  }
}

function isSitePlayPage(url) {
  try {
    const parsed = new URL(String(url || ""));
    return isHttpUrl(parsed.toString())
      && parsed.origin === SITE_ORIGIN
      && /\/vodplay\//i.test(parsed.pathname);
  } catch (_) {
    return false;
  }
}

function normalizeSniffUrls(result, defaultName) {
  const urls = [];
  const seen = new Set();
  const append = (item) => {
    const url = String(typeof item === "string" ? item : (item?.url || item?.playUrl || item?.src || "")).trim();
    if (!isHttpUrl(url) || seen.has(url)) return;
    seen.add(url);
    urls.push({ name: String(item?.name || defaultName || "嗅探线路"), url });
  };
  if (Array.isArray(result?.urls)) result.urls.forEach(append);
  if (!urls.length) append(result);
  return urls;
}

async function sniffOrBrowserFallback(targetUrl, referer, name) {
  if (!isHttpUrl(targetUrl)) return emptyPlayResult();
  const header = { "User-Agent": UA, Referer: referer || `${HOST}/` };
  if (typeof OmniBox.sniffVideo === "function") {
    try {
      const sniffed = await OmniBox.sniffVideo(targetUrl, header);
      const urls = normalizeSniffUrls(sniffed, name);
      if (urls.length) {
        const playHeader = sniffed?.header || sniffed?.headers || header;
        return { parse: 0, jx: 0, url: urls[0].url, urls, header: playHeader, headers: playHeader };
      }
    } catch (error) {
      await OmniBox.log("warn", `[莫小影][play] 服务端嗅探失败: ${error.message}`);
    }
  }
  return browserSniffResult(targetUrl, referer, name);
}

async function home() {
  try {
    const html = await requestText(`${HOST}/`);
    return { class: CLASS_LIST, filters: {}, list: parseCards(html).slice(0, 60) };
  } catch (error) {
    await OmniBox.log("error", `[莫小影][home] ${error.message}`);
    return { class: CLASS_LIST, filters: {}, list: [] };
  }
}

async function category(params = {}) {
  const page = Math.max(1, parseInt(params.page || 1, 10) || 1);
  try {
    const requestedId = String(params.categoryId || params.type_id || params.tid || "1").trim();
    const categoryId = CATEGORY_IDS.has(requestedId) ? requestedId : "1";
    const url = page === 1
      ? `${HOST}/vodshow/${categoryId}-----------.html`
      : `${HOST}/vodshow/${categoryId}--------${page}---.html`;
    const html = await requestText(url);
    const list = parseCards(html);
    const limit = list.length || 20;
    const pagecount = parsePageCount(html, page);
    return { page, pagecount, limit, total: pagecount * limit, list };
  } catch (error) {
    await OmniBox.log("error", `[莫小影][category] ${error.message}`);
    return { page, pagecount: page, limit: 0, total: 0, list: [] };
  }
}

async function search(params = {}) {
  const page = Math.max(1, parseInt(params.page || 1, 10) || 1);
  try {
    const keyword = String(params.keyword || params.wd || params.key || "").trim();
    if (!keyword) return { page, pagecount: 0, limit: 0, total: 0, list: [] };
    const encoded = encodeURIComponent(keyword);
    const url = page === 1
      ? `${HOST}/vodsearch/${encoded}-------------.html`
      : `${HOST}/vodsearch/${encoded}----------${page}---.html`;
    const html = await requestText(url, { timeout: 60000 });
    const list = parseCards(html);
    const limit = list.length || 20;
    const pagecount = parsePageCount(html, page);
    return { page, pagecount, limit, total: pagecount * limit, list };
  } catch (error) {
    await OmniBox.log("error", `[莫小影][search] ${error.message}`);
    return { page, pagecount: page, limit: 0, total: 0, list: [] };
  }
}

async function detail(params = {}) {
  try {
    const input = String(params.videoId || params.id || params.vod_id || params.categoryId || "").trim();
    const idMatch = input.match(/\/voddetail\/?(\d+)\.html/i) || input.match(/^(\d+)$/);
    const videoId = idMatch ? idMatch[1] : "";
    if (!videoId) return { list: [] };

    const html = await requestText(`${HOST}/voddetail${videoId}.html`);
    const name = cleanText((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "")
      || cleanText((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "").split("-")[0].trim();
    const tags = getInfoTagValues(html);
    const year = tags.find((value) => /^\d{4}$/.test(value)) || "";
    const area = tags.find((value) => AREA_NAMES.has(value)) || (year && tags[tags.indexOf(year) + 1]) || "";
    const vodClass = tags.find((value) => value !== year && value !== area) || "";
    const playSources = parsePlaySources(html);
    const legacy = toLegacyPlayFields(playSources);

    return {
      list: [{
        vod_id: videoId,
        vod_name: name,
        vod_pic: extractPoster(html),
        vod_year: year,
        vod_area: area,
        vod_class: vodClass,
        vod_director: normalizePeople(extractInfoItem(html, "导演")),
        vod_actor: normalizePeople(extractInfoItem(html, "主演")),
        vod_content: extractDescription(html) || "暂无简介",
        vod_remarks: extractInfoItem(html, "集数") || extractInfoItem(html, "备注") || extractInfoItem(html, "更新"),
        vod_play_sources: playSources,
        ...legacy,
      }],
    };
  } catch (error) {
    await OmniBox.log("error", `[莫小影][detail] ${error.message}`);
    return { list: [] };
  }
}

async function play(params = {}) {
  const input = String(params.playId || params.id || params.url || params.input || "").trim();
  const flag = String(params.flag || "播放").trim() || "播放";
  if (!input) return browserSniffResult("", `${HOST}/`, flag);

  const playUrl = absUrl(input);
  if (isDirectMedia(playUrl)) {
    return isHttpUrl(playUrl) ? directPlayResult(playUrl, `${HOST}/`, flag) : emptyPlayResult();
  }

  if (!isSitePlayPage(playUrl)) {
    await OmniBox.log("warn", `[莫小影][play] 拒绝非本站播放页: ${playUrl}`);
    return emptyPlayResult();
  }
  try {
    const html = await requestText(playUrl, { referer: `${HOST}/`, timeout: 30000 });
    const player = extractPlayerData(html);
    const decoded = decodePlayerUrl(player?.url, player?.encrypt);
    const realUrl = decoded ? absUrl(decoded, playUrl) : "";
    const from = String(player?.from || "").toLowerCase();

    if (isHttpUrl(realUrl) && (isDirectMedia(realUrl) || /m3u8|mp4|flv/.test(from))) {
      return directPlayResult(realUrl, playUrl, flag);
    }
    if (isHttpUrl(realUrl)) return await sniffOrBrowserFallback(realUrl, playUrl, flag);

    const iframeMatch = html.match(/<iframe\b[^>]*src=["']([^"']+)["']/i);
    const sniffTarget = iframeMatch ? absUrl(iframeMatch[1], playUrl) : playUrl;
    return await sniffOrBrowserFallback(sniffTarget, playUrl, flag);
  } catch (error) {
    await OmniBox.log("error", `[莫小影][play] ${error.message}`);
    return await sniffOrBrowserFallback(playUrl, playUrl, flag);
  }
}
});

_load(12, "袋鼠影视", function (module, exports, require) {
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
