import Link from 'next/link';
import { notFound } from 'next/navigation';
import MenuCard from '@/components/MenuCard';
import MenuActions from '@/components/MenuActions';
import MenuHistory from '@/components/MenuHistory';
import AfterNotes from '@/components/AfterNotes';
import Nav from '@/components/Nav';
import { getMenu, menuAfterNotes, occasionRules } from '@/lib/menus';
import { resolveOccasion } from '@/lib/occasion';
import styles from './menu.module.css';
import Arrow from '@/components/Arrow';
import { serverT } from '@/lib/lang';

export const metadata = { title: 'Aviente — Menu' };

/* The finished card, plus what you can do with it (§3.6). */
export default async function MenuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [menu, t] = await Promise.all([getMenu(id), serverT()]);
  if (!menu) notFound();

  /* Read separately, tolerant of a database still at migration 21 — see menuAfterNotes. */
  const [rules, after] = await Promise.all([occasionRules(), menuAfterNotes(menu.id)]);
  const occasion = resolveOccasion(
    /* Noon for a daytime meal, 18:00 for an evening one. The clock time is not
       what decides anything — mealTime is — but a Date is still needed and
       midnight would land the wrong side of a day boundary. */
    new Date(`${menu.date}T${menu.meal_time === 'day' ? '12' : '18'}:00:00`),
    menu.meal_time,
    rules,
  );

  return (
    <>
      <Nav current="/menus" />
      <div className={styles.frame}>
        <div className={`shell ${styles.top}`}>
          <Link href="/menus" className={styles.back}><Arrow /> {t('nav.menus')}</Link>
        </div>

        <div className={styles.cardWrap}>
          <MenuCard
            date={menu.date}
            title={menu.title ?? occasion?.title ?? null}
            subtitle={occasion?.subtitle}
            ornament={occasion?.ornament}
            language={menu.language}
            chefNotes={menu.chef_notes}
            items={menu.items.map((i) => ({
              course: i.course,
              dish_title: i.dish_title,
              dish_title_en: i.dish_title_en,
              description_en: i.dish_description_en,
              description_he: i.dish_description_he,
              credit_name: i.credit_name,
            }))}
            courseOrder={menu.course_order}
          />
        </div>

        <div className="shell">
          <MenuActions
            id={menu.id}
            date={menu.date}
            saved={menu.saved}
            shareId={menu.share_id}
            shareSecret={menu.share_secret}
          />
          {/* The note AFTER the meal — outside cardWrap on purpose: everything inside
              that wrapper is the printed card, and this must never be. Hidden until
              migration 0022 has run. */}
          {after.available && (
            <AfterNotes
              menuId={menu.id}
              menuDate={menu.date}
              initial={after.text}
              dishes={menu.items
                .filter((i) => i.recipe_id)
                .map((i) => ({ recipeId: i.recipe_id as string, title: i.dish_title ?? '—' }))}
            />
          )}
          <div className={styles.history}><MenuHistory menuId={menu.id} /></div>
        </div>
      </div>
    </>
  );
}
