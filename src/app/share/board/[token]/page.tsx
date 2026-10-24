import type { Metadata } from "next";
import { PublicBoard } from "@/components/sharing/PublicBoard";
export const metadata: Metadata = {
  title: "Project progress · VinzFlow",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function SharedBoardPage({
  params,
}: {
  params: { token: string };
}) {
  return <PublicBoard token={params.token} />;
}
