#!/usr/bin/env python3
"""Validate Frame & Pane manifests, JSON files, translations, and catalog counts."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BP = ROOT / "behavior_pack"
RP = ROOT / "resource_pack"
EXPECTED_BLOCKS = 228
EXPECTED_RECIPES = 228
EXPECTED_LOOT_TABLES = 228


def load_json(path: Path) -> object:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def validate_json_files() -> int:
    count = 0
    for root in (BP, RP):
        for path in sorted(root.rglob("*.json")):
            load_json(path)
            count += 1
    return count


def read_lang(path: Path) -> dict[str, str]:
    entries: dict[str, str] = {}
    for line_number, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            raise ValueError(f"Invalid lang line {path}:{line_number}")
        key, value = line.split("=", 1)
        if key in entries:
            raise ValueError(f"Duplicate lang key {key!r} in {path}")
        entries[key] = value
    return entries


def validate_manifests() -> None:
    bp_manifest = load_json(BP / "manifest.json")
    rp_manifest = load_json(RP / "manifest.json")
    bp_version = bp_manifest["header"]["version"]
    rp_version = rp_manifest["header"]["version"]
    if bp_version != rp_version:
        raise ValueError("Behavior Pack and Resource Pack versions do not match")

    rp_uuid = rp_manifest["header"]["uuid"]
    dependencies = bp_manifest.get("dependencies", [])
    if not any(dep.get("uuid") == rp_uuid and dep.get("version") == rp_version for dep in dependencies):
        raise ValueError("Behavior Pack does not depend on the current Resource Pack")


def validate_counts() -> None:
    counts = {
        "blocks": len(list((BP / "blocks").glob("*.json"))),
        "recipes": len(list((BP / "recipes").glob("*.json"))),
        "loot tables": len(list((BP / "loot_tables").rglob("*.json"))),
    }
    expected = {
        "blocks": EXPECTED_BLOCKS,
        "recipes": EXPECTED_RECIPES,
        "loot tables": EXPECTED_LOOT_TABLES,
    }
    for label, count in counts.items():
        if count != expected[label]:
            raise ValueError(f"Expected {expected[label]} {label}, found {count}")


def validate_translations() -> None:
    en = read_lang(RP / "texts" / "en_US.lang")
    es = read_lang(RP / "texts" / "es_MX.lang")
    missing_in_es = sorted(set(en) - set(es))
    missing_in_en = sorted(set(es) - set(en))
    if missing_in_es or missing_in_en:
        raise ValueError(
            "Translation key mismatch: "
            f"missing in es_MX={missing_in_es[:5]}, missing in en_US={missing_in_en[:5]}"
        )


def validate_javascript() -> str:
    node = shutil.which("node")
    if not node:
        return "Node.js not installed; skipped JavaScript syntax check"
    subprocess.run([node, "--check", str(BP / "scripts" / "main.js")], check=True)
    return "JavaScript syntax valid"


def main() -> int:
    validate_manifests()
    json_count = validate_json_files()
    validate_counts()
    validate_translations()
    js_result = validate_javascript()
    print(f"Validated {json_count} JSON files")
    print(f"Validated {EXPECTED_BLOCKS} blocks, {EXPECTED_RECIPES} recipes, and {EXPECTED_LOOT_TABLES} loot tables")
    print("Translation keys match between en_US and es_MX")
    print(js_result)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, KeyError, TypeError, ValueError, json.JSONDecodeError, subprocess.CalledProcessError) as error:
        print(f"Validation failed: {error}", file=sys.stderr)
        raise SystemExit(1)
