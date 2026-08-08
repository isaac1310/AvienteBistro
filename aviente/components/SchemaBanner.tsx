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
  if (state.reason === 'untracked') {
    return (
      <div className={styles.bar} role="status">
        <strong className={styles.title}>Migrations are not being tracked yet.</strong>{' '}
        Run <code className={styles.file}>0009_schema_migrations.sql</code> from{' '}
        <code className={styles.file}>supabase/migrations/</code>. It only creates the
        table that records which migrations have run and backfills the ones you
        already have — it changes no recipe data.
      </div>
    );
  }

  const missing = Array.from(
    { length: state.need - state.have },
    (_, i) => state.have + i + 1,
  );

  return (
    <div className={styles.bar} role="status">
      <strong className={styles.title}>The database is behind this build.</strong>{' '}
      It has migration {state.have}; this version needs {state.need}. Run{' '}
      {missing.map((n, i) => (
        <span key={n}>
          {i > 0 && ', '}
          <code className={styles.file}>{String(n).padStart(4, '0')}_*.sql</code>
        </span>
      ))}{' '}
      from <code className={styles.file}>supabase/migrations/</code> in the Supabase
      SQL editor. Pages that use the new columns will fail until you do.
    </div>
  );
}
