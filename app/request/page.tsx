"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Package2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"

export default function RequestPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500))

    toast({
      title: "RMA Request Submitted",
      description: "Your return request has been received. Check your email for further instructions.",
    })

    router.push("/dashboard")
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <Package2 className="h-6 w-6" />
            <span>ReturnEase</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-muted-foreground">
              Home
            </Link>
            <Link href="/how-it-works" className="text-muted-foreground">
              How It Works
            </Link>
            <Link href="/faq" className="text-muted-foreground">
              FAQ
            </Link>
            <Link href="/contact" className="text-muted-foreground">
              Contact
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="outline">Log In</Button>
            </Link>
            <Link href="/auth/register">
              <Button>Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 py-12">
        <div className="container max-w-3xl px-4 md:px-6">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold">Return Merchandise Authorization</h1>
            <p className="text-muted-foreground mt-2">Fill out the form below to start your return process</p>
          </div>
          <Card>
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle>RMA Request Form</CardTitle>
                <CardDescription>Please provide your order details and reason for return</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Customer Information</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="first-name">First Name</Label>
                      <Input id="first-name" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name">Last Name</Label>
                      <Input id="last-name" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" type="tel" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Order Details</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="order-number">Order Number</Label>
                      <Input id="order-number" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="purchase-date">Purchase Date</Label>
                      <Input id="purchase-date" type="date" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product-name">Product Name</Label>
                    <Input id="product-name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serial-number">Serial Number</Label>
                    <Input id="serial-number" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Return Details</h3>
                  <div className="space-y-2">
                    <Label>Reason for Return</Label>
                    <RadioGroup defaultValue="defective">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="defective" id="defective" />
                        <Label htmlFor="defective">Defective Product</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="wrong-item" id="wrong-item" />
                        <Label htmlFor="wrong-item">Wrong Item Received</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="not-as-described" id="not-as-described" />
                        <Label htmlFor="not-as-described">Not as Described</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="other" id="other" />
                        <Label htmlFor="other">Other</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="condition">Product Condition</Label>
                    <Select defaultValue="unopened">
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unopened">Unopened</SelectItem>
                        <SelectItem value="opened">Opened (Like New)</SelectItem>
                        <SelectItem value="used">Used</SelectItem>
                        <SelectItem value="damaged">Damaged</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description of Issue</Label>
                    <Textarea
                      id="description"
                      placeholder="Please provide details about the issue you're experiencing"
                      rows={4}
                      required
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" type="button" onClick={() => router.push("/")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit RMA Request"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </main>
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © 2025 ReturnEase. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
