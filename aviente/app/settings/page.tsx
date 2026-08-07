import BackLink from '@/components/BackLink';
import Nav from '@/components/Nav';
import Settings from '@/components/Settings';
import { BUILD_LABEL } from '@/lib/version';
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
  const member = await currentMember();

  return (
    <>
      <Nav current="/" />
      <div className={styles.frame}>
        <main className={`shell ${styles.main}`}>
          <BackLink href="/" label="Home" />
          <p className="eyebrow">Settings</p>
          <h1 className={styles.h1}>How the app behaves</h1>

          <Settings
            theme={(member?.theme as 'green' | 'burgundy') ?? 'green'}
            cardLanguage={(member?.card_language as 'en' | 'he') ?? 'he'}
          />

          <section className={styles.block} aria-labelledby="backup-h">
            <h2 className={styles.h2} id="backup-h">Backup</h2>
            <div className={`card ${styles.panel}`}>
              <p className={styles.body}>
                The free Supabase tier takes no automated backups, and these recipes
                exist nowhere else. The file below is a complete copy — every recipe,
                menu and kids&rsquo; week — and the importer reads it back.
              </p>
              <p>
                <a className="btn" href="/api/backup" download>⤓ Download a backup</a>
              </p>
            </div>
          </section>

          <p className={styles.build}>{BUILD_LABEL}</p>
        </main>
      </div>
    </>
  );
}
