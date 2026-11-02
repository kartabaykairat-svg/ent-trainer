// Лёгкая оценка надёжности пароля: энтропия по алфавиту + штрафы
// за распространённые пароли, повторы, последовательности и раскладку.

const COMMON = new Set(
  (
    '123456 123456789 12345678 12345 1234567 1234567890 qwerty qwerty123 password password1 111111 123123 ' +
    'abc123 000000 iloveyou 1q2w3e4r 1q2w3e4r5t qwertyuiop 654321 666666 777777 987654321 123321 555555 ' +
    'admin welcome monkey dragon letmein football baseball master sunshine princess qazwsx zaq12wsx ' +
    'passw0rd p@ssw0rd 1qaz2wsx asdfgh asdfghjkl zxcvbnm 112233 121212 159753 parol parol123 ' +
    'privet qwe123 natasha marina samsung nokia 7777777 88888888 99999999 secret 11111111 00000000 ' +
    'йцукен пароль привет любовь'
  ).split(' '),
);

const SEQUENCES = [
  'abcdefghijklmnopqrstuvwxyz',
  '01234567890',
  'qwertyuiopasdfghjklzxcvbnm',
  'йцукенгшщзхъфывапролджэячсмитьбю',
  'абвгдеёжзийклмнопрстуфхцчшщъыьэюя',
];

export interface Strength {
  score: 0 | 1 | 2 | 3 | 4;
  bits: number;
  label: string;
  hint: string;
}

const LABELS = ['Очень слабый', 'Слабый', 'Средний', 'Надёжный', 'Очень надёжный'];

function poolSize(pw: string): number {
  let size = 0;
  if (/[a-z]/.test(pw)) size += 26;
  if (/[A-Z]/.test(pw)) size += 26;
  if (/[0-9]/.test(pw)) size += 10;
  if (/[а-яё]/.test(pw)) size += 33;
  if (/[А-ЯЁ]/.test(pw)) size += 33;
  if (/[^a-zA-Z0-9а-яёА-ЯЁ]/.test(pw)) size += 33;
  return size || 1;
}

function sequencePenalty(pw: string): number {
  const low = pw.toLowerCase();
  let run = 0;
  for (const seq of SEQUENCES) {
    for (let i = 0; i < low.length - 2; i++) {
      const chunk = low.slice(i, i + 3);
      const rev = chunk.split('').reverse().join('');
      if (seq.includes(chunk) || seq.includes(rev)) run++;
    }
  }
  return run;
}

export function estimateStrength(pw: string): Strength {
  if (!pw) return { score: 0, bits: 0, label: 'Нет пароля', hint: '' };
  const chars = Array.from(pw);
  let bits = chars.length * Math.log2(poolSize(pw));

  // повторяющиеся символы
  const unique = new Set(chars).size;
  if (unique < chars.length / 2) bits *= unique / chars.length + 0.3;
  // aaa, 1111
  if (/(.)\1{2,}/.test(pw)) bits -= 10;
  bits -= sequencePenalty(pw) * 4;

  // похоже на фразу из слов — считаем по словам
  const words = pw.split(/[\s\-_.]+/).filter(Boolean);
  if (words.length >= 4 && words.every((w) => /^[a-zA-Zа-яёА-ЯЁ]+\d*$/.test(w))) {
    bits = Math.max(bits, words.length * 12.9);
  }

  const base = pw.toLowerCase().replace(/[\d!@#$%^&*.]+$/, '');
  let hint = '';
  if (COMMON.has(pw.toLowerCase()) || COMMON.has(base)) {
    bits = Math.min(bits, 8);
    hint = 'Это один из самых популярных паролей';
  }
  bits = Math.max(0, Math.round(bits));

  let score: Strength['score'];
  if (bits < 28) score = 0;
  else if (bits < 45) score = 1;
  else if (bits < 60) score = 2;
  else if (bits < 80) score = 3;
  else score = 4;

  if (!hint) {
    if (chars.length < 12) hint = 'Используйте не менее 12 символов';
    else if (score < 3) hint = 'Добавьте цифры, символы или ещё несколько слов';
  }
  return { score, bits, label: LABELS[score], hint };
}

export function isWeak(pw: string): boolean {
  return estimateStrength(pw).score < 2;
}
