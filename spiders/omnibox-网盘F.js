// @name 网盘影视F(合并3源)
// @version 3.20261030.1219
// @description 自动同步：网盘聚合
// @downloadURL https://gh-proxy.com/https://raw.githubusercontent.com/Metruee/tv4me/main/spiders/omnibox-网盘F.js
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


_load(0, "4K指南", function (module, exports, require) {
// @name 4K指南
// @author 梦
// @description 网盘资源站：https://4kzn.cc ，支持首页、分类、详情、搜索、网盘播放、刮削、弹幕、播放记录
// @version 1.2.3
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/网盘/4K指南.js
// @dependencies cheerio

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const cheerio = require("cheerio");

const HOST = process.env.K4ZN_HOST || "https://4kzn.cc";
const UA = process.env.K4ZN_UA || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
const HEADERS = {
  "User-Agent": UA,
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  Referer: `${HOST}/`,
};

const DRIVE_TYPE_CONFIG = splitConfigList(process.env.DRIVE_TYPE_CONFIG || "quark;uc");
const SOURCE_NAMES_CONFIG = splitConfigList(process.env.SOURCE_NAMES_CONFIG || "本地代理;服务端代理;直连");
const DRIVE_ORDER = splitConfigList(process.env.DRIVE_ORDER || "baidu;tianyi;quark;uc;115;xunlei;ali;123pan").map((s) => s.toLowerCase());
const EXTERNAL_SERVER_PROXY_ENABLED = String(process.env.EXTERNAL_SERVER_PROXY_ENABLED || "false").toLowerCase() === "true";

const VIDEO_EXTENSIONS = [
  ".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".m4v", ".mpg", ".mpeg", ".rmvb", ".ts", ".m2ts", ".webm", ".iso",
];

const CLASS_LIST = [
  { type_id: "books/top250", type_name: "豆瓣TOP250" },
  { type_id: "books/zuixin", type_name: "最新" },
  { type_id: "books/zuixin-juji", type_name: "最新剧集" },
  { type_id: "books/xiliehj", type_name: "系列合集" },
  { type_id: "books/manwei", type_name: "漫威电影系列合集" },
  { type_id: "books/mztkn", type_name: "名侦探柯南剧场版合集" },
  { type_id: "books/hanniba", type_name: "汉尼拔合集" },
];

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

function splitConfigList(value) {
  return String(value || "")
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

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

function formatFileSize(size) {
  const n = Number(size || 0);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 1024) return `${n}B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(2)}KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(2)}MB`;
  if (n < 1024 ** 4) return `${(n / 1024 ** 3).toFixed(2)}GB`;
  return `${(n / 1024 ** 4).toFixed(2)}TB`;
}

function encodePlayMeta(meta) {
  try {
    return Buffer.from(JSON.stringify(meta || {}), "utf8").toString("base64");
  } catch (_) {
    return "";
  }
}

function decodePlayMeta(meta) {
  try {
    return JSON.parse(Buffer.from(String(meta || ""), "base64").toString("utf8") || "{}");
  } catch (_) {
    return {};
  }
}

function buildScrapedFileName(scrapeData, mapping, originalFileName) {
  if (!mapping || mapping.episodeNumber === 0 || (mapping.confidence && mapping.confidence < 0.5)) {
    return originalFileName;
  }

  if (!scrapeData || !scrapeData.title) {
    return originalFileName;
  }

  if (scrapeData.type === "tv" || mapping.seasonNumber) {
    const seasonNum = mapping.seasonNumber || 1;
    const epNum = mapping.episodeNumber || 1;
    const seasonAirYear = scrapeData.seasonAirYear || "";
    let name = `${scrapeData.title}`;
    if (seasonAirYear) name += `.${seasonAirYear}`;
    name += `.S${String(seasonNum).padStart(2, "0")}E${String(epNum).padStart(2, "0")}`;
    return name;
  }

  return scrapeData.title || originalFileName;
}

function normalizeEpisodeName(episodeName) {
  if (!episodeName) return "";
  return String(episodeName)
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/（[^）]*）/g, " ")
    .replace(/第\s*([0-9一二三四五六七八九十百千零〇两]+)\s*[集话期]/g, "E$1")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildFileNameForDanmu(vodName, episodeTitle) {
  const title = cleanText(vodName || "");
  const episode = normalizeEpisodeName(episodeTitle || "");
  if (!title) return episode;
  if (!episode || title.includes(episode)) return title;
  return `${title} ${episode}`;
}

function buildPlayHistoryPayload({ sourceId, vodId, title, pic, episode, episodeName, episodeNumber }) {
  if (!sourceId || !vodId) return null;
  return {
    vodId,
    title: title || "",
    pic: pic || "",
    episode,
    sourceId,
    episodeNumber: typeof episodeNumber === "number" ? episodeNumber : undefined,
    episodeName: episodeName || "",
  };
}

function getBaseURLHost(context = {}) {
  const baseURL = String(context?.baseURL || "").trim();
  if (!baseURL) return "";
  try {
    return new URL(baseURL).hostname.toLowerCase();
  } catch (_) {
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

function resolveCallerSource(params = {}, context = {}) {
  return String(context?.from || params?.source || "").toLowerCase();
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
      const parts = flag.split("-");
      routeType = parts[parts.length - 1];
    } else {
      routeType = flag;
    }
  }

  if (!validRouteTypes.has(routeType)) routeType = "直连";
  if (!allowServerProxy && routeType === "服务端代理") routeType = "直连";
  if (callerSource === "uz" && routeType === "本地代理") routeType = "直连";

  return routeType;
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
  if (!Array.isArray(playSources) || playSources.length <= 1 || DRIVE_ORDER.length === 0) return playSources;
  const orderMap = new Map(DRIVE_ORDER.map((name, index) => [name, index]));
  return [...playSources].sort((a, b) => {
    const aType = inferDriveTypeFromSourceName(a?.name || "");
    const bType = inferDriveTypeFromSourceName(b?.name || "");
    const aOrder = orderMap.has(aType) ? orderMap.get(aType) : Number.MAX_SAFE_INTEGER;
    const bOrder = orderMap.has(bType) ? orderMap.get(bType) : Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return 0;
  });
}

function isVideoFile(file = {}) {
  const name = String(file.file_name || file.name || "").toLowerCase();
  const hasVideoExt = VIDEO_EXTENSIONS.some((ext) => name.endsWith(ext));
  const sdkFileFlag = file.file === 1 || file.file === true || file.is_file === 1 || file.isFile === 1;
  return hasVideoExt || (sdkFileFlag && hasVideoExt);
}

function isFolderLike(file = {}) {
  if (
    file.is_dir === 1 || file.isDir === 1 || file.dir === 1 || file.dir === true ||
    file.folder === 1 || file.folder === true || file.is_folder === 1
  ) {
    return true;
  }
  const type = String(file.type || file.obj_type || file.category || file.file_type || "").toLowerCase();
  return type.includes("dir") || type.includes("folder");
}

async function getAllVideoFiles(shareURL, files, depth = 0, seen = new Set()) {
  if (!Array.isArray(files) || !files.length || depth > 8) return [];

  const videos = [];
  for (const file of files) {
    const fid = String(file.fid || file.file_id || file.id || "").trim();
    if (!fid) continue;

    if (isVideoFile(file)) {
      videos.push({
        fid,
        file_name: String(file.file_name || file.name || fid),
        size: Number(file.size || file.file_size || 0),
      });
      continue;
    }

    if (isFolderLike(file)) {
      const key = `${shareURL}|${fid}`;
      if (seen.has(key)) continue;
      seen.add(key);

      try {
        const subFileList = await OmniBox.getDriveFileList(shareURL, fid);
        const subFiles = Array.isArray(subFileList?.files) ? subFileList.files : Array.isArray(subFileList) ? subFileList : [];
        if (subFiles.length) {
          const nested = await getAllVideoFiles(shareURL, subFiles, depth + 1, seen);
          if (nested.length) videos.push(...nested);
        }
      } catch (e) {
        await OmniBox.log("warn", `[4K指南][detail] 读取子目录失败 share=${shareURL} fid=${fid}: ${e.message}`);
      }
    }
  }

  return videos;
}

function dedupeEpisodes(episodes = []) {
  const seen = new Set();
  const result = [];
  for (const ep of episodes) {
    const key = `${ep.playId}@@${ep.name}`;
    if (!ep.playId || seen.has(key)) continue;
    seen.add(key);
    result.push(ep);
  }
  return result;
}

async function requestText(url, options = {}) {
  const res = await OmniBox.request(url, {
    method: options.method || "GET",
    headers: {
      ...HEADERS,
      ...(options.headers || {}),
      Referer: options.referer || `${HOST}/`,
    },
    timeout: options.timeout || 20000,
    body: options.body,
  });
  const statusCode = Number(res?.statusCode || 0);
  const text = getBodyText(res);
  if (statusCode < 200 || statusCode >= 400) {
    throw new Error(`HTTP ${statusCode} @ ${url}`);
  }
  return text;
}

function extractItems(html) {
  const $ = cheerio.load(html);
  const list = [];
  const seen = new Set();

  $("article.posts-item.book-item, article.posts-item.sites-item, article.posts-item").each((_, el) => {
    const a = $(el).find("a.item-image, h3.item-title a, a[target='_blank']").first();
    const href = absUrl(a.attr("href") || "");
    const title = cleanText($(el).find(".item-title a").first().text() || a.text() || $(el).attr("data-title") || "");
    if (!href || !title || seen.has(href)) return;
    seen.add(href);

    const img = absUrl($(el).find("img").first().attr("data-src") || $(el).find("img").first().attr("src") || "");
    const desc = cleanText($(el).find(".line1.text-muted.text-xs, .book-info, .item-desc, .sub-title").first().text());

    list.push({
      vod_id: href,
      vod_name: title,
      vod_pic: img,
      vod_remarks: desc,
      vod_content: "",
    });
  });

  return list;
}

function extractPager(html) {
  const pagecountMatch = html.match(/\/books\/[^"']+\/page\/(\d+)/g);
  const pages = pagecountMatch ? pagecountMatch.map((s) => Number((s.match(/(\d+)$/) || [0, 1])[1] || 1)) : [];
  const maxPage = pages.length ? Math.max(...pages) : 1;
  const hasNext = /class="next-page[^>]*>\s*<a[^>]*href="[^"]+\/page\/\d+"/i.test(html);
  return { pagecount: Math.max(maxPage, hasNext ? maxPage + 1 : 1) };
}

async function home(params, context) {
  try {
    const html = await requestText(`${HOST}/`);
    const list = extractItems(html).slice(0, 24);
    return { class: CLASS_LIST, filters: {}, list };
  } catch (e) {
    await OmniBox.log("error", `[4K指南][home] ${e.message}`);
    return { class: CLASS_LIST, filters: {}, list: [] };
  }
}

async function category(params, context) {
  try {
    const tid = String(params.categoryId || params.type_id || "books/zuixin").replace(/^\/+/, "");
    const page = Math.max(1, parseInt(params.page || 1, 10));
    const url = page > 1 ? `${HOST}/${tid}/page/${page}` : `${HOST}/${tid}`;
    const html = await requestText(url);
    const list = extractItems(html);
    const { pagecount } = extractPager(html);
    return { page, pagecount, total: pagecount * Math.max(list.length, 1), list };
  } catch (e) {
    await OmniBox.log("error", `[4K指南][category] ${e.message}`);
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }
}

async function detail(params, context) {
  try {
    const id = String(params.videoId || params.id || params.url || "").trim();
    if (!id) return { list: [] };

    const source = resolveCallerSource(params, context);
    const detailUrl = /^https?:\/\//i.test(id) ? id : absUrl(id);
    const html = await requestText(detailUrl);
    const $ = cheerio.load(html);

    const title = cleanText($("h1, h2, .book-title").first().text()) || cleanText($("meta[property='og:title']").attr("content") || "");
    const pic = absUrl($(".book-cover img, meta[property='og:image']").first().attr("data-src") || $(".book-cover img, meta[property='og:image']").first().attr("content") || $(".book-cover img").first().attr("src") || "");
    const desc = cleanText($("meta[name='description']").attr("content") || $(".panel-body.single").text());

    const shareLinks = [];
    const seenLinks = new Set();
    $(".site-go a[target='_blank'], a[target='_blank'][href*='pan.quark.cn'], a[href*='quark.cn'], a[href*='uc.cn'], a[href*='aliyundrive.com'], a[href*='115.com']").each((_, el) => {
      const href = absUrl($(el).attr("href") || "");
      if (!href || seenLinks.has(href)) return;
      seenLinks.add(href);
      shareLinks.push(href);
    });

    if (!shareLinks.length) {
      const fallbackLink = $("a.external[href*='pan.quark.cn'], a[href*='pan.quark.cn'], a[href*='quark.cn']").first();
      const href = absUrl(fallbackLink.attr("href") || "");
      if (href) shareLinks.push(href);
    }

    const driveTypeCountMap = {};
    const rawDriveInfos = [];

    for (const shareURL of shareLinks) {
      let driveInfo = null;
      try {
        driveInfo = await OmniBox.getDriveInfoByShareURL(shareURL);
      } catch (_) {
        driveInfo = null;
      }
      const displayName = driveInfo?.displayName || "网盘";
      driveTypeCountMap[displayName] = (driveTypeCountMap[displayName] || 0) + 1;
      rawDriveInfos.push({ shareURL, driveInfo, displayName });
    }

    const driveTypeCurrentIndexMap = {};
    const filesForScraping = [];
    let playSources = [];

    for (const item of rawDriveInfos) {
      const { shareURL, driveInfo } = item;
      let displayName = item.displayName;

      if ((driveTypeCountMap[displayName] || 0) > 1) {
        driveTypeCurrentIndexMap[displayName] = (driveTypeCurrentIndexMap[displayName] || 0) + 1;
        displayName = `${displayName}${driveTypeCurrentIndexMap[displayName]}`;
      }

      let allVideoFiles = [];
      try {
        const rootFileList = await OmniBox.getDriveFileList(shareURL, "0");
        const rootFiles = Array.isArray(rootFileList?.files) ? rootFileList.files : Array.isArray(rootFileList) ? rootFileList : [];
        allVideoFiles = await getAllVideoFiles(shareURL, rootFiles, 0, new Set());
        await OmniBox.log("info", `[4K指南][detail] share=${shareURL} rootFiles=${rootFiles.length} videoFiles=${allVideoFiles.length}`);
      } catch (e) {
        await OmniBox.log("warn", `[4K指南][detail] 扫描网盘文件失败: ${e.message}`);
      }

      const episodes = dedupeEpisodes(allVideoFiles.map((file) => {
        const sizeText = formatFileSize(file.size);
        const episodeName = cleanText(String(file.file_name || "资源").replace(/\.[^.]+$/, "")) || "资源";
        const displayFileName = sizeText ? `[${sizeText}] ${file.file_name}` : file.file_name;
        const playMeta = encodePlayMeta({
          sid: detailUrl,
          t: title,
          p: pic,
          e: episodeName,
        });
        const formattedFileId = `${shareURL}|${file.fid}`;
        if (file.fid && !filesForScraping.some((item) => item.fid === formattedFileId)) {
          filesForScraping.push({
            file_name: episodeName,
            fid: formattedFileId,
            file_id: formattedFileId,
          });
        }
        return {
          name: displayFileName,
          playId: playMeta ? `${shareURL}|${file.fid}|${playMeta}` : `${shareURL}|${file.fid}`,
        };
      }));

      if (!episodes.length) {
        episodes.push({
          name: "打开网盘链接",
          playId: `share|||${encodeURIComponent(shareURL)}`,
        });
      }

      let sourceNames = [displayName];
      const driveType = String(driveInfo?.driveType || "").toLowerCase();
      if (DRIVE_TYPE_CONFIG.includes(driveType)) {
        sourceNames = filterSourceNamesForCaller(SOURCE_NAMES_CONFIG, source, context);
      }

      for (const sourceName of sourceNames) {
        const lineName = DRIVE_TYPE_CONFIG.includes(driveType) ? `${displayName}-${sourceName}` : displayName;
        playSources.push({
          name: lineName,
          episodes,
        });
      }
    }

    if (playSources.length > 1) {
      playSources = sortPlaySourcesByDriveOrder(playSources);
    }

    const vodItem = {
      vod_id: detailUrl,
      vod_name: title,
      vod_pic: pic,
      vod_content: desc,
      vod_play_sources: playSources.length
        ? playSources
        : [{ name: "详情页", episodes: [{ name: "打开详情页", playId: `page|||${encodeURIComponent(detailUrl)}` }] }],
    };

    if (filesForScraping.length > 0) {
      try {
        await OmniBox.log("info", `[4K指南][detail] 开始统一刮削: vodId=${detailUrl}, files=${filesForScraping.length}`);
        await OmniBox.processScraping(detailUrl, title || "", title || "", filesForScraping);
        const metadata = await OmniBox.getScrapeMetadata(detailUrl);
        const scrapeData = metadata?.scrapeData || null;
        const videoMappings = Array.isArray(metadata?.videoMappings) ? metadata.videoMappings : [];

        if (scrapeData || videoMappings.length > 0) {
          for (const source of vodItem.vod_play_sources || []) {
            for (const episode of source.episodes || []) {
              const playIdParts = String(episode.playId || "").split("|");
              const formattedId = `${String(playIdParts[0] || "")}|${String(playIdParts[1] || "")}`;
              const matchedMapping = videoMappings.find((mapping) => mapping && mapping.fileId === formattedId);
              if (matchedMapping && scrapeData) {
                const newName = buildScrapedFileName(scrapeData, matchedMapping, String(episode.name || ""));
                if (newName && newName !== episode.name) {
                  episode.name = newName;
                }
              }
            }
          }

          if (scrapeData) {
            if (scrapeData.title) vodItem.vod_name = scrapeData.title;
            if (scrapeData.posterPath) vodItem.vod_pic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
            if (scrapeData.overview) vodItem.vod_content = scrapeData.overview;
            if (scrapeData.releaseDate) vodItem.vod_year = String(scrapeData.releaseDate).slice(0, 4);
            if (scrapeData.voteAverage) vodItem.vod_douban_score = Number(scrapeData.voteAverage).toFixed(1);
          }
          await OmniBox.log("info", `[4K指南][detail] 统一刮削完成: vodId=${detailUrl}, mappings=${videoMappings.length}, title=${vodItem.vod_name || title}`);
        } else {
          await OmniBox.log("info", `[4K指南][detail] 统一刮削无结果: vodId=${detailUrl}`);
        }
      } catch (error) {
        await OmniBox.log("warn", `[4K指南][detail] 统一刮削失败: ${error.message}`);
      }
    } else {
      await OmniBox.log("info", `[4K指南][detail] 跳过统一刮削: 未收集到可刮削文件`);
    }

    await OmniBox.log("info", `[4K指南][detail] url=${detailUrl} title=${vodItem.vod_name || title} shareLinks=${shareLinks.length} lines=${playSources.length}`);

    return {
      list: [vodItem],
    };
  } catch (e) {
    await OmniBox.log("error", `[4K指南][detail] ${e.message}`);
    return { list: [] };
  }
}

async function search(params, context) {
  try {
    const keyword = String(params.keyword || params.wd || params.key || "").trim();
    const page = Math.max(1, parseInt(params.page || 1, 10));
    if (!keyword) return { page, pagecount: 0, total: 0, list: [] };

    const url = `${HOST}/?s=${encodeURIComponent(keyword)}`;
    const html = await requestText(url, { referer: `${HOST}/` });
    let list = extractItems(html);
    if (!list.length) {
      const $ = cheerio.load(html);
      list = [];
      $("a[href*='/book/'], a[href*='/sites/']").each((_, el) => {
        const a = $(el);
        const href = absUrl(a.attr("href") || "");
        const title = cleanText(a.text());
        if (!href || !title) return;
        if (!title.includes(keyword)) return;
        list.push({ vod_id: href, vod_name: title, vod_pic: "", vod_remarks: "", vod_content: "" });
      });
    }

    return { page, pagecount: 1, total: list.length, list };
  } catch (e) {
    await OmniBox.log("error", `[4K指南][search] ${e.message}`);
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }
}

async function play(params, context) {
  try {
    const playId = String(params.playId || params.url || params.input || "").trim();
    const flag = String(params.flag || "").trim();
    const source = resolveCallerSource(params, context);

    if (!playId) return { parse: 0, jx: 0, url: "", urls: [], header: {}, headers: {} };

    if (playId.startsWith("page|||")) {
      const pageUrl = decodeURIComponent(playId.slice("page|||".length));
      const header = { ...HEADERS, Referer: pageUrl };
      return { parse: 1, jx: 0, url: pageUrl, urls: [{ name: "详情页", url: pageUrl }], header, headers: header };
    }

    if (playId.startsWith("share|||")) {
      const shareUrl = decodeURIComponent(playId.slice("share|||".length));
      const header = { ...HEADERS, Referer: `${HOST}/` };
      return { parse: 1, jx: 0, url: shareUrl, urls: [{ name: "打开网盘", url: shareUrl }], header, headers: header };
    }

    const idParts = playId.split("|");
    const shareURL = idParts[0] || "";
    let fileId = idParts[1] || "";
    const playMeta = idParts.length >= 3 ? decodePlayMeta(idParts[2] || "") : {};

    if (!shareURL) {
      throw new Error("播放参数缺少分享链接");
    }

    const routeType = resolveRouteType(flag, source, context);

    if (!fileId) {
      const rootFileList = await OmniBox.getDriveFileList(shareURL, "0");
      const rootFiles = Array.isArray(rootFileList?.files) ? rootFileList.files : Array.isArray(rootFileList) ? rootFileList : [];
      const files = await getAllVideoFiles(shareURL, rootFiles, 0, new Set());
      if (files.length) {
        fileId = files[0].fid;
      }
    }

    if (!fileId) {
      const header = { ...HEADERS, Referer: `${HOST}/` };
      return { parse: 1, jx: 0, url: shareURL, urls: [{ name: "打开网盘", url: shareURL }], header, headers: header };
    }

    const metadataPromise = (async () => {
      const result = {
        danmakuList: [],
        scrapeTitle: "",
        scrapePic: "",
        episodeNumber: null,
        episodeName: playMeta.e || params.episodeName || "",
      };

      const vodId = String(playMeta.sid || params.vodId || params.videoId || "").trim();
      if (!vodId) return result;

      try {
        const metadata = await OmniBox.getScrapeMetadata(vodId);
        if (!metadata || !metadata.scrapeData || !Array.isArray(metadata.videoMappings)) {
          await OmniBox.log("info", `[4K指南][play] 弹幕匹配跳过: metadata 不完整, vodId=${vodId}`);
          return result;
        }

        const formattedFileId = `${shareURL}|${fileId}`;
        const matchedMapping = metadata.videoMappings.find((mapping) => mapping && mapping.fileId === formattedFileId);
        const scrapeData = metadata.scrapeData || {};
        result.scrapeTitle = scrapeData.title || "";
        if (scrapeData.posterPath) {
          result.scrapePic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
        }

        if (!matchedMapping) {
          await OmniBox.log("info", `[4K指南][play] 弹幕匹配未命中 mapping: ${formattedFileId}`);
          return result;
        }

        if (matchedMapping.episodeNumber) {
          result.episodeNumber = matchedMapping.episodeNumber;
        }
        if (matchedMapping.episodeName && !result.episodeName) {
          result.episodeName = matchedMapping.episodeName;
        }

        const fileName = buildScrapedFileName(scrapeData, matchedMapping, result.episodeName || "") || buildFileNameForDanmu(scrapeData.title || playMeta.t || "", result.episodeName || "");
        if (fileName) {
          await OmniBox.log("info", `[4K指南][play] 生成 fileName 用于弹幕匹配: ${fileName}`);
          const matchedDanmaku = await OmniBox.getDanmakuByFileName(fileName);
          if (Array.isArray(matchedDanmaku) && matchedDanmaku.length > 0) {
            result.danmakuList = matchedDanmaku;
            await OmniBox.log("info", `[4K指南][play] 弹幕匹配成功, count=${matchedDanmaku.length}`);
          }
        }
      } catch (error) {
        await OmniBox.log("warn", `[4K指南][play] 弹幕匹配失败: ${error.message}`);
      }

      return result;
    })();

    const [playInfoResult, metadataResult] = await Promise.allSettled([
      OmniBox.getDriveVideoPlayInfo(shareURL, fileId, routeType),
      metadataPromise,
    ]);

    if (playInfoResult.status !== "fulfilled") {
      throw new Error(playInfoResult.reason && playInfoResult.reason.message ? playInfoResult.reason.message : "网盘直链解析失败");
    }

    const playInfo = playInfoResult.value;
    if (!playInfo || !Array.isArray(playInfo.url) || !playInfo.url.length) {
      throw new Error("网盘直链解析结果为空");
    }

    const urls = playInfo.url.map((item) => ({
      name: item.name || "播放",
      url: item.url,
    }));

    let danmakuList = Array.isArray(playInfo.danmaku) ? playInfo.danmaku : [];
    let scrapeTitle = "";
    let scrapePic = "";
    let episodeNumber = null;
    let episodeName = playMeta.e || params.episodeName || "";
    if (metadataResult.status === "fulfilled" && metadataResult.value) {
      danmakuList = metadataResult.value.danmakuList?.length ? metadataResult.value.danmakuList : danmakuList;
      scrapeTitle = metadataResult.value.scrapeTitle || "";
      scrapePic = metadataResult.value.scrapePic || "";
      episodeNumber = metadataResult.value.episodeNumber ?? null;
      episodeName = metadataResult.value.episodeName || episodeName;
    } else if (metadataResult.status === "rejected") {
      await OmniBox.log("warn", `[4K指南][play] 获取元数据失败(不影响播放): ${metadataResult.reason && metadataResult.reason.message ? metadataResult.reason.message : metadataResult.reason}`);
    }

    const historyPayload = buildPlayHistoryPayload({
      sourceId: context?.sourceId,
      vodId: String(playMeta.sid || params.vodId || params.videoId || shareURL),
      title: params.title || scrapeTitle || playMeta.t || shareURL,
      pic: params.pic || scrapePic || playMeta.p || "",
      episode: playId,
      episodeName,
      episodeNumber,
    });
    if (historyPayload) {
      OmniBox.addPlayHistory(historyPayload)
        .then((added) => {
          if (added) {
            OmniBox.log("info", `[4K指南][play] 已添加观看记录: ${historyPayload.title}`);
          } else {
            OmniBox.log("info", `[4K指南][play] 观看记录已存在,跳过添加: ${historyPayload.title}`);
          }
        })
        .catch((error) => {
          OmniBox.log("warn", `[4K指南][play] 添加观看记录失败: ${error.message}`);
        });
    }

    const header = playInfo.header || {};

    await OmniBox.log("info", `[4K指南][play] route=${routeType} share=${shareURL} fileId=${fileId} urls=${urls.length}`);

    return {
      urls,
      header,
      parse: 0,
      jx: 0,
      danmaku: danmakuList};
  } catch (e) {
    await OmniBox.log("error", `[4K指南][play] ${e.message}`);
    return { parse: 0, jx: 0, url: "", urls: [], header: {}, headers: {} };
  }
}

});

_load(1, "多多", function (module, exports, require) {
// @name 多多
// @author
// @description 刮削：支持，弹幕：支持，播放记录：支持
// @dependencies: axios, cheerio
// @version 1.0.2
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/网盘/多多.js

// 引入 OmniBox SDK
const OmniBox = require("omnibox_sdk");
// 引入 cheerio(用于 HTML 解析)
let cheerio;
try {
  cheerio = require("cheerio");
} catch (error) {
  throw new Error("cheerio 模块未找到,请先安装:npm install cheerio");
}
const fs = require("fs");

// ==================== 配置区域 ====================
// 网站地址(可以通过环境变量配置,支持多个域名用;分割)
const WEB_SITE_CONFIG = process.env.WEB_SITE_DUODUO || "https://tv.yydsys.top;https://tv.214521.xyz;https://tv.yydsys.cc;https://yydsys.de5.net;https://duo.hidns.vip";
const WEB_SITES = WEB_SITE_CONFIG.split(';').map(url => url.trim()).filter(url => url);
// 读取环境变量:支持多个网盘类型,用分号分割
const DRIVE_TYPE_CONFIG = (process.env.DRIVE_TYPE_CONFIG || "quark;uc").split(';').map(t => t.trim()).filter(t => t);
// 读取环境变量:线路名称和顺序,用分号分割
const SOURCE_NAMES_CONFIG = (process.env.SOURCE_NAMES_CONFIG || "本地代理;服务端代理;直连").split(';').map(s => s.trim()).filter(s => s);
// ==================== 配置区域结束 ====================

if (WEB_SITES.length === 0) {
  throw new Error("WEB_SITE 配置不能为空");
}

OmniBox.log("info", `配置了 ${WEB_SITES.length} 个域名: ${WEB_SITES.join(', ')}`);

/**
 * 带容灾的请求函数
 */
async function requestWithFailover(path, options = {}) {
  let lastError = null;

  for (let i = 0; i < WEB_SITES.length; i++) {
    const baseUrl = removeTrailingSlash(WEB_SITES[i]);
    const fullUrl = path.startsWith('http') ? path : baseUrl + path;

    try {
      OmniBox.log("info", `尝试请求域名 ${i + 1}/${WEB_SITES.length}: ${fullUrl}`);

      const response = await OmniBox.request(fullUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        ...options,
      });

      if (response.statusCode === 200 && response.body) {
        OmniBox.log("info", `域名 ${baseUrl} 请求成功`);
        return { response, baseUrl };
      } else {
        OmniBox.log("warn", `域名 ${baseUrl} 返回非200状态码: ${response.statusCode}`);
        lastError = new Error(`HTTP ${response.statusCode}`);
      }
    } catch (error) {
      OmniBox.log("warn", `域名 ${baseUrl} 请求失败: ${error.message}`);
      lastError = error;

      if (i < WEB_SITES.length - 1) {
        continue;
      }
    }
  }

  throw lastError || new Error("所有域名请求均失败");
}

function getBaseUrl() {
  return removeTrailingSlash(WEB_SITES[0]);
}

function removeTrailingSlash(url) {
  if (!url) return "";
  return url.replace(/\/+$/, "");
}

// ==================== 自动筛选提取 ====================
const FILTER_KEY_NAME_MAP = {
  class: "类型",
  area: "地区",
  lang: "语言",
  year: "年份",
  letter: "字母",
  by: "排序",
  sort: "排序",
  id: "分类"
};

let autoFiltersCache = {
  data: null,
  expiresAt: 0,
};

function normalizeFilterValueItem(item) {
  if (!item) return null;
  const name = String(item.n || item.name || "").trim();
  const value = String(item.v ?? item.value ?? "").trim();
  if (!name && !value) return null;
  return { name, value };
}

function normalizeFilterGroup(group) {
  if (!group) return null;
  const key = String(group.key || "").trim();
  const name = String(group.n || group.name || "").trim();
  const valuesRaw = Array.isArray(group.v) ? group.v : (Array.isArray(group.value) ? group.value : []);
  const values = valuesRaw.map(normalizeFilterValueItem).filter(Boolean);
  if (!key || values.length === 0) return null;

  return {
    key,
    name: name || FILTER_KEY_NAME_MAP[key] || key,
    init: String(group.init ?? ""),
    value: values,
  };
}

function extractFilterKeyFromHref(href = "") {
  if (!href) return null;
  for (const key of Object.keys(FILTER_KEY_NAME_MAP)) {
    if (href.includes(`${key}/`)) {
      return key;
    }
  }
  if (href.includes("id/")) {
    return "id";
  }
  return null;
}

function extractFilterValueFromHref(href = "", key = "") {
  if (!href || !key) return "";
  const marker = `${key}/`;
  const idx = href.indexOf(marker);
  if (idx < 0) return "";
  const rest = href.substring(idx + marker.length);
  return decodeURIComponent((rest.split('/')[0] || "").split('.')[0] || "");
}

function parseFiltersFromHtml(html = "") {
  if (!html) return [];
  const $ = cheerio.load(html);
  const groups = [];

  const libraryBoxes = $(".library-box.scroll-box").slice(1);
  libraryBoxes.each((_, element) => {
    const links = $(element).find(".library-list a");
    if (!links || links.length === 0) return;

    const firstHref = links.first().attr("href") || "";
    const key = extractFilterKeyFromHref(firstHref);
    if (!key) return;

    const values = [{ name: "全部", value: "" }];
    const dedupe = new Set(["__ALL__"]);

    links.each((__, a) => {
      const href = $(a).attr("href") || "";
      if (!href) return;
      const value = extractFilterValueFromHref(href, key);
      const name = ($(a).text() || "").trim();
      const dedupeKey = `${name}::${value}`;
      if (!name && !value) return;
      if (dedupe.has(dedupeKey)) return;
      dedupe.add(dedupeKey);
      values.push({ name, value });
    });

    if (values.length > 1) {
      groups.push({
        key,
        name: FILTER_KEY_NAME_MAP[key] || key,
        init: "",
        value: values,
      });
    }
  });

  return groups;
}

async function getAutoFiltersByCategory(categoryId) {
  if (!categoryId) return [];
  try {
    const path = `/index.php/vod/show/id/${categoryId}.html`;
    const { response } = await requestWithFailover(path);
    if (response.statusCode !== 200 || !response.body) {
      return [];
    }
    return parseFiltersFromHtml(response.body);
  } catch (error) {
    OmniBox.log("warn", `自动提取分类筛选失败: categoryId=${categoryId}, err=${error.message}`);
    return [];
  }
}

function normalizeStaticFilters(rawFilters) {
  const result = {};
  if (!rawFilters || typeof rawFilters !== "object") return result;

  for (const typeId of Object.keys(rawFilters)) {
    const groups = Array.isArray(rawFilters[typeId]) ? rawFilters[typeId] : [];
    const normalizedGroups = groups.map(normalizeFilterGroup).filter(Boolean);
    if (normalizedGroups.length > 0) {
      result[typeId] = normalizedGroups;
    }
  }
  return result;
}

async function getPreferredFilters(classes = []) {
  const now = Date.now();
  if (autoFiltersCache.data && now < autoFiltersCache.expiresAt) {
    return autoFiltersCache.data;
  }

  const staticFilters = normalizeStaticFilters(await getDynamicFilters());

  let merged = staticFilters;

  // 静态配置为空时才执行自动抓取
  if (Object.keys(staticFilters).length === 0) {
    const autoFilters = {};
    for (const cls of classes) {
      const typeId = String(cls?.type_id || "").trim();
      if (!typeId) continue;
      const groups = await getAutoFiltersByCategory(typeId);
      if (groups.length > 0) {
        autoFilters[typeId] = groups;
      }
    }

    if (Object.keys(autoFilters).length > 0) {
      OmniBox.log("info", `静态配置为空，自动提取筛选成功: ${Object.keys(autoFilters).length} 个分类`);
      merged = autoFilters;
    } else {
      OmniBox.log("warn", "静态配置和自动提取筛选均为空");
    }
  } else {
    OmniBox.log("info", `使用静态配置筛选: ${Object.keys(staticFilters).length} 个分类`);
  }

  autoFiltersCache = {
    data: merged,
    expiresAt: now + 10 * 60 * 1000,
  };

  return merged;
}

function isVideoFile(file) {
  if (!file || !file.file_name) {
    return false;
  }

  const fileName = file.file_name.toLowerCase();
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

async function getAllVideoFiles(shareURL, files, errors = []) {
  if (!files || !Array.isArray(files)) {
    return [];
  }

  const tasks = files.map(async (file) => {
    if (file.file && isVideoFile(file)) {
      return [file];
    } else if (file.dir) {
      const startTime = performance.now();

      try {
        const subFileList = await OmniBox.getDriveFileList(shareURL, file.fid);
        const endTime = performance.now();
        const duration = (endTime - startTime).toFixed(2);

        OmniBox.log("info", `获取目录 [${file.name || file.fid}] 耗时: ${duration}ms`);

        if (subFileList?.files && Array.isArray(subFileList.files)) {
          return await getAllVideoFiles(shareURL, subFileList.files, errors);
        }
        return [];
      } catch (error) {
        const endTime = performance.now();
        const duration = (endTime - startTime).toFixed(2);

        const errorInfo = {
          path: file.name || file.fid,
          fid: file.fid,
          message: error.message,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        };
        errors.push(errorInfo);
        OmniBox.log("warn", `获取子目录失败 [${file.name || file.fid}] 耗时: ${duration}ms, 错误: ${error.message}`);
        return [];
      }
    }
    return [];
  });

  const results = await Promise.all(tasks);
  return results.flat();
}

function formatFileSize(size) {
  if (!size || size <= 0) {
    return "";
  }

  const unit = 1024;
  const units = ["B", "K", "M", "G", "T", "P"];

  if (size < unit) {
    return `${size}B`;
  }

  let exp = 0;
  let sizeFloat = size;
  while (sizeFloat >= unit && exp < units.length - 1) {
    sizeFloat /= unit;
    exp++;
  }

  if (sizeFloat === Math.floor(sizeFloat)) {
    return `${Math.floor(sizeFloat)}${units[exp]}`;
  }
  return `${sizeFloat.toFixed(2)}${units[exp]}`;
}

async function home(params) {
  try {
    OmniBox.log("info", "获取首页数据");

    let classes = [];
    let list = [];

    try {
      const { response, baseUrl } = await requestWithFailover('/');

      if (response.statusCode === 200 && response.body) {
        const $ = cheerio.load(response.body);

        const tabItems = $(".module-tab-items .module-tab-item");
        tabItems.each((_, element) => {
          const $item = $(element);
          const typeId = $item.attr("data-id");
          const typeName = $item.attr("data-name");

          if (typeId && typeId !== "0" && typeName) {
            classes.push({
              type_id: typeId,
              type_name: typeName.trim(),
            });
          }
        });

        OmniBox.log("info", `从首页导航提取到 ${classes.length} 个分类`);

        const firstModule = $(".module");

        if (firstModule.length > 0) {
          const moduleItems = firstModule.find(".module-item");

          moduleItems.each((_, element) => {
            const $item = $(element);
            const href = $item.find(".module-item-pic a").attr("href") || $item.find(".module-item-title").attr("href");
            const vodName = $item.find(".module-item-pic img").attr("alt") || $item.find(".module-item-title").attr("title") || $item.find(".module-item-title").text().trim();

            let vodPic = $item.find(".module-item-pic img").attr("data-src") || $item.find(".module-item-pic img").attr("src");
            if (vodPic && !vodPic.startsWith("http://") && !vodPic.startsWith("https://")) {
              vodPic = baseUrl + vodPic;
            }

            const vodRemarks = $item.find(".module-item-text").text().trim();
            const vodYear = $item.find(".module-item-caption span").first().text().trim();

            if (href && vodName) {
              list.push({
                vod_id: href,
                vod_name: vodName,
                vod_pic: vodPic || "",
                type_id: "",
                type_name: "",
                vod_remarks: vodRemarks || "",
                vod_year: vodYear || "",
              });
            }
          });

          OmniBox.log("info", `从首页提取到 ${list.length} 个影片`);
        }
      }
    } catch (error) {
      OmniBox.log("warn", `从首页提取数据失败: ${error.message}`);
    }

    const currentFilters = await getPreferredFilters(classes);
    return {
      class: classes,
      list: list,
      filters: currentFilters,
    };
  } catch (error) {
    OmniBox.log("error", `获取首页数据失败: ${error.message}`);
  }
}

async function category(params) {
  try {
    const categoryId = params.categoryId || params.type_id || "";
    const page = parseInt(params.page || "1", 10);
    const filters = params.filters || {};

    OmniBox.log("info", `获取分类数据: categoryId=${categoryId}, page=${page}`);

    if (!categoryId) {
      OmniBox.log("warn", "分类ID为空");
      return {
        list: [],
        page: 1,
        pagecount: 0,
        total: 0,
      };
    }

    let url = '/index.php/vod/show';
    if (filters.area) {
      url += `/area/${filters.area}`;
    }
    const sortValue = filters.sort || filters.by;
    if (sortValue) {
      url += `/by/${sortValue}`;
    }
    if (filters.class) {
      url += `/class/${filters.class}`;
    }
    if (filters.lang) {
      url += `/lang/${filters.lang}`;
    }
    if (filters.letter) {
      url += `/letter/${filters.letter}`;
    }
    if (filters.year) {
      url += `/year/${filters.year}`;
    }
    const tidValue = filters.tid || filters.id;
    if (tidValue) {
      url += `/id/${tidValue}.html`;
    } else {
      url += `/id/${categoryId}/page/${page}.html`;
    }

    const { response, baseUrl } = await requestWithFailover(url);

    if (response.statusCode !== 200 || !response.body) {
      OmniBox.log("error", `请求失败: HTTP ${response.statusCode}`);
      return {
        list: [],
        page: page,
        pagecount: 0,
        total: 0,
      };
    }

    const $ = cheerio.load(response.body);
    const videos = [];

    const vodItems = $("#main .module-item");
    vodItems.each((_, e) => {
      const $item = $(e);
      const href = $item.find(".module-item-pic a").attr("href");
      const vodName = $item.find(".module-item-pic img").attr("alt");
      let vodPic = $item.find(".module-item-pic img").attr("data-src");
      if (vodPic && !vodPic.startsWith("http://") && !vodPic.startsWith("https://")) {
        vodPic = baseUrl + vodPic;
      }
      const vodRemarks = $item.find(".module-item-text").text();
      const vodYear = $item.find(".module-item-caption span").first().text();

      if (href && vodName) {
        videos.push({
          vod_id: href,
          vod_name: vodName,
          vod_pic: vodPic || "",
          type_id: categoryId,
          type_name: "",
          vod_remarks: vodRemarks || "",
          vod_year: vodYear || "",
        });
      }
    });

    OmniBox.log("info", `解析完成,找到 ${videos.length} 个视频`);

    const autoFilters = parseFiltersFromHtml(response.body);
    let categoryFilters = autoFilters;

    if (categoryFilters.length === 0) {
      const preferredFilters = await getPreferredFilters([{ type_id: categoryId, type_name: "" }]);
      categoryFilters = preferredFilters[categoryId] || [];
    }

    const result = {
      list: videos,
      page: page,
      pagecount: 0,
      total: videos.length,
    };

    if (page === 1 && categoryFilters.length > 0) {
      result.filters = categoryFilters;
    }

    return result;
  } catch (error) {
    OmniBox.log("error", `获取分类数据失败: ${error.message}`);
    return {
      list: [],
      page: params.page || 1,
      pagecount: 0,
      total: 0,
    };
  }
}

function buildScrapedFileName(scrapeData, mapping, originalFileName) {
  if (!mapping || mapping.episodeNumber === 0 || (mapping.confidence && mapping.confidence < 0.5)) {
    return originalFileName;
  }

  if (scrapeData && scrapeData.episodes && Array.isArray(scrapeData.episodes)) {
    for (const episode of scrapeData.episodes) {
      if (episode.episodeNumber === mapping.episodeNumber && episode.seasonNumber === mapping.seasonNumber) {
        if (episode.name) {
          return `${episode.episodeNumber}.${episode.name}`;
        }
        break;
      }
    }
  }

  return originalFileName;
}

/**
 * 获取视频详情
 */
async function detail(params) {
  try {
    const videoId = params.videoId || "";

    if (!videoId) {
      throw new Error("视频ID不能为空");
    }

    const source = params.source || "";
    OmniBox.log("info", `获取视频详情: videoId=${videoId}, source=${source}`);

    const { response, baseUrl } = await requestWithFailover(videoId);

    if (response.statusCode !== 200 || !response.body) {
      throw new Error(`请求失败: HTTP ${response.statusCode}`);
    }

    const $ = cheerio.load(response.body);

    let vodName = $(".page-title")[0]?.children?.[0]?.data || "";
    let vodPic = $($(".mobile-play")).find(".lazyload")[0]?.attribs?.["data-src"] || "";
    if (vodPic && !vodPic.startsWith("http://") && !vodPic.startsWith("https://")) {
      vodPic = baseUrl + vodPic;
    }

    let vodYear = "";
    let vodDirector = "";
    let vodActor = "";
    let vodContent = "";

    const videoItems = $(".video-info-itemtitle");
    for (const item of videoItems) {
      const key = $(item).text();
      const vItems = $(item).next().find("a");
      const value = vItems
        .map((i, el) => {
          const text = $(el).text().trim();
          return text ? text : null;
        })
        .get()
        .filter(Boolean)
        .join(", ");

      if (key.includes("剧情")) {
        vodContent = $(item).next().find("p").text().trim();
      } else if (key.includes("导演")) {
        vodDirector = value.trim();
      } else if (key.includes("主演")) {
        vodActor = value.trim();
      }
    }

    const panUrls = [];
    const items = $(".module-row-info");
    for (const item of items) {
      const shareUrl = $(item).find("p")[0]?.children?.[0]?.data;
      if (shareUrl) {
        panUrls.push(shareUrl.trim());
      }
    }

    OmniBox.log("info", `解析完成,找到 ${panUrls.length} 个网盘链接`);

    const playSources = [];

    const driveTypeCountMap = {};
    for (const shareURL of panUrls) {
      const driveInfo = await OmniBox.getDriveInfoByShareURL(shareURL);
      const displayName = driveInfo.displayName || "未知网盘";
      driveTypeCountMap[displayName] = (driveTypeCountMap[displayName] || 0) + 1;
    }

    const driveTypeCurrentIndexMap = {};

    // ==================== 并行处理网盘链接 ====================
    const panUrlTasks = panUrls.map(async (shareURL) => {
      try {
        OmniBox.log("info", `处理网盘链接: ${shareURL}`);

        const driveInfo = await OmniBox.getDriveInfoByShareURL(shareURL);
        let displayName = driveInfo.displayName || "未知网盘";

        const totalCount = driveTypeCountMap[displayName] || 0;
        if (totalCount > 1) {
          driveTypeCurrentIndexMap[displayName] = (driveTypeCurrentIndexMap[displayName] || 0) + 1;
          displayName = `${displayName}${driveTypeCurrentIndexMap[displayName]}`;
        }

        OmniBox.log("info", `网盘类型: ${displayName}, driveType: ${driveInfo.driveType}`);

        const fileList = await OmniBox.getDriveFileList(shareURL, "0");
        if (!fileList || !fileList.files || !Array.isArray(fileList.files)) {
          OmniBox.log("warn", `获取文件列表失败: ${shareURL}`);
          return null;
        }

        OmniBox.log("info", `获取文件列表成功,文件数量: ${fileList.files.length}`);

        const allVideoFiles = await getAllVideoFiles(shareURL, fileList.files, "0");

        if (allVideoFiles.length === 0) {
          OmniBox.log("warn", `未找到视频文件: ${shareURL}`);
          return null;
        }

        OmniBox.log("info", `递归获取视频文件完成,视频文件数量: ${allVideoFiles.length}`);

        // 刮削处理
        let scrapingSuccess = false;

        try {
          OmniBox.log("info", `开始执行刮削处理,资源名: ${vodName}, 视频文件数: ${allVideoFiles.length}`);

          const videoFilesForScraping = allVideoFiles.map((file) => {
            const fileId = file.fid || file.file_id || "";
            const formattedFileId = fileId ? `${shareURL}|${fileId}` : fileId;
            return {
              ...file,
              fid: formattedFileId,
              file_id: formattedFileId,
            };
          });

          OmniBox.log("info", `文件ID格式转换完成,示例: ${videoFilesForScraping[0]?.fid || "N/A"}`);

          const scrapingResult = await OmniBox.processScraping(videoId, vodName, vodName, videoFilesForScraping);
          OmniBox.log("info", `刮削处理完成,结果: ${JSON.stringify(scrapingResult).substring(0, 200)}`);
          scrapingSuccess = true;
        } catch (error) {
          OmniBox.log("error", `刮削处理失败: ${error.message}`);
          if (error.stack) {
            OmniBox.log("error", `刮削错误堆栈: ${error.stack}`);
          }
        }

        // 获取刮削后的元数据
        let scrapeData = null;
        let videoMappings = [];
        let scrapeType = "";

        try {
          OmniBox.log("info", `开始获取元数据,resourceId: ${videoId}`);
          const metadata = await OmniBox.getScrapeMetadata(videoId);
          OmniBox.log("info", `获取元数据响应: ${JSON.stringify(metadata).substring(0, 500)}`);

          scrapeData = metadata.scrapeData || null;
          videoMappings = metadata.videoMappings || [];
          scrapeType = metadata.scrapeType || "";

          if (scrapeData) {
            OmniBox.log("info", `获取到刮削数据,标题: ${scrapeData.title || "未知"}, 类型: ${scrapeType || "未知"}, 映射数量: ${videoMappings.length}`);
          } else {
            OmniBox.log("warn", `未获取到刮削数据,映射数量: ${videoMappings.length}`);
          }
        } catch (error) {
          OmniBox.log("error", `获取元数据失败: ${error.message}`);
          if (error.stack) {
            OmniBox.log("error", `获取元数据错误堆栈: ${error.stack}`);
          }
        }

        return {
          shareURL,
          displayName,
          driveInfo,
          allVideoFiles,
          scrapeData,
          videoMappings,
          scrapeType
        };

      } catch (error) {
        OmniBox.log("error", `处理网盘链接失败: ${shareURL}, 错误: ${error.message}`);
        return null;
      }
    });

    // 等待所有网盘链接并行处理完成
    const panUrlResults = await Promise.all(panUrlTasks);

    // 处理结果并构建播放源
    for (const result of panUrlResults) {
      if (!result) continue;

      const { shareURL, displayName, driveInfo, allVideoFiles, scrapeData, videoMappings, scrapeType } = result;

      let sourceNames = [displayName];
      const targetDriveTypes = DRIVE_TYPE_CONFIG;
      const configSourceNames = SOURCE_NAMES_CONFIG;

      if (targetDriveTypes.includes(driveInfo.driveType)) {
        sourceNames = [...configSourceNames];
        OmniBox.log("info", `${displayName} 匹配成功,线路设置为: ${sourceNames.join(", ")}`);

        if (source === "web") {
          sourceNames = sourceNames.filter((name) => name !== "本地代理");
          OmniBox.log("info", `来源为网页端,已过滤线路`);
        }
      }

      for (const sourceName of sourceNames) {
        const episodes = [];
        for (const file of allVideoFiles) {
          let fileName = file.file_name || "";
          const fileId = file.fid || "";
          const fileSize = file.size || file.file_size || 0;

          if (!fileName || !fileId) {
            continue;
          }

          const formattedFileId = fileId ? `${shareURL}|${fileId}|${videoId}` : "";

          let matchedMapping = null;
          if (scrapeData && videoMappings && Array.isArray(videoMappings) && videoMappings.length > 0) {
            for (const mapping of videoMappings) {
              if (mapping && mapping.fileId === formattedFileId) {
                matchedMapping = mapping;
                const newFileName = buildScrapedFileName(scrapeData, mapping, fileName);
                if (newFileName && newFileName !== fileName) {
                  fileName = newFileName;
                  OmniBox.log("info", `应用刮削文件名: ${file.file_name} -> ${fileName}`);
                }
                break;
              }
            }
          }

          let displayFileName = fileName;
          if (fileSize > 0) {
            const fileSizeStr = formatFileSize(fileSize);
            if (fileSizeStr) {
              displayFileName = `[${fileSizeStr}] ${fileName}`;
            }
          }

          const episode = {
            name: displayFileName,
            playId: `${shareURL}|${fileId}`,
            size: fileSize > 0 ? fileSize : undefined,
          };

          if (matchedMapping) {
            if (matchedMapping.seasonNumber !== undefined && matchedMapping.seasonNumber !== null) {
              episode._seasonNumber = matchedMapping.seasonNumber;
            }
            if (matchedMapping.episodeNumber !== undefined && matchedMapping.episodeNumber !== null) {
              episode._episodeNumber = matchedMapping.episodeNumber;
            }
            if (matchedMapping.episodeName) {
              episode.episodeName = matchedMapping.episodeName;
            }
            if (matchedMapping.episodeOverview) {
              episode.episodeOverview = matchedMapping.episodeOverview;
            }
            if (matchedMapping.episodeAirDate) {
              episode.episodeAirDate = matchedMapping.episodeAirDate;
            }
            if (matchedMapping.episodeStillPath) {
              episode.episodeStillPath = matchedMapping.episodeStillPath;
            }
            if (matchedMapping.episodeVoteAverage !== undefined && matchedMapping.episodeVoteAverage !== null) {
              episode.episodeVoteAverage = matchedMapping.episodeVoteAverage;
            }
            if (matchedMapping.episodeRuntime !== undefined && matchedMapping.episodeRuntime !== null) {
              episode.episodeRuntime = matchedMapping.episodeRuntime;
            }
          }

          episodes.push(episode);
        }

        if (scrapeData && episodes.length > 0) {
          const hasEpisodeNumber = episodes.some((ep) => ep._episodeNumber !== undefined);
          if (hasEpisodeNumber) {
            OmniBox.log("info", `检测到刮削数据,按 episodeNumber 排序剧集列表,共 ${episodes.length} 集`);
            episodes.sort((a, b) => {
              const seasonA = a._seasonNumber !== undefined ? a._seasonNumber : 0;
              const seasonB = b._seasonNumber !== undefined ? b._seasonNumber : 0;
              if (seasonA !== seasonB) {
                return seasonA - seasonB;
              }
              const episodeA = a._episodeNumber !== undefined ? a._episodeNumber : 0;
              const episodeB = b._episodeNumber !== undefined ? b._episodeNumber : 0;
              return episodeA - episodeB;
            });
          }
        }

        if (episodes.length > 0) {
          let finalSourceName = sourceName;
          if (DRIVE_TYPE_CONFIG.includes(driveInfo.driveType)) {
            finalSourceName = `${displayName}-${sourceName}`;
          }

          playSources.push({
            name: finalSourceName,
            episodes: episodes,
          });
        }
      }

      // 使用刮削数据更新详情
      if (scrapeData) {
        if (scrapeData.title) {
          vodName = scrapeData.title;
        }
        if (scrapeData.posterPath) {
          vodPic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
        }
        if (scrapeData.releaseDate) {
          vodYear = scrapeData.releaseDate.substring(0, 4) || vodYear;
        }
        if (scrapeData.overview) {
          vodContent = scrapeData.overview;
        }

        if (scrapeData.credits) {
          if (scrapeData.credits.cast && Array.isArray(scrapeData.credits.cast)) {
            const actors = scrapeData.credits.cast
              .slice(0, 5)
              .map((cast) => cast.name || "")
              .filter((name) => name)
              .join(",");
            if (actors) {
              vodActor = actors;
            }
          }
          if (scrapeData.credits.crew && Array.isArray(scrapeData.credits.crew)) {
            const directors = scrapeData.credits.crew.filter((crew) => crew.job === "Director" || crew.department === "Directing");
            if (directors.length > 0) {
              const directorNames = directors
                .slice(0, 3)
                .map((director) => director.name || "")
                .filter((name) => name)
                .join(",");
              if (directorNames) {
                vodDirector = directorNames;
              }
            }
          }
        }
      }
    }

    OmniBox.log("info", `构建播放源完成,网盘数量: ${playSources.length}`);

    const vodDetail = {
      vod_id: videoId,
      vod_name: vodName,
      vod_pic: vodPic,
      vod_year: vodYear,
      vod_director: vodDirector,
      vod_actor: vodActor,
      vod_content: vodContent || `网盘资源,共${panUrls.length}个网盘链接`,
      vod_play_sources: playSources.length > 0 ? playSources : undefined,
      vod_remarks: "",
    };

    return {
      list: [vodDetail],
    };
  } catch (error) {
    OmniBox.log("error", `获取视频详情失败: ${error.message}`);
    return {
      list: [],
    };
  }
}

/**
 * 搜索视频
 */
async function search(params) {
  try {
    const keyword = params.keyword || "";
    const page = parseInt(params.page || "1", 10);

    OmniBox.log("info", `搜索视频: keyword=${keyword}, page=${page}`);

    if (!keyword) {
      OmniBox.log("warn", "搜索关键词为空");
      return {
        list: [],
        page: 1,
        pagecount: 0,
        total: 0,
      };
    }

    const searchPath = `/index.php/vod/search/page/${page}/wd/${keyword}.html`;
    const { response, baseUrl } = await requestWithFailover(searchPath);

    if (response.statusCode !== 200 || !response.body) {
      OmniBox.log("error", `请求失败: HTTP ${response.statusCode}`);
      return {
        list: [],
        page: page,
        pagecount: 0,
        total: 0,
      };
    }

    const $ = cheerio.load(response.body);
    const videos = [];

    const items = $(".module-search-item");
    for (const item of items) {
      const $item = $(item);
      const videoSerial = $item.find(".video-serial")[0];
      const vodPicImg = $item.find(".module-item-pic > img")[0];

      if (videoSerial && videoSerial.attribs) {
        const vodId = videoSerial.attribs.href || "";
        const vodName = videoSerial.attribs.title || "";
        let vodPic = vodPicImg?.attribs?.["data-src"] || "";
        if (vodPic && !vodPic.startsWith("http://") && !vodPic.startsWith("https://")) {
          vodPic = baseUrl + vodPic;
        }
        const vodRemarks = $($item.find(".video-serial")[0]).text() || "";

        if (vodId && vodName) {
          videos.push({
            vod_id: vodId,
            vod_name: vodName,
            vod_pic: vodPic,
            type_id: "",
            type_name: "",
            vod_remarks: vodRemarks,
          });
        }
      }
    }

    OmniBox.log("info", `搜索完成,找到 ${videos.length} 个结果`);

    return {
      list: videos,
      page: page,
      pagecount: 0,
      total: videos.length,
    };
  } catch (error) {
    OmniBox.log("error", `搜索视频失败: ${error.message}`);
    return {
      list: [],
      page: params.page || 1,
      pagecount: 0,
      total: 0,
    };
  }
}

async function play(params) {
  try {
    const flag = params.flag || "";
    const playId = params.playId || "";
    const source = params.source || "";

    OmniBox.log("info", `获取播放地址: flag=${flag}, playId=${playId}`);

    if (!playId) {
      throw new Error("播放参数不能为空");
    }

    const parts = playId.split("|");
    if (parts.length < 2) {
      throw new Error("播放参数格式错误,应为:分享链接|文件ID");
    }
    const shareURL = parts[0] || "";
    const fileId = parts[1] || "";
    const videoId = parts[2] || "";

    if (!shareURL || !fileId) {
      throw new Error("分享链接或文件ID不能为空");
    }

    OmniBox.log("info", `解析参数: shareURL=${shareURL}, fileId=${fileId}`);

    let danmakuList = [];
    let scrapeTitle = "";
    let scrapePic = "";
    let episodeNumber = null;
    let episodeName = params.episodeName || "";

    try {
      // 优先使用视频ID维度读取刮削元数据，与 detail 阶段保持一致
      let metadata = null;
      if (params.vodId) {
        metadata = await OmniBox.getScrapeMetadata(params.vodId);
      }
      if (!metadata || (!metadata.scrapeData && !metadata.videoMappings)) {
        metadata = await OmniBox.getScrapeMetadata(shareURL);
      }

      if (metadata && metadata.scrapeData && metadata.videoMappings) {
        const formattedFileId = fileId ? `${shareURL}|${fileId}|${videoId}` : "";

        let matchedMapping = null;
        for (const mapping of metadata.videoMappings) {
          if (mapping.fileId === formattedFileId) {
            matchedMapping = mapping;
            break;
          }
        }

        if (matchedMapping && metadata.scrapeData) {
          const scrapeData = metadata.scrapeData;
          OmniBox.log("info", `找到文件映射,fileId: ${formattedFileId}`);

          scrapeTitle = scrapeData.title || "";
          if (scrapeData.posterPath) {
            scrapePic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
          }

          if (matchedMapping.episodeNumber) {
            episodeNumber = matchedMapping.episodeNumber;
          }
          if (matchedMapping.episodeName && !episodeName) {
            episodeName = matchedMapping.episodeName;
          }

          let fileName = "";
          const scrapeType = metadata.scrapeType || "";
          if (scrapeType === "movie") {
            fileName = scrapeData.title || "";
          } else {
            const title = scrapeData.title || "";
            const seasonAirYear = scrapeData.seasonAirYear || "";
            const seasonNumber = matchedMapping.seasonNumber || 1;
            const episodeNum = matchedMapping.episodeNumber || 1;
            fileName = `${title}.${seasonAirYear}.S${String(seasonNumber).padStart(2, "0")}E${String(episodeNum).padStart(2, "0")}`;
          }

          if (fileName) {
            OmniBox.log("info", `生成fileName用于弹幕匹配: ${fileName}`);
            danmakuList = await OmniBox.getDanmakuByFileName(fileName);
            if (danmakuList && danmakuList.length > 0) {
              OmniBox.log("info", `弹幕匹配成功,找到 ${danmakuList.length} 条弹幕`);
            }
          }
        }
      }
    } catch (error) {
      OmniBox.log("warn", `弹幕匹配失败: ${error.message}`);
    }

    let routeType = source === "web" ? "服务端代理" : "直连";
    if (flag && flag.includes("-")) {
      const parts = flag.split("-");
      routeType = parts[parts.length - 1];
    }

    OmniBox.log("info", `使用线路: ${routeType}`);

    const playInfo = await OmniBox.getDriveVideoPlayInfo(shareURL, fileId, routeType);

    if (!playInfo || !playInfo.url || !Array.isArray(playInfo.url) || playInfo.url.length === 0) {
      throw new Error("无法获取播放地址");
    }

    try {
      const vodId = params.vodId || shareURL;
      if (vodId) {
        const title = params.title || scrapeTitle || shareURL;
        const pic = params.pic || scrapePic || "";

        const added = await OmniBox.addPlayHistory({
          vodId: vodId,
          title: title,
          pic: pic,
          episode: playId,
          sourceId: shareURL,
          episodeNumber: episodeNumber,
          episodeName: episodeName,
        });

        if (added) {
          OmniBox.log("info", `已添加观看记录: ${title}`);
        } else {
          OmniBox.log("info", `观看记录已存在,跳过添加: ${title}`);
        }
      }
    } catch (error) {
      OmniBox.log("warn", `添加观看记录失败: ${error.message}`);
    }

    const urlList = playInfo.url || [];

    let urlsResult = [];
    for (const item of urlList) {
      urlsResult.push({
        name: item.name || "播放",
        url: item.url,
      });
    }

    let header = playInfo.header || {};

    let finalDanmakuList = danmakuList && danmakuList.length > 0 ? danmakuList : playInfo.danmaku || [];

    return {
      urls: urlsResult,
      header: header,
      parse: 0,
      danmaku: finalDanmakuList};
  } catch (error) {
    OmniBox.log("error", `播放接口失败: ${error.message}`);
    return {
      urls: [],
      header: {},
      danmaku: []};
  }
}

async function getDynamicFilters() {
  return {
    "1": [
      {
        "key": "class",
        "name": "剧情",
        "init": "",
        "value": [
          {
            "name": "全部剧情",
            "value": ""
          },
          {
            "name": "喜剧",
            "value": "喜剧"
          },
          {
            "name": "爱情",
            "value": "爱情"
          },
          {
            "name": "恐怖",
            "value": "恐怖"
          },
          {
            "name": "动作",
            "value": "动作"
          },
          {
            "name": "科幻",
            "value": "科幻"
          },
          {
            "name": "剧情",
            "value": "剧情"
          },
          {
            "name": "战争",
            "value": "战争"
          },
          {
            "name": "警匪",
            "value": "警匪"
          },
          {
            "name": "犯罪",
            "value": "犯罪"
          },
          {
            "name": "古装",
            "value": "古装"
          },
          {
            "name": "奇幻",
            "value": "奇幻"
          },
          {
            "name": "武侠",
            "value": "武侠"
          },
          {
            "name": "冒险",
            "value": "冒险"
          },
          {
            "name": "枪战",
            "value": "枪战"
          },
          {
            "name": "悬疑",
            "value": "悬疑"
          },
          {
            "name": "惊悚",
            "value": "惊悚"
          },
          {
            "name": "青春",
            "value": "青春"
          },
          {
            "name": "历史",
            "value": "历史"
          }
        ]
      },
      {
        "key": "area",
        "name": "地区",
        "init": "",
        "value": [
          {
            "name": "全部地区",
            "value": ""
          },
          {
            "name": "中国大陆",
            "value": "中国大陆"
          },
          {
            "name": "中国香港",
            "value": "中国香港"
          },
          {
            "name": "中国台湾",
            "value": "中国台湾"
          },
          {
            "name": "美国",
            "value": "美国"
          },
          {
            "name": "法国",
            "value": "法国"
          },
          {
            "name": "英国",
            "value": "英国"
          },
          {
            "name": "日本",
            "value": "日本"
          },
          {
            "name": "韩国",
            "value": "韩国"
          },
          {
            "name": "德国",
            "value": "德国"
          },
          {
            "name": "泰国",
            "value": "泰国"
          },
          {
            "name": "印度",
            "value": "印度"
          },
          {
            "name": "其他",
            "value": "其他"
          }
        ]
      },
      {
        "key": "lang",
        "name": "语言",
        "init": "",
        "value": [
          {
            "name": "全部语言",
            "value": ""
          },
          {
            "name": "国语",
            "value": "国语"
          },
          {
            "name": "英语",
            "value": "英语"
          },
          {
            "name": "粤语",
            "value": "粤语"
          },
          {
            "name": "闽南语",
            "value": "闽南语"
          },
          {
            "name": "韩语",
            "value": "韩语"
          },
          {
            "name": "日语",
            "value": "日语"
          },
          {
            "name": "其它",
            "value": "其它"
          }
        ]
      },
      {
        "key": "year",
        "name": "时间",
        "init": "",
        "value": [
          {
            "name": "全部时间",
            "value": ""
          },
          {
            "name": "2026",
            "value": "2026"
          },
          {
            "name": "2025",
            "value": "2025"
          },
          {
            "name": "2024",
            "value": "2024"
          },
          {
            "name": "2023",
            "value": "2023"
          },
          {
            "name": "2022",
            "value": "2022"
          },
          {
            "name": "2021",
            "value": "2021"
          },
          {
            "name": "2020",
            "value": "2020"
          },
          {
            "name": "2019",
            "value": "2019"
          },
          {
            "name": "2018",
            "value": "2018"
          },
          {
            "name": "2017",
            "value": "2017"
          },
          {
            "name": "2016",
            "value": "2016"
          },
          {
            "name": "2015",
            "value": "2015"
          },
          {
            "name": "2014",
            "value": "2014"
          },
          {
            "name": "2013",
            "value": "2013"
          },
          {
            "name": "2012",
            "value": "2012"
          },
          {
            "name": "2011",
            "value": "2011"
          },
          {
            "name": "2010",
            "value": "2010"
          }
        ]
      },
      {
        "key": "letter",
        "name": "字母",
        "init": "",
        "value": [
          {
            "name": "字母查找",
            "value": ""
          },
          {
            "name": "A",
            "value": "A"
          },
          {
            "name": "B",
            "value": "B"
          },
          {
            "name": "C",
            "value": "C"
          },
          {
            "name": "D",
            "value": "D"
          },
          {
            "name": "E",
            "value": "E"
          },
          {
            "name": "F",
            "value": "F"
          },
          {
            "name": "G",
            "value": "G"
          },
          {
            "name": "H",
            "value": "H"
          },
          {
            "name": "I",
            "value": "I"
          },
          {
            "name": "J",
            "value": "J"
          },
          {
            "name": "K",
            "value": "K"
          },
          {
            "name": "L",
            "value": "L"
          },
          {
            "name": "M",
            "value": "M"
          },
          {
            "name": "name",
            "value": "name"
          },
          {
            "name": "O",
            "value": "O"
          },
          {
            "name": "P",
            "value": "P"
          },
          {
            "name": "Q",
            "value": "Q"
          },
          {
            "name": "R",
            "value": "R"
          },
          {
            "name": "S",
            "value": "S"
          },
          {
            "name": "T",
            "value": "T"
          },
          {
            "name": "U",
            "value": "U"
          },
          {
            "name": "value",
            "value": "value"
          },
          {
            "name": "W",
            "value": "W"
          },
          {
            "name": "X",
            "value": "X"
          },
          {
            "name": "Y",
            "value": "Y"
          },
          {
            "name": "Z",
            "value": "Z"
          },
          {
            "name": "0-9",
            "value": "0-9"
          }
        ]
      },
      {
        "key": "sort",
        "name": "排序",
        "init": "",
        "value": [
          {
            "name": "时间排序",
            "value": ""
          },
          {
            "name": "人气排序",
            "value": "hits"
          },
          {
            "name": "评分排序",
            "value": "score"
          }
        ]
      }
    ],
    "2": [
      {
        "key": "class",
        "name": "剧情",
        "init": "",
        "value": [
          {
            "name": "全部剧情",
            "value": ""
          },
          {
            "name": "喜剧",
            "value": "喜剧"
          },
          {
            "name": "爱情",
            "value": "爱情"
          },
          {
            "name": "动作",
            "value": "动作"
          },
          {
            "name": "科幻",
            "value": "科幻"
          },
          {
            "name": "剧情",
            "value": "剧情"
          },
          {
            "name": "战争",
            "value": "战争"
          },
          {
            "name": "警匪",
            "value": "警匪"
          },
          {
            "name": "犯罪",
            "value": "犯罪"
          },
          {
            "name": "古装",
            "value": "古装"
          },
          {
            "name": "奇幻",
            "value": "奇幻"
          },
          {
            "name": "武侠",
            "value": "武侠"
          },
          {
            "name": "悬疑",
            "value": "悬疑"
          },
          {
            "name": "惊悚",
            "value": "惊悚"
          },
          {
            "name": "经典",
            "value": "经典"
          },
          {
            "name": "青春",
            "value": "青春"
          },
          {
            "name": "年代",
            "value": "年代"
          },
          {
            "name": "历史",
            "value": "历史"
          }
        ]
      },
      {
        "key": "area",
        "name": "地区",
        "init": "",
        "value": [
          {
            "name": "全部地区",
            "value": ""
          },
          {
            "name": "中国大陆",
            "value": "中国大陆"
          },
          {
            "name": "韩国",
            "value": "韩国"
          },
          {
            "name": "日本",
            "value": "日本"
          },
          {
            "name": "美国",
            "value": "美国"
          },
          {
            "name": "中国香港",
            "value": "中国香港"
          },
          {
            "name": "中国台湾",
            "value": "中国台湾"
          },
          {
            "name": "英国",
            "value": "英国"
          },
          {
            "name": "泰国",
            "value": "泰国"
          },
          {
            "name": "其他",
            "value": "其他"
          }
        ]
      },
      {
        "key": "year",
        "name": "时间",
        "init": "",
        "value": [
          {
            "name": "全部时间",
            "value": ""
          },
          {
            "name": "2026",
            "value": "2026"
          },
          {
            "name": "2025",
            "value": "2025"
          },
          {
            "name": "2024",
            "value": "2024"
          },
          {
            "name": "2023",
            "value": "2023"
          },
          {
            "name": "2022",
            "value": "2022"
          },
          {
            "name": "2021",
            "value": "2021"
          },
          {
            "name": "2020",
            "value": "2020"
          },
          {
            "name": "2019",
            "value": "2019"
          }
        ]
      },
      {
        "key": "letter",
        "name": "字母",
        "init": "",
        "value": [
          {
            "name": "字母查找",
            "value": ""
          },
          {
            "name": "A",
            "value": "A"
          },
          {
            "name": "B",
            "value": "B"
          },
          {
            "name": "C",
            "value": "C"
          },
          {
            "name": "D",
            "value": "D"
          },
          {
            "name": "E",
            "value": "E"
          },
          {
            "name": "F",
            "value": "F"
          },
          {
            "name": "G",
            "value": "G"
          },
          {
            "name": "H",
            "value": "H"
          },
          {
            "name": "I",
            "value": "I"
          },
          {
            "name": "J",
            "value": "J"
          },
          {
            "name": "K",
            "value": "K"
          },
          {
            "name": "L",
            "value": "L"
          },
          {
            "name": "M",
            "value": "M"
          },
          {
            "name": "name",
            "value": "name"
          },
          {
            "name": "O",
            "value": "O"
          },
          {
            "name": "P",
            "value": "P"
          },
          {
            "name": "Q",
            "value": "Q"
          },
          {
            "name": "R",
            "value": "R"
          },
          {
            "name": "S",
            "value": "S"
          },
          {
            "name": "T",
            "value": "T"
          },
          {
            "name": "U",
            "value": "U"
          },
          {
            "name": "value",
            "value": "value"
          },
          {
            "name": "W",
            "value": "W"
          },
          {
            "name": "X",
            "value": "X"
          },
          {
            "name": "Y",
            "value": "Y"
          },
          {
            "name": "Z",
            "value": "Z"
          },
          {
            "name": "0-9",
            "value": "0-9"
          }
        ]
      },
      {
        "key": "sort",
        "name": "排序",
        "init": "",
        "value": [
          {
            "name": "时间排序",
            "value": ""
          },
          {
            "name": "人气排序",
            "value": "hits"
          },
          {
            "name": "评分排序",
            "value": "score"
          }
        ]
      }
    ],
    "4": [
      {
        "key": "class",
        "name": "剧情",
        "init": "",
        "value": [
          {
            "name": "全部剧情",
            "value": ""
          },
          {
            "name": "情感",
            "value": "情感"
          },
          {
            "name": "科幻",
            "value": "科幻"
          },
          {
            "name": "热血",
            "value": "热血"
          },
          {
            "name": "推理",
            "value": "推理"
          },
          {
            "name": "搞笑",
            "value": "搞笑"
          },
          {
            "name": "冒险",
            "value": "冒险"
          },
          {
            "name": "校园",
            "value": "校园"
          },
          {
            "name": "动作",
            "value": "动作"
          },
          {
            "name": "机战",
            "value": "机战"
          },
          {
            "name": "运动",
            "value": "运动"
          },
          {
            "name": "少年",
            "value": "少年"
          },
          {
            "name": "少女",
            "value": "少女"
          },
          {
            "name": "亲子",
            "value": "亲子"
          },
          {
            "name": "励志",
            "value": "励志"
          }
        ]
      },
      {
        "key": "area",
        "name": "地区",
        "init": "",
        "value": [
          {
            "name": "全部地区",
            "value": ""
          },
          {
            "name": "中国大陆",
            "value": "中国大陆"
          },
          {
            "name": "日本",
            "value": "日本"
          },
          {
            "name": "美国",
            "value": "美国"
          },
          {
            "name": "其他",
            "value": "其他"
          }
        ]
      },
      {
        "key": "sort",
        "name": "排序",
        "init": "",
        "value": [
          {
            "name": "时间排序",
            "value": ""
          },
          {
            "name": "人气排序",
            "value": "hits"
          }
        ]
      }
    ],
    "5": [
      {
        "key": "class",
        "name": "剧情",
        "init": "",
        "value": [
          {
            "name": "全部剧情",
            "value": ""
          },
          {
            "name": "爽文",
            "value": "爽文"
          },
          {
            "name": "都市",
            "value": "都市"
          },
          {
            "name": "古装",
            "value": "古装"
          },
          {
            "name": "穿越",
            "value": "穿越"
          },
          {
            "name": "逆袭",
            "value": "逆袭"
          },
          {
            "name": "虐恋",
            "value": "虐恋"
          }
        ]
      },
      {
        "key": "sort",
        "name": "排序",
        "init": "",
        "value": [
          {
            "name": "时间排序",
            "value": ""
          },
          {
            "name": "人气排序",
            "value": "hits"
          }
        ]
      }
    ],
    "3": [
      {
        "key": "class",
        "name": "剧情",
        "init": "",
        "value": [
          {
            "name": "全部剧情",
            "value": ""
          },
          {
            "name": "真人秀",
            "value": "真人秀"
          },
          {
            "name": "选秀",
            "value": "选秀"
          },
          {
            "name": "情感",
            "value": "情感"
          },
          {
            "name": "访谈",
            "value": "访谈"
          },
          {
            "name": "播报",
            "value": "播报"
          },
          {
            "name": "旅游",
            "value": "旅游"
          },
          {
            "name": "音乐",
            "value": "音乐"
          },
          {
            "name": "美食",
            "value": "美食"
          }
        ]
      },
      {
        "key": "area",
        "name": "地区",
        "init": "",
        "value": [
          {
            "name": "全部地区",
            "value": ""
          },
          {
            "name": "中国大陆",
            "value": "中国大陆"
          },
          {
            "name": "韩国",
            "value": "韩国"
          },
          {
            "name": "中国台湾",
            "value": "中国台湾"
          },
          {
            "name": "中国香港",
            "value": "中国香港"
          }
        ]
      },
      {
        "key": "sort",
        "name": "排序",
        "init": "",
        "value": [
          {
            "name": "时间排序",
            "value": ""
          },
          {
            "name": "人气排序",
            "value": "hits"
          }
        ]
      }
    ],
    "20": [
      {
        "key": "class",
        "name": "剧情",
        "init": "",
        "value": [
          {
            "name": "全部剧情",
            "value": ""
          },
          {
            "name": "纪录",
            "value": "纪录"
          },
          {
            "name": "传记",
            "value": "传记"
          },
          {
            "name": "历史",
            "value": "历史"
          },
          {
            "name": "自然",
            "value": "自然"
          },
          {
            "name": "科学",
            "value": "科学"
          }
        ]
      },
      {
        "key": "letter",
        "name": "字母",
        "init": "",
        "value": [
          {
            "name": "字母查找",
            "value": ""
          },
          {
            "name": "A",
            "value": "A"
          },
          {
            "name": "B",
            "value": "B"
          },
          {
            "name": "C",
            "value": "C"
          },
          {
            "name": "D",
            "value": "D"
          },
          {
            "name": "E",
            "value": "E"
          },
          {
            "name": "F",
            "value": "F"
          },
          {
            "name": "G",
            "value": "G"
          },
          {
            "name": "H",
            "value": "H"
          },
          {
            "name": "I",
            "value": "I"
          },
          {
            "name": "J",
            "value": "J"
          },
          {
            "name": "K",
            "value": "K"
          },
          {
            "name": "L",
            "value": "L"
          },
          {
            "name": "M",
            "value": "M"
          },
          {
            "name": "name",
            "value": "name"
          },
          {
            "name": "O",
            "value": "O"
          },
          {
            "name": "P",
            "value": "P"
          },
          {
            "name": "Q",
            "value": "Q"
          },
          {
            "name": "R",
            "value": "R"
          },
          {
            "name": "S",
            "value": "S"
          },
          {
            "name": "T",
            "value": "T"
          },
          {
            "name": "U",
            "value": "U"
          },
          {
            "name": "value",
            "value": "value"
          },
          {
            "name": "W",
            "value": "W"
          },
          {
            "name": "X",
            "value": "X"
          },
          {
            "name": "Y",
            "value": "Y"
          },
          {
            "name": "Z",
            "value": "Z"
          },
          {
            "name": "0-9",
            "value": "0-9"
          }
        ]
      },
      {
        "key": "sort",
        "name": "排序",
        "init": "",
        "value": [
          {
            "name": "时间排序",
            "value": ""
          },
          {
            "name": "人气排序",
            "value": "hits"
          }
        ]
      }
    ]
  };
}

module.exports = {
  home,
  category,
  search,
  detail,
  play,
};

const runner = require("spider_runner");
runner.run(module.exports);

});

_load(2, "玩偶聚合", function (module, exports, require) {
// @name 玩偶聚合
// @author @lucky_TJQ
// @description 聚合玩偶、木偶、蜡笔、闪电、至臻、二小、虎斑、快映、欧哥、多多、蜗牛4K等网盘站点；支持刮削、弹幕、多线路、二级分类筛选、翻页、网盘排序
// @dependencies axios,cheerio
// @version 1.2.5
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/网盘/玩偶聚合.js

const OmniBox = require("omnibox_sdk");
const cheerio = require("cheerio");
const axios = require("axios");
const https = require("https");
const runner = require("spider_runner");

// 先导出再交给 runner
module.exports = {
  home,
  category,
  search,
  detail,
  play,
  login,
  logout,
  getLoginStatus,
  setCookies: setCookiesFromString,
};
runner.run(module.exports);

// ==================== 配置区域 ====================
const FILTER_CONFIG_BASE_URL = "https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/%E9%85%8D%E7%BD%AE/%E7%AD%9B%E9%80%89";

// 网盘线路优先级（从高到低）
const LINE_ORDER = ["baidu", "a139", "a189", "a123", "a115", "quark", "xunlei", "ali", "uc"];

// 详情页播放线路显示排序（参考木偶，可由环境变量覆盖）
const DRIVE_ORDER = (process.env.DRIVE_ORDER || "baidu;a139;a189;a123;a115;quark;xunlei;ali;uc")
  .split(";")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// 播放线路名称（可由环境变量覆盖）
const SOURCE_NAMES_CONFIG = (process.env.SOURCE_NAMES_CONFIG || "本地代理;服务端代理;直连")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

// 多线路网盘类型（可由环境变量覆盖，仅这些类型生成多条播放线路）
const DRIVE_TYPE_CONFIG = (process.env.DRIVE_TYPE_CONFIG || "quark;uc")
  .split(";")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// 刮削开关（默认开启，设置环境变量 ENABLE_SCRAPE=0 关闭）
const ENABLE_SCRAPE = process.env.ENABLE_SCRAPE !== "0";

// 详情链路缓存时间（秒），默认 12 小时
const WANOU_CACHE_EX_SECONDS = Number(process.env.WANOU_CACHE_EX_SECONDS || 43200);

const PAGE_SIZE = 20;
const REQUEST_TIMEOUT = 15000;
// 蜗牛网盘 API 请求限流（毫秒），避免触发风控
const WONIU4K_DRIVE_API_DELAY_MS = Math.max(0, parseInt(process.env.WONIU4K_DRIVE_DELAY || "1500", 10));
const WONIU4K_USERNAME = String(process.env.WONIU4K_USERNAME || process.env.WONIU4K_USER || "").trim();
const WONIU4K_PASSWORD = String(process.env.WONIU4K_PASSWORD || process.env.WONIU4K_PASS || "").trim();
const WONIU4K_COOKIE = String(process.env.WONIU4K_COOKIE || process.env.WONIU4K_COOKIES || "").trim();

// ==================== 站点域名配置 ====================
const WOGG_SITES = splitSites(process.env.WEB_SITE_WOGG || "https://wogg.xxooo.cf;https://wogg.333232.xyz;https://www.wogg.net;");
const MUOU_SITES = splitSites(process.env.WEB_SITE_MUOU || "https://www.muou.site;https://www.muou.asia;https://666.666291.xyz;");
const LABI_SITES = splitSites(process.env.WEB_SITE_LABI || "http://fmao.shop;");
const ZHIZHEN_SITES = splitSites(process.env.WEB_SITE_ZHIZHEN || "http://www.miqk.cc;https://www.mihdr.top;https://mihdr.top;");
const ERXIAO_SITES = splitSites(process.env.WEB_SITE_ERXIAO || "https://www.2xiaopan.top;https://www.erixaopan.fun;https://2xiaopan.top;https://www.wexwp.cc;");
const HUBAN_SITES = splitSites(process.env.WEB_SITE_HUBAN || "http://38.76.197.172:16969;http://154.222.27.33:20720;http://xhban.xyz:20720;http://103.45.162.207:20720;");
const KUAIYING_SITES = splitSites(process.env.WEB_SITE_XIAOBAN || " http://38.76.197.172:12521;http://154.201.83.50:12512;http://xsayang.fun:12512;");
const SHANDIAN_SITES = splitSites(process.env.WEB_SITE_SHANDIAN || "https://sd.sduc.site;");
const OUGE_SITES = splitSites(process.env.WEB_SITE_OUGE || "https://woog.nxog.eu.org;");
const DUODUO_SITES = splitSites(process.env.WEB_SITE_DUODUO || "https://tv.yydsys.top;https://tv.214521.xyz;https://tv.yydsys.cc;https://yydsys.de5.net;https://duo.hidns.vip;");
const WONIU4K_SITES = splitSites(process.env.WEB_SITE_WONIU4K || "https://zmi.kdns.fr;");

const SITES = [];

pushSiteIfAny({
  id: "wanou",
  name: "玩偶",
  filterFiles: ["wogg.json"],
  domains: WOGG_SITES,
  listSelector: ".module-item",
  detailPanSelector: ".module-row-info p",
  categoryUrl: "/vodshow/{categoryId}--------{page}---.html",
  categoryUrlWithFilters: "/vodshow/{categoryId}-{area}-{by}-{class}-----{page}---{year}.html",
  searchUrl: "/vodsearch/-------------.html?wd={keyword}&page={page}",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "综艺", "5": "音乐", "6": "短剧", "44": "臻彩", "46": "纪录片" },
});

pushSiteIfAny({
  id: "muou",
  name: "木偶",
  filterFiles: ["mogg.json"],
  domains: MUOU_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "纪录片", "25": "臻选", "29": "综艺", "30": "原盘" },
});

pushSiteIfAny({
  id: "labi",
  name: "蜡笔",
  filterFiles: ["labi.json"],
  domains: LABI_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "综艺", "5": "短剧", "24": "蜡笔4K", "29": "臻彩" },
});

pushSiteIfAny({
  id: "zhizhen",
  name: "至臻",
  filterFiles: ["zhizhen.json"],
  domains: ZHIZHEN_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "综艺", "5": "短剧", "24": "老剧", "44": "臻彩" },
});

pushSiteIfAny({
  id: "erxiao",
  name: "二小",
  filterFiles: ["erxiao.json"],
  domains: ERXIAO_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "臻彩", "21": "综艺" },
});

