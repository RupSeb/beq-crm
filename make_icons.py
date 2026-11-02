"""
Erzeugt die App-Symbole (Handy, Browser-Tab) aus dem quadratischen beQ-Hub-Logo.

Start:  python tools/make_icons.py
Braucht das Paket Pillow (einmalig installieren mit:  pip install pillow).

Vorgehen: Der Schriftzug wird aus vorlagen/logo/beQ-Hub-Logo-Quadrat.png
ausgeschnitten (alles, was nicht Navy ist) und mittig auf eine randlose
Navy-Fläche gesetzt. Nichts wird nachgezeichnet. Bei der maskierbaren Variante
bleibt der Schriftzug im inneren sicheren Bereich, damit Android ihn beim
Zuschneiden (Kreis, Tropfen) nicht anschneidet.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "vorlagen" / "logo" / "beQ-Hub-Logo-Quadrat.png"
TARGET = ROOT / "app" / "icons"
NAVY = (13, 24, 34, 255)  # #0D1822


def extract_wordmark(img: Image.Image) -> Image.Image:
    """Schneidet den Schriftzug aus: alle Pixel, die deutlich heller als Navy sind."""
    rgba = img.convert("RGBA")
    # Maske: Pixel, die sich klar vom Navy-Grund abheben
    mask = Image.new("L", rgba.size, 0)
    src = rgba.load()
    out = mask.load()
    width, height = rgba.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = src[x, y]
            if a > 0 and (r + g + b) > (13 + 24 + 34) + 60:
                out[x, y] = 255
    bbox = mask.getbbox()
    return rgba.crop(bbox), mask.crop(bbox)


def compose(size: int, wordmark, mask, max_width_ratio: float, max_diag_ratio: float) -> Image.Image:
    """Setzt den Schriftzug mittig auf eine randlose Navy-Fläche."""
    canvas = Image.new("RGBA", (size, size), NAVY)
    w, h = wordmark.size
    scale = min(size * max_width_ratio / w, size * max_diag_ratio / (w * w + h * h) ** 0.5)
    new_size = (max(1, round(w * scale)), max(1, round(h * scale)))
    mark = wordmark.resize(new_size, Image.LANCZOS)
    m = mask.resize(new_size, Image.LANCZOS)
    pos = ((size - new_size[0]) // 2, (size - new_size[1]) // 2)
    canvas.paste(mark, pos, m)
    return canvas.convert("RGB")


def main() -> None:
    TARGET.mkdir(parents=True, exist_ok=True)
    wordmark, mask = extract_wordmark(Image.open(SOURCE))
    # Normale Symbole: Schriftzug etwa 62 Prozent breit
    for size, name in [(192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png"), (32, "favicon-32.png")]:
        compose(size, wordmark, mask, 0.62, 0.9).save(TARGET / name, optimize=True)
    # Maskierbar: Schriftzug vollständig im sicheren Kreis (Durchmesser 80 Prozent)
    compose(512, wordmark, mask, 0.56, 0.72).save(TARGET / "icon-maskable-512.png", optimize=True)
    print("Symbole erzeugt in", TARGET)


if __name__ == "__main__":
    main()
