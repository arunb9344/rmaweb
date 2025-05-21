"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { PlusCircle, Search, Trash2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { BrandDialog } from "@/components/brand-dialog"

interface Brand {
  id: string
  name: string
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [filteredBrands, setFilteredBrands] = useState<Brand[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    fetchBrands()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const filtered = brands.filter((brand) => brand.name.toLowerCase().includes(searchQuery.toLowerCase()))
      setFilteredBrands(filtered)
    } else {
      setFilteredBrands(brands)
    }
  }, [searchQuery, brands])

  const fetchBrands = async () => {
    try {
      const brandsCollection = collection(db, "brands")
      const brandsSnapshot = await getDocs(brandsCollection)
      const brandsList = brandsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Brand[]

      setBrands(brandsList)
      setFilteredBrands(brandsList)
    } catch (error) {
      console.error("Error fetching brands:", error)
      toast({
        title: "Error",
        description: "Failed to load brands. Please refresh the page.",
        variant: "destructive",
      })
    }
  }

  const handleBrandAdded = (newBrand: Brand) => {
    setBrands((prev) => [...prev, newBrand])
    setIsDialogOpen(false)
  }

  const handleDeleteBrand = async (id: string) => {
    if (confirm("Are you sure you want to delete this brand?")) {
      try {
        await deleteDoc(doc(db, "brands", id))
        toast({
          title: "Brand Deleted",
          description: "The brand has been deleted successfully",
        })
        setBrands((prev) => prev.filter((brand) => brand.id !== id))
      } catch (error) {
        console.error("Error deleting brand:", error)
        toast({
          title: "Error",
          description: "Failed to delete brand. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Brand Management</h1>
        <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
          <PlusCircle className="h-4 w-4" />
          Add New Brand
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Brands</CardTitle>
          <CardDescription>Manage product brands for RMA processing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search brands..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBrands.length > 0 ? (
                  filteredBrands.map((brand) => (
                    <TableRow key={brand.id}>
                      <TableCell className="font-medium">{brand.name}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteBrand(brand.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                      No brands found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <BrandDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} onBrandAdded={handleBrandAdded} />
    </div>
  )
}
