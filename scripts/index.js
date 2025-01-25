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
        const containsSignedOutPath = ["home", "summary", "history"].some(
            (word) => window.location.href.includes(word)
        );
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

// Add a new transaction
// Access elements
const openModalBtn = document.getElementById("open-modal-btn");
const transactionDialog = document.getElementById("transaction-dialog");
const transactionForm = document.getElementById("transaction-form");

// Open the dialog

if (openModalBtn && transactionDialog && transactionForm) {
    openModalBtn.addEventListener("click", () => {
        transactionDialog.showModal();
    });

    // Handle form submission
    transactionForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const title = document.getElementById("transaction-title").value;
        const category = document.getElementById("transaction-category").value;
        const amount = parseFloat(
            document.getElementById("transaction-amount").value
        );
        const date = document.getElementById("transaction-date").value;

        if (!title || !category || isNaN(amount) || !date) {
            alert("Please fill in all fields.");
            return;
        }

        const newTransaction = {
            title,
            category,
            amount,
            date,
        };

        // Add transaction to the database
        try {
            addTransaction(newTransaction);
            transactionForm.reset();
            transactionDialog.close();
            fetchTransactions(); // Update UI
        } catch (error) {
            console.error(
                "Error in the proecess of adding transaction:",
                error.message
            );
        }
    });
}

// Close the dialog when "Cancel" is clicked
const cancelBtn = document.getElementById("cancel-btn");
if (cancelBtn && transactionDialog) {
    cancelBtn.addEventListener("click", () => {
        transactionDialog.close();
    });
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
    const userTransactionsRef = ref(db, `users/${uid}/transactions`);
    get(userTransactionsRef)
        .then((snapshot) => {
            console.log("Running in .then");
            if (snapshot.exists()) {
                console.log("Transactions found:", snapshot.val());
                const transactions = snapshot.val();

                // Use Object.entries to get an array of [key, value] pairs
                const transactionArray = Object.entries(transactions).map(
                    ([transactionId, transaction]) => ({
                        transactionId,
                        ...transaction,
                    })
                );
                try {
                    displayTransactionCards(transactionArray); 
                    console.info(transactionArray);
               } catch (error) {
                    console.error("Error displaying transactions:", error); 
               }
               try {
                    plotTransactions(transactionArray); 
               } catch (error) {
                    console.error("Error plotting transactions:", error); 
               }
            } else {
                console.log("No transactions found.");
                displayTransactionCards([]); // Ensure empty UI when no transactions exist
            }
        })
        .catch((error) => {
            console.error("Error fetching transactions:", error);
        });
}
function plotTransactions(transactionArray) {
    const ctx = document.getElementById('transactionsChart').getContext('2d');
    
    // Extract data for the chart
    const dates = transactionArray.map(transaction => transaction.date); 
    const amounts = transactionArray.map(transaction => transaction.amount); 
    
    // Combine dates and amounts into a single array for sorting
    const sortedData = dates.map((date, index) => ({ date, amount: amounts[index] }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Separate the sorted data back into individual arrays
    const sortedDates = sortedData.map(item => item.date);
    const sortedAmounts = sortedData.map(item => item.amount);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Transaction Amount',
                data: amounts,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                fill: false
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day'
                    }
                },
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}
function displayTransactionCards(transactions) {
    const container = document.getElementById("transaction-container");
    const noTransactionsMessage = document.getElementById(
        "no-transactions-message"
    );
    const balanceValue = document.getElementById("balanceValue");

    let balance = 0;
    container.innerHTML = ""; // Clear existing cards

    if (!transactions || transactions.length === 0) {
        if (noTransactionsMessage)
            noTransactionsMessage.style.display = "block";
        return;
    }
    if (noTransactionsMessage) noTransactionsMessage.style.display = "none";

    // Create transaction cards
    transactions.forEach((transaction) => {
        const { transactionId, title, category, amount, date } = transaction;
        balance += amount;

        const card = document.createElement("div");
        card.classList.add("transaction-card");

        card.innerHTML = `
            <h3>${title}</h3>
            <p>Category: ${category}</p>
            <p>Amount: $${amount.toFixed(2)}</p>
            <p>Date: ${date}</p>
            <button class="remove-btn" data-id="${transactionId}">Remove</button>
            <button class="update-btn" data-id="${transactionId}">Update</button>
        `;

        container.appendChild(card);
    });

    balanceValue.textContent = `$${balance.toFixed(2)}`;

    // Attach event listeners for remove and update buttons
    container.querySelectorAll(".remove-btn").forEach((btn) =>
        btn.addEventListener("click", (e) => {
            const transactionId = e.target.dataset.id;
            removeTransaction(transactionId);
            fetchTransactions(); // Refresh the list
        })
    );

    container.querySelectorAll(".update-btn").forEach((btn) =>
        btn.addEventListener("click", (e) => {
            const transactionId = e.target.dataset.id;
            const transaction = transactions.find(
                (t) => t.transactionId === transactionId
            );
            openUpdateModal(transactionId, transaction);
        })
    );
}

// Open a modal for updating a transaction
function openUpdateModal(transactionId, transaction) {
    const transactionDialog = document.getElementById(
        "transaction-dialog-update"
    );
    const transactionForm = document.getElementById("transaction-form-update");

    // Populate form fields with transaction data
    document.getElementById("transaction-title-update").value =
        transaction.title;
    document.getElementById("transaction-category-update").value =
        transaction.category;
    document.getElementById("transaction-amount-update").value =
        transaction.amount;
    document.getElementById("transaction-date-update").value = transaction.date;

    // Update the form's submit event to handle updates
    transactionForm.onsubmit = (event) => {
        event.preventDefault();

        const updatedTransaction = {
            title: document.getElementById("transaction-title-update").value,
            category: document.getElementById("transaction-category-update")
                .value,
            amount: parseFloat(
                document.getElementById("transaction-amount-update").value
            ),
            date: document.getElementById("transaction-date-update").value,
        };

        console.info(updatedTransaction);

        updateTransaction(transactionId, updatedTransaction);
        transactionDialog.close();
        fetchTransactions(); // Refresh the list
    };

    transactionDialog.showModal();
}

const transactionDialogUpdate = document.getElementById(
    "transaction-dialog-update"
);

const cancelButtonUpdate = document.getElementById("cancel-btn-update");

if (cancelButtonUpdate && transactionDialogUpdate) {
    cancelButtonUpdate.addEventListener("click", () => {
        transactionDialogUpdate.close();
    });
}

// Attach functions to the window object for global access
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
window.addTransaction = addTransaction;
window.removeTransaction = removeTransaction;
window.updateTransaction = updateTransaction;
window.fetchTransactions = fetchTransactions;
window.displayTransactionCards = displayTransactionCards;
