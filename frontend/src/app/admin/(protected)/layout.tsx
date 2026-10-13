import { AdminShell } from "@/features/admin-auth/admin-shell";

export default function Layout({ children }: {
  children: React.ReactNode;
}) {
  return (
    <AdminShell>
      {children}
    </AdminShell>
  );
}
