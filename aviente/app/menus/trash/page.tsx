import BackLink from '@/components/BackLink';
import Nav from '@/components/Nav';
import PageHeader from '@/components/PageHeader';
import PageTitle from '@/components/PageTitle';
import TrashList from '@/components/TrashList';
import { currentLang, serverT } from '@/lib/lang';
import { deletedMenus } from '@/lib/menus';
import { restoreMenu } from '@/lib/menuMutations';
import { listDate } from '@/lib/occasion';
import styles from '../menus.module.css';

export const metadata = { title: 'Aviente — Menu trash' };

/* /menus/trash — mirrors /recipes/trash. Static segment; /menus/[id] takes a uuid so
 * there is no collision, but the same static-wins rule applies. */
export default async function MenusTrashPage() {
  const [rows, t, lang] = await Promise.all([deletedMenus(), serverT(), currentLang()]);

  return (
    <>
      <Nav current="/menus" />
      <div className={styles.frame}>
        <div className={`shell ${styles.backRow}`}>
          <BackLink href="/menus" label={t('nav.menus')} />
        </div>

        <PageHeader>
          <PageTitle eyebrow={t('menus.title')}>{t('menusTrash.title')}</PageTitle>
        </PageHeader>

        <main className="shell">
          <TrashList
            rows={rows.map((m) => ({
              id: m.id,
              title: m.title ?? t('menu.untitled'),
              deleted_at: m.deleted_at,
              meta: `${m.saved ? '★ ' : ''}${listDate(new Date(`${m.date}T12:00:00`), lang)}`,
            }))}
            restore={restoreMenu}
            backHref="/menus" backLabel={t('nav.menus')}
            emptyText={t('menusTrash.empty')} hintText={t('menusTrash.hint')}
          />
        </main>
      </div>
    </>
  );
}
