"use client"

import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { RefreshCw } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { RMASearchBar } from "@/components/rma-search-bar"
import { Loader2 } from "lucide-react" // Import Loader2 here

interface Product {
  id: string
  brand: string
  modelNumber: string
  serialNumber: string
  status: string
  deliveredAt?: any
  serviceCentre?: {
    name: string
  }
  serviceCentreName?: string
}

interface RMA {
  id: string
  contactName: string
  contactEmail: string
  contactPhone: string
  contactCompany: string
  products: Product[]
  createdAt: any
  deliveredAt: any
}

export function DeliveredRMAs() {
  const [rmas, setRmas] = useState<RMA[]>([])
  const [filteredRmas, setFilteredRmas] = useState<RMA[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [flattenedProducts, setFlattenedProducts] = useState<any[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchRMAs = async () => {
    setIsRefreshing(true)
    try {
      // Query RMAs that might have delivered products
      const rmaCollection = collection(db, "rmas")
      const rmaSnapshot = await getDocs(rmaCollection)

      const rmaList = rmaSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as RMA[]

      // Filter RMAs that have at least one delivered product
      const rmasWithDeliveredProducts = rmaList.filter(
        (rma) =>
          rma.products && Array.isArray(rma.products) && rma.products.some((product) => product.status === "delivered"),
      )

      setRmas(rmasWithDeliveredProducts)

      // Create flattened view of products for display
      const products = []
      for (const rma of rmasWithDeliveredProducts) {
        if (rma.products && Array.isArray(rma.products)) {
          for (const product of rma.products) {
            if (product.status === "delivered") {
              products.push({
                ...product,
                rmaId: rma.id,
                contactName: rma.contactName,
                contactEmail: rma.contactEmail,
                contactPhone: rma.contactPhone,
                contactCompany: rma.contactCompany,
                createdAt: rma.createdAt,
                // Use product-specific deliveredAt if available, otherwise use RMA deliveredAt
                deliveredAt: product.deliveredAt || rma.deliveredAt,
              })
            }
          }
        }
      }

      setFlattenedProducts(products)
      setFilteredRmas(rmasWithDeliveredProducts)
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

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const filtered = flattenedProducts.filter((product) => {
        // Search in customer details
        const customerMatch =
          product.contactName?.toLowerCase().includes(query) ||
          product.contactEmail?.toLowerCase().includes(query) ||
          product.contactPhone?.toLowerCase().includes(query) ||
          product.contactCompany?.toLowerCase().includes(query) ||
          product.rmaId?.toLowerCase().includes(query)

        // Search in product details
        const productMatch =
          product.brand?.toLowerCase().includes(query) ||
          product.modelNumber?.toLowerCase().includes(query) ||
          product.serialNumber?.toLowerCase().includes(query)

        return customerMatch || productMatch
      })

      // Group filtered products by RMA ID
      const rmaIds = [...new Set(filtered.map((product) => product.rmaId))]
      const filteredRmasList = rmas.filter((rma) => rmaIds.includes(rma.id))

      setFilteredRmas(filteredRmasList)
    } else {
      setFilteredRmas(rmas)
    }
  }, [searchQuery, rmas, flattenedProducts])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <RMASearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            placeholder="Search by customer name, phone, email, serial number, model, or RMA ID..."
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchRMAs} disabled={isRefreshing}>
          {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
          Refresh
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Serial Number</TableHead>
              <TableHead>Service Centre</TableHead>
              <TableHead>Date Created</TableHead>
              <TableHead>Date Delivered</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRmas.length > 0 ? (
              flattenedProducts
                .filter((product) => filteredRmas.some((rma) => rma.id === product.rmaId))
                .map((product) => (
                  <TableRow key={`${product.rmaId}-${product.id || product.serialNumber}`}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-medium">{product.contactName}</div>
                        <div className="text-sm text-muted-foreground">{product.contactCompany}</div>
                        <div className="text-xs text-muted-foreground">
                          {product.contactEmail} • {product.contactPhone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{`${product.brand || "N/A"} ${product.modelNumber || "N/A"}`}</TableCell>
                    <TableCell>{product.serialNumber || "N/A"}</TableCell>
                    <TableCell>
                      {product.serviceCentre?.name || product.serviceCentreName ? (
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300">
                          {product.serviceCentre?.name || product.serviceCentreName}
                        </Badge>
                      ) : (
                        "Not specified"
                      )}
                    </TableCell>
                    <TableCell>{formatDate(product.createdAt)}</TableCell>
                    <TableCell>{formatDate(product.deliveredAt)}</TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-300">
                        Delivered
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {searchQuery ? "No delivered RMAs found matching your search." : "No delivered RMAs found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