pushSiteIfAny({
  id: "huban",
  name: "虎斑",
  filterFiles: ["huban.json"],
  domains: HUBAN_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "综艺", "4": "动漫", "5": "短剧", "6": "臻彩", "30": "115网盘" },
});

pushSiteIfAny({
  id: "kuaiying",
  name: "快映",
  filterFiles: ["xiaoban.json"],
  domains: KUAIYING_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "综艺", "4": "动漫", "5": "臻彩", "6": "短剧", "30": "115", "35": "123", "36": "天移迅" },
});

pushSiteIfAny({
  id: "shandian",
  name: "闪电",
  filterFiles: ["shandian.json"],
  domains: SHANDIAN_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "综艺", "4": "动漫", "30": "短剧" },
});

pushSiteIfAny({
  id: "ouge",
  name: "欧哥",
  filterFiles: ["ouge.json"],
  domains: OUGE_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "综艺", "5": "短剧", "21": "综合" },
});

pushSiteIfAny({
  id: "duoduo",
  name: "多多",
  filterFiles: ["duoduo.json"],
  domains: DUODUO_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "多多电影", "2": "多多剧集", "3": "综艺", "4": "动漫", "5": "短剧", "20": "记录" },
});

// 蜗牛4K：MacCMS mxone 伪静态，主推 115（含 115cdn/anxia）
pushSiteIfAny({
  id: "woniu4k",
  name: "蜗牛4K",
  filterFiles: [],
  domains: WONIU4K_SITES,
  listSelector: ".module-item,a.video-card",
  detailPanSelector: ".module-row-info",
  categoryUrl: "/vodtype/{categoryId}/",
  categoryUrlPage: "/vodtype/{categoryId}-{page}/",
  searchUrl: "/vodsearch/{keyword}-------------/",
  searchUrlPage: "/vodsearch/{keyword}----------{page}---/",
  searchListSelector: ".module-search-item,.module-item,a.video-card",
  panExtractMode: "mxone",
  defaultCategories: { "1": "电影", "2": "连续剧", "3": "综艺", "4": "动漫" },
});

