"use client"

import { useState, useRef, useEffect } from "react"
import { MoreHorizontal, Eye, Pencil, Trash2, Send, Printer, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { doc, deleteDoc, getDoc, collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
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
import { SimpleRmaDocument } from "./pdf/simple-rma-document"
import { pdf } from "@react-pdf/renderer"
import { sendRMAConfirmationEmail } from "@/lib/email"

interface RmaActionsMenuProps {
  rmaId: string
  status: string
}

export function RMAActionsMenu({ rmaId, status }: RmaActionsMenuProps) {
  const router = useRouter()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSendingToService, setIsSendingToService] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const printFrameRef = useRef<HTMLIFrameElement | null>(null)

  // Clean up any existing print frames when component unmounts
  useEffect(() => {
    return () => {
      if (printFrameRef.current && document.body.contains(printFrameRef.current)) {
        document.body.removeChild(printFrameRef.current)
      }
    }
  }, [])

  const handleViewDetails = () => {
    router.push(`/dashboard/view-rma/${rmaId}`)
  }

  const handleEditRma = () => {
    router.push(`/dashboard/edit-rma/${rmaId}`)
  }

  const handleDeleteRma = async () => {
    setIsDeleting(true)
    try {
      await deleteDoc(doc(db, "rmas", rmaId))
      toast({
        title: "RMA Deleted",
        description: "The RMA has been deleted successfully",
      })
      // Force a refresh of the page to update the UI
      window.location.reload()
    } catch (error) {
      console.error("Error deleting RMA:", error)
      toast({
        title: "Error",
        description: "Failed to delete RMA. Please try again.",
        variant: "destructive",
      })
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
    }
  }

  const handleSendToCustomer = async () => {
    setIsSendingEmail(true)
    try {
      // Fetch RMA data
      const rmaRef = doc(db, "rmas", rmaId)
      const rmaSnap = await getDoc(rmaRef)

      if (!rmaSnap.exists()) {
        toast({
          title: "Error",
          description: "RMA not found",
          variant: "destructive",
        })
        setIsSendingEmail(false)
        return
      }

      const rmaData = rmaSnap.data()

      console.log("Sending email to customer:", rmaData.contactEmail)

      // Get product details for email
      let productDetails = ""
      if (Array.isArray(rmaData.products) && rmaData.products.length > 0) {
        productDetails = rmaData.products.map((p: any) => `${p.brand} ${p.modelNumber}`).join(", ")
      } else {
        productDetails = `${rmaData.brand} ${rmaData.modelNumber}`
      }

      // Send email to customer
      await sendRMAConfirmationEmail({
        to: rmaData.contactEmail, // Use the contact's email from the RMA data
        name: rmaData.contactName || rmaData.contactCompany,
        rmaId: rmaId,
        productDetails: productDetails,
        allFields: {
          ...rmaData,
          id: rmaId,
        },
      })

      toast({
        title: "Email Sent",
        description: "Email has been sent to the customer",
      })
    } catch (error) {
      console.error("Error sending email:", error)
      toast({
        title: "Error",
        description: "Failed to send email to customer",
        variant: "destructive",
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  // Updated print function to match the RMA submission page approach
  const handlePrint = async () => {
    if (isPrinting || !rmaId) return

    setIsPrinting(true)

    try {
      // Fetch RMA data
      const rmaRef = doc(db, "rmas", rmaId)
      const rmaSnap = await getDoc(rmaRef)

      if (!rmaSnap.exists()) {
        toast({
          title: "Error",
          description: "RMA not found",
          variant: "destructive",
        })
        setIsPrinting(false)
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
      printFrame.style.zIndex = "9999"
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

                // Listen for the print dialog to close
                const checkPrintDialogClosed = setInterval(() => {
                  if (document.hasFocus()) {
                    clearInterval(checkPrintDialogClosed)
                    setIsPrinting(false)

                    // Clean up after a delay
                    setTimeout(() => {
                      if (document.body.contains(printFrame)) {
                        document.body.removeChild(printFrame)
                        URL.revokeObjectURL(url)
                      }
                    }, 1000)
                  }
                }, 1000)
              } catch (error) {
                console.error("Print error:", error)
                setIsPrinting(false)
                if (document.body.contains(printFrame)) {
                  document.body.removeChild(printFrame)
                  URL.revokeObjectURL(url)
                }
              }
            }, 1000)
          }
        } catch (error) {
          console.error("Print error:", error)
          setIsPrinting(false)
          if (document.body.contains(printFrame)) {
            document.body.removeChild(printFrame)
            URL.revokeObjectURL(url)
          }
          toast({
            title: "Print Error",
            description: "Failed to print the document. Please try again.",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("Error printing RMA:", error)
      setIsPrinting(false)
      toast({
        title: "Print Error",
        description: "Failed to generate or print the RMA document.",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleViewDetails}>
            <Eye className="mr-2 h-4 w-4" />
            <span>View Details</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleEditRma}>
            <Pencil className="mr-2 h-4 w-4" />
            <span>Edit RMA</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handlePrint} disabled={isPrinting}>
            {isPrinting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Printing...</span>
              </>
            ) : (
              <>
                <Printer className="mr-2 h-4 w-4" />
                <span>Print RMA</span>
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSendToCustomer} disabled={isSendingEmail}>
            {isSendingEmail ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                <span>Email to Customer</span>
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-red-600 focus:text-red-600">
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete RMA</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this RMA. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRma} className="bg-red-600 hover:bg-red-700" disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// Add this additional export with the exact name expected by the import
export const RmaActionsMenu = RMAActionsMenu
