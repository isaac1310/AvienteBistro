import MenuCard from '@/components/MenuCard';
import StripSecret from '@/components/StripSecret';
import { fetchSharedMenu, occasionRules } from '@/lib/menus';
import { resolveOccasion } from '@/lib/occasion';
import { serverT } from '@/lib/lang';
import styles from './guest.module.css';

export const metadata = {
  title: 'Aviente — Menu',
  robots: { index: false, follow: false },
};

/* The guest menu page (§3.6). No account, no session — the secret in the URL is
 * the whole credential, and `fetch_shared_menu` is a security-definer RPC that
 * returns the assembled card and nothing else. It never joins recipes, so this
 * page cannot leak ingredients, steps, stories or photographs. */
export default async function SharedMenuPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const t = await serverT();
  const { id } = await params;
  const { k } = await searchParams;

  const menu = k ? await fetchSharedMenu(id, k) : null;

  if (!menu) {
    return (
      <main className={styles.page}>
        <div className={styles.gone}>
          <p className={styles.goneTitle}>{t('guest.gone')}</p>
          <p className={styles.goneBody}>{t('guest.goneBody')}</p>
        </div>
      </main>
    );
  }

  const rules = await occasionRules();
  const occasion = resolveOccasion(
    /* Noon for a daytime meal, 18:00 for an evening one. The clock time is not
       what decides anything — mealTime is — but a Date is still needed and
       midnight would land the wrong side of a day boundary. */
    new Date(`${menu.date}T${menu.meal_time === 'day' ? '12' : '18'}:00:00`),
    menu.meal_time,
    rules,
  );

  return (
    <main className={styles.page}>
      {/* Removes the secret from the address bar once it has been used, so it is
          not left on screen or leaked in an outbound Referer header. */}
      <StripSecret />

      <MenuCard
        date={menu.date}
        title={menu.title ?? occasion?.title ?? null}
        subtitle={occasion?.subtitle}
        ornament={occasion?.ornament}
        language={menu.language}
        chefNotes={menu.chef_notes}
        items={menu.items ?? []}
        courseOrder={menu.course_order}
      />

      <p className={styles.foot}>
        <a href={`/print/menu/${id}?k=${k}`} className={styles.print}>{t('guest.savePdf')}</a>
      </p>
      <p className={styles.est}>Aviente · Est. 2018</p>
    </main>
  );
}
