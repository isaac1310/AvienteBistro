import Loading from '@/components/Loading';

/* /add is a two-card chooser, not a list — the row skeletons would promise a shape
   this page does not have. (The other routes without their own file are covered by a
   parent boundary; only this one benefits from a tailored skeleton.) */
export default function AddLoading() {
  return <Loading label="Loading" />;
}
