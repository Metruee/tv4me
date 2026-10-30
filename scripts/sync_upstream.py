#!/usr/bin/env python3
"""拉取 Silent1566/OmniBox-Spider -> 逐个实跑验活 -> 按分类重新合并 -> 版本号自增。"""
import os, sys, json, tarfile, shutil, tempfile, subprocess, datetime, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REPO = "Silent1566/OmniBox-Spider"
TAR = "https://gh-proxy.com/https://codeload.github.com/%s/tar.gz/refs/heads/main" % REPO

def fetch(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=180) as r, open(path, "wb") as f:
        shutil.copyfileobj(r, f)

def verify(workdir, relpath):
    env = dict(os.environ)
    env["NODE_PATH"] = os.pathsep.join([os.path.join(HERE, "sdk"), os.path.join(HERE, "node_modules")])
    try:
        p = subprocess.run(["node", os.path.join(HERE, "verify_spider.js"), os.path.join(workdir, relpath)],
                           cwd=HERE, env=env, capture_output=True, timeout=70)
        lines = [l for l in p.stdout.decode("utf-8", "replace").strip().splitlines() if l.startswith("{")]
        return json.loads(lines[-1])["ok"] if lines else False
    except Exception:
        return False

def balanced(files, n):
    items = sorted(((os.path.getsize(f), f) for f in files), reverse=True)
    gs = [[] for _ in range(n)]; sz = [0] * n
    for s, f in items:
        i = sz.index(min(sz)); gs[i].append(f); sz[i] += s
    return [sorted(g) for g in gs]

def main():
    tmp = tempfile.mkdtemp(prefix="obspider-")
    tar = os.path.join(tmp, "s.tar.gz")
    print("[1/4] 下载上游 ...", flush=True)
    fetch(TAR, tar)
    with tarfile.open(tar) as t:
        t.extractall(tmp)
    work = [os.path.join(tmp, d) for d in os.listdir(tmp) if os.path.isdir(os.path.join(tmp, d))][0]
    print("[2/4] 解包到", work, flush=True)

    files = []
    for dp, dn, fn in os.walk(work):
        if "/tests" in dp or "/.github" in dp: continue
        for f in fn:
            if f.endswith(".js"):
                files.append(os.path.relpath(os.path.join(dp, f), work))
    print("      检测 %d 个源 ..." % len(files), flush=True)

    ok = []
    for i, f in enumerate(sorted(files), 1):
        if verify(work, f):
            ok.append(f)
        if i % 20 == 0: print("      %d/%d" % (i, len(files)), flush=True)
    print("[3/4] 可用 %d / %d" % (len(ok), len(files)), flush=True)

    def pick(prefixes):
        return [f for f in ok if f.startswith(tuple(prefixes)) if f]
    groups = []
    for idx, g in enumerate(balanced(pick(["影视/采集/", "影视/解析/"]), 3)):
        groups.append(("影视采集%s(合并%d源)" % ("ABC"[idx], len(g)), "自动同步：采集聚合", g))
    for idx, g in enumerate(balanced(pick(["影视/网盘/"]), 2)):
        groups.append(("网盘影视%s(合并%d源)" % ("AB"[idx], len(g)), "自动同步：网盘聚合", g))
    groups.append(("短剧聚合(合并)", "自动同步：短剧", pick(["短剧/"])))
    groups.append(("音乐听书聚合(合并)", "自动同步：音乐听书", pick(["音乐/", "听书/"])))
    groups.append(("教育(合并)", "自动同步：纯教育", pick(["教育/"])))
    groups.append(("动漫(合并)", "自动同步：动漫", pick(["动漫/"])))
    groups.append(("综合导航(合并)", "自动同步：综合导航", pick(["综合/", "导航/"])))

    old = {}
    cfgpath = os.path.join(ROOT, "config", "merged.json")
    if os.path.exists(cfgpath):
        for e in json.load(open(cfgpath, encoding="utf-8")):
            old[e["out"]] = e.get("version", "2.0.0")
    run = os.environ.get("GITHUB_RUN_NUMBER", "1")
    ver = "2.%s.%s" % (datetime.datetime.utcnow().strftime("%Y%m%d"), run)

    cfg = []
    for name, desc, files_ in groups:
        if not files_: continue
        base = "omnibox-%s.js" % name.split("(")[0].replace("影视采集", "采集").replace("网盘影视", "网盘") \
            .replace("短剧聚合", "短剧").replace("音乐听书聚合", "音乐听书").replace("教育", "教育") \
            .replace("动漫", "动漫").replace("综合导航", "综合导航")
        cfg.append({
            "name": name, "desc": desc, "version": ver, "files": files_,
            "out": "spiders/" + base,
            "download": "https://gh-proxy.com/https://raw.githubusercontent.com/Metruee/tv4me/main/spiders/" + base,
        })
    json.dump(cfg, open(cfgpath, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    sys.path.insert(0, HERE)
    import build_merged
    print("[4/4] 重新生成 ...", flush=True)
    for e in cfg:
        out, n, k = build_merged.build(e, work, ROOT)
        print("      %-44s %2d 源  %.0f KB" % (out, k, n / 1024))
    shutil.rmtree(tmp, ignore_errors=True)

if __name__ == "__main__":
    main()
