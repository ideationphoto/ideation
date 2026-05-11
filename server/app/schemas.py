from pydantic import BaseModel


class Position(BaseModel):
    x: float
    y: float


class Candidate(BaseModel):
    rank: int
    nima_score: float
    position: Position
    scale: float           # 실루엣 높이 / 이미지 높이 (0~1)
    preview_base64: str    # data:image/jpeg;base64,...


class AnalyzeResponse(BaseModel):
    request_id: str
    candidates: list[Candidate]
