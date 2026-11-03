import { useCallback, useEffect, useState } from 'react';
import { Copy, RefreshCw } from 'lucide-react';
import { ScreenHeader } from '../components/AppShell';
import { StrengthMeter } from '../components/StrengthMeter';
import { Button, Card, Field, Segmented, Toggle, inputClass } from '../components/ui';
import { copyText } from '../lib/clipboard';
import { generate, generatorEntropy } from '../lib/generator';
import { useGeneratorOptions } from '../lib/useGenerator';
import { useToast } from '../state/toast';

export function GeneratorScreen() {
  const [opts, update] = useGeneratorOptions();
  const [value, setValue] = useState('');
  const { toast } = useToast();

  const regen = useCallback(() => {
    void generate(opts).then(setValue);
  }, [opts]);

  useEffect(regen, [regen]);

  const copy = async () => {
    try {
      await copyText(value, { secret: true });
      toast('Пароль скопирован. Буфер обмена очистится через 30 секунд');
    } catch {
      toast('Не удалось скопировать', 'error');
    }
  };

  const charsetCount = [opts.upper, opts.lower, opts.digits, opts.symbols].filter(Boolean).length;
  const toggleSet = (k: 'upper' | 'lower' | 'digits' | 'symbols', v: boolean) => {
    if (!v && charsetCount === 1) return; // хотя бы один набор
    update({ [k]: v });
  };

  return (
    <div className="flex-1 overflow-y-auto pb-8">
      <ScreenHeader title="Генератор паролей" />
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 sm:px-6">
        <Card>
          <div className="flex items-start gap-2">
            <output
              aria-live="polite"
              aria-label="Сгенерированный пароль"
              className="min-h-[3.5rem] flex-1 break-all rounded-xl bg-sunken px-4 py-3 font-mono text-lg leading-snug text-ink"
            >
              {value}
            </output>
          </div>
          <div className="mt-3">
            <StrengthMeter password={value} bits={generatorEntropy(opts)} />
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={copy} icon={<Copy className="size-4" />} className="flex-1">
              Копировать
            </Button>
            <Button variant="secondary" onClick={regen} icon={<RefreshCw className="size-4" />} className="flex-1">
              Ещё вариант
            </Button>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex justify-center">
            <Segmented
              label="Тип пароля"
              value={opts.mode}
              onChange={(mode) => update({ mode })}
              options={[
                { value: 'chars', label: 'Случайные символы' },
                { value: 'phrase', label: 'Запоминаемая фраза' },
              ]}
            />
          </div>

          {opts.mode === 'chars' ? (
            <div className="flex flex-col gap-3">
              <Field label={`Длина: ${opts.length}`}>
                {(id) => (
                  <input
                    id={id}
                    type="range"
                    min={8}
                    max={64}
                    value={opts.length}
                    onChange={(e) => update({ length: Number(e.target.value) })}
                    className="w-full"
                    aria-valuetext={`${opts.length} символов`}
                  />
                )}
              </Field>
              <Toggle label="Заглавные буквы (A–Z)" checked={opts.upper} onChange={(v) => toggleSet('upper', v)} />
              <Toggle label="Строчные буквы (a–z)" checked={opts.lower} onChange={(v) => toggleSet('lower', v)} />
              <Toggle label="Цифры (0–9)" checked={opts.digits} onChange={(v) => toggleSet('digits', v)} />
              <Toggle label="Символы (!@#$…)" checked={opts.symbols} onChange={(v) => toggleSet('symbols', v)} />
              <Toggle
                label="Исключить похожие символы"
                description="Без 0/O/o, l/1/I и |"
                checked={opts.excludeSimilar}
                onChange={(v) => update({ excludeSimilar: v })}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Field label={`Количество слов: ${opts.words}`}>
                {(id) => (
                  <input
                    id={id}
                    type="range"
                    min={3}
                    max={10}
                    value={opts.words}
                    onChange={(e) => update({ words: Number(e.target.value) })}
                    className="w-full"
                  />
                )}
              </Field>
              <Field label="Разделитель">
                {(id) => (
                  <select id={id} value={opts.separator} onChange={(e) => update({ separator: e.target.value })} className={inputClass}>
                    <option value="-">Дефис (-)</option>
                    <option value=".">Точка (.)</option>
                    <option value="_">Подчёркивание (_)</option>
                    <option value=" ">Пробел</option>
                  </select>
                )}
              </Field>
              <Toggle label="С заглавной буквы" checked={opts.capitalize} onChange={(v) => update({ capitalize: v })} />
              <Toggle label="Добавить число" checked={opts.addNumber} onChange={(v) => update({ addNumber: v })} />
              <p className="text-xs text-muted">
                Слова выбираются случайно из списка EFF (7776 английских слов) с помощью crypto.getRandomValues.
              </p>
            </div>
          )}
        </Card>
        <p className="px-1 text-xs text-muted">
          Настройки генератора используются и для кнопки «Сгенерировать» в форме записи.
        </p>
      </div>
    </div>
  );
}
