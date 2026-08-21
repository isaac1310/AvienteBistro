import MenuCard from '@/components/MenuCard';
import PrintExit from '@/components/PrintExit';
import { serverT } from '@/lib/lang';
import { fetchSharedMenu, getMenu, occasionRules } from '@/lib/menus';
import { resolveOccasion } from '@/lib/occasion';
import './print.css';

export const metadata = { title: 'Aviente — Menu', robots: { index: false } };

/* The print route (§4). Deliberately bare: no nav, no buttons, no app chrome —
 * just the card on the page, styled by print.css for A4.
 *
 * It serves two callers. A signed-in family member gets it by menu id. A guest,
 * or the PDF renderer, passes ?k= and it goes through the same secret-gated RPC
 * as /m — so the PDF route needs no session and no service-role key. */
export default async function PrintMenu({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const { id } = await params;
  const { k } = await searchParams;
  const t = await serverT();

  const shared = k ? await fetchSharedMenu(id, k) : null;
  /* Without a session `anon` is refused at the privilege level, which getMenu
     turns into a thrown error — and an unauthenticated visitor to a print URL
     should see a sentence, not a 500 page. Swallow it and fall through to the
     "not available" branch, which is the same answer a wrong secret gets. */
  const owned = k ? null : await getMenu(id).catch(() => null);

  const menu = shared
    ? {
        date: shared.date, meal_time: shared.meal_time,
        title: shared.title, language: shared.language,
        chef_notes: shared.chef_notes,
        /* Both branches must carry it or the printed sheet and the screen disagree
           about the running order for the same menu. */
        course_order: shared.course_order,
        items: shared.items.map((i) => ({
          course: i.course,
          dish_title: i.dish_title, dish_title_en: i.dish_title_en,
          description_en: i.description_en, description_he: i.description_he,
          credit_name: i.credit_name,
        })),
      }
    : owned
      ? {
          date: owned.date, meal_time: owned.meal_time,
          title: owned.title, language: owned.language,
          chef_notes: owned.chef_notes,
          course_order: owned.course_order,
          items: owned.items.map((i) => ({
            course: i.course,
            dish_title: i.dish_title, dish_title_en: i.dish_title_en,
            description_en: i.dish_description_en, description_he: i.dish_description_he,
            credit_name: i.credit_name,
          })),
        }
      : null;

  if (!menu) return <main className="printPage"><p>Menu not available.</p></main>;

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
    <main className="printPage">
      {/* A way back, as on the recipe sheet. A GUEST arriving with ?k= has no menu
          page to return to, so the exit is only for the family — otherwise it would
          send a guest to a page that refuses them. */}
      {!k && <PrintExit href={`/menus/${id}`} label={t('print.backToMenu')} />}
      <MenuCard
        date={menu.date}
        title={menu.title ?? occasion?.title ?? null}
        subtitle={occasion?.subtitle}
        ornament={occasion?.ornament}
        language={menu.language}
        chefNotes={menu.chef_notes}
        items={menu.items}
        courseOrder={menu.course_order}
      />
    </main>
  );
}
