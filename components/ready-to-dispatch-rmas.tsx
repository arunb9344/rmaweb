"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { collection, getDocs, doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { sendRMADeliveredEmail, sendRMAReadyEmail } from "@/lib/email"
import { Search, Loader2, RefreshCw, Send } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import type { Product } from "@/types/Product" // Import Product type
import type { RMA } from "@/types/RMA" // Import RMA type

export function ReadyToDispatchRMAs() {
  const [rmas, setRmas] = useState<RMA[]>([])
  const [filteredRmas, setFilteredRmas] = useState<RMA[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({})
  const [otpErrors, setOtpErrors] = useState<Record<string, string>>({})
  const [loadingRmas, setLoadingRmas] = useState<Record<string, boolean>>({})
  const [resendingOtp, setResendingOtp] = useState<Record<string, boolean>>({})
  const [requireOtp, setRequireOtp] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Record<string, Record<string, boolean>>>({})

  const fetchRMAs = async () => {
    setIsRefreshing(true)
    try {
      // First get settings
      const settingsDoc = await getDoc(doc(db, "settings", "general"))
      if (settingsDoc.exists()) {
        console.log("Settings found:", settingsDoc.data())
        setRequireOtp(settingsDoc.data().requireOtp ?? true)
      } else {
        // Try to get settings from collection
        const settingsCollection = collection(db, "settings")
        const settingsSnapshot = await getDocs(settingsCollection)

        if (!settingsSnapshot.empty) {
          const firstSettingsDoc = settingsSnapshot.docs[0]
          console.log("Settings found from collection:", firstSettingsDoc.data())
          setRequireOtp(firstSettingsDoc.data().requireOtp ?? true)
        } else {
          console.log("No settings found, defaulting to requireOtp = true")
          setRequireOtp(true)
        }
      }

      // Get all RMAs
      const rmaCollection = collection(db, "rmas")
      const rmaSnapshot = await getDocs(rmaCollection)

      // Filter RMAs that have at least one product with "ready" status
      const rmaList = rmaSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((rma: any) => {
          // Check if this is a multi-product RMA
          if (Array.isArray(rma.products)) {
            // Include if any product has "ready" status
            return rma.products.some((product: any) => product.status === "ready")
          } else {
            // Legacy single-product RMA
            return rma.status === "ready"
          }
        }) as RMA[]

      // Initialize OTP inputs and selected products state
      const initialOtps: Record<string, string> = {}
      const initialSelectedProducts: Record<string, Record<string, boolean>> = {}

      rmaList.forEach((rma) => {
        initialSelectedProducts[rma.id] = {}

        if (Array.isArray(rma.products)) {
          rma.products.forEach((product) => {
            if (product.status === "ready") {
              initialOtps[`${rma.id}-${product.id}`] = ""
              initialSelectedProducts[rma.id][product.id] = false
            }
          })
        }
      })

      setOtpInputs(initialOtps)
      setOtpErrors({})
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
      if (product.status === "ready") {
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

    const readyProducts = rma.products.filter((p) => p.status === "ready")
    if (readyProducts.length === 0) return false

    return readyProducts.every((product) => selectedProducts[rmaId]?.[product.id])
  }

  const isAnyProductSelected = (rmaId: string) => {
    return Object.values(selectedProducts[rmaId] || {}).some((selected) => selected)
  }

  const handleOtpChange = (rmaId: string, productId: string, value: string) => {
    setOtpInputs((prev) => ({ ...prev, [`${rmaId}-${productId}`]: value }))
    // Clear error when user types
    if (otpErrors[`${rmaId}-${productId}`]) {
      setOtpErrors((prev) => ({ ...prev, [`${rmaId}-${productId}`]: "" }))
    }
  }

  const handleResendOtp = async (rmaId: string, productId: string) => {
    setResendingOtp((prev) => ({ ...prev, [`${rmaId}-${productId}`]: true }))

    try {
      const rmaRef = doc(db, "rmas", rmaId)
      const rmaSnap = await getDoc(rmaRef)

      if (!rmaSnap.exists()) {
        throw new Error("RMA not found")
      }

      const rmaData = rmaSnap.data()
      const products = rmaData.products || []

      // Find the product
      const productIndex = products.findIndex((p: any) => p.id === productId)
      if (productIndex === -1) {
        throw new Error("Product not found")
      }

      // Generate a new 6-digit OTP
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString()

      // Update the product with the new OTP
      products[productIndex].otp = newOtp

      // Update the RMA
      await updateDoc(rmaRef, {
        products: products,
        updatedAt: serverTimestamp(),
      })

      // Find the RMA and product in our state
      const rma = rmas.find((r) => r.id === rmaId)

      if (rma) {
        // Send email with the new OTP for all ready products
        // This ensures all products with their OTPs are included in the email
        await sendRMAReadyEmail({
          to: rma.contactEmail,
          name: rma.contactName,
          rmaId: rmaId,
          productDetails: "Multiple Products",
          otp: newOtp, // This is just for backward compatibility
          allFields: {
            ...rma,
            // Include all products that are ready
            products: rma.products.filter((p) => p.status === "ready"),
          },
        })
      }

      toast({
        title: "OTP Resent",
        description: "A new OTP has been sent to the customer's email.",
      })

      // Update the local RMA data with the new OTP
      setRmas((prev) =>
        prev.map((r) =>
          r.id === rmaId
            ? {
                ...r,
                products: r.products.map((p) => (p.id === productId ? { ...p, otp: newOtp } : p)),
              }
            : r,
        ),
      )
    } catch (error) {
      console.error("Error resending OTP:", error)
      toast({
        title: "Error",
        description: "Failed to resend OTP. Please try again.",
        variant: "destructive",
      })
    } finally {
      setResendingOtp((prev) => ({ ...prev, [`${rmaId}-${productId}`]: false }))
    }
  }

  const validateOtps = (rmaId: string) => {
    const rma = rmas.find((r) => r.id === rmaId)
    if (!rma) return false

    let isValid = true
    let hasError = false

    // Check each selected product
    rma.products.forEach((product: Product) => {
      // Declare product type here
      if (product.status === "ready" && selectedProducts[rmaId]?.[product.id]) {
        const enteredOtp = otpInputs[`${rmaId}-${product.id}`] || ""

        if (requireOtp) {
          if (!enteredOtp) {
            setOtpErrors((prev) => ({
              ...prev,
              [`${rmaId}-${product.id}`]: "OTP is required",
            }))
            isValid = false
            hasError = true
          } else if (enteredOtp !== product.otp) {
            setOtpErrors((prev) => ({
              ...prev,
              [`${rmaId}-${product.id}`]: "Incorrect OTP",
            }))
            isValid = false
            hasError = true
          }
        }
      }
    })

    if (hasError) {
      toast({
        title: requireOtp ? "Invalid OTP" : "Error",
        description: requireOtp ? "Please enter the correct OTP for all selected products" : "An error occurred",
        variant: "destructive",
      })
    }

    return isValid
  }

  const handleMarkAsDelivered = async (rmaId: string) => {
    if (!isAnyProductSelected(rmaId)) {
      toast({
        title: "No Products Selected",
        description: "Please select at least one product to mark as delivered",
        variant: "destructive",
      })
      return
    }

    // Validate OTPs first
    if (!validateOtps(rmaId)) {
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

      // Find the RMA in the list
      const rma = rmas.find((r) => r.id === rmaId)
      if (!rma) {
        throw new Error("RMA not found in state")
      }

      // Update only selected products' status
      const updatedProducts = products.map((product: any) => {
        if (selectedProducts[rmaId]?.[product.id]) {
          return {
            ...product,
            status: "delivered",
            isDelivered: true,
            deliveredAt: new Date(),
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
      } else if (statuses.some((s: string) => s === "ready")) {
        overallStatus = "ready"
      } else if (statuses.some((s: string) => s === "in_service_centre")) {
        overallStatus = "in_service_centre"
      }

      // Update the RMA
      await updateDoc(rmaRef, {
        products: updatedProducts,
        status: overallStatus,
        updatedAt: serverTimestamp(),
      })

      // Get the selected products for the email
      const selectedProductsList = rma.products.filter((product) => selectedProducts[rmaId]?.[product.id])

      // Send email notification for selected products
      await sendRMADeliveredEmail({
        to: rma.contactEmail,
        name: rma.contactName,
        rmaId: rmaId,
        productDetails: "Multiple Products",
        allFields: {
          ...rma,
          // Only include the products that were just marked as delivered
          products: selectedProductsList.map((p) => ({ ...p, status: "delivered" })),
        },
      })

      toast({
        title: "Status Updated",
        description: "Selected products marked as delivered and customer has been notified",
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
        <div className="text-center py-8 text-muted-foreground">No RMAs ready to dispatch.</div>
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
                    <Button
                      size="sm"
                      onClick={() => handleMarkAsDelivered(rma.id)}
                      disabled={loadingRmas[rma.id] || !isAnyProductSelected(rma.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {loadingRmas[rma.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark as Delivered"}
                    </Button>
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
                          <th className="px-4 py-2 text-left text-sm font-medium">OTP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {rma.products.map(
                          (
                            product: Product, // Declare product type here
                          ) =>
                            product.status === "ready" && (
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
                                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300">
                                    Ready to Dispatch
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {requireOtp ? (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <Input
                                          value={otpInputs[`${rma.id}-${product.id}`] || ""}
                                          onChange={(e) => handleOtpChange(rma.id, product.id, e.target.value)}
                                          placeholder="Enter OTP"
                                          className={`w-24 ${otpErrors[`${rma.id}-${product.id}`] ? "border-red-500" : "border-blue-200"}`}
                                          required
                                        />
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleResendOtp(rma.id, product.id)}
                                          disabled={resendingOtp[`${rma.id}-${product.id}`]}
                                          className="h-8 px-2"
                                        >
                                          {resendingOtp[`${rma.id}-${product.id}`] ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <Send className="h-3 w-3" />
                                          )}
                                        </Button>
                                      </div>
                                      {otpErrors[`${rma.id}-${product.id}`] && (
                                        <p className="text-xs text-red-500">{otpErrors[`${rma.id}-${product.id}`]}</p>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">Not Required</span>
                                  )}
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
