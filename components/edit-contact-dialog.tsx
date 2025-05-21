"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Loader2 } from "lucide-react"

interface Contact {
  id: string
  name?: string
  email: string
  phone: string
  company: string
  address?: string
}

interface EditContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContactUpdated: () => void
  contact: Contact | null
}

export function EditContactDialog({ open, onOpenChange, onContactUpdated, contact }: EditContactDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<Contact>({
    id: "",
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
  })

  useEffect(() => {
    if (contact) {
      setFormData({
        id: contact.id,
        name: contact.name || "",
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
        address: contact.address || "",
      })
    }
  }, [contact])

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
      const contactRef = doc(db, "contacts", formData.id)

      // Remove id from the data to be updated
      const { id, ...updateData } = formData

      await updateDoc(contactRef, updateData)

      toast({
        title: "Contact Updated",
        description: "The contact has been updated successfully",
      })

      onContactUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error("Error updating contact:", error)
      toast({
        title: "Error",
        description: "Failed to update contact. Please try again.",
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
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>Update the contact information</DialogDescription>
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating
                </>
              ) : (
                "Update Contact"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
