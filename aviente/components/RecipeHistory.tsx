'use client';

import History from './History';
import { listRevisions, restoreRecipeRevision } from '@/lib/mutations';

/* Thin binding: History is shared with menus, so each caller supplies its own
   loader and restorer rather than the component knowing about either. */
export default function RecipeHistory({ recipeId }: { recipeId: string }) {
  return (
    <History
      load={() => listRevisions(recipeId)}
      restore={restoreRecipeRevision}
    />
  );
}
