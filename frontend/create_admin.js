import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCZOi7XNMpmzHLq4kUaFZoMFRHSChwUnUg",
  authDomain: "littlelocals-cc-55.firebaseapp.com",
  projectId: "littlelocals-cc-55",
  storageBucket: "littlelocals-cc-55.firebasestorage.app",
  messagingSenderId: "725277562751",
  appId: "1:725277562751:web:c4cf82acdbe6b704776c4a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function createAdmin() {
  console.log("Creating admin account in Firebase Authentication...");
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, "staff@littlelocals.au", "Staff123!");
    console.log("Admin account created successfully! 🎉");
    console.log("Email: staff@littlelocals.au");
    console.log("Password: Staff123!");
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log("Admin account already exists in Firebase Authentication. 👍");
    } else {
      console.error("Error creating admin account:", error);
    }
  }
}

createAdmin();
