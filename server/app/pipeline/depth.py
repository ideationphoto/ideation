import builtins
import numpy as np
import torch
from PIL import Image

from ..config import MIDAS_MODEL

_model = None
_transform = None


def load() -> None:
    global _model, _transform
    # MiDaS_small internally calls torch.hub.load for EfficientNet without trust_repo=True,
    # which hits an interactive input() prompt that fails in Docker (no TTY → EOFError).
    # Temporarily patch input() to auto-accept so the nested hub load succeeds.
    _orig_input = builtins.input
    builtins.input = lambda _prompt="": "y"
    try:
        _model = torch.hub.load("intel-isl/MiDaS", MIDAS_MODEL, trust_repo=True)
        _model.eval()
        transforms = torch.hub.load("intel-isl/MiDaS", "transforms", trust_repo=True)
        _transform = transforms.small_transform
    finally:
        builtins.input = _orig_input


def estimate(img: Image.Image) -> np.ndarray:
    """
    깊이 맵 추정.
    반환: HxW ndarray, 0~1, 값이 클수록 카메라에 가까움 (MiDaS inverse depth).
    """
    W, H = img.size
    arr = np.array(img)
    batch = _transform(arr)

    with torch.no_grad():
        pred = _model(batch)

    depth = pred.squeeze().numpy()

    # 원본 이미지 크기로 리사이즈
    depth_pil = Image.fromarray(depth).resize((W, H), Image.BILINEAR)
    depth = np.array(depth_pil)

    # 0~1 정규화
    d_min, d_max = depth.min(), depth.max()
    if d_max - d_min < 1e-6:
        return np.full((H, W), 0.5, dtype=np.float32)
    return ((depth - d_min) / (d_max - d_min)).astype(np.float32)
