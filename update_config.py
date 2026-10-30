"""
NOCTIS — Update config.js frame counts after conversion.
Run this after convert_frames.py finishes.
"""
import re
from pathlib import Path

PROJECT = Path(r"c:\Users\Admin\Downloads\Ai project")

def count_webp(folder):
    p = PROJECT / folder
    if not p.exists():
        return 0
    return len(list(p.glob("*.webp")))

hero_count      = count_webp("assets/frames/hero")
dismantle_count = count_webp("assets/frames/dismantle")

print(f"Hero frames:      {hero_count}")
print(f"Dismantle frames: {dismantle_count}")

config_path = PROJECT / "config.js"
text = config_path.read_text(encoding='utf-8')

# Replace hero count
text = re.sub(
    r'(hero:\s*\{[^}]*count:\s*)\d+',
    lambda m: m.group(0).rsplit(' ', 1)[0] + f' {hero_count}',
    text, count=1
)

# Replace dismantle count
text = re.sub(
    r'(dismantle:\s*\{[^}]*count:\s*)\d+',
    lambda m: m.group(0).rsplit(' ', 1)[0] + f' {dismantle_count}',
    text, count=1
)

# Simpler regex approach
lines = text.split('\n')
new_lines = []
in_hero = False
in_dismantle = False

for line in lines:
    if "'hero'" in line or '"hero"' in line:
        in_hero = True
        in_dismantle = False
    elif "'dismantle'" in line or '"dismantle"' in line:
        in_dismantle = True
        in_hero = False

    if in_hero and re.search(r'count:\s*\d+', line):
        line = re.sub(r'(count:\s*)\d+', f'count:      {hero_count}', line)
        in_hero = False

    if in_dismantle and re.search(r'count:\s*\d+', line):
        line = re.sub(r'(count:\s*)\d+', f'count:      {dismantle_count}', line)
        in_dismantle = False

    new_lines.append(line)

config_path.write_text('\n'.join(new_lines), encoding='utf-8')
print("config.js updated.")

# Also print folder sizes
def folder_mb(folder):
    p = PROJECT / folder
    if not p.exists():
        return 0.0
    return round(sum(f.stat().st_size for f in p.glob('*.webp')) / 1024 / 1024, 1)

print(f"\n  assets/frames/hero/            {hero_count} frames  {folder_mb('assets/frames/hero')} MB")
print(f"  assets/frames/hero-mobile/     {count_webp('assets/frames/hero-mobile')} frames  {folder_mb('assets/frames/hero-mobile')} MB")
print(f"  assets/frames/dismantle/       {dismantle_count} frames  {folder_mb('assets/frames/dismantle')} MB")
print(f"  assets/frames/dismantle-mobile/{count_webp('assets/frames/dismantle-mobile')} frames  {folder_mb('assets/frames/dismantle-mobile')} MB")

