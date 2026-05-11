import io

from PIL import Image, ImageOps

from ..config import MAX_IMAGE_DIM


def load_and_resize(image_bytes: bytes) -> Image.Image:
    img = Image.open(io.BytesIO(image_bytes))
    img = ImageOps.exif_transpose(img)  # EXIF 회전 보정
    img = img.convert("RGB")

    w, h = img.size
    scale = min(MAX_IMAGE_DIM / max(w, h), 1.0)
    if scale < 1.0:
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    return img
