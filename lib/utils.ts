import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const getServiceCentreColor = (serviceCentreName) => {
  // Return a consistent color based on the service centre name
  // Example implementation (can be adjusted based on project's color scheme)
  const colors = {
    "Service Centre A": "bg-blue-100 text-blue-800 border-blue-300",
    "Service Centre B": "bg-green-100 text-green-800 border-green-300",
    "Service Centre C": "bg-yellow-100 text-yellow-800 border-yellow-300",
  }

  return colors[serviceCentreName] || "bg-gray-100 text-gray-800 border-gray-300"
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
