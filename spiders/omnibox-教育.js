// @name 教育(合并)
// @version 2.20261030.1
// @description 合并可用教育源：1-9年级/高中课程 + 幼儿早教
// @downloadURL https://gh-proxy.com/https://raw.githubusercontent.com/Metruee/tv4me/main/spiders/omnibox-教育.js
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


_load(0, "哔哩教育", function (module, exports, require) {
// @name 哔哩教育
// @author 
// @description 刮削：不支持，弹幕：支持，嗅探：不支持，登录：支持
// @dependencies: axios, crypto
// @version 1.1.1
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/教育/哔哩教育.js

const axios = require("axios");
const crypto = require("crypto");
const OmniBox = require("omnibox_sdk");

// ==================== 配置区域 ====================
const BILI_COOKIE = process.env.BILI_COOKIE || "";

const BILI_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: "https://www.bilibili.com",
  ...(BILI_COOKIE ? { Cookie: BILI_COOKIE } : {}),
};

const isLoggedIn = () => Boolean(BILI_COOKIE && BILI_COOKIE.includes("SESSDATA="));

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 17, 6, 28,
];

function getMixinKey(raw) {
  return MIXIN_KEY_ENC_TAB.map((n) => raw[n]).join("").substring(0, 32);
}

let _wbiKeysCache = null;
let _searchHeadersCache = null;

function generateBuvid3() {
  const now = Date.now();
  const rand = Math.random().toString(16).substring(2, 10);
  const ts = now.toString(16);
  return `${ts}${rand}`;
}

function generateBuvid4() {
  const now = Date.now();
  const rand = Math.random().toString(16).substring(2, 14);
  const ts = now.toString(16);
  return `X${ts}${rand}`;
}

async function initSearchHeaders() {
  if (_searchHeadersCache) return _searchHeadersCache;
  let cookie = BILI_COOKIE || "";
  if (!cookie.includes("buvid3")) {
    cookie += `${cookie ? "; " : ""}buvid3=${generateBuvid3()}`;
  }
  if (!cookie.includes("buvid4")) {
    cookie += `; buvid4=${generateBuvid4()}`;
  }
  _searchHeadersCache = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Referer: "https://search.bilibili.com/all?keyword=1",
    Origin: "https://search.bilibili.com",
    Cookie: cookie,
  };
  return _searchHeadersCache;
}

async function getWbiKeys() {
  if (_wbiKeysCache) return _wbiKeysCache;
  try {
    const navHeaders = await initSearchHeaders();
    const { data } = await axios.get("https://api.bilibili.com/x/web-interface/nav", {
      headers: navHeaders,
    });
    const { wbi_img: { img_url, sub_url } = {} } = data?.data || {};
    const imgKey = (img_url || "").split("/").pop().split(".")[0] || "";
    const subKey = (sub_url || "").split("/").pop().split(".")[0] || "";
    logInfo(`获取WbiKeys imgKey: ${imgKey}, subKey: ${subKey}`);
    _wbiKeysCache = { imgKey, subKey };
    return _wbiKeysCache;
  } catch (err) {
    logError("获取WbiKeys失败", err);
    return { imgKey: "", subKey: "" };
  }
}

async function signWbiParams(params) {
  const { imgKey, subKey } = await getWbiKeys();
  const mixinKey = getMixinKey(imgKey + subKey);
  const wts = Math.floor(Date.now() / 1000);
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((obj, key) => {
      if (params[key] !== undefined && params[key] !== null) {
        obj[key] = params[key];
      }
      return obj;
    }, {});
  sortedParams.wts = wts;
  const query = Object.entries(sortedParams)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  const w_rid = crypto.createHash("md5").update(query + mixinKey).digest("hex");
  return { ...sortedParams, w_rid };
}

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdata(value) {
  return `<![CDATA[${String(value ?? "").replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`;
}

function dashBaseUrl(item) {
  return item?.base_url || item?.baseUrl || "";
}

function selectBestDashVideo(videos = []) {
  let targetVideos = videos.filter((v) => v.codecid === 7 || (v.codecs && v.codecs.startsWith("avc")));
  if (targetVideos.length === 0) targetVideos = videos;

  return [...targetVideos].sort((a, b) => {
    if ((b.id || 0) !== (a.id || 0)) return (b.id || 0) - (a.id || 0);
    if ((b.bandwidth || 0) !== (a.bandwidth || 0)) return (b.bandwidth || 0) - (a.bandwidth || 0);
    return (b.width || 0) - (a.width || 0);
  })[0];
}

