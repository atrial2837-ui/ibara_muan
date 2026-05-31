"""Prepare tools/input.txt rows for the 茨むあん Google Sheet.

This parses URL + setlist blocks, fetches YouTube title/date with yt-dlp,
and emits CSV/JSON artifacts that can be appended to the Google Sheet.
"""

from __future__ import annotations

import csv
import json
import re
import sys
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Any

import yt_dlp

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")


ROOT = Path("c:/Users/owner/dev/ibara_muan")
INPUT = ROOT / "tools/input.txt"
MASTER_CSV = ROOT / "converted_song_master.csv"
OUTPUT_LOG_CSV = ROOT / "input_song_log_additions.csv"
OUTPUT_MASTER_CSV = ROOT / "input_song_master_additions.csv"
OUTPUT_JSON = ROOT / "input_sheet_append_rows.json"

URL_RE = re.compile(r"https?://(?:www\.)?(?:youtube\.com|youtu\.be)/\S+")
SONG_RE = re.compile(
    r"^\s*(?P<timestamp>(?:\d{1,2}:)?\d{1,2}:\d{2})\s+"
    r"(?P<order>\d{1,3})[.．]\s*"
    r"(?P<body>.+?)\s*$"
)

LOG_HEADERS = [
    "配信日",
    "開始時刻",
    "歌枠URL",
    "枠タイトル",
    "曲順",
    "曲名",
    "アーティスト名",
    "キー",
    "ジャンル",
    "セトリ原文",
    "タイムスタンプ",
    "確認状態",
    "備考",
    "正規化曲名",
    "正規化アーティスト",
    "曲キー",
    "重複チェック",
    "D1投入",
]

MASTER_HEADERS = [
    "曲名",
    "アーティスト名",
    "正規化曲名",
    "正規化アーティスト",
    "曲キー",
    "ジャンル",
    "キー",
    "歌唱回数",
    "最初に歌った日",
    "最後に歌った日",
    "英語タイトル",
    "備考",
]


def normalize_key(value: str) -> str:
    text = unicodedata.normalize("NFKC", value or "")
    text = re.sub(r"[\u200b-\u200d\ufeff]", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip().casefold()


def song_key(title: str, artist: str) -> str:
    return f"{normalize_key(title)}\x1f{normalize_key(artist)}"


def display_key(title: str, artist: str) -> str:
    title = (title or "").strip()
    artist = (artist or "").strip()
    return f"{title} / {artist}" if artist else title


def parse_blocks(text: str) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        match = URL_RE.search(line)
        if match:
            if current:
                blocks.append(current)
            current = {"url": match.group(0), "lines": []}
            continue

        if current is not None:
            current["lines"].append(line)

    if current:
        blocks.append(current)

    for block in blocks:
        block["setlist_text"] = "\n".join(block["lines"]).strip()

    return blocks


def split_title_artist(body: str) -> tuple[str, str]:
    body = re.sub(r"\[.*?\]", "", body).replace("／", "/")
    parts = re.split(r"\s+/\s+", body, maxsplit=1)
    if len(parts) == 2:
        return parts[0].strip(), parts[1].strip()
    return body.strip(), ""


def parse_songs(setlist_text: str) -> list[dict[str, Any]]:
    songs: list[dict[str, Any]] = []
    for raw_line in setlist_text.splitlines():
        match = SONG_RE.match(raw_line)
        if not match:
            continue
        title, artist = split_title_artist(match.group("body"))
        if not title:
            continue
        songs.append(
            {
                "timestamp": match.group("timestamp"),
                "order": int(match.group("order")),
                "title": title,
                "artist": artist,
                "raw": raw_line.strip(),
            }
        )
    return songs


def format_date(value: str | None) -> str:
    if not value:
        return ""
    try:
        return datetime.strptime(value, "%Y%m%d").strftime("%Y/%m/%d")
    except ValueError:
        return value


def fetch_video_info(url: str) -> dict[str, Any]:
    options = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "noplaylist": True,
    }
    with yt_dlp.YoutubeDL(options) as ydl:
        info = ydl.extract_info(url, download=False)
    return {
        "title": info.get("title", ""),
        "date": format_date(info.get("upload_date") or info.get("release_date")),
    }


def load_master(path: Path) -> dict[str, tuple[str, str]]:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        return {
            song_key(row.get("曲名", ""), row.get("アーティスト名", "")): (
                row.get("正規化曲名") or row.get("曲名", ""),
                row.get("正規化アーティスト") or row.get("アーティスト名", ""),
            )
            for row in reader
            if row.get("曲名")
        }


def write_csv(path: Path, headers: list[str], rows: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=headers, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    text = INPUT.read_text(encoding="utf-8-sig")
    blocks = parse_blocks(text)
    master = load_master(MASTER_CSV)

    log_rows: list[dict[str, Any]] = []
    new_master: dict[str, dict[str, Any]] = {}
    stats: list[dict[str, Any]] = []

    for index, block in enumerate(blocks, start=1):
        print(f"[{index}/{len(blocks)}] {block['url']}")
        info = fetch_video_info(block["url"])
        songs = parse_songs(block["setlist_text"])
        stats.append({"url": block["url"], "songs": len(songs), **info})
        print(f"  {info['date']} / {len(songs)} songs / {info['title']}")

        for song in songs:
            key = song_key(song["title"], song["artist"])
            norm_title, norm_artist = master.get(key, (song["title"], song["artist"]))
            row = {
                "配信日": info["date"],
                "開始時刻": "",
                "歌枠URL": block["url"],
                "枠タイトル": info["title"],
                "曲順": song["order"],
                "曲名": song["title"],
                "アーティスト名": song["artist"],
                "キー": "",
                "ジャンル": "",
                "セトリ原文": song["raw"],
                "タイムスタンプ": song["timestamp"],
                "確認状態": "確認済み",
                "備考": "",
                "正規化曲名": norm_title,
                "正規化アーティスト": norm_artist,
                "曲キー": display_key(norm_title, norm_artist),
                "重複チェック": "",
                "D1投入": "未投入",
            }
            log_rows.append(row)

            if key not in master and key not in new_master:
                new_master[key] = {
                    "曲名": song["title"],
                    "アーティスト名": song["artist"],
                    "正規化曲名": song["title"],
                    "正規化アーティスト": song["artist"],
                    "曲キー": display_key(song["title"], song["artist"]),
                    "ジャンル": "",
                    "キー": "",
                    "歌唱回数": "",
                    "最初に歌った日": info["date"],
                    "最後に歌った日": info["date"],
                    "英語タイトル": "",
                    "備考": "input.txtから追加",
                }

    master_rows = list(new_master.values())
    write_csv(OUTPUT_LOG_CSV, LOG_HEADERS, log_rows)
    write_csv(OUTPUT_MASTER_CSV, MASTER_HEADERS, master_rows)
    OUTPUT_JSON.write_text(
        json.dumps(
            {
                "stats": stats,
                "logHeaders": LOG_HEADERS,
                "masterHeaders": MASTER_HEADERS,
                "logRows": [[row.get(header, "") for header in LOG_HEADERS] for row in log_rows],
                "masterRows": [[row.get(header, "") for header in MASTER_HEADERS] for row in master_rows],
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    print(f"log rows: {len(log_rows)}")
    print(f"master additions: {len(master_rows)}")
    print(f"log csv: {OUTPUT_LOG_CSV}")
    print(f"master csv: {OUTPUT_MASTER_CSV}")
    print(f"json: {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
