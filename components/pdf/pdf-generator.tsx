"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Printer, Download } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer"
import { RmaDocument, type CompanyInfo } from "./rma-document"
import { toast } from "@/components/ui/use-toast"
import { fetchCompanyInfo, fetchRmaData } from "@/lib/pdf-service"

interface PdfGeneratorProps {
  rmaId: string
  variant?: "button" | "link"
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  buttonSize?: "default" | "sm" | "lg" | "icon"
  label?: string
  icon?: boolean
  showPreview?: boolean
  onGenerated?: () => void
}

export function PdfGenerator({
  rmaId,
  variant = "button",
  buttonVariant = "outline",
  buttonSize = "default",
  label = "Generate PDF",
  icon = true,
  showPreview = true,
  onGenerated,
}: PdfGeneratorProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [rmaData, setRmaData] = useState<any>(null)
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load RMA data and company info when needed
  const loadData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch RMA data
      const rma = await fetchRmaData(rmaId)
      if (!rma) {
        setError("RMA not found")
        return
      }

      // Fetch company info
      const company = await fetchCompanyInfo()

      setRmaData(rma)
      setCompanyInfo(company)

      if (onGenerated) {
        onGenerated()
      }
    } catch (err) {
      console.error("Error loading data for PDF:", err)
      setError("Failed to load data for PDF generation")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGeneratePdf = async () => {
    if (!rmaData || !companyInfo) {
      await loadData()
    }

    if (showPreview) {
      setIsPreviewOpen(true)
    }
  }

  // Load data when component mounts
  useEffect(() => {
    if (variant === "link") {
      loadData()
    }
  }, [variant, rmaId])

  // If there's an error, show it
  if (error) {
    return (
      <Button
        variant={buttonVariant}
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

  // For link variant, render the download link
  if (variant === "link" && rmaData && companyInfo) {
    return (
      <PDFDownloadLink
        document={<RmaDocument rma={rmaData} companyInfo={companyInfo} />}
        fileName={`RMA-${rmaId}.pdf`}
        style={{ textDecoration: "none" }}
      >
        {({ loading, error }) => {
          if (error) {
            console.error("PDF generation error:", error)
            return (
              <Button variant={buttonVariant} size={buttonSize} className="text-red-500">
                Error generating PDF
              </Button>
            )
          }

          return (
            <Button variant={buttonVariant} size={buttonSize} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  {icon && <Download className="mr-2 h-4 w-4" />}
                  {label}
                </>
              )}
            </Button>
          )
        }}
      </PDFDownloadLink>
    )
  }

  // For button variant, render a button that opens the preview
  return (
    <>
      <Button variant={buttonVariant} size={buttonSize} onClick={handleGeneratePdf} disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            {icon && <Printer className="mr-2 h-4 w-4" />}
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
              {rmaData && companyInfo ? (
                <>
                  <div className="flex-1 border rounded-md overflow-hidden">
                    <PDFViewer width="100%" height="100%" className="border-0">
                      <RmaDocument rma={rmaData} companyInfo={companyInfo} />
                    </PDFViewer>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                      Close
                    </Button>
                    <PDFDownloadLink
                      document={<RmaDocument rma={rmaData} companyInfo={companyInfo} />}
                      fileName={`RMA-${rmaId}.pdf`}
                      style={{ textDecoration: "none" }}
                    >
                      {({ loading, error }) => (
                        <Button disabled={loading}>
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Preparing download...
                            </>
                          ) : (
                            <>
                              <Download className="mr-2 h-4 w-4" />
                              Download PDF
                            </>
                          )}
                        </Button>
                      )}
                    </PDFDownloadLink>
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
export function PdfPreviewButton({ rmaId }: { rmaId: string }) {
  return (
    <PdfGenerator
      rmaId={rmaId}
      buttonVariant="link"
      buttonSize="sm"
      label="Preview PDF"
      icon={true}
      showPreview={true}
    />
  )
}
