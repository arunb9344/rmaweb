"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Printer, Download, Eye } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer"
import { RmaPdfDocument } from "./rma-pdf-document"
import { toast } from "@/components/ui/use-toast"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface CompanyInfo {
  name: string
  email: string
  phone: string
  address: string
  website: string
  logo: string
}

interface RmaPdfGeneratorProps {
  rmaData: any
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  buttonSize?: "default" | "sm" | "lg" | "icon"
  showPreview?: boolean
  label?: string
  icon?: boolean
}

export function RmaPdfGenerator({
  rmaData,
  buttonVariant = "outline",
  buttonSize = "default",
  showPreview = true,
  label = "Generate PDF",
  icon = true,
}: RmaPdfGeneratorProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: "AK Infotech",
    email: "support@akinfotech.com",
    phone: "+91 98765 43210",
    address: "123 Tech Street, Business Park, Mumbai, Maharashtra 400001",
    website: "https://akinfotech.com",
    logo: "/generic-company-logo.png",
  })

  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        const settingsCollection = collection(db, "settings")
        const settingsSnapshot = await getDocs(settingsCollection)

        if (!settingsSnapshot.empty) {
          const settingsDoc = settingsSnapshot.docs[0]
          const settingsData = settingsDoc.data()

          if (settingsData && settingsData.companyInfo) {
            setCompanyInfo(settingsData.companyInfo)
          }
        }
      } catch (error) {
        console.error("Error fetching company info:", error)
      }
    }

    fetchCompanyInfo()
  }, [])

  const handleGeneratePdf = () => {
    setIsGenerating(true)
    // Simulate PDF generation delay
    setTimeout(() => {
      setIsGenerating(false)
      if (showPreview) {
        setIsPreviewOpen(true)
      } else {
        // If no preview, just show a success message
        toast({
          title: "PDF Generated",
          description: "Your RMA PDF has been generated and is downloading.",
        })
      }
    }, 1000)
  }

  // This component renders the PDF download link directly
  const PdfDownloadButton = () => (
    <PDFDownloadLink
      document={<RmaPdfDocument rmaData={rmaData} companyInfo={companyInfo} />}
      fileName={`RMA-${rmaData.id || "document"}.pdf`}
      style={{ textDecoration: "none" }}
    >
      {({ loading, error }) => {
        if (error) {
          console.error("PDF generation error:", error)
          return (
            <Button variant={buttonVariant} size={buttonSize} disabled>
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

  return (
    <>
      {showPreview ? (
        <Button variant={buttonVariant} size={buttonSize} onClick={handleGeneratePdf} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              {icon && <Printer className="mr-2 h-4 w-4" />}
              {label}
            </>
          )}
        </Button>
      ) : (
        <PdfDownloadButton />
      )}

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>RMA Document Preview</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col space-y-4 h-full">
            <div className="flex-1 border rounded-md overflow-hidden">
              <PDFViewer width="100%" height="100%" className="border-0">
                <RmaPdfDocument rmaData={rmaData} companyInfo={companyInfo} />
              </PDFViewer>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                Close
              </Button>
              <PdfDownloadButton />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function RmaPdfPreviewButton({ rmaData }: { rmaData: any }) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: "AK Infotech",
    email: "support@akinfotech.com",
    phone: "+91 98765 43210",
    address: "123 Tech Street, Business Park, Mumbai, Maharashtra 400001",
    website: "https://akinfotech.com",
    logo: "/generic-company-logo.png",
  })

  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        const settingsCollection = collection(db, "settings")
        const settingsSnapshot = await getDocs(settingsCollection)

        if (!settingsSnapshot.empty) {
          const settingsDoc = settingsSnapshot.docs[0]
          const settingsData = settingsDoc.data()

          if (settingsData && settingsData.companyInfo) {
            setCompanyInfo(settingsData.companyInfo)
          }
        }
      } catch (error) {
        console.error("Error fetching company info:", error)
      }
    }

    fetchCompanyInfo()
  }, [])

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(true)}>
        <Eye className="mr-2 h-4 w-4" />
        Preview PDF
      </Button>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>RMA Document Preview</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col space-y-4 h-full">
            <div className="flex-1 border rounded-md overflow-hidden">
              <PDFViewer width="100%" height="100%" className="border-0">
                <RmaPdfDocument rmaData={rmaData} companyInfo={companyInfo} />
              </PDFViewer>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                Close
              </Button>
              <PDFDownloadLink
                document={<RmaPdfDocument rmaData={rmaData} companyInfo={companyInfo} />}
                fileName={`RMA-${rmaData.id || "document"}.pdf`}
                style={{ textDecoration: "none" }}
              >
                {({ loading, error }) => {
                  if (error) {
                    console.error("PDF generation error:", error)
                    return <Button disabled>Error generating PDF</Button>
                  }

                  return (
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
                  )
                }}
              </PDFDownloadLink>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
