import { requireClient } from "@/server/session";

export default async function ClientLayout({ children }: LayoutProps<"/cliente">) {
  await requireClient();
  return children;
}
