import { Sidebar, MobileNav } from "@/components/Sidebar";
import { OneDriveSyncProvider } from "@/components/OneDriveSyncProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <OneDriveSyncProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 min-w-0">
          <MobileNav />
          <main className="max-w-[1400px] mx-auto p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </OneDriveSyncProvider>
  );
}
