import Loading from '@/components/Loading';

/* A recipe is one object, not a list — a row of skeleton cards here would promise
   a shape the page does not have. */
export default function RecipeLoading() {
  return <Loading label="Loading the recipe" />;
}
