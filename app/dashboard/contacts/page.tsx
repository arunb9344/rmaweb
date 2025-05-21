"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { PlusCircle, Search, FileSpreadsheet, Pencil, Trash2, MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { ContactDialog } from "@/components/contact-dialog"
import { EditContactDialog } from "@/components/edit-contact-dialog"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog"
import { ImportContactsDialog } from "@/components/import-contacts-dialog"
import { toast } from "@/components/ui/use-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Contact {
  id: string
  name?: string
  email: string
  phone: string
  company: string
  address?: string
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)

  useEffect(() => {
    fetchContacts()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const filtered = contacts.filter(
        (contact) =>
          contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          false ||
          contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          contact.phone.includes(searchQuery) ||
          (contact.company && contact.company.toLowerCase().includes(searchQuery.toLowerCase())),
      )
      setFilteredContacts(filtered)
    } else {
      setFilteredContacts(contacts)
    }
  }, [searchQuery, contacts])

  const fetchContacts = async () => {
    try {
      const contactsCollection = collection(db, "contacts")
      const contactsSnapshot = await getDocs(contactsCollection)
      const contactsList = contactsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Contact[]

      setContacts(contactsList)
      setFilteredContacts(contactsList)
    } catch (error) {
      console.error("Error fetching contacts:", error)
      toast({
        title: "Error",
        description: "Failed to load contacts. Please refresh the page.",
        variant: "destructive",
      })
    }
  }

  const handleContactAdded = (newContact: Contact) => {
    setContacts((prev) => [...prev, newContact])
    setIsDialogOpen(false)
  }

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact)
    setIsEditDialogOpen(true)
  }

  const handleDeleteContact = (contact: Contact) => {
    setSelectedContact(contact)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteContact = async () => {
    if (!selectedContact) return

    try {
      await deleteDoc(doc(db, "contacts", selectedContact.id))

      setContacts((prev) => prev.filter((contact) => contact.id !== selectedContact.id))

      toast({
        title: "Contact Deleted",
        description: "The contact has been deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting contact:", error)
      toast({
        title: "Error",
        description: "Failed to delete contact. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleteDialogOpen(false)
    }
  }

  const handleImportComplete = (count: number) => {
    fetchContacts()
    toast({
      title: "Import Complete",
      description: `Successfully imported ${count} contacts.`,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Contact Management</h1>
        <div className="flex gap-2">
          <Button className="gap-2" variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <FileSpreadsheet className="h-4 w-4" />
            Import Contacts
          </Button>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => setIsDialogOpen(true)}>
            <PlusCircle className="h-4 w-4" />
            Add New Contact
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
          <CardTitle>Contacts</CardTitle>
          <CardDescription>Manage your customer contacts for RMA processing</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.length > 0 ? (
                  filteredContacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium text-blue-700">{contact.company || "Your Company"}</TableCell>
                      <TableCell>{contact.name || "-"}</TableCell>
                      <TableCell>{contact.email}</TableCell>
                      <TableCell>{contact.phone}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/dashboard/raise-rma?contactId=${contact.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-blue-200 hover:bg-blue-50 text-blue-700"
                            >
                              Raise RMA
                            </Button>
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditContact(contact)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteContact(contact)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No contacts found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ContactDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} onContactAdded={handleContactAdded} />
      <EditContactDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onContactUpdated={fetchContacts}
        contact={selectedContact}
      />
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDeleteContact}
        title="Delete Contact"
        description="Are you sure you want to delete this contact? This action cannot be undone."
      />
      <ImportContactsDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImportComplete={handleImportComplete}
      />
    </div>
  )
}
