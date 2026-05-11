import numpy as np
from PIL import Image


def get_invalid_mask(img: Image.Image) -> np.ndarray:
    """
    인물이 설 수 없는 영역을 True로 표시한 HxW bool 마스크.
    MVP: 색상 기반 하늘 감지 + 상단/하단 가장자리 고정 제거.
    """
    W, H = img.size
    arr = np.array(img, dtype=np.float32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]

    # 하늘 판정: 밝고 파란 픽셀
    brightness = (r + g + b) / 3.0
    blueness = b - (r + g) / 2.0
    is_sky = (brightness > 140) & ((blueness > 15) | (brightness > 210))

    mask = np.zeros((H, W), dtype=bool)

    # 상단에서 연속된 하늘 영역을 열(column)별로 찾아 마스킹
    max_sky_row = int(H * 0.55)  # 55% 이상 내려오는 하늘은 고려하지 않음
    for col in range(W):
        sky_end = 0
        for row in range(max_sky_row):
            if is_sky[row, col]:
                sky_end = row + 1
            else:
                break
        mask[:sky_end, col] = True

    # 최소한 상단 15%는 항상 무효
    mask[:int(H * 0.15), :] = True
    # 하단 5%는 가장자리로 무효
    mask[int(H * 0.95):, :] = True

    return mask
