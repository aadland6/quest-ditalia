#!/usr/bin/env python3
"""Generate app icons (pure Python, no deps): dark tile + tricolor roundel with
the Stella d'Italia (gold-rimmed white star)."""
import math
import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "icons"

BG = (16, 21, 33)
PANEL = (28, 36, 56)
GOLD = (232, 184, 75)
GOLD_DIM = (168, 135, 58)
INK = (232, 228, 216)
IT_GREEN = (0, 140, 69)
IT_WHITE = (240, 240, 240)
IT_RED = (205, 33, 42)


def write_png(path, size, pixels):
    raw = b"".join(b"\x00" + bytes(c for px in row for c in px) for row in pixels)
    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c))
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    png = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
           + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))
    path.write_bytes(png)


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def in_star(x, y, cx, cy, r_long, r_short, points=4, rot=0.0):
    """Point-in-compass-star test using angular interpolation of radius."""
    dx, dy = x - cx, y - cy
    d = math.hypot(dx, dy)
    if d < 1e-6:
        return True
    ang = (math.atan2(dy, dx) - rot) % (2 * math.pi)
    seg = math.pi / points
    frac = (ang % (2 * seg)) / seg
    tri = 1 - abs(frac - 1)          # 1 at spike centre, 0 between spikes
    r = r_short + (r_long - r_short) * (tri ** 3)
    return d <= r


def make(size):
    px = [[BG for _ in range(size)] for _ in range(size)]
    cx = cy = size / 2
    corner = size * 0.22

    for y in range(size):
        for x in range(size):
            # rounded-corner mask -> slightly lighter panel with vertical gradient
            qx = min(x, size - 1 - x)
            qy = min(y, size - 1 - y)
            inside = True
            if qx < corner and qy < corner:
                inside = math.hypot(corner - qx, corner - qy) <= corner
            if not inside:
                continue
            g = y / size
            px[y][x] = lerp(PANEL, BG, g * 0.9)

    # tricolor roundel inside a gold ring
    ring_r = size * 0.40
    ring_w = size * 0.028
    band = ring_r * 2 / 3
    for y in range(size):
        for x in range(size):
            d = math.hypot(x - cx, y - cy)
            if d < ring_r - ring_w:
                off = x - (cx - ring_r)
                col = IT_GREEN if off < band else IT_WHITE if off < 2 * band else IT_RED
                # darken toward the rim for depth
                px[y][x] = lerp(col, BG, 0.15 * (d / ring_r) ** 2)
            elif d <= ring_r + ring_w:
                px[y][x] = GOLD_DIM

    # Stella d'Italia: gold-rimmed five-point star, one point up
    r_star = size * 0.30
    r_inner = r_star * 0.42
    rot = -math.pi / 2
    for y in range(size):
        for x in range(size):
            if in_star(x, y, cx, cy, r_star, r_inner, points=5, rot=rot):
                px[y][x] = GOLD
            if in_star(x, y, cx, cy, r_star * 0.82, r_inner * 0.82, points=5, rot=rot):
                px[y][x] = INK
    return px


def main():
    OUT.mkdir(exist_ok=True)
    for s in (180, 192, 512):
        write_png(OUT / f"icon-{s}.png", s, make(s))
        print(f"icon-{s}.png")


if __name__ == "__main__":
    main()
