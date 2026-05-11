from PIL import Image, ImageDraw, ImageFont

img = Image.open("test.jpg").convert("RGB")
w, h = img.size
draw = ImageDraw.Draw(img)

# 10% 간격 그리드
for i in range(1, 10):
    x = int(i * w / 10)
    y = int(i * h / 10)
    draw.line([(x, 0), (x, h)], fill=(255, 0, 0, 180), width=1)
    draw.line([(0, y), (w, y)], fill=(255, 0, 0, 180), width=1)
    draw.text((x+2, 2), f"{i*10}%", fill=(255, 0, 0))
    draw.text((2, y+2), f"{i*10}%", fill=(255, 0, 0))

img.save("grid.jpg", quality=95)
print(f"{w}x{h}")