function buildMpd(dash) {
  const duration = Number(dash?.duration || 0);
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" profiles="urn:mpeg:dash:profile:isoff-on-demand:2011" type="static" minBufferTime="PT1.5S" mediaPresentationDuration="PT${xmlEscape(duration)}S">`,
    "  <Period>",
  ];

  const bestVideo = selectBestDashVideo(dash?.video || []);
  const videos = bestVideo ? [bestVideo] : [];
  if (videos.length) {
    lines.push('    <AdaptationSet mimeType="video/mp4" contentType="video" subsegmentAlignment="true" subsegmentStartsWithSAP="1">');
    for (const video of videos) {
      lines.push(
        `      <Representation id="${xmlEscape(video.id)}" codecs="${xmlEscape(video.codecs || "avc1.64001E")}" bandwidth="${xmlEscape(video.bandwidth || 0)}" width="${xmlEscape(video.width || 0)}" height="${xmlEscape(video.height || 0)}" frameRate="${xmlEscape(video.frame_rate || "")}">`,
      );
      lines.push(`        <BaseURL>${cdata(dashBaseUrl(video))}</BaseURL>`);
      if (video.SegmentBase?.Initialization) {
        lines.push(`        <SegmentBase indexRange="${xmlEscape(video.SegmentBase.indexRange || "")}">`);
        lines.push(`          <Initialization range="${xmlEscape(video.SegmentBase.Initialization)}"/>`);
        lines.push("        </SegmentBase>");
      }
      lines.push("      </Representation>");
    }
    lines.push("    </AdaptationSet>");
  }

  const audios = Array.isArray(dash?.audio) ? dash.audio : [];
  if (audios.length) {
    lines.push('    <AdaptationSet mimeType="audio/mp4" contentType="audio" subsegmentAlignment="true" subsegmentStartsWithSAP="1">');
    for (const audio of audios) {
      lines.push(
        `      <Representation id="${xmlEscape(audio.id)}" codecs="${xmlEscape(audio.codecs || "mp4a.40.2")}" bandwidth="${xmlEscape(audio.bandwidth || 0)}">`,
      );
      lines.push(`        <BaseURL>${cdata(dashBaseUrl(audio))}</BaseURL>`);
      if (audio.SegmentBase?.Initialization) {
        lines.push(`        <SegmentBase indexRange="${xmlEscape(audio.SegmentBase.indexRange || "")}">`);
        lines.push(`          <Initialization range="${xmlEscape(audio.SegmentBase.Initialization)}"/>`);
        lines.push("        </SegmentBase>");
      }
      lines.push("      </Representation>");
    }
    lines.push("    </AdaptationSet>");
  }

  lines.push("  </Period>");
  lines.push("</MPD>");
  return lines.join("\n");
}

function getRuntimeContext(params = {}, context = {}) {
  return context && Object.keys(context).length ? context : params?.context || {};
}

function buildDashProxyUrl(params = {}, context = {}, avid, cid) {
  const ids = `${avid}_${cid}`;
  const runtimeContext = getRuntimeContext(params, context);
  const baseURL = String(runtimeContext?.baseURL || params?.baseURL || "").replace(/\/+$/, "");
  const sourceId = String(runtimeContext?.sourceId || params?.sourceId || "");
  const template = process.env.BILI_DASH_PROXY_URL || "";

  if (template) {
    return template
      .replaceAll("{baseURL}", baseURL)
      .replaceAll("{sourceId}", encodeURIComponent(sourceId))
      .replaceAll("{ids}", encodeURIComponent(ids))
      .replaceAll("{avid}", encodeURIComponent(avid))
      .replaceAll("{cid}", encodeURIComponent(cid))
      .replaceAll("{qn}", "127")
      .replaceAll("{fnval}", "4048")
      .replaceAll("{fourk}", "1");
  }

  return "";
}

function buildDashDataUrl(dash) {
  const mpd = buildMpd(dash);
  return `data:application/dash+xml;base64,${Buffer.from(mpd, "utf8").toString("base64")}`;
}

