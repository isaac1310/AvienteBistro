import BackLink from '@/components/BackLink';
import Nav from '@/components/Nav';
import PageHeader from '@/components/PageHeader';
import PageTitle from '@/components/PageTitle';
import TrashList from '@/components/TrashList';
import { serverT } from '@/lib/lang';
import { deletedRecipes } from '@/lib/queries';
import styles from '../recipes.module.css';

export const metadata = { title: 'Aviente — Trash' };

/* /recipes/trash — the durable half of deletion.
 *
 * Deleting has always been a soft delete plus a ten-second undo toast; when the
 * toast died, the row was safe but unreachable. This page lists every soft-deleted
 * recipe with a Restore button. It is a static segment, so it wins over
 * /recipes/[category] in routing; no category is named "trash". */
export default async function TrashPage() {
  const [rows, t] = await Promise.all([deletedRecipes(), serverT()]);

  return (
    <>
      <Nav current="/recipes" />
      <div className={styles.frame}>
        <div className={`shell ${styles.backRow}`}>
          <BackLink href="/recipes" label={t('book.back')} />
        </div>

        <PageHeader>
          <PageTitle eyebrow={t('book.eyebrow')}>{t('trash.title')}</PageTitle>
        </PageHeader>

        <main className="shell">
          <TrashList rows={rows} />
        </main>
      </div>
    </>
  );
}
