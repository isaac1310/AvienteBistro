'use client';

import History from './History';
import { listMenuRevisions, restoreMenuRevision } from '@/lib/menuMutations';

export default function MenuHistory({ menuId }: { menuId: string }) {
  return (
    <History
      label="this menu"
      load={() => listMenuRevisions(menuId)}
      restore={restoreMenuRevision}
    />
  );
}
