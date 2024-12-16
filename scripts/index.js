import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-analytics.js";
import { firebaseConfig } from "../config/firebase.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .then((result) => {
            const user = result.user;
            window.location.href = "home.html";
            console.log("Signed in as:", user.displayName);
        })
        .catch((error) => {
            console.error("Error signing in with Google:", error.message);
        });
}

function signOut() {
    firebaseSignOut(auth)
        .then(() => {
            window.location.href = "index.html";
            console.log("Signed out successfully.");
        })
        .catch((error) => console.error("Sign-out error:", error.message));
}

// Attach functions to the window object for global access
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
