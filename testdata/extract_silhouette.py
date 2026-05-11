from rembg import remove
from PIL import Image, ImageDraw
import numpy as np
import cv2
import json

img = Image.open("test.jpg")
w, h = img.size

# AI 배경 제거
result = remove(img)
alpha = np.array(result)[:, :, 3]

# 마스크 이진화
_, binary = cv2.threshold(alpha, 10, 255, cv2.THRESH_BINARY)

# 윤곽선 추출
contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

# 가장 큰 윤곽선 (= 인물)
contour = max(contours, key=cv2.contourArea)

# 포인트 수 줄이기 (epsilon 조절로 스무스하게)
epsilon = 0.005 * cv2.arcLength(contour, True)
approx = cv2.approxPolyDP(contour, epsilon, True)

# 비율로 변환
points = [[round(p[0][0]/w, 3), round(p[0][1]/h, 3)] for p in approx]
print(f"포인트 수: {len(points)}")

# 시각화
overlay = Image.new("RGBA", (w, h), (0,0,0,0))
draw = ImageDraw.Draw(overlay)
pts = [(int(x*w), int(y*h)) for x,y in points]

draw.polygon(pts, fill=(0,255,180,18))

def dashed_poly(draw, pts, color, width=3, dash=14, gap=7):
    pts = list(pts) + [pts[0]]
    for i in range(len(pts)-1):
        x1,y1 = pts[i]; x2,y2 = pts[i+1]
        dx,dy = x2-x1, y2-y1
        L = (dx**2+dy**2)**0.5
        if L==0: continue
        ux,uy = dx/L, dy/L
        pos,on = 0, True
        while pos < L:
            seg = dash if on else gap
            end = min(pos+seg, L)
            if on:
                draw.line([(x1+ux*pos,y1+uy*pos),(x1+ux*end,y1+uy*end)], fill=color, width=width)
            pos,on = end, not on

dashed_poly(draw, pts, (0,255,180,220), width=4)

# 3분할 격자
WHITE = (255,255,255,35)
for frac in [1/3, 2/3]:
    draw.line([(int(frac*w),0),(int(frac*w),h)], fill=WHITE, width=1)
    draw.line([(0,int(frac*h)),(w,int(frac*h))], fill=WHITE, width=1)

base = img.convert("RGBA")
out = Image.alpha_composite(base, overlay).convert("RGB")
out.save("preview_result.jpg", quality=95)
print("저장완료: preview_result.jpg")

# mockData용 출력
print("\n--- mockData.ts silhouette 좌표 ---")
print("  silhouette: [")
for p in points:
    print(f"    [{p[0]}, {p[1]}],")
print("  ],")
