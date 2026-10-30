"""
NOCTIS — Create placeholder car WebP images.
These are simple dark studio-look placeholders.
Run this only if the AI-generated images are not available.
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(r"c:\Users\Admin\Downloads\Ai project\assets\cars")
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1600, 900  # 16:9

cars = [
    ('gt-e.webp',  '#2C2E30', 'GT-E',  'Grand Tourer'),
    ('s.webp',     '#DEDAD3', 'S',     'Sport Sedan'),
    ('x.webp',     '#0D1B2A', 'X',     'SUV Coupe'),
    ('r.webp',     '#121418', 'R',     'Track Coupe'),
    ('one.webp',   '#B8BCBE', 'ONE',   'Hypercar'),
]

def draw_car_placeholder(car_color, model_name, model_type):
    img = Image.new('RGB', (W, H), '#07080A')
    draw = ImageDraw.Draw(img)

    # Simple car silhouette placeholder
    # Body
    car_left   = int(W * 0.15)
    car_right  = int(W * 0.85)
    wheel_line = int(H * 0.72)
    car_h      = int(H * 0.30)
    car_top    = wheel_line - car_h

    # Main body rectangle
    draw.rectangle(
        [car_left, car_top + int(car_h * 0.3), car_right, wheel_line - 20],
        fill=car_color
    )

    # Roofline (trapezoid)
    roof_in = int((car_right - car_left) * 0.15)
    draw.polygon([
        (car_left + roof_in, car_top + int(car_h * 0.3)),
        (car_right - roof_in, car_top + int(car_h * 0.3)),
        (car_right - int(roof_in * 0.5), car_top),
        (car_left + int(roof_in * 0.5), car_top),
    ], fill=car_color)

    # Wheels (dark circles)
    wheel_r = 48
    wheel_cy = wheel_line - 5
    # Front wheel
    fw_cx = int(car_left + (car_right - car_left) * 0.75)
    draw.ellipse([fw_cx - wheel_r, wheel_cy - wheel_r, fw_cx + wheel_r, wheel_cy + wheel_r],
                 fill='#1a1a1a')
    draw.ellipse([fw_cx - 28, wheel_cy - 28, fw_cx + 28, wheel_cy + 28],
                 fill='#2a2a2a')
    # Rear wheel
    rw_cx = int(car_left + (car_right - car_left) * 0.25)
    draw.ellipse([rw_cx - wheel_r, wheel_cy - wheel_r, rw_cx + wheel_r, wheel_cy + wheel_r],
                 fill='#1a1a1a')
    draw.ellipse([rw_cx - 28, wheel_cy - 28, rw_cx + 28, wheel_cy + 28],
                 fill='#2a2a2a')

    # Front light bar (white, thin)
    fbar_x = car_right - 8
    fbar_y = car_top + int(car_h * 0.5)
    draw.rectangle([fbar_x - 4, fbar_y - 1, fbar_x, fbar_y + 1], fill='#E8F0FF')

    # Rear light bar (red, thin)
    rbar_x = car_left + 8
    rbar_y = car_top + int(car_h * 0.52)
    draw.rectangle([rbar_x, rbar_y - 1, rbar_x + 4, rbar_y + 1], fill='#E1251B')

    # Floor line
    draw.rectangle([0, wheel_line, W, wheel_line + 1], fill='#1C1F24')

    # Label (small mono text via rectangle-based letter placeholder)
    # Just put a subtle label - PIL default font
    draw.text((int(W * 0.05), int(H * 0.05)), f'NOCTIS {model_name}', fill='#8A8F98')
    draw.text((int(W * 0.05), int(H * 0.08)), model_type, fill='#4A4F58')

    return img

for fname, color, name, mtype in cars:
    target = OUT / fname
    if target.exists():
        print(f"  Skipping {fname} — already exists")
        continue
    img = draw_car_placeholder(color, name, mtype)
    img.save(target, 'WEBP', quality=85)
    print(f"  Created placeholder: {fname}")

print("Done.")

