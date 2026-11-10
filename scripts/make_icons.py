#!/usr/bin/env python3
"""Regenerate the PWA icons for Seclusa Klondike.

    python3 scripts/make_icons.py

Needs Pillow. Drawn at 1024 and downscaled so 192/512 stay crisp.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent

SIZE = 1024
# Match the install splash / manifest so the launcher tile is not a white plate.
BG = (13, 35, 64, 255)  # #0d2340
CARD = (252, 252, 252, 255)
CARD_EDGE = (220, 220, 225, 255)
INK = (18, 18, 22, 255)
RED = (180, 32, 36, 255)
BACK = (36, 78, 140, 255)
BACK_PATTERN = (52, 98, 168, 255)


def spade_poly(cx, cy, s):
    """Simple spade centred on (cx, cy), height ~s."""
    return [
        (cx, cy - s * 0.55),
        (cx + s * 0.42, cy - s * 0.05),
        (cx + s * 0.28, cy + s * 0.18),
        (cx + s * 0.12, cy + s * 0.18),
        (cx + s * 0.18, cy + s * 0.52),
        (cx - s * 0.18, cy + s * 0.52),
        (cx - s * 0.12, cy + s * 0.18),
        (cx - s * 0.28, cy + s * 0.18),
        (cx - s * 0.42, cy - s * 0.05),
    ]


def heart_poly(cx, cy, s):
    return [
        (cx, cy + s * 0.48),
        (cx + s * 0.48, cy - s * 0.02),
        (cx + s * 0.28, cy - s * 0.38),
        (cx, cy - s * 0.12),
        (cx - s * 0.28, cy - s * 0.38),
        (cx - s * 0.48, cy - s * 0.02),
    ]


def draw_card_back(d, box):
    x0, y0, x1, y1 = box
    d.rounded_rectangle(box, radius=int((x1 - x0) * 0.08), fill=BACK, outline=CARD_EDGE, width=max(2, (x1 - x0) // 64))
    inset = int((x1 - x0) * 0.12)
    d.rounded_rectangle(
        [x0 + inset, y0 + inset, x1 - inset, y1 - inset],
        radius=int((x1 - x0) * 0.05),
        outline=BACK_PATTERN,
        width=max(2, (x1 - x0) // 48),
    )


def draw_face(d, box, rank, suit, colour):
    x0, y0, x1, y1 = box
    w = x1 - x0
    h = y1 - y0
    d.rounded_rectangle(box, radius=int(w * 0.08), fill=CARD, outline=CARD_EDGE, width=max(2, w // 64))
    # Corner rank — scale with card width.
    font = None
    for path in (
        "/usr/share/fonts/google-carlito-fonts/Carlito-Bold.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/liberation/LiberationSans-Bold.ttf",
    ):
        try:
            font = ImageFont.truetype(path, size=max(24, w // 4))
            break
        except OSError:
            continue
    if font is None:
        font = ImageFont.load_default()
    pad = int(w * 0.1)
    d.text((x0 + pad, y0 + pad * 0.6), rank, fill=colour, font=font)
    # Centre suit.
    cx = (x0 + x1) / 2
    cy = (y0 + y1) / 2 + h * 0.06
    s = min(w, h) * 0.38
    poly = spade_poly(cx, cy, s) if suit == "S" else heart_poly(cx, cy, s)
    d.polygon(poly, fill=colour)


def paste_rotated(base, layer, angle, centre):
    rotated = layer.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
    cx, cy = centre
    box = (int(cx - rotated.width / 2), int(cy - rotated.height / 2))
    base.paste(rotated, box, rotated)


def draw_mark(canvas_size, safe=0.0):
    """
    Large fanned cards on a transparent layer sized to canvas_size.
    safe: extra inset fraction (0 for any, ~0.14 for maskable safe zone).
    """
    layer = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    # Card geometry fills most of the usable square.
    usable = canvas_size * (1.0 - 2 * safe)
    card_w = int(usable * 0.52)
    card_h = int(card_w * 1.45)
    cx = canvas_size / 2
    cy = canvas_size / 2 + canvas_size * 0.02

    def card_layer(drawer):
        tile = Image.new("RGBA", (card_w + 4, card_h + 4), (0, 0, 0, 0))
        d = ImageDraw.Draw(tile)
        drawer(d, [2, 2, card_w + 1, card_h + 1])
        return tile

    back = card_layer(draw_card_back)
    ace = card_layer(lambda d, box: draw_face(d, box, "A", "S", INK))
    heart = card_layer(lambda d, box: draw_face(d, box, "A", "H", RED))

    paste_rotated(layer, back, -18, (cx - usable * 0.12, cy + usable * 0.02))
    paste_rotated(layer, heart, 14, (cx + usable * 0.14, cy + usable * 0.04))
    paste_rotated(layer, ace, -2, (cx, cy - usable * 0.02))
    return layer


def make_any(size):
    out = Image.new("RGBA", (SIZE, SIZE), BG)
    out.alpha_composite(draw_mark(SIZE, safe=0.04))
    return out.resize((size, size), Image.Resampling.LANCZOS)


def make_maskable(size):
    # Full-bleed field; mark stays inside the central ~72% safe zone.
    out = Image.new("RGBA", (SIZE, SIZE), BG)
    out.alpha_composite(draw_mark(SIZE, safe=0.14))
    return out.resize((size, size), Image.Resampling.LANCZOS)


def main():
    for size in (192, 512):
        make_any(size).convert("RGB").save(ROOT / f"icon-{size}.png", optimize=True)
    make_maskable(512).convert("RGB").save(ROOT / "icon-maskable-512.png", optimize=True)
    for name in ("icon-192.png", "icon-512.png", "icon-maskable-512.png"):
        print(name)


if __name__ == "__main__":
    main()
