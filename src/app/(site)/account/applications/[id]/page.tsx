import ApplicationDetail from '@/components/portal/ApplicationDetail';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ApplicationDetail id={id} />;
}
