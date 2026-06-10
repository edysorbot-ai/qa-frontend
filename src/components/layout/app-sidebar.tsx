"use client";

import { useSyncExternalStore } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useClerk, useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  PlayCircle,
  Settings,
  LogOut,
  ChevronUp,
  Users,
  CalendarClock,
  Activity,
  BarChart3,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    title: "Agents",
    icon: Users,
    href: "/dashboard/agents",
  },
  {
    title: "Test Runs",
    icon: PlayCircle,
    href: "/dashboard/test-runs",
  },
  {
    title: "Test Schedules",
    icon: CalendarClock,
    href: "/dashboard/scheduled-tests",
  },
  {
    title: "Production Monitoring",
    icon: Activity,
    href: "/dashboard/monitoring",
  },
  {
    title: "Analytics",
    icon: BarChart3,
    href: "/dashboard/analytics",
  },
  {
    title: "Agent Builder",
    icon: Wrench,
    href: "/dashboard/agent-builder",
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/dashboard/settings",
  },
];

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const pathname = usePathname();
  const router = useRouter();
  
  // Use useSyncExternalStore to prevent hydration mismatch
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b border-sidebar-border">
            <div className="flex items-center gap-2 px-4 py-3">
              <Link href="/dashboard" className="flex items-center">
                <Image
                  src="/stablr.svg"
                  alt="STABLR"
                  width={120}
                  height={32}
                  className="h-8 w-auto"
                />
              </Link>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={
                          item.href === "/dashboard"
                            ? pathname === item.href
                            : pathname.startsWith(item.href)
                        }
                      >
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-sidebar-border">
            <SidebarMenu>
              <SidebarMenuItem>
                {mounted ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton className="w-full">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user?.imageUrl} />
                          <AvatarFallback>
                            {user?.firstName?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 text-left truncate">
                          {user?.fullName || user?.primaryEmailAddress?.emailAddress}
                        </span>
                        <ChevronUp className="h-4 w-4" />
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="top"
                      className="w-[--radix-popper-anchor-width]"
                    >
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <SidebarMenuButton className="w-full">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-left truncate">Loading...</span>
                    <ChevronUp className="h-4 w-4" />
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1 flex flex-col">
          <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger />
          </header>
          <div className="flex-1 p-6">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
