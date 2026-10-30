"""
NOCTIS — Convert real car PNGs to WebP for the lineup section.
Maps the existing car photos to the 5 lineup slots.
"""
from pathlib import Path
from PIL import Image

BASE = Path(r"c:\Users\Admin\Downloads\Ai project")
OUT  = BASE / "assets" / "cars"
OUT.mkdir(parents=True, exist_ok=True)

# Mapping: output filename → source PNG
# k4 = perfect side profile with headlights → GT-E hero car
# k3 = sleek rear side view → S (sport sedan)
# e1 = SUV front → X
# 029... = two-car studio shot → R (use just the side crop)
# k1 = rear city shot → ONE (concept hypercar)
# k2 = rear city shot from further → can be used as backup

mapping = [
    ('gt-e.webp', 'k4.png', None),          # Side profile coupe — GT-E
    ('s.webp',    'k3.png', None),           # Rear-side sedan — S
    ('x.webp',    'e1.png', None),           # SUV — X
    ('r.webp',    '029951f4-e470-4781-8aa1-c87b8ee9f792.png', None),  # Dual-car studio shot — R
    ('one.webp',  'k2.png', None),           # City rear — ONE concept
]

W = 1600

for out_name, src_name, crop in mapping:
    out_path = OUT / out_name
    src_path = BASE / src_name

    if not src_path.exists():
        print(f"  Missing source: {src_name}")
        continue

    img = Image.open(src_path).convert('RGB')

    if crop:
        img = img.crop(crop)

    # Resize to 1600px wide, maintain aspect
    w, h = img.size
    new_h = int(h * W / w)
    img = img.resize((W, new_h), Image.LANCZOS)

    img.save(out_path, 'WEBP', quality=85, method=6)
    print(f"  {out_name}: {W}x{new_h} ({out_path.stat().st_size // 1024} KB)")

print("Done.")