// ==================== 教育分类 ====================
const CLASSES = [
  { type_id: "1年级语文", type_name: "1年级语文" },
  { type_id: "1年级数学", type_name: "1年级数学" },
  { type_id: "1年级英语", type_name: "1年级英语" },
  { type_id: "2年级语文", type_name: "2年级语文" },
  { type_id: "2年级数学", type_name: "2年级数学" },
  { type_id: "2年级英语", type_name: "2年级英语" },
  { type_id: "3年级语文", type_name: "3年级语文" },
  { type_id: "3年级数学", type_name: "3年级数学" },
  { type_id: "3年级英语", type_name: "3年级英语" },
  { type_id: "4年级语文", type_name: "4年级语文" },
  { type_id: "4年级数学", type_name: "4年级数学" },
  { type_id: "4年级英语", type_name: "4年级英语" },
  { type_id: "5年级语文", type_name: "5年级语文" },
  { type_id: "5年级数学", type_name: "5年级数学" },
  { type_id: "5年级英语", type_name: "5年级英语" },
  { type_id: "6年级语文", type_name: "6年级语文" },
  { type_id: "6年级数学", type_name: "6年级数学" },
  { type_id: "6年级英语", type_name: "6年级英语" },
  { type_id: "7年级语文", type_name: "7年级语文" },
  { type_id: "7年级数学", type_name: "7年级数学" },
  { type_id: "7年级英语", type_name: "7年级英语" },
  { type_id: "7年级历史", type_name: "7年级历史" },
  { type_id: "7年级地理", type_name: "7年级地理" },
  { type_id: "7年级生物", type_name: "7年级生物" },
  { type_id: "7年级物理", type_name: "7年级物理" },
  { type_id: "7年级化学", type_name: "7年级化学" },
  { type_id: "8年级语文", type_name: "8年级语文" },
  { type_id: "8年级数学", type_name: "8年级数学" },
  { type_id: "8年级英语", type_name: "8年级英语" },
  { type_id: "8年级历史", type_name: "8年级历史" },
  { type_id: "8年级地理", type_name: "8年级地理" },
  { type_id: "8年级生物", type_name: "8年级生物" },
  { type_id: "8年级物理", type_name: "8年级物理" },
  { type_id: "8年级化学", type_name: "8年级化学" },
  { type_id: "9年级语文", type_name: "9年级语文" },
  { type_id: "9年级数学", type_name: "9年级数学" },
  { type_id: "9年级英语", type_name: "9年级英语" },
  { type_id: "9年级历史", type_name: "9年级历史" },
  { type_id: "9年级地理", type_name: "9年级地理" },
  { type_id: "9年级生物", type_name: "9年级生物" },
  { type_id: "9年级物理", type_name: "9年级物理" },
  { type_id: "9年级化学", type_name: "9年级化学" },
  { type_id: "高一语文", type_name: "高一语文" },
  { type_id: "高一数学", type_name: "高一数学" },
  { type_id: "高一英语", type_name: "高一英语" },
  { type_id: "高一历史", type_name: "高一历史" },
  { type_id: "高一地理", type_name: "高一地理" },
  { type_id: "高一生物", type_name: "高一生物" },
  { type_id: "高一思想政治", type_name: "高一思想政治" },
  { type_id: "高一物理", type_name: "高一物理" },
  { type_id: "高一化学", type_name: "高一化学" },
  { type_id: "高二语文", type_name: "高二语文" },
  { type_id: "高二数学", type_name: "高二数学" },
  { type_id: "高二英语", type_name: "高二英语" },
  { type_id: "高二历史", type_name: "高二历史" },
  { type_id: "高二地理", type_name: "高二地理" },
  { type_id: "高二生物", type_name: "高二生物" },
  { type_id: "高二思想政治", type_name: "高二思想政治" },
  { type_id: "高二物理", type_name: "高二物理" },
  { type_id: "高二化学", type_name: "高二化学" },
  { type_id: "高三语文", type_name: "高三语文" },
  { type_id: "高三数学", type_name: "高三数学" },
  { type_id: "高三英语", type_name: "高三英语" },
  { type_id: "高三历史", type_name: "高三历史" },
  { type_id: "高三地理", type_name: "高三地理" },
  { type_id: "高三生物", type_name: "高三生物" },
  { type_id: "高三思想政治", type_name: "高三思想政治" },
  { type_id: "高三物理", type_name: "高三物理" },
  { type_id: "高三化学", type_name: "高三化学" },
  { type_id: "奥数", type_name: "奥数" },
  { type_id: "奥林匹克物理", type_name: "奥物" },
  { type_id: "奥林匹克化学", type_name: "奥化" },
  { type_id: "高中信息技术", type_name: "高中信息技术" },
];

