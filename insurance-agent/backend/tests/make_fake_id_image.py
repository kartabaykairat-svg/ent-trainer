"""Renders a synthetic Kazakhstani ID-card-like text block onto a PNG so
the full OCR pipeline (Tesseract, not just direct text extraction) can be
exercised end-to-end without a real scanned document."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def make_id_image(path: Path, lines: list[str], width=1100, height=700):
    img = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 26)
    except OSError:
        font = ImageFont.load_default()
    y = 20
    for line in lines:
        draw.text((20, y), line, fill="black", font=font)
        y += 38
    img.save(path)


if __name__ == "__main__":
    out = Path(__file__).parent / "fixtures"
    out.mkdir(exist_ok=True)
    make_id_image(out / "c1_id.png", [
        "ҚАЗАҚСТАН РЕСПУБЛИКАСЫ / РЕСПУБЛИКА КАЗАХСТАН",
        "ЖЕКЕ КУӘЛІК / УДОСТОВЕРЕНИЕ ЛИЧНОСТИ",
        "",
        "Тегі / Фамилия: ИВАНОВ",
        "Аты / Имя: ИВАН",
        "Әкесінің аты / Отчество: ИВАНОВИЧ",
        "",
        "Туған күні / Дата рождения: 01.01.1965",
        "ЖСН/ИИН",
        "650101300123",
        "",
        "Құжат нөмірі / Номер документа: 032614460",
        "Беру күні / Дата выдачи: 12.01.2020",
        "Кем выдан: МВД РК",
    ])
    make_id_image(out / "c1_address.png", [
        "СПРАВКА О МЕСТЕ ЖИТЕЛЬСТВА",
        "Адресная справка",
        "",
        "Тіркелген мекенжайы / Адрес регистрации:",
        "Казахстан, г. Алматы, ул. Абая, дом 10, кв. 5",
        "",
        "Телефон: +7 701 111 22 33",
        "E-mail: ivanov@example.com",
    ])
    print("fixtures written")
