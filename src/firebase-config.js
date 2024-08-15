// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCPB0Fsl_0pA0s6THuPj4hmGD5kz4fBpTs",
  authDomain: "onlinecloset-4f4d7.firebaseapp.com",
  projectId: "onlinecloset-4f4d7",
  storageBucket: "onlinecloset-4f4d7.appspot.com",
  messagingSenderId: "550985597160",
  appId: "1:550985597160:web:88c0e49b6a561f6bb9c95d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider;
export const db = getFirestore(app);