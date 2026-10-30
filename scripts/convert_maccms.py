#!/usr/bin/env python3
"""把"其他源"转成 OmniBox 爬虫源。
支持：
  1) TVBox/影视仓 配置（只取 api 为苹果CMS 的 type 0/1 站点，type 3 jar 蜘蛛无法转换）
  2) 你自己的 JSON 列表：[{"name":"xx","api":"https://.../api.php/provide/vod"}, ...]
流程：抽取 -> 逐个实探 ac=list -> 只保留活的 -> 套苹果CMS通用层生成蜘蛛。
"""
import json, os, re, sys, argparse, urllib.request, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
TPL = os.path.join(HERE, "templates", "maccms-template.js")
CMS_RE = re.compile(r"(provide/vod|api\.php)", re.I)

def http_text(url, timeout=12):
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept": "application/json,text/plain,*/*"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")

def probe(api):
    sep = "&" if "?" in api else "?"
    for q in ("ac=list", "ac=videolist&pg=1"):
        try:
            d = json.loads(http_text(api + sep + q))
            lst = d.get("list") if isinstance(d, dict) else None
            if lst:
                return len(lst)
        except Exception:
            pass
    return 0

def clean_name(s):
    s = re.sub(r"[\U0001F300-\U0001FAFF\u2600-\u27BF]", "", s or "")
    parts = [p.strip() for p in re.split(r"[┃|｜]", s) if p.strip()]
    s = parts[-1] if parts else ""
    return s[:24] or "未命名"

def load_sites(args):
    if args.tvbox:
        raw = http_text(args.tvbox, 30) if args.tvbox.startswith("http") else open(args.tvbox, encoding="utf-8").read()
        d = json.loads(raw)
        out = []
        for s in d.get("sites", []):
            api = s.get("api") or ""
            if not CMS_RE.search(api):
                continue
            if str(s.get("type", "1")) == "3":
                continue          # jar 蜘蛛，不是 HTTP 接口
            out.append({"name": clean_name(s.get("name")), "api": api})
        return out
    data = json.load(open(args.list, encoding="utf-8"))
    out = []
    for x in data:
        if isinstance(x, str):
            out.append({"name": urllib.parse.urlparse(x).netloc, "api": x})
        else:
            out.append({"name": clean_name(x.get("name")), "api": x.get("api") or x.get("url")})
    return [x for x in out if x["api"]]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tvbox"); ap.add_argument("--list")
    ap.add_argument("--name", required=True)
    ap.add_argument("--desc", default="由 tv4me 从外部源转换生成")
    ap.add_argument("--out", required=True)
    ap.add_argument("--download", default="")
    ap.add_argument("--version", default="2.20261030.1")
    ap.add_argument("--limit", type=int, default=0)
    a = ap.parse_args()
    if not (a.tvbox or a.list): ap.error("需要 --tvbox 或 --list")

    sites = load_sites(a)
    if a.limit: sites = sites[:a.limit]
    print("抽取到苹果CMS 站点 %d 个，开始验活 ..." % len(sites), flush=True)
    alive = []
    for i, s in enumerate(sites, 1):
        n = probe(s["api"])
        print("  [%d/%d] %-20s %s" % (i, len(sites), s["name"], ("✅ %d 条" % n) if n else "❌"))
        if n: alive.append(s)
    print("可用 %d / %d" % (len(alive), len(sites)), flush=True)
    if not alive: sys.exit("没有可用站点，未生成")

    tpl = open(TPL, encoding="utf-8").read()
    body = tpl[tpl.index('const OmniBox = require'):]
    head = ("// @name %s\n// @version %s\n// @description %s\n%s// @dependencies\n\n"
            % (a.name, a.version, a.desc,
               ("// @downloadURL %s\n" % a.download) if a.download else ""))
    js = head + body
    sites_js = "const SITES = " + json.dumps(alive, ensure_ascii=False, indent=2) + ";"
    js = re.sub(r"const SITES = \[[\s\S]*?\n\];", sites_js, js, count=1)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    open(a.out, "w", encoding="utf-8").write(js)
    print("已生成 %s（%d 站，%.0f KB）" % (a.out, len(alive), len(js) / 1024))

if __name__ == "__main__":
    main()
