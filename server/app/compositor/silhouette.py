from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

from ..config import PREVIEW_MAX_DIM

_SILHOUETTE_PATH = Path(__file__).parent.parent.parent / "assets" / "silhouette.png"
_SILHOUETTE_GRAY: Image.Image | None = None

OUTLINE_WIDTH = 3
SILHOUETTE_OPACITY = 210


def _make_silhouette(height: int) -> Image.Image:
    """흰색 외곽선 실루엣 RGBA 이미지 반환 (배경 투명, 선만 흰색)."""
    global _SILHOUETTE_GRAY
    if _SILHOUETTE_GRAY is None:
        _SILHOUETTE_GRAY = Image.open(_SILHOUETTE_PATH).convert("L")

    orig_w, orig_h = _SILHOUETTE_GRAY.size
    new_w = max(1, int(orig_w * height / orig_h))
    sil = _SILHOUETTE_GRAY.resize((new_w, height), Image.LANCZOS)

    binary = sil.point(lambda v: 255 if v < 128 else 0)

    kernel = OUTLINE_WIDTH * 2 + 1
    dilated = np.array(binary.filter(ImageFilter.MaxFilter(kernel)))
    original = np.array(binary)
    outline = np.clip(dilated.astype(int) - original.astype(int), 0, 255).astype(np.uint8)

    rgba = np.zeros((height, new_w, 4), dtype=np.uint8)
    rgba[:, :, 0] = 255
    rgba[:, :, 1] = 255
    rgba[:, :, 2] = 255
    rgba[:, :, 3] = (outline > 10).astype(np.uint8) * SILHOUETTE_OPACITY

    return Image.fromarray(rgba, mode="RGBA")


def composite(
    landscape: Image.Image,
    x_norm: float,
    y_norm: float,
    scale: float,
) -> Image.Image:
    """
    풍경 + 흰색 외곽선 실루엣 합성.
    발 위치가 (x_norm, y_norm)에 오도록 배치.
    """
    W, H = landscape.size
    sil_h = max(20, int(H * scale))
    sil = _make_silhouette(sil_h)

    paste_x = int(x_norm * W) - sil.width // 2
    paste_y = int(y_norm * H) - sil_h

    result = landscape.copy().convert("RGBA")
    result.paste(sil, (paste_x, paste_y), sil)

    out = result.convert("RGB")
    w, h = out.size
    ratio = min(PREVIEW_MAX_DIM / w, PREVIEW_MAX_DIM / h, 1.0)
    if ratio < 1.0:
        out = out.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)

    return out
