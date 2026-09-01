"""Small, dependency-free formatting helpers shared by extraction and DOCX
filling: Russian number-to-words for tenge amounts, and RU/KZ month names
for the date blanks in the contract/POA templates.

Implemented locally (no num2words) because the sandboxed build in this
environment could not compile num2words' bundled 'docopt' dependency;
these are also intentionally narrow (money in tenge, calendar dates) so a
hand-written table is both simpler and easier to audit than a general
purpose i18n library.
"""
import re

_ONES = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"]
_ONES_F = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"]
_TEENS = [
    "десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать",
    "пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать",
]
_TENS = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"]
_HUNDREDS = [
    "", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот",
]


def _three_digit_words(n: int, feminine: bool = False) -> str:
    words = []
    h, rest = divmod(n, 100)
    if h:
        words.append(_HUNDREDS[h])
    if rest >= 10 and rest < 20:
        words.append(_TEENS[rest - 10])
    else:
        t, o = divmod(rest, 10)
        if t:
            words.append(_TENS[t])
        if o:
            words.append((_ONES_F if feminine else _ONES)[o])
    return " ".join(words)


def _plural_ru(n: int, one: str, few: str, many: str) -> str:
    n100 = n % 100
    n10 = n % 10
    if 11 <= n100 <= 14:
        return many
    if n10 == 1:
        return one
    if 2 <= n10 <= 4:
        return few
    return many


_SCALE = [
    (10 ** 9, "миллиард", "миллиарда", "миллиардов", False),
    (10 ** 6, "миллион", "миллиона", "миллионов", False),
    (10 ** 3, "тысяча", "тысячи", "тысяч", True),
]


def number_to_words_ru(amount) -> str:
    """1250000 -> 'один миллион двести пятьдесят тысяч'. Accepts int, or a
    string with spaces/non-breaking-spaces/commas as thousands separators.
    Returns '' if the amount can't be parsed - callers should treat that as
    "missing", never guess."""
    if amount is None:
        return ""
    if isinstance(amount, str):
        cleaned = re.sub(r"[^\d]", "", amount)
        if not cleaned:
            return ""
        n = int(cleaned)
    else:
        n = int(amount)

    if n == 0:
        return "ноль"

    parts = []
    remainder = n
    for scale, one, few, many, feminine in _SCALE:
        count, remainder = divmod(remainder, scale)
        if count:
            parts.append(_three_digit_words(count, feminine=feminine))
            parts.append(_plural_ru(count, one, few, many))
    if remainder:
        parts.append(_three_digit_words(remainder))
    return " ".join(p for p in parts if p)


MONTHS_RU_GENITIVE = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
]

MONTHS_KZ = [
    "қаңтар", "ақпан", "наурыз", "сәуір", "мамыр", "маусым",
    "шілде", "тамыз", "қыркүйек", "қазан", "қараша", "желтоқсан",
]


def format_date_ddmmyyyy(day: int, month: int, year: int) -> str:
    return f"{day:02d}.{month:02d}.{year:04d}"


def parse_ddmmyyyy(value: str):
    """'01.01.1965' -> (1, 1, 1965), or None if not parseable."""
    if not value:
        return None
    m = re.match(r"^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$", value.strip())
    if not m:
        return None
    d, mo, y = (int(x) for x in m.groups())
    if not (1 <= d <= 31 and 1 <= mo <= 12 and 1900 <= y <= 2100):
        return None
    return d, mo, y


def month_ru_genitive(month: int) -> str:
    return MONTHS_RU_GENITIVE[month - 1] if 1 <= month <= 12 else ""


def month_kz(month: int) -> str:
    return MONTHS_KZ[month - 1] if 1 <= month <= 12 else ""
