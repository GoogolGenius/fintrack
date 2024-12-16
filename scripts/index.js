import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import {
    getDatabase,
    ref,
    set,
    get,
    push,
    remove,
    update,
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-analytics.js";
import { firebaseConfig } from "../config/firebase.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let user;
let uid;

onAuthStateChanged(auth, (u) => {
    user = u;
    uid = user ? user.uid : null;

    if (u) {
        fetchTransactions();
        console.log("fetched transaction");
        console.log("User is logged in:", user); // Access the user object here
        console.log("User ID:", user.uid);
    } else {
        console.log("No user is logged in.");
        // Restrict access if user is not authenticated
        const containsSignedOutPath = ["home", "summary", "history"].some(word => window.location.href.includes(word));
        if (containsSignedOutPath) {
            window.location.href = "login.html";
        }
    }
});

function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .then((result) => {
            user = result.user;
            uid = user.uid;

            window.location.href = "home.html";
            console.log("Signed in as:", user.displayName);
            console.log(uid);
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

function addTransaction(transaction) {
    if (!user) {
        console.error("User is not signed in.");
        return;
    }

    const transactionsRef = ref(db, `users/${uid}/transactions`);
    const newTransactionRef = push(transactionsRef);
    set(newTransactionRef, transaction)
        .then(() => console.log("Transaction added:", transaction))
        .catch((error) =>
            console.error("Error adding transaction:", error.message)
        );
}

function removeTransaction(transactionId) {
    if (!user) {
        console.error("User is not signed in.");
        return;
    }

    const transactionRef = ref(
        db,
        `users/${uid}/transactions/${transactionId}`
    );
    remove(transactionRef)
        .then(() => console.log("Transaction removed:", transactionId))
        .catch((error) =>
            console.error("Error removing transaction:", error.message)
        );
}

function updateTransaction(transactionId, updatedData) {
    if (!user) {
        console.error("User is not signed in.");
        return;
    }

    const transactionRef = ref(
        db,
        `users/${uid}/transactions/${transactionId}`
    );
    update(transactionRef, updatedData)
        .then(() =>
            console.log("Transaction updated:", transactionId, updatedData)
        )
        .catch((error) =>
            console.error("Error updating transaction:", error.message)
        );
}

// function fetchTransactions(callback) {
//     if (!user) {
//         console.error("User is not signed in.");
//         return;
//     }

//     const transactionsRef = ref(db, `users/${uid}/transactions`);
//     onValue(transactionsRef, (snapshot) => {
//         const data = snapshot.val();
//         callback(data);
//     });
// }

function fetchTransactions() {
    const user = auth.currentUser;
    if (!user) {
        console.error("User is not signed in.");
        return;
    }

    // Get transactions for the logged-in user
    const userTransactionsRef = ref(db, "users/" + uid + "/transactions");
    get(userTransactionsRef)
        .then((snapshot) => {
            console.log("running in .then");
            console.log(snapshot.exists());
            if (snapshot.exists()) {
                console.log("Transactions found:", snapshot.val());
                const transactions = snapshot.val(); // Database of transactions
                // Convert object to array for easier iteration
                const transactionArray = Object.values(transactions);
                displayTransactionCards(transactionArray);
            } else {
                console.log("No transactions found.");
            }
        })
        .catch((error) => {
            console.error("Error fetching transactions:", error);
        });
}

function displayTransactionCards(transactions) {
    const container = document.getElementById("transaction-container");
    const noTransactionsMessage = document.getElementById(
        "no-transactions-message"
    );
    const balanceValue = document.getElementById("balanceValue");

    let balance = 0;
    container.innerHTML = ""; // Clear any existing cards

    transactions.forEach((transaction) => {
        balance += transaction.amount;

        const card = document.createElement("div");
        card.classList.add("transaction-card");

        const category = document.createElement("h3");
        category.textContent = transaction.category;
        const amount = document.createElement("p");
        amount.textContent = `Amount: $${transaction.amount}`;
        const date = document.createElement("p");
        date.textContent = `Date: ${transaction.date}`;

        card.appendChild(category);
        card.appendChild(amount);
        card.appendChild(date);

        container.appendChild(card);

        noTransactionsMessage.style.display = "none";
    });

    balanceValue.textContent = `$${balance}`;
}

// Attach functions to the window object for global access
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
window.addTransaction = addTransaction;
window.removeTransaction = removeTransaction;
window.updateTransaction = updateTransaction;
window.fetchTransactions = fetchTransactions;
window.displayTransactionCards = displayTransactionCards;
