import { Suspense } from 'react';
import Cachet from '@/components/Cachet';
import LoginForm from './LoginForm';
import styles from './login.module.css';

export const metadata = { title: 'Aviente — Entrez' };

/* The login screen. The exploration file had none, so this follows the 1a idiom:
 * the plaque, a gold rule, and as little else as possible. */
export default function LoginPage() {
  // Localhost-only escape hatch for the selftest. The flag alone is not enough --
  // the host must also be local, so setting NEXT_PUBLIC_E2E in Vercel by accident
  // cannot expose a password form on the real site.
  const e2e = process.env.NEXT_PUBLIC_E2E === '1';

  return (
    <main className={styles.page}>
      <div className={styles.plaque}>
        <Cachet variant="plaque" subtitle="Livre de Recettes de Famille" />
      </div>

      <Suspense fallback={null}>
        <LoginForm e2eAvailable={e2e} />
      </Suspense>
    </main>
  );
}
