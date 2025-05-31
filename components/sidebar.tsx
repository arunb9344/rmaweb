"use client"

import { Home, Plus, Package, Users, Building2, Settings, ChevronUp, User2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

interface NavItem {
  title: string
  url: string
  icon: any
}

const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Raise RMA",
    url: "/dashboard/raise-rma",
    icon: Plus,
  },
  {
    title: "Brands",
    url: "/dashboard/brands",
    icon: Package,
  },
  {
    title: "Contacts",
    url: "/dashboard/contacts",
    icon: Users,
  },
  {
    title: "Service Centres",
    url: "/dashboard/service-centres",
    icon: Building2,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div className="border-r flex flex-col w-[250px]">
      <div className="p-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-2xl">
          RMA Portal
        </Link>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="icon" variant="ghost">
              <ChevronUp className="h-4 w-4 rotate-[-90deg]" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <SidebarMobile />
          </SheetContent>
        </Sheet>
      </div>
      <Separator />
      <div className="flex-1 flex flex-col justify-between">
        <div className="py-4">
          {items.map((item) => (
            <NavItem key={item.title} item={item} />
          ))}
        </div>
        <div className="p-4">
          <Separator />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="justify-start w-full gap-2">
                <User2 className="h-4 w-4" />
                My Account
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-40" align="end">
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

interface NavItemProps {
  item: NavItem
}

function NavItem({ item }: NavItemProps) {
  const pathname = usePathname()

  return (
    <Link href={item.url}>
      <Button variant="ghost" className="w-full justify-start gap-2">
        <item.icon className="h-4 w-4" />
        {item.title}
      </Button>
    </Link>
  )
}

function SidebarMobile() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-2xl">
          RMA Portal
        </Link>
      </div>
      <Separator />
      <div className="flex-1 flex flex-col justify-between">
        <div className="py-4">
          {items.map((item) => (
            <NavItem key={item.title} item={item} />
          ))}
        </div>
        <div className="p-4">
          <Separator />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="justify-start w-full gap-2">
                <User2 className="h-4 w-4" />
                My Account
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-40" align="end">
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
