"""Fetch song data from YouTube karaoke streams.

Input:
  - Text file with YouTube URLs (one per line) OR playlist URL
  - YouTube Data API key (via environment variable or argument)

Output:
  - CSV file for spreadsheet import (matches 茨むあん　歌唱データベース format)
  - JSON file with extracted data (title, date, setlist from description/comments)

Requires:
  python -m pip install google-api-python-client
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


# Pattern to match setlist entries like "03:15 曲名 / アーティスト" or "3:15 曲名"
SETLIST_PATTERNS = [
    r"(?:\d{1,2}:)?\d{1,2}:\d{2}\s+(.+?)(?:\s*/\s*(.+?))?(?:\n|$)",
    r"(\d{1,2}:\d{2})\s+(.+?)(?:\s*/\s*(.+?))?(?:\n|$)",
    r"【(\d{1,2}:\d{2})】\s*(.+?)(?:\s*/\s*(.+?))?(?:\n|$)",
    r"(\d+)[：:]\s*(.+?)(?:\s*/\s*(.+?))?(?:\n|$)",
]


def extract_video_id(url: str) -> str | None:
    """Extract video ID from YouTube URL."""
    patterns = [
        r"(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})",
        r"youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def extract_playlist_id(url: str) -> str | None:
    """Extract playlist ID from YouTube playlist URL."""
    match = re.search(r"list=([a-zA-Z0-9_-]+)", url)
    return match.group(1) if match else None


def fetch_playlist_videos(youtube: Any, playlist_id: str) -> list[str]:
    """Fetch all video IDs from a playlist."""
    video_ids = []
    next_page_token = None
    
    while True:
        response = youtube.playlistItems().list(
            part="contentDetails",
            playlistId=playlist_id,
            maxResults=50,
            pageToken=next_page_token,
        ).execute()
        
        for item in response.get("items", []):
            video_ids.append(item["contentDetails"]["videoId"])
        
        next_page_token = response.get("nextPageToken")
        if not next_page_token:
            break
    
    return video_ids


def extract_setlist(text: str) -> list[dict[str, str]]:
    """Extract setlist from description or comments."""
    entries = []
    for pattern in SETLIST_PATTERNS:
        matches = re.finditer(pattern, text, re.MULTILINE)
        for match in matches:
            if match.group(1) and not match.group(1).startswith("http"):
                song_name = match.group(1).strip()
                artist = match.group(2).strip() if match.group(2) else ""
                if song_name and len(song_name) < 100:  # Filter false positives
                    entries.append({
                        "song": song_name,
                        "artist": artist,
                        "timestamp": match.group(0).split()[0] if match.group(0) else "",
                    })
    return entries


def fetch_video_data(youtube: Any, video_id: str) -> dict[str, Any]:
    """Fetch video metadata and comments."""
    try:
        # Get video details
        video_response = youtube.videos().list(
            part="snippet",
            id=video_id,
        ).execute()

        if not video_response.get("items"):
            return {"error": "Video not found", "video_id": video_id}

        video = video_response["items"][0]
        snippet = video["snippet"]

        # Get comments (top level only, limited to 20)
        comments = []
        try:
            comments_response = youtube.commentThreads().list(
                part="snippet",
                videoId=video_id,
                maxResults=20,
                order="relevance",
            ).execute()
            
            for item in comments_response.get("items", []):
                comment = item["snippet"]["topLevelComment"]["snippet"]
                comments.append(comment["textDisplay"])
        except HttpError as e:
            if e.resp.status == 403:  # Comments disabled
                pass
            else:
                raise

        # Extract setlist from comments only (not description)
        comments_text = "\n".join(comments)
        setlist = extract_setlist(comments_text)

        # Parse published date
        published_dt = datetime.fromisoformat(snippet["publishedAt"].replace("Z", "+00:00"))
        published_date = published_dt.strftime("%Y-%m-%d")
        published_time = published_dt.strftime("%H:%M:%S")

        return {
            "video_id": video_id,
            "title": snippet["title"],
            "published_at": snippet["publishedAt"],
            "published_date": published_date,
            "published_time": published_time,
            "description": snippet.get("description", ""),
            "comments": comments_text,
            "setlist": setlist,
            "setlist_source": "comments" if setlist else "none",
        }

    except HttpError as e:
        return {"error": f"API error: {e}", "video_id": video_id}


def save_csv(results: list[dict[str, Any]], output_path: Path) -> None:
    """Save results as CSV matching 茨むあん　歌唱データベース format."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # CSV header matching the spreadsheet format
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
                
            url = f"https://www.youtube.com/watch?v={result['video_id']}"
            
            # If no setlist, still add one row with empty song data
            if not result.get("setlist"):
                writer.writerow([
                    result["published_date"],
                    result["published_time"],
                    url,
                    result["title"],
                    "", "", "", "", "", "", "", "", "", "", "", "", ""
                ])
            else:
                # Add one row per song
                for idx, song in enumerate(result["setlist"], 1):
                    writer.writerow([
                        result["published_date"],
                        result["published_time"],
                        url,
                        result["title"],
                        idx,
                        song["song"],
                        song["artist"],
                        "", "",  # キー, ジャンル
                        result.get("comments", "")[:500] if result.get("comments") else "",  # セトリ原文（コメント欄、制限付き）
                        song["timestamp"],
                        "", "", "", "", "", "", ""  # 確認状態, 備考, 正規化曲名, 正規化アーティスト, 曲キー, 重複チェック, D1投入
                    ])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, help="Text file with YouTube URLs OR playlist URL")
    parser.add_argument("--playlist", type=str, help="YouTube playlist URL")
    parser.add_argument("--output-csv", type=Path, help="Output CSV file")
    parser.add_argument("--output-json", type=Path, help="Output JSON file")
    parser.add_argument("--api-key", type=str, default=os.environ.get("YOUTUBE_API_KEY"), help="YouTube Data API key")
    args = parser.parse_args()

    if not args.api_key:
        raise SystemExit(
            "YouTube API key required. Set YOUTUBE_API_KEY environment variable or use --api-key"
        )

    # Get video IDs
    video_ids = []
    
    if args.playlist:
        playlist_id = extract_playlist_id(args.playlist)
        if not playlist_id:
            raise SystemExit(f"Invalid playlist URL: {args.playlist}")
        
        print(f"Fetching videos from playlist...")
        youtube = build("youtube", "v3", developerKey=args.api_key)
        video_ids = fetch_playlist_videos(youtube, playlist_id)
        print(f"Found {len(video_ids)} videos in playlist")
    elif args.input:
        urls = args.input.read_text(encoding="utf-8").strip().splitlines()
        urls = [url.strip() for url in urls if url.strip()]
        
        if not urls:
            raise SystemExit(f"No URLs found in {args.input}")
        
        print(f"Processing {len(urls)} URLs...")
        
        for url in urls:
            # Check if it's a playlist
            playlist_id = extract_playlist_id(url)
            if playlist_id:
                print(f"Fetching videos from playlist: {url}")
                youtube = build("youtube", "v3", developerKey=args.api_key)
                playlist_video_ids = fetch_playlist_videos(youtube, playlist_id)
                video_ids.extend(playlist_video_ids)
                print(f"  Found {len(playlist_video_ids)} videos")
            else:
                video_id = extract_video_id(url)
                if video_id:
                    video_ids.append(video_id)
                else:
                    print(f"  Invalid URL: {url}")
    else:
        raise SystemExit("Either --input or --playlist is required")

    if not video_ids:
        raise SystemExit("No video IDs to process")

    print(f"Total videos to fetch: {len(video_ids)}")

    # Initialize YouTube API
    youtube = build("youtube", "v3", developerKey=args.api_key)

    # Fetch data for each video
    results = []
    for i, video_id in enumerate(video_ids, 1):
        print(f"  [{i}/{len(video_ids)}] Fetching {video_id}...")
        data = fetch_video_data(youtube, video_id)
        results.append(data)

    # Save results
    if args.output_csv:
        save_csv(results, args.output_csv)
        print(f"\nCSV output: {args.output_csv}")
    
    if args.output_json:
        args.output_json.parent.mkdir(parents=True, exist_ok=True)
        args.output_json.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"JSON output: {args.output_json}")

    # Summary
    success = sum(1 for r in results if "error" not in r)
    with_setlist = sum(1 for r in results if r.get("setlist"))
    total_songs = sum(len(r.get("setlist", [])) for r in results)
    print(f"\nDone: {success}/{len(video_ids)} videos successful, {with_setlist} with setlist, {total_songs} total songs")


if __name__ == "__main__":
    main()
