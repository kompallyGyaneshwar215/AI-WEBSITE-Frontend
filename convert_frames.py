"""
NOCTIS Frame Conversion Script
Converts hero (clip1+clip2+clip3) and dismantle frames to WebP.
Detects and skips near-duplicate boundary frames.
"""
import os
import re
import sys
from pathlib import Path
from PIL import Image, ImageChops
import math

PROJECT = Path(r"c:\Users\Admin\Downloads\Ai project")

CLIP1  = PROJECT / "clip1frame"
CLIP2  = PROJECT / "clip2frame"
CLIP3  = PROJECT / "clip3frame"
DISMANTLE = PROJECT / "flow clip frame"

OUT_HERO         = PROJECT / "assets" / "frames" / "hero"
OUT_HERO_MOB     = PROJECT / "assets" / "frames" / "hero-mobile"
OUT_DISMANTLE    = PROJECT / "assets" / "frames" / "dismantle"
OUT_DISMANTLE_MOB= PROJECT / "assets" / "frames" / "dismantle-mobile"

for d in [OUT_HERO, OUT_HERO_MOB, OUT_DISMANTLE, OUT_DISMANTLE_MOB]:
    d.mkdir(parents=True, exist_ok=True)

def natural_sort(files):
    """Sort files by the first integer found in the filename."""
    return sorted(files, key=lambda f: int(re.search(r'\d+', f.name).group()))

def list_images(folder):
    return natural_sort([
        f for f in Path(folder).iterdir()
        if f.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp')
    ])

def mse_diff(img_a, img_b):
    """Mean squared error between two PIL images (resized to compare quickly)."""
    small = (64, 36)
    a = img_a.resize(small, Image.LANCZOS).convert('RGB')
    b = img_b.resize(small, Image.LANCZOS).convert('RGB')
    diff = ImageChops.difference(a, b)
    pixels = list(diff.get_flattened_data())
    mse = sum(sum(p**2 for p in px) / 3 for px in pixels) / len(pixels)
    return mse

def save_webp(img, path, width, quality):
    """Resize proportionally and save as WebP."""
    w, h = img.size
    new_h = int(h * width / w)
    resized = img.resize((width, new_h), Image.LANCZOS)
    resized.save(path, 'WEBP', quality=quality, method=6)

# ── Collect hero frames ────────────────────────────────────────────────────────
print("Collecting hero frames from clip1 / clip2 / clip3 ...")
c1 = list_images(CLIP1)
c2 = list_images(CLIP2)
c3 = list_images(CLIP3)

DUPE_THRESHOLD = 50  # MSE below this → skip the joining frame

def join_clips(prev_clip_files, next_clip_files):
    """Return next_clip_files without the first frame if it's a near-duplicate."""
    if not prev_clip_files or not next_clip_files:
        return next_clip_files
    last  = Image.open(prev_clip_files[-1])
    first = Image.open(next_clip_files[0])
    mse = mse_diff(last, first)
    action = "skipping duplicate" if mse < DUPE_THRESHOLD else "keeping"
    print(f"  Boundary MSE: {mse:.2f} -> {action}")
    if mse < DUPE_THRESHOLD:
        return next_clip_files[1:]
    return next_clip_files

c2_joined = join_clips(c1, c2)
c3_joined = join_clips(c1 + c2_joined, c3)
hero_files = c1 + c2_joined + c3_joined
print(f"Hero total frames: {len(hero_files)}")

# ── Convert hero frames ────────────────────────────────────────────────────────
print("\nConverting hero frames …")
for i, src in enumerate(hero_files, 1):
    name = f"frame_{i:04d}.webp"
    img  = Image.open(src)
    save_webp(img, OUT_HERO / name,      1600, 78)
    save_webp(img, OUT_HERO_MOB / name,   960, 72)
    img.close()
    if i % 50 == 0 or i == len(hero_files):
        print(f"  Hero {i}/{len(hero_files)}")

# ── Collect & convert dismantle frames ────────────────────────────────────────
print("\nConverting dismantle frames …")
dismantle_files = list_images(DISMANTLE)
print(f"Dismantle total frames: {len(dismantle_files)}")
for i, src in enumerate(dismantle_files, 1):
    name = f"frame_{i:04d}.webp"
    img  = Image.open(src)
    save_webp(img, OUT_DISMANTLE / name,      1600, 78)
    save_webp(img, OUT_DISMANTLE_MOB / name,   960, 72)
    img.close()
    if i % 50 == 0 or i == len(dismantle_files):
        print(f"  Dismantle {i}/{len(dismantle_files)}")

# ── Stats ──────────────────────────────────────────────────────────────────────
def folder_size_mb(folder):
    total = sum(f.stat().st_size for f in Path(folder).iterdir() if f.is_file())
    return round(total / 1024 / 1024, 1)

print("\n-- OUTPUT SUMMARY --")
print(f"assets/frames/hero/           {len(list_images(OUT_HERO))} frames  {folder_size_mb(OUT_HERO)} MB")
print(f"assets/frames/hero-mobile/    {len(list_images(OUT_HERO_MOB))} frames  {folder_size_mb(OUT_HERO_MOB)} MB")
print(f"assets/frames/dismantle/      {len(list_images(OUT_DISMANTLE))} frames  {folder_size_mb(OUT_DISMANTLE)} MB")
print(f"assets/frames/dismantle-mobile/{len(list_images(OUT_DISMANTLE_MOB))} frames  {folder_size_mb(OUT_DISMANTLE_MOB)} MB")
print("\nDone. Update config.js with the frame counts above.")