if (SITES.length === 0) {
  throw new Error("至少需要一个站点配置，请检查环境变量配置");
}

for (const site of SITES) {
  OmniBox.log("info", `[init] 站点 ${site.name} 域名数=${site.domains.length}`);
}

const INSECURE_HTTPS_AGENT = new https.Agent({ rejectUnauthorized: false });

// 仅保存蜗牛站点会话，避免聚合内其他站点互相污染 Cookie。
let cookieStore = {};

function getHostname(value = "") {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return String(value || "").trim().toLowerCase();
  }
}

function isWoniuURL(url = "") {
  const hostname = getHostname(url);
  return Boolean(hostname) && WONIU4K_SITES.some((siteUrl) => getHostname(siteUrl) === hostname);
}

function setCookiesFromHeaders(setCookieHeaders, baseUrl) {
  if (!isWoniuURL(baseUrl) || !setCookieHeaders || (!Array.isArray(setCookieHeaders) && typeof setCookieHeaders !== "string")) return;
  const list = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  const domain = getHostname(baseUrl);
  if (!cookieStore[domain]) cookieStore[domain] = {};
  for (const raw of list) {
    const pair = String(raw).split(";")[0];
    const index = pair.indexOf("=");
    if (index < 0) continue;
    const key = pair.substring(0, index).trim();
    const value = pair.substring(index + 1).trim();
    if (key) cookieStore[domain][key] = value;
  }
}

