#!/usr/bin/env python3
"""Build Frame & Pane .mcpack and .mcaddon release archives."""

from __future__ import annotations

import json
import shutil
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BP = ROOT / "behavior_pack"
RP = ROOT / "resource_pack"
BUILD = ROOT / "build"


def version_from_manifest(path: Path) -> str:
    with path.open("r", encoding="utf-8") as handle:
        manifest = json.load(handle)
    version = manifest["header"]["version"]
    if not isinstance(version, list) or len(version) != 3:
        raise ValueError(f"Invalid semantic version in {path}")
    return ".".join(str(part) for part in version)


def archive_directory(source: Path, destination: Path) -> None:
    with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for file_path in sorted(source.rglob("*")):
            if file_path.is_file():
                archive.write(file_path, file_path.relative_to(source).as_posix())


def main() -> int:
    bp_version = version_from_manifest(BP / "manifest.json")
    rp_version = version_from_manifest(RP / "manifest.json")
    if bp_version != rp_version:
        raise ValueError(f"BP version {bp_version} does not match RP version {rp_version}")

    if BUILD.exists():
        shutil.rmtree(BUILD)
    BUILD.mkdir(parents=True)

    bp_archive = BUILD / f"Frame_and_Pane_BP_v{bp_version}.mcpack"
    rp_archive = BUILD / f"Frame_and_Pane_RP_v{rp_version}.mcpack"
    addon_archive = BUILD / f"Frame_and_Pane_v{bp_version}.mcaddon"

    archive_directory(BP, bp_archive)
    archive_directory(RP, rp_archive)

    with zipfile.ZipFile(addon_archive, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        archive.write(bp_archive, bp_archive.name)
        archive.write(rp_archive, rp_archive.name)

    print(f"Built {addon_archive.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
        print(f"Build failed: {error}", file=sys.stderr)
        raise SystemExit(1)
