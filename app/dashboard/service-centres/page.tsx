"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { ServiceCentreDialog } from "@/components/service-centre-dialog"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog"

interface ServiceCentre {
  id: string
  name: string
  address: string
  contactPerson: string
  phone: string
  email: string
  createdAt: any
}

export default function ServiceCentresPage() {
  const [serviceCentres, setServiceCentres] = useState<ServiceCentre[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedServiceCentre, setSelectedServiceCentre] = useState<ServiceCentre | null>(null)

  const fetchServiceCentres = async () => {
    setIsLoading(true)
    try {
      const serviceCentresCollection = collection(db, "serviceCentres")
      const snapshot = await getDocs(serviceCentresCollection)

      const centres = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ServiceCentre[]

      setServiceCentres(centres)
    } catch (error) {
      console.error("Error fetching service centres:", error)
      toast({
        title: "Error",
        description: "Failed to load service centres",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchServiceCentres()
  }, [])

  const handleServiceCentreSaved = (serviceCentre: ServiceCentre) => {
    setServiceCentres((prev) => [...prev, serviceCentre])
    setIsAddDialogOpen(false)
  }

  const handleDeleteClick = (serviceCentre: ServiceCentre) => {
    setSelectedServiceCentre(serviceCentre)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedServiceCentre) return

    try {
      await deleteDoc(doc(db, "serviceCentres", selectedServiceCentre.id))

      toast({
        title: "Success",
        description: "Service centre deleted successfully",
      })

      // Remove from state
      setServiceCentres((prev) => prev.filter((sc) => sc.id !== selectedServiceCentre.id))
    } catch (error) {
      console.error("Error deleting service centre:", error)
      toast({
        title: "Error",
        description: "Failed to delete service centre",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setSelectedServiceCentre(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Service Centres</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service Centre
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {serviceCentres.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              No service centres found. Add one to get started.
            </div>
          ) : (
            serviceCentres.map((centre) => (
              <Card key={centre.id}>
                <CardHeader className="pb-2">
                  <CardTitle>{centre.name}</CardTitle>
                  <CardDescription>{centre.contactPerson && `Contact: ${centre.contactPerson}`}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {centre.address && <p className="text-muted-foreground">{centre.address}</p>}
                    <div className="flex flex-col gap-1">
                      {centre.phone && <p>Phone: {centre.phone}</p>}
                      {centre.email && <p>Email: {centre.email}</p>}
                    </div>
                    <div className="pt-2 flex justify-end">
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(centre)}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <ServiceCentreDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onServiceCentreSaved={handleServiceCentreSaved}
      />

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Service Centre"
        description={`Are you sure you want to delete ${selectedServiceCentre?.name}? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
