"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { collection, getDocs, doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { sendRMAReadyEmail } from "@/lib/email"
import { Search, Loader2, RefreshCw } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

interface Product {
  id: string
  brand: string
  modelNumber: string
  serialNumber: string
  problemsReported: string
  status: string
  remark?: string
  customFields?: Record<string, any>
  serviceCentreId?: string
  serviceCentreName?: string
  serviceCentre?: {
    id: string
    name: string
  }
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

export function InServiceCentreRMAs() {
  const [rmas, setRmas] = useState<RMA[]>([])
  const [filteredRmas, setFilteredRmas] = useState<RMA[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [remarks, setRemarks] = useState<Record<string, string>>({})
  const [loadingRmas, setLoadingRmas] = useState<Record<string, boolean>>({})
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Record<string, Record<string, boolean>>>({})

  const fetchRMAs = async () => {
    setIsRefreshing(true)
    try {
      // Get all RMAs
      const rmaCollection = collection(db, "rmas")
      const rmaSnapshot = await getDocs(rmaCollection)

      // Filter RMAs that have at least one product with "in_service_centre" status
      const rmaList = rmaSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((rma: any) => {
          // Check if this is a multi-product RMA
          if (Array.isArray(rma.products)) {
            // Include if any product has "in_service_centre" status
            return rma.products.some((product: any) => product.status === "in_service_centre")
          } else {
            // Legacy single-product RMA
            return rma.status === "in_service_centre"
          }
        }) as RMA[]

      // Initialize remarks and selected products state
      const initialRemarks: Record<string, string> = {}
      const initialSelectedProducts: Record<string, Record<string, boolean>> = {}

      rmaList.forEach((rma) => {
        initialSelectedProducts[rma.id] = {}

        if (Array.isArray(rma.products)) {
          rma.products.forEach((product) => {
            if (product.status === "in_service_centre") {
              initialRemarks[`${rma.id}-${product.id}`] = product.remark || ""
              initialSelectedProducts[rma.id][product.id] = false
            }
          })
        }
      })

      setRemarks(initialRemarks)
      setSelectedProducts(initialSelectedProducts)
      setRmas(rmaList)
      setFilteredRmas(rmaList)
    } catch (error) {
      console.error("Error fetching RMAs:", error)
      toast({
        title: "Error",
        description: "Failed to load RMAs. Please refresh the page.",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchRMAs()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const filtered = rmas.filter(
        (rma) =>
          rma.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          rma.contactCompany.toLowerCase().includes(searchQuery.toLowerCase()) ||
          rma.products.some(
            (product) =>
              product.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
              product.modelNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
              product.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
      )
      setFilteredRmas(filtered)
    } else {
      setFilteredRmas(rmas)
    }
  }, [searchQuery, rmas])

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
      if (product.status === "in_service_centre") {
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

    const serviceProducts = rma.products.filter((p) => p.status === "in_service_centre")
    if (serviceProducts.length === 0) return false

    return serviceProducts.every((product) => selectedProducts[rmaId]?.[product.id])
  }

  const isAnyProductSelected = (rmaId: string) => {
    return Object.values(selectedProducts[rmaId] || {}).some((selected) => selected)
  }

  const handleRemarkChange = (rmaId: string, productId: string, value: string) => {
    setRemarks((prev) => ({ ...prev, [`${rmaId}-${productId}`]: value }))
  }

  const handleSaveRemarks = async (rmaId: string) => {
    const rma = rmas.find((r) => r.id === rmaId)
    if (!rma) {
      toast({
        title: "Error",
        description: "RMA not found",
        variant: "destructive",
      })
      return
    }

    if (!isAnyProductSelected(rmaId)) {
      toast({
        title: "No Products Selected",
        description: "Please select at least one product to save remarks",
        variant: "destructive",
      })
      return
    }

    setLoadingRmas((prev) => ({ ...prev, [rmaId]: true }))

    try {
      const rmaRef = doc(db, "rmas", rmaId)
      const rmaSnap = await getDoc(rmaRef)

      if (!rmaSnap.exists()) {
        throw new Error("RMA not found")
      }

      const rmaData = rmaSnap.data()
      const products = rmaData.products || []

      // Update only selected products' remarks
      const updatedProducts = products.map((product: any) => {
        if (selectedProducts[rmaId]?.[product.id]) {
          return {
            ...product,
            remark: remarks[`${rmaId}-${product.id}`] || "",
          }
        }
        return product
      })

      // Update the RMA
      await updateDoc(rmaRef, {
        products: updatedProducts,
        updatedAt: serverTimestamp(),
      })

      toast({
        title: "Remarks Saved",
        description: "The remarks have been saved successfully",
      })
    } catch (error) {
      console.error("Error updating RMA:", error)
      toast({
        title: "Error",
        description: "Failed to save remarks. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingRmas((prev) => ({ ...prev, [rmaId]: false }))
    }
  }

  const handleMarkAsReady = async (rmaId: string) => {
    const rma = rmas.find((r) => r.id === rmaId)
    if (!rma) {
      toast({
        title: "Error",
        description: "RMA not found",
        variant: "destructive",
      })
      return
    }

    if (!isAnyProductSelected(rmaId)) {
      toast({
        title: "No Products Selected",
        description: "Please select at least one product to mark as ready",
        variant: "destructive",
      })
      return
    }

    setLoadingRmas((prev) => ({ ...prev, [rmaId]: true }))

    try {
      const rmaRef = doc(db, "rmas", rmaId)
      const rmaSnap = await getDoc(rmaRef)

      if (!rmaSnap.exists()) {
        throw new Error("RMA not found")
      }

      const rmaData = rmaSnap.data()
      const products = rmaData.products || []

      // Generate a random 6-digit OTP (same for all products in this batch)
      const otp = Math.floor(100000 + Math.random() * 900000).toString()

      // Update only selected products' status and remarks
      const updatedProducts = products.map((product: any) => {
        if (selectedProducts[rmaId]?.[product.id]) {
          // Preserve the service centre information
          const serviceCentreInfo = {
            serviceCentreId: product.serviceCentreId,
            serviceCentreName: product.serviceCentreName,
            serviceCentre:
              product.serviceCentre ||
              (product.serviceCentreName
                ? {
                    id: product.serviceCentreId,
                    name: product.serviceCentreName,
                  }
                : undefined),
          }

          return {
            ...product,
            ...serviceCentreInfo,
            status: "ready",
            isReady: true,
            remark: remarks[`${rmaId}-${product.id}`] || "",
            otp: otp,
            updatedAt: new Date(),
          }
        }
        return product
      })

      // Determine overall RMA status based on products
      let overallStatus = "processing"
      const statuses = updatedProducts.map((p: any) => p.status)

      if (statuses.every((s: string) => s === "delivered")) {
        overallStatus = "delivered"
      } else if (statuses.every((s: string) => s === "ready" || s === "delivered")) {
        overallStatus = "ready"
      } else if (statuses.some((s: string) => s === "ready")) {
        overallStatus = "in_service_centre"
      }

      // Update the RMA
      await updateDoc(rmaRef, {
        products: updatedProducts,
        status: overallStatus,
        updatedAt: serverTimestamp(),
      })

      // Create a copy of the RMA with updated products for the email
      const updatedRma = {
        ...rma,
        products: updatedProducts.map((p: any) => ({
          ...p,
          // Ensure the product has the correct status for filtering in the email
          status: selectedProducts[rmaId]?.[p.id] ? "ready" : p.status,
        })),
      }

      // Send email notification with OTP for selected products
      const selectedProductDetails = rma.products
        .filter((product) => selectedProducts[rmaId]?.[product.id])
        .map((product) => `${product.brand} ${product.modelNumber}`)
        .join(", ")

      // Send email with the updated RMA data that includes the newly ready products
      await sendRMAReadyEmail({
        to: rma.contactEmail,
        name: rma.contactName,
        rmaId: rmaId,
        productDetails: selectedProductDetails,
        otp: otp,
        allFields: updatedRma,
      })

      toast({
        title: "Status Updated",
        description: "Selected products marked as ready and customer has been notified",
      })

      // Refresh the whole page
      window.location.reload()
    } catch (error) {
      console.error("Error updating RMA:", error)
      toast({
        title: "Error",
        description: "Failed to update RMA. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingRmas((prev) => ({ ...prev, [rmaId]: false }))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search RMAs..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchRMAs} disabled={isRefreshing} className="ml-2">
          {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
          Refresh
        </Button>
      </div>

      {filteredRmas.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No RMAs in service centre.</div>
      ) : (
        <div className="space-y-4">
          {filteredRmas.map((rma) => (
            <div key={rma.id} className="border rounded-md overflow-hidden">
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
                </div>
              </div>

              <div>
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
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSaveRemarks(rma.id)}
                        disabled={loadingRmas[rma.id] || !isAnyProductSelected(rma.id)}
                      >
                        {loadingRmas[rma.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Remarks"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleMarkAsReady(rma.id)}
                        disabled={loadingRmas[rma.id] || !isAnyProductSelected(rma.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {loadingRmas[rma.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark as Ready"}
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
                          <th className="px-4 py-2 text-left text-sm font-medium">Status</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {rma.products.map(
                          (product) =>
                            product.status === "in_service_centre" && (
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
                                  className="px-4 py-3 text-sm max-w-[150px] truncate"
                                  title={product.problemsReported}
                                >
                                  {product.problemsReported}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {product.serviceCentre?.name || product.serviceCentreName ? (
                                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300">
                                      {product.serviceCentre?.name || product.serviceCentreName}
                                    </Badge>
                                  ) : (
                                    "Not specified"
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-300">
                                    In Service Centre
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <Textarea
                                    value={remarks[`${rma.id}-${product.id}`] || ""}
                                    onChange={(e) => handleRemarkChange(rma.id, product.id, e.target.value)}
                                    className="min-h-[80px] w-full"
                                    placeholder="Add service remarks here..."
                                  />
                                </td>
                              </tr>
                            ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
