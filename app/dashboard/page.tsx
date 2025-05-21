"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { collection, getDocs, doc, getDoc, updateDoc, arrayUnion, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { ProcessingRMAs } from "@/components/processing-rmas"
import { InServiceCentreRMAs } from "@/components/in-service-centre-rmas"
import { ReadyToDispatchRMAs } from "@/components/ready-to-dispatch-rmas"
import { DeliveredRMAs } from "@/components/delivered-rmas"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { PlusCircle, Package2, Wrench, CheckCircle, TruckIcon as TruckDelivery, Search, X, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { sendRMAReadyEmail, sendRMADeliveredEmail } from "@/lib/email"

// Helper function to get a consistent color for service centre badges
const getServiceCentreColor = (serviceCentreName) => {
  // Return a consistent color based on the service centre name
  return "bg-blue-100 text-blue-800 border-blue-300"
}

// Helper function to get the next status based on current status
const getNextStatus = (currentStatus) => {
  const statusFlow = {
    processing: "in_service_centre",
    in_service_centre: "ready",
    ready: "delivered",
    delivered: null, // End of flow
  }
  return statusFlow[currentStatus] || null
}

// Helper function to get button text based on current status
const getButtonText = (currentStatus) => {
  const buttonText = {
    processing: "Send to Service Centre",
    in_service_centre: "Mark as Ready",
    ready: "Mark as Delivered",
    delivered: "Delivered", // No action needed
  }
  return buttonText[currentStatus] || "Process"
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    processing: 0,
    inServiceCentre: 0,
    readyToDispatch: 0,
    delivered: 0,
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [companyName, setCompanyName] = useState("RMA Management Dashboard")
  const [hasSearched, setHasSearched] = useState(false)

  // State for processing RMAs
  const [processingRMA, setProcessingRMA] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [serviceCentres, setServiceCentres] = useState<any[]>([])
  const [selectedServiceCentre, setSelectedServiceCentre] = useState("")
  const [serviceRemarks, setServiceRemarks] = useState("")
  const [showServiceCentreDialog, setShowServiceCentreDialog] = useState(false)
  const [requireOtp, setRequireOtp] = useState(true)
  const [otpInput, setOtpInput] = useState("")
  const [otpError, setOtpError] = useState("")
  const [showOtpDialog, setShowOtpDialog] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const rmaCollection = collection(db, "rmas")
        const rmaSnapshot = await getDocs(rmaCollection)

        // Initialize counters
        let totalProducts = 0
        let processingProducts = 0
        let inServiceProducts = 0
        let readyProducts = 0
        let deliveredProducts = 0

        // Count products by status
        rmaSnapshot.docs.forEach((doc) => {
          const rmaData = doc.data()

          // Handle both new multi-product RMAs and legacy single-product RMAs
          if (rmaData.products && Array.isArray(rmaData.products)) {
            // New multi-product format
            totalProducts += rmaData.products.length

            rmaData.products.forEach((product: any) => {
              if (product.status === "processing") {
                processingProducts++
              } else if (product.status === "in_service_centre") {
                inServiceProducts++
              } else if (product.status === "ready") {
                readyProducts++
              } else if (product.status === "delivered") {
                deliveredProducts++
              }
            })
          } else {
            // Legacy single-product format
            totalProducts++

            if (rmaData.status === "processing") {
              processingProducts++
            } else if (rmaData.status === "in_service_centre") {
              inServiceProducts++
            } else if (rmaData.status === "ready") {
              readyProducts++
            } else if (rmaData.status === "delivered") {
              deliveredProducts++
            }
          }
        })

        setStats({
          totalProducts,
          processing: processingProducts,
          inServiceCentre: inServiceProducts,
          readyToDispatch: readyProducts,
          delivered: deliveredProducts,
        })
      } catch (error) {
        console.error("Error fetching stats:", error)
      }
    }

    fetchStats()
  }, [])

  useEffect(() => {
    const fetchCompanyName = async () => {
      try {
        const settingsCollection = collection(db, "settings")
        const settingsSnapshot = await getDocs(settingsCollection)

        if (!settingsSnapshot.empty) {
          const settingsDoc = settingsSnapshot.docs[0]
          const settingsData = settingsDoc.data()

          if (settingsData && settingsData.companyInfo && settingsData.companyInfo.name) {
            setCompanyName(`${settingsData.companyInfo.name} - RMA Management`)
          }

          // Check if OTP is required
          if (settingsData.hasOwnProperty("requireOtp")) {
            setRequireOtp(settingsData.requireOtp)
          }
        }
      } catch (error) {
        console.error("Error fetching company name:", error)
      }
    }

    // Fetch service centres
    const fetchServiceCentres = async () => {
      try {
        const serviceCentresCollection = collection(db, "serviceCentres")
        const serviceCentresSnapshot = await getDocs(serviceCentresCollection)
        const serviceCentresList = serviceCentresSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setServiceCentres(serviceCentresList)
      } catch (error) {
        console.error("Error fetching service centres:", error)
      }
    }

    fetchCompanyName()
    fetchServiceCentres()
  }, [])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setHasSearched(true)
    try {
      const rmaCollection = collection(db, "rmas")
      const snapshot = await getDocs(rmaCollection)

      const results: any[] = []

      snapshot.docs.forEach((doc) => {
        const rmaData = doc.data()
        const rmaId = doc.id

        // Handle both multi-product and legacy RMAs
        if (rmaData.products && Array.isArray(rmaData.products)) {
          // For multi-product RMAs, check each product
          rmaData.products.forEach((product: any, index: number) => {
            const matchesSearch =
              rmaData.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              rmaData.contactPhone?.includes(searchQuery) ||
              product.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              product.modelNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              product.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              rmaId.toLowerCase().includes(searchQuery.toLowerCase())

            if (matchesSearch) {
              results.push({
                id: rmaId,
                productIndex: index,
                contactName: rmaData.contactName,
                contactEmail: rmaData.contactEmail,
                contactPhone: rmaData.contactPhone,
                brand: product.brand,
                modelNumber: product.modelNumber,
                serialNumber: product.serialNumber,
                status: product.status,
                serviceCentre: product.serviceCentre?.name || product.serviceCentreName,
                otp: product.otp,
                isMultiProduct: true,
              })
            }
          })
        } else {
          // For legacy RMAs
          const matchesSearch =
            rmaData.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            rmaData.contactPhone?.includes(searchQuery) ||
            rmaData.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            rmaData.modelNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            rmaData.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            rmaId.toLowerCase().includes(searchQuery.toLowerCase())

          if (matchesSearch) {
            results.push({
              id: rmaId,
              contactName: rmaData.contactName,
              contactEmail: rmaData.contactEmail,
              contactPhone: rmaData.contactPhone,
              brand: rmaData.brand,
              modelNumber: rmaData.modelNumber,
              serialNumber: rmaData.serialNumber,
              status: rmaData.status,
              serviceCentre: rmaData.serviceCentre?.name || rmaData.serviceCentreName,
              otp: rmaData.otp,
              isMultiProduct: false,
            })
          }
        }
      })

      setSearchResults(results)
    } catch (error) {
      console.error("Error searching RMAs:", error)
      toast({
        title: "Error",
        description: "Failed to search RMAs. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }

  const clearSearch = () => {
    setSearchQuery("")
    setSearchResults([])
    setHasSearched(false)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "processing":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300">
            Material Received
          </Badge>
        )
      case "in_service_centre":
        return (
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-300">
            In Service Centre
          </Badge>
        )
      case "ready":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300">Ready to Dispatch</Badge>
      case "delivered":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-300">Delivered</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-300">{status}</Badge>
    }
  }

  // Handle process RMA
  const handleProcessRMA = (rma) => {
    const nextStatus = getNextStatus(rma.status)

    if (!nextStatus) {
      toast({
        title: "No further action",
        description: "This RMA is already at the final status",
        variant: "default",
      })
      return
    }

    if (nextStatus === "in_service_centre") {
      // Need to select a service centre first
      setProcessingRMA(rma)
      setShowServiceCentreDialog(true)
    } else if (nextStatus === "delivered" && requireOtp) {
      // Need to enter OTP first
      setProcessingRMA(rma)
      setOtpInput("")
      setOtpError("")
      setShowOtpDialog(true)
    } else {
      // Can proceed directly to next status
      processRMAToNextStatus(rma, nextStatus)
    }
  }

  // Process RMA to next status
  const processRMAToNextStatus = async (rma, nextStatus, serviceCentre = null, remarks = null) => {
    setIsProcessing(true)

    try {
      const rmaRef = doc(db, "rmas", rma.id)
      const rmaDoc = await getDoc(rmaRef)

      if (!rmaDoc.exists()) {
        throw new Error("RMA not found")
      }

      const rmaData = rmaDoc.data()

      // Update the RMA based on whether it's multi-product or legacy
      if (rma.isMultiProduct && rmaData.products && Array.isArray(rmaData.products)) {
        // Multi-product RMA
        const updatedProducts = [...rmaData.products]
        if (updatedProducts[rma.productIndex]) {
          const updatedProduct = {
            ...updatedProducts[rma.productIndex],
            status: nextStatus,
            updatedAt: new Date(),
          }

          // Add service centre info if provided
          if (serviceCentre) {
            updatedProduct.serviceCentre = { name: serviceCentre }
            updatedProduct.serviceCentreName = serviceCentre
          }

          // Add remarks if provided
          if (remarks) {
            updatedProduct.remarks = remarks
          }

          // Generate OTP if moving to ready status
          if (nextStatus === "ready") {
            const otp = Math.floor(100000 + Math.random() * 900000).toString()
            updatedProduct.otp = otp
            updatedProduct.isReady = true
          }

          // Add delivered timestamp if moving to delivered status
          if (nextStatus === "delivered") {
            updatedProduct.deliveredAt = new Date()
            updatedProduct.isDelivered = true
          }

          updatedProducts[rma.productIndex] = updatedProduct
        }

        // Determine overall RMA status
        let overallStatus = "processing"
        const statuses = updatedProducts.map((p) => p.status)

        if (statuses.every((s) => s === "delivered")) {
          overallStatus = "delivered"
        } else if (statuses.every((s) => s === "ready" || s === "delivered")) {
          overallStatus = "ready"
        } else if (statuses.some((s) => s === "in_service_centre" || s === "ready")) {
          overallStatus = "in_service_centre"
        }

        await updateDoc(rmaRef, {
          products: updatedProducts,
          status: overallStatus,
          updatedAt: Timestamp.now(),
          statusHistory: arrayUnion({
            status: nextStatus,
            timestamp: Timestamp.now(),
            remarks: remarks || "",
            productIndex: rma.productIndex,
          }),
        })

        // Send email notifications
        if (nextStatus === "ready") {
          // Send ready notification with OTP
          await sendRMAReadyEmail({
            to: rma.contactEmail,
            name: rma.contactName,
            rmaId: rma.id,
            productDetails: `${rma.brand} ${rma.modelNumber}`,
            otp: updatedProducts[rma.productIndex].otp,
            allFields: {
              ...rmaData,
              products: updatedProducts,
            },
          })
        } else if (nextStatus === "delivered") {
          // Send delivered notification
          await sendRMADeliveredEmail({
            to: rma.contactEmail,
            name: rma.contactName,
            rmaId: rma.id,
            productDetails: `${rma.brand} ${rma.modelNumber}`,
            allFields: {
              ...rmaData,
              products: updatedProducts,
            },
          })
        }
      } else {
        // Legacy single-product RMA
        const updateData: any = {
          status: nextStatus,
          updatedAt: Timestamp.now(),
          statusHistory: arrayUnion({
            status: nextStatus,
            timestamp: Timestamp.now(),
            remarks: remarks || "",
          }),
        }

        // Add service centre info if provided
        if (serviceCentre) {
          updateData.serviceCentre = { name: serviceCentre }
          updateData.serviceCentreName = serviceCentre
        }

        // Add remarks if provided
        if (remarks) {
          updateData.remarks = remarks
        }

        // Generate OTP if moving to ready status
        if (nextStatus === "ready") {
          const otp = Math.floor(100000 + Math.random() * 900000).toString()
          updateData.otp = otp
          updateData.isReady = true
        }

        // Add delivered timestamp if moving to delivered status
        if (nextStatus === "delivered") {
          updateData.deliveredAt = Timestamp.now()
          updateData.isDelivered = true
        }

        await updateDoc(rmaRef, updateData)

        // Send email notifications
        if (nextStatus === "ready") {
          // Send ready notification with OTP
          await sendRMAReadyEmail({
            to: rma.contactEmail,
            name: rma.contactName,
            rmaId: rma.id,
            productDetails: `${rma.brand} ${rma.modelNumber}`,
            otp: updateData.otp,
            allFields: {
              ...rmaData,
              ...updateData,
            },
          })
        } else if (nextStatus === "delivered") {
          // Send delivered notification
          await sendRMADeliveredEmail({
            to: rma.contactEmail,
            name: rma.contactName,
            rmaId: rma.id,
            productDetails: `${rma.brand} ${rma.modelNumber}`,
            allFields: {
              ...rmaData,
              ...updateData,
            },
          })
        }
      }

      toast({
        title: "RMA Updated",
        description: `RMA has been moved to ${nextStatus.replace("_", " ")}`,
        variant: "default",
      })

      // Update the search results to reflect the change
      setSearchResults((prev) =>
        prev.map((item) => {
          if (
            item.id === rma.id &&
            (!rma.isMultiProduct || (item.isMultiProduct && item.productIndex === rma.productIndex))
          ) {
            return {
              ...item,
              status: nextStatus,
              ...(serviceCentre && { serviceCentre }),
            }
          }
          return item
        }),
      )

      // Refresh stats
      fetchStats()
    } catch (error) {
      console.error("Error processing RMA:", error)
      toast({
        title: "Error",
        description: "Failed to update RMA. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setShowServiceCentreDialog(false)
      setShowOtpDialog(false)
      setProcessingRMA(null)
      setSelectedServiceCentre("")
      setServiceRemarks("")
      setOtpInput("")
    }
  }

  // Handle service centre selection
  const handleServiceCentreSubmit = () => {
    if (!selectedServiceCentre) {
      toast({
        title: "Service centre required",
        description: "Please select a service centre",
        variant: "destructive",
      })
      return
    }

    processRMAToNextStatus(processingRMA, "in_service_centre", selectedServiceCentre, serviceRemarks)
  }

  // Handle OTP verification
  const handleOtpSubmit = () => {
    if (!otpInput) {
      setOtpError("OTP is required")
      return
    }

    if (otpInput !== processingRMA.otp) {
      setOtpError("Incorrect OTP")
      return
    }

    processRMAToNextStatus(processingRMA, "delivered")
  }

  // Fetch stats function for refreshing after updates
  const fetchStats = async () => {
    try {
      const rmaCollection = collection(db, "rmas")
      const rmaSnapshot = await getDocs(rmaCollection)

      // Initialize counters
      let totalProducts = 0
      let processingProducts = 0
      let inServiceProducts = 0
      let readyProducts = 0
      let deliveredProducts = 0

      // Count products by status
      rmaSnapshot.docs.forEach((doc) => {
        const rmaData = doc.data()

        // Handle both new multi-product RMAs and legacy single-product RMAs
        if (rmaData.products && Array.isArray(rmaData.products)) {
          // New multi-product format
          totalProducts += rmaData.products.length

          rmaData.products.forEach((product: any) => {
            if (product.status === "processing") {
              processingProducts++
            } else if (product.status === "in_service_centre") {
              inServiceProducts++
            } else if (product.status === "ready") {
              readyProducts++
            } else if (product.status === "delivered") {
              deliveredProducts++
            }
          })
        } else {
          // Legacy single-product format
          totalProducts++

          if (rmaData.status === "processing") {
            processingProducts++
          } else if (rmaData.status === "in_service_centre") {
            inServiceProducts++
          } else if (rmaData.status === "ready") {
            readyProducts++
          } else if (rmaData.status === "delivered") {
            deliveredProducts++
          }
        }
      })

      setStats({
        totalProducts,
        processing: processingProducts,
        inServiceCentre: inServiceProducts,
        readyToDispatch: readyProducts,
        delivered: deliveredProducts,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{companyName}</h1>
        <Link href="/dashboard/raise-rma">
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
            <PlusCircle className="h-4 w-4" />
            Raise New RMA
          </Button>
        </Link>
      </div>

      {/* Global Search */}
      <Card className="bg-gradient-to-r from-slate-50 to-slate-100">
        <CardHeader className="pb-2">
          <CardTitle>Global Search</CardTitle>
          <CardDescription>
            Search for RMAs by customer name, phone number, serial number, model, or brand
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search across all RMAs..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? "Searching..." : "Search"}
            </Button>
            {hasSearched && (
              <Button variant="outline" onClick={clearSearch} className="gap-1">
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4 border rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Serial Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service Centre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {searchResults.map((result, index) => (
                    <tr key={`${result.id}-${index}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {result.contactName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.contactPhone || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{`${result.brand} ${result.modelNumber}`}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.serialNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.serviceCentre ? (
                          <Badge className={getServiceCentreColor(result.serviceCentre)}>{result.serviceCentre}</Badge>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getStatusBadge(result.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                        <Link href={`/dashboard/view-rma/${result.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                        {result.status !== "delivered" && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleProcessRMA(result)}
                            disabled={isProcessing && processingRMA?.id === result.id}
                            className="gap-1"
                          >
                            {isProcessing && processingRMA?.id === result.id ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>{getButtonText(result.status)}</>
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {hasSearched && searchResults.length === 0 && !isSearching && (
            <div className="mt-4 text-center py-8 bg-gray-50 rounded-md">
              <p className="text-gray-500">No results found for "{searchQuery}"</p>
              <Button variant="outline" onClick={clearSearch} className="mt-2">
                Clear Search
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package2 className="h-4 w-4 text-gray-500" />
              Total Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package2 className="h-4 w-4 text-yellow-500" />
              Material Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">{stats.processing}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wrench className="h-4 w-4 text-purple-500" />
              In Service Centre
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{stats.inServiceCentre}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              Ready to Dispatch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{stats.readyToDispatch}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TruckDelivery className="h-4 w-4 text-green-500" />
              Delivered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{stats.delivered}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="processing" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-slate-100">
          <TabsTrigger
            value="processing"
            className="data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-900 data-[state=active]:shadow py-3"
          >
            <Package2 className="h-4 w-4 mr-2" />
            Material Received
          </TabsTrigger>
          <TabsTrigger
            value="in_service_centre"
            className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-900 data-[state=active]:shadow py-3"
          >
            <Wrench className="h-4 w-4 mr-2" />
            In Service Centre
          </TabsTrigger>
          <TabsTrigger
            value="ready"
            className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900 data-[state=active]:shadow py-3"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Ready to Dispatch
          </TabsTrigger>
          <TabsTrigger
            value="delivered"
            className="data-[state=active]:bg-green-100 data-[state=active]:text-green-900 data-[state=active]:shadow py-3"
          >
            <TruckDelivery className="h-4 w-4 mr-2" />
            Delivered
          </TabsTrigger>
        </TabsList>
        <TabsContent value="processing" className="space-y-4">
          <Card className="border-yellow-200">
            <CardHeader className="bg-yellow-50 rounded-t-lg">
              <CardTitle className="text-yellow-800 flex items-center gap-2">
                <Package2 className="h-5 w-5" />
                Material Received Products
              </CardTitle>
              <CardDescription>Products that have been received. Send to service centre when ready.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ProcessingRMAs />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="in_service_centre" className="space-y-4">
          <Card className="border-purple-200">
            <CardHeader className="bg-purple-50 rounded-t-lg">
              <CardTitle className="text-purple-800 flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                In Service Centre Products
              </CardTitle>
              <CardDescription>
                Products that are currently in the service centre. Mark as ready when repaired.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <InServiceCentreRMAs />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="ready" className="space-y-4">
          <Card className="border-blue-200">
            <CardHeader className="bg-blue-50 rounded-t-lg">
              <CardTitle className="text-blue-800 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Ready to Dispatch Products
              </CardTitle>
              <CardDescription>
                Products that are ready to be dispatched. Enter OTP to mark as delivered.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ReadyToDispatchRMAs />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="delivered" className="space-y-4">
          <Card className="border-green-200">
            <CardHeader className="bg-green-50 rounded-t-lg">
              <CardTitle className="text-green-800 flex items-center gap-2">
                <TruckDelivery className="h-5 w-5" />
                Delivered Products
              </CardTitle>
              <CardDescription>Products that have been delivered to customers.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <DeliveredRMAs />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Service Centre Selection Dialog */}
      <Dialog open={showServiceCentreDialog} onOpenChange={setShowServiceCentreDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Send to Service Centre</DialogTitle>
            <DialogDescription>Select a service centre to process this RMA</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="service-centre" className="text-right">
                Service Centre
              </Label>
              <Select value={selectedServiceCentre} onValueChange={setSelectedServiceCentre}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a service centre" />
                </SelectTrigger>
                <SelectContent>
                  {serviceCentres.map((centre) => (
                    <SelectItem key={centre.id} value={centre.name}>
                      {centre.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="remarks" className="text-right">
                Remarks
              </Label>
              <Textarea
                id="remarks"
                placeholder="Add any notes or instructions for the service centre"
                className="col-span-3"
                value={serviceRemarks}
                onChange={(e) => setServiceRemarks(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowServiceCentreDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleServiceCentreSubmit} disabled={!selectedServiceCentre}>
              Process
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OTP Verification Dialog */}
      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Verify OTP</DialogTitle>
            <DialogDescription>Enter the OTP sent to the customer to mark this RMA as delivered</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="otp" className="text-right">
                OTP
              </Label>
              <Input
                id="otp"
                placeholder="Enter OTP"
                className={`col-span-3 ${otpError ? "border-red-500" : ""}`}
                value={otpInput}
                onChange={(e) => {
                  setOtpInput(e.target.value)
                  if (otpError) setOtpError("")
                }}
              />
              {otpError && <p className="col-span-3 col-start-2 text-xs text-red-500">{otpError}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOtpDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleOtpSubmit}>Verify & Mark as Delivered</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