const QUALITY_NAME_MAP = {
  127: "8K 超高清",
  126: "杜比视界",
  125: "HDR 真彩色",
  120: "4K 超清",
  116: "1080P60 高帧率",
  112: "1080P+ 高码率",
  80: "1080P 高清",
  74: "720P60 高帧率",
  64: "720P 高清",
  32: "480P 清晰",
  16: "360P 流畅",
};

function logInfo(msg) {
  OmniBox.log("info", `[BILI-EDU] ${msg}`);
}

function logError(msg, err) {
  OmniBox.log("error", `[BILI-EDU] ${msg}: ${err?.message || err}`);
}

function fixCover(url) {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}

function formatDuration(seconds) {
  const sec = parseInt(seconds, 10) || 0;
  if (sec <= 0) return "00:00";
  const minutes = Math.floor(sec / 60);
  const secs = sec % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatSearchDuration(duration) {
  if (!duration || typeof duration !== "string") return "00:00";
  const parts = duration.split(":");
  return parts.length === 2 ? duration : "00:00";
}

async function home(params) {
  try {
    const searchHeaders = await initSearchHeaders();
    const rawParams = { search_type: "video", keyword: "启蒙", page: 1 };
    const signedParams = await signWbiParams(rawParams);
    const { data } = await axios.get("https://api.bilibili.com/x/web-interface/search/type", {
      headers: searchHeaders,
      params: signedParams,
    });

    const list = (data?.data?.result || [])
      .filter((item) => item.type === "video")
      .map((item) => ({
        vod_id: String(item.aid || ""),
        vod_name: String(item.title || "").replace(/<[^>]*>/g, ""),
        vod_pic: fixCover(item.pic),
        vod_remarks: formatSearchDuration(item.duration),
      }));

    return {
      class: CLASSES,
      list,
    };
  } catch (error) {
    logError("首页获取失败", error);
    return { class: CLASSES, list: [] };
  }
}

async function category(params) {
  const keyword = params.categoryId || "";
  const page = Math.max(1, parseInt(params.page, 10) || 1);
  if (!keyword) {
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }

  try {
    const rawParams = { search_type: "video", keyword, page };
    const signedParams = await signWbiParams(rawParams);
    const searchHeaders = await initSearchHeaders();
    const { data } = await axios.get("https://api.bilibili.com/x/web-interface/search/type", {
      headers: searchHeaders,
      params: signedParams,
    });

    const list = (data?.data?.result || [])
      .filter((item) => item.type === "video")
      .map((item) => ({
        vod_id: String(item.aid || ""),
        vod_name: String(item.title || "").replace(/<[^>]*>/g, ""),
        vod_pic: fixCover(item.pic),
        vod_remarks: formatSearchDuration(item.duration),
      }));

    return {
      page,
      pagecount: data?.data?.numPages || 1,
      total: data?.data?.numResults || list.length,
      list,
    };
  } catch (error) {
    logError("分类获取失败", error);
    return { page, pagecount: 0, total: 0, list: [] };
  }
}

async function search(params) {
  return category({
    categoryId: params.keyword || params.wd || "",
    page: params.page,
  });
}

async function detail(params) {
  const videoId = params.videoId;
  if (!videoId) return { list: [] };

  try {
    const { data } = await axios.get(`https://api.bilibili.com/x/web-interface/view?aid=${videoId}`, {
      headers: BILI_HEADERS,
    });

    const video = data?.data;
    if (!video) return { list: [] };

    const episodes = (video.pages || []).map((p, i) => {
      const part = p.part || `第${i + 1}集`;
      return {
        name: part,
        playId: `${videoId}_${p.cid}`,
      };
    });

    return {
      list: [
        {
          vod_id: String(videoId),
          vod_name: String(video.title || "").replace(/<[^>]*>/g, ""),
          vod_pic: fixCover(video.pic),
          vod_content: String(video.desc || ""),
          vod_play_sources: [
            {
              name: "B站视频",
              episodes,
            },
          ],
        },
      ],
    };
  } catch (error) {
    logError("详情获取失败", error);
    return { list: [] };
  }
}

async function play(params, context = {}) {
  let playId = params.playId || "";
  const flag = params.flag || "";

  if (!playId) {
    return { urls: [], parse: 1, header: {} };
  }

  const idParts = playId.split("_");
  if (idParts.length < 2) {
    return {
      urls: [{ name: "播放", url: playId }],
      parse: /\.(m3u8|mp4|flv)$/i.test(playId) ? 0 : 1,
      header: {}
  };
  }

  const avid = idParts[0];
  const cid = idParts[1];
  const loggedIn = isLoggedIn();
  const dashProxyUrl = loggedIn ? buildDashProxyUrl(params, context, avid, cid) : "";

  const qualityList = loggedIn
    ? [127, 126, 125, 120, 116, 112, 80, 74, 64, 32, 16]
    : [80, 64, 32, 16];

  const headers = {
    ...BILI_HEADERS,
    Referer: `https://www.bilibili.com/video/av${avid}`,
    Origin: "https://www.bilibili.com",
  };

  const qualitySet = new Set();
  const availableQualities = [];
  let dashProxyAdded = false;

  if (dashProxyUrl) {
    availableQualities.push({
      name: "DASH(代理)",
      url: dashProxyUrl,
      qn: 1000,
      isDashProxy: true,
      audioUrl: "",
    });
    dashProxyAdded = true;
  }

  for (const qn of qualityList) {
    const useDash = qn > 116;
    try {
      const { data } = await axios.get("https://api.bilibili.com/x/player/playurl", {
        headers,
        params: {
          avid,
          cid,
          qn,
          fnval: useDash ? 4048 : 1,
          fourk: qn >= 120 ? 1 : 0,
          ...(!loggedIn ? { try_look: 1 } : {}),
        },
      });

      if (data?.code !== 0 || !data?.data) continue;

      const payload = data.data;
      const actualQn = payload.quality || qn;
      if (qualitySet.has(actualQn)) continue;
      qualitySet.add(actualQn);

      if (payload.dash?.video?.length) {
        if (loggedIn && !dashProxyAdded) {
          availableQualities.push({
            name: "DASH(代理)",
            url: buildDashDataUrl(payload.dash),
            qn: 1000,
            isDashProxy: true,
            audioUrl: "",
          });
          dashProxyAdded = true;
        }

        const bestVideo = [...payload.dash.video].sort((a, b) => {
          if ((b.id || 0) !== (a.id || 0)) return (b.id || 0) - (a.id || 0);
          if ((b.bandwidth || 0) !== (a.bandwidth || 0)) return (b.bandwidth || 0) - (a.bandwidth || 0);
          return (b.width || 0) - (a.width || 0);
        })[0];

        const bestAudio = [...(payload.dash.audio || [])].sort((a, b) => (b.bandwidth || 0) - (a.bandwidth || 0))[0];

        if (bestVideo) {
          availableQualities.push({
            name: QUALITY_NAME_MAP[actualQn] || `DASH ${bestVideo.width || "?"}p`,
            url: bestVideo.base_url || bestVideo.baseUrl,
            qn: actualQn,
            audioUrl: bestAudio?.base_url || bestAudio?.baseUrl || "",
          });
        }
      } else if (payload.durl?.[0]?.url) {
        availableQualities.push({
          name: QUALITY_NAME_MAP[actualQn] || `画质${actualQn}`,
          url: payload.durl[0].url,
          qn: actualQn,
          audioUrl: "",
        });
      }
    } catch {
      // 忽略单个画质异常，继续尝试其他画质
    }
  }

  if (availableQualities.length === 0) {
    return {
      urls: [{ name: "播放", url: playId }],
      parse: 1,
      header: headers};
  }

  availableQualities.sort((a, b) => b.qn - a.qn);

  const urls = availableQualities.map((q) => ({
    name: q.name,
    url: q.url,
  }));

  const response = {
    urls,
    parse: 0,
    header: {
      "User-Agent": headers["User-Agent"],
      Referer: headers.Referer,
      Origin: headers.Origin
    },
    danmaku: [{ name: "B站弹幕", url: `https://api.bilibili.com/x/v1/dm/list.so?oid=${cid}` }]};

  if (availableQualities[0]?.audioUrl) {
    response.extra = { audio: availableQualities[0].audioUrl };
  }

  return response;
}

async function proxy(params = {}) {
  const ids = params.ids || params.playId || params.id || "";
  const idParts = String(ids).split("_");
  if (idParts.length < 2) return "";

  const avid = idParts[0];
  const cid = idParts[1];
  const qn = parseInt(params.qn, 10) || 127;
  const headers = {
    ...BILI_HEADERS,
    Referer: `https://www.bilibili.com/video/av${avid}`,
    Origin: "https://www.bilibili.com",
  };

  try {
    const { data } = await axios.get("https://api.bilibili.com/x/player/playurl", {
      headers,
      params: {
        avid,
        cid,
        qn,
        fnval: parseInt(params.fnval, 10) || 4048,
        fourk: params.fourk == null ? 1 : params.fourk,
        ...(!isLoggedIn() ? { try_look: 1 } : {}),
      },
    });

    if (data?.code === 0 && data?.data?.dash) {
      return buildMpd(data.data.dash);
    }
    return "";
  } catch (error) {
    logError("DASH代理获取失败", error);
    return "";
  }
}

module.exports = {
  home,
  category,
  search,
  detail,
  play,
  proxy,
};

const runner = require("spider_runner");
runner.run(module.exports);

});

