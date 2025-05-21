"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Download, FileText, Printer } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { pdf } from "@react-pdf/renderer"
import { SimpleRmaDocument, type CompanyInfo } from "./simple-rma-document"
import { toast } from "@/components/ui/use-toast"
import { collection, doc, getDoc, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface RobustPdfGeneratorProps {
  rmaId: string
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  buttonSize?: "default" | "sm" | "lg" | "icon"
  label?: string
  icon?: boolean
  showPreview?: boolean
  printMode?: boolean
}

export function RobustPdfGenerator({
  rmaId,
  buttonVariant = "outline",
  buttonSize = "default",
  label = "Generate PDF",
  icon = true,
  showPreview = false,
  printMode = false,
}: RobustPdfGeneratorProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [rmaData, setRmaData] = useState<any>(null)
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)

  // Fetch company info from settings
  const fetchCompanyInfo = async (): Promise<CompanyInfo> => {
    try {
      const settingsCollection = collection(db, "settings")
      const settingsSnapshot = await getDocs(settingsCollection)

      if (!settingsSnapshot.empty) {
        const settingsDoc = settingsSnapshot.docs[0]
        const settingsData = settingsDoc.data()

        if (settingsData && settingsData.companyInfo) {
          return settingsData.companyInfo as CompanyInfo
        }
      }

      // Default company info if not found
      return {
        name: "Your Company",
        email: "info@yourcompany.com",
        phone: "(555) 123-4567",
        address: "123 Business Street, City, Country",
      }
    } catch (error) {
      console.error("Error fetching company info:", error)
      return {
        name: "Your Company",
        email: "info@yourcompany.com",
        phone: "(555) 123-4567",
        address: "123 Business Street, City, Country",
      }
    }
  }

  // Load RMA data when needed
  const loadData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch RMA data
      const rmaRef = doc(db, "rmas", rmaId)
      const rmaSnap = await getDoc(rmaRef)

      if (!rmaSnap.exists()) {
        setError("RMA not found")
        return
      }

      const data = {
        id: rmaSnap.id,
        ...rmaSnap.data(),
      }

      setRmaData(data)

      // Fetch company info
      const company = await fetchCompanyInfo()
      setCompanyInfo(company)

      // Generate PDF blob
      try {
        const pdfDoc = <SimpleRmaDocument rma={data} companyInfo={company} />
        const blob = await pdf(pdfDoc).toBlob()
        setPdfBlob(blob)

        // Create URL for the blob
        const url = URL.createObjectURL(blob)
        setPdfUrl(url)
      } catch (pdfError) {
        console.error("PDF generation error:", pdfError)
        setError("Failed to generate PDF")
      }
    } catch (err) {
      console.error("Error loading data for PDF:", err)
      setError("Failed to load RMA data")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGeneratePdf = async () => {
    if (!rmaData) {
      await loadData()
    }

    if (printMode && pdfUrl) {
      // Open print dialog directly
      handlePrint()
    } else if (showPreview) {
      setIsPreviewOpen(true)
    } else if (pdfBlob) {
      // Download the PDF directly
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = `RMA-${rmaId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // Handle direct download
  const handleDownload = () => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = `RMA-${rmaId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setIsPreviewOpen(false)
    }
  }

  // Improved print function that keeps the dialog open
  const handlePrint = async () => {
    if (isPrinting) return

    setIsPrinting(true)

    if (!pdfUrl && !pdfBlob) {
      await loadData()
    }

    if (pdfUrl) {
      // Open a new window with the PDF
      const printWindow = window.open(pdfUrl, "_blank")

      if (printWindow) {
        // Wait for the window to load
        printWindow.onload = () => {
          try {
            // Try to print
            printWindow.print()

            // Close the window after printing (or after cancel)
            const checkIfPrinted = setInterval(() => {
              if (printWindow.document.readyState === "complete") {
                clearInterval(checkIfPrinted)
                // We don't close the window automatically anymore
                // Let the user close it after printing
              }
            }, 1000)
          } catch (error) {
            console.error("Print error:", error)
            toast({
              title: "Print Error",
              description: "There was an error printing the document. Please try again.",
              variant: "destructive",
            })
          }
        }
      } else {
        toast({
          title: "Print Error",
          description: "Could not open print window. Please check your popup blocker settings.",
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "Error",
        description: "PDF not ready for printing. Please try again.",
        variant: "destructive",
      })
    }

    setIsPrinting(false)
  }

  // If there's an error, show it
  if (error) {
    return (
      <Button
        variant="destructive"
        size={buttonSize}
        onClick={() =>
          toast({
            title: "Error",
            description: error,
            variant: "destructive",
          })
        }
      >
        Error Loading PDF
      </Button>
    )
  }

  return (
    <>
      <Button variant={buttonVariant} size={buttonSize} onClick={handleGeneratePdf} disabled={isLoading || isPrinting}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : isPrinting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Printing...
          </>
        ) : (
          <>
            {icon && (printMode ? <Printer className="mr-2 h-4 w-4" /> : <FileText className="mr-2 h-4 w-4" />)}
            {label}
          </>
        )}
      </Button>

      {/* PDF Preview Dialog */}
      {showPreview && (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl h-[80vh]">
            <DialogHeader>
              <DialogTitle>RMA Document Preview</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col space-y-4 h-full">
              {rmaData && !isLoading ? (
                <>
                  <div className="flex-1 border rounded-md overflow-hidden">
                    {pdfUrl ? (
                      <iframe src={pdfUrl} className="w-full h-full border-0" title="PDF Preview" />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        <span className="ml-2">Generating PDF preview...</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                      Close
                    </Button>
                    <div className="flex gap-2">
                      <Button onClick={handlePrint} disabled={!pdfUrl || isPrinting} variant="outline">
                        {isPrinting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Printing...
                          </>
                        ) : (
                          <>
                            <Printer className="mr-2 h-4 w-4" />
                            Print
                          </>
                        )}
                      </Button>
                      <Button onClick={handleDownload} disabled={!pdfBlob}>
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-2">Loading PDF data...</span>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

// Separate component for preview button
export function RobustPdfPreviewButton({ rmaId }: { rmaId: string }) {
  return (
    <RobustPdfGenerator
      rmaId={rmaId}
      buttonVariant="link"
      buttonSize="sm"
      label="Preview PDF"
      icon={true}
      showPreview={true}
    />
  )
}

// Separate component for print button
export function RobustPdfPrintButton({ rmaId }: { rmaId: string }) {
  return (
    <RobustPdfGenerator
      rmaId={rmaId}
      buttonVariant="outline"
      buttonSize="sm"
      label="Print"
      icon={true}
      printMode={true}
    />
  )
}
