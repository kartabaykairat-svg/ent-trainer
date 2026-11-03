import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { AppShell, type Tab } from './components/AppShell';
import { AuthShell } from './components/AuthShell';
import { Button, Spinner } from './components/ui';
import { AuditScreen } from './screens/AuditScreen';
import { AuthScreen } from './screens/AuthScreen';
import { GeneratorScreen } from './screens/GeneratorScreen';
import { MfaScreen } from './screens/MfaScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SetupMasterScreen } from './screens/SetupMasterScreen';
import { UnlockScreen } from './screens/UnlockScreen';
import { VaultScreen } from './screens/VaultScreen';
import { useSession } from './state/session';

function Unlocked() {
  const { lock } = useSession();
  const [tab, setTab] = useState<Tab>('vault');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        lock();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lock]);

  return (
    <AppShell tab={tab} onTab={setTab}>
      {tab === 'vault' && <VaultScreen />}
      {tab === 'generator' && <GeneratorScreen />}
      {tab === 'audit' && <AuditScreen />}
      {tab === 'settings' && <SettingsScreen />}
    </AppShell>
  );
}

export function App() {
  const { phase, error, evaluate } = useSession();

  switch (phase) {
    case 'loading':
      return (
        <div className="flex h-full items-center justify-center" role="status">
          <Spinner className="size-8" />
          <span className="sr-only">Загрузка…</span>
        </div>
      );
    case 'error':
      return (
        <AuthShell title="Не удалось загрузить" subtitle={error ?? undefined}>
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="size-8 text-danger" aria-hidden />
            <Button onClick={() => void evaluate().catch(() => {})} icon={<RefreshCw className="size-4" />}>
              Повторить
            </Button>
          </div>
        </AuthShell>
      );
    case 'auth':
      return <AuthScreen />;
    case 'mfa':
      return <MfaScreen />;
    case 'setup':
      return <SetupMasterScreen />;
    case 'locked':
      return <UnlockScreen />;
    case 'unlocked':
      return <Unlocked />;
  }
}
