"""Convert 茨むあん CSV exports into the song database import format.

Input:
  - 茨むあん　歌枠まとめ - 歌枠まとめ.csv
  - 茨むあん　歌枠まとめ - 歌唱曲一覧.csv

Output:
  - converted_song_log.csv: 歌唱ログ sheet format
  - converted_song_master.csv: 曲マスター sheet format
"""

from __future__ import annotations

import csv
import re
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Iterable


DOWNLOADS = Path("c:/Users/owner/Downloads")
PROJECT_ROOT = Path("c:/Users/owner/dev/ibara_muan")

STREAM_SUMMARY_CSV = DOWNLOADS / "茨むあん　歌枠まとめ - 歌枠まとめ.csv"
SONG_LIST_CSV = DOWNLOADS / "茨むあん　歌枠まとめ - 歌唱曲一覧.csv"

OUTPUT_LOG_CSV = PROJECT_ROOT / "converted_song_log.csv"
OUTPUT_LEGACY_LOG_CSV = PROJECT_ROOT / "converted_output.csv"
OUTPUT_MASTER_CSV = PROJECT_ROOT / "converted_song_master.csv"

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


def display_key(title: str, artist: str) -> str:
    title = (title or "").strip()
    artist = (artist or "").strip()
    return f"{title} / {artist}" if artist else title


def first_value(*values: str) -> str:
    for value in values:
        value = (value or "").strip()
        if value:
            return value
    return ""


def clean_base_url(url: str) -> str:
    url = (url or "").strip()
    if not url or not re.match(r"https?://", url):
        return ""
    return re.sub(r"([?&])t=\d+s?$", "", url).rstrip("?&")


def extract_url(text: str) -> str:
    match = re.search(r"https?://(?:www\.)?(?:youtube\.com|youtu\.be)/\S+", text or "")
    return clean_base_url(match.group(0)) if match else ""


def clean_stream_title(text: str) -> str:
    text = re.sub(r"https?://(?:www\.)?(?:youtube\.com|youtu\.be)/\S+", "", text or "")
    return text.strip()


def parse_int(value: str) -> int | str:
    value = (value or "").strip()
    if not value:
        return ""
    match = re.search(r"\d+", value)
    return int(match.group(0)) if match else value


def read_dicts(path: Path) -> Iterable[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        yield from csv.DictReader(file)


def load_song_master(path: Path) -> tuple[dict[tuple[str, str], tuple[str, str]], list[dict[str, str]]]:
    normalization: dict[tuple[str, str], tuple[str, str]] = {}
    master_rows: list[dict[str, str]] = []

    for row in read_dicts(path):
        title = (row.get("Title") or "").strip()
        artist = (row.get("Artist") or "").strip()
        if not title:
            continue

        key = (normalize_key(title), normalize_key(artist))
        normalization[key] = (title, artist)
        master_rows.append(
            {
                "曲名": title,
                "アーティスト名": artist,
                "正規化曲名": title,
                "正規化アーティスト": artist,
                "曲キー": display_key(title, artist),
                "ジャンル": "",
                "キー": "",
                "歌唱回数": parse_int(row.get("歌った回数", "")),
                "最初に歌った日": (row.get("最初に歌った日") or "").strip(),
                "最後に歌った日": (row.get("最後に歌った日") or "").strip(),
                "英語タイトル": (row.get("English title") or "").strip(),
                "備考": "",
            }
        )

    return normalization, master_rows


def convert_song_log(
    path: Path,
    normalization: dict[tuple[str, str], tuple[str, str]],
) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    current_date = ""
    current_title = ""
    current_url = ""

    for row in read_dicts(path):
        stream_title = (row.get("Stream") or "").strip()
        stream_date = first_value(row.get("Date", ""), row.get("Date_1", ""))

        if stream_title:
            current_title = clean_stream_title(stream_title)
            stream_url = extract_url(stream_title)
            if stream_url:
                current_url = stream_url
        if stream_date:
            current_date = stream_date

        url = first_value(row.get("uraru", ""), row.get("gattai", ""))
        clean_url = clean_base_url(url)
        if clean_url:
            current_url = clean_url

        title = (row.get("Title") or "").strip()
        artist = (row.get("Artist") or "").strip()
        if not title:
            continue

        norm_title, norm_artist = normalization.get(
            (normalize_key(title), normalize_key(artist)),
            (title, artist),
        )
        order = parse_int(first_value(row.get("No.", ""), row.get("kazu", "")))

        rows.append(
            {
                "配信日": first_value(row.get("Date", ""), row.get("Date_1", ""), current_date),
                "開始時刻": "",
                "歌枠URL": current_url,
                "枠タイトル": current_title,
                "曲順": order,
                "曲名": title,
                "アーティスト名": artist,
                "キー": "",
                "ジャンル": "",
                "セトリ原文": (row.get("kopipe") or "").strip(),
                "タイムスタンプ": (row.get("Time") or "").strip(),
                "確認状態": "確認済み",
                "備考": (row.get("Memo") or "").strip(),
                "正規化曲名": norm_title,
                "正規化アーティスト": norm_artist,
                "曲キー": display_key(norm_title, norm_artist),
                "重複チェック": "",
                "D1投入": "未投入",
            }
        )

    duplicate_counts = Counter(
        (
            row["配信日"],
            row["歌枠URL"],
            row["曲順"],
            normalize_key(str(row["曲名"])),
            normalize_key(str(row["アーティスト名"])),
        )
        for row in rows
    )
    for row in rows:
        duplicate_key = (
            row["配信日"],
            row["歌枠URL"],
            row["曲順"],
            normalize_key(str(row["曲名"])),
            normalize_key(str(row["アーティスト名"])),
        )
        if duplicate_counts[duplicate_key] > 1:
            row["重複チェック"] = "重複あり"

    return rows


def write_csv(path: Path, headers: list[str], rows: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=headers, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    normalization, master_rows = load_song_master(SONG_LIST_CSV)
    log_rows = convert_song_log(STREAM_SUMMARY_CSV, normalization)

    write_csv(OUTPUT_LOG_CSV, LOG_HEADERS, log_rows)
    write_csv(OUTPUT_LEGACY_LOG_CSV, LOG_HEADERS, log_rows)
    write_csv(OUTPUT_MASTER_CSV, MASTER_HEADERS, master_rows)

    print(f"song log rows: {len(log_rows)}")
    print(f"song master rows: {len(master_rows)}")
    print(f"song log: {OUTPUT_LOG_CSV}")
    print(f"song log alias: {OUTPUT_LEGACY_LOG_CSV}")
    print(f"song master: {OUTPUT_MASTER_CSV}")


if __name__ == "__main__":
    main()
