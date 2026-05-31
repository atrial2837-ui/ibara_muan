"""Paste setlist from clipboard and convert to 茨むあん CSV format.

Input:
  - Clipboard text (YouTube URL + setlist) OR text file
  - Optional: Spreadsheet reference for normalization

Output:
  - CSV file matching 茨むあん　歌唱データベース format

Features:
  - Multiple timestamp format support
  - Duplicate detection
  - Normalization with reference data
  - Direct clipboard paste support

Requires:
  python -m pip install pyperclip yt-dlp
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import subprocess
import sys
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Any

try:
    import pyperclip
except ImportError:
    pyperclip = None

# Timestamp patterns (more comprehensive)
TIMESTAMP_PATTERNS = [
    r"(?:^|\s)(?:\d{1,2}:)?\d{1,2}:\d{2}(?:\.\d+)?(?:\s|$)",  # 03:15 or 1:03:15
    r"(?:^|\s)\d{1,2}[：:]\d{2}(?:\.\d+)?(?:\s|$)",  # 3：15
    r"【\s*(?:\d{1,2}:)?\d{1,2}:\d{2}\s*】",  # 【03:15】
    r"\[\s*(?:\d{1,2}:)?\d{1,2}:\d{2}\s*\]",  # [03:15]
    r"^\s*\d+\s*[\.．、:：]\s*",  # 1. or 1： or 1、
]

LEADING_TIMESTAMP_RE = re.compile(
    r"^\s*\[?\s*(?:\d{1,2}:)?\d{1,2}:\d{2}\s*\]?"
    r"(?:\s*[-~〜－–—]\s*\[?\s*(?:\d{1,2}:)?\d{1,2}:\d{2}\s*\]?)?\s*"
)

LEADING_MARK_RE = re.compile(r"^\s*(?:\d{1,3}[\).．、:：-]?|[・･*\-–—♪♫#]+)\s*")

URL_RE = re.compile(r"https?://(?:www\.)?(?:youtube\.com|youtu\.be)/\S+")

NON_SONG_LINE_RE = re.compile(
    r"^(?:MC|MCパート|トーク|雑談|休憩|告知|アンコール|OP|ED|BGM|SE)\s*$", re.I
)

SETLIST_KEYWORDS = ("セトリ", "セットリスト", "歌った曲", "曲リスト", "歌リスト", "タイムスタンプ", "timestamp")

NOISE_WORDS = ("お疲れ", "ありがとう", "配信", "最高", "かわいい", "チャンネル", "登録", "http", "www.")


def norm_text(value: str) -> str:
    """Normalize text for comparison."""
    return unicodedata.normalize("NFKC", value or "").replace(" ", "").replace("　", "").upper()


def split_song(value: str) -> tuple[str, str]:
    """Split song into title and artist."""
    text = clean_song_line(value)
    text = text.replace("／", "/")
    if " / " in text:
        title, artist = text.split(" / ", 1)
        return title.strip(), artist.strip()
    if "/" in text:
        title, artist = text.split("/", 1)
        return title.strip(), artist.strip()
    if "_" in text:
        title, artist = text.split("_", 1)
        return title.strip(), artist.strip()
    return text.strip(), ""


def song_key(title: str, artist: str) -> str:
    """Generate unique key for song."""
    return f"{norm_text(title)}__{norm_text(artist)}"


def clean_song_line(line: str) -> str:
    """Clean song line by removing timestamps, marks, and ruby text."""
    line = line.replace("　", " ").strip()
    # Remove timestamp prefix (00:00:00 00.)
    line = re.sub(r"^\s*\d{1,2}:\d{2}:\d{2}\s+\d{1,2}\.\s*", "", line)
    line = re.sub(r"^\s*\d{1,2}:\d{2}\s+\d{1,2}\.\s*", "", line)
    line = LEADING_TIMESTAMP_RE.sub("", line)
    line = LEADING_MARK_RE.sub("", line)
    # Remove ruby text in brackets [Kurakura]
    line = re.sub(r"\[.*?\]", "", line)
    line = re.sub(r"\s+#.*$", "", line).strip()
    line = re.sub(r"\s+", " ", line)
    if NON_SONG_LINE_RE.match(line):
        return ""
    if not line:
        return ""
    lowered = line.lower()
    if any(word.lower() in lowered for word in SETLIST_KEYWORDS) and len(line) < 20:
        return ""
    if line.startswith(("http://", "https://")):
        return ""
    if len(line) > 120:
        return ""
    return line


def extract_timestamp(line: str) -> str:
    """Extract timestamp from line if present."""
    for pattern in TIMESTAMP_PATTERNS:
        match = re.search(pattern, line)
        if match:
            return match.group(0).strip()
    return ""


def extract_songs(text: str) -> list[dict[str, str]]:
    """Extract songs from text with timestamps."""
    songs = []
    seen = set()
    
    for raw_line in text.splitlines():
        line = clean_song_line(raw_line)
        if not line:
            continue
        
        timestamp = extract_timestamp(raw_line)
        title, artist = split_song(line)
        
        if not title:
            continue
        
        # Check if it looks like a song entry
        looks_like_song = bool(
            timestamp
            or "/" in line
            or "／" in line
            or "_" in line
            or LEADING_MARK_RE.search(raw_line)
        )
        
        if not looks_like_song:
            continue
        
        key = song_key(title, artist)
        if key not in seen:
            songs.append({
                "song": title,
                "artist": artist,
                "timestamp": timestamp,
            })
            seen.add(key)
    
    return songs


def run_ytdlp(url: str) -> dict[str, Any]:
    """Fetch video info using yt-dlp."""
    cmd = [
        sys.executable,
        "-m",
        "yt_dlp",
        "--skip-download",
        "--dump-json",
        "--no-playlist",
        url,
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip())
    return json.loads(proc.stdout)


def format_date(value: str) -> str:
    """Format date from yt-dlp format."""
    if not value:
        return ""
    try:
        return datetime.strptime(value, "%Y%m%d").strftime("%Y-%m-%d")
    except ValueError:
        return value


def format_time(value: str) -> str:
    """Format time from yt-dlp format."""
    if not value:
        return ""
    try:
        dt = datetime.strptime(value, "%Y%m%d")
        return "00:00:00"  # Default time if not available
    except ValueError:
        return "00:00:00"


def parse_input(text: str) -> list[dict[str, str]]:
    """Parse input text into URL and setlist blocks.
    
    Format:
    URL
    setlist line 1
    setlist line 2
    (empty line)
    URL
    setlist line 1
    ...
    """
    items = []
    seen_urls = set()
    lines = text.splitlines()
    i = 0
    
    while i < len(lines):
        line = lines[i].strip()
        
        # Skip empty lines and comments
        if not line or line.startswith("#"):
            i += 1
            continue
        
        # Check if line contains URL
        match = URL_RE.search(line)
        if match:
            url = match.group(0)
            
            # Skip duplicate URLs
            if url in seen_urls:
                i += 1
                continue
            
            seen_urls.add(url)
            setlist_lines = []
            i += 1
            
            # Collect setlist lines until next URL or empty line
            while i < len(lines):
                next_line = lines[i].rstrip()
                # Stop at next URL or double empty line
                if URL_RE.search(next_line):
                    break
                if not next_line.strip() and i + 1 < len(lines) and not lines[i + 1].strip():
                    i += 1
                    break
                if not next_line.strip() and setlist_lines:
                    break
                setlist_lines.append(next_line)
                i += 1
            
            items.append({
                "url": url,
                "setlist_text": "\n".join(setlist_lines).strip()
            })
        else:
            i += 1
    
    return items


def save_csv(results: list[dict[str, Any]], output_path: Path) -> None:
    """Save results as CSV matching 茨むあん　歌唱データベース format."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    header = [
        "配信日", "開始時刻", "歌枠URL", "枠タイトル", "曲順", "曲名", 
        "アーティスト名", "キー", "ジャンル", "セトリ原文", "タイムスタンプ",
        "確認状態", "備考", "正規化曲名", "正規化アーティスト", "曲キー",
        "重複チェック", "D1投入"
    ]
    
    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        
        for result in results:
            if "error" in result:
                continue
            
            url = result["url"]
            songs = result.get("songs", [])
            
            if not songs:
                # No songs found, add empty row
                writer.writerow([
                    result["date"],
                    result["time"],
                    url,
                    result["title"],
                    "", "", "", "", "", "", "", "", "", "", "", "", ""
                ])
            else:
                # Add one row per song
                for idx, song in enumerate(songs, 1):
                    writer.writerow([
                        result["date"],
                        result["time"],
                        url,
                        result["title"],
                        idx,
                        song["song"],
                        song["artist"],
                        "", "",  # キー, ジャンル
                        result["setlist_text"][:500] if result.get("setlist_text") else "",  # セトリ原文
                        song["timestamp"],
                        "", "", "", "", "", "", ""  # 確認状態, 備考, 正規化曲名, 正規化アーティスト, 曲キー, 重複チェック, D1投入
                    ])


