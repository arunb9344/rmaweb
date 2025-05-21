"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { collection, writeBatch, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Loader2, Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react"
import * as XLSX from "xlsx"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"

interface ImportContactsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete: (count: number) => void
}

interface ContactData {
  name: string
  email: string
  phone: string
  company: string
  address?: string
}

export function ImportContactsDialog({ open, onOpenChange, onImportComplete }: ImportContactsDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<ContactData[]>([])
  const [importStatus, setImportStatus] = useState<
    "idle" | "validating" | "ready" | "importing" | "complete" | "error"
  >("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [progress, setProgress] = useState(0)
  const [importedCount, setImportedCount] = useState(0)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setImportStatus("validating")

    try {
      const data = await readExcelFile(selectedFile)
      validateData(data)
      setPreviewData(data.slice(0, 5)) // Preview first 5 rows
      setImportStatus("ready")
    } catch (error: any) {
      setErrorMessage(error.message || "Invalid file format")
      setImportStatus("error")
    }
  }

  const readExcelFile = (file: File): Promise<ContactData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: "binary" })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const json = XLSX.utils.sheet_to_json(worksheet)

          // Map the data to our contact structure
          const contacts = json.map((row: any) => ({
            name: row.name || row.Name || "",
            email: row.email || row.Email || "",
            phone: row.phone || row.Phone || "",
            company: row.company || row.Company || "Your Company",
            address: row.address || row.Address || "",
          }))

          resolve(contacts)
        } catch (error) {
          reject(new Error("Failed to parse Excel file"))
        }
      }

      reader.onerror = () => {
        reject(new Error("Failed to read file"))
      }

      reader.readAsBinaryString(file)
    })
  }

  const validateData = (data: ContactData[]) => {
    if (data.length === 0) {
      throw new Error("The file contains no data")
    }

    // Check if required fields are present
    for (let i = 0; i < data.length; i++) {
      const contact = data[i]
      if (!contact.name) {
        throw new Error(`Row ${i + 1}: Name is required`)
      }
      if (!contact.email) {
        throw new Error(`Row ${i + 1}: Email is required`)
      }
      if (!contact.phone) {
        throw new Error(`Row ${i + 1}: Phone is required`)
      }
    }
  }

  const handleImport = async () => {
    if (!file || importStatus !== "ready") return

    setImportStatus("importing")
    setIsLoading(true)
    setProgress(0)

    try {
      const data = await readExcelFile(file)

      // Use batched writes for better performance
      const batchSize = 20
      const batches = Math.ceil(data.length / batchSize)
      let importedCount = 0

      for (let i = 0; i < batches; i++) {
        const batch = writeBatch(db)
        const start = i * batchSize
        const end = Math.min(start + batchSize, data.length)

        for (let j = start; j < end; j++) {
          const contact = data[j]
          const docRef = doc(collection(db, "contacts"))
          batch.set(docRef, contact)
        }

        await batch.commit()
        importedCount += end - start
        setProgress(Math.round((importedCount / data.length) * 100))
      }

      setImportedCount(importedCount)
      setImportStatus("complete")

      toast({
        title: "Import Successful",
        description: `${importedCount} contacts have been imported successfully`,
      })

      onImportComplete(importedCount)
    } catch (error) {
      console.error("Error importing contacts:", error)
      setErrorMessage("Failed to import contacts. Please try again.")
      setImportStatus("error")

      toast({
        title: "Import Failed",
        description: "There was an error importing your contacts",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetImport = () => {
    setFile(null)
    setPreviewData([])
    setImportStatus("idle")
    setErrorMessage("")
    setProgress(0)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          resetImport()
        }
        onOpenChange(newOpen)
      }}
    >
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Contacts</DialogTitle>
          <DialogDescription>
            Import contacts from an Excel file. The file should have columns for name, email, phone, company, and
            address.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {importStatus === "idle" && (
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
              <p className="mb-2 text-sm text-muted-foreground">Upload an Excel file (.xlsx) with your contacts</p>
              <p className="text-xs text-muted-foreground mb-4">Required columns: name, email, phone, company</p>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
                id="contact-import"
              />
              <label htmlFor="contact-import">
                <Button variant="outline" className="gap-2" as="span">
                  <Upload className="h-4 w-4" />
                  Select File
                </Button>
              </label>
            </div>
          )}

          {importStatus === "validating" && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
              <p>Validating file...</p>
            </div>
          )}

          {importStatus === "error" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {importStatus === "ready" && (
            <>
              <Alert className="bg-blue-50 border-blue-200">
                <FileSpreadsheet className="h-4 w-4 text-blue-500" />
                <AlertTitle className="text-blue-700">File Ready to Import</AlertTitle>
                <AlertDescription>{file?.name} - Preview of first 5 contacts shown below</AlertDescription>
              </Alert>

              <div className="border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.map((contact, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {contact.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.phone}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.company}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {importStatus === "importing" && (
            <div className="space-y-4">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
                <p className="mb-2">Importing contacts...</p>
                <p className="text-sm text-muted-foreground">{progress}% complete</p>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {importStatus === "complete" && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-700">Import Complete</AlertTitle>
              <AlertDescription>Successfully imported {importedCount} contacts</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          {importStatus === "error" && (
            <Button type="button" variant="outline" onClick={resetImport}>
              Try Again
            </Button>
          )}

          {importStatus === "ready" && (
            <>
              <Button type="button" variant="outline" onClick={resetImport}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleImport}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing
                  </>
                ) : (
                  "Import Contacts"
                )}
              </Button>
            </>
          )}

          {importStatus === "complete" && (
            <Button type="button" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
