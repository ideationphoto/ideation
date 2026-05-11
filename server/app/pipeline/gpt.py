"""
GPT-4o Vision 기반 인물 위치 추천.
testdata/test_analyze.py 의 로직을 서버용으로 이식.
"""
import base64
import io
import json
import os
import urllib.request

from PIL import Image, ImageDraw

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
GPT_MODEL = "gpt-4o"

# 후보 격자: 하단 UI(약 25% 영역)를 제외한 범위로 제한
# 가이드 화면 하단 컨트롤이 화면의 ~25%를 차지하므로 최대 y를 0.70으로 제한
_CAND_XS = [0.30, 0.42, 0.50, 0.58, 0.70]
_CAND_YS = [0.52, 0.58, 0.63, 0.67, 0.70]

# 원근법 스케일 공식 상수
_HORIZON_Y = 0.42
_MAX_SCALE = 0.42


def y_to_scale(y: float) -> float:
    ratio = (y - _HORIZON_Y) / (1.0 - _HORIZON_Y)
    return max(0.06, min(0.50, _MAX_SCALE * ratio))


def _draw_candidates(img: Image.Image) -> tuple[bytes, list[tuple[float, float]]]:
    """번호 마커가 그려진 JPEG bytes + 후보 좌표 목록 반환."""
    candidates = [(x, y) for y in _CAND_YS for x in _CAND_XS]
    W, H = img.size
    r = max(10, W // 50)

    out = img.copy()
    draw = ImageDraw.Draw(out)
    for idx, (cx, cy) in enumerate(candidates, 1):
        px, py = int(cx * W), int(cy * H)
        draw.ellipse([px - r, py - r, px + r, py + r], fill=(0, 0, 0))
        draw.text((px, py), str(idx), fill=(255, 220, 0), anchor="mm")

    buf = io.BytesIO()
    out.save(buf, format="JPEG", quality=88)
    return buf.getvalue(), candidates


def recommend(img: Image.Image) -> list[dict]:
    """
    GPT-4o Vision으로 인물 서기 좋은 위치 3개 추천.
    반환: [{"x": float, "y": float, "scale": float}, ...]
    """
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY 환경변수가 설정되지 않았습니다.")

    grid_bytes, candidates = _draw_candidates(img)
    img_b64 = base64.b64encode(grid_bytes).decode()
    n = len(candidates)

    prompt = (
        f"This landscape photo has {n} numbered positions marked on it.\n\n"
        "Pick exactly 3 numbers where a person could ACTUALLY STAND on solid ground.\n\n"
        "Rules — SKIP a position if:\n"
        "- A tree trunk, wall, or large obstacle is directly at that spot\n"
        "- The surface is not flat enough to stand on\n\n"
        "PICK positions that are on open path, grass, or pavement with clear space.\n"
        "Choose 3 positions spread across different depths for composition variety.\n\n"
        'Reply ONLY with JSON: {"selected": [8, 13, 22]}'
    )

    payload = {
        "model": GPT_MODEL,
        "max_tokens": 256,
        "messages": [{
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"},
                },
                {"type": "text", "text": prompt},
            ],
        }],
    }

    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read())

    text = data["choices"][0]["message"]["content"].strip()

    # ```json ... ``` 블록 제거
    if "```" in text:
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]

    result = json.loads(text)
    raw = result["selected"]

    ids = []
    for item in raw:
        if isinstance(item, dict):
            ids.append(int(item.get("id", item.get("number", 1))))
        else:
            ids.append(int(item))

    output = []
    for cand_id in ids[:3]:
        x, y = candidates[cand_id - 1]
        output.append({"x": x, "y": y, "scale": y_to_scale(y)})
    return output
