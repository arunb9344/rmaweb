"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Plus, Trash2, Edit, Phone, Mail, MapPin, User, Search, X } from "lucide-react"
import { ServiceCentreDialog } from "@/components/service-centre-dialog"
import { EditServiceCentreDialog } from "@/components/edit-service-centre-dialog"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface ServiceCentre {
  id: string
  name: string
  address: string
  contactPerson: string
  phone: string
  email: string
  createdAt: any
  updatedAt?: any
}

export default function ServiceCentresPage() {
  const [serviceCentres, setServiceCentres] = useState<ServiceCentre[]>([])
  const [filteredServiceCentres, setFilteredServiceCentres] = useState<ServiceCentre[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
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

      // Sort by creation date (newest first)
      centres.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0)
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0)
        return dateB.getTime() - dateA.getTime()
      })

      setServiceCentres(centres)
      setFilteredServiceCentres(centres)
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

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const filtered = serviceCentres.filter((centre) => {
        return (
          centre.name?.toLowerCase().includes(query) ||
          centre.address?.toLowerCase().includes(query) ||
          centre.contactPerson?.toLowerCase().includes(query) ||
          centre.phone?.toLowerCase().includes(query) ||
          centre.email?.toLowerCase().includes(query)
        )
      })
      setFilteredServiceCentres(filtered)
    } else {
      setFilteredServiceCentres(serviceCentres)
    }
  }, [searchQuery, serviceCentres])

  const handleServiceCentreSaved = (serviceCentre: ServiceCentre) => {
    setServiceCentres((prev) => [serviceCentre, ...prev])
    setIsAddDialogOpen(false)
    toast({
      title: "Success",
      description: "Service centre added successfully",
    })
  }

  const handleServiceCentreUpdated = (updatedServiceCentre: ServiceCentre) => {
    setServiceCentres((prev) =>
      prev.map((centre) => (centre.id === updatedServiceCentre.id ? updatedServiceCentre : centre)),
    )
    setIsEditDialogOpen(false)
    setSelectedServiceCentre(null)
    toast({
      title: "Success",
      description: "Service centre updated successfully",
    })
  }

  const handleEditClick = (serviceCentre: ServiceCentre) => {
    setSelectedServiceCentre(serviceCentre)
    setIsEditDialogOpen(true)
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

  const clearSearch = () => {
    setSearchQuery("")
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A"
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Service Centres</h1>
          <p className="text-muted-foreground">Manage your service centre network</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Service Centre
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search service centres..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Service Centres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{serviceCentres.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Centres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{serviceCentres.length}</div>
            <p className="text-xs text-muted-foreground">All centres are active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Search Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredServiceCentres.length}</div>
            {searchQuery && (
              <p className="text-xs text-muted-foreground">
                {filteredServiceCentres.length} of {serviceCentres.length} centres
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Service Centres Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredServiceCentres.length === 0 ? (
            <div className="col-span-full">
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="text-center">
                    <h3 className="text-lg font-medium mb-2">
                      {searchQuery ? "No service centres found" : "No service centres yet"}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery ? "Try adjusting your search terms" : "Add your first service centre to get started"}
                    </p>
                    {!searchQuery && (
                      <Button onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Service Centre
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            filteredServiceCentres.map((centre) => (
              <Card key={centre.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{centre.name}</CardTitle>
                      <CardDescription className="mt-1">Added {formatDate(centre.createdAt)}</CardDescription>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      Active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Contact Person */}
                  {centre.contactPerson && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{centre.contactPerson}</span>
                    </div>
                  )}

                  {/* Address */}
                  {centre.address && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground line-clamp-2">{centre.address}</span>
                    </div>
                  )}

                  {/* Contact Info */}
                  <div className="space-y-2">
                    {centre.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <a href={`tel:${centre.phone}`} className="text-blue-600 hover:underline truncate">
                          {centre.phone}
                        </a>
                      </div>
                    )}
                    {centre.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <a href={`mailto:${centre.email}`} className="text-blue-600 hover:underline truncate">
                          {centre.email}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" onClick={() => handleEditClick(centre)} className="flex-1">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteClick(centre)}
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Dialogs */}
      <ServiceCentreDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onServiceCentreSaved={handleServiceCentreSaved}
      />

      <EditServiceCentreDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        serviceCentre={selectedServiceCentre}
        onServiceCentreUpdated={handleServiceCentreUpdated}
      />

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Service Centre"
        description={`Are you sure you want to delete "${selectedServiceCentre?.name}"? This action cannot be undone and may affect existing RMAs.`}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
