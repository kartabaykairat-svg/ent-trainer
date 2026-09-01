from pathlib import Path

FIXTURES = Path(__file__).parent / "fixtures"


def pytest_configure(config):
    if not (FIXTURES / "c1_id.png").exists():
        from tests.make_fake_id_image import make_id_image

        FIXTURES.mkdir(exist_ok=True)
        make_id_image(FIXTURES / "c1_id.png", [
            "ҚАЗАҚСТАН РЕСПУБЛИКАСЫ / РЕСПУБЛИКА КАЗАХСТАН",
            "ЖЕКЕ КУӘЛІК / УДОСТОВЕРЕНИЕ ЛИЧНОСТИ", "",
            "Тегі / Фамилия: ИВАНОВ", "Аты / Имя: ИВАН",
            "Әкесінің аты / Отчество: ИВАНОВИЧ", "",
            "Туған күні / Дата рождения: 01.01.1965", "ЖСН/ИИН", "650101300123", "",
            "Құжат нөмірі / Номер документа: 032614460",
            "Беру күні / Дата выдачи: 12.01.2020", "Кем выдан: МВД РК",
        ])
        make_id_image(FIXTURES / "c1_address.png", [
            "СПРАВКА О МЕСТЕ ЖИТЕЛЬСТВА", "Адресная справка", "",
            "Тіркелген мекенжайы / Адрес регистрации:",
            "Казахстан, г. Алматы, ул. Абая, дом 10, кв. 5", "",
            "Телефон: +7 701 111 22 33", "E-mail: ivanov@example.com",
        ])
