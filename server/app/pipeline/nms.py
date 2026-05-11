from ..config import NMS_RADIUS, NUM_CANDIDATES


def apply_nms(candidates: list[dict], image_width: int) -> list[dict]:
    """
    점수 내림차순 정렬 후 NMS로 다양성 있는 상위 N개 선정.
    서로 NMS_RADIUS * image_width 픽셀 이내 후보는 제거.
    """
    sorted_list = sorted(candidates, key=lambda c: c["nima_score"], reverse=True)
    radius_px = NMS_RADIUS * image_width
    selected: list[dict] = []

    for candidate in sorted_list:
        too_close = any(
            ((candidate["x"] - s["x"]) ** 2 + (candidate["y"] - s["y"]) ** 2) ** 0.5
            * image_width
            < radius_px
            for s in selected
        )
        if not too_close:
            selected.append(candidate)
        if len(selected) >= NUM_CANDIDATES:
            break

    return selected
