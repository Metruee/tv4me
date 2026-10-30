// @name 18禁
// @version 3.20261030.1219
// @description 成人资源聚合（4 站直连可用 + 3 站需代理）
// @downloadURL https://gh-proxy.com/https://raw.githubusercontent.com/Metruee/tv4me/main/spiders/omnibox-18禁.js
// @dependencies

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");

const SITES = [
  {
    "name": "🔞黑料资源",
    "api": "https://www.heiliaozyapi.com/api.php/provide/vod"
  },
  {
    "name": "🔞小鸡资源",
    "api": "https://api.xiaojizy.live/provide/vod"
  },
  {
    "name": "🔞滴滴资源",
    "api": "https://api.ddapi.cc/api.php/provide/vod"
  },
  {
    "name": "🔞辣椒资源",
    "api": "https://pz.v88.qzz.io/?url=https://apilj.com/api.php/provide/vod"
  },
  {
    "name": "🔞麻豆视频",
    "api": "https://91md.me/api.php/provide/vod"
  },
  {
    "name": "🔞老色逼",
    "api": "https://apilsbzy1.com/api.php/provide/vod"
  },
  {
    "name": "🔞黄色仓库",
    "api": "https://hsckzy.xyz/api.php/provide/vod"
  }
];

const TIMEOUT_HOME = 3500;
const TIMEOUT_REQ = 6000;
const DEFAULT_CLASS = [
  { type_id: "1", type_name: "电影" },
  { type_id: "2", type_name: "连续剧" },
  { type_id: "3", type_name: "综艺" },
  { type_id: "4", type_name: "动漫" }
];

