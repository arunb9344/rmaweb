import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

// Replace this with your actual Firebase config from the Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyAAxx059pE6R1MWJAih16hZhSmpMo-7-r4",
  authDomain: "rma-website-5bc61.firebaseapp.com",
  projectId: "rma-website-5bc61",
  storageBucket: "rma-website-5bc61.firebasestorage.app",
  messagingSenderId: "157288741606",
  appId: "1:157288741606:web:34d4d25d806bcbe5fc1927",
  measurementId: "G-5TKJFHNBYQ",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app)

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app)

export default app
