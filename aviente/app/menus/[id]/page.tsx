import Link from 'next/link';
import { notFound } from 'next/navigation';
import MenuCard from '@/components/MenuCard';
import MenuActions from '@/components/MenuActions';
import MenuHistory from '@/components/MenuHistory';
import Nav from '@/components/Nav';
import { getMenu, occasionRules } from '@/lib/menus';
import { resolveOccasion } from '@/lib/occasion';
import styles from './menu.module.css';

export const metadata = { title: 'Aviente — Menu' };

/* The finished card, plus what you can do with it (§3.6). */
export default async function MenuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const menu = await getMenu(id);
  if (!menu) notFound();

  const rules = await occasionRules();
  const occasion = resolveOccasion(new Date(`${menu.date}T18:00:00`), 'evening', rules);

  return (
    <>
      <Nav current="/menus" />
      <div className={styles.frame}>
        <div className={`shell ${styles.top}`}>
          <Link href="/menus" className={styles.back}>← Menus</Link>
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
          <div className={styles.history}><MenuHistory menuId={menu.id} /></div>
        </div>
      </div>
    </>
  );
}
