"""Group PNG/JPEG files with identical decoded pixels.

Run: python _clone_ident.py
Requires Pillow: python -m pip install Pillow

Writes _clones.json alongside this script, containing lists of filenames
(including extensions). Subfolder names are relative to the scanned directory.
Only groups with at least two images are included. Image dimensions and RGBA
pixels must match exactly; metadata and file encoding are ignored. Visually
similar images with different pixels (e.g. JPEG recompression) are not clones.
"""

import argparse
import hashlib
import json
from pathlib import Path
import struct
import sys

from PIL import Image


def pixel_fingerprint(path: Path) -> bytes:
    """Hash dimensions and decoded RGBA pixels, independent of file format."""
    with Image.open(path) as image:
        # Avoid silently comparing only the first frame of an animated PNG.
        if getattr(image, "n_frames", 1) != 1:
            raise ValueError("animated images are not supported")
        rgba = image.convert("RGBA")
        digest = hashlib.sha256(struct.pack(">II", *rgba.size))
        digest.update(rgba.tobytes())
        return digest.digest()


def find_clones(directory: Path) -> tuple[list[list[str]], int, list[str]]:
    groups: dict[bytes, list[str]] = {}
    errors = []
    scanned = 0
    paths = sorted(
        (path for path in directory.rglob("*")
         if path.is_file() and path.suffix.lower() in {".png", ".jpg", ".jpeg"}),
        key=lambda path: path.relative_to(directory).as_posix(),
    )
    for path in paths:
        name = path.relative_to(directory).as_posix()
        try:
            fingerprint = pixel_fingerprint(path)
        except (OSError, ValueError, Image.DecompressionBombError) as error:
            errors.append(f"{name}: {error}")
            continue
        groups.setdefault(fingerprint, []).append(name)
        scanned += 1
    return [names for names in groups.values() if len(names) > 1], scanned, errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "directory", nargs="?", type=Path,
        default=Path(__file__).resolve().parent,
        help="Image folder to scan recursively (default: this script's folder)",
    )
    parser.add_argument("--output", type=Path, help="JSON output path")
    args = parser.parse_args()
    directory = args.directory.resolve()
    if not directory.is_dir():
        parser.error(f"Not a directory: {directory}")
    output = args.output or directory / "_clones.json"
    clones, scanned, errors = find_clones(directory)
    output.write_text(json.dumps(clones, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Scanned {scanned} images; found {len(clones)} clone groups "
          f"({sum(len(group) for group in clones)} images).")
    print(f"Saved: {output}")
    for error in errors:
        print(f"Skipped: {error}", file=sys.stderr)
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
