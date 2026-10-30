// @name 影视采集B(合并4源)
// @version 3.20261030.1219
// @description 自动同步：采集聚合
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


_load(0, "4KVM", function (module, exports, require) {
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

_load(1, "七味", function (module, exports, require) {
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

_load(2, "瓜子", function (module, exports, require) {
// @name 瓜子APP
// @author 
// @description 刮削：支持，弹幕：支持，嗅探：支持
// @version 1.1.0
// @dependencies: axios, crypto
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/瓜子.js

/**
 * ============================================================================
 * 瓜子APP - OmniBox 爬虫脚本
 * ============================================================================
 *
 * 对齐最新 Guazi 协议（2026-07）：动态 token + 新 AES/headers/多域名
 * ============================================================================
 */

const OmniBox = require("omnibox_sdk");
const crypto = require("crypto");
const axios = require("axios");
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * 对齐最新 Guazi Java 源（2026-07）：动态 token + 新 AES/headers
 */
const API_HOSTS = [
    "https://apinew.uozvr.com",
    "https://api.w32z7vtd.com",
    "https://api.6a7nnf7.com",
    "https://api.umygrx3.com",
    "https://api.rmedphk.com",
];

const AES_KEY = "OITxa5OqAYjhswxx";
const AES_IV = "rCMNwZASNBKZ8mXV";
const DEVICE_OLD_KEY = "aLFBMWpxBrIDAD1Si/KVvm41";
const RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDUM5+/y8sPsWkd1/RQS64X259E
UwxFXFE5HlA65MqrxnPs0JqoSRojSDy5QhwvROlaD6TwRQHKMY2OAZ6SnQeUJsCh
TEFIR9qUkwrs3/MVUMxjsv6JS6Oe/juclyJGTgVmDhB55EafXsD0SQYVj/QXXsxR
6ewR5E2kL52yAAD4yQIDAQAB
-----END PUBLIC KEY-----`;
const RSA_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIICdgIBADANBgkqhkiG9w0BAQEFAASCAmAwggJcAgEAAoGAe6hKrWLi1zQmjTT1
ozbE4QdFeJGNxubxld6GrFGximxfMsMB6BpJhpcTouAqywAFppiKetUBBbXwYsYU
1wNr648XVmPmCMCy4rY8vdliFnbMUj086DU6Z+/oXBdWU3/b1G0DN3E9wULRSwcK
ZT3wj/cCI1vsCm3gj2R5SqkA9Y0CAwEAAQKBgAJH+4CxV0/zBVcLiBCHvSANm0l7
HetybTh/j2p0Y1sTXro4ALwAaCTUeqdBjWiLSo9lNwDHFyq8zX90+gNxa7c5EqcW
V9FmlVXr8VhfBzcZo1nXeNdXFT7tQ2yah/odtdcx+vRMSGJd1t/5k5bDd9wAvYdI
DblMAg+wiKKZ5KcdAkEA1cCakEN4NexkF5tHPRrR6XOY/XHfkqXxEhMqmNbB9U34
saTJnLWIHC8IXys6Qmzz30TtzCjuOqKRRy+FMM4TdwJBAJQZFPjsGC+RqcG5UvVM
iMPhnwe/bXEehShK86yJK/g/UiKrO87h3aEu5gcJqBygTq3BBBoH2md3pr/W+hUM
WBsCQQChfhTIrdDinKi6lRxrdBnn0Ohjg2cwuqK5zzU9p/N+S9x7Ck8wUI53DKm8
jUJE8WAG7WLj/oCOWEh+ic6NIwTdAkEAj0X8nhx6AXsgCYRql1klbqtVmL8+95KZ
K7PnLWG/IfjQUy3pPGoSaZ7fdquG8bq8oyf5+dzjE/oTXcByS+6XRQJAP/5ciy1b
L3NhUhsaOVy55MHXnPjdcTX0FaLi+ybXZIfIQ2P4rb19mVq1feMbCXhz+L1rG8oa
t5lYKfpe8k83ZA==
-----END PRIVATE KEY-----`;

const PLAY_UA = "Lavf/57.83.100";
const PLAY_REFERER = "http://WJiZxLXA2.com/";
const AUTH_FILE = process.env.GUAZI_AUTH_FILE || path.join(os.tmpdir(), "guazi_auth.json");
const DANMU_API = process.env.DANMU_API || "";

const state = {
    apiHost: API_HOSTS[0],
    token: "",
    tokenId: "",
    deviceId: "",
    deviceKey: "",
    registered: false,
    tokenReady: false,
    hostReady: false,
};

/**
 * 分类配置
 */
const CLASSES = [
    { type_id: "1", type_name: "电影" },
    { type_id: "2", type_name: "电视剧" },
    { type_id: "4", type_name: "动漫" },
    { type_id: "3", type_name: "综艺" },
    { type_id: "64", type_name: "短剧" }
];

/**
 * Java SUB_MAP
 */
const SUB_MAP = {
    "1": "5",
    "2": "12",
    "3": "30",
    "4": "22",
    "64": "",
    "5": "0",
};

/**
 * 筛选配置
 */
const FILTERS = {
    '1': [
        {
            key: 'year',
            name: '年份',
            init: '0',
            value: [
                { name: '全部', value: '0' },
                { name: '2026', value: '2026' },
                { name: '2025', value: '2025' },
                { name: '2024', value: '2024' },
                { name: '2023', value: '2023' },
                { name: '2022', value: '2022' },
                { name: '2021', value: '2021' },
                { name: '2020', value: '2020' },
                { name: '2019', value: '2019' },
                { name: '2018', value: '2018' },
                { name: '2017', value: '2017' },
                { name: '2016', value: '2016' },
                { name: '2015', value: '2015' },
                { name: '2014', value: '2014' },
                { name: '2013', value: '2013' },
                { name: '2012', value: '2012' },
                { name: '2011', value: '2011' },
                { name: '2010', value: '2010' },
                { name: '2009', value: '2009' },
                { name: '2008', value: '2008' },
                { name: '2007', value: '2007' },
                { name: '2006', value: '2006' },
                { name: '2005', value: '2005' },
                { name: '更早', value: '2004' }
            ]
        },
        {
            key: 'area',
            name: '地区',
            init: '0',
            value: [
                { name: '全部', value: '0' },
                { name: '大陆', value: '大陆' },
                { name: '香港', value: '香港' },
                { name: '台湾', value: '台湾' },
                { name: '美国', value: '美国' },
                { name: '韩国', value: '韩国' },
                { name: '日本', value: '日本' },
                { name: '英国', value: '英国' },
                { name: '法国', value: '法国' },
                { name: '泰国', value: '泰国' },
                { name: '印度', value: '印度' },
                { name: '其他', value: '其他' }
            ]
        },
        {
            key: 'sort',
            name: '排序',
            init: 'd_id',
            value: [
                { name: '最新', value: 'd_id' },
                { name: '最热', value: 'd_hits' },
                { name: '推荐', value: 'd_score' }
            ]
        }
    ],
    '2': [
        {
            key: 'year',
            name: '年份',
            init: '0',
            value: [
                { name: '全部', value: '0' },
                { name: '2026', value: '2026' },
                { name: '2025', value: '2025' },
                { name: '2024', value: '2024' },
                { name: '2023', value: '2023' },
                { name: '2022', value: '2022' },
                { name: '2021', value: '2021' },
                { name: '2020', value: '2020' },
                { name: '2019', value: '2019' },
                { name: '2018', value: '2018' },
                { name: '2017', value: '2017' },
                { name: '2016', value: '2016' },
                { name: '2015', value: '2015' },
                { name: '2014', value: '2014' },
                { name: '2013', value: '2013' },
                { name: '2012', value: '2012' },
                { name: '2011', value: '2011' },
                { name: '2010', value: '2010' },
                { name: '2009', value: '2009' },
                { name: '2008', value: '2008' },
                { name: '2007', value: '2007' },
                { name: '2006', value: '2006' },
                { name: '2005', value: '2005' },
                { name: '更早', value: '2004' }
            ]
        },
        {
            key: 'area',
            name: '地区',
            init: '0',
            value: [
                { name: '全部', value: '0' },
                { name: '大陆', value: '大陆' },
                { name: '香港', value: '香港' },
                { name: '台湾', value: '台湾' },
                { name: '美国', value: '美国' },
                { name: '韩国', value: '韩国' },
                { name: '日本', value: '日本' },
                { name: '英国', value: '英国' },
                { name: '法国', value: '法国' },
                { name: '泰国', value: '泰国' },
                { name: '印度', value: '印度' },
                { name: '其他', value: '其他' }
            ]
        },
        {
            key: 'sort',
            name: '排序',
            init: 'd_id',
            value: [
                { name: '最新', value: 'd_id' },
                { name: '最热', value: 'd_hits' },
                { name: '推荐', value: 'd_score' }
            ]
        }
    ],
    '4': [
        {
            key: 'year',
            name: '年份',
            init: '0',
            value: [
                { name: '全部', value: '0' },
                { name: '2026', value: '2026' },
                { name: '2025', value: '2025' },
                { name: '2024', value: '2024' },
                { name: '2023', value: '2023' },
                { name: '2022', value: '2022' },
                { name: '2021', value: '2021' },
                { name: '2020', value: '2020' },
                { name: '2019', value: '2019' },
                { name: '2018', value: '2018' },
                { name: '2017', value: '2017' },
                { name: '2016', value: '2016' },
                { name: '2015', value: '2015' }
            ]
        },
        {
            key: 'area',
            name: '地区',
            init: '0',
            value: [
                { name: '全部', value: '0' },
                { name: '大陆', value: '大陆' },
                { name: '日本', value: '日本' },
                { name: '美国', value: '美国' },
                { name: '其他', value: '其他' }
            ]
        },
        {
            key: 'sort',
            name: '排序',
            init: 'd_id',
            value: [
                { name: '最新', value: 'd_id' },
                { name: '最热', value: 'd_hits' },
                { name: '推荐', value: 'd_score' }
            ]
        }
    ],
    '3': [
        {
            key: 'year',
            name: '年份',
            init: '0',
            value: [
                { name: '全部', value: '0' },
                { name: '2026', value: '2026' },
                { name: '2025', value: '2025' },
                { name: '2024', value: '2024' },
                { name: '2023', value: '2023' },
                { name: '2022', value: '2022' }
            ]
        },
        {
            key: 'area',
            name: '地区',
            init: '0',
            value: [
                { name: '全部', value: '0' },
                { name: '大陆', value: '大陆' },
                { name: '台湾', value: '台湾' },
                { name: '韩国', value: '韩国' }
            ]
        },
        {
            key: 'sort',
            name: '排序',
            init: 'd_id',
            value: [
                { name: '最新', value: 'd_id' },
                { name: '最热', value: 'd_hits' },
                { name: '推荐', value: 'd_score' }
            ]
        }
    ],
    '64': [
        {
            key: 'year',
            name: '年份',
            init: '0',
            value: [
                { name: '全部', value: '0' },
                { name: '2026', value: '2026' },
                { name: '2025', value: '2025' },
                { name: '2024', value: '2024' },
                { name: '2023', value: '2023' }
            ]
        },
        {
            key: 'sort',
            name: '排序',
            init: 'd_id',
            value: [
                { name: '最新', value: 'd_id' },
                { name: '最热', value: 'd_hits' },
                { name: '推荐', value: 'd_score' }
            ]
        }
    ]
};

/**
 * API 路径
 */
const API_PATHS = {
    INDEX_LIST: '/App/IndexList/indexList',
    PLAY_INFO: '/App/IndexPlay/playInfo',
    VURL_SHOW: '/App/Resource/Vurl/show',
    VURL_DETAIL: '/App/Resource/VurlDetail/showOne',
    FIND_MORE: '/App/Index/findMoreVod',
    SIGN_UP: '/App/Authentication/Device/signUp',
    SIGN_IN: '/App/Authentication/Device/signIn',
    REFRESH: '/App/Authentication/Authenticator/refresh'
};

/**
 * 缓存管理
 */
const cache = {
    data: new Map(),
    ttl: {
        category: 300000,
        detail: 600000,
        play: 300000,
        search: 60000
    },
    get: (key) => {
        const item = cache.data.get(key);
        if (!item) return null;
        if (Date.now() > item.expire) {
            cache.data.delete(key);
            return null;
        }
        return item.data;
    },
    set: (key, data, type = 'category') => {
        cache.data.set(key, {
            data,
            expire: Date.now() + cache.ttl[type]
        });
        if (cache.data.size > 200) cache.data.clear();
    }
};

/**
 * 日志工具
 */
const logInfo = (message, data = null) => {
    if (data) {
        OmniBox.log("info", `[瓜子APP] ${message}: ${JSON.stringify(data)}`);
    } else {
        OmniBox.log("info", `[瓜子APP] ${message}`);
    }
};

const logError = (message, error) => {
    OmniBox.log("error", `[瓜子APP] ${message}: ${error.message || error}`);
};

const logWarn = (message) => {
    OmniBox.log("warn", `[瓜子APP] ${message}`);
};

function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
    if (!value || typeof value !== "object") return JSON.stringify(value);
    return `{${Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
        .join(",")}}`;
}

function apiJsonStringify(value) {
    return JSON.stringify(value).replace(/[^\x00-\x7F]/g, (char) => {
        return `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`;
    });
}

function md5Upper(value) {
    return crypto.createHash("md5").update(String(value)).digest("hex").toUpperCase();
}

function aesEncryptHex(text, key = AES_KEY, iv = AES_IV) {
    const cipher = crypto.createCipheriv("aes-128-cbc", Buffer.from(key, "utf8"), Buffer.from(iv, "utf8"));
    cipher.setAutoPadding(true);
    return Buffer.concat([cipher.update(String(text), "utf8"), cipher.final()]).toString("hex").toUpperCase();
}

function aesDecryptHex(hexText, key, iv) {
    const decipher = crypto.createDecipheriv("aes-128-cbc", Buffer.from(key, "utf8"), Buffer.from(iv, "utf8"));
    decipher.setAutoPadding(true);
    return Buffer.concat([
        decipher.update(Buffer.from(String(hexText || ""), "hex")),
        decipher.final(),
    ]).toString("utf8");
}

function rsaEncrypt(data) {
    return crypto
        .publicEncrypt(
            { key: RSA_PUBLIC_KEY, padding: crypto.constants.RSA_PKCS1_PADDING },
            Buffer.from(String(data), "utf8")
        )
        .toString("base64");
}

function rsaDecrypt(encryptedText) {
    const encrypted = Buffer.from(String(encryptedText || ""), "base64");
    try {
        return crypto
            .privateDecrypt({ key: RSA_PRIVATE_KEY, padding: crypto.constants.RSA_PKCS1_PADDING }, encrypted)
            .toString("utf8");
    } catch (error) {
        if (!crypto.constants.RSA_NO_PADDING) throw error;
    }
    const raw = crypto.privateDecrypt({ key: RSA_PRIVATE_KEY, padding: crypto.constants.RSA_NO_PADDING }, encrypted);
    if (raw[0] !== 0x00 || raw[1] !== 0x02) throw new Error("响应密钥 RSA padding 不匹配");
    const split = raw.indexOf(0x00, 2);
    if (split < 10) throw new Error("响应密钥 RSA padding 无效");
    return raw.slice(split + 1).toString("utf8");
}

function loadAuth() {
    try {
        if (fs.existsSync(AUTH_FILE)) {
            const data = JSON.parse(fs.readFileSync(AUTH_FILE, "utf8"));
            state.token = String(data.token || "");
            state.tokenId = String(data.tokenId || data.token_id || "");
            state.deviceId = String(data.deviceId || data.device_id || "");
            state.deviceKey = String(data.deviceKey || data.device_key || "");
            state.registered = !!data.registered || !!state.token;
        }
    } catch {}

    if (state.deviceId && state.deviceKey) return;

    state.deviceId = String(864150060000000 + Math.floor(Math.random() * 10000));
    state.deviceKey = crypto.randomBytes(20).toString("hex").toUpperCase();
    state.token = "";
    state.tokenId = "";
    state.registered = false;
    saveAuth();
}

function saveAuth() {
    try {
        fs.writeFileSync(
            AUTH_FILE,
            JSON.stringify(
                {
                    token: state.token,
                    tokenId: state.tokenId,
                    deviceId: state.deviceId,
                    deviceKey: state.deviceKey,
                    registered: state.registered,
                },
                null,
                2
            )
        );
    } catch (e) {
        logWarn(`保存认证信息失败: ${e.message}`);
    }
}

function getHeaders() {
    return {
        "User-Agent": PLAY_UA,
        code: "GZ0369",
        deviceId: state.deviceId || "",
        lang: "zh_cn",
        "Cache-Control": "no-cache",
        "Content-Type": "application/x-www-form-urlencoded",
        Version: "2604028",
        PackageName: "com.ae06aebdbb.y286327f5a.ofe849883320260517",
        Ver: "3.0.3.2",
        "api-ver": "3.0.3.2",
    };
}

const client = axios.create({
    timeout: 22000,
    maxRedirects: 3,
    httpAgent: new http.Agent({ keepAlive: true }),
    httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
    validateStatus: () => true,
});

async function findAvailableHost() {
    for (const host of API_HOSTS) {
        try {
            const res = await axios.head(host, {
                timeout: 3000,
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                validateStatus: () => true,
                headers: { "User-Agent": "Mozilla/5.0" },
            });
            if (res.status >= 200 && res.status < 500) {
                state.apiHost = host;
                state.hostReady = true;
                logInfo("选用 API 域名", { host });
                return host;
            }
        } catch {}
    }
    state.apiHost = API_HOSTS[0];
    state.hostReady = true;
    return state.apiHost;
}

async function ensureHost() {
    if (!state.hostReady) await findAvailableHost();
    return state.apiHost;
}

function applyAuth(result = {}) {
    const newToken = String(result.token || "");
    if (!newToken) throw new Error(`Token 获取失败: ${JSON.stringify(result)}`);
    state.token = newToken;
    const newTokenId = String(result.app_user_id || result.token_id || "");
    if (newTokenId) state.tokenId = newTokenId;
    saveAuth();
}

async function rawApiRequest(path, params = {}, retry = 0, options = {}) {
    const authPath = String(path).startsWith("/App/Authentication/");
    if (!authPath) await ensureToken();

    const host = await ensureHost();
    const requestParams = { ...(params || {}) };
    if (Object.prototype.hasOwnProperty.call(requestParams, "token")) requestParams.token = state.token;
    if (Object.prototype.hasOwnProperty.call(requestParams, "token_id")) requestParams.token_id = state.tokenId;

    const useCache = options.useCache === true && !authPath;
    const cacheKey = `${host}|${path}|${stableStringify(requestParams)}|${state.tokenId}`;
    if (useCache) {
        const cached = cache.get(cacheKey);
        if (cached) {
            logInfo("使用缓存数据", { path });
            return cached;
        }
    }

    const jsonParams = apiJsonStringify(requestParams);
    const requestKey = aesEncryptHex(jsonParams);
    const time = String(Math.floor(Date.now() / 1000));
    const keys = rsaEncrypt(JSON.stringify({ iv: AES_IV, key: AES_KEY }));
    const tokenForSign = state.token || "";
    const signStr =
        `token_id=,token=${tokenForSign},phone_type=1,request_key=${requestKey}` +
        `,app_id=1,time=${time},keys=${keys}*&zvdvdvddbfikkkumtmdwqppp?|4Y!s!2br`;
    const signature = md5Upper(signStr);

    const body = new URLSearchParams({
        token: tokenForSign,
        token_id: "",
        phone_type: "1",
        time,
        phone_model: "xiaomi-25031",
        keys,
        request_key: requestKey,
        signature,
        app_id: "1",
        ad_version: "1",
    }).toString();

    logInfo(`发送API请求`, { url: `${host}${path}`, retry });
    const res = await client.post(`${host}${path}`, body, { headers: getHeaders() });
    if (res.status < 200 || res.status >= 400) {
        throw new Error(`HTTP ${res.status} ${path}`);
    }

    const response = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
    if (!response || typeof response !== "object") throw new Error(`空响应 ${path}`);

    if (response.code != null && Number(response.code) !== 200) {
        if (retry < 1 && !authPath) {
            state.tokenReady = false;
            await ensureToken(true);
            return rawApiRequest(path, params, retry + 1, options);
        }
        throw new Error(`请求失败: ${JSON.stringify(response)}`);
    }

    const encryptedData = response.data || {};
    if (!encryptedData.keys || !encryptedData.response_key) {
        throw new Error(`API 返回缺少加密数据: ${path}`);
    }
    const keyInfo = JSON.parse(rsaDecrypt(encryptedData.keys));
    const decrypted = aesDecryptHex(encryptedData.response_key, keyInfo.key, keyInfo.iv);
    const result = JSON.parse(decrypted);
    if (useCache) {
        const cacheType = options.cacheType || "category";
        cache.set(cacheKey, result, cacheType);
    }
    logInfo("API请求成功", { path });
    return result;
}

async function signUp() {
    const result = await rawApiRequest(API_PATHS.SIGN_UP, {
        new_key: state.deviceKey,
        old_key: DEVICE_OLD_KEY,
        phone_type: 1,
        code: "",
    });
    applyAuth(result);
    state.registered = true;
    saveAuth();
}

async function signIn() {
    const result = await rawApiRequest(API_PATHS.SIGN_IN, {
        new_key: state.deviceKey,
        old_key: DEVICE_OLD_KEY,
    });
    applyAuth(result);
}

async function ensureToken(force = false) {
    if (!force && state.tokenReady && state.token) return;
    loadAuth();
    if (!state.token) {
        if (state.registered) await signIn();
        else await signUp();
    }
    try {
        applyAuth(await rawApiRequest(API_PATHS.REFRESH, {}));
    } catch (error) {
        if (!state.registered) throw error;
        await signIn();
    }
    state.tokenReady = true;
}

/**
 * API 请求函数（兼容旧调用）
 */
const apiRequest = async (data, path, cacheType = "category", retries = 1) => {
    try {
        return await rawApiRequest(path, data, 0, {
            useCache: cacheType !== "none",
            cacheType: cacheType === "none" ? "category" : cacheType,
        });
    } catch (e) {
        if (retries > 0) {
            logWarn(`API请求失败，重试: ${e.message}`);
            try {
                return await rawApiRequest(path, data, 0, {
                    useCache: false,
                    cacheType: cacheType === "none" ? "category" : cacheType,
                });
            } catch (e2) {
                logError("API请求最终失败", e2);
                return null;
            }
        }
        logError("API请求最终失败", e);
        return null;
    }
};

/**
 * 获取分辨率分数（用于排序）
 */
const getResolutionScore = (res) => {
    const r = String(res || "").toLowerCase().replace("p", "");
    if (r === "8k") return 100;
    if (r === "4k" || r === "2160") return 90;
    if (r === "1440") return 80;
    if (r === "1080") return 70;
    if (r === "720") return 60;
    if (r === "超清") return 50;
    if (r === "高清") return 40;
    if (r === "标清") return 30;
    return 10;
};

function parseParamString(value) {
    const text = String(value || "").replace(/&amp;/g, "&").replace(/^\?/, "");
    const params = {};
    for (const [key, val] of new URLSearchParams(text)) {
        params[key === "vod_d_id" ? "vod_id" : key] = val;
    }
    return params;
}

/**
 * 弹幕工具函数
 */
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
        if (!matchData.isMatched) return [];

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
    } catch (e) {
        logWarn(`弹幕匹配失败: ${e.message}`);
        return [];
    }
};

const encodeMeta = (obj) => {
    try {
        return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64');
    } catch {
        return '';
    }
};

const decodeMeta = (str) => {
    try {
        const raw = Buffer.from(str, 'base64').toString('utf8');
        return JSON.parse(raw);
    } catch {
        return {};
    }
};

const extractVodIdForApi = (rawVideoId) => {
    const text = String(rawVideoId || '').trim();
    if (!text) return '';

    const decoded = decodeURIComponent(text);
    const pathMatch = decoded.match(/\/id\/(\d+)\.html/i);
    if (pathMatch?.[1]) return pathMatch[1];

    const firstPart = decoded.split('/')[0];
    if (/^\d+$/.test(firstPart)) return firstPart;

    const numMatch = decoded.match(/(\d+)/);
    return numMatch?.[1] || decoded;
};

/* ============================================================================
 * OmniBox 接口实现
 * ============================================================================ */

/**
 * 获取首页数据
 */
async function home(params) {
    try {
        logInfo('处理首页请求');

        const data = await apiRequest({
            area: '0',
            year: '0',
            pageSize: '100',
            sort: 'd_id',
            page: '1'
        }, API_PATHS.INDEX_LIST, 'category');

        let list = [];
        if (data?.list) {
            list = data.list.map(item => ({
                vod_id: `${item.vod_id}/${item.vod_continu || 0}`,
                vod_name: item.vod_name,
                vod_pic: item.vod_pic,
                vod_remarks: (item.vod_continu || 0) === 0 ? '电影' : `更新至${item.vod_continu}集`
            }));
        }

        return {
            class: CLASSES,
            filters: FILTERS,
            list
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

        const area = filters.area || '0';
        const year = filters.year || '0';
        const sort = filters.sort || 'd_id';
        const tid = String(categoryId);

        logInfo('获取分类列表', { categoryId, page, area, year, sort });

        const data = await apiRequest({
            area: area,
            year: year,
            pageSize: "20",
            sort: sort,
            page: page.toString(),
            tid: tid,
            sub: SUB_MAP[tid] != null ? SUB_MAP[tid] : "0",
        }, API_PATHS.INDEX_LIST, 'category');

        if (!data || !data.list) {
            logWarn('分类列表数据为空');
            return { list: [], page: page, pagecount: 0 };
        }

        const totalPage = parseInt(data.totalPage || 0);

        const list = data.list.map(item => ({
            vod_id: `${item.vod_id}/${item.vod_continu || 0}`,
            vod_name: item.vod_name,
            vod_pic: item.vod_pic,
            vod_remarks: (item.vod_continu || 0) === 0 ? '电影' : `更新至${item.vod_continu}集`
        }));

        logInfo('分类列表获取成功', { count: list.length });

        return {
            list: list,
            page: parseInt(page),
            pagecount: totalPage === 0 ? 999 : totalPage
        };
    } catch (error) {
        logError('获取分类数据失败', error);
        return {
            page: 1,
            pagecount: 0,
            list: []
        };
    }
}

/**
 * 搜索视频
 */
async function search(params) {
    try {
        const keyword = params.keyword || params.wd || "";
        const page = params.page || 1;

        if (!keyword) {
            return {
                page: 1,
                pagecount: 0,
                list: []
            };
        }

        logInfo('执行搜索', { keyword, page });

        const data = await apiRequest({
            keywords: keyword,
            order_val: "1",
            page: page.toString()
        }, API_PATHS.FIND_MORE, 'search');

        if (!data || !data.list) {
            logWarn('搜索结果为空');
            return { list: [], page: page, pagecount: 0 };
        }

        const totalPage = parseInt(data.totalPage || 0);

        const filteredList = data.list
            .filter(item => item.vod_name && item.vod_name.toLowerCase().includes(keyword.toLowerCase()))
            .map(item => ({
                vod_id: `${item.vod_id}/${item.vod_continu || 0}`,
                vod_name: item.vod_name,
                vod_pic: item.vod_pic,
                vod_remarks: (item.vod_continu || 0) === 0 ? '电影' : `更新至${item.vod_continu}集`
            }));

        logInfo('搜索完成(已过滤)', { keyword, count: filteredList.length });

        return {
            list: filteredList,
            page: parseInt(page),
            pagecount: totalPage === 0 ? 1 : totalPage
        };
    } catch (error) {
        logError('搜索视频失败', error);
        return {
            page: 1,
            pagecount: 0,
            list: []
        };
    }
}

/**
 * 获取视频详情
 */
async function detail(params) {
    try {
        const videoId = params.videoId;

        if (!videoId) {
            throw new Error("视频ID不能为空");
        }

        logInfo('获取视频详情', { videoId });

        const ids = Array.isArray(videoId) ? videoId : [videoId];
        const results = [];

        await Promise.all(ids.map(async (idStr) => {
            try {
                const videoIdForScrape = String(idStr || '');
                const vodId = extractVodIdForApi(idStr);

                await ensureToken();

                const [detailData, playData] = await Promise.all([
                    apiRequest({
                        token_id: state.tokenId,
                        vod_id: vodId,
                        mobile_time: Math.floor(Date.now() / 1000).toString(),
                        token: state.token
                    }, API_PATHS.PLAY_INFO, 'detail'),
                    apiRequest({
                        vurl_cloud_id: "2",
                        vod_d_id: vodId
                    }, API_PATHS.VURL_SHOW, 'detail')
                ]);

                if (!detailData?.vodInfo) {
                    logWarn(`视频${vodId}详情为空`);
                    return;
                }

                const vod = detailData.vodInfo;

                const vodPlaySources = [];
                const scrapeCandidates = [];
                if (playData?.list) {
                    playData.list.forEach((item, index) => {
                        if (!item.play) return;

                        const resolutions = [];
                        const params = [];

                        for (const [key, val] of Object.entries(item.play)) {
                            if (val.param) {
                                resolutions.push(key);
                                params.push(val.param);
                            }
                        }

                        if (params.length > 0) {
                            resolutions.sort((a, b) => getResolutionScore(b) - getResolutionScore(a));
                            const playName = playData.list.length === 1
                                ? (vod.vod_name || '正片')
                                : (item.name || (index + 1).toString());
                            const playUrl = `${params[0]}||${resolutions.join('@')}`;

                            if (vodPlaySources.length === 0) {
                                vodPlaySources.push({
                                    name: '瓜子专线',
                                    episodes: []
                                });
                            }

                            const playIdForSource = `${playUrl}|||${encodeMeta({ v: vod.vod_name || '', e: playName, sid: `${videoIdForScrape}#${index}`, fid: `${videoIdForScrape}#${index}` })}`;

                            vodPlaySources[0].episodes.push({
                                name: playName,
                                playId: playIdForSource
                            });

                            scrapeCandidates.push({
                                fid: `${videoIdForScrape}#${index}`,
                                file_id: `${videoIdForScrape}#${index}`,
                                file_name: playName,
                                name: playName,
                                format_type: 'video'
                            });
                        }
                    });
                }

                let scrapeData = null;
                let videoMappings = [];
                if (scrapeCandidates.length > 0) {
                    try {
                        const scrapingResult = await OmniBox.processScraping(videoId, vod.vod_name || '', vod.vod_name || '', scrapeCandidates);
                        OmniBox.log('info', `[瓜子APP] 刮削处理完成,结果: ${JSON.stringify(scrapingResult || {}).substring(0, 200)}`);
                        const metadata = await OmniBox.getScrapeMetadata(videoId);
                        scrapeData = metadata?.scrapeData || null;
                        videoMappings = metadata?.videoMappings || [];
                        logInfo('刮削完成', { vodId, mappingCount: videoMappings.length, hasScrapeData: !!scrapeData });
                    } catch (e) {
                        logWarn(`刮削处理失败: ${e.message}`);
                    }
                }

                if (vodPlaySources.length > 0 && Array.isArray(vodPlaySources[0].episodes) && vodPlaySources[0].episodes.length > 0) {
                    vodPlaySources[0].episodes.forEach((ep) => {
                        const playIdRaw = ep.playId || '';
                        const metaRaw = playIdRaw.includes('|||') ? playIdRaw.split('|||')[1] : '';
                        const meta = decodeMeta(metaRaw || '');
                        const mapping = videoMappings.find((m) => m?.fileId === meta.fid);
                        if (mapping?.episodeName) {
                            const oldName = ep.name;
                            ep.name = mapping.episodeNumber + "." + mapping.episodeName;
                            if (oldName !== ep.name) {
                                OmniBox.log('info', `[瓜子APP] 应用刮削后源文件名: ${oldName} -> ${ep.name}`);
                            }
                        }
                    });

                    const hasEpisodeNumber = vodPlaySources[0].episodes.some((ep) => {
                        const playIdRaw = ep.playId || '';
                        const metaRaw = playIdRaw.includes('|||') ? playIdRaw.split('|||')[1] : '';
                        const meta = decodeMeta(metaRaw || '');
                        const mapping = videoMappings.find((m) => m?.fileId === meta.fid);
                        return mapping && mapping.episodeNumber !== undefined && mapping.episodeNumber !== null;
                    });

                    if (hasEpisodeNumber) {
                        vodPlaySources[0].episodes.sort((a, b) => {
                            const metaA = decodeMeta((a.playId || '').split('|||')[1] || '');
                            const metaB = decodeMeta((b.playId || '').split('|||')[1] || '');
                            const mapA = videoMappings.find((m) => m?.fileId === metaA.fid) || {};
                            const mapB = videoMappings.find((m) => m?.fileId === metaB.fid) || {};
                            const seasonA = mapA.seasonNumber || 0;
                            const seasonB = mapB.seasonNumber || 0;
                            if (seasonA !== seasonB) return seasonA - seasonB;
                            const epA = mapA.episodeNumber || 0;
                            const epB = mapB.episodeNumber || 0;
                            return epA - epB;
                        });
                    }
                }

                const video = {
                    vod_id: videoIdForScrape,
                    vod_name: scrapeData?.title || vod.vod_name,
                    vod_pic: scrapeData?.posterPath ? `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}` : vod.vod_pic,
                    vod_year: scrapeData?.releaseDate ? String(scrapeData.releaseDate).substring(0, 4) : vod.vod_year,
                    vod_area: vod.vod_area,
                    vod_actor: (scrapeData?.credits?.cast || []).slice(0, 5).map((c) => c?.name).filter(Boolean).join(',') || vod.vod_actor,
                    vod_director: (scrapeData?.credits?.crew || []).filter((c) => c?.job === 'Director' || c?.department === 'Directing').slice(0, 3).map((c) => c?.name).filter(Boolean).join(',') || '',
                    vod_content: (scrapeData?.overview || vod.vod_use_content || '').trim(),
                    vod_play_sources: vodPlaySources.length > 0 ? vodPlaySources : undefined
                };

                results.push(video);
            } catch (e) {
                logError(`获取视频${idStr}详情失败`, e);
            }
        }));

        logInfo('详情获取成功', { count: results.length });

        return { list: results };
    } catch (error) {
        logError('获取视频详情失败', error);
        return { list: [] };
    }
}

/**
 * 获取播放地址
 */
async function play(params) {
    try {
        let playId = params.playId;
        let vodName = '';
        let episodeName = '';
        let playMeta = {};

        if (!playId) {
            throw new Error("播放地址ID不能为空");
        }

        if (playId.includes('|||')) {
            const [mainPlayId, metaB64] = playId.split('|||');
            playId = mainPlayId;
            playMeta = decodeMeta(metaB64 || '');
            vodName = playMeta.v || '';
            episodeName = playMeta.e || '';
        }

        let scrapedDanmuFileName = '';
        try {
            const videoIdFromParam = params.vodId ? String(params.vodId) : '';
            const videoIdFromMeta = playMeta?.sid ? String(playMeta.sid).split('#')[0] : '';
            const videoId = videoIdFromParam || videoIdFromMeta;
            const sourceIdByVod = videoId;

            let metadata = null;
            if (sourceIdByVod) {
                metadata = await OmniBox.getScrapeMetadata(sourceIdByVod);
            }

            if (metadata && metadata.scrapeData) {
                const mapping = (metadata.videoMappings || []).find((m) => m?.fileId === playMeta?.fid);
                scrapedDanmuFileName = buildScrapedDanmuFileName(metadata.scrapeData, metadata.scrapeType || '', mapping, vodName, episodeName);
                if (metadata.scrapeData.title) {
                    vodName = metadata.scrapeData.title;
                }
                if (mapping?.episodeName) {
                    episodeName = mapping.episodeName;
                }
            }
        } catch (e) {
            logWarn(`读取刮削元数据失败: ${e.message}`);
        }

        logInfo('获取播放地址', { playId: playId });

        const playHeader = {
            "User-Agent": PLAY_UA,
            Referer: PLAY_REFERER,
        };

        const parts = playId.split('||');
        let playResponse;
        if (parts.length < 2) {
            playResponse = {
                urls: [{ name: '播放', url: playId }],
                header: playHeader,
                parse: 0
            };
        } else {
            const paramStr = parts[0];
            const resolutions = parts[1].split('@');

            const requestParams = parseParamString(paramStr);

            if (resolutions.length > 0) {
                resolutions.sort((a, b) => getResolutionScore(b) - getResolutionScore(a));
                requestParams.resolution = resolutions[0];
            }

            const data = await apiRequest(requestParams, API_PATHS.VURL_DETAIL, 'none');

            const playUrl = data?.url || '';

            logInfo('播放地址获取成功', { url: playUrl });

            playResponse = {
                urls: [{ name: '播放', url: playUrl }],
                header: playHeader,
                parse: 0
            };
        }

        if (DANMU_API && vodName) {
            const fileName = scrapedDanmuFileName || buildFileNameForDanmu(vodName, episodeName);
            logInfo(`尝试匹配弹幕文件名: ${fileName}`);
            if (fileName) {
                const danmakuList = await matchDanmu(fileName);
                if (danmakuList.length > 0) {
                    playResponse.danmaku = danmakuList;
                    logInfo('弹幕已添加到播放响应');
                }
            }
        } else if (!DANMU_API) {
            logInfo('DANMU_API 未配置，跳过弹幕匹配');
        }

        return playResponse;
    } catch (error) {
        logError('获取播放地址失败', error);
        return {
            urls: [],
            parse: 0
        };
    }
}

/* ============================================================================
 * 导出模块
 * ============================================================================ */

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

_load(3, "电影天堂", function (module, exports, require) {
// @name 电影天堂
// @author 
// @description 刮削：支持，弹幕：支持，嗅探：支持
// @version 1.0.6
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/电影天堂.js
const OmniBox = require("omnibox_sdk");

// ==================== 配置区域 ====================
// 采集站 API 地址（优先使用环境变量，如果没有则使用默认值）
// 例如：https://example.com/api.php/provide/vod/
const SITE_API = process.env.SITE_API || "https://caiji.dyttzyapi.com/api.php/provide/vod";
// 弹幕 API 地址（优先使用环境变量，如果没有则使用默认值）
// 例如：https://danmu.example.com
// 如果为空，则不启用弹幕功能
const DANMU_API = process.env.DANMU_API || "";

// EXCLUDE_CLASS_NAMES 环境变量（分类屏蔽关键词）
// 支持 3 种写法：
// 1) JSON 数组（推荐）：["伦理片","情色"]
// 2) 逗号分隔：伦理片,情色
// 3) 竖线分隔：伦理片|情色
// 行为说明：
// - 未设置该环境变量：使用 DEFAULT_EXCLUDE_CLASS_NAMES
// - 显式设置为空字符串：不屏蔽任何分类（返回 []）
const EXCLUDE_CLASS_NAMES_ENV = process.env.EXCLUDE_CLASS_NAMES || "伦理片";
// ==================== 配置区域结束 ====================

function parseExcludeClassNamesFromEnv() {
    const raw = EXCLUDE_CLASS_NAMES_ENV;

    const text = raw.trim();
    // 环境变量显式留空时，表示不屏蔽任何分类
    if (!text) {
        return [];
    }

    let values = [];

    // 优先支持 JSON 数组格式: ["伦理片","其他"]
    if (text.startsWith("[") && text.endsWith("]")) {
        try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
                values = parsed;
            }
        } catch (error) {
            OmniBox.log("warn", `EXCLUDE_CLASS_NAMES 环境变量 JSON 解析失败: ${error.message}`);
        }
    }

    // 兼容逗号/竖线分隔格式: 伦理片,情色片 或 伦理片|情色片
    if (values.length === 0) {
        values = text.split(/[,，|]/g);
    }

    const normalized = Array.from(
        new Set(
            values
                .map((item) => String(item || "").trim())
                .filter(Boolean)
        )
    );

    return normalized;
}

const EXCLUDE_CLASS_NAMES = parseExcludeClassNamesFromEnv();

function shouldExcludeClassName(name) {
    const className = String(name || "").trim();
    if (!className || EXCLUDE_CLASS_NAMES.length === 0) {
        return false;
    }
    return EXCLUDE_CLASS_NAMES.some((keyword) => className.includes(keyword));
}

function getEffectiveCategoryGroup(group) {
    const allIds = Array.isArray(group?.allIds) ? group.allIds.map((id) => String(id || "").trim()).filter(Boolean) : [];
    const types = Array.isArray(group?.types) ? group.types : [];

    if (types.length === 0) {
        return {
            ...group,
            allIds,
            types,
        };
    }

    const excludedTypeIds = new Set();
    const filteredTypes = types.filter((item) => {
        if (!item || typeof item !== "object") {
            return false;
        }
        const value = String(item.value || "").trim();
        const name = String(item.name || "").trim();
        if (value && value !== "all" && shouldExcludeClassName(name)) {
            excludedTypeIds.add(value);
            return false;
        }
        return true;
    });

    const filteredAllIds = allIds.filter((id) => !excludedTypeIds.has(id));

    return {
        ...group,
        allIds: filteredAllIds,
        types: filteredTypes,
    };
}

// 自定义分类配置
// 格式: { "顶层分类ID": { name: "显示名称", allIds: ["子分类ID1", "子分类ID2", ...], types: [筛选项] } }
const CATEGORY_CONFIG = {
    "1": {
        name: "电影",
        allIds: ["6", "7", "8", "9", "10", "11", "12", "20", "37", "34"],
        types: [
            { name: "全部", value: "all" },
            { name: "动作片", value: "6" },
            { name: "喜剧片", value: "7" },
            { name: "爱情片", value: "8" },
            { name: "科幻片", value: "9" },
            { name: "恐怖片", value: "10" },
            { name: "剧情片", value: "11" },
            { name: "战争片", value: "12" },
            { name: "记录片", value: "20" },
            { name: "动画片", value: "37" },
            { name: "伦理片", value: "34" },
        ],
    },
    "2": {
        name: "电视剧",
        allIds: ["13", "16", "15", "22", "24", "14", "21", "23"],
        types: [
            { name: "全部", value: "all" },
            { name: "国产剧", value: "13" },
            { name: "欧美剧", value: "16" },
            { name: "韩剧", value: "15" },
            { name: "日剧", value: "22" },
            { name: "泰剧", value: "24" },
            { name: "港剧", value: "14" },
            { name: "台剧", value: "21" },
            { name: "海外剧", value: "23" },
        ],
    },
    "3": {
        name: "动漫",
        allIds: ["29", "30", "31", "32", "33"],
        types: [
            { name: "全部", value: "all" },
            { name: "国产动漫", value: "29" },
            { name: "日韩动漫", value: "30" },
            { name: "欧美动漫", value: "31" },
            { name: "欧美动漫", value: "31" },
            { name: "港台动漫", value: "32" },
            { name: "海外动漫", value: "33" },
        ],
    },
    "4": {
        name: "综艺",
        allIds: ["25", "26", "27", "28"],
        types: [
            { name: "全部", value: "all" },
            { name: "大陆综艺", value: "25" },
            { name: "港台综艺", value: "26" },
            { name: "日韩综艺", value: "27" },
            { name: "欧美综艺", value: "28" },
        ],
    },
    "5": {
        name: "短剧",
        allIds: ["36"],
        types: [],
    },
};

function buildHomeFiltersFromCategoryConfig() {
    const filters = {};
    for (const [typeId, config] of Object.entries(CATEGORY_CONFIG)) {
        const effectiveGroup = getEffectiveCategoryGroup(config);
        const types = Array.isArray(effectiveGroup?.types) ? effectiveGroup.types : [];
        if (types.length === 0) {
            continue;
        }
        const values = types
            .map((item) => {
                if (!item || typeof item !== "object") {
                    return null;
                }
                const name = String(item.name || "").trim();
                const value = String(item.value || "").trim();
                if (!name && !value) {
                    return null;
                }
                return {
                    name: name || value,
                    value: value,
                };
            })
            .filter(Boolean);

        if (values.length > 0) {
            filters[typeId] = [
                {
                    key: "cate",
                    name: "类型",
                    init: "all",
                    value: values,
                },
            ];
        }
    }
    return filters;
}

function parseCategoryFilterParams(params = {}) {
    const result = {};

    if (params.filters && typeof params.filters === "object") {
        Object.assign(result, params.filters);
    } else if (typeof params.filters === "string" && params.filters.trim()) {
        try {
            const parsed = JSON.parse(params.filters);
            if (parsed && typeof parsed === "object") {
                Object.assign(result, parsed);
            }
        } catch (error) {
            OmniBox.log("warn", `解析 filters 参数失败: ${error.message}`);
        }
    }

    if (params.extend) {
        try {
            const decodedStr = Buffer.from(String(params.extend), "base64").toString("utf-8");
            const extObj = JSON.parse(decodedStr);
            if (extObj && typeof extObj === "object") {
                Object.assign(result, extObj);
            }
        } catch (error) {
            OmniBox.log("warn", `解析 extend 参数失败: ${error.message}`);
        }
    }

    return result;
}

// 全局参数
const PAGE_LIMIT = 20; // 每页数量
const PER_TYPE_PAGE = 3; // 合并时每个子分类抓取的页数

// ==================== 配置区域结束 ====================

/**
 * 发送 HTTP 请求到采集站
 * @param {Object} params - 查询参数对象
 * @returns {Promise<Object>} API 响应数据
 */
async function requestSiteAPI(params = {}) {
    if (!SITE_API) {
        throw new Error("请配置采集站 API 地址（SITE_API 环境变量）");
    }
    const url = new URL(SITE_API);
    // 添加全局分页限制
    if (!params.pagesize) {
        params.pagesize = PAGE_LIMIT;
    }
    if (!params.limit) {
        params.limit = PAGE_LIMIT;
    }
    Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== "") {
            url.searchParams.append(key, params[key]);
        }
    });
    OmniBox.log("info", `请求采集站: ${url.toString()}`);
    try {
        const response = await OmniBox.request(url.toString(), {
            method: "GET",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
        });
        if (response.statusCode !== 200) {
            throw new Error(`HTTP ${response.statusCode}: ${response.body}`);
        }
        const data = JSON.parse(response.body);
        return data;
    } catch (error) {
        OmniBox.log("error", `请求采集站失败: ${error.message}`);
        throw error;
    }
}

/**
 * 安全转换为整数
 * @param {*} value - 要转换的值
 * @returns {number} 整数
 */
function toInt(value) {
    if (typeof value === "number") {
        return Math.floor(value);
    }
    if (typeof value === "string") {
        const num = parseInt(value, 10);
        return isNaN(num) ? 0 : num;
    }
    return 0;
}

/**
 * 格式化视频数据
 * @param {Array} list - 原始视频列表
 * @returns {Array} 格式化后的视频列表
 */
function formatVideos(list) {
    if (!Array.isArray(list)) {
        return [];
    }
    return list
        .map((item) => {
            if (typeof item !== "object" || item === null) {
                return null;
            }
            const vodId = String(item.vod_id || item.VodID || "");
            let vodPlayFrom = String(item.vod_play_from || item.VodPlayFrom || "");
            // 处理多线路播放源
            if (vodPlayFrom && vodId && vodPlayFrom.includes("$$$")) {
                const lines = vodPlayFrom.split("$$$");
                const processedLines = lines
                    .map((line) => {
                        const trimmedLine = line.trim();
                        if (trimmedLine) {
                            return `${trimmedLine}-${vodId}`;
                        }
                        return trimmedLine;
                    })
                    .filter((line) => line);
                vodPlayFrom = processedLines.join("$$$");
            } else if (vodPlayFrom && vodId) {
                vodPlayFrom = `${vodPlayFrom}-${vodId}`;
            }
            return {
                vod_id: vodId,
                vod_name: String(item.vod_name || item.VodName || ""),
                vod_pic: String(item.vod_pic || item.VodPic || ""),
                type_id: String(item.type_id || item.TypeID || ""),
                type_name: String(item.type_name || item.TypeName || ""),
                vod_year: String(item.vod_year || item.VodYear || ""),
                vod_remarks: String(item.vod_remarks || item.VodRemarks || ""),
                vod_time: String(item.vod_time || item.VodTime || ""),
                vod_play_from: vodPlayFrom,
                vod_play_url: String(item.vod_play_url || item.VodPlayURL || ""),
                vod_douban_score: String(item.vod_douban_score || item.VodDoubanScore || ""),
            };
        })
        .filter((item) => item !== null && item.vod_id);
}

/**
 * 将旧格式的播放源转换为新格式（vod_play_sources）
 * ... (此处省略 convertToPlaySources, formatDetailVideos, formatClasses, enrichVideosWithDetails 函数，它们与原文件相同) ...
 */
function convertToPlaySources(vodPlayFrom, vodPlayUrl, vodId, detailVodName = "") {
    const playSources = [];
    if (!vodPlayFrom || !vodPlayUrl) {
        return playSources;
    }
    const sourceNames = vodPlayFrom
        .split("$$$")
        .map((name) => name.trim())
        .filter((name) => name);
    const sourceUrls = vodPlayUrl
        .split("$$$")
        .map((url) => url.trim())
        .filter((url) => url);
    const maxLength = Math.max(sourceNames.length, sourceUrls.length);
    for (let i = 0; i < maxLength; i++) {
        const sourceName = sourceNames[i] || `线路${i + 1}`;
        const sourceUrl = sourceUrls[i] || "";
        let cleanSourceName = sourceName;
        if (vodId && sourceName.endsWith(`-${vodId}`)) {
            cleanSourceName = sourceName.substring(0, sourceName.length - `-${vodId}`.length);
        }
        const episodes = [];
        if (sourceUrl) {
            const episodeSegments = sourceUrl
                .split("#")
                .map((seg) => seg.trim())
                .filter((seg) => seg);
            for (let epIndex = 0; epIndex < episodeSegments.length; epIndex++) {
                const segment = episodeSegments[epIndex];
                const parts = segment.split("$");
                const fid = `${vodId}#${i}#${epIndex}`;
                if (parts.length >= 2) {
                    const episodeName = parts[0].trim();
                    const playId = parts.slice(1).join("$").trim();
                    if (episodeName && playId) {
                        episodes.push({
                            name: episodeName,
                            playId: `${playId}|||${encodeMeta({ value: detailVodName, e: episodeName, sid: vodId, fid: fid })}`,
                            _fid: fid,
                            _rawName: episodeName,
                        });
                    }
                } else if (parts.length === 1 && parts[0]) {
                    const episodeName = `第${episodes.length + 1}集`;
                    episodes.push({
                        name: episodeName,
                        playId: `${parts[0].trim()}|||${encodeMeta({ value: detailVodName, e: episodeName, sid: vodId, fid: fid })}`,
                        _fid: fid,
                        _rawName: episodeName,
                    });
                }
            }
        }
        if (episodes.length > 0) {
            playSources.push({
                name: cleanSourceName,
                episodes: episodes,
            });
        }
    }
    return playSources;
}

function formatDetailVideos(list) {
    if (!Array.isArray(list)) {
        return [];
    }
    return list
        .map((item) => {
            if (typeof item !== "object" || item === null) {
                return null;
            }
            const content = String(item.vod_content || item.VodContent || "").trim();
            const vodId = String(item.vod_id || item.VodID || "");
            let vodPlayFrom = String(item.vod_play_from || item.VodPlayFrom || "");
            if (vodPlayFrom && vodId && vodPlayFrom.includes("$$$")) {
                const lines = vodPlayFrom.split("$$$");
                const processedLines = lines
                    .map((line) => {
                        const trimmedLine = line.trim();
                        if (trimmedLine) {
                            return `${trimmedLine}-${vodId}`;
                        }
                        return trimmedLine;
                    })
                    .filter((line) => line);
                vodPlayFrom = processedLines.join("$$$");
            } else if (vodPlayFrom && vodId) {
                vodPlayFrom = `${vodPlayFrom}-${vodId}`;
            }
            const vodPlayUrl = String(item.vod_play_url || item.VodPlayURL || "");
            const detailVodName = String(item.vod_name || item.VodName || "");
            const vodPlaySources = convertToPlaySources(vodPlayFrom, vodPlayUrl, vodId, detailVodName);
            return {
                vod_id: vodId,
                vod_name: detailVodName,
                vod_pic: String(item.vod_pic || item.VodPic || ""),
                type_name: String(item.type_name || item.TypeName || ""),
                vod_year: String(item.vod_year || item.VodYear || ""),
                vod_area: String(item.vod_area || item.VodArea || ""),
                vod_remarks: String(item.vod_remarks || item.VodRemarks || ""),
                vod_actor: String(item.vod_actor || item.VodActor || ""),
                vod_director: String(item.vod_director || item.VodDirector || ""),
                vod_content: content,
                vod_play_sources: vodPlaySources.length > 0 ? vodPlaySources : undefined,
                vod_douban_score: String(item.vod_douban_score || item.VodDoubanScore || ""),
            };
        })
        .filter((item) => item !== null && item.vod_id);
}

function encodeMeta(obj) {
    try {
        return Buffer.from(JSON.stringify(obj || {}), "utf8").toString("base64");
    } catch (error) {
        return "";
    }
}

function decodeMeta(str) {
    try {
        const raw = Buffer.from(str || "", "base64").toString("utf8");
        return JSON.parse(raw || "{}");
    } catch (error) {
        return {};
    }
}

function preprocessTitle(title) {
    if (!title) return "";
    return String(title)
        .replace(/4[kK]|[xX]26[45]|720[pP]|1080[pP]|2160[pP]/g, " ")
        .replace(/[hH]\\.?26[45]/g, " ")
        .replace(/BluRay|WEB-DL|HDR|REMUX/gi, " ")
        .replace(/\.mp4|\.mkv|\.avi|\.flv/gi, " ")
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
    const processedTitle = preprocessTitle(title);

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
        const hit = scrapeData.episodes.find((ep) => ep.episodeNumber === mapping.episodeNumber && ep.seasonNumber === mapping.seasonNumber);
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

function formatClasses(classes) {
    if (!Array.isArray(classes)) {
        return [];
    }
    const seen = new Set();
    const result = [];
    for (const cls of classes) {
        if (typeof cls !== "object" || cls === null) {
            continue;
        }
        const typeId = String(cls.type_id || cls.TypeID || "");
        const typePid = String(cls.type_pid || cls.TypePID || "");
        const typeName = String(cls.type_name || cls.TypeName || "").trim();
        if (!typeId || seen.has(typeId)) {
            continue;
        }
        seen.add(typeId);
        result.push({
            type_id: typeId,
            type_pid: typePid,
            type_name: typeName,
        });
    }
    return result;
}

async function enrichVideosWithDetails(videos) {
    if (!Array.isArray(videos) || videos.length === 0) {
        return videos;
    }
    const videoIDs = [];
    const videoMap = new Map();
    for (const video of videos) {
        if (!video.vod_pic || video.vod_pic === "<nil>" || !video.vod_year || video.vod_year === "<nil>" || !video.vod_douban_score || video.vod_douban_score === "<nil>") {
            videoIDs.push(video.vod_id);
            videoMap.set(video.vod_id, video);
        }
    }
    if (videoIDs.length === 0) {
        return videos;
    }
    const batchSize = 20;
    for (let i = 0; i < videoIDs.length; i += batchSize) {
        const end = Math.min(i + batchSize, videoIDs.length);
        const batchIDs = videoIDs.slice(i, end);
        try {
            const response = await requestSiteAPI({
                ac: "detail",
                ids: batchIDs.join(","),
            });
            if (Array.isArray(response.list)) {
                for (const item of response.list) {
                    if (typeof item !== "object" || item === null) {
                        continue;
                    }
                    const vodId = String(item.vod_id || item.VodID || "");
                    const originalVod = videoMap.get(vodId);
                    if (originalVod) {
                        const pic = String(item.vod_pic || item.VodPic || "");
                        if (pic && pic !== "<nil>") {
                            originalVod.vod_pic = pic;
                        }
                        const year = String(item.vod_year || item.VodYear || "");
                        if (year && year !== "<nil>") {
                            originalVod.vod_year = year;
                        }
                        const score = String(item.vod_douban_score || item.VodDoubanScore || "");
                        if (score && score !== "<nil>") {
                            originalVod.vod_douban_score = score;
                        }
                        const en = String(item.vod_en || item.VodEn || "");
                        if (en && en !== "<nil>") {
                            originalVod.vod_en = en;
                        }
                        const time = String(item.vod_time || item.VodTime || "");
                        if (time && time !== "<nil>") {
                            originalVod.vod_time = time;
                        }
                        const playFrom = String(item.vod_play_from || item.VodPlayFrom || "");
                        if (playFrom && playFrom !== "<nil>") {
                            originalVod.vod_play_from = playFrom;
                        }
                    }
                }
            }
        } catch (error) {
            OmniBox.log("warn", `批量获取详情失败: ${error.message}`);
        }
    }
    return videos;
}

// ==================== 新增：合并分页与数据处理函数 ====================
/**
 * 获取单个子分类的多页数据
 * @param {string} typeId - 子分类ID
 * @param {number} maxPage - 最大页数
 * @returns {Promise<Array>} 视频列表
 */
async function fetchTypePages(typeId, maxPage) {
    const tasks = [];
    for (let pg = 1; pg <= maxPage; pg++) {
        tasks.push(
            requestSiteAPI({
                ac: "videolist",
                t: typeId,
                pg: String(pg),
            })
                .then((r) => r.list || [])
                .catch(() => [])
        );
    }
    return (await Promise.all(tasks)).flat();
}

/**
 * 获取并合并一个顶层分类下的所有子分类数据
 * @param {Object} group - 分类配置对象
 * @param {number} page - 请求的页码
 * @returns {Promise<Object>} 格式化的响应对象
 */
async function fetchAllMerged(group, page) {
    // 并行获取所有子分类的数据
    const raw = (
        await Promise.all(
            group.allIds.map((id) => fetchTypePages(id, PER_TYPE_PAGE))
        )
    ).flat();

    // 屏蔽不需要的分类
    const filtered = raw.filter(
        (item) =>
            item &&
            !shouldExcludeClassName(item.type_name)
    );

    // 按时间倒序排序
    filtered.sort((a, b) => {
        const timeA = new Date(a.vod_time || a.vod_addtime || a.vod_pubdate || "").getTime();
        const timeB = new Date(b.vod_time || b.vod_addtime || b.vod_pubdate || "").getTime();
        return isNaN(timeB) ? -1 : isNaN(timeA) ? 1 : timeB - timeA;
    });

    // 分页切片
    const startIndex = (page - 1) * PAGE_LIMIT;
    const endIndex = page * PAGE_LIMIT;
    const slice = filtered.slice(startIndex, endIndex);

    // 格式化返回
    const formattedList = formatVideos(slice);
    const total = filtered.length;
    const pagecount = Math.ceil(total / PAGE_LIMIT);

    return {
        page: page,
        pagecount: pagecount,
        total: total,
        list: formattedList,
    };
}

// ==================== 重写 home 和 category 函数 ====================
/**
 * 获取首页数据 (重写)
 * 现在返回自定义的分类列表，并且首页视频列表留空或按需实现
 * @param {Object} params - 参数对象
 * @returns {Object} 返回分类列表
 */
async function home(params) {
    try {
        OmniBox.log("info", "获取首页数据 (使用自定义分类)");
        // 构建自定义分类
        const classes = Object.entries(CATEGORY_CONFIG).map(([type_id, config]) => ({
            type_id: type_id,
            type_name: config.name,
        }));

        const response = await requestSiteAPI({
            ac: "videolist",
            pg: "1",
            pagesize: 100,
            limit: 100,
        });
        const videos = formatVideos(response.list || []);
        const filters = buildHomeFiltersFromCategoryConfig();
        return {
            class: classes,
            list: videos,
            filters: filters,
        };
    } catch (error) {
        OmniBox.log("error", `获取首页数据失败: ${error.message}`);
        return { class: [], list: [], filters: {} };
    }
}

/**
 * 获取分类数据 (重写)
 * 支持自定义分类、筛选和数据合并
 * @param {Object} params - 参数对象
 * - categoryId: 顶层分类ID（必填）
 * - page: 页码（必填，默认1）
 * - extend: 筛选项（JSON字符串，Base64编码）
 * @returns {Object} 返回视频列表
 */
async function category(params) {
    try {
        const categoryId = params.categoryId;
        const page = toInt(params.page) || 1;

        if (!categoryId) {
            throw new Error("分类ID不能为空");
        }

        const group = CATEGORY_CONFIG[categoryId];
        if (!group) {
            // 如果不是自定义分类，回退到原始逻辑
            OmniBox.log("info", `分类 ${categoryId} 未在自定义配置中，使用原始API`);
            const response = await requestSiteAPI({
                ac: "videolist",
                t: categoryId,
                pg: String(page),
            });
            const videos = formatVideos(response.list || []);
            return {
                page: toInt(response.page),
                pagecount: toInt(response.pagecount),
                total: toInt(response.total),
                list: videos,
            };
        }

        const effectiveGroup = getEffectiveCategoryGroup(group);

        OmniBox.log("info", `获取自定义分类数据: categoryId=${categoryId}, page=${page}`);

        const extObj = parseCategoryFilterParams(params);
        const selectedSubType = String(extObj.cate || extObj.class || "").trim();
        if (selectedSubType && selectedSubType !== "all" && effectiveGroup.allIds.includes(selectedSubType)) {
            // 如果有子分类筛选，直接请求该子分类
            const response = await requestSiteAPI({
                ac: "videolist",
                t: selectedSubType,
                pg: String(page),
            });
            const videos = formatVideos(response.list || []);
            return {
                page: toInt(response.page),
                pagecount: toInt(response.pagecount),
                total: toInt(response.total),
                list: videos,
            };
        } else {
            // 否则，合并所有子分类数据
            return await fetchAllMerged(effectiveGroup, page);
        }
    } catch (error) {
        OmniBox.log("error", `获取分类数据失败: ${error.message}`);
        return { page: 1, pagecount: 0, total: 0, list: [] };
    }
}

// 导出接口（用于模块化引用）
module.exports = {
    home,
    category,
    search,
    detail,
    play,
};

// 使用公共 runner 处理标准输入/输出
const runner = require("spider_runner");
runner.run(module.exports);

// ==================== 保留原有的其他函数 ====================
/**
 * 获取视频详情
 * ... (search, detail, play, matchDanmu, inferFileNameFromURL, extractDigits, extractVideoIdFromFlag 函数保持不变) ...
 */
async function detail(params) {
    try {
        const videoId = params.videoId;
        if (!videoId) {
            throw new Error("视频ID不能为空");
        }
        OmniBox.log("info", `获取视频详情: videoId=${videoId}`);
        const response = await requestSiteAPI({ ac: "detail", ids: videoId });
        const videos = formatDetailVideos(response.list || []);

        for (const vod of videos) {
            const sourceCandidates = [];
            const playSources = Array.isArray(vod.vod_play_sources) ? vod.vod_play_sources : [];
            for (const source of playSources) {
                for (const ep of source.episodes || []) {
                    const meta = ep.playId && ep.playId.includes("|||") ? decodeMeta(ep.playId.split("|||")[1]) : {};
                    const fid = ep._fid || meta.fid;
                    const rawName = ep._rawName || ep.name || "正片";
                    if (!fid) continue;
                    sourceCandidates.push({
                        fid: fid,
                        file_id: fid,
                        file_name: rawName,
                        name: rawName,
                        format_type: "video",
                    });
                }
            }

            if (sourceCandidates.length > 0) {
                try {
                    const videoIdForScrape = String(vod.vod_id || videoId);
                    const scrapingResult = await OmniBox.processScraping(videoIdForScrape, vod.vod_name || "", vod.vod_name || "", sourceCandidates);
                    OmniBox.log("info", `刮削处理完成,结果: ${JSON.stringify(scrapingResult || {}).substring(0, 200)}`);

                    const metadata = await OmniBox.getScrapeMetadata(videoIdForScrape);
                    const scrapeData = metadata?.scrapeData || null;
                    const videoMappings = metadata?.videoMappings || [];

                    if (scrapeData) {
                        vod.vod_name = scrapeData.title || vod.vod_name;
                        if (scrapeData.posterPath) {
                            vod.vod_pic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
                        }
                        if (scrapeData.releaseDate) {
                            vod.vod_year = String(scrapeData.releaseDate).substring(0, 4) || vod.vod_year;
                        }
                        if (scrapeData.overview) {
                            vod.vod_content = scrapeData.overview;
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

                    for (const source of playSources) {
                        for (const ep of source.episodes || []) {
                            const meta = ep.playId && ep.playId.includes("|||") ? decodeMeta(ep.playId.split("|||")[1]) : {};
                            const fid = ep._fid || meta.fid;
                            const mapping = videoMappings.find((m) => m?.fileId === fid);
                            if (!mapping) continue;
                            const oldName = ep.name;
                            const newName = buildScrapedEpisodeName(scrapeData, mapping, oldName);
                            if (newName && newName !== oldName) {
                                ep.name = newName;
                                OmniBox.log("info", `应用刮削后源文件名: ${oldName} -> ${newName}`);
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

                    // 清理内部字段
                    for (const source of playSources) {
                        source.episodes = (source.episodes || []).map((ep) => ({
                            name: ep.name,
                            playId: ep.playId,
                        }));
                    }
                    vod.vod_play_sources = playSources;
                } catch (error) {
                    OmniBox.log("warn", `刮削处理失败: ${error.message}`);
                }
            }
        }

        return { list: videos };
    } catch (error) {
        OmniBox.log("error", `获取视频详情失败: ${error.message}`);
        return { list: [] };
    }
}

async function search(params) {
    try {
        const keyword = params.keyword || params.wd || "";
        const page = params.page || 1;
        if (!keyword) {
            return { page: 1, pagecount: 0, total: 0, list: [] };
        }
        OmniBox.log("info", `搜索视频: keyword=${keyword}, page=${page}`);
        const response = await requestSiteAPI({ ac: "list", wd: keyword, pg: String(page) });
        let videos = formatVideos(response.list || []);
        if (videos.length > 0 && (!videos[0].vod_pic || videos[0].vod_pic === "")) {
            try {
                const videoIDs = videos.map((v) => v.vod_id);
                const detailResponse = await requestSiteAPI({ ac: "detail", ids: videoIDs.join(",") });
                videos = formatVideos(detailResponse.list || []);
            } catch (error) {
                OmniBox.log("warn", `获取搜索结果详情失败: ${error.message}`);
            }
        }
        return {
            page: toInt(response.page),
            pagecount: toInt(response.pagecount),
            total: toInt(response.total),
            list: videos,
        };
    } catch (error) {
        OmniBox.log("error", `搜索视频失败: ${error.message}`);
        return { page: 1, pagecount: 0, total: 0, list: [] };
    }
}

async function matchDanmu(fileName) {
    if (!DANMU_API || !fileName) {
        return [];
    }
    try {
        OmniBox.log("info", `匹配弹幕: fileName=${fileName}`);
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
            OmniBox.log("warn", `弹幕匹配失败: HTTP ${response.statusCode}`);
            return [];
        }
        const matchData = JSON.parse(response.body);
        if (!matchData.isMatched) {
            OmniBox.log("info", "弹幕未匹配到");
            return [];
        }
        const matches = matchData.matches || [];
        if (matches.length === 0) {
            return [];
        }
        const firstMatch = matches[0];
        const episodeId = firstMatch.episodeId;
        const animeTitle = firstMatch.animeTitle || "";
        const episodeTitle = firstMatch.episodeTitle || "";
        if (!episodeId) {
            return [];
        }
        let danmakuName = "弹幕";
        if (animeTitle && episodeTitle) {
            danmakuName = `${animeTitle} - ${episodeTitle}`;
        } else if (animeTitle) {
            danmakuName = animeTitle;
        } else if (episodeTitle) {
            danmakuName = episodeTitle;
        }
        const danmakuURL = `${DANMU_API}/api/v2/comment/${episodeId}?format=xml`;
        OmniBox.log("info", `弹幕匹配成功: ${danmakuName} (episodeId: ${episodeId})`);
        return [{ name: danmakuName, url: danmakuURL }];
    } catch (error) {
        OmniBox.log("warn", `弹幕匹配失败: ${error.message}`);
        return [];
    }
}

function inferFileNameFromURL(url) {
    try {
        const urlObj = new URL(url);
        let base = urlObj.pathname.split("/").pop() || "";
        const dotIndex = base.lastIndexOf(".");
        if (dotIndex > 0) {
            base = base.substring(0, dotIndex);
        }
        base = base.replace(/[_-]/g, " ").replace(/\./g, " ").trim();
        return base || url;
    } catch (error) {
        return url;
    }
}

function extractDigits(str) {
    if (typeof str !== "string") {
        return "";
    }
    return str.replace(/\D/g, "");
}

function extractVideoIdFromFlag(flag) {
    if (!flag) {
        return "";
    }
    if (flag.includes("-")) {
        const parts = flag.split("-");
        const videoId = parts[parts.length - 1];
        if (/^\d+$/.test(videoId)) {
            return videoId;
        }
    }
    if (/^\d+$/.test(flag)) {
        return flag;
    }
    return "";
}

async function play(params) {
    try {
        const rawPlayId = params.playId;
        const flag = params.flag || "";
        if (!rawPlayId) {
            throw new Error("播放地址ID不能为空");
        }
        let playId = rawPlayId;
        let vodName = "";
        let episodeName = "";
        if (rawPlayId.includes("|||")) {
            const [mainPlayId, metaB64] = rawPlayId.split("|||");
            playId = mainPlayId;
            const meta = decodeMeta(metaB64 || "");
            vodName = meta.v || "";
            episodeName = meta.e || "";
        }
        const videoId = extractVideoIdFromFlag(flag);
        OmniBox.log("info", `获取播放地址: playId=${playId}, flag=${flag}, videoId=${videoId}`);

        let scrapedDanmuFileName = "";
        try {
            const sourceVideoId = params.vodId || videoId || (rawPlayId.includes("|||") ? (decodeMeta(rawPlayId.split("|||")[1] || "").sid || "") : "");
            if (sourceVideoId) {
                const metadata = await OmniBox.getScrapeMetadata(String(sourceVideoId));
                if (metadata && metadata.scrapeData) {
                    const meta = rawPlayId.includes("|||") ? decodeMeta(rawPlayId.split("|||")[1] || "") : {};
                    const mapping = (metadata.videoMappings || []).find((m) => m?.fileId === meta.fid);
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
            OmniBox.log("warn", `读取刮削元数据失败: ${error.message}`);
        }

        // 参考两个BT，增加播放地址嗅探逻辑：
        // 1) 直链资源直接播放
        // 2) 非直链尝试 OmniBox.sniffVideo 嗅探真实媒体地址
        let resolvedUrl = playId;
        let resolvedHeader = {};
        let parse = 1;

        const isDirectPlayable = /\.(m3u8|mp4|flv|avi|mkv|ts)(?:\?|#|$)/i.test(playId || "");
        if (isDirectPlayable) {
            parse = 0;
        } else if (/^https?:\/\//i.test(playId || "")) {
            try {
                const sniffResult = await OmniBox.sniffVideo(playId);
                if (sniffResult && sniffResult.url) {
                    resolvedUrl = sniffResult.url;
                    resolvedHeader = sniffResult.header || {};
                    parse = 0;
                    OmniBox.log("info", `嗅探成功: ${resolvedUrl}`);
                }
            } catch (sniffError) {
                OmniBox.log("warn", `嗅探失败，回退原始地址: ${sniffError.message}`);
            }
        }

        let urlsResult = [{ name: "播放", url: resolvedUrl }];
        let playResponse = { urls: urlsResult, header: resolvedHeader, parse: parse };
        if (DANMU_API) {
            let fileName = "";
            if (vodName) {
                fileName = scrapedDanmuFileName || buildFileNameForDanmu(vodName, episodeName);
            } else if (videoId) {
                try {
                    const detailResponse = await requestSiteAPI({ ac: "detail", ids: videoId });
                    if (detailResponse.list && detailResponse.list.length > 0) {
                        const video = detailResponse.list[0];
                        const videoName = video.vod_name || video.VodName || "";
                        const playURL = video.vod_play_url || video.VodPlayURL || "";
                        if (videoName && playURL) {
                            const segments = playURL.split("#").filter((s) => s.trim());
                            if (segments.length === 1) {
                                fileName = videoName;
                            } else {
                                let epNum = 0;
                                for (let idx = 0; idx < segments.length; idx++) {
                                    const seg = segments[idx];
                                    const parts = seg.split("$");
                                    if (parts.length >= 2) {
                                        const epLabel = parts[0].trim();
                                        const epURL = parts[1].trim();
                                        if (epURL === playId || epURL.includes(playId) || playId.includes(epURL)) {
                                            const digits = extractEpisode(epLabel);
                                            if (digits) {
                                                epNum = parseInt(digits, 10);
                                            } else {
                                                epNum = idx + 1;
                                            }
                                            break;
                                        }
                                    }
                                }
                                if (epNum > 0) {
                                    fileName = epNum < 10 ? `${videoName} S01E0${epNum}` : `${videoName} S01E${epNum}`;
                                } else {
                                    fileName = videoName;
                                }
                            }
                        }
                    }
                } catch (error) {
                    OmniBox.log("warn", `获取详情失败，无法推断集数: ${error.message}`);
                }
            }
            if (!fileName) {
                fileName = inferFileNameFromURL(playId);
            }
            if (fileName) {
                const danmakuList = await matchDanmu(fileName);
                if (danmakuList.length > 0) {
                    playResponse.danmaku = danmakuList;
                }
            }
        }
        return playResponse;
    } catch (error) {
        OmniBox.log("error", `获取播放地址失败: ${error.message}`);
        return { urls: [], header: {} };
    }
}

});
