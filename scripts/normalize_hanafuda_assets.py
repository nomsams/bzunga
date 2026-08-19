#!/usr/bin/env python3
"""Normalize the raster artwork embedded in the Hanafuda SVG card assets.

The source deck was cut from a 12 x 4 sheet. A few cuts retained a thin strip
from the neighbouring card or left the artwork hard against one edge. This tool
keeps every SVG at 106 x 175, removes only edge-connected background/strip
pixels, and reserves an identical transparent gutter around every card.
"""

from __future__ import annotations

import argparse
import base64
import re
from collections import deque
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw


SVG_IMAGE_RE = re.compile(
    r'<image\b[^>]*?href=["\']data:image/png;base64,([^"\']+)["\'][^>]*/?>',
    re.IGNORECASE | re.DOTALL,
)
EXPECTED_SIZE = (106, 175)


def load_svg_image(path: Path) -> Image.Image:
    source = path.read_text(encoding="utf-8")
    match = SVG_IMAGE_RE.search(source)
    if not match:
        raise ValueError(f"{path.name}: embedded PNG was not found")
    return Image.open(BytesIO(base64.b64decode(match.group(1)))).convert("RGBA")


def save_svg_image(path: Path, image: Image.Image) -> None:
    output = BytesIO()
    image.save(output, format="PNG", optimize=True)
    encoded = base64.b64encode(output.getvalue()).decode("ascii")
    width, height = image.size
    path.write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}">\n'
        f'  <image width="{width}" height="{height}" preserveAspectRatio="xMidYMid meet" '
        f'href="data:image/png;base64,{encoded}"/>\n'
        f'</svg>\n',
        encoding="utf-8",
        newline="\n",
    )


def is_dark_background(pixel: tuple[int, int, int, int], tolerance: int) -> bool:
    red, green, blue, alpha = pixel
    return alpha > 0 and red <= tolerance and green <= tolerance and blue <= tolerance


def is_border_red(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, alpha = pixel
    return (
        alpha > 24
        and red >= 82
        and red - green >= 28
        and red - blue >= 18
        and red >= green * 1.32
    )


def flood_component(
    image: Image.Image,
    seeds: list[tuple[int, int]],
    predicate,
) -> set[tuple[int, int]]:
    width, height = image.size
    pixels = image.load()
    queue = deque()
    visited: set[tuple[int, int]] = set()
    component: set[tuple[int, int]] = set()
    for point in seeds:
        if point not in visited and predicate(pixels[point]):
            visited.add(point)
            queue.append(point)
    while queue:
        x, y = queue.popleft()
        component.add((x, y))
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            point = (nx, ny)
            if 0 <= nx < width and 0 <= ny < height and point not in visited:
                visited.add(point)
                if predicate(pixels[point]):
                    queue.append(point)
    return component


def remove_edge_dark(image: Image.Image, tolerance: int) -> int:
    width, height = image.size
    edge = (
        [(x, 0) for x in range(width)]
        + [(x, height - 1) for x in range(width)]
        + [(0, y) for y in range(1, height - 1)]
        + [(width - 1, y) for y in range(1, height - 1)]
    )
    component = flood_component(image, edge, lambda pixel: is_dark_background(pixel, tolerance))
    pixels = image.load()
    for point in component:
        pixels[point] = (0, 0, 0, 0)
    return len(component)


def remove_residual_crop_guides(image: Image.Image, band: int) -> tuple[int, int, int]:
    """Remove long red sheet/crop guides near any image edge.

    Guide lines can sit well inside the outermost pixel. They are detected as
    isolated one-to-three-pixel scan lines; broad red artwork is deliberately
    ignored, even when it touches an edge.
    """
    width, height = image.size
    pixels = image.load()
    removed = 0
    left_score = 0
    right_score = 0
    vertical_threshold = round(height * 0.65)
    horizontal_threshold = round(width * 0.62)

    def narrow_runs(values: list[int]) -> list[list[int]]:
        runs: list[list[int]] = []
        for value in sorted(values):
            if not runs or value != runs[-1][-1] + 1:
                runs.append([value])
            else:
                runs[-1].append(value)
        return [run for run in runs if len(run) <= 3]

    edge_columns = list(range(min(band, width))) + list(range(max(0, width - band), width))
    column_counts = {
        x: sum(is_border_red(pixels[x, y]) for y in range(height))
        for x in edge_columns
    }
    vertical_runs = narrow_runs([
        x for x, count in column_counts.items() if count >= vertical_threshold
    ])

    edge_rows = list(range(min(band, height))) + list(range(max(0, height - band), height))
    row_counts = {
        y: sum(is_border_red(pixels[x, y]) for x in range(width))
        for y in edge_rows
    }
    horizontal_runs = narrow_runs([
        y for y, count in row_counts.items() if count >= horizontal_threshold
    ])

    removal_points: set[tuple[int, int]] = set()
    for run in vertical_runs:
        score = sum(column_counts[x] for x in run)
        if run[-1] < band:
            left_score += score
        elif run[0] >= width - band:
            right_score += score
        for x in range(max(0, run[0] - 1), min(width, run[-1] + 2)):
            for y in range(height):
                if is_border_red(pixels[x, y]):
                    removal_points.add((x, y))

    for run in horizontal_runs:
        for y in range(max(0, run[0] - 1), min(height, run[-1] + 2)):
            for x in range(width):
                if is_border_red(pixels[x, y]):
                    removal_points.add((x, y))

    for point in removal_points:
        pixels[point] = (0, 0, 0, 0)
    removed = len(removal_points)
    return removed, left_score, right_score


def clear_gutter(image: Image.Image, gutter: int) -> None:
    if gutter <= 0:
        return
    width, height = image.size
    pixels = image.load()
    for y in range(height):
        for x in range(width):
            if x < gutter or x >= width - gutter or y < gutter or y >= height - gutter:
                pixels[x, y] = (0, 0, 0, 0)


def translate_without_wrap(image: Image.Image, dx: int) -> Image.Image:
    if dx == 0:
        return image
    shifted = Image.new("RGBA", image.size, (0, 0, 0, 0))
    shifted.alpha_composite(image, (dx, 0))
    return shifted


def normalize_card(
    image: Image.Image,
    *,
    dark_tolerance: int,
    edge_band: int,
    gutter: int,
) -> tuple[Image.Image, dict[str, int]]:
    if image.size != EXPECTED_SIZE:
        raise ValueError(f"expected {EXPECTED_SIZE[0]} x {EXPECTED_SIZE[1]}, got {image.size}")
    working = image.copy()
    dark_removed = remove_edge_dark(working, dark_tolerance)
    red_removed, left_score, right_score = remove_residual_crop_guides(working, edge_band)

    # A strip on the left means the sheet crop reached into the previous card,
    # so the wanted artwork is biased right (and vice versa). Correct only these
    # confidently detected, narrow offsets and cap the movement to a few pixels.
    dx = max(-3, min(3, round((right_score - left_score) / 160)))
    working = translate_without_wrap(working, dx)
    clear_gutter(working, gutter)
    return working, {
        "dark_removed": dark_removed,
        "red_removed": red_removed,
        "left_score": left_score,
        "right_score": right_score,
        "dx": dx,
    }


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int] | None:
    return image.getchannel("A").getbbox()


