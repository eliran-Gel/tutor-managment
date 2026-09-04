import { ProfilePageContent } from "@/components/profile-page-content";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const { child } = await searchParams;
  return <ProfilePageContent requestedChildId={child} />;
}
