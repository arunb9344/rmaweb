"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { collection, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Loader2 } from "lucide-react"

interface ContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContactAdded: (contact: any) => void
  editContact?: Contact | null
}

interface Contact {
  id: string
  name?: string
  email: string
  phone: string
  company: string
  address?: string
}

export function ContactDialog({ open, onOpenChange, onContactAdded, editContact }: ContactDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<Contact>({
    id: editContact?.id || "",
    company: editContact?.company || "Your Company",
    name: editContact?.name || "",
    email: editContact?.email || "",
    phone: editContact?.phone || "",
    address: editContact?.address || "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate company name
    if (!formData.company.trim()) {
      toast({
        title: "Error",
        description: "Company name is required",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const docRef = await addDoc(collection(db, "contacts"), formData)

      toast({
        title: "Contact Added",
        description: "The contact has been added successfully",
      })

      onContactAdded({ id: docRef.id, ...formData })

      // Reset form
      setFormData({
        id: "",
        name: "",
        email: "",
        phone: "",
        company: "Your Company", // Reset to default
        address: "",
      })
    } catch (error) {
      console.error("Error adding contact:", error)
      toast({
        title: "Error",
        description: "Failed to add contact. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editContact ? "Edit Contact" : "Add New Contact"}</DialogTitle>
            <DialogDescription>
              Fill in the details to {editContact ? "update" : "add a new"} contact to your system.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="company">
                Company Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="company"
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                required
                className="border-blue-200 focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address (Optional)</Label>
              <Textarea id="address" name="address" value={formData.address} onChange={handleInputChange} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {editContact ? "Updating" : "Adding"}
                </>
              ) : editContact ? (
                "Update Contact"
              ) : (
                "Add Contact"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
