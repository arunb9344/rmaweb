"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, doc, updateDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { Loader2, ArrowRight, RefreshCw, ChevronDown, ChevronUp, Plus } from "lucide-react"
import { RMAActionsMenu } from "@/components/rma-actions-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ServiceCentreDialog } from "@/components/service-centre-dialog"

interface ServiceCentre {
  id: string
  name: string
  address: string
  contactPerson: string
  phone: string
  email: string
}

interface Product {
  id: string
  brand: string
  modelNumber: string
  serialNumber: string
  problemsReported: string
  status: string
  serviceCentreId?: string
  serviceCentreName?: string
  customFields?: Record<string, any>
}

interface RMA {
  id: string
  contactName: string
  contactEmail: string
  contactCompany: string
  contactPhone: string
  createdAt: any
  products: Product[]
  comments: string
  status: string
}

export function ProcessingRMAs() {
  const [rmas, setRmas] = useState<RMA[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState<Record<string, Record<string, boolean>>>({})
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [expandedRmas, setExpandedRmas] = useState<Record<string, boolean>>({})
  const [selectedProducts, setSelectedProducts] = useState<Record<string, Record<string, boolean>>>({})
  const [serviceCentres, setServiceCentres] = useState<ServiceCentre[]>([])
  const [selectedServiceCentres, setSelectedServiceCentres] = useState<Record<string, Record<string, string>>>({})
  const [isServiceCentreDialogOpen, setIsServiceCentreDialogOpen] = useState(false)

  const fetchServiceCentres = async () => {
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
    }
  }

  const fetchRMAs = async () => {
    setIsRefreshing(true)
    try {
      // Get all RMAs
      const rmaCollection = collection(db, "rmas")
      const rmaSnapshot = await getDocs(rmaCollection)

      // Filter RMAs that have at least one product with "processing" status
      const rmaList = rmaSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((rma: any) => {
          // Check if this is a multi-product RMA
          if (Array.isArray(rma.products)) {
            // Include if any product has "processing" status
            return rma.products.some((product: any) => product.status === "processing")
          } else {
            // Legacy single-product RMA
            return rma.status === "processing"
          }
        }) as RMA[]

      // Initialize selected products state
      const initialSelectedProducts: Record<string, Record<string, boolean>> = {}
      const initialSelectedServiceCentres: Record<string, Record<string, string>> = {}

      rmaList.forEach((rma) => {
        initialSelectedProducts[rma.id] = {}
        initialSelectedServiceCentres[rma.id] = {}

        if (Array.isArray(rma.products)) {
          rma.products.forEach((product) => {
            if (product.status === "processing") {
              initialSelectedProducts[rma.id][product.id] = false

              // Initialize with first service centre if available
              if (serviceCentres.length > 0) {
                initialSelectedServiceCentres[rma.id][product.id] = serviceCentres[0].id
              }
            }
          })
        }
      })

      setSelectedProducts(initialSelectedProducts)
      setSelectedServiceCentres(initialSelectedServiceCentres)
      setRmas(rmaList)
    } catch (error) {
      console.error("Error fetching RMAs:", error)
      toast({
        title: "Error",
        description: "Failed to load material received RMAs",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    const initialize = async () => {
      await fetchServiceCentres()
      await fetchRMAs()
    }

    initialize()
  }, [])

  const toggleRmaExpanded = (rmaId: string) => {
    setExpandedRmas((prev) => ({
      ...prev,
      [rmaId]: !prev[rmaId],
    }))
  }

  const toggleProductSelection = (rmaId: string, productId: string) => {
    setSelectedProducts((prev) => ({
      ...prev,
      [rmaId]: {
        ...prev[rmaId],
        [productId]: !prev[rmaId]?.[productId],
      },
    }))
  }

  const selectAllProducts = (rmaId: string, selected: boolean) => {
    const rma = rmas.find((r) => r.id === rmaId)
    if (!rma) return

    const newSelection: Record<string, boolean> = {}
    rma.products.forEach((product) => {
      if (product.status === "processing") {
        newSelection[product.id] = selected
      }
    })

    setSelectedProducts((prev) => ({
      ...prev,
      [rmaId]: newSelection,
    }))
  }

  const areAllProductsSelected = (rmaId: string) => {
    const rma = rmas.find((r) => r.id === rmaId)
    if (!rma) return false

    const processingProducts = rma.products.filter((p) => p.status === "processing")
    if (processingProducts.length === 0) return false

    return processingProducts.every((product) => selectedProducts[rmaId]?.[product.id])
  }

  const isAnyProductSelected = (rmaId: string) => {
    return Object.values(selectedProducts[rmaId] || {}).some((selected) => selected)
  }

  const handleServiceCentreChange = (rmaId: string, productId: string, centreId: string) => {
    setSelectedServiceCentres((prev) => ({
      ...prev,
      [rmaId]: {
        ...prev[rmaId],
        [productId]: centreId,
      },
    }))
  }

  const handleServiceCentreSaved = (serviceCentre: ServiceCentre) => {
    setServiceCentres((prev) => [...prev, serviceCentre])
    setIsServiceCentreDialogOpen(false)
  }

  const handleSendToServiceCentre = async (rmaId: string, productId: string) => {
    // Check if a service centre is selected for this product
    if (!selectedServiceCentres[rmaId]?.[productId]) {
      toast({
        title: "No Service Centre Selected",
        description: "Please select a service centre for this product",
        variant: "destructive",
      })
      return
    }

    // Set processing state for this specific product
    setProcessingIds((prev) => ({
      ...prev,
      [rmaId]: {
        ...(prev[rmaId] || {}),
        [productId]: true,
      },
    }))

    try {
      const rmaRef = doc(db, "rmas", rmaId)
      const rmaSnap = await getDoc(rmaRef)

      if (!rmaSnap.exists()) {
        throw new Error("RMA not found")
      }

      const rmaData = rmaSnap.data()
      const products = rmaData.products || []

      // Get the selected service centre details
      const selectedCentreId = selectedServiceCentres[rmaId][productId]
      const selectedCentre = serviceCentres.find((centre) => centre.id === selectedCentreId)

      if (!selectedCentre) {
        throw new Error("Selected service centre not found")
      }

      // Update only the specific product's status
      const updatedProducts = products.map((product: any) => {
        if (product.id === productId) {
          return {
            ...product,
            status: "in_service_centre",
            serviceCentreId: selectedCentre.id,
            serviceCentreName: selectedCentre.name,
            serviceCentre: {
              id: selectedCentre.id,
              name: selectedCentre.name,
            },
          }
        }
        return product
      })

      // Determine overall RMA status based on products
      let overallStatus = "processing"
      const statuses = updatedProducts.map((p: any) => p.status)

      if (statuses.every((s: string) => s === "delivered")) {
        overallStatus = "delivered"
      } else if (statuses.every((s: string) => s === "in_service_centre" || s === "ready" || s === "delivered")) {
        overallStatus = "in_service_centre"
      } else if (statuses.some((s: string) => s === "in_service_centre" || s === "ready")) {
        overallStatus = "in_service_centre"
      }

      // Update the RMA
      await updateDoc(rmaRef, {
        products: updatedProducts,
        status: overallStatus,
        updatedAt: new Date(),
      })

      toast({
        title: "Product Sent",
        description: `Product has been sent to ${selectedCentre.name}`,
      })

      // Refresh the page
      window.location.reload()
    } catch (error) {
      console.error("Error updating RMA:", error)
      toast({
        title: "Error",
        description: "Failed to update product status",
        variant: "destructive",
      })
    } finally {
      setProcessingIds((prev) => ({
        ...prev,
        [rmaId]: {
          ...(prev[rmaId] || {}),
          [productId]: false,
        },
      }))
    }
  }

  const handleSendSelectedToServiceCentre = async (rmaId: string) => {
    // Check if any products are selected
    if (!isAnyProductSelected(rmaId)) {
      toast({
        title: "No Products Selected",
        description: "Please select at least one product to send to service centre",
        variant: "destructive",
      })
      return
    }

    // Check if all selected products have a service centre selected
    const selectedProductIds = Object.entries(selectedProducts[rmaId] || {})
      .filter(([_, selected]) => selected)
      .map(([productId]) => productId)

    const missingServiceCentre = selectedProductIds.some((productId) => !selectedServiceCentres[rmaId]?.[productId])

    if (missingServiceCentre) {
      toast({
        title: "Missing Service Centre",
        description: "Please select a service centre for all selected products",
        variant: "destructive",
      })
      return
    }

    // Set processing state for the RMA
    setProcessingIds((prev) => ({
      ...prev,
      [rmaId]: selectedProductIds.reduce(
        (acc, productId) => {
          acc[productId] = true
          return acc
        },
        {} as Record<string, boolean>,
      ),
    }))

    try {
      const rmaRef = doc(db, "rmas", rmaId)
      const rmaSnap = await getDoc(rmaRef)

      if (!rmaSnap.exists()) {
        throw new Error("RMA not found")
      }

      const rmaData = rmaSnap.data()
      const products = rmaData.products || []

      // Update selected products' status with their respective service centres
      const updatedProducts = products.map((product: any) => {
        if (selectedProducts[rmaId]?.[product.id]) {
          const selectedCentreId = selectedServiceCentres[rmaId][product.id]
          const selectedCentre = serviceCentres.find((centre) => centre.id === selectedCentreId)

          if (!selectedCentre) {
            throw new Error(`Service centre not found for product ${product.id}`)
          }

          return {
            ...product,
            status: "in_service_centre",
            serviceCentreId: selectedCentre.id,
            serviceCentreName: selectedCentre.name,
            serviceCentre: {
              id: selectedCentre.id,
              name: selectedCentre.name,
            },
          }
        }
        return product
      })

      // Determine overall RMA status based on products
      let overallStatus = "processing"
      const statuses = updatedProducts.map((p: any) => p.status)

      if (statuses.every((s: string) => s === "delivered")) {
        overallStatus = "delivered"
      } else if (statuses.every((s: string) => s === "in_service_centre" || s === "ready" || s === "delivered")) {
        overallStatus = "in_service_centre"
      } else if (statuses.some((s: string) => s === "in_service_centre" || s === "ready")) {
        overallStatus = "in_service_centre"
      }

      // Update the RMA
      await updateDoc(rmaRef, {
        products: updatedProducts,
        status: overallStatus,
        updatedAt: new Date(),
      })

      toast({
        title: "Products Sent",
        description: "Selected products have been sent to their respective service centres",
      })

      // Refresh the page
      window.location.reload()
    } catch (error) {
      console.error("Error updating RMA:", error)
      toast({
        title: "Error",
        description: "Failed to update product status",
        variant: "destructive",
      })
    } finally {
      setProcessingIds((prev) => ({
        ...prev,
        [rmaId]: {},
      }))
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={fetchRMAs} disabled={isRefreshing}>
          {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
          Refresh
        </Button>
      </div>

      {rmas.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No RMAs currently in material received status</div>
      ) : (
        <div className="space-y-4">
          {rmas.map((rma) => (
            <Collapsible
              key={rma.id}
              open={expandedRmas[rma.id]}
              onOpenChange={() => toggleRmaExpanded(rma.id)}
              className="border rounded-md overflow-hidden"
            >
              <div className="bg-muted/30 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="font-medium">{rma.contactName || "N/A"}</h3>
                    <p className="text-sm text-muted-foreground">{rma.contactCompany}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {rma.createdAt?.toDate ? new Date(rma.createdAt.toDate()).toLocaleDateString() : "N/A"}
                  </span>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      {expandedRmas[rma.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      <span className="sr-only">Toggle</span>
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>

              <CollapsibleContent>
                <div className="p-4 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`select-all-${rma.id}`}
                        checked={areAllProductsSelected(rma.id)}
                        onCheckedChange={(checked) => selectAllProducts(rma.id, !!checked)}
                      />
                      <label htmlFor={`select-all-${rma.id}`} className="text-sm font-medium">
                        Select All Products
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsServiceCentreDialogOpen(true)}
                        className="h-8"
                        title="Add New Service Centre"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Service Centre
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleSendSelectedToServiceCentre(rma.id)}
                        disabled={!isAnyProductSelected(rma.id)}
                        className="h-8 gap-1 bg-yellow-600 hover:bg-yellow-700"
                      >
                        Send Selected to Service <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>

                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="w-10 px-4 py-2 text-left"></th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Brand</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Model</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Serial Number</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Problem</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Service Centre</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {rma.products.map(
                          (product) =>
                            product.status === "processing" && (
                              <tr key={product.id} className="hover:bg-muted/20">
                                <td className="px-4 py-3">
                                  <Checkbox
                                    checked={selectedProducts[rma.id]?.[product.id] || false}
                                    onCheckedChange={() => toggleProductSelection(rma.id, product.id)}
                                  />
                                </td>
                                <td className="px-4 py-3 text-sm">{product.brand}</td>
                                <td className="px-4 py-3 text-sm">{product.modelNumber}</td>
                                <td className="px-4 py-3 text-sm">{product.serialNumber}</td>
                                <td
                                  className="px-4 py-3 text-sm max-w-[200px] truncate"
                                  title={product.problemsReported}
                                >
                                  {product.problemsReported}
                                </td>
                                <td className="px-4 py-3">
                                  <Select
                                    value={selectedServiceCentres[rma.id]?.[product.id] || ""}
                                    onValueChange={(value) => handleServiceCentreChange(rma.id, product.id, value)}
                                  >
                                    <SelectTrigger className="w-[180px] h-8">
                                      <SelectValue placeholder="Select Service Centre" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {serviceCentres.length === 0 ? (
                                        <div className="py-2 px-2 text-sm text-muted-foreground">
                                          No service centres found
                                        </div>
                                      ) : (
                                        serviceCentres.map((centre) => (
                                          <SelectItem key={centre.id} value={centre.id}>
                                            {centre.name}
                                          </SelectItem>
                                        ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="px-4 py-3">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSendToServiceCentre(rma.id, product.id)}
                                    disabled={
                                      processingIds[rma.id]?.[product.id] ||
                                      !selectedServiceCentres[rma.id]?.[product.id]
                                    }
                                    className="h-8 w-8 p-0"
                                  >
                                    {processingIds[rma.id]?.[product.id] ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <ArrowRight className="h-4 w-4" />
                                    )}
                                  </Button>
                                </td>
                              </tr>
                            ),
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <RMAActionsMenu rmaId={rma.id} status="processing" />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}

      <ServiceCentreDialog
        open={isServiceCentreDialogOpen}
        onOpenChange={setIsServiceCentreDialogOpen}
        onServiceCentreSaved={handleServiceCentreSaved}
      />
    </div>
  )
}