function setCookiesFromString(cookieString, domain) {
  if (!cookieString) return;
  const domains = domain ? [getHostname(domain)] : WONIU4K_SITES.map(getHostname).filter(Boolean);
  for (const targetDomain of domains) {
    if (!cookieStore[targetDomain]) cookieStore[targetDomain] = {};
    for (const part of String(cookieString).split(/[;,]/)) {
      const index = part.indexOf("=");
      if (index < 0) continue;
      const key = part.substring(0, index).trim();
      const value = part.substring(index + 1).trim();
      if (key) cookieStore[targetDomain][key] = value;
    }
  }
}

function getCookieHeader(url) {
  if (!isWoniuURL(url)) return "";
  const cookies = cookieStore[getHostname(url)];
  if (!cookies) return "";
  return Object.entries(cookies)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

function clearCookies() {
  cookieStore = {};
}

if (WONIU4K_COOKIE) {
  setCookiesFromString(WONIU4K_COOKIE);
  OmniBox.log("info", "[woniu4k] 已从 WONIU4K_COOKIE 加载 Cookie");
}

// ==================== 缓存 ====================
const driveParseCache = new Map();
const siteFilterCache = new Map();
const playHistoryDedupeCache = new Map();
const CACHE_TTL = { drive: 60 * 60 * 1000, filter: 6 * 60 * 1000 };

function buildCacheKey(prefix, value) {
  return `${prefix}:${value}`;
}

async function getCachedJSON(key) {
  try {
    return await OmniBox.getCache(key);
  } catch (error) {
    await OmniBox.log("warn", `[cache] 读取缓存失败: key=${key}, err=${error.message}`);
    return null;
  }
}

async function setCachedJSON(key, value, exSeconds) {
  try {
    await OmniBox.setCache(key, value, exSeconds);
  } catch (error) {
    await OmniBox.log("warn", `[cache] 写入缓存失败: key=${key}, err=${error.message}`);
  }
}

async function getDriveInfoCached(shareURL) {
  const cacheKey = buildCacheKey("wanou:driveInfo", shareURL);
  let driveInfo = await getCachedJSON(cacheKey);
  if (!driveInfo) {
    driveInfo = await OmniBox.getDriveInfoByShareURL(shareURL);
    await setCachedJSON(cacheKey, driveInfo, WANOU_CACHE_EX_SECONDS);
  }
  return driveInfo;
}

async function getRootFileListCached(shareURL) {
  const cacheKey = buildCacheKey("wanou:rootFiles", shareURL);
  let fileList = await getCachedJSON(cacheKey);
  if (!fileList) {
    fileList = await OmniBox.getDriveFileList(shareURL, "0");
    if (Array.isArray(fileList?.files) && fileList.files.length > 0) {
      await setCachedJSON(cacheKey, fileList, WANOU_CACHE_EX_SECONDS);
    }
  }
  return fileList;
}

async function getAllVideoFilesCached(shareURL, rootFiles) {
  const cacheKey = buildCacheKey("wanou:videoFiles", shareURL);
  let allVideoFiles = await getCachedJSON(cacheKey);
  if (!Array.isArray(allVideoFiles) || allVideoFiles.length === 0) {
    allVideoFiles = await getAllVideoFiles(shareURL, rootFiles);
    if (Array.isArray(allVideoFiles) && allVideoFiles.length > 0) {
      await setCachedJSON(cacheKey, allVideoFiles, WANOU_CACHE_EX_SECONDS);
    }
  }
  return allVideoFiles;
}

function splitSites(raw) {
  return String(raw || "")
    .split(";")
    .map((url) => url.trim())
    .filter(Boolean);
}

function pushSiteIfAny(site) {
  if (Array.isArray(site.domains) && site.domains.length > 0) {
    SITES.push(site);
  }
}

// ==================== 网络请求 ====================
async function httpRequest(url, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const headers = {
    Accept: "*/*",
    ...(options.headers || {}),
  };
  const cookieHeader = getCookieHeader(url);
  if (cookieHeader) headers.Cookie = cookieHeader;

  const response = await axios({
    url,
    method,
    headers,
    data: options.body,
    timeout: options.timeout || REQUEST_TIMEOUT,
    httpsAgent: INSECURE_HTTPS_AGENT,
    validateStatus: () => true,
  });

  const setCookie = response.headers?.["set-cookie"];
  if (setCookie) setCookiesFromHeaders(setCookie, url);

  let body = response.data;
  if (typeof body !== "string") {
    body = body == null ? "" : JSON.stringify(body);
  }

  return {
    statusCode: response.status,
    body,
    headers: response.headers || {},
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isBlockedHtml(body = "") {
  const lower = String(body || "").toLowerCase();
  return lower.includes("just a moment") || lower.includes("cf-browser-verification") || lower.includes("captcha") || lower.includes("访问验证");
}

function removeTrailingSlash(url) {
  return String(url || "").replace(/\/+$/, "");
}

async function requestWithFailover(domains, path, options = {}) {
  let lastError = null;
  const perDomainTimeout = Math.max(1000, Math.floor(30000 / Math.max(1, domains.length)));

  for (let i = 0; i < domains.length; i++) {
    const baseUrl = removeTrailingSlash(domains[i]);
    const fullUrl = path.startsWith("http") ? path : baseUrl + path;

    try {
      await OmniBox.log("info", `[request] try ${i + 1}/${domains.length} ${fullUrl}`);
      const response = await httpRequest(fullUrl, {
        ...options,
        method: options.method || "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          ...(options.headers || {}),
        },
        timeout: options.timeout ?? perDomainTimeout,
      });

      if (response.statusCode === 200 && response.body) {
        if (isBlockedHtml(response.body)) {
          await OmniBox.log("warn", `[request] blocked by ${baseUrl}`);
          lastError = new Error("命中风控页面");
          continue;
        }
        await OmniBox.log("info", `[request] success ${baseUrl}`);
        return { response, baseUrl };
      }

      await OmniBox.log("warn", `[request] non-200 ${response.statusCode} @ ${baseUrl}`);
      lastError = new Error(`HTTP ${response.statusCode}`);
    } catch (error) {
      await OmniBox.log("warn", `[request] fail ${baseUrl}: ${error.message}`);
      lastError = error;
    }
  }

  throw lastError || new Error("所有域名请求均失败");
}

// ==================== 通用辅助 ====================
function formatFileSize(size) {
  if (!size || size <= 0) return "";
  const unit = 1024;
  const units = ["B", "K", "M", "G", "T", "P"];
  if (size < unit) return `${size}B`;
  let exp = 0;
  let n = size;
  while (n >= unit && exp < units.length - 1) {
    n /= unit;
    exp++;
  }
  return Number.isInteger(n) ? `${n}${units[exp]}` : `${n.toFixed(2)}${units[exp]}`;
}

function isVideoFile(file) {
  if (!file || !file.file_name) return false;
  const fileName = String(file.file_name).toLowerCase();
  const exts = [".mp4", ".mkv", ".avi", ".flv", ".mov", ".wmv", ".m3u8", ".ts", ".webm", ".m4v"];
  if (exts.some((ext) => fileName.endsWith(ext))) return true;
  const formatType = String(file.format_type || "").toLowerCase();
  return formatType.includes("video") || formatType.includes("mpeg") || formatType.includes("h264");
}

async function getAllVideoFiles(shareURL, files, errors = []) {
  if (!Array.isArray(files)) return [];
  const tasks = files.map(async (file) => {
    if (file.file && isVideoFile(file)) return [file];
    if (file.dir) {
      try {
        const subFileList = await OmniBox.getDriveFileList(shareURL, file.fid);
        if (Array.isArray(subFileList?.files)) {
          return await getAllVideoFiles(shareURL, subFileList.files, errors);
        }
      } catch (error) {
        errors.push({ path: file.name || file.fid, fid: file.fid, message: error.message, timestamp: new Date().toISOString() });
      }
    }
    return [];
  });
  const results = await Promise.all(tasks);
  return results.flat();
}

// ==================== 筛选器 ====================
function normalizeFilterOption(option) {
  if (!option || typeof option !== "object") return null;
  const name = option.n ?? option.name;
  const value = option.v ?? option.value;
  if (name === undefined || value === undefined) return null;
  return { name: String(name), value: String(value) };
}

function normalizeFilterGroup(group) {
  if (!group || typeof group !== "object" || !group.key) return null;
  const rawValues = Array.isArray(group.value) ? group.value : [];
  const values = rawValues.map(normalizeFilterOption).filter(Boolean);
  if (values.length === 0) return null;
  return {
    key: String(group.key),
    name: String(group.name || group.key),
    init: group.init !== undefined ? String(group.init) : "",
    value: values,
  };
}

function normalizeFilterConfigByCategory(config) {
  if (!config || typeof config !== "object") return null;
  const normalized = {};
  for (const [categoryId, groups] of Object.entries(config)) {
    if (!Array.isArray(groups)) continue;
    const normalizedGroups = groups.map(normalizeFilterGroup).filter(Boolean);
    if (normalizedGroups.length > 0) normalized[categoryId] = normalizedGroups;
  }
  return Object.keys(normalized).length > 0 ? normalized : null;
}

function mergeFilterGroups(groups) {
  const mergedMap = new Map();
  for (const group of groups) {
    const normalized = normalizeFilterGroup(group);
    if (!normalized || normalized.key === "categoryId") continue;
    if (!mergedMap.has(normalized.key)) {
      mergedMap.set(normalized.key, { key: normalized.key, name: normalized.name, init: normalized.init, valueMap: new Map() });
    }
    const bucket = mergedMap.get(normalized.key);
    for (const item of normalized.value) {
      if (!bucket.valueMap.has(item.value)) {
        bucket.valueMap.set(item.value, item.name);
      }
    }
  }

  return Array.from(mergedMap.values()).map((group) => {
    const values = Array.from(group.valueMap.entries()).map(([value, name]) => ({ name, value }));
    if (!values.some((item) => item.value === "") && values.length > 0) {
      values.unshift({ name: "全部", value: "" });
    }
    return {
      key: group.key,
      name: group.name,
      init: group.init || (values[0]?.value ?? ""),
      value: values,
    };
  });
}

function buildCategoryFilterGroup(site) {
  const categories = Object.entries(site.defaultCategories || {});
  return {
    key: "categoryId",
    name: "分类",
    init: categories[0]?.[0] || "",
    value: [{ name: "全部", value: "" }, ...categories.map(([id, name]) => ({ name, value: id }))],
  };
}

function buildSiteFilters(site, externalFilterConfig) {
  const categoryFilter = buildCategoryFilterGroup(site);
  if (!externalFilterConfig || typeof externalFilterConfig !== "object" || Object.keys(externalFilterConfig).length === 0) {
    return [categoryFilter];
  }
  const allGroups = [];
  for (const groups of Object.values(externalFilterConfig)) {
    if (Array.isArray(groups)) allGroups.push(...groups);
  }
  return [categoryFilter, ...mergeFilterGroups(allGroups)];
}

async function fetchExternalFilterConfig(site) {
  const cache = siteFilterCache.get(site.id);
  if (cache && Date.now() - cache.time < CACHE_TTL.filter) return cache.data;

  const files = Array.isArray(site.filterFiles) ? site.filterFiles : [];
  if (files.length === 0) {
    siteFilterCache.set(site.id, { data: null, time: Date.now() });
    return null;
  }

  for (const file of files) {
    const url = `${FILTER_CONFIG_BASE_URL}/${file}`;
    try {
      const response = await httpRequest(url, { timeout: 10000 });
      if (response.statusCode !== 200 || !response.body) continue;
      const parsed = JSON.parse(response.body);
      const normalizedConfig = normalizeFilterConfigByCategory(parsed);
      siteFilterCache.set(site.id, { data: normalizedConfig, time: Date.now() });
      await OmniBox.log("info", `[filter] ${site.name} loaded ${file}`);
      return normalizedConfig;
    } catch (error) {
      await OmniBox.log("warn", `[filter] ${site.name} load fail ${file}: ${error.message}`);
    }
  }

  siteFilterCache.set(site.id, { data: null, time: Date.now() });
  return null;
}

function encodeFilterSegment(value) {
  return encodeURIComponent(String(value ?? "").trim());
}

function hasSecondaryFilters(filters = {}) {
  return Object.keys(filters).some((key) => key !== "categoryId" && filters[key] !== undefined && filters[key] !== null && filters[key] !== "");
}

function buildCategoryUrl(site, categoryId, page = 1, filters = {}) {
  const safeFilters = filters || {};
  const byValue = safeFilters.by || safeFilters.sort || "";
  const pg = Math.max(1, parseInt(page || "1", 10) || 1);

  if (hasSecondaryFilters(safeFilters)) {
    if (site.categoryUrlWithFilters) {
      let url = site.categoryUrlWithFilters;
      const replacements = {
        categoryId: categoryId || "",
        page: pg,
        class: encodeFilterSegment(safeFilters.class),
        area: encodeFilterSegment(safeFilters.area),
        year: encodeFilterSegment(safeFilters.year),
        by: encodeFilterSegment(byValue),
        letter: encodeFilterSegment(safeFilters.letter),
      };
      for (const [key, value] of Object.entries(replacements)) {
        url = url.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
      }
      return url;
    }

    const segments = [];
    for (const [key, rawValue] of Object.entries(safeFilters)) {
      if (key === "categoryId" || rawValue == null || rawValue === "") continue;
      const mappedKey = key === "sort" ? "by" : key;
      segments.push(`/${mappedKey}/${encodeFilterSegment(rawValue)}`);
    }
    return `/index.php/vod/show/id/${categoryId}${segments.join("")}/page/${pg}.html`;
  }

  // mxone 伪静态：第 1 页 /vodtype/1/，后续 /vodtype/1-2/
  if (site.categoryUrlPage && pg > 1) {
    return site.categoryUrlPage
      .replace(/\{categoryId\}/g, categoryId)
      .replace(/\{page\}/g, String(pg));
  }

  if (site.categoryUrl) {
    return site.categoryUrl
      .replace(/\{categoryId\}/g, categoryId)
      .replace(/\{page\}/g, String(pg));
  }

  return `/index.php/vod/show/id/${categoryId}/page/${pg}.html`;
}

function buildSearchUrl(site, keyword, page = 1) {
  const enc = encodeURIComponent(String(keyword || "").trim());
  const pg = Math.max(1, parseInt(page || "1", 10) || 1);

  if (site.searchUrlPage && pg > 1) {
    return site.searchUrlPage
      .replace(/\{keyword\}/g, enc)
      .replace(/\{page\}/g, String(pg));
  }

  if (site.searchUrl) {
    return site.searchUrl
      .replace(/\{keyword\}/g, enc)
      .replace(/\{page\}/g, String(pg));
  }

  return `/index.php/vod/search/page/${pg}/wd/${enc}.html`;
}

function normalizeShareUrl(url) {
  let u = String(url || "").trim().replace(/&amp;/g, "&");
  if (!u) return "";
  u = u.replace(/^https?:\/\/(?:www\.)?115cdn\.com\//i, "https://115.com/");
  u = u.replace(/^https?:\/\/(?:www\.)?anxia\.com\//i, "https://115.com/");
  return u.replace(/[),.;]+$/, "");
}

function extractPanUrl(raw) {
  const s = String(raw || "").replace(/&amp;/g, "&").trim();
  const m = s.match(/https?:\/\/[^\s"'<>]+/i);
  return m ? normalizeShareUrl(m[0]) : "";
}

function isPanShareUrl(url = "") {
  return /115|quark|aliyun|alipan|baidu|uc\.cn|123pan|189\.cn|xunlei|anxia/i.test(String(url || ""));
}

function extractPanUrlsFromDetail($, site) {
  const panUrls = [];
  const seen = new Set();
  const pushUrl = (raw) => {
    const url = extractPanUrl(raw);
    if (!url || !/^https?:\/\//i.test(url) || !isPanShareUrl(url)) return;
    if (seen.has(url)) return;
    seen.add(url);
    panUrls.push(url);
  };

  // mxone / 蜗牛：clipboard、a 标签、p/i/span 文本
  if (site.panExtractMode === "mxone") {
    $(".module-row-info").each((_, el) => {
      $(el).find("[data-clipboard-text]").each((__, n) => pushUrl($(n).attr("data-clipboard-text")));
      $(el).find('a[href^="http"]').each((__, a) => pushUrl($(a).attr("href")));
      $(el).find("i,p,span").each((__, p) => pushUrl($(p).text().trim()));
      const firstP = $(el).find("p")[0]?.children?.[0]?.data;
      if (firstP) pushUrl(firstP);
    });

    $(".pan-link-item[data-pan-item]").each((_, el) => {
      $(el).find("[data-copy]").each((__, n) => pushUrl($(n).attr("data-copy")));
      $(el).find('a[href^="http"]').each((__, a) => pushUrl($(a).attr("href")));
      $(el).find(".pan-link-meta").each((__, meta) => pushUrl($(meta).text().trim()));
    });
  } else {
    const selector = site.detailPanSelector || ".module-row-info p";
    $(selector).each((_, p) => pushUrl($(p).text().trim()));
  }

  // 兜底：整页扫描分享链接（含 115cdn/anxia）
  if (panUrls.length === 0) {
    const html = $.html() || "";
    const re =
      /https?:\/\/(?:115cdn\.com|115\.com|anxia\.com|pan\.quark\.cn|www\.aliyundrive\.com|www\.alipan\.com|pan\.baidu\.com|drive\.uc\.cn|cloud\.189\.cn|www\.123pan\.com|pan\.xunlei\.com)\/[^\s"'<>]+/gi;
    let m;
    while ((m = re.exec(html))) {
      pushUrl(m[0]);
    }
  }

  return panUrls;
}

function parseTotalPages($) {
  let totalPages = 1;
  const pageSelectors = [".page-numbers:not(.next):not(.prev)", ".pagination a", ".page a", ".pages a", ".module-page a"];
  for (const selector of pageSelectors) {
    const pageLinks = $(selector);
    if (pageLinks.length > 0) {
      let maxPage = 1;
      pageLinks.each((_, el) => {
        const pageNum = parseInt($(el).text().trim(), 10);
        if (!Number.isNaN(pageNum) && pageNum > maxPage) maxPage = pageNum;
        const href = $(el).attr("href") || "";
        const mType = href.match(/\/vodtype\/\d+-(\d+)\/?/i);
        if (mType) maxPage = Math.max(maxPage, parseInt(mType[1], 10) || 1);
        const mSearch = href.match(/\/vodsearch\/[^/]*?----------+(\d+)---+\/?/i);
        if (mSearch) maxPage = Math.max(maxPage, parseInt(mSearch[1], 10) || 1);
      });
      if (maxPage > 1) {
        totalPages = maxPage;
        break;
      }
    }
  }

  // mxone 兜底：扫描全页分页链接
  $("a[href*='/vodtype/'],a[href*='/vodsearch/']").each((_, a) => {
    const href = $(a).attr("href") || "";
    let m = href.match(/\/vodtype\/\d+-(\d+)\/?/i);
    if (m) totalPages = Math.max(totalPages, parseInt(m[1], 10) || 1);
    m = href.match(/\/vodsearch\/[^/]*?----------+(\d+)---+\/?/i);
    if (m) totalPages = Math.max(totalPages, parseInt(m[1], 10) || 1);
  });

  const pageText = $(".page-text, .page_info, .page-count").text();
  const pageMatch = pageText.match(/共\s*(\d+)\s*页/);
  if (pageMatch) totalPages = Math.max(totalPages, parseInt(pageMatch[1], 10) || 1);
  return totalPages;
}

// ==================== 网盘解析 ====================
async function getDriveParseWithCache(url, driveKey, drives, source = "") {
  const cacheKey = `${driveKey}_${url}`;
  const cached = driveParseCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL.drive) {
    return { data: cached.data, fromCache: true };
  }

  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("驱动超时")), 8000));
  try {
    const result = await Promise.race([getEpisodesFromDrive(url, driveKey, drives, source), timeoutPromise]);
    driveParseCache.set(cacheKey, { data: result, time: Date.now() });
    return { data: result, fromCache: false };
  } catch (error) {
    await OmniBox.log("info", `[drive] parse fail ${driveKey}, source=${source}, err=${error.message}`);
    return { data: null, fromCache: false, error: error.message };
  }
}

async function getEpisodesFromDrive(url, driveKey, drives, source = "") {
  const drive = drives.find((d) => d.key === driveKey);
  if (!drive) {
    await OmniBox.log("info", `[drive] missing driver ${driveKey}`);
    return null;
  }

  try {
    if (!drive.matchShare || !drive.matchShare(url)) {
      await OmniBox.log("info", `[drive] unmatched share ${driveKey}`);
      return null;
    }
    const vod = await drive.getVod(url);
    if (!vod) return null;

    let isValid = true;
    if (vod.vod_play_url) {
      const parts = vod.vod_play_url.split("#");
      if (parts.length === 1) {
        const [name] = parts[0].split("$");
        if (["播放", "全集", "点击播放", "立即播放"].includes(name)) isValid = false;
      }
    } else {
      isValid = false;
    }

    if (!isValid) return null;

    return {
      playFrom: vod.vod_play_from || driveKey,
      playUrl: vod.vod_play_url,
      vodPic: vod.vod_pic || "",
      vodContent: vod.vod_content || "",
      vodActor: vod.vod_actor || "",
      vodDirector: vod.vod_director || "",
    };
  } catch (error) {
    await OmniBox.log("info", `[drive] error ${driveKey}: ${error.message}`);
    return null;
  }
}

// ==================== 站点抓取 ====================
async function fetchSiteSearch(site, keyword, page = 1) {
  const searchUrl = buildSearchUrl(site, keyword, page);

  try {
    const { response, baseUrl } = await requestWithFailover(site.domains, searchUrl);
    const $ = cheerio.load(response.body);
    const itemSelector = site.searchListSelector || ".module-search-item";
    const items = $(itemSelector);
    const videos = [];
    const seen = new Set();

    items.each((_, el) => {
      const $item = $(el);
      const href =
        $item.attr("href") ||
        $item.find(".video-serial").attr("href") ||
        $item.find(".module-item-pic a").attr("href") ||
        $item.find('a[href*="/voddetail/"]').attr("href") ||
        $item.find('a[href*="/vod/detail/"]').attr("href") ||
        $item.find(".module-item-title").attr("href");
      const vodName = (
        $item.attr("title") ||
        $item.find(".video-title").text() ||
        $item.find(".video-serial").attr("title") ||
        $item.find(".module-item-pic img").attr("alt") ||
        $item.find(".module-item-title").attr("title") ||
        $item.find(".module-poster-item-title").text() ||
        $item.find(".module-item-title").text() ||
        $item.find("h3,h4").first().text() ||
        ""
      )
        .replace(/\s+/g, " ")
        .replace(/^立刻播放|^下载/g, "")
        .trim();
      let vodPic =
        $item.find(".module-item-pic img").attr("data-src") ||
        $item.find(".module-item-pic img").attr("data-original") ||
        $item.find(".module-item-pic img").attr("src") ||
        $item.find("img").first().attr("data-src") ||
        $item.find("img").first().attr("data-original") ||
        $item.find("img").first().attr("src");
      if (vodPic && vodPic.includes("loading.gif")) {
        vodPic =
          $item.find("img").first().attr("data-src") ||
          $item.find("img").first().attr("data-original") ||
          "";
      }
      if (vodPic && !vodPic.startsWith("http")) vodPic = baseUrl + vodPic;
      const vodRemarks =
        $item.find(".module-item-text").text().trim() ||
        $item.find(".module-item-note").text().trim() ||
        $item.find(".module-poster-item-note").text().trim() ||
        $item.find(".video-episode").text().trim() ||
        $item.find(".video-serial").text().trim() ||
        "";
      const vodYear = $item.find(".module-item-caption span").first().text().trim();

      if (href && vodName) {
        const vodId = `${site.id}_${href}`;
        if (seen.has(vodId)) return;
        seen.add(vodId);
        videos.push({
          vod_id: vodId,
          vod_name: `[${site.name}] ${vodName}`,
          vod_pic: vodPic || "",
          type_id: "",
          type_name: "",
          vod_remarks: vodRemarks || "",
          vod_year: vodYear || "",
          _source: site.name,
          _original_name: vodName,
        });
      }
    });

    await OmniBox.log("info", `[search] site=${site.name}, page=${page}, hit=${videos.length}`);
    return videos;
  } catch (error) {
    await OmniBox.log("error", `[search] site=${site.name} fail: ${error.message}`);
    return [];
  }
}

async function fetchSiteCategoryList(site, categoryId, page = 1, filters = {}) {
  const url = buildCategoryUrl(site, categoryId, page, filters);
  await OmniBox.log("info", `[category] site=${site.name}, cid=${categoryId}, page=${page}, url=${url}`);

  const { response, baseUrl } = await requestWithFailover(site.domains, url);
  const $ = cheerio.load(response.body);
  const videos = [];

  $(site.listSelector).each((_, el) => {
    const $item = $(el);
    const href =
      $item.attr("href") ||
      $item.find(".module-item-pic a").attr("href") ||
      $item.find('a[href*="/voddetail/"]').attr("href") ||
      $item.find('a[href*="/vod/detail/"]').attr("href") ||
      $item.find(".module-item-title").attr("href");
    const vodName = (
      $item.attr("title") ||
      $item.find(".video-title").text() ||
      $item.find(".module-item-pic img").attr("alt") ||
      $item.find(".module-item-title").attr("title") ||
      $item.find(".module-poster-item-title").text() ||
      $item.find(".module-item-title").text() ||
      $item.find("h3,h4").first().text() ||
      ""
    )
      .replace(/\s+/g, " ")
      .replace(/^立刻播放|^下载/g, "")
      .trim();
    let vodPic =
      $item.find(".module-item-pic img").attr("data-src") ||
      $item.find(".module-item-pic img").attr("data-original") ||
      $item.find(".module-item-pic img").attr("src") ||
      $item.find("img").first().attr("data-src") ||
      $item.find("img").first().attr("data-original") ||
      $item.find("img").first().attr("src");
    if (vodPic && vodPic.includes("loading.gif")) {
      vodPic =
        $item.find("img").first().attr("data-src") ||
        $item.find("img").first().attr("data-original") ||
        "";
    }
    if (vodPic && !vodPic.startsWith("http")) vodPic = baseUrl + vodPic;
    const vodRemarks =
      $item.find(".module-item-text").text().trim() ||
      $item.find(".module-item-note").text().trim() ||
      $item.find(".module-poster-item-note").text().trim() ||
      $item.find(".video-episode").text().trim() ||
      $item.find(".video-serial").text().trim() ||
      "";
    const vodYear = $item.find(".module-item-caption span").first().text().trim();

    if (href && vodName) {
      videos.push({
        vod_id: `${site.id}_${href}`,
        vod_name: vodName,
        vod_pic: vodPic || "",
        type_id: categoryId,
        type_name: site.defaultCategories[categoryId] || "",
        vod_remarks: vodRemarks || "",
        vod_year: vodYear || "",
      });
    }
  });

  const totalPages = parseTotalPages($);
  const total = videos.length > 0 ? videos.length * totalPages : 0;
  await OmniBox.log("info", `[category] site=${site.name}, list=${videos.length}, pages=${totalPages}`);
  return { list: videos, total, page, totalPages };
}

async function fetchSiteDetail(site, videoId) {
  const { response, baseUrl } = await requestWithFailover(site.domains, videoId);
  const $ = cheerio.load(response.body);

  let vodName =
    $("h1").first().text().replace(/\s+/g, " ").trim() ||
    $(".page-title").text().replace(/\s+/g, " ").trim() ||
    $(".video-info-header h1").first().text().replace(/\s+/g, " ").trim() ||
    $(".module-info-heading h1").first().text().replace(/\s+/g, " ").trim() ||
    $(".mobile-detail-title").first().text().replace(/\s+/g, " ").trim() ||
    $(".premium-title").first().text().replace(/\s+/g, " ").trim() ||
    "";
  let vodPic =
    $(".mobile-play .lazyload").attr("data-src") ||
    $(".module-item-pic img,.module-info-poster img,.video-cover img,img.lazyload,img.lazy,.premium-poster img")
      .first()
      .attr("data-src") ||
    $(".module-item-pic img,.module-info-poster img,.video-cover img,img.lazyload,img.lazy,.premium-poster img")
      .first()
      .attr("data-original") ||
    $(".module-item-pic img,.module-info-poster img,.video-cover img,img.lazyload,img.lazy,.premium-poster img")
      .first()
      .attr("src") ||
    "";
  if (vodPic && !vodPic.startsWith("http")) vodPic = baseUrl + vodPic;

  let vodYear = "";
  let vodDirector = "";
  let vodActor = "";
  let vodContent = "";

  $(".video-info-itemtitle").each((_, item) => {
    const key = $(item).text();
    const value = $(item).next().find("a").map((_, a) => $(a).text().trim()).get().filter(Boolean).join(", ");
    if (key.includes("剧情")) vodContent = $(item).next().find("p").text().trim();
    else if (key.includes("导演")) vodDirector = value;
    else if (key.includes("主演")) vodActor = value;
    else if (key.includes("年代") || key.includes("年份") || key.includes("上映")) {
      const yearText = $(item).next().text().trim() || value;
      const m = yearText.match(/(19|20)\d{2}/);
      if (m) vodYear = m[0];
    }
  });

  if (!vodContent) {
    vodContent = (
      $(".vod_content,.module-info-introduction,.video-info-content,.module-info-main .module-info-item-content,.detail-desc-text,.premium-plot")
        .last()
        .text() || ""
    )
      .replace(/收起|展开全部|内详/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  const infoText = $(".video-info,.module-info-main,.module-info,.premium-meta-grid,.detail-info-premium").text() || "";
  if (!vodYear) {
    const match = infoText.match(/(?:年代|年份|上映)[:：]?\s*(\d{4})/) || infoText.match(/\b(19|20)\d{2}\b/);
    if (match) vodYear = String(match[1] || match[0]).replace(/\D/g, "").slice(0, 4);
  }
  if (!vodDirector) {
    const match = infoText.match(/导演[:：]?\s*([^\n]+?)\s*(主演|年代|备注|剧情|$)/);
    if (match) vodDirector = match[1].replace(/^\/\s*/, "").trim();
  }
  if (!vodActor) {
    const match = infoText.match(/主演[:：]?\s*([^\n]+?)\s*(年代|备注|剧情|导演|$)/);
    if (match) vodActor = match[1].replace(/^\/\s*/, "").trim();
  }

  if (!vodDirector || !vodActor || !vodYear) {
    $(".premium-meta-grid .meta-item").each((_, el) => {
      const label = $(el).find(".m-label").text().trim();
      const value = $(el).find(".m-val").text().trim();
      if (!label || !value) return;
      if (!vodDirector && label.includes("导演")) vodDirector = value;
      if (!vodActor && label.includes("主演")) vodActor = value;
      if (!vodYear && (label.includes("年代") || label.includes("年份") || label.includes("上映"))) {
        const match = value.match(/(19|20)\d{2}/);
        if (match) vodYear = match[0];
      }
    });
  }

  if (!vodYear) {
    $(".premium-tags-top .p-tag").each((_, el) => {
      const match = $(el).text().trim().match(/^(19|20)\d{2}$/);
      if (match) vodYear = match[0];
    });
  }

  const panUrls = extractPanUrlsFromDetail($, site);

  await OmniBox.log("info", `[detail] site=${site.name}, panUrls=${panUrls.length}`);
  return { vodName, vodPic, vodYear, vodDirector, vodActor, vodContent, panUrls };
}

async function handleSiteDetail(vodId, drives, context) {
  const parts = String(vodId).split("_");
  const siteId = parts[0];
  const rawId = parts.slice(1).join("_");
  const site = SITES.find((s) => s.id === siteId);
  if (!site) return null;

  const { vodName, vodPic, vodYear, vodDirector, vodActor, vodContent, panUrls } = await fetchSiteDetail(site, rawId);

  const panItems = panUrls.map((panUrl) => ({ url: panUrl, driveKey: detectDriveKey(panUrl) }));
  panItems.sort((a, b) => compareDriveKeyOrder(a.driveKey, b.driveKey));

  let playSources = [];
  const driveTypeCountMap = {};
  for (const { url: shareURL } of panItems) {
    const driveInfo = await getDriveInfoCached(shareURL);
    const displayName = driveInfo.displayName || "未知网盘";
    driveTypeCountMap[displayName] = (driveTypeCountMap[displayName] || 0) + 1;
  }

  const driveTypeCurrentIndexMap = {};

  // ==================== 限并发处理网盘链接 ====================
  const detailConcurrency = site.id === "woniu4k" ? 1 : 4;
  let woniuRequestIndex = 0;
  const panUrlResults = await runWithConcurrency(panItems.map(item => item.url), detailConcurrency, async (shareURL) => {
    try {
      if (site.id === "woniu4k") {
        const requestIndex = woniuRequestIndex++;
        if (requestIndex > 0 && WONIU4K_DRIVE_API_DELAY_MS > 0) {
          await sleep(WONIU4K_DRIVE_API_DELAY_MS);
        }
      }

      await OmniBox.log("info", `[detail] 处理网盘链接: ${shareURL}`);

      const driveInfo = await getDriveInfoCached(shareURL);
      let displayName = driveInfo.displayName || "未知网盘";
      const totalCount = driveTypeCountMap[displayName] || 0;
      if (totalCount > 1) {
        driveTypeCurrentIndexMap[displayName] = (driveTypeCurrentIndexMap[displayName] || 0) + 1;
        displayName = `${displayName}${driveTypeCurrentIndexMap[displayName]}`;
      }

      await OmniBox.log("info", `[detail] 网盘类型: ${displayName}, driveType: ${driveInfo.driveType}`);

      const fileList = await getRootFileListCached(shareURL);
      if (!Array.isArray(fileList?.files) || fileList.files.length === 0) {
        await OmniBox.log("warn", `[detail] 获取文件列表失败: ${shareURL}`);
        return null;
      }

      await OmniBox.log("info", `[detail] 从分享链接 ${shareURL} 获取文件列表成功,文件数量: ${fileList.files.length}`);

      const allVideoFiles = await getAllVideoFilesCached(shareURL, fileList.files);
      if (allVideoFiles.length === 0) {
        await OmniBox.log("warn", `[detail] 未找到视频文件: ${shareURL}`);
        return null;
      }

      await OmniBox.log("info", `[detail] 递归获取视频文件完成,视频文件数量: ${allVideoFiles.length}`);

      // ==================== 刮削处理（参考木偶.js）====================
      const scrapeKey = `${vodId}@@${encodeURIComponent(shareURL)}`;
      if (ENABLE_SCRAPE) {
        try {
          await OmniBox.log("info", `[detail] 开始执行刮削处理, scrapeKey=${scrapeKey}, 资源名: ${vodName}, 视频文件数: ${allVideoFiles.length}`);

          const videoFilesForScraping = allVideoFiles.map((file) => {
            const fileId = file.fid || file.file_id || "";
            const formattedFileId = fileId ? `${shareURL}|${fileId}|${scrapeKey}` : fileId;
            return {
              ...file,
              fid: formattedFileId,
              file_id: formattedFileId,
            };
          });

          await OmniBox.log("info", `[detail] 文件ID格式转换完成,示例: ${videoFilesForScraping[0]?.fid || "N/A"}`);

          const scrapingResult = await OmniBox.processScraping(scrapeKey, vodName, vodName, videoFilesForScraping);
          await OmniBox.log("info", `[detail] 刮削处理完成,结果: ${JSON.stringify(scrapingResult).substring(0, 200)}`);
        } catch (error) {
          await OmniBox.log("error", `[detail] 刮削处理失败: ${error.message}`);
          if (error.stack) {
            await OmniBox.log("error", `[detail] 刮削错误堆栈: ${error.stack}`);
          }
        }
      }

      // 获取刮削后的元数据（使用独立 scrapeKey，避免多个网盘互相覆盖）
      let scrapeData = null;
      let videoMappings = [];
      let scrapeType = "";

      try {
        await OmniBox.log("info", `[detail] 开始获取元数据, scrapeKey: ${scrapeKey}`);
        const metadata = await OmniBox.getScrapeMetadata(scrapeKey);
        await OmniBox.log("info", `[detail] 获取元数据响应: ${JSON.stringify(metadata).substring(0, 500)}`);

        scrapeData = metadata.scrapeData || null;
        videoMappings = metadata.videoMappings || [];
        scrapeType = metadata.scrapeType || "";

        if (scrapeData) {
          await OmniBox.log("info", `[detail] 获取到刮削数据,标题: ${scrapeData.title || "未知"}, 类型: ${scrapeType || "未知"}, 映射数量: ${videoMappings.length}`);
        } else {
          await OmniBox.log("warn", `[detail] 未获取到刮削数据,映射数量: ${videoMappings.length}`);
        }
      } catch (error) {
        await OmniBox.log("error", `[detail] 获取元数据失败: ${error.message}`);
        if (error.stack) {
          await OmniBox.log("error", `[detail] 获取元数据错误堆栈: ${error.stack}`);
        }
      }

      return { shareURL, displayName, driveInfo, allVideoFiles, scrapeData, videoMappings, scrapeType, scrapeKey };
    } catch (error) {
      await OmniBox.log("error", `[detail] 处理网盘链接失败: ${shareURL}, 错误: ${error.message}`);
      return null;
    }
  });

  let updatedVodName = vodName;
  let updatedVodPic = vodPic;
  let updatedVodYear = vodYear;
  let updatedVodActor = vodActor;
  let updatedVodDirector = vodDirector;
  let updatedVodContent = vodContent;

  const from = context?.from || "web";
  let effectiveSourceNamesConfig = [...SOURCE_NAMES_CONFIG];
  if (from === "web") {
    effectiveSourceNamesConfig = effectiveSourceNamesConfig.filter((name) => name !== "本地代理");
  }

  for (const result of panUrlResults) {
    if (!result) continue;
    const { shareURL, displayName, driveInfo, allVideoFiles, scrapeData, videoMappings, scrapeType, scrapeKey } = result;

    let sourceNames = [displayName];
    if (DRIVE_TYPE_CONFIG.includes(driveInfo.driveType)) {
      sourceNames = [...effectiveSourceNamesConfig];
      OmniBox.log("info", `${displayName} 匹配成功,线路设置为: ${sourceNames.join(", ")}`);
    }

    for (const sourceName of sourceNames) {
      const episodes = [];
      for (const file of allVideoFiles) {
        let fileName = file.file_name || "";
        const fileId = file.fid || "";
        const fileSize = file.size || file.file_size || 0;
        if (!fileName || !fileId) continue;

        const formattedFileId = `${shareURL}|${fileId}|${scrapeKey}`;
        let matchedMapping = null;

        if (scrapeData && Array.isArray(videoMappings) && videoMappings.length) {
          for (const mapping of videoMappings) {
            if (mapping && mapping.fileId === formattedFileId) {
              matchedMapping = mapping;
              const newFileName = buildScrapedFileName(scrapeData, mapping, fileName);
              if (newFileName && newFileName !== fileName) {
                fileName = newFileName;
                await OmniBox.log("info", `[detail] 应用刮削文件名: ${file.file_name} -> ${fileName}`);
              }
              break;
            }
          }
        }

        let displayFileName = fileName;
        if (fileSize > 0) {
          const sizeStr = formatFileSize(fileSize);
          if (sizeStr) displayFileName = `[${sizeStr}] ${fileName}`;
        }

        const encodedDanmakuName = encodeURIComponent(fileName);
        const episode = { name: displayFileName, playId: `${formattedFileId}|${encodedDanmakuName}` };
        if (fileSize > 0) episode.size = fileSize;
        if (matchedMapping) {
          if (matchedMapping.seasonNumber !== undefined) episode._seasonNumber = matchedMapping.seasonNumber;
          if (matchedMapping.episodeNumber !== undefined) episode._episodeNumber = matchedMapping.episodeNumber;
          if (matchedMapping.episodeName) episode.episodeName = matchedMapping.episodeName;
          if (matchedMapping.episodeOverview) episode.episodeOverview = matchedMapping.episodeOverview;
          if (matchedMapping.episodeAirDate) episode.episodeAirDate = matchedMapping.episodeAirDate;
          if (matchedMapping.episodeStillPath) episode.episodeStillPath = matchedMapping.episodeStillPath;
          if (matchedMapping.episodeVoteAverage !== undefined) episode._episodeVoteAverage = matchedMapping.episodeVoteAverage;
          if (matchedMapping.episodeRuntime !== undefined) episode._episodeRuntime = matchedMapping.episodeRuntime;
        }
        episodes.push(episode);
      }

      if (scrapeData && episodes.some((ep) => ep._episodeNumber !== undefined)) {
        await OmniBox.log("info", `[detail] 检测到刮削数据,按 episodeNumber 排序剧集列表,共 ${episodes.length} 集`);
        episodes.sort((a, b) => {
          const seasonA = a._seasonNumber ?? 0;
          const seasonB = b._seasonNumber ?? 0;
          if (seasonA !== seasonB) return seasonA - seasonB;
          return (a._episodeNumber ?? 0) - (b._episodeNumber ?? 0);
        });
      }

      if (episodes.length > 0) {
        let finalSourceName = sourceName;
        if (DRIVE_TYPE_CONFIG.includes(driveInfo.driveType)) {
          finalSourceName = `${displayName}-${sourceName}`;
        }
        playSources.push({ name: finalSourceName, episodes });
      }
    }

    if (scrapeData) {
      if (scrapeData.title) updatedVodName = scrapeData.title;
      if (scrapeData.posterPath) updatedVodPic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
      if (scrapeData.releaseDate) updatedVodYear = scrapeData.releaseDate.substring(0, 4);
      if (scrapeData.overview) updatedVodContent = scrapeData.overview;
      if (scrapeData.credits) {
        if (Array.isArray(scrapeData.credits.cast) && scrapeData.credits.cast.length) {
          updatedVodActor = scrapeData.credits.cast.slice(0, 5).map((c) => c.name).filter(Boolean).join(",");
        }
        if (Array.isArray(scrapeData.credits.crew) && scrapeData.credits.crew.length) {
          const directors = scrapeData.credits.crew.filter((c) => c.job === "Director" || c.department === "Directing");
          if (directors.length) updatedVodDirector = directors.slice(0, 3).map((d) => d.name).filter(Boolean).join(",");
        }
      }
    }
  }

  // 按网盘类型优先级排序播放源
  if (Array.isArray(playSources) && playSources.length > 1 && DRIVE_ORDER.length > 0) {
    const sortedSources = sortPlaySourcesByDriveOrder(playSources);
    await OmniBox.log("info", `[detail] 按 DRIVE_ORDER 排序后线路顺序: ${sortedSources.map(item => item.name).join(' | ')}`);
    playSources = sortedSources;
  }

  await OmniBox.log("info", `[detail] 构建播放源完成,网盘数量: ${playSources.length}`);

  return {
    vod_id: vodId,
    vod_name: updatedVodName,
    vod_pic: updatedVodPic,
    vod_year: updatedVodYear,
    vod_director: updatedVodDirector,
    vod_actor: updatedVodActor,
    vod_content: updatedVodContent || `网盘资源,共${panUrls.length}个网盘链接`,
    vod_play_sources: playSources.length > 0 ? playSources : undefined,
  };
}

function detectDriveKey(panUrl) {
  const url = String(panUrl || "").toLowerCase();
  if (url.includes("pan.baidu.com")) return "baidu";
  if (url.includes("quark.cn")) return "quark";
  if (url.includes("115.com") || url.includes("115cdn.com") || url.includes("anxia.com")) return "a115";
  if (url.includes("123pan.com")) return "a123";
  if (url.includes("189.cn")) return "a189";
  if (url.includes("139.com")) return "a139";
  if (url.includes("aliyundrive.com") || url.includes("alipan.com")) return "ali";
  if (url.includes("xunlei.com")) return "xunlei";
  if (url.includes("uc.cn")) return "uc";
  return "other";
}

function inferDriveTypeFromSourceName(name = "") {
  const raw = String(name || "").toLowerCase();
  if (raw.includes("百度")) return "baidu";
  if (raw.includes("139")) return "a139";
  if (raw.includes("天翼") || raw.includes("189")) return "a189";
  if (raw.includes("123")) return "a123";
  if (raw.includes("115")) return "a115";
  if (raw.includes("夸克")) return "quark";
  if (raw.includes("迅雷")) return "xunlei";
  if (raw.includes("阿里")) return "ali";
  if (raw === "uc" || raw.includes("uc")) return "uc";
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
    if (aOrder !== bOrder) return aOrder - bOrder;
    return 0;
  });
}

function compareDriveKeyOrder(a, b) {
  const indexA = LINE_ORDER.indexOf(a);
  const indexB = LINE_ORDER.indexOf(b);
  if (indexA === -1 && indexB === -1) return 0;
  if (indexA === -1) return 1;
  if (indexB === -1) return -1;
  return indexA - indexB;
}

/**
 * 工具: 限并发执行任务，避免 detail 中网盘链接过多时瞬时并发过高。
 */
async function runWithConcurrency(items, limit, taskFn) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return [];

  const results = new Array(list.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const current = cursor;
      cursor += 1;
      if (current >= list.length) break;
      results[current] = await taskFn(list[current], current);
    }
  }

  const workerCount = Math.max(1, Math.min(limit || 1, list.length));
  const workers = [];
  for (let i = 0; i < workerCount; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}

/**
 * 构建刮削后的文件名（参考木偶.js）
 */
function buildScrapedFileName(scrapeData, mapping, originalFileName) {
  if (!mapping || mapping.episodeNumber === 0 || (mapping.confidence && mapping.confidence < 0.5)) {
    return originalFileName;
  }

  if (scrapeData && scrapeData.episodes && Array.isArray(scrapeData.episodes)) {
    for (const episode of scrapeData.episodes) {
      if (episode.episodeNumber === mapping.episodeNumber && episode.seasonNumber === mapping.seasonNumber) {
        if (episode.name) {
          return `${episode.episodeNumber}.${episode.name}`;
        }
        break;
      }
    }
  }

  return originalFileName;
}

function buildDanmakuCandidates({ scrapeData, scrapeType = "", matchedMapping = null, fallbackDanmakuFileName = "" }) {
  const candidates = [];
  const seen = new Set();

  const pushCandidate = (value) => {
    const text = String(value || "").trim();
    if (!text) return;
    if (seen.has(text)) return;
    seen.add(text);
    candidates.push(text);
  };

  if (scrapeData) {
    if (scrapeType === "movie") {
      pushCandidate(scrapeData.title || "");
      if (scrapeData.title && scrapeData.releaseDate) {
        pushCandidate(`${scrapeData.title}.${String(scrapeData.releaseDate).slice(0, 4)}`);
      }
    } else if (matchedMapping) {
      const title = scrapeData.title || "";
      const seasonAirYear = scrapeData.seasonAirYear || "";
      const seasonNumber = matchedMapping.seasonNumber || 1;
      const episodeNum = matchedMapping.episodeNumber || 1;
      pushCandidate(`${title}.${seasonAirYear}.S${String(seasonNumber).padStart(2, "0")}E${String(episodeNum).padStart(2, "0")}`);
      pushCandidate(`${title}.S${String(seasonNumber).padStart(2, "0")}E${String(episodeNum).padStart(2, "0")}`);
      if (matchedMapping.episodeName) {
        pushCandidate(`${title}.${matchedMapping.episodeName}`);
      }
    }
  }

  if (fallbackDanmakuFileName) {
    pushCandidate(decodeURIComponent(fallbackDanmakuFileName));
  }

  return candidates;
}

async function matchDanmakuByCandidates(candidates = []) {
  for (const fileName of candidates) {
    try {
      const danmakuList = await OmniBox.getDanmakuByFileName(fileName);
      if (Array.isArray(danmakuList) && danmakuList.length > 0) {
        await OmniBox.log("info", `[danmaku] matched ${fileName}, count=${danmakuList.length}`);
        return danmakuList;
      }
    } catch (error) {
      await OmniBox.log("warn", `[danmaku] candidate fail ${fileName}: ${error.message}`);
    }
  }
  return [];
}

// ==================== OmniBox handlers ====================
// ==================== 蜗牛4K 登录 ====================

function getWoniuBaseUrl() {
  return removeTrailingSlash(WONIU4K_SITES[0] || "");
}

function resolveSiteUrl(value, baseUrl) {
  if (!value) return "";
  try {
    return new URL(value, `${baseUrl}/`).toString();
  } catch {
    return "";
  }
}

async function login(params) {
  const username = String(params?.username || WONIU4K_USERNAME || "").trim();
  const password = String(params?.password || WONIU4K_PASSWORD || "").trim();
  const captchaCode = String(params?.captcha || params?.verify || "").trim();
  const baseUrl = getWoniuBaseUrl();

  if (!baseUrl) return { code: -1, msg: "蜗牛4K 站点未配置" };
  if (!username || !password) {
    await OmniBox.log("warn", "[woniu4k] 登录失败: 请设置 WONIU4K_USERNAME / WONIU4K_PASSWORD");
    return { code: -1, msg: "用户名或密码未配置" };
  }

  try {
    const loginPage = await httpRequest(`${baseUrl}/user/login/`, { timeout: 15000 });
    const $ = cheerio.load(loginPage.body || "");
    const hasVerify = $("#verify").length > 0 || $("#verify_img").length > 0;
    if (hasVerify && !captchaCode) {
      const verifyUrl = resolveSiteUrl($("#verify_img").attr("src") || "", baseUrl);
      return { code: -2, msg: "需要验证码", verifyUrl, verifyImg: verifyUrl };
    }

    const formData = new URLSearchParams();
    formData.append("user_name", username);
    formData.append("user_pwd", password);
    if (captchaCode) formData.append("verify", captchaCode);

    const response = await httpRequest(`${baseUrl}/user/login.html`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        Referer: `${baseUrl}/user/login/`,
      },
      body: formData.toString(),
      timeout: 15000,
    });

    try {
      return JSON.parse(response.body || "{}");
    } catch {
      return { code: 0, msg: "登录响应解析失败" };
    }
  } catch (error) {
    await OmniBox.log("error", `[woniu4k] 登录异常: ${error.message}`);
    return { code: -1, msg: error.message };
  }
}

