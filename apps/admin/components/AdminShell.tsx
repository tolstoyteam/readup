import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  LibraryBigIcon,
  LogOutIcon,
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
  SidebarRail,
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
        <SidebarHeader className="h-14 justify-center px-3">
          <div className="relative h-5 w-[74px] overflow-hidden px-0 group-data-[collapsible=icon]:w-8">
            <Image
              src="/readup-logo.svg"
              alt="Readup"
              width={74}
              height={20}
              priority
              className="absolute left-0 top-1/2 h-5 w-[74px] max-w-none -translate-y-1/2"
            />
          </div>
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
            <Button
              type="submit"
              variant="outline"
              title="Sign out"
              className="w-full justify-start rounded-xl group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0"
            >
              <LogOutIcon className="size-4" />
              <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
            </Button>
          </form>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="hidden h-14 items-center gap-2 border-b px-4 md:flex">
          <SidebarTrigger />
        </header>
        <header className="flex h-14 items-center gap-2 border-b px-4 md:hidden">
          <SidebarTrigger />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