def edge_alpha_count(image: Image.Image, depth: int = 2) -> int:
    width, height = image.size
    alpha = image.getchannel("A")
    pixels = alpha.load()
    return sum(
        1
        for y in range(height)
        for x in range(width)
        if (x < depth or x >= width - depth or y < depth or y >= height - depth) and pixels[x, y] > 0
    )


def contact_sheet(cards: list[tuple[str, Image.Image]], destination: Path) -> None:
    columns = 8
    cell_width, cell_height = 132, 216
    rows = (len(cards) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * cell_width, rows * cell_height), "#d8d8d8")
    draw = ImageDraw.Draw(sheet)
    for index, (name, image) in enumerate(cards):
        column, row = index % columns, index // columns
        x = column * cell_width
        y = row * cell_height
        draw.rectangle((x + 10, y + 7, x + 121, y + 187), fill="white", outline="#ef1d1e", width=2)
        sheet.paste(image, (x + 13, y + 10), image)
        draw.text((x + 7, y + 191), name[:19], fill="#202020")
    destination.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(destination)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--assets", type=Path, default=Path("assets/hanafuda-svg"))
    parser.add_argument("--write", action="store_true", help="rewrite the SVG assets in place")
    parser.add_argument("--contact-sheet", type=Path)
    parser.add_argument("--dark-tolerance", type=int, default=45)
    parser.add_argument("--edge-band", type=int, default=20)
    parser.add_argument("--gutter", type=int, default=2)
    args = parser.parse_args()

    paths = sorted(args.assets.glob("*_Card_*.svg"))
    if len(paths) != 48:
        raise SystemExit(f"Expected 48 Hanafuda SVGs, found {len(paths)} in {args.assets}")

    cards: list[tuple[str, Image.Image]] = []
    changed = 0
    for path in paths:
        original = load_svg_image(path)
        normalized, metrics = normalize_card(
            original,
            dark_tolerance=args.dark_tolerance,
            edge_band=args.edge_band,
            gutter=args.gutter,
        )
        if normalized.tobytes() != original.tobytes():
            changed += 1
        if metrics["red_removed"] or metrics["dx"]:
            print(
                f"{path.name}: red={metrics['red_removed']} left={metrics['left_score']} "
                f"right={metrics['right_score']} shift={metrics['dx']:+d}px"
            )
        if args.write:
            save_svg_image(path, normalized)
        cards.append((path.stem, normalized))

    if args.contact_sheet:
        contact_sheet(cards, args.contact_sheet)
    edge_pixels = sum(edge_alpha_count(image, args.gutter) for _, image in cards)
    dimensions = {image.size for _, image in cards}
    print(
        f"Validated {len(cards)} cards; changed={changed}; sizes={sorted(dimensions)}; "
        f"opaque pixels in {args.gutter}px outer gutter={edge_pixels}."
    )


if __name__ == "__main__":
    main()
