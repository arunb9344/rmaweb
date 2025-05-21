"use server"

import { revalidatePath } from "next/cache"
import { db } from "./firebase"
import { doc, deleteDoc } from "firebase/firestore"

// Type definitions
type RmaRequest = {
  id: string
  orderNumber: string
  productName: string
  dateSubmitted: string
  status: string
  customerName: string
  customerEmail: string
  reason: string
  description: string
}

// In a real application, this would connect to a database
const rmaRequests: RmaRequest[] = [
  {
    id: "RMA-2025-001",
    orderNumber: "ORD-12345",
    productName: "Wireless Headphones",
    dateSubmitted: "2025-05-01",
    status: "approved",
    customerName: "John Doe",
    customerEmail: "john@example.com",
    reason: "defective",
    description: "Left earphone not working properly",
  },
  {
    id: "RMA-2025-002",
    orderNumber: "ORD-67890",
    productName: "Smart Watch",
    dateSubmitted: "2025-05-05",
    status: "pending",
    customerName: "Jane Smith",
    customerEmail: "jane@example.com",
    reason: "not-as-described",
    description: "Watch face is different from what was shown online",
  },
]

export async function createRmaRequest(formData: FormData) {
  // Generate a unique ID
  const id = `RMA-2025-${String(rmaRequests.length + 1).padStart(3, "0")}`

  // Get current date
  const dateSubmitted = new Date().toISOString().split("T")[0]

  // Create new RMA request
  const newRequest: RmaRequest = {
    id,
    orderNumber: formData.get("orderNumber") as string,
    productName: formData.get("productName") as string,
    dateSubmitted,
    status: "pending",
    customerName: `${formData.get("firstName")} ${formData.get("lastName")}`,
    customerEmail: formData.get("email") as string,
    reason: formData.get("reason") as string,
    description: formData.get("description") as string,
  }

  // In a real application, this would save to a database
  rmaRequests.push(newRequest)

  // Revalidate the dashboard page to show the new request
  revalidatePath("/dashboard")

  return { success: true, id }
}

export async function getRmaRequests() {
  // In a real application, this would fetch from a database
  return rmaRequests
}

export async function updateRmaStatus(id: string, status: string) {
  // Find the request
  const requestIndex = rmaRequests.findIndex((req) => req.id === id)

  if (requestIndex === -1) {
    return { success: false, error: "RMA request not found" }
  }

  // Update the status
  rmaRequests[requestIndex].status = status

  // Revalidate the dashboard page
  revalidatePath("/dashboard")

  return { success: true }
}

export async function deleteRMA(id: string) {
  try {
    // Delete the RMA document
    await deleteDoc(doc(db, "rmas", id))

    // Revalidate the dashboard page
    revalidatePath("/dashboard")

    return { success: true }
  } catch (error) {
    console.error("Error deleting RMA:", error)
    throw new Error("Failed to delete RMA")
  }
}
