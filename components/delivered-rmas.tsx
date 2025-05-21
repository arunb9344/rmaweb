"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"

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
  products: Product[]
  createdAt: any
  deliveredAt: any
}

export function DeliveredRMAs() {
  const [rmas, setRmas] = useState<RMA[]>([])
  const [filteredRmas, setFilteredRmas] = useState<RMA[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [flattenedProducts, setFlattenedProducts] = useState<any[]>([])

  useEffect(() => {
    const fetchRMAs = async () => {
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
            rma.products &&
            Array.isArray(rma.products) &&
            rma.products.some((product) => product.status === "delivered"),
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
      }
    }

    fetchRMAs()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const filtered = flattenedProducts.filter(
        (product) =>
          product.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.contactEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.contactPhone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.modelNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.rmaId?.toLowerCase().includes(searchQuery.toLowerCase()),
      )

      // Group filtered products by RMA ID
      const rmaIds = [...new Set(filtered.map((product) => product.rmaId))]
      const filteredRmasList = rmas.filter((rma) => rmaIds.includes(rma.id))

      setFilteredRmas(filteredRmasList)
    } else {
      setFilteredRmas(rmas)
    }
  }, [searchQuery, rmas, flattenedProducts])

  const clearSearch = () => {
    setSearchQuery("")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer, product, serial number, or RMA ID..."
            className="pl-8 pr-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          onClick={clearSearch}
          className={searchQuery ? "opacity-100" : "opacity-0"}
          tabIndex={searchQuery ? 0 : -1}
        >
          Reset
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
                    <TableCell className="font-medium">{product.contactName}</TableCell>
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
                  No delivered RMAs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
