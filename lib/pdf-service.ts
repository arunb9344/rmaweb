import { collection, doc, getDoc, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { CompanyInfo } from "@/components/pdf/rma-document"

// Default company info
const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: "Your Company",
  email: "info@yourcompany.com",
  phone: "+1 (555) 123-4567",
  address: "123 Business Street, City, Country",
  logo: "/generic-company-logo.png",
}

/**
 * Fetch RMA data by ID
 */
export async function fetchRmaData(rmaId: string) {
  try {
    const rmaRef = doc(db, "rmas", rmaId)
    const rmaSnap = await getDoc(rmaRef)

    if (rmaSnap.exists()) {
      return {
        id: rmaSnap.id,
        ...rmaSnap.data(),
      }
    }

    console.error("RMA not found:", rmaId)
    return null
  } catch (error) {
    console.error("Error fetching RMA:", error)
    return null
  }
}

/**
 * Fetch company information from settings
 */
export async function fetchCompanyInfo(): Promise<CompanyInfo> {
  try {
    const settingsCollection = collection(db, "settings")
    const settingsSnapshot = await getDocs(settingsCollection)

    if (!settingsSnapshot.empty) {
      const settingsDoc = settingsSnapshot.docs[0]
      const settingsData = settingsDoc.data()

      if (settingsData && settingsData.companyInfo) {
        return {
          ...DEFAULT_COMPANY_INFO,
          ...settingsData.companyInfo,
        }
      }
    }

    return DEFAULT_COMPANY_INFO
  } catch (error) {
    console.error("Error fetching company info:", error)
    return DEFAULT_COMPANY_INFO
  }
}