async function logout() {
  const baseUrl = getWoniuBaseUrl();
  if (!baseUrl) return { code: -1, msg: "蜗牛4K 站点未配置" };
  try {
    await httpRequest(`${baseUrl}/user/logout.html`, { timeout: 10000 });
    clearCookies();
    return { code: 1, msg: "已退出" };
  } catch (error) {
    clearCookies();
    return { code: -1, msg: error.message };
  }
}

async function getLoginStatus() {
  const baseUrl = getWoniuBaseUrl();
  if (!baseUrl) return { loggedIn: false, username: "" };
  try {
    const response = await httpRequest(`${baseUrl}/user/index.html`, { timeout: 10000 });
    const $ = cheerio.load(response.body || "");
    const selector = ".user-name, .user-info-name, .header-user-name";
    const loggedIn = response.body.includes("退出登录") || $(selector).length > 0;
    const username = loggedIn ? ($(selector).first().text().trim() || "已登录") : "";
    return { loggedIn, username };
  } catch {
    return { loggedIn: false, username: "" };
  }
}

// ==================== 接口函数 ====================

async function home(params, context) {
  try {
    await OmniBox.log("info", `[home] start, sites=${SITES.length}`);

    const classList = SITES.map((site) => ({ type_id: `site_${site.id}`, type_name: site.name }));

    const filters = {};
    const filterResults = await Promise.all(
      SITES.map(async (site) => ({ siteId: site.id, filters: buildSiteFilters(site, await fetchExternalFilterConfig(site)) }))
    );
    for (const item of filterResults) {
      filters[`site_${item.siteId}`] = item.filters;
    }

    const recommendResults = await Promise.all(
      SITES.slice(0, 3).map(async (site) => {
        try {
          const firstCategory = Object.keys(site.defaultCategories)[0] || "1";
          const result = await fetchSiteCategoryList(site, firstCategory, 1);
          return result.list.slice(0, 4);
        } catch (error) {
          await OmniBox.log("warn", `[home] recommend fail ${site.name}: ${error.message}`);
          return [];
        }
      })
    );

    const recommendList = recommendResults.flat().slice(0, 12);
    await OmniBox.log("info", `[home] class=${classList.length}, recommend=${recommendList.length}`);
    return { class: classList, list: recommendList, filters };
  } catch (error) {
    await OmniBox.log("error", `[home] ${error.message}`);
    return { class: [], list: [], filters: {} };
  }
}

