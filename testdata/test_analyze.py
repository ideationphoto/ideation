"""
사용법:
  python testdata/test_analyze.py testdata/test.jpg
  python testdata/test_analyze.py <이미지_경로>

위치 추천 방식 (우선순위):
  1) .env 또는 환경변수에 OPENAI_API_KEY 있으면 → GPT-4o Vision
  2) 없으면 → 서버 NIMA 기반 (docker compose up 필요)

깊이 기반 실루엣 크기는 항상 MiDaS(docker exec)로 자동 계산합니다.
결과: testdata/result_N.jpg (GPT 추천 + 깊이 스케일)
"""
import base64
import io
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# ── .env 로드 (python-dotenv 없이 직접 파싱) ───────────
_ENV_FILE = Path(__file__).parent.parent / ".env"
if _ENV_FILE.exists():
    for _line in _ENV_FILE.read_text(encoding="utf-8").splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip())

# ── 설정 ──────────────────────────────────────────────
SERVER = "http://127.0.0.1:8000"
READY_TIMEOUT = 120
DOCKER_CONTAINER = "ideathon-backend-1"

SILHOUETTE_OPACITY = 210  # 0(투명) ~ 255(불투명)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
GPT_MODEL = "gpt-4o"
# ──────────────────────────────────────────────────────


# ── 후보 위치 마커 ────────────────────────────────────
# 이미지 하단 60~92% 영역, 중앙 집중 (좌우 끝 나무/벽 제외)
_CAND_XS = [0.30, 0.42, 0.50, 0.58, 0.70]
_CAND_YS = [0.52, 0.58, 0.63, 0.67, 0.70]

# 원근법 기반 스케일 계산 (GPT scale 대신 사용)
_HORIZON_Y = 0.42   # 수평선 추정 위치 (이미지 상단 42%)
_MAX_SCALE = 0.42   # 화면 최하단(y=1.0)에서 사람 높이 비율


def _draw_candidates(image_path: Path) -> tuple[bytes, list[tuple[float, float]]]:
    """
    이미지 하단 영역에 번호 마커(1~25)를 그린 JPEG 바이트와 후보 좌표 목록을 반환.
    GPT는 번호만 골라 답하면 되므로 좌표 오류가 없다.
    """
    candidates = [(x, y) for y in _CAND_YS for x in _CAND_XS]

    img = Image.open(image_path).convert("RGB")
    W, H = img.size
    s = min(1024 / max(W, H), 1.0)
    if s < 1.0:
        img = img.resize((int(W * s), int(H * s)), Image.LANCZOS)
    W, H = img.size

    draw = ImageDraw.Draw(img)
    r = max(10, W // 50)

    for idx, (cx, cy) in enumerate(candidates, 1):
        px, py = int(cx * W), int(cy * H)
        # 검정 원 배경
        draw.ellipse([px - r, py - r, px + r, py + r], fill=(0, 0, 0))
        # 노란 번호
        draw.text((px, py), str(idx), fill=(255, 220, 0), anchor="mm")

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=88)
    return buf.getvalue(), candidates


