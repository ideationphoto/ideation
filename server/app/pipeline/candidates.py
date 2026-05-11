import numpy as np
from PIL import Image

from ..config import (
    DEPTH_A, DEPTH_B,
    GRID_COLS, GRID_ROWS,
    MAX_FOOT_Y, MAX_SILHOUETTE_RATIO,
    MIN_FOOT_Y, MIN_SILHOUETTE_RATIO,
)


def _depth_to_scale(depth_val: float) -> float:
    """
    깊이값 → 실루엣 높이 비율.
    depth_val: 0~1, 클수록 카메라에 가까움 (MiDaS).
    inv_d: 0 = 가까움, 1 = 멀수록 → 공식 적용.
    """
    inv_d = 1.0 - depth_val  # 가까울수록 작은 값 → 큰 실루엣
    ratio = DEPTH_A / (inv_d + DEPTH_B)
    return float(np.clip(ratio, MIN_SILHOUETTE_RATIO, MAX_SILHOUETTE_RATIO))


def generate_candidates(
    img: Image.Image,
    depth_map: np.ndarray,
    invalid_mask: np.ndarray,
) -> list[dict]:
    W, H = img.size
    candidates = []

    for row in range(1, GRID_ROWS + 1):
        for col in range(GRID_COLS):
            x = (col + 0.5) / GRID_COLS
            y = row / GRID_ROWS

            if not (MIN_FOOT_Y <= y <= MAX_FOOT_Y):
                continue

            px = min(int(x * W), W - 1)
            py = min(int(y * H), H - 1)

            if invalid_mask[py, px]:
                continue

            depth_val = float(depth_map[py, px])
            scale = _depth_to_scale(depth_val)

            candidates.append({"x": x, "y": y, "depth": depth_val, "scale": scale})

    return candidates
