"""Monitor clipboard and append copied text to file.

Usage:
  python tools/clipboard_monitor.py --output input.txt

Press Ctrl+C to stop monitoring.
"""

import argparse
import time
from pathlib import Path

try:
    import pyperclip
except ImportError:
    pyperclip = None


def main() -> None:
    parser = argparse.ArgumentParser(description="クリップボードを監視してテキストファイルに追記")
    parser.add_argument("--output", type=Path, default=Path("input.txt"), help="出力ファイル")
    args = parser.parse_args()
    
    if not pyperclip:
        raise SystemExit("pyperclipが必要です (pip install pyperclip)")
    
    output_path = args.output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    print(f"クリップボード監視開始: {output_path}")
    print("コピーした内容が自動的に追記されます")
    print("Ctrl+Cで停止\n")
    
    last_content = ""
    
    def get_last_line() -> str:
        """Get the last line of the output file."""
        if not output_path.exists():
            return ""
        try:
            with open(output_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
                return lines[-1].strip() if lines else ""
        except Exception:
            return ""
    
    try:
        while True:
            try:
                current_content = pyperclip.paste()
                
                # Skip empty content
                if not current_content or not current_content.strip():
                    time.sleep(0.5)
                    continue
                
                # Skip if same as last content or last line in file
                last_line = get_last_line()
                if current_content == last_content or current_content == last_line:
                    time.sleep(0.5)
                    continue
                
                # Debounce: wait a bit to ensure clipboard is stable
                time.sleep(0.3)
                recheck_content = pyperclip.paste()
                
                # Only append if content is still the same after debounce
                if recheck_content == current_content:
                    # Append to file
                    with open(output_path, "a", encoding="utf-8") as f:
                        f.write(current_content + "\n")
                    
                    print(f"追記: {len(current_content)} 文字")
                    last_content = current_content
                
                time.sleep(0.5)  # Check every 0.5 seconds
            except Exception as e:
                print(f"エラー: {e}")
                time.sleep(1)
    except KeyboardInterrupt:
        print("\n監視停止")
        print(f"出力ファイル: {output_path}")


if __name__ == "__main__":
    main()
