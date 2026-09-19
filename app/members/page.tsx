import { MembersList } from "@/components/MembersList";
import { getMembers } from "@/lib/queries";

export default async function MembersPage() {
  const members = await getMembers();

  return <MembersList members={members} />;
}
