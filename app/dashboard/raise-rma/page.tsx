"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { collection, doc, getDoc, getDocs, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { ContactDialog } from "@/components/contact-dialog"
import { BrandDialog } from "@/components/brand-dialog"
import { sendRMAConfirmationEmail } from "@/lib/email"
import {
  Loader2,
  Plus,
  Search,
  Building,
  User,
  Mail,
  Phone,
  HelpCircle,
  CheckIcon,
  Printer,
  Trash2,
  Save,
  Edit,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { DatePicker } from "@/components/ui/date-picker"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { SimpleRmaDocument } from "@/components/pdf/simple-rma-document"
import { pdf } from "@react-pdf/renderer"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"

interface Contact {
  id: string
  name?: string
  email: string
  phone: string
  company: string
  address?: string
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
  description?: string
}

interface ProductItem {
  id: string
  brand: string
  modelNumber: string
  serialNumber: string
  problemsReported: string
  status: string
  customFields: Record<string, any>
  isSaved?: boolean
  isEditing?: boolean
}

export default function RaiseRMAPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const contactId = searchParams.get("contactId")
  const printFrameRef = useRef<HTMLIFrameElement | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false)
  const [isBrandDialogOpen, setIsBrandDialogOpen] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [selectedContact, setSelectedContact] = useState<string>("")
  const [contactSearchOpen, setContactSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [comments, setComments] = useState("")

  // State for multiple products
  const [products, setProducts] = useState<ProductItem[]>([])
  const [expandedProducts, setExpandedProducts] = useState<string[]>([])

  // Add state for successful RMA creation and the created RMA data
  const [isSuccess, setIsSuccess] = useState(false)
  const [createdRmaId, setCreatedRmaId] = useState<string | null>(null)
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  // Clean up any existing print frames when component unmounts
  useEffect(() => {
    return () => {
      if (printFrameRef.current && document.body.contains(printFrameRef.current)) {
        document.body.removeChild(printFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const contactsCollection = collection(db, "contacts")
        const contactsSnapshot = await getDocs(contactsCollection)
        const contactsList = contactsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Contact[]

        setContacts(contactsList)
        setFilteredContacts(contactsList)

        // If contactId is provided in URL, set it as selected
        if (contactId) {
          setSelectedContact(contactId)
        }
      } catch (error) {
        console.error("Error fetching contacts:", error)
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

        // Add initial product if none exists
        if (products.length === 0) {
          addNewProduct()
        }
      } catch (error) {
        console.error("Error fetching custom fields:", error)
      }
    }

    fetchContacts()
    fetchBrands()
    fetchCustomFields()
  }, [contactId, products.length])

  const addNewProduct = () => {
    const newProduct: ProductItem = {
      id: Date.now().toString(),
      brand: "",
      modelNumber: "",
      serialNumber: "",
      problemsReported: "",
      status: "processing",
      customFields: {},
      isSaved: false,
      isEditing: true,
    }

    setProducts((prev) => [...prev, newProduct])
    setExpandedProducts((prev) => [...prev, newProduct.id])
  }

  const removeProduct = (productId: string) => {
    setProducts((prev) => prev.filter((product) => product.id !== productId))
    setExpandedProducts((prev) => prev.filter((id) => id !== productId))
  }

  const updateProduct = (productId: string, field: string, value: any) => {
    setProducts((prev) => prev.map((product) => (product.id === productId ? { ...product, [field]: value } : product)))
  }

  const updateProductCustomField = (productId: string, fieldName: string, value: any) => {
    setProducts((prev) =>
      prev.map((product) =>
        product.id === productId
          ? {
              ...product,
              customFields: {
                ...product.customFields,
                [fieldName]: value,
              },
            }
          : product,
      ),
    )
  }

  const saveProduct = (productId: string) => {
    const product = products.find((p) => p.id === productId)

    if (!product) return

    // Validate required fields
    if (!product.brand || !product.modelNumber || !product.serialNumber || !product.problemsReported) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields for this product",
        variant: "destructive",
      })
      return
    }

    // Mark product as saved and not editing
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, isSaved: true, isEditing: false } : p)))

    // Collapse the accordion
    setExpandedProducts((prev) => prev.filter((id) => id !== productId))

    toast({
      title: "Product Saved",
      description: `${product.brand} ${product.modelNumber} has been saved`,
    })

    // Add a new product if this was the last one
    const hasUnsavedProduct = products.some((p) => !p.isSaved)
    if (!hasUnsavedProduct) {
      addNewProduct()
    }
  }

  const editProduct = (productId: string) => {
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, isEditing: true } : p)))

    // Expand the accordion
    if (!expandedProducts.includes(productId)) {
      setExpandedProducts((prev) => [...prev, productId])
    }
  }

  const handleContactAdded = (newContact: Contact) => {
    setContacts((prev) => [...prev, newContact])
    setFilteredContacts((prev) => [...prev, newContact])
    setSelectedContact(newContact.id)
    setIsContactDialogOpen(false)
  }

  const handleBrandAdded = (newBrand: Brand) => {
    setBrands((prev) => [...prev, newBrand])
    setIsBrandDialogOpen(false)
  }

  const handleContactSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase()
    setSearchQuery(query)

    if (!query.trim()) {
      setFilteredContacts(contacts)
      return
    }

    const filtered = contacts.filter(
      (contact) =>
        contact.company.toLowerCase().includes(query) ||
        (contact.name && contact.name.toLowerCase().includes(query)) ||
        contact.email.toLowerCase().includes(query) ||
        contact.phone.toLowerCase().includes(query),
    )

    setFilteredContacts(filtered)
  }

  const handleContactSelect = (contactId: string) => {
    setSelectedContact(contactId)
    setContactSearchOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedContact) {
      toast({
        title: "Error",
        description: "Please select a contact",
        variant: "destructive",
      })
      return
    }

    // Check if there are any products
    const savedProducts = products.filter((product) => product.isSaved)
    if (savedProducts.length === 0) {
      toast({
        title: "Error",
        description: "Please add and save at least one product",
        variant: "destructive",
      })
      return
    }

    // Check if there are any unsaved products
    const unsavedProducts = products.filter((product) => !product.isSaved && product.isEditing)
    if (unsavedProducts.length > 0) {
      toast({
        title: "Warning",
        description: "You have unsaved products. Please save or remove them before submitting.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Get contact details
      const contactRef = doc(db, "contacts", selectedContact)
      const contactSnap = await getDoc(contactRef)
      const contactData = contactSnap.data() as Contact

      // Create RMA with multiple products - only include saved products
      const rmaData = {
        contactId: selectedContact,
        contactName: contactData.name || "",
        contactEmail: contactData.email,
        contactPhone: contactData.phone,
        contactCompany: contactData.company || "Your Company",
        comments: comments,
        products: savedProducts.map(({ isSaved, isEditing, ...product }) => ({
          ...product,
          status: "processing", // Ensure all products start with processing status
        })),
        status: "processing", // Overall RMA status
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      const rmaRef = await addDoc(collection(db, "rmas"), rmaData)
      setCreatedRmaId(rmaRef.id)
      setIsSuccess(true)
      setIsPrintDialogOpen(true)

      // Send email notification - with better error handling
      setIsSendingEmail(true)
      console.log("Attempting to send email to:", contactData.email)

      try {
        // Send email notification
        const emailResult = await sendRMAConfirmationEmail({
          to: contactData.email,
          name: contactData.name || contactData.company,
          rmaId: rmaRef.id,
          productDetails: savedProducts.map((p) => `${p.brand} ${p.modelNumber}`).join(", "),
          allFields: {
            ...rmaData,
            id: rmaRef.id,
          },
        })

        console.log("Email sent successfully:", emailResult)

        toast({
          title: "RMA Created",
          description: "The RMA has been created successfully and email notification sent",
        })
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError)

        // Don't fail the whole operation if just the email fails
        toast({
          title: "RMA Created",
          description: "The RMA was created but we couldn't send the confirmation email.",
        })
      } finally {
        setIsSendingEmail(false)
      }
    } catch (error) {
      console.error("Error creating RMA:", error)
      toast({
        title: "Error",
        description: "Failed to create RMA. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Get initials for avatar
  const getInitials = (contact: Contact) => {
    if (contact.name && contact.name.trim()) {
      return contact.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    }
    return contact.company.substring(0, 2).toUpperCase()
  }

  // Improved print function
  const handlePrintRma = async () => {
    if (isPrinting || !createdRmaId) return

    setIsPrinting(true)

    try {
      // Fetch RMA data
      const rmaRef = doc(db, "rmas", createdRmaId)
      const rmaSnap = await getDoc(rmaRef)

      if (!rmaSnap.exists()) {
        toast({
          title: "Error",
          description: "RMA not found",
          variant: "destructive",
        })
        return
      }

      const rmaData = {
        id: rmaSnap.id,
        ...rmaSnap.data(),
      }

      // Fetch company info
      const settingsCollection = collection(db, "settings")
      const settingsSnapshot = await getDocs(settingsCollection)
      let companyInfo = {
        name: "Your Company",
        email: "info@yourcompany.com",
        phone: "(555) 123-4567",
        address: "123 Business Street, City, Country",
      }

      if (!settingsSnapshot.empty) {
        const settingsDoc = settingsSnapshot.docs[0]
        const settingsData = settingsDoc.data()

        if (settingsData && settingsData.companyInfo) {
          companyInfo = settingsData.companyInfo
        }
      }

      // Generate PDF
      const pdfDoc = <SimpleRmaDocument rma={rmaData} companyInfo={companyInfo} />
      const blob = await pdf(pdfDoc).toBlob()
      const url = URL.createObjectURL(blob)

      // Clean up any existing print frames
      if (printFrameRef.current && document.body.contains(printFrameRef.current)) {
        document.body.removeChild(printFrameRef.current)
      }

      // Create a hidden iframe to load the PDF
      const printFrame = document.createElement("iframe")
      printFrame.style.position = "fixed"
      printFrame.style.right = "0"
      printFrame.style.bottom = "0"
      printFrame.style.width = "100%"
      printFrame.style.height = "100%"
      printFrame.style.border = "0"
      printFrame.style.zIndex = "-1000"
      printFrame.style.opacity = "0"
      printFrameRef.current = printFrame

      // Add the iframe to the document
      document.body.appendChild(printFrame)

      // Set the source of the iframe to the PDF blob URL
      printFrame.src = url

      // Wait for the iframe to load, then print
      printFrame.onload = () => {
        try {
          // Access the iframe's window object
          const frameWindow = printFrame.contentWindow

          if (frameWindow) {
            // Print the iframe content
            frameWindow.focus()

            // Use a longer timeout to ensure the print dialog has time to appear
            setTimeout(() => {
              try {
                frameWindow.print()
              } catch (error) {
                console.error("Print error:", error)
              }
            }, 500)
          }
        } catch (error) {
          console.error("Print error:", error)
          toast({
            title: "Print Error",
            description: "Failed to print the document. Please try again.",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("Error printing RMA:", error)
      toast({
        title: "Print Error",
        description: "Failed to generate or print the RMA document.",
        variant: "destructive",
      })
    } finally {
      setIsPrinting(false)
    }
  }

  const renderCustomField = (field: CustomField, productId: string) => {
    const value =
      products.find((p) => p.id === productId)?.customFields[field.name] !== undefined
        ? products.find((p) => p.id === productId)?.customFields[field.name]
        : field.type === "checkbox" || field.type === "switch"
          ? field.defaultValue === "true"
          : field.defaultValue || ""

    return (
      <div className="space-y-2" key={field.id}>
        <div className="flex items-center gap-1">
          <Label htmlFor={`${productId}-${field.name}`}>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          {field.description && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{field.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {field.type === "text" || field.type === "email" || field.type === "tel" || field.type === "number" ? (
          <Input
            id={`${productId}-${field.name}`}
            name={field.name}
            type={field.type}
            value={value}
            onChange={(e) => updateProductCustomField(productId, field.name, e.target.value)}
            required={field.required}
            disabled={!products.find((p) => p.id === productId)?.isEditing}
          />
        ) : field.type === "textarea" ? (
          <Textarea
            id={`${productId}-${field.name}`}
            name={field.name}
            value={value}
            onChange={(e) => updateProductCustomField(productId, field.name, e.target.value)}
            required={field.required}
            disabled={!products.find((p) => p.id === productId)?.isEditing}
          />
        ) : field.type === "checkbox" ? (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`${productId}-${field.name}`}
              checked={value === true}
              onCheckedChange={(checked) => updateProductCustomField(productId, field.name, checked)}
              disabled={!products.find((p) => p.id === productId)?.isEditing}
            />
            <Label
              htmlFor={`${productId}-${field.name}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {field.description || `Enable ${field.label.toLowerCase()}`}
            </Label>
          </div>
        ) : field.type === "switch" ? (
          <div className="flex items-center justify-between">
            <Label
              htmlFor={`${productId}-${field.name}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {field.description || `Enable ${field.label.toLowerCase()}`}
            </Label>
            <Switch
              id={`${productId}-${field.name}`}
              checked={value === true}
              onCheckedChange={(checked) => updateProductCustomField(productId, field.name, checked)}
              disabled={!products.find((p) => p.id === productId)?.isEditing}
            />
          </div>
        ) : field.type === "select" ? (
          <Select
            value={value}
            onValueChange={(value) => updateProductCustomField(productId, field.name, value)}
            required={field.required}
            disabled={!products.find((p) => p.id === productId)?.isEditing}
          >
            <SelectTrigger id={`${productId}-${field.name}`}>
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
        ) : field.type === "date" ? (
          <DatePicker
            id={`${productId}-${field.name}`}
            selected={value ? new Date(value) : undefined}
            onSelect={(date) => updateProductCustomField(productId, field.name, date?.toISOString() || "")}
            required={field.required}
            disabled={!products.find((p) => p.id === productId)?.isEditing}
          />
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Raise New RMA</h1>

      {!isSuccess ? (
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
              <CardTitle>Customer Information</CardTitle>
              <CardDescription>Select an existing contact or create a new one</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="contact" className="mb-2 block">
                    Contact
                  </Label>
                  <div className="relative">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => setContactSearchOpen(!contactSearchOpen)}
                    >
                      {selectedContact
                        ? contacts.find((contact) => contact.id === selectedContact)?.company || "Select contact"
                        : "Select contact"}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>

                    {contactSearchOpen && (
                      <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
                        <div className="p-2 border-b">
                          <Input
                            placeholder="Search contacts by company, name, or email..."
                            value={searchQuery}
                            onChange={handleContactSearch}
                            className="w-full"
                          />
                        </div>

                        <div className="max-h-[300px] overflow-y-auto p-1">
                          {filteredContacts.length === 0 ? (
                            <div className="py-6 text-center text-sm text-gray-500">No contacts found</div>
                          ) : (
                            filteredContacts.map((contact) => (
                              <div
                                key={contact.id}
                                className={cn(
                                  "flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-blue-50",
                                  selectedContact === contact.id && "bg-blue-50",
                                )}
                                onClick={() => handleContactSelect(contact.id)}
                              >
                                <Avatar className="h-9 w-9 bg-blue-100 text-blue-700">
                                  <AvatarFallback>{getInitials(contact)}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Building className="h-3.5 w-3.5 text-blue-700 shrink-0" />
                                    <span className="font-medium truncate">{contact.company}</span>
                                  </div>
                                  {contact.name && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <User className="h-3 w-3 shrink-0" />
                                      <span className="truncate">{contact.name}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Mail className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{contact.email}</span>
                                  </div>
                                </div>
                                {selectedContact === contact.id && (
                                  <CheckIcon className="h-4 w-4 shrink-0 text-blue-600" />
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-8">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsContactDialogOpen(true)}
                    className="border-blue-200 hover:bg-blue-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Contact
                  </Button>
                </div>
              </div>

              {selectedContact && (
                <div className="border rounded-md p-4 bg-blue-50 border-blue-200">
                  {contacts
                    .filter((contact) => contact.id === selectedContact)
                    .map((contact) => (
                      <div key={contact.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-blue-700" />
                          <p className="font-medium text-blue-700">{contact.company}</p>
                        </div>
                        {contact.name && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm">{contact.name}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm">{contact.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm">{contact.phone}</p>
                        </div>
                        {contact.address && (
                          <p className="text-sm text-muted-foreground mt-2 pl-6">{contact.address}</p>
                        )}
                      </div>
                    ))}
                </div>
              )}

              <div className="space-y-2 mt-4">
                <Label htmlFor="comments">General Comments</Label>
                <Textarea
                  id="comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add any general comments about this RMA"
                />
              </div>
            </CardContent>

            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Product Details</CardTitle>
                  <CardDescription>Enter the details of the products for RMA</CardDescription>
                </div>
                <Button type="button" onClick={addNewProduct} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              {products.length === 0 ? (
                <div className="text-center py-8 border rounded-md">
                  <p className="text-muted-foreground">No products added yet. Click "Add Product" to begin.</p>
                </div>
              ) : (
                <Accordion
                  type="multiple"
                  className="w-full"
                  value={expandedProducts}
                  onValueChange={setExpandedProducts}
                >
                  {products.map((product, index) => (
                    <AccordionItem
                      value={product.id}
                      key={product.id}
                      className={cn(
                        "border rounded-md mb-4 overflow-hidden",
                        product.isSaved && "border-green-200 bg-green-50",
                      )}
                    >
                      <div className="flex justify-between items-center px-4 py-2 bg-slate-50">
                        <AccordionTrigger className="hover:no-underline py-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              Product {index + 1}:{" "}
                              {product.brand ? `${product.brand} ${product.modelNumber || ""}` : "New Product"}
                            </span>
                            {product.isSaved && (
                              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                                Saved
                              </Badge>
                            )}
                          </div>
                        </AccordionTrigger>
                        <div className="flex items-center gap-2">
                          {product.isSaved ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => editProduct(product.id)}
                              className="h-8 gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              disabled={product.isEditing}
                            >
                              <Edit className="h-4 w-4" />
                              <span>Edit</span>
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => saveProduct(product.id)}
                              className="h-8 gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                              disabled={!product.isEditing}
                            >
                              <Save className="h-4 w-4" />
                              <span>Save</span>
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProduct(product.id)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove product</span>
                          </Button>
                        </div>
                      </div>

                      <AccordionContent className="px-4 pt-2 pb-4">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`brand-${product.id}`}>Brand</Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => setIsBrandDialogOpen(true)}
                                disabled={!product.isEditing}
                              >
                                <Plus className="h-3 w-3" /> Add New Brand
                              </Button>
                            </div>
                            <Select
                              value={product.brand}
                              onValueChange={(value) => updateProduct(product.id, "brand", value)}
                              required
                              disabled={!product.isEditing}
                            >
                              <SelectTrigger id={`brand-${product.id}`}>
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
                            <Label htmlFor={`modelNumber-${product.id}`}>Model Number</Label>
                            <Input
                              id={`modelNumber-${product.id}`}
                              value={product.modelNumber}
                              onChange={(e) => updateProduct(product.id, "modelNumber", e.target.value)}
                              required
                              disabled={!product.isEditing}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`serialNumber-${product.id}`}>Serial Number</Label>
                            <Input
                              id={`serialNumber-${product.id}`}
                              value={product.serialNumber}
                              onChange={(e) => updateProduct(product.id, "serialNumber", e.target.value)}
                              required
                              disabled={!product.isEditing}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`problemsReported-${product.id}`}>Problems Reported</Label>
                            <Textarea
                              id={`problemsReported-${product.id}`}
                              value={product.problemsReported}
                              onChange={(e) => updateProduct(product.id, "problemsReported", e.target.value)}
                              required
                              disabled={!product.isEditing}
                            />
                          </div>

                          {customFields.length > 0 && (
                            <div className="border-t pt-4 mt-4">
                              <h4 className="text-sm font-medium mb-3">Additional Information</h4>
                              <div className="space-y-4">
                                {customFields.map((field) => renderCustomField(field, product.id))}
                              </div>
                            </div>
                          )}

                          {!product.isSaved && product.isEditing && (
                            <div className="flex justify-end mt-4">
                              <Button
                                type="button"
                                onClick={() => saveProduct(product.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Save className="h-4 w-4 mr-2" />
                                Save Product
                              </Button>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>

            <CardFooter className="flex justify-between bg-slate-50 border-t">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || products.filter((p) => p.isSaved).length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting
                  </>
                ) : (
                  "Submit RMA"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      ) : (
        <Card className="border-green-100 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="mb-4 rounded-full bg-green-100 p-3">
                <CheckIcon className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="mb-2 text-2xl font-bold">RMA Created Successfully</h2>
              <p className="mb-6 text-muted-foreground">
                The RMA has been created with ID: <span className="font-medium">{createdRmaId}</span>
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {createdRmaId && (
                  <Button
                    variant="default"
                    onClick={handlePrintRma}
                    disabled={isPrinting}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isPrinting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Printing...
                      </>
                    ) : (
                      <>
                        <Printer className="mr-2 h-4 w-4" />
                        Print RMA
                      </>
                    )}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => createdRmaId && router.push(`/dashboard/view-rma/${createdRmaId}`)}
                >
                  View RMA Details
                </Button>
                <Button variant="outline" onClick={() => router.push("/dashboard")}>
                  Return to Dashboard
                </Button>
              </div>
              {isSendingEmail && (
                <div className="mt-4 flex items-center justify-center text-blue-600">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Sending email notification...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>RMA Created Successfully</AlertDialogTitle>
            <AlertDialogDescription>
              RMA #{createdRmaId} has been created. Would you like to print the RMA document now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => router.push("/dashboard")}>No, Return to Dashboard</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={() => {
                  setIsPrintDialogOpen(false)
                  handlePrintRma()
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Yes, Print RMA
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!isSuccess && (
        <>
          <ContactDialog
            open={isContactDialogOpen}
            onOpenChange={setIsContactDialogOpen}
            onContactAdded={handleContactAdded}
          />
          <BrandDialog open={isBrandDialogOpen} onOpenChange={setIsBrandDialogOpen} onBrandAdded={handleBrandAdded} />
        </>
      )}
    </div>
  )
}
