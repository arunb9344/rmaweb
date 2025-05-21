"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, getDoc, collection, query, where, orderBy, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, ArrowLeft, Clock, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { RmaActionsMenu } from "@/components/rma-actions-menu"
import { RobustPdfPrintButton } from "@/components/pdf/robust-pdf-generator"
import { formatDate } from "@/lib/utils"

export default function ViewRmaPage() {
  const { id } = useParams()
  const router = useRouter()
  const rmaId = Array.isArray(id) ? id[0] : id
  const [rma, setRma] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("details")

  useEffect(() => {
    const fetchRma = async () => {
      try {
        const rmaRef = doc(db, "rmas", rmaId)
        const rmaSnap = await getDoc(rmaRef)

        if (rmaSnap.exists()) {
          const rmaData = {
            id: rmaSnap.id,
            ...rmaSnap.data(),
          }
          setRma(rmaData)

          // Fetch history after getting RMA data
          await fetchHistory(rmaId)
        } else {
          setError("RMA not found")
        }
      } catch (err) {
        console.error("Error fetching RMA:", err)
        setError("Failed to load RMA data")
      } finally {
        setLoading(false)
      }
    }

    const fetchHistory = async (rmaId: string) => {
      try {
        const historyRef = collection(db, "rmaHistory")
        const historyQuery = query(historyRef, where("rmaId", "==", rmaId), orderBy("timestamp", "desc"))
        const historySnap = await getDocs(historyQuery)

        const historyData = historySnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        setHistory(historyData)
      } catch (err) {
        console.error("Error fetching RMA history:", err)
      }
    }

    fetchRma()
  }, [rmaId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !rma) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <p className="text-red-500 text-lg">{error || "Failed to load RMA"}</p>
        <Button asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      PROCESSING: { label: "Processing", variant: "default" },
      IN_SERVICE_CENTRE: { label: "In Service Centre", variant: "secondary" },
      READY_TO_DISPATCH: { label: "Ready to Dispatch", variant: "outline" },
      DELIVERED: { label: "Delivered", variant: "destructive" },
    }

    const statusInfo = statusMap[status] || { label: status, variant: "default" }

    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  // Function to get the overall RMA status based on product statuses
  const getOverallStatus = () => {
    if (!rma.products || rma.products.length === 0) {
      return rma.status || "PROCESSING"
    }

    // If any product is still processing, show processing
    if (rma.products.some((p: any) => p.status === "PROCESSING")) {
      return "PROCESSING"
    }

    // If all products are delivered, show delivered
    if (rma.products.every((p: any) => p.status === "DELIVERED")) {
      return "DELIVERED"
    }

    // If any product is ready to dispatch, show ready
    if (rma.products.some((p: any) => p.status === "READY_TO_DISPATCH")) {
      return "READY_TO_DISPATCH"
    }

    // If any product is in service centre, show in service
    if (rma.products.some((p: any) => p.status === "IN_SERVICE_CENTRE")) {
      return "IN_SERVICE_CENTRE"
    }

    return rma.status || "PROCESSING"
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">RMA Details</h1>
          {getStatusBadge(getOverallStatus())}
        </div>
        <div className="flex items-center space-x-2">
          <RobustPdfPrintButton rmaId={rmaId} />
          <RmaActionsMenu rma={rma} />
        </div>
      </div>

      <Card>
        <CardHeader className="bg-muted/50">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>RMA #{rma.id}</CardTitle>
              <CardDescription>Created on {formatDate(rma.createdAt)}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">Customer Information</h3>
                    <Separator className="my-2" />
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="font-medium text-muted-foreground">Company:</dt>
                        <dd>{rma.contactCompany || "N/A"}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="font-medium text-muted-foreground">Contact Name:</dt>
                        <dd>{rma.contactName || "N/A"}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="font-medium text-muted-foreground">Email:</dt>
                        <dd>{rma.contactEmail || "N/A"}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="font-medium text-muted-foreground">Phone:</dt>
                        <dd>{rma.contactPhone || "N/A"}</dd>
                      </div>
                    </dl>
                  </div>

                  {rma.customFields && Object.keys(rma.customFields).length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium">Additional Information</h3>
                      <Separator className="my-2" />
                      <dl className="space-y-2">
                        {Object.entries(rma.customFields).map(([key, value]: [string, any]) => (
                          <div key={key} className="flex justify-between">
                            <dt className="font-medium text-muted-foreground">{key}:</dt>
                            <dd>{value || "N/A"}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">Issue Details</h3>
                    <Separator className="my-2" />
                    <dl className="space-y-2">
                      {rma.comments && (
                        <div>
                          <dt className="font-medium text-muted-foreground mb-1">Additional Comments:</dt>
                          <dd className="bg-muted p-2 rounded">{rma.comments}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              </div>

              {/* Products Section */}
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">Products</h3>
                <div className="space-y-4">
                  {rma.products && rma.products.length > 0 ? (
                    rma.products.map((product: any, index: number) => (
                      <Card
                        key={index}
                        className={`overflow-hidden ${
                          product.status === "DELIVERED"
                            ? "border-green-500"
                            : product.status === "READY_TO_DISPATCH"
                              ? "border-blue-500"
                              : product.status === "IN_SERVICE_CENTRE"
                                ? "border-purple-500"
                                : "border-gray-200"
                        }`}
                      >
                        <CardHeader className="bg-muted/30 py-3">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-base">Product #{index + 1}</CardTitle>
                            {getStatusBadge(product.status || "PROCESSING")}
                          </div>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <dl className="space-y-2">
                                <div className="flex justify-between">
                                  <dt className="font-medium text-muted-foreground">Brand:</dt>
                                  <dd>{product.brand || "N/A"}</dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="font-medium text-muted-foreground">Model Number:</dt>
                                  <dd>{product.modelNumber || "N/A"}</dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="font-medium text-muted-foreground">Serial Number:</dt>
                                  <dd>{product.serialNumber || "N/A"}</dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="font-medium text-muted-foreground">Service Centre:</dt>
                                  <dd>
                                    {product.serviceCentre?.name || product.serviceCentreName ? (
                                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300">
                                        {product.serviceCentre?.name || product.serviceCentreName}
                                      </Badge>
                                    ) : (
                                      "Not specified"
                                    )}
                                  </dd>
                                </div>
                              </dl>
                            </div>
                            <div>
                              <dt className="font-medium text-muted-foreground mb-1">Problems Reported:</dt>
                              <dd className="bg-muted p-2 rounded">{product.problemsReported || "N/A"}</dd>

                              {product.serviceRemarks && (
                                <div className="mt-2">
                                  <dt className="font-medium text-muted-foreground mb-1">Service Remarks:</dt>
                                  <dd className="bg-muted p-2 rounded">{product.serviceRemarks}</dd>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    // Legacy single product display
                    <Card>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <dl className="space-y-2">
                              <div className="flex justify-between">
                                <dt className="font-medium text-muted-foreground">Brand:</dt>
                                <dd>{rma.brand || "N/A"}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="font-medium text-muted-foreground">Model Number:</dt>
                                <dd>{rma.modelNumber || "N/A"}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="font-medium text-muted-foreground">Serial Number:</dt>
                                <dd>{rma.serialNumber || "N/A"}</dd>
                              </div>
                            </dl>
                          </div>
                          <div>
                            <dt className="font-medium text-muted-foreground mb-1">Problems Reported:</dt>
                            <dd className="bg-muted p-2 rounded">{rma.problemsReported || "N/A"}</dd>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history">
              <div className="space-y-4">
                {history.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                    {history.map((event, index) => (
                      <div key={index} className="relative pl-10 pb-8">
                        <div className="absolute left-0 top-1 bg-white p-1">
                          {event.type === "status_change" ? (
                            <CheckCircle2 className="h-6 w-6 text-blue-500" />
                          ) : (
                            <Clock className="h-6 w-6 text-gray-500" />
                          )}
                        </div>
                        <div className="bg-white p-4 rounded-lg border">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium">{event.title || "Status Updated"}</h4>
                            <span className="text-sm text-gray-500">{formatDate(event.timestamp)}</span>
                          </div>
                          <p className="text-gray-600 mt-1">{event.description}</p>
                          {event.productDetails && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                              <p>
                                <span className="font-medium">Product:</span> {event.productDetails.brand}{" "}
                                {event.productDetails.modelNumber}
                              </p>
                              <p>
                                <span className="font-medium">Serial:</span> {event.productDetails.serialNumber}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-muted p-6 rounded text-center">
                    <p className="text-muted-foreground">No history records found for this RMA.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
