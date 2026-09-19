import { notFound } from "next/navigation";
import { MemberDetail } from "@/components/MemberDetail";
import { getMember } from "@/lib/queries";

export default async function MemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getMember(id);
  if (!data) notFound();

  return <MemberDetail member={data.member} transactions={data.transactions} />;
}