_load(1, "贝乐虎", function (module, exports, require) {
// @name 贝乐虎
// @author 
// @description 刮削：不支持，弹幕：不支持，嗅探：不支持
// @dependencies: axios
// @version 1.0.4
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/教育/贝乐虎.js

/**
 * ============================================================================
 * 贝乐虎
 * 刮削：不支持
 * 弹幕：不支持
 * 嗅探：不支持
 * ============================================================================
 */
const axios = require("axios");
const http = require("http");
const https = require("https");
const OmniBox = require("omnibox_sdk");

// ========== 全局配置 ==========
const beilehuConfig = {
  host: "https://vd.ubestkid.com",
  headers: {
    "User-Agent": "IOS_UA",
    "Content-Type": "application/json",
  },
};

const PAGE_LIMIT = 20;

const CLASS_DATA = [
  { type_id: "56", type_name: "热门" },
  { type_id: "57", type_name: "贝乐虎儿歌" },
  { type_id: "58", type_name: "贝乐虎故事" },
  { type_id: "59", type_name: "贝乐虎动画" },
  { type_id: "60", type_name: "贝乐虎音乐剧" },
  { type_id: "61", type_name: "贝乐虎启蒙" },
  { type_id: "62", type_name: "贝乐虎玩具" },
  { type_id: "63", type_name: "贝乐虎手工" },
  { type_id: "64", type_name: "贝乐虎游戏" },
  { type_id: "65", type_name: "贝乐虎亲子" },
  { type_id: "66", type_name: "贝乐虎科普" },
];

const _http = axios.create({
  timeout: 15 * 1000,
  httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
  httpAgent: new http.Agent({ keepAlive: true }),
});

const logInfo = (message, data = null) => {
  const output = data ? `${message}: ${JSON.stringify(data)}` : message;
  OmniBox.log("info", `[贝乐虎-DEBUG] ${output}`);
};

const logError = (message, error) => {
  OmniBox.log("error", `[贝乐虎-DEBUG] ${message}: ${error.message || error}`);
};

// ========== 通用函数 ==========
const normalizeText = (text) => String(text || "").trim().toLowerCase().replace(/\s+/g, "");

const isKeywordMatched = (item, keyword) => {
  const normalizedKeyword = normalizeText(keyword);
  if (!normalizedKeyword) return false;

  const title = normalizeText(item?.title);
  return title.includes(normalizedKeyword);
};

const pickVideoItems = (data) => {
  const items = data?.result?.items;
  return Array.isArray(items) ? items : [];
};

const uniqueVideoItems = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item?.url || ""}@@${item?.title || ""}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const fetchVideos = async (subcateId, page = 1, keyword = "") => {
  try {
    const url = `${beilehuConfig.host}/api/v1/bv/video`;
    const pdata = {
      age: 1,
      appver: "6.1.9",
      egvip_status: 0,
      svip_status: 0,
      vps: 60,
      subcateId,
      p: page,
    };

    if (keyword) {
      pdata.keyword = keyword;
    }

    const response = await _http.post(url, pdata, {
      headers: beilehuConfig.headers,
    });

    return response.data;
  } catch (error) {
    logError("请求失败", error);
    return null;
  }
};

const formatVideoList = (items) => {
  const list = [];
  if (items && Array.isArray(items)) {
    items.forEach((it) => {
      list.push({
        vod_id: `${it.url}@@${it.title || ""}@@${it.image || ""}`,
        vod_name: it.title || "",
        vod_pic: it.image || "",
        vod_remarks: `👀${it.viewcount || "0"}`,
        vod_time: it.update_time || "",
      });
    });
  }
  return list;
};

const parsePlaySources = (fromStr, urlStr) => {
  const playSources = [];
  if (!fromStr || !urlStr) return playSources;

  const froms = fromStr.split("$$$");
  const urls = urlStr.split("$$$");

  for (let i = 0; i < froms.length; i++) {
    const sourceName = froms[i] || `线路${i + 1}`;
    const sourceItems = urls[i] ? urls[i].split("#") : [];

    const episodes = sourceItems
      .map((item) => {
        const parts = item.split("$");
        const episodeName = parts[0] || "播放";
        const actualUrl = parts[1] || parts[0];
        if (!actualUrl) return null;
        return {
          name: episodeName,
          playId: actualUrl,
        };
      })
      .filter(Boolean);

    if (episodes.length > 0) {
      playSources.push({
        name: sourceName,
        episodes,
      });
    }
  }

  return playSources;
};

// ========== 接口实现 ==========
async function home() {
  try {
    const data = await fetchVideos("56", 1);
    const list = formatVideoList(pickVideoItems(data));
    return {
      class: CLASS_DATA,
      list: list.slice(0, PAGE_LIMIT),
    };
  } catch (error) {
    logError("首页推荐错误", error);
    return { class: CLASS_DATA, list: [] };
  }
}

async function category(params) {
  const { categoryId, page } = params;
  const pg = parseInt(page) || 1;
  try {
    const data = await fetchVideos(categoryId, pg);
    const list = formatVideoList(pickVideoItems(data));
    const pagecount = data?.result?.total_page || (list.length >= PAGE_LIMIT ? pg + 1 : pg);
    return {
      list,
      page: pg,
      pagecount,
    };
  } catch (error) {
    logError("分类列表错误", error);
    return { list: [], page: pg, pagecount: 1 };
  }
}

async function search(params) {
  const keyword = String(params.keyword || params.wd || "").trim();
  const pg = Math.max(1, parseInt(params.page, 10) || 1);

  if (!keyword) {
    return { list: [], page: pg, pagecount: 1, total: 0 };
  }

  try {
    const responses = await Promise.all(
      CLASS_DATA.map((item) => fetchVideos(item.type_id, pg, keyword))
    );
    const matchedItems = uniqueVideoItems(
      responses
        .flatMap(pickVideoItems)
        .filter((item) => isKeywordMatched(item, keyword))
    );
    const list = formatVideoList(matchedItems).slice(0, PAGE_LIMIT);

    return {
      list,
      page: pg,
      pagecount: list.length >= PAGE_LIMIT ? pg + 1 : pg,
      total: matchedItems.length,
    };
  } catch (error) {
    logError("搜索错误", error);
    return { list: [], page: pg, pagecount: 1, total: 0 };
  }
}

async function detail(params) {
  const videoId = params.videoId || "";
  try {
    const parts = String(videoId).split("@@");
    if (parts.length < 2) return { list: [] };

    const url = parts[0];
    const title = parts[1] || "";
    const image = parts[2] || "";

    const vod_play_from = "贝乐虎";
    const vod_play_url = `播放$${url}`;
    const playSources = parsePlaySources(vod_play_from, vod_play_url);

    return {
      list: [
        {
          vod_id: videoId,
          vod_name: title,
          vod_pic: image,
          vod_content: title,
          vod_play_sources: playSources,
        },
      ],
    };
  } catch (error) {
    logError("详情获取错误", error);
    return { list: [] };
  }
}

async function play(params) {
  const playId = params.playId;
  if (!playId) {
    return {
      urls: [],
      parse: 0,
      header: beilehuConfig.headers,
    };
  }
  return {
    urls: [{ name: "播放", url: playId }],
    parse: 0,
    header: beilehuConfig.headers,
  };
}

// ========== 导出模块 ==========
module.exports = { home, category, search, detail, play };

const runner = require("spider_runner");
runner.run(module.exports);

});
