import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Home() {
  // Redirect to login page
  redirect("/login")

  // This code won't run due to the redirect, but is here as a fallback
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold">RMA Management System</h1>
          <p className="mt-2 text-muted-foreground">Admin Portal</p>
          <div className="mt-4">
            <Link href="/login">
              <Button>Login to Continue</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
