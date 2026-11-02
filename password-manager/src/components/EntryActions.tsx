import { useCallback } from 'react';
import { copyText } from '../lib/clipboard';
import type { Entry } from '../lib/types';
import { useSession } from '../state/session';
import { useToast } from '../state/toast';

export function useCopy() {
  const { markUsed } = useSession();
  const { toast } = useToast();
  return useCallback(
    async (entry: Entry | null, value: string, what: 'login' | 'password' | 'url' | 'old') => {
      try {
        await copyText(value, { secret: what === 'password' || what === 'old' });
        if (entry && what !== 'old') markUsed(entry.id);
        if (what === 'login') toast('Логин скопирован');
        else if (what === 'url') toast('Ссылка скопирована');
        else toast('Пароль скопирован. Буфер обмена очистится через 30 секунд');
      } catch {
        toast('Не удалось скопировать: браузер запретил доступ к буферу обмена', 'error');
      }
    },
    [markUsed, toast],
  );
}
