import { getActivity } from "@/server/bookings";
import { requireOwner } from "@/server/session";
import { LiveUpdates } from "./live-updates";

export default async function OwnerLayout({ children }: LayoutProps<"/duena">) {
  await requireOwner();
  const latest = (await getActivity()).find((a) => !a.read) ?? null;
  return (
    <>
      <LiveUpdates latest={latest && { id: latest.id, title: latest.title, detail: latest.detail }} />
      {children}
    </>
  );
}
