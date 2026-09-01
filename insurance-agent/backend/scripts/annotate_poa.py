"""
One-time template-preparation script for the power-of-attorney (POA).

Same rules as annotate_contract.py: start from the untouched original,
only ever replace text that was already blank (an explicit "____" run, or
a gap between two pieces of fixed wording that the source document leaves
empty for hand-entry, e.g. "Я, года рождения" -> "Я, <NAME>, <DATE> года
рождения"). All notary-only blanks (registry number, fee, notary's own
city/license, the physical signature line) are left completely untouched -
those are none of the manager's or the AI's business to fill.

The representative ("представитель") already named in the source POA -
УНДИЗОВА ФАГИЛЯМ МУХАМЕТЖАНОВНА - is kept as the default value via Jinja's
`default()` filter: if the manager does not turn on "Изменить
представителя", the rendered document is byte-for-byte the same wording
the original template already had for that person.
"""
from pathlib import Path

import docx

BASE = Path(__file__).resolve().parent.parent
SRC = BASE / "templates_source" / "poa_original.docx"
DST = BASE / "templates" / "poa_template.docx"

REP_NAME_DEFAULT = "УНДИЗОВА ФАГИЛЯМ МУХАМЕТЖАНОВНА"
REP_BIRTHDATE_DEFAULT = "08.07.2004"
REP_IIN_DEFAULT = "040708600957"
REP_BIRTHPLACE_DEFAULT = "Алматинской"
REP_ADDRESS_DEFAULT = "г. Талдыкорган, пр. Н. Назарбаева, 105/125, кв 36"


def merge_runs(paragraph, start=0, end=None):
    runs = paragraph.runs
    if not runs:
        return None
    if end is None:
        end = len(runs) - 1
    for i in range(start + 1, end + 1):
        runs[i].text = ""
    return runs[start]


def main():
    d = docx.Document(SRC)
    p = d.paragraphs

    # -- city of signing ----------------------------------------------------
    p[1].runs[1].text = "{{ poa_city }}"

    # -- notarization date (written as "«DD» month YYYY года") -------------
    r = merge_runs(p[2])
    r.text = "«{{ poa_date_day }}» {{ poa_date_month_ru }} {{ poa_date_year }} года"

    # -- principal's (client's) own data, inserted into the gaps the -------
    # -- source document already leaves for them ----------------------------
    r3 = p[3].runs
    r3[0].text = "Я, {{ c1.full_name }}, {{ c1.birth_date }} "
    # r3[1] "года рождения, место рождения " stays as-is
    # r3[2] "Казахстан" (fixed country of birth) stays as-is
    r3[4].text = "ИИН {{ c1.iin }}"
    r3[6].text = " по адресу: {{ c1.registration_address }}"

    # -- representative block: defaults to the person already named in the --
    # -- source template unless the manager explicitly overrides it ---------
    r3[11].text = '{{ representative.full_name|default("%s", true) }}' % REP_NAME_DEFAULT
    r3[13].text = '{{ representative.birth_date|default("%s", true) }}' % REP_BIRTHDATE_DEFAULT
    r3[16].text = ' {{ representative.iin|default("%s", true) }}' % REP_IIN_DEFAULT
    r3[18].text = '{{ representative.birth_place|default("%s", true) }}' % REP_BIRTHPLACE_DEFAULT
    merge_runs(p[3], 20, 25)
    r3 = p[3].runs
    r3[20].text = '{{ representative.address|default("%s", true) }}' % REP_ADDRESS_DEFAULT

    # -- notary attestation line: prefill the principal's name here too, so
    # -- the notary does not have to retype it (still their own field to
    # -- verify/sign - nothing else on this line is touched)
    p[12].runs[1].text = "{{ c1.full_name }}"

    DST.parent.mkdir(parents=True, exist_ok=True)
    d.save(DST)
    print(f"Saved annotated POA template -> {DST}")


if __name__ == "__main__":
    main()
