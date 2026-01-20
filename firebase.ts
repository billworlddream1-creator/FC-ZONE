
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

/**
 * Firebase configuration initialized with the environment's API_KEY.
 * The apiKey is automatically injected from process.env.API_KEY.
 */
const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: "fc-zone-nitro.firebaseapp.com",
  projectId: "fc-zone-nitro",
  storageBucket: "fc-zone-nitro.appspot.com",
  messagingSenderId: "777777777777",
  appId: "1:777777777777:web:77777777777777777"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Increase max upload retry time to 10 minutes to prevent timeout errors
storage.maxUploadRetryTime = 600000;
// Increase max operation retry time (e.g. metadata fetches) to 2 minutes
storage.maxOperationRetryTime = 120000;