async function category(params, context) {
  try {
    const typeId = params.categoryId || "";
    const page = parseInt(params.page || "1", 10);
    const filters = params.filters || {};
    await OmniBox.log("info", `[category] typeId=${typeId}, page=${page}, filters=${JSON.stringify(filters)}`);

    if (!typeId.startsWith("site_")) {
      return { list: [], page: 1, pagecount: 0, total: 0 };
    }

    const siteId = typeId.replace("site_", "");
    const site = SITES.find((s) => s.id === siteId);
    if (!site) {
      return { list: [], page: 1, pagecount: 0, total: 0 };
    }

    const externalFilterConfig = await fetchExternalFilterConfig(site);
    const siteFilters = buildSiteFilters(site, externalFilterConfig);

    let categoryId = filters.categoryId || "";
    const categories = Object.keys(site.defaultCategories);
    if (!categoryId && categories.length > 0) {
      categoryId = categories[0];
      await OmniBox.log("info", `[category] default categoryId=${categoryId}`);
    }
    if (!categoryId) {
      return { list: [], page: 1, pagecount: 0, total: 0, filters: siteFilters };
    }

    const categoryFilters = { ...filters };
    delete categoryFilters.categoryId;
    const result = await fetchSiteCategoryList(site, categoryId, page, categoryFilters);
    const pagecount = result.totalPages || Math.ceil(result.total / PAGE_SIZE) || 1;
    await OmniBox.log("info", `[category] return page=${page}, pagecount=${pagecount}, total=${result.total}`);
    return { list: result.list, page, pagecount, total: result.total, filters: siteFilters };
  } catch (error) {
    await OmniBox.log("error", `[category] ${error.message}`);
    return { list: [], page: 1, pagecount: 0, total: 0 };
  }
}

