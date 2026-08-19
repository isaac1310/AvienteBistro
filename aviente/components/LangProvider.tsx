'use client';

import { createContext, useContext } from 'react';
import { dictionary, DEFAULT_LANG, type Lang, type T } from '@/lib/i18n';

/**
 * The language, for client components.
 *
 * Server components read it straight from the member via lib/lang.ts. Client
 * components cannot, so the layout hands it down once through context rather than
 * every form threading a `lang` prop through three levels of children.
 *
 * The dictionary itself is plain data imported on both sides, so this passes a
 * two-letter string across the boundary — not a bundle of strings per render.
 */
const Ctx = createContext<Lang>(DEFAULT_LANG);

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}

/** `const t = useT()` — the client mirror of serverT(). */
export function useT(): T {
  return dictionary(useContext(Ctx));
}

export function useLang(): Lang {
  return useContext(Ctx);
}
