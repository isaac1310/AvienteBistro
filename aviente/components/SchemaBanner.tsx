import { schemaState } from '@/lib/schema';
import styles from './SchemaBanner.module.css';

/**
 * Says so when the database is behind the code, on every page.
 *
 * The alternative — which is what happened — is a 500 on whichever screen touches
 * the new column, and no way to tell that from a bug. A migration that has not been
 * run is the single most likely reason this app breaks, because running it is a
 * manual step someone has to remember.
 *
 * Silent when the schema is fine, and silent when the answer is unknown: a visitor
 * with no session cannot read `schema_migrations`, and telling them the database is
 * broken because they are not logged in would be worse than saying nothing.
 */
export default async function SchemaBanner() {
  const state = await schemaState();
  if (state.ok || state.reason === 'unknown') return null;

  /* Two different problems, two different instructions. Telling someone whose
     database is merely untracked to run every migration from 0001 would be worse
     advice than saying nothing. */
  /* Two audiences, one banner. Moran has no Supabase access — this is an MVP run by
     one admin — so a filename is noise to her and the old wording read as "you broke
     it". The first sentence is for her; the filenames stay for whoever can act. */
  if (state.reason === 'untracked') {
    return (
      <div className={styles.bar} role="status">
        <strong className={styles.title}>The app needs a database update.</strong>{' '}
        Nothing is lost and browsing still works — Itzik has the steps.
        <span className={styles.admin}>
          {' '}Admin: run <code className={styles.file}>0009_schema_migrations.sql</code>{' '}
          from <code className={styles.file}>supabase/migrations/</code> — it only
          creates the tracking table and changes no recipe data.
        </span>
      </div>
    );
  }

  const missing = Array.from(
    { length: state.need - state.have },
    (_, i) => state.have + i + 1,
  );

  return (
    <div className={styles.bar} role="status">
      <strong className={styles.title}>The app needs a database update.</strong>{' '}
      Some pages may not work until it runs — nothing is lost, and Itzik has the
      steps.
      <span className={styles.admin}>
        {' '}Admin: the database has migration {state.have}; this build needs{' '}
        {state.need}. Run{' '}
        {missing.map((n, i) => (
          <span key={n}>
            {i > 0 && ', '}
            <code className={styles.file}>{String(n).padStart(4, '0')}_*.sql</code>
          </span>
        ))}{' '}
        from <code className={styles.file}>supabase/migrations/</code> in the Supabase
        SQL editor.
      </span>
    </div>
  );
}