# ── 위치 추천: GPT-4o Vision ───────────────────────────
def recommend_positions_gpt(image_path: Path) -> list[tuple[float, float]]:
    """
    GPT-4o Vision으로 풍경에서 인물 서기 좋은 위치 3개 추천.
    반환: [(x, y), ...] 정규화 좌표, y = 발 위치.
    """
    # 후보 번호 마커가 그려진 이미지 + 후보 좌표 목록
    grid_bytes, candidates = _draw_candidates(image_path)
    img_b64 = base64.b64encode(grid_bytes).decode()
    media_type = "image/jpeg"  # _draw_candidates는 항상 JPEG 반환

    n = len(candidates)
    prompt = (
        f"This landscape photo has {n} numbered positions marked on it.\n\n"
        "Pick exactly 3 numbers where a person could ACTUALLY STAND on solid ground.\n\n"
        "Rules — SKIP a position if:\n"
        "- A tree trunk, wall, or large obstacle is directly at that spot\n"
        "- The surface is not flat enough to stand on\n\n"
        "PICK positions that are on open path, grass, or pavement with clear space.\n"
        "Choose 3 positions spread across different depths for composition variety.\n\n"
        "Reply ONLY with JSON (no scale needed):\n"
        "{\"selected\": [8, 13, 22]}"
    )

    payload = {
        "model": GPT_MODEL,
        "max_tokens": 256,
        "messages": [{
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{media_type};base64,{img_b64}"},
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
    print(f"  GPT 응답: {text[:200]}")

    if "```" in text:
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]

    result = json.loads(text)
    raw = result["selected"]

    # GPT가 정수 리스트 [8,13,22] 또는 객체 리스트 [{"id":8},..] 모두 처리
    ids = []
    for item in raw:
        if isinstance(item, dict):
            ids.append(int(item.get("id", item.get("number", 1))))
        else:
            ids.append(int(item))

    output = []
    for cand_id in ids[:3]:
        x, y = candidates[cand_id - 1]  # 1-based → 0-based
        scale = _y_to_scale(y)
        output.append((x, y, scale))
    return output


# ── 위치 추천: 서버 NIMA (fallback) ─────────────────────
def wait_for_server():
    print("서버 준비 대기 중", end="", flush=True)
    deadline = time.time() + READY_TIMEOUT
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(f"{SERVER}/health", timeout=3) as r:
                if r.status == 200:
                    print(" 완료!")
                    return
        except Exception:
            pass
        print(".", end="", flush=True)
        time.sleep(2)
    print()
    print(f"서버가 {READY_TIMEOUT}초 내에 준비되지 않았습니다.")
    sys.exit(1)


def recommend_positions_nima(image_path: Path) -> list[tuple[float, float]]:
    """서버 /analyze 엔드포인트를 통해 NIMA 기반 후보 위치 반환 (fallback)."""
    wait_for_server()

    boundary = "----PythonBoundary"
    image_bytes = image_path.read_bytes()
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="image"; filename="{image_path.name}"\r\n'
        f"Content-Type: image/jpeg\r\n\r\n"
    ).encode() + image_bytes + f"\r\n--{boundary}--\r\n".encode()

    req = urllib.request.Request(
        f"{SERVER}/analyze",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"서버 오류 {e.code}: {e.read().decode(errors='replace')}")
        sys.exit(1)
    except (urllib.error.URLError, OSError) as e:
        print(f"서버 연결 실패: {e}\n→ docker compose up 으로 서버를 먼저 실행하세요.")
        sys.exit(1)

    return [(c["position"]["x"], c["position"]["y"]) for c in result["candidates"]]


# ── 실루엣 합성 ────────────────────────────────────────
_SILHOUETTE_PATH = Path(__file__).parent / "silhouette.png"
_SILHOUETTE_GRAY: Image.Image | None = None  # 흑백 원본 캐시

OUTLINE_WIDTH = 3   # 외곽선 두께 (px), 홀수 권장


def _make_silhouette(height: int) -> Image.Image:
    """
    silhouette.png 외곽선을 흰색 라인으로 그린 RGBA 이미지 반환.
    배경 투명, 선만 흰색 — 디자인 목업의 outline 스타일.
    """
    global _SILHOUETTE_GRAY
    if _SILHOUETTE_GRAY is None:
        _SILHOUETTE_GRAY = Image.open(_SILHOUETTE_PATH).convert("L")

    orig_w, orig_h = _SILHOUETTE_GRAY.size
    new_w = max(1, int(orig_w * height / orig_h))
    sil = _SILHOUETTE_GRAY.resize((new_w, height), Image.LANCZOS)

    # 이진화: 실루엣(어두운) → 255, 배경(밝은) → 0
    binary = sil.point(lambda v: 255 if v < 128 else 0)

    # 팽창 - 원본 = 외곽선 영역
    kernel = OUTLINE_WIDTH * 2 + 1
    dilated = np.array(binary.filter(ImageFilter.MaxFilter(kernel)))
    original = np.array(binary)
    outline = np.clip(dilated.astype(int) - original.astype(int), 0, 255).astype(np.uint8)

    # 흰색 RGBA: 외곽선 픽셀만 불투명
    rgba = np.zeros((height, new_w, 4), dtype=np.uint8)
    rgba[:, :, 0] = 255  # R
    rgba[:, :, 1] = 255  # G
    rgba[:, :, 2] = 255  # B
    rgba[:, :, 3] = (outline > 10).astype(np.uint8) * SILHOUETTE_OPACITY

    return Image.fromarray(rgba, mode="RGBA")


def _y_to_scale(y: float) -> float:
    """y 좌표(발 위치) → 원근법 기반 실루엣 크기 비율. y가 클수록(가까울수록) 크게."""
    ratio = (y - _HORIZON_Y) / (1.0 - _HORIZON_Y)
    return max(0.06, min(0.50, _MAX_SCALE * ratio))


def composite(landscape: Image.Image, x_norm: float, y_norm: float, scale: float) -> Image.Image:
    W, H = landscape.size
    sil_h = max(20, int(H * scale))
    sil = _make_silhouette(sil_h)
    paste_x = int(x_norm * W) - sil.width // 2
    paste_y = int(y_norm * H) - sil_h
    out = landscape.copy().convert("RGBA")
    out.paste(sil, (paste_x, paste_y), sil)
    return out.convert("RGB")


# ── 메인 ──────────────────────────────────────────────
def process_image(image_path: Path) -> None:
    print(f"\n{'═'*50}")
    print(f"이미지: {image_path.name}")
    print(f"{'═'*50}")

    # 1) 위치 + 스케일 추천
    if OPENAI_API_KEY:
        print(f"GPT-4o Vision으로 위치/크기 추천 중...")
        try:
            candidates = recommend_positions_gpt(image_path)
            source = "GPT-4o"
        except Exception as e:
            import traceback
            print(f"GPT API 실패: {e}")
            traceback.print_exc()
            print("→ 서버 NIMA로 대체합니다.")
            positions_2d = recommend_positions_nima(image_path)
            candidates = [(x, y, 0.30) for x, y in positions_2d]
            source = "NIMA"
    else:
        print("OPENAI_API_KEY 없음 → 서버 NIMA 사용")
        positions_2d = recommend_positions_nima(image_path)
        candidates = [(x, y, 0.30) for x, y in positions_2d]
        source = "NIMA"

    print(f"추천 결과 ({source}):")
    for i, (x, y, s) in enumerate(candidates, 1):
        print(f"  #{i}  위치=({x:.2f}, {y:.2f})  scale={s:.2f} ({int(s*100)}%)")

    # 2) 원본 이미지 로드 (1024px 상한)
    landscape_img = Image.open(image_path).convert("RGB")
    W_orig, H_orig = landscape_img.size
    resize_scale = min(1024 / max(W_orig, H_orig), 1.0)
    if resize_scale < 1.0:
        landscape_img = landscape_img.resize(
            (int(W_orig * resize_scale), int(H_orig * resize_scale)), Image.LANCZOS
        )

    # 3) 합성 + 저장 — 파일명: result_{원본이름}_{rank}.jpg
    out_dir = image_path.parent
    stem = image_path.stem  # e.g. "test", "test2", "test3"
    for rank, (x, y, scale) in enumerate(candidates, 1):
        out_img = composite(landscape_img, x, y, scale)
        out_path = out_dir / f"result_{stem}_{rank}.jpg"
        out_img.save(out_path, quality=90)
        print(f"  #{rank} → {out_path.name}")


def main():
    testdata_dir = Path(__file__).parent

    if len(sys.argv) > 1:
        # 인자로 넘긴 파일들만 처리
        image_paths = [Path(p) for p in sys.argv[1:]]
    else:
        # 인자 없으면 testdata/ 안의 test*.jpg / test*.png 전부
        image_paths = sorted(
            p for p in testdata_dir.glob("test*.jpg")
            if not p.stem.startswith("result")
        ) + sorted(
            p for p in testdata_dir.glob("test*.png")
            if not p.stem.startswith("result")
        )

    missing = [p for p in image_paths if not p.exists()]
    if missing:
        for p in missing:
            print(f"파일 없음: {p}")
        sys.exit(1)

    print(f"총 {len(image_paths)}개 이미지 처리: {[p.name for p in image_paths]}")
    for image_path in image_paths:
        process_image(image_path)

    print("\n모든 처리 완료!")


if __name__ == "__main__":
    main()
