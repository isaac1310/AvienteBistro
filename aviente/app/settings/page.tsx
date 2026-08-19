import Link from 'next/link';
import BackLink from '@/components/BackLink';
import Nav from '@/components/Nav';
import PageHeader from '@/components/PageHeader';
import PageTitle from '@/components/PageTitle';
import Settings from '@/components/Settings';
import { BUILD_LABEL } from '@/lib/version';
import { serverT } from '@/lib/lang';
import { currentMember } from '@/lib/supabase/server';
import styles from './settings.module.css';

export const metadata = { title: 'Aviente — Settings' };

/* Its own page rather than a drawer on the homepage.
 *
 * Both were tried. Housekeeping controls sitting under the homepage's cards gave
 * three once-a-month settings the same weight as the recipes; folding them into a
 * <details> hid them well enough that the export — the only copy of this book that
 * is not in one Supabase project — became hard to find. A card that leads to a page
 * is honest about both: visible at the top level, out of the way until asked for.
 */
export default async function SettingsPage() {
  const [member, t] = await Promise.all([currentMember(), serverT()]);

  return (
    <>
      <Nav current="/" />
      <div className={styles.frame}>
        {/* Outside main, so the band runs full-bleed. */}
        <div className={`shell ${styles.backRow}`}>
          <BackLink href="/" label={t('nav.home')} />
        </div>

        <PageHeader>
          <PageTitle eyebrow={t('settings.eyebrow')}>{t('settings.title')}</PageTitle>
        </PageHeader>

        <main className={`shell ${styles.main}`}>

          <Settings
            theme={(member?.theme as 'green' | 'burgundy') ?? 'green'}
            language={(member?.language as 'en' | 'he') ?? 'he'}
            displayName={member?.display_name ?? member?.name ?? ''}
          />

          {/* The back room. Backup and restore move the WHOLE cookbook, so they are
              the admin's — by decision, and only these. Everything else on this page,
              and all of /import, stays open to every family member; Moran adds and
              pastes recipes exactly as before. Hiding the section is the door;
              /api/backup checks the role server-side, because a URL that still
              answers is not hidden. */}
          {member?.role === 'admin' && (
            <section className={styles.block} aria-labelledby="backup-h">
              <h2 className={styles.h2} id="backup-h">{t('settings.backup')}</h2>
              <div className={`card ${styles.panel}`}>
                <p className={styles.body}>{t('settings.backupBody')}</p>
                <p className={styles.btnRow}>
                  <a className="btn" href="/api/backup" download>{t('settings.download')}</a>
                  {/* The other half of a backup. Download lived here alone, so restoring
                      meant knowing that the importer doubles as the restore path —
                      which nobody should have to know. Same screen, both directions. */}
                  <Link className="btn btn--ghost" href="/import">⤒ Restore from a backup</Link>
                </p>
              </div>
            </section>
          )}

          {/* A working sheet, not a feature — but findable, because the plates are
              what most of this book looks like. */}
          <p className={styles.aside}>
            <Link href="/brand">{t('settings.blueprints')}</Link>
          </p>

          <p className={styles.build}>{BUILD_LABEL}</p>
        </main>
      </div>
    </>
  );
}
