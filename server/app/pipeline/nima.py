import torch
import torchvision.transforms as T
from PIL import Image

from ..config import NIMA_METRIC

_metric = None

_preprocess = T.Compose([
    T.Resize((224, 224)),
    T.ToTensor(),
])


def load() -> None:
    global _metric
    import pyiqa
    _metric = pyiqa.create_metric(NIMA_METRIC, as_loss=False, device=torch.device("cpu"))


def score(img: Image.Image) -> float:
    """단일 이미지 채점 (1~10)."""
    tensor = _preprocess(img).unsqueeze(0)
    with torch.no_grad():
        s = _metric(tensor)
    return float(s)


def score_batch(imgs: list[Image.Image]) -> list[float]:
    """
    여러 이미지를 한 번에 배치 추론 → 순차 실행 대비 2~4배 빠름.
    반환: 각 이미지의 NIMA 점수 리스트 (1~10).
    """
    if not imgs:
        return []
    batch = torch.stack([_preprocess(img) for img in imgs])  # (N, 3, 224, 224)
    with torch.no_grad():
        scores = _metric(batch)  # (N,) 또는 스칼라
    # pyiqa 버전에 따라 tensor 또는 float 반환
    if hasattr(scores, "__iter__"):
        return [float(s) for s in scores]
    return [float(scores)] * len(imgs)
