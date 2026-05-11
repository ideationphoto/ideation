"""모델 로드 상태를 관리하는 단순 플래그."""

_ready = False


def set_ready() -> None:
    global _ready
    _ready = True


def models_ready() -> bool:
    return _ready