async function detail(params, context) {
  try {
    const videoId = params.videoId || "";
    const drives = context?.drives || [];
    await OmniBox.log("info", `[detail] videoId=${videoId}`);
    if (!videoId) return { list: [] };
    const data = await handleSiteDetail(videoId, drives, context);
    return { list: data ? [data] : [] };
  } catch (error) {
    await OmniBox.log("error", `[detail] ${error.message}`);
    return { list: [] };
  }
}

async function search(params, context) {
  try {
    const keyword = params.keyword || "";
    const page = parseInt(params.page || "1", 10);
    await OmniBox.log("info", `[search] keyword=${keyword}, page=${page}`);
    if (!keyword) return { list: [], page: 1, pagecount: 0, total: 0 };

    const resultsArrays = await Promise.all(SITES.map((site) => fetchSiteSearch(site, keyword, page)));
    const allResults = resultsArrays.flat();
    await OmniBox.log("info", `[search] total=${allResults.length}`);
    return { list: allResults, page, pagecount: 1, total: allResults.length };
  } catch (error) {
    await OmniBox.log("error", `[search] ${error.message}`);
    return { list: [], page: 1, pagecount: 0, total: 0 };
  }
}

async function play(params, context) {
  try {
    const playId = params.playId || "";
    const flag = params.flag || "";
    const from = context?.from || "web";
    const drives = context?.drives || [];
    await OmniBox.log("info", `[play] flag=${flag}, playId=${playId}`);

    if (!playId) return { urls: [], header: {}, danmaku: [] };

    if (playId.startsWith("link://")) {
      const baseId = playId.split("?")[0];
      const match = baseId.match(/^link:\/\/([^/]+)\/(.+)$/);
      if (match) {
        const [, driveKey, encodedUrl] = match;
        const url = decodeURIComponent(encodedUrl);
        const drive = drives.find((o) => o.key === driveKey);
        if (drive) {
          try {
            return await drive.play(url, flag);
          } catch (error) {
            return { error: `播放失败: ${error.message}` };
          }
        }
      }
    }

    const parts = playId.split("|");
    if (parts.length < 2) return { urls: [], header: {}, danmaku: [] };

    const shareURL = parts[0];
    const fileId = parts[1];
    const rawScrapeKey = parts[2] || "";
    const fallbackDanmakuFileName = parts[3] ? decodeURIComponent(parts[3]) : "";
    const scrapeKey = rawScrapeKey ? `${rawScrapeKey.split("@@")[0]}@@${encodeURIComponent(shareURL)}` : "";
    
    let routeType = from === "web" ? "服务端代理" : "直连";
    if (flag.includes("-")) {
      const flagParts = flag.split("-");
      routeType = flagParts[flagParts.length - 1];
    }
    await OmniBox.log("info", `[play] 使用线路: ${routeType}`);

    // ==================== 并行处理：主链路(播放地址) + 辅链路(刮削元数据/弹幕) ====================
    const playInfoPromise = OmniBox.getDriveVideoPlayInfo(shareURL, fileId, routeType);
    const metadataPromise = (async () => {
      const result = {
        danmakuList: [],
        scrapeTitle: "",
        scrapePic: "",
        episodeNumber: null,
        episodeName: params.episodeName || "",
      };

      if (!scrapeKey) return result;

      try {
        const metadata = await OmniBox.getScrapeMetadata(scrapeKey);
        if (!metadata || !metadata.scrapeData || !Array.isArray(metadata.videoMappings)) {
          await OmniBox.log("warn", `[play] 未获取到有效的刮削元数据`);
          return result;
        }

        const formattedFileId = `${shareURL}|${fileId}|${scrapeKey}`;
        const matchedMapping = metadata.videoMappings.find((mapping) => mapping && mapping.fileId === formattedFileId);
        if (!matchedMapping) {
          await OmniBox.log("warn", `[play] 未找到文件映射: ${formattedFileId}`);
          return result;
        }

        const scrapeData = metadata.scrapeData;
        result.scrapeTitle = scrapeData.title || "";
        if (scrapeData.posterPath) {
          result.scrapePic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
        }

        if (matchedMapping.episodeNumber) {
          result.episodeNumber = matchedMapping.episodeNumber;
        }
        if (matchedMapping.episodeName && !result.episodeName) {
          result.episodeName = matchedMapping.episodeName;
        }

        // 生成 fileName 用于弹幕匹配（参考木偶.js）
        let fileName = "";
        const scrapeType = metadata.scrapeType || "";
        if (scrapeType === "movie") {
          fileName = scrapeData.title || "";
        } else {
          const title = scrapeData.title || "";
          const seasonAirYear = scrapeData.seasonAirYear || "";
          const seasonNumber = matchedMapping.seasonNumber || 1;
          const episodeNum = matchedMapping.episodeNumber || 1;
          fileName = `${title}.${seasonAirYear}.S${String(seasonNumber).padStart(2, "0")}E${String(episodeNum).padStart(2, "0")}`;
        }

        if (fileName) {
          await OmniBox.log("info", `[play] 生成fileName用于弹幕匹配: ${fileName}`);
          const matchedDanmaku = await OmniBox.getDanmakuByFileName(fileName);
          if (Array.isArray(matchedDanmaku) && matchedDanmaku.length > 0) {
            result.danmakuList = matchedDanmaku;
            await OmniBox.log("info", `[play] 弹幕匹配成功,找到 ${matchedDanmaku.length} 条弹幕`);
          }
        }
      } catch (error) {
        await OmniBox.log("warn", `[play] 弹幕匹配失败: ${error.message}`);
      }

      return result;
    })();

    const [playInfoResult, metadataResult] = await Promise.allSettled([playInfoPromise, metadataPromise]);

    if (playInfoResult.status !== "fulfilled") {
      throw new Error(playInfoResult.reason && playInfoResult.reason.message ? playInfoResult.reason.message : "无法获取播放地址");
    }

    const playInfo = playInfoResult.value;
    if (!playInfo || !playInfo.url || !Array.isArray(playInfo.url) || playInfo.url.length === 0) {
      throw new Error("无法获取播放地址");
    }

    let danmakuList = [];
    let scrapeTitle = "";
    let scrapePic = "";
    let episodeNumber = null;
    let episodeName = params.episodeName || "";

    if (metadataResult.status === "fulfilled" && metadataResult.value) {
      danmakuList = metadataResult.value.danmakuList || [];
      scrapeTitle = metadataResult.value.scrapeTitle || "";
      scrapePic = metadataResult.value.scrapePic || "";
      episodeNumber = metadataResult.value.episodeNumber || null;
      episodeName = metadataResult.value.episodeName || episodeName;
    } else if (metadataResult.status === "rejected") {
      await OmniBox.log("warn", `[play] 获取元数据失败(不影响播放): ${metadataResult.reason && metadataResult.reason.message ? metadataResult.reason.message : metadataResult.reason}`);
    }

    // ==================== 添加观看记录（参考木偶.js）====================
    try {
      const sourceId = context.sourceId;
      if (sourceId) {
        const dedupeKey = `${sourceId}|${playId}`;
        const now = Date.now();
        const lastAdded = playHistoryDedupeCache.get(dedupeKey);
        if (lastAdded && now - lastAdded < 2000) {
          await OmniBox.log("info", `[play] 跳过重复观看记录: ${dedupeKey}`);
        } else {
          playHistoryDedupeCache.set(dedupeKey, now);
          const title = params.title || scrapeTitle || shareURL;
          const pic = params.pic || scrapePic || "";

          OmniBox.addPlayHistory({
            vodId: scrapeKey,
            title: title,
            pic: pic,
            episode: playId,
            sourceId: sourceId,
            episodeNumber: episodeNumber,
            episodeName: episodeName,
          })
            .then((added) => {
              if (added) {
                OmniBox.log("info", `[play] 已添加观看记录: ${title}`);
              } else {
                OmniBox.log("info", `[play] 观看记录已存在,跳过添加: ${title}`);
              }
            })
            .catch((error) => {
              OmniBox.log("warn", `[play] 添加观看记录失败: ${error.message}`);
            });
        }
      }
    } catch (error) {
      await OmniBox.log("warn", `[play] 添加观看记录失败: ${error.message}`);
    }

    const urls = playInfo.url.map((item) => ({ name: item.name || "播放", url: item.url }));
    const header = playInfo.header || {};
    const finalDanmakuList = danmakuList.length > 0 ? danmakuList : playInfo.danmaku || [];

    await OmniBox.log("info", `[play] urls=${urls.length}, danmaku=${finalDanmakuList.length}, scrape=${ENABLE_SCRAPE ? "on" : "off"}`);
    return {
      urls,
      header: header,
      parse: 0,
      danmaku: finalDanmakuList};
  } catch (error) {
    await OmniBox.log("error", `[play] ${error.message}`);
    return { urls: [], header: {}, danmaku: [] };
  }
}

});
