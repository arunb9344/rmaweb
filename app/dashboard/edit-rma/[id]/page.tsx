"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { doc, getDoc, collection, getDocs, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Loader2, ArrowLeft } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { DatePicker } from "@/components/ui/date-picker"

interface RMA {
  id: string
  contactId: string
  contactName: string
  contactEmail: string
  contactPhone: string
  contactCompany: string
  brand: string
  modelNumber: string
  serialNumber: string
  problemsReported: string
  comments: string
  status: string
  createdAt: any
  updatedAt: any
  customFields?: Record<string, any>
}

interface Brand {
  id: string
  name: string
}

interface CustomField {
  id: string
  name: string
  label: string
  type: string
  required: boolean
  defaultValue?: string
  options?: string[]
}

export default function EditRMAPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { id } = params

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [rma, setRma] = useState<RMA | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [formData, setFormData] = useState({
    brand: "",
    modelNumber: "",
    serialNumber: "",
    problemsReported: "",
    comments: "",
    status: "",
    customFields: {} as Record<string, any>,
  })

  useEffect(() => {
    const fetchRMA = async () => {
      try {
        const rmaDoc = await getDoc(doc(db, "rmas", id))
        if (rmaDoc.exists()) {
          const rmaData = { id: rmaDoc.id, ...rmaDoc.data() } as RMA
          setRma(rmaData)
          setFormData({
            brand: rmaData.brand || "",
            modelNumber: rmaData.modelNumber || "",
            serialNumber: rmaData.serialNumber || "",
            problemsReported: rmaData.problemsReported || "",
            comments: rmaData.comments || "",
            status: rmaData.status || "processing",
            customFields: rmaData.customFields || {},
          })
        } else {
          toast({
            title: "Error",
            description: "RMA not found",
            variant: "destructive",
          })
          router.push("/dashboard")
        }
      } catch (error) {
        console.error("Error fetching RMA:", error)
        toast({
          title: "Error",
          description: "Failed to load RMA data",
          variant: "destructive",
        })
      }
    }

    const fetchBrands = async () => {
      try {
        const brandsCollection = collection(db, "brands")
        const brandsSnapshot = await getDocs(brandsCollection)
        const brandsList = brandsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Brand[]

        setBrands(brandsList)
      } catch (error) {
        console.error("Error fetching brands:", error)
      }
    }

    const fetchCustomFields = async () => {
      try {
        const customFieldsCollection = collection(db, "customFields")
        const customFieldsSnapshot = await getDocs(customFieldsCollection)
        const customFieldsList = customFieldsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as CustomField[]

        setCustomFields(customFieldsList)
      } catch (error) {
        console.error("Error fetching custom fields:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRMA()
    fetchBrands()
    fetchCustomFields()
  }, [id, router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCustomFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [fieldName]: value,
      },
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const rmaRef = doc(db, "rmas", id)
      await updateDoc(rmaRef, {
        brand: formData.brand,
        modelNumber: formData.modelNumber,
        serialNumber: formData.serialNumber,
        problemsReported: formData.problemsReported,
        comments: formData.comments,
        status: formData.status,
        customFields: formData.customFields,
        updatedAt: new Date(),
      })

      toast({
        title: "RMA Updated",
        description: "The RMA has been updated successfully",
      })

      router.push("/dashboard")
    } catch (error) {
      console.error("Error updating RMA:", error)
      toast({
        title: "Error",
        description: "Failed to update RMA. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const renderCustomField = (field: CustomField) => {
    const value = formData.customFields[field.name] || field.defaultValue || ""

    switch (field.type) {
      case "text":
      case "email":
      case "tel":
      case "number":
        return (
          <div className="space-y-2" key={field.id}>
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              name={field.name}
              type={field.type}
              value={value}
              onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
              required={field.required}
            />
          </div>
        )
      case "textarea":
        return (
          <div className="space-y-2" key={field.id}>
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.name}
              name={field.name}
              value={value}
              onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
              required={field.required}
            />
          </div>
        )
      case "checkbox":
        return (
          <div className="flex items-center space-x-2" key={field.id}>
            <Checkbox
              id={field.name}
              checked={value === true}
              onCheckedChange={(checked) => handleCustomFieldChange(field.name, checked)}
            />
            <Label
              htmlFor={field.name}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
          </div>
        )
      case "switch":
        return (
          <div className="flex items-center justify-between" key={field.id}>
            <Label
              htmlFor={field.name}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Switch
              id={field.name}
              checked={value === true}
              onCheckedChange={(checked) => handleCustomFieldChange(field.name, checked)}
            />
          </div>
        )
      case "select":
        return (
          <div className="space-y-2" key={field.id}>
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(value) => handleCustomFieldChange(field.name, value)}
              required={field.required}
            >
              <SelectTrigger id={field.name}>
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      case "date":
        return (
          <div className="space-y-2" key={field.id}>
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <DatePicker
              id={field.name}
              selected={value ? new Date(value) : undefined}
              onSelect={(date) => handleCustomFieldChange(field.name, date?.toISOString() || "")}
              required={field.required}
            />
          </div>
        )
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Edit RMA</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
            <CardTitle>Customer Information</CardTitle>
            <CardDescription>Customer details for this RMA</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {rma && (
              <div className="border rounded-md p-4 bg-blue-50 border-blue-200">
                <div className="space-y-1">
                  <p className="font-medium text-blue-700">{rma.contactCompany}</p>
                  {rma.contactName && <p className="text-sm">{rma.contactName}</p>}
                  <p className="text-sm text-muted-foreground">{rma.contactEmail}</p>
                  <p className="text-sm text-muted-foreground">{rma.contactPhone}</p>
                </div>
              </div>
            )}
          </CardContent>

          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
            <CardTitle>Product Details</CardTitle>
            <CardDescription>Update the details of the product for RMA</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                name="status"
                value={formData.status}
                onValueChange={(value) => handleSelectChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="in_service_centre">In Service Centre</SelectItem>
                  <SelectItem value="ready">Ready to Dispatch</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Select name="brand" value={formData.brand} onValueChange={(value) => handleSelectChange("brand", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.name}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelNumber">Model Number</Label>
              <Input
                id="modelNumber"
                name="modelNumber"
                value={formData.modelNumber}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input
                id="serialNumber"
                name="serialNumber"
                value={formData.serialNumber}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="problemsReported">Problems Reported</Label>
              <Textarea
                id="problemsReported"
                name="problemsReported"
                value={formData.problemsReported}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comments">Comments</Label>
              <Textarea id="comments" name="comments" value={formData.comments} onChange={handleInputChange} />
            </div>

            {customFields.length > 0 && (
              <>
                <div className="border-t pt-4 mt-6">
                  <h3 className="text-lg font-medium mb-4">Additional Information</h3>
                  <div className="space-y-4">{customFields.map((field) => renderCustomField(field))}</div>
                </div>
              </>
            )}
          </CardContent>

          <CardFooter className="flex justify-between bg-slate-50 border-t">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
