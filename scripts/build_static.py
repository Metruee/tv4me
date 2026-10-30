#!/usr/bin/env python3
"""按 config/static.json 生成"固定站点清单"类爬虫源（苹果CMS 通用层）。"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TPL = os.path.join(HERE, "templates", "maccms-template.js")

def build(entry):
    tpl = open(TPL, encoding="utf-8").read()
    body = tpl[tpl.index("const OmniBox = require"):]
    head = ("// @name %s\n// @version %s\n// @description %s\n// @downloadURL %s\n"
            "// @dependencies\n\n" % (entry["name"], entry["version"], entry["desc"], entry["download"]))
    js = head + body
    sites = "const SITES = " + json.dumps(entry["sites"], ensure_ascii=False, indent=2) + ";"
    js = re.sub(r"const SITES = \[[\s\S]*?\n\];", sites, js, count=1)
    out = os.path.join(ROOT, entry["out"])
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, "w", encoding="utf-8").write(js)
    return out, len(js)

if __name__ == "__main__":
    for e in json.load(open(os.path.join(ROOT, "config", "static.json"), encoding="utf-8")):
        out, n = build(e)
        print("%-46s %2d 站  %.0f KB" % (os.path.relpath(out, ROOT), len(e["sites"]), n / 1024))
