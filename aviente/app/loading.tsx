import Loading from '@/components/Loading';

/* Root boundary: catches any segment without its own. */
export default function RootLoading() {
  return <Loading rows={4} label="Loading Aviente" />;
}
