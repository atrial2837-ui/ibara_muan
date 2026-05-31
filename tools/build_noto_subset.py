"""Build self-hosted Noto Sans JP WOFF2 subsets for the public site.

Input:
  - C:/Users/owner/Downloads/Noto_Sans_JP.zip by default
  - tools/noto-sans-jp-ui-subset-chars.txt for the subset corpus

Requires:
  python -m pip install fonttools brotli
"""

from __future__ import annotations

import argparse
import shutil
import tempfile
import zipfile
from pathlib import Path

from fontTools import subset


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ZIP = Path.home() / "Downloads" / "Noto_Sans_JP.zip"
DEFAULT_CHARS = ROOT / "tools" / "noto-sans-jp-ui-subset-chars.txt"
OUTPUT_DIR = ROOT / "docs" / "assets" / "fonts"


def build_weight(input_font: Path, output_font: Path, chars_file: Path) -> None:
    options = subset.Options()
    options.flavor = "woff2"
    options.with_zopfli = True
    options.layout_features = ["*"]
    font = subset.load_font(str(input_font), options)
    subsetter = subset.Subsetter(options)
    subsetter.populate(text=chars_file.read_text(encoding="utf-8"))
    subsetter.subset(font)
    subset.save_font(font, str(output_font), options)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, default=DEFAULT_ZIP)
    parser.add_argument("--chars", type=Path, default=DEFAULT_CHARS)
    args = parser.parse_args()

    if not args.zip.exists():
        raise SystemExit(f"Noto Sans JP zip not found: {args.zip}")
    if not args.chars.exists():
        raise SystemExit(f"subset chars file not found: {args.chars}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
        tmpdir = Path(tmp)
        with zipfile.ZipFile(args.zip) as zf:
            zf.extract("static/NotoSansJP-Regular.ttf", tmpdir)
            zf.extract("static/NotoSansJP-Bold.ttf", tmpdir)
            zf.extract("OFL.txt", tmpdir)

        build_weight(
            tmpdir / "static" / "NotoSansJP-Regular.ttf",
            OUTPUT_DIR / "noto-sans-jp-ibara-400.woff2",
            args.chars,
        )
        build_weight(
            tmpdir / "static" / "NotoSansJP-Bold.ttf",
            OUTPUT_DIR / "noto-sans-jp-ibara-700.woff2",
            args.chars,
        )
        shutil.copyfile(tmpdir / "OFL.txt", OUTPUT_DIR / "NotoSansJP-OFL.txt")

    for path in sorted(OUTPUT_DIR.glob("noto-sans-jp-ibara-*.woff2")):
        print(f"{path.relative_to(ROOT)} {path.stat().st_size / 1024:.1f} KiB")


if __name__ == "__main__":
    main()
