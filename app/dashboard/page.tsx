"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Loader2, Search, X, PlusCircle, Package2, Wrench, CheckCircle, TruckIcon } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"

// Import components as default exports
import ProcessingRMAs from "@/components/processing-rmas"
import InServiceCentreRMAs from "@/components/in-service-centre-rmas"
import ReadyToDispatchRMAs from "@/components/ready-to-dispatch-rmas"
import DeliveredRMAs from "@/components/delivered-rmas"

// Import Firebase
import { collection, getDocs, doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

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

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [processingRMA, setProcessingRMA] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [serviceCentres, setServiceCentres] = useState([])
  const [selectedServiceCentre, setSelectedServiceCentre] = useState("")
  const [serviceRemarks, setServiceRemarks] = useState("")
  const [showServiceCentreDialog, setShowServiceCentreDialog] = useState(false)
  const [stats, setStats] = useState({
    processing: 0,
    inServiceCentre: 0,
    readyToDispatch: 0,
    delivered: 0,
  })
  const [companyName, setCompanyName] = useState("RMA Management Dashboard")
  const [hasSearched, setHasSearched] = useState(false)

  // Fetch service centres and stats on component mount
  useEffect(() => {
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
        }
      } catch (error) {
        console.error("Error fetching company name:", error)
      }
    }

    fetchServiceCentres()
    fetchStats()
    fetchCompanyName()
  }, [])

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      const rmaCollection = collection(db, "rmas")
      const rmaSnapshot = await getDocs(rmaCollection)

      // Initialize counters
      let processingCount = 0
      let inServiceCount = 0
      let readyCount = 0
      let deliveredCount = 0

      // Count products by status
      rmaSnapshot.docs.forEach((doc) => {
        const rmaData = doc.data()

        // Handle both new multi-product RMAs and legacy single-product RMAs
        if (rmaData.products && Array.isArray(rmaData.products)) {
          // New multi-product format
          rmaData.products.forEach((product) => {
            if (product.status === "processing") {
              processingCount++
            } else if (product.status === "in_service_centre") {
              inServiceCount++
            } else if (product.status === "ready") {
              readyCount++
            } else if (product.status === "delivered") {
              deliveredCount++
            }
          })
        } else {
          // Legacy single-product format
          if (rmaData.status === "processing") {
            processingCount++
          } else if (rmaData.status === "in_service_centre") {
            inServiceCount++
          } else if (rmaData.status === "ready") {
            readyCount++
          } else if (rmaData.status === "delivered") {
            deliveredCount++
          }
        }
      })

      setStats({
        processing: processingCount,
        inServiceCentre: inServiceCount,
        readyToDispatch: readyCount,
        delivered: deliveredCount,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setHasSearched(true)
    try {
      const rmaCollection = collection(db, "rmas")
      const snapshot = await getDocs(rmaCollection)

      const results = []

      snapshot.docs.forEach((doc) => {
        const rmaData = doc.data()
        const rmaId = doc.id

        // Handle both multi-product and legacy RMAs
        if (rmaData.products && Array.isArray(rmaData.products)) {
          // For multi-product RMAs, check each product
          rmaData.products.forEach((product, index) => {
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
                contactPhone: rmaData.contactPhone,
                brand: product.brand,
                modelNumber: product.modelNumber,
                serialNumber: product.serialNumber,
                status: product.status,
                serviceCentre: product.serviceCentre?.name || product.serviceCentreName,
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
              contactPhone: rmaData.contactPhone,
              brand: rmaData.brand,
              modelNumber: rmaData.modelNumber,
              serialNumber: rmaData.serialNumber,
              status: rmaData.status,
              serviceCentre: rmaData.serviceCentre?.name || rmaData.serviceCentreName,
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

  const getStatusBadge = (status) => {
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
          updatedProducts[rma.productIndex] = {
            ...updatedProducts[rma.productIndex],
            status: nextStatus,
            ...(serviceCentre && {
              serviceCentre: { name: serviceCentre },
              serviceCentreName: serviceCentre,
            }),
            ...(remarks && { remarks: remarks }),
            updatedAt: new Date(),
          }
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
          updatedAt: new Date(),
        })
      } else {
        // Legacy single-product RMA
        await updateDoc(rmaRef, {
          status: nextStatus,
          ...(serviceCentre && {
            serviceCentre: { name: serviceCentre },
            serviceCentreName: serviceCentre,
          }),
          ...(remarks && { remarks: remarks }),
          updatedAt: new Date(),
        })
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
      setProcessingRMA(null)
      setSelectedServiceCentre("")
      setServiceRemarks("")
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
                            disabled={isProcessing}
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
            <div className="text-2xl font-bold">
              {stats.processing + stats.inServiceCentre + stats.readyToDispatch + stats.delivered}
            </div>
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
              <TruckIcon className="h-4 w-4 text-green-500" />
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
            <TruckIcon className="h-4 w-4 mr-2" />
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
              <ProcessingRMAs onStatusChange={fetchStats} />
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
              <InServiceCentreRMAs onStatusChange={fetchStats} />
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
              <ReadyToDispatchRMAs onStatusChange={fetchStats} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="delivered" className="space-y-4">
          <Card className="border-green-200">
            <CardHeader className="bg-green-50 rounded-t-lg">
              <CardTitle className="text-green-800 flex items-center gap-2">
                <TruckIcon className="h-5 w-5" />
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
    </div>
  )
}
