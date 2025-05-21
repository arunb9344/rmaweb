import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(timestamp: any): string {
  if (!timestamp) return "N/A"

  try {
    // Handle Firestore timestamps
    if (timestamp.toDate && typeof timestamp.toDate === "function") {
      const date = timestamp.toDate()
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(date)
    }

    // Handle Date objects
    if (timestamp instanceof Date) {
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(timestamp)
    }

    // Handle string dates or timestamps
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  } catch (error) {
    console.error("Error formatting date:", error)
    return "Invalid Date"
  }
}
