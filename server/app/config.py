# 후보 격자 크기
GRID_ROWS = 8
GRID_COLS = 8

# 발 위치 허용 범위 (정규화 y)
MIN_FOOT_Y = 0.35   # 상단 35% 이상 = 하늘 영역 제외
MAX_FOOT_Y = 0.92   # 하단 가장자리 제외

# 실루엣 높이 공식: ratio = clamp(A / (inv_depth + B), MIN, MAX)
DEPTH_A = 0.6
DEPTH_B = 0.1
MIN_SILHOUETTE_RATIO = 0.10
MAX_SILHOUETTE_RATIO = 0.85

# NMS 반경 (이미지 너비 대비 비율)
NMS_RADIUS = 0.20

# 최종 반환 후보 수
NUM_CANDIDATES = 3

# 이미지 전처리
MAX_IMAGE_DIM = 1024
MAX_IMAGE_BYTES = 20 * 1024 * 1024  # 20 MB

# 미리보기 인코딩 크기
PREVIEW_MAX_DIM = 480

# pyiqa NIMA 모델
NIMA_METRIC = "nima-vgg16-ava"

# MiDaS 모델
MIDAS_MODEL = "MiDaS_small"
