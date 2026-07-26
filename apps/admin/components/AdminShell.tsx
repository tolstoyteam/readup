import type { ReactNode } from "react";
import Link from "next/link";
import {
  BookOpenIcon,
  LibraryBigIcon,
  UploadIcon,
  UsersIcon,
} from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";

type AdminShellProps = {
  active: "books" | "users" | "upload";
  children: ReactNode;
};

const NAV_ITEMS = [
  { key: "books", href: "/books", label: "Books", icon: LibraryBigIcon },
  { key: "users", href: "/users", label: "Users", icon: UsersIcon },
  { key: "upload", href: "/upload", label: "Book upload", icon: UploadIcon },
] as const;

export function AdminShell({ active, children }: AdminShellProps) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-border">
        <SidebarHeader className="px-3 py-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                tooltip="Readup"
                className="font-semibold"
                render={
                  <Link href="/books">
                    <BookOpenIcon />
                    <span>Readup</span>
                  </Link>
                }
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="px-3">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {NAV_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      tooltip={item.label}
                      isActive={item.key === active}
                      className="h-10 rounded-xl text-[15px]"
                      render={
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      }
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarSeparator />
        <SidebarFooter className="p-3">
          <form action={signOut}>
            <Button type="submit" variant="outline" className="w-full justify-start rounded-xl">
              Sign out
            </Button>
          </form>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4 md:hidden">
          <SidebarTrigger />
          <span className="text-sm font-semibold">Readup</span>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
