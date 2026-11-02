// Подключение к Supabase. Инструкция — в password-manager/README.md.
// «anon public» ключ можно хранить в открытом виде: доступ к данным
// ограничивает Row Level Security, а сами данные зашифрованы в браузере.
// Если оставить поля пустыми, приложение работает в локальном режиме:
// зашифрованные данные хранятся только на этом устройстве.
window.PM_CONFIG = {
  supabaseUrl: 'https://fgtanwupljwpkbcnknpi.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZndGFud3VwbGp3cGtiY25rbnBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2NDE5ODMsImV4cCI6MjEwODIxNzk4M30.KdIkY6NZRI3lyy9VKf77oyF1VndqSU7yjnHg0gexL2E',
};
