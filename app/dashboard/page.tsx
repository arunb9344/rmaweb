"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { ProcessingRMAs } from "@/components/processing-rmas"
import { InServiceCentreRMAs } from "@/components/in-service-centre-rmas"
import { ReadyToDispatchRMAs } from "@/components/ready-to-dispatch-rmas"
import { DeliveredRMAs } from "@/components/delivered-rmas"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { PlusCircle, Package2, Wrench, CheckCircle, TruckIcon as TruckDelivery, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"

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
        }
      } catch (error) {
        console.error("Error fetching company name:", error)
      }
    }

    fetchCompanyName()
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
                contactPhone: rmaData.contactPhone,
                brand: product.brand,
                modelNumber: product.modelNumber,
                serialNumber: product.serialNumber,
                status: product.status,
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
              isMultiProduct: false,
            })
          }
        }
      })

      setSearchResults(results)
    } catch (error) {
      console.error("Error searching RMAs:", error)
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
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Material Received
          </span>
        )
      case "in_service_centre":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            In Service Centre
          </span>
        )
      case "ready":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Ready to Dispatch
          </span>
        )
      case "delivered":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Delivered
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        )
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
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
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
                        {getStatusBadge(result.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <Link href={`/dashboard/view-rma/${result.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
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
    </div>
  )
}
