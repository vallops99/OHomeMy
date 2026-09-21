import { HassConnect } from '@hakit/core';
import Dashboard from './Dashboard';
import { HakitTheme } from './ui';

function App() {
  return (
    <HassConnect
      hassUrl={import.meta.env.VITE_HA_URL}
      hassToken={import.meta.env.VITE_HA_TOKEN}
      // @hakit is documented to take the language from the Home Assistant
      // instance, but its own surfaces (the entity modal) came up in English
      // against an Italian `ha-local`. The house is Italian and the UI copy
      // is Italian (map Notes), so it is pinned rather than detected.
      options={{ locale: 'it' }}
    >
      {/* Drives @hakit's own surfaces -- the entity modal above all -- from
          our tokens. See src/ui/HakitTheme.tsx. */}
      <HakitTheme />
      <Dashboard />
    </HassConnect>
  );
}

export default App;
