import asyncio
import base64
import io
import uuid
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, File, HTTPException, UploadFile

from ..compositor import silhouette as compositor
from ..config import MAX_IMAGE_BYTES
from ..pipeline import gpt as gpt_mod
from ..pipeline import preprocess
from ..schemas import AnalyzeResponse, Candidate, Position

router = APIRouter()
_executor = ThreadPoolExecutor(max_workers=2)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}


def _pipeline(image_bytes: bytes) -> AnalyzeResponse:
    # 1. 전처리 (리사이즈, EXIF 보정)
    img = preprocess.load_and_resize(image_bytes)

    # 2. GPT-4o Vision으로 위치 추천
    positions = gpt_mod.recommend(img)

    # 3. 각 위치에 실루엣 합성 + 응답 구성
    result_candidates = []
    for rank, pos in enumerate(positions, 1):
        composited = compositor.composite(img, pos["x"], pos["y"], pos["scale"])
        buf = io.BytesIO()
        composited.save(buf, format="JPEG", quality=82)
        b64 = base64.b64encode(buf.getvalue()).decode()
        result_candidates.append(
            Candidate(
                rank=rank,
                nima_score=0.0,
                position=Position(x=round(pos["x"], 4), y=round(pos["y"], 4)),
                scale=round(pos["scale"], 4),
                preview_base64=f"data:image/jpeg;base64,{b64}",
            )
        )

    return AnalyzeResponse(
        request_id=str(uuid.uuid4()),
        candidates=result_candidates,
    )


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(image: UploadFile = File(...)):
    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "JPEG / PNG / WEBP 이미지만 지원합니다")

    data = await image.read()
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "이미지가 너무 큽니다 (최대 20 MB)")

    loop = asyncio.get_event_loop()
    try:
        result = await loop.run_in_executor(_executor, _pipeline, data)
    except RuntimeError as e:
        raise HTTPException(500, str(e))
    except Exception as e:
        raise HTTPException(500, f"분석 실패: {e}")

    return result
