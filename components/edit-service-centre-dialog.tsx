"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Loader2 } from "lucide-react"

interface ServiceCentre {
  id: string
  name: string
  address: string
  contactPerson: string
  phone: string
  email: string
  createdAt: any
}

interface EditServiceCentreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceCentre: ServiceCentre | null
  onServiceCentreUpdated?: (serviceCentre: ServiceCentre) => void
}

export function EditServiceCentreDialog({
  open,
  onOpenChange,
  serviceCentre,
  onServiceCentreUpdated,
}: EditServiceCentreDialogProps) {
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [contactPerson, setContactPerson] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Populate form when serviceCentre changes
  useEffect(() => {
    if (serviceCentre) {
      setName(serviceCentre.name || "")
      setAddress(serviceCentre.address || "")
      setContactPerson(serviceCentre.contactPerson || "")
      setPhone(serviceCentre.phone || "")
      setEmail(serviceCentre.email || "")
    }
  }, [serviceCentre])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!serviceCentre) return

    if (!name) {
      toast({
        title: "Error",
        description: "Service centre name is required",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const serviceCentreData = {
        name,
        address,
        contactPerson,
        phone,
        email,
        updatedAt: new Date(),
      }

      await updateDoc(doc(db, "serviceCentres", serviceCentre.id), serviceCentreData)

      toast({
        title: "Success",
        description: "Service centre updated successfully",
      })

      // Close dialog
      onOpenChange(false)

      // Notify parent component
      if (onServiceCentreUpdated) {
        onServiceCentreUpdated({
          ...serviceCentre,
          ...serviceCentreData,
        })
      }
    } catch (error) {
      console.error("Error updating service centre:", error)
      toast({
        title: "Error",
        description: "Failed to update service centre",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset form
    setName("")
    setAddress("")
    setContactPerson("")
    setPhone("")
    setEmail("")
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Service Centre</DialogTitle>
          <DialogDescription>Update the service centre information.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Service Centre Name"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-address">Address</Label>
              <Textarea
                id="edit-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full Address"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-contactPerson">Contact Person</Label>
              <Input
                id="edit-contactPerson"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Contact Person Name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone Number"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Service Centre"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
