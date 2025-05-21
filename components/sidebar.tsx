"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { toast } from "@/components/ui/use-toast"
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Package,
  ChevronDown,
  ChevronRight,
  Tag,
} from "lucide-react"

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isRMASubmenuOpen, setIsRMASubmenuOpen] = useState(true)

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      toast({
        title: "Signed out",
        description: "You have been signed out successfully",
      })
      router.push("/login")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      })
    }
  }

  const isActive = (path: string) => {
    return pathname === path
  }

  return (
    <>
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button variant="outline" size="icon" onClick={() => setIsCollapsed(!isCollapsed)} className="rounded-full">
          {isCollapsed ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isCollapsed ? "translate-x-0" : "-translate-x-full"
        } lg:relative lg:w-64`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6" />
              <h1 className="font-bold text-xl">RMA System</h1>
            </div>
          </div>

          <div className="flex-1 py-4 overflow-y-auto">
            <nav className="px-2 space-y-1">
              <Link
                href="/dashboard"
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                  isActive("/dashboard") ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
                }`}
                onClick={() => setIsCollapsed(false)}
              >
                <LayoutDashboard className="h-5 w-5" />
                Dashboard
              </Link>

              <div>
                <button
                  className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setIsRMASubmenuOpen(!isRMASubmenuOpen)}
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5" />
                    RMA Management
                  </div>
                  {isRMASubmenuOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>

                {isRMASubmenuOpen && (
                  <div className="ml-9 mt-1 space-y-1">
                    <Link
                      href="/dashboard/raise-rma"
                      className={`block px-3 py-2 rounded-md text-sm font-medium ${
                        isActive("/dashboard/raise-rma")
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                      onClick={() => setIsCollapsed(false)}
                    >
                      Raise New RMA
                    </Link>
                  </div>
                )}
              </div>

              <Link
                href="/dashboard/contacts"
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                  isActive("/dashboard/contacts") ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
                }`}
                onClick={() => setIsCollapsed(false)}
              >
                <Users className="h-5 w-5" />
                Contacts
              </Link>

              <Link
                href="/dashboard/brands"
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                  isActive("/dashboard/brands") ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
                }`}
                onClick={() => setIsCollapsed(false)}
              >
                <Tag className="h-5 w-5" />
                Brands
              </Link>

              <Link
                href="/dashboard/settings"
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                  isActive("/dashboard/settings") ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
                }`}
                onClick={() => setIsCollapsed(false)}
              >
                <Settings className="h-5 w-5" />
                Settings
              </Link>
            </nav>
          </div>

          <div className="p-4 border-t">
            <Button variant="outline" className="w-full flex items-center gap-2 justify-center" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isCollapsed && (
        <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={() => setIsCollapsed(false)} />
      )}
    </>
  )
}
