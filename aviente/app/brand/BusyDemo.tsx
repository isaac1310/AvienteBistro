'use client';

import { useState } from 'react';
import BusyButton from '@/components/BusyButton';

/* The action loader, live, on the sheet: three seconds of pretend work and nothing
   written — so the floating card can be seen and judged without saving a recipe. */
export default function BusyDemo() {
  const [busy, setBusy] = useState(false);
  return (
    <BusyButton busy={busy} busyLabel="Saving…" onClick={() => {
      setBusy(true);
      setTimeout(() => setBusy(false), 3000);
    }}>
      Try the action loader
    </BusyButton>
  );
}