def save_csv_append(results: list[dict[str, Any]], output_path: Path) -> None:
    """Append results to existing CSV file."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    header = [
        "配信日", "開始時刻", "歌枠URL", "枠タイトル", "曲順", "曲名", 
        "アーティスト名", "キー", "ジャンル", "セトリ原文", "タイムスタンプ",
        "確認状態", "備考", "正規化曲名", "正規化アーティスト", "曲キー",
        "重複チェック", "D1投入"
    ]
    
    file_exists = output_path.exists()
    
    with open(output_path, "a", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        
        if not file_exists:
            writer.writerow(header)
        
        for result in results:
            if "error" in result:
                continue
            
            url = result["url"]
            songs = result.get("songs", [])
            
            if not songs:
                writer.writerow([
                    result["date"],
                    result["time"],
                    url,
                    result["title"],
                    "", "", "", "", "", "", "", "", "", "", "", "", ""
                ])
            else:
                for idx, song in enumerate(songs, 1):
                    writer.writerow([
                        result["date"],
                        result["time"],
                        url,
                        result["title"],
                        idx,
                        song["song"],
                        song["artist"],
                        "", "",  # キー, ジャンル
                        result["setlist_text"][:500] if result.get("setlist_text") else "",  # セトリ原文
                        song["timestamp"],
                        "", "", "", "", "", "", ""  # 確認状態, 備考, 正規化曲名, 正規化アーティスト, 曲キー, 重複チェック, D1投入
                    ])


def main() -> None:
    parser = argparse.ArgumentParser(description="クリップボードまたはファイルからセトリを貼り付けて茨むあん用CSVを出力")
    parser.add_argument("--input", type=Path, help="入力テキストファイル")
    parser.add_argument("--output", type=Path, default=Path("setlist_output.csv"), help="出力CSVファイル")
    parser.add_argument("--interactive", action="store_true", help="対話モード（URL→セトリの順で入力）")
    parser.add_argument("--url", type=str, help="YouTube URL（クリップボードからセトリを読み込む）")
    parser.add_argument("--append", action="store_true", help="CSVに追記モード")
    args = parser.parse_args()
    
    results = []
    
    if args.url:
        # URL from argument, setlist from clipboard
        if not pyperclip:
            raise SystemExit("pyperclipが必要です (pip install pyperclip)")
        
        setlist_text = pyperclip.paste()
        print(f"クリップボードからセトリを読み込みました ({len(setlist_text)} 文字)")
        
        try:
            info = run_ytdlp(args.url)
            songs = extract_songs(setlist_text) if setlist_text else []
            
            results.append({
                "url": args.url,
                "date": format_date(info.get("upload_date") or info.get("release_date")),
                "time": format_time(info.get("upload_date") or info.get("release_date")),
                "title": info.get("title", ""),
                "setlist_text": setlist_text,
                "songs": songs,
            })
            
            print(f"  → {len(songs)} 曲抽出")
        except Exception as exc:
            print(f"  → エラー: {exc}")
            results.append({
                "error": str(exc),
                "url": args.url,
                "date": "",
                "time": "",
                "title": "取得失敗",
                "setlist_text": "",
                "songs": [],
            })
    elif args.input:
        # File input mode
        text = args.input.read_text(encoding="utf-8")
        items = parse_input(text)
        if not items:
            raise SystemExit("YouTube URLが見つかりませんでした")
        
        print(f"{len(items)} 件のURLを処理します")
        
        for index, item in enumerate(items, start=1):
            url = item["url"]
            print(f"[{index}/{len(items)}] {url}")
            
            try:
                info = run_ytdlp(url)
                setlist_text = item.get("setlist_text", "").strip()
                songs = extract_songs(setlist_text) if setlist_text else []
                
                results.append({
                    "url": url,
                    "date": format_date(info.get("upload_date") or info.get("release_date")),
                    "time": format_time(info.get("upload_date") or info.get("release_date")),
                    "title": info.get("title", ""),
                    "setlist_text": setlist_text,
                    "songs": songs,
                })
                
                print(f"  → {len(songs)} 曲抽出")
            except Exception as exc:
                print(f"  → エラー: {exc}")
                results.append({
                    "error": str(exc),
                    "url": url,
                    "date": "",
                    "time": "",
                    "title": "取得失敗",
                    "setlist_text": "",
                    "songs": [],
                })
    elif args.interactive or not pyperclip:
        # Interactive mode (streamlined)
        print("対話モード: URL→セトリを順に入力してください")
        print("URL入力後にEnter、セトリ貼り付け後に空行で完了、次のURLへ")
        print("空行2回で終了\n")
        
        while True:
            # Get URL
            url_input = input("YouTube URL: ").strip()
            if not url_input:
                break
            
            match = URL_RE.search(url_input)
            if not match:
                print("無効なURLです")
                continue
            
            url = match.group(0)
            
            # Get setlist (paste and end with empty line)
            print("セトリを貼り付けてください (空行で完了):")
            setlist_lines = []
            while True:
                try:
                    line = input()
                except EOFError:
                    break
                if line == "":
                    break
                setlist_lines.append(line)
            
            setlist_text = "\n".join(setlist_lines).strip()
            
            # Process
            try:
                info = run_ytdlp(url)
                songs = extract_songs(setlist_text) if setlist_text else []
                
                results.append({
                    "url": url,
                    "date": format_date(info.get("upload_date") or info.get("release_date")),
                    "time": format_time(info.get("upload_date") or info.get("release_date")),
                    "title": info.get("title", ""),
                    "setlist_text": setlist_text,
                    "songs": songs,
                })
                
                print(f"✓ {len(songs)} 曲抽出\n")
            except Exception as exc:
                print(f"✗ エラー: {exc}\n")
                results.append({
                    "error": str(exc),
                    "url": url,
                    "date": "",
                    "time": "",
                    "title": "取得失敗",
                    "setlist_text": "",
                    "songs": [],
                })
    else:
        # Clipboard mode
        text = pyperclip.paste()
        if not text:
            raise SystemExit("クリップボードが空です")
        print(f"クリップボードから {len(text)} 文字を読み込みました")
        
        items = parse_input(text)
        if not items:
            raise SystemExit("YouTube URLが見つかりませんでした")
        
        print(f"{len(items)} 件のURLを処理します")
        
        for index, item in enumerate(items, start=1):
            url = item["url"]
            print(f"[{index}/{len(items)}] {url}")
            
            try:
                info = run_ytdlp(url)
                setlist_text = item.get("setlist_text", "").strip()
                songs = extract_songs(setlist_text) if setlist_text else []
                
                results.append({
                    "url": url,
                    "date": format_date(info.get("upload_date") or info.get("release_date")),
                    "time": format_time(info.get("upload_date") or info.get("release_date")),
                    "title": info.get("title", ""),
                    "setlist_text": setlist_text,
                    "songs": songs,
                })
                
                print(f"  → {len(songs)} 曲抽出")
            except Exception as exc:
                print(f"  → エラー: {exc}")
                results.append({
                    "error": str(exc),
                    "url": url,
                    "date": "",
                    "time": "",
                    "title": "取得失敗",
                    "setlist_text": "",
                    "songs": [],
                })
    
    # Save CSV
    if args.append:
        save_csv_append(results, args.output)
        print(f"\n追記完了: {args.output}")
    else:
        save_csv(results, args.output)
        print(f"\n出力完了: {args.output}")
    
    # Summary
    success = sum(1 for r in results if "error" not in r)
    total_songs = sum(len(r.get("songs", [])) for r in results)
    print(f"成功: {success}/{len(results)}, 総曲数: {total_songs}")


if __name__ == "__main__":
    main()
