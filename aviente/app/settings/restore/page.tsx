import BackLink from '@/components/BackLink';
import Nav from '@/components/Nav';
import { serverT } from '@/lib/lang';
import RestoreBackup from '@/components/RestoreBackup';
import { currentMember } from '@/lib/supabase/server';
import styles from '../settings.module.css';

export const metadata = { title: 'Aviente — Restore', robots: { index: false } };

/* The bulk door (§8). Deliberately NOT the /import screen: /add's "paste from an
 * AI" adds recipes and belongs to everyone; this page replaces the whole cookbook
 * from a backup file and belongs to the admin. The two started out sharing a page,
 * which read as one feature — Itzik's report was exactly that confusion. */
export default async function RestorePage() {
  const t = await serverT();
  const member = await currentMember();

  if (member?.role !== 'admin') {
    return (
      <>
        <Nav current="/" />
        <div className={styles.frame}>
          <main className={`shell ${styles.main}`}>
            <BackLink href="/settings" label={t('settings.eyebrow')} />
            <p className="eyebrow">{t('restore.eyebrow')}</p>
            <h1 className={styles.h1}>{t('restore.notYours')}</h1>
            <p className={styles.body}>
              Restoring a backup replaces the whole cookbook at once. Adding or
              fixing a recipe doesn&rsquo;t need it — that all lives under
              &ldquo;Add a recipe&rdquo;.
            </p>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Nav current="/" />
      <div className={styles.frame}>
        <main className={`shell ${styles.main}`}>
          <BackLink href="/settings" label={t('settings.eyebrow')} />
          <p className="eyebrow">{t('restore.eyebrow')}</p>
          <h1 className={styles.h1}>{t('restore.title')}</h1>
          <RestoreBackup />
        </main>
      </div>
    </>
  );
}