module.exports = { home, category, detail, search, play };

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise(function (_, reject) {
    timer = setTimeout(function () {
      reject(new Error("timeout " + ms + "ms " + (label || "")));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(function () { clearTimeout(timer); });
}

function buildUrl(api, params) {
  const parts = [];
  Object.keys(params).forEach(function (k) {
    const v = params[k];
    if (v != null && v !== "") parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(v));
  });
  const sep = api.indexOf("?") >= 0 ? "&" : "?";
  return api + sep + parts.join("&");
}

async function fetchJson(api, params, timeoutMs) {
  const url = buildUrl(api, params);
  const res = await withTimeout(
    OmniBox.request(url, {
      method: "GET",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    }),
    timeoutMs || TIMEOUT_REQ,
    api
  );
  if (!res || res.statusCode !== 200) throw new Error("HTTP " + (res ? res.statusCode : "none"));
  return JSON.parse(res.body || "{}");
}

function mapVod(v, idx) {
  return {
    vod_id: String(idx) + ":" + String(v.vod_id || ""),
    vod_name: String(v.vod_name || ""),
    vod_pic: String(v.vod_pic || ""),
    type_id: String(v.type_id || ""),
    type_name: String(v.type_name || ""),
    vod_remarks: String(v.vod_remarks || ""),
    vod_year: String(v.vod_year || ""),
    vod_douban_score: String(v.vod_douban_score || "")
  };
}

function parseVodPlayUrl(raw) {
  const sources = [];
  const flags = String(raw || "").split("$$$").filter(Boolean);
  flags.forEach(function (flagStr, fi) {
    const eps = [];
    flagStr.split("#").forEach(function (seg) {
      if (!seg) return;
      const d = seg.indexOf("$");
      if (d < 0) return;
      const nm = seg.slice(0, d);
      const url = seg.slice(d + 1);
      if (url) eps.push({ name: nm || ("第" + (eps.length + 1) + "集"), playId: url });
    });
    if (eps.length) sources.push({ name: flags.length > 1 ? ("线路" + (fi + 1)) : "默认", episodes: eps });
  });
  return sources;
}

async function home(params, context) {
  try {
    const data = await fetchJson(SITES[0].api, { ac: "list" }, TIMEOUT_HOME);
    const cls = (data.class || []).map(function (c) {
      return { type_id: String(c.type_id), type_name: String(c.type_name) };
    });
    const list = (data.list || []).map(function (v) { return mapVod(v, 0); });
    return { class: cls.length ? cls : DEFAULT_CLASS, list: list };
  } catch (e) {
    return { class: DEFAULT_CLASS, list: [] };
  }
}

async function category(params, context) {
  const categoryId = params.categoryId || "1";
  const page = params.page || 1;
  const results = await Promise.allSettled(SITES.map(function (s, i) {
    return fetchJson(s.api, { ac: "videolist", t: categoryId, pg: String(page) }, TIMEOUT_REQ).then(function (dd) {
      return (dd.list || []).map(function (v) { return mapVod(v, i); });
    });
  }));
  const list = [];
  results.forEach(function (r) { if (r.status === "fulfilled") Array.prototype.push.apply(list, r.value); });
  return { page: Number(page) || 1, pagecount: 1, total: list.length, list: list };
}

async function search(params, context) {
  const kw = params.keyword || "";
  if (!kw) return { page: 1, pagecount: 1, total: 0, list: [] };
  const results = await Promise.allSettled(SITES.map(function (s, i) {
    return fetchJson(s.api, { ac: "videolist", wd: kw }, TIMEOUT_REQ).then(function (dd) {
      return (dd.list || []).map(function (v) { return mapVod(v, i); });
    });
  }));
  const list = [];
  results.forEach(function (r) { if (r.status === "fulfilled") Array.prototype.push.apply(list, r.value); });
  return { page: 1, pagecount: 1, total: list.length, list: list };
}

async function detail(params, context) {
  try {
    const id = String(params.videoId || "");
    const colon = id.indexOf(":");
    const idx = colon >= 0 ? parseInt(id.slice(0, colon), 10) : 0;
    const realId = colon >= 0 ? id.slice(colon + 1) : id;
    const site = SITES[idx] || SITES[0];
    const data = await fetchJson(site.api, { ac: "detail", ids: realId }, TIMEOUT_REQ);
    const v = (data.list && data.list[0]) || {};
    return {
      list: [{
        vod_id: id,
        vod_name: String(v.vod_name || ""),
        vod_pic: String(v.vod_pic || ""),
        type_name: String(v.type_name || ""),
        vod_content: String(v.vod_content || ""),
        vod_director: String(v.vod_director || ""),
        vod_actor: String(v.vod_actor || ""),
        vod_area: String(v.vod_area || ""),
        vod_year: String(v.vod_year || ""),
        vod_remarks: String(v.vod_remarks || ""),
        vod_douban_score: String(v.vod_douban_score || ""),
        vod_play_sources: parseVodPlayUrl(v.vod_play_url)
      }]
    };
  } catch (e) {
    return { list: [] };
  }
}

function isDirect(url) {
  return /\.(m3u8|mp4|flv|mkv|ts)(\?|#|$)/i.test(url);
}

// 把"播放页/分享页"解析成真实 m3u8；解析不出就回退并标记 parse:1
async function resolvePlayUrl(raw) {
  if (!raw) return "";
  if (isDirect(raw)) return raw;
  // /play/{id} 形式：直接拼 /index.m3u8（极速/速播/金鹰/光速 实测有效）
  if (/\/play\/[^\/?#]+$/.test(raw)) return raw + "/index.m3u8";
  // share/play 页面：抓页面内联 m3u8（绝对地址 / JSON url / const url = 三种写法）
  try {
    const res = await withTimeout(
      OmniBox.request(raw, { method: "GET", headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } }),
      5000, "playpage"
    );
    const body = (res && res.body) || "";
    const origin = new URL(raw).origin;
    let m = body.match(/https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/i);
    if (m) return m[0];
    const pats = [
      /["']url["']\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i,
      /(?:const|let|var)\s+url\s*=\s*["']([^"']+\.m3u8[^"']*)["']/i
    ];
    for (let i = 0; i < pats.length; i++) {
      const mm = body.match(pats[i]);
      if (mm) {
        if (mm[1].indexOf("http") === 0) return mm[1];
        return origin + (mm[1].charAt(0) === "/" ? mm[1] : "/" + mm[1]);
      }
    }
  } catch (e) {}
  return "";
}

async function play(params, context) {
  const raw = String(params.playId || "");
  const url = await resolvePlayUrl(raw);
  if (url) return { urls: [{ name: "默认", url: url }], flag: params.flag || "" };
  return { urls: [{ name: "默认", url: raw }], flag: params.flag || "", parse: 1 };
}

runner.run(module.exports);
