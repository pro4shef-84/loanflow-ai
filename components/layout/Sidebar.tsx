"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Activity,
  Calendar,
  Settings,
  Upload,
  ChevronLeft,
  Zap,
  Calculator,
  BarChart3,
} from "lucide-react";
// FileText imported above
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app.store";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/loans", label: "Loan Files", icon: FileText },
  { href: "/pricing", label: "Pricing Engine", icon: Calculator },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/pulse", label: "Pulse", icon: Activity },
  { href: "/deadlines", label: "Deadlines", icon: Calendar },
];

const settingsItems = [
  { href: "/reports/mcr", label: "MCR Report", icon: BarChart3 },
  { href: "/settings/rate-sheets", label: "Rate Sheets", icon: FileText },
  { href: "/import", label: "Import (ARIVE)", icon: Upload },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-slate-950 text-slate-100 transition-all duration-300",
        sidebarOpen ? "w-64" : "w-16"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800">
        {sidebarOpen && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-blue-400" />
            <span className="font-bold text-lg tracking-tight">LoanFlow AI</span>
          </Link>
        )}
        {!sidebarOpen && <Zap className="h-6 w-6 text-blue-400 mx-auto" />}
        {sidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          );
        })}

        <Separator className="my-4 bg-slate-800" />

        {settingsItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle when closed */}
      {!sidebarOpen && (
        <div className="p-2 border-t border-slate-800">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="w-full text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </Button>
        </div>
      )}
    </aside>
  );
}
