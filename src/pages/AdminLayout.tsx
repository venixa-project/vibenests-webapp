import { Outlet } from "react-router-dom";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SuitesProvider } from "@/components/admin/SuitesContext";
import { SidebarProvider } from "@/components/admin/SidebarContext";

export default function AdminLayout() {
  return (
    <SidebarProvider>
      <SuitesProvider>
        <AdminLayoutContent />
      </SuitesProvider>
    </SidebarProvider>
  );
}

function AdminLayoutContent() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[oklch(0.09_0.02_260)]">
      <AdminSidebar />
      <div className="flex-1 flex flex-col h-full overflow-y-auto min-w-0">
        <Outlet />
      </div>
    </div>
  );
}

