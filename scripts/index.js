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
let currentSortType = "alphabetical";
let searchQuery = "";
let displayedName = "";

onAuthStateChanged(auth, (u) => {
    user = u;
    uid = user ? user.uid : null;

    if (u) {
        fetchTransactions();
        console.log("fetched transaction");
        console.log("User is logged in:", user); // Access the user object here
        console.log("User ID:", user.uid);
        document.getElementById("userName").textContent = `Welcome, ${user.displayName}`;
        console.log("User name:", user.displayName);
    } else {
        console.log("No user is logged in.");
        // Restrict access if user is not authenticated
        const containsSignedOutPath = ["home", "summary", "history"].some(
            (word) => window.location.href.includes(word)
        );
        if (containsSignedOutPath) {
            window.location.href = "index.html";
        }
    }
});

function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .then((result) => {
            user = result.user;
            uid = user.uid;

            window.location.href = "html/home.html";
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
            window.location.href = "../index.html";
            console.log("Signed out successfully.");
        })
        .catch((error) => console.error("Sign-out error:", error.message));
}

/**
 * Adds a new transaction to the Firebase database for the currently logged-in user.
 * @param {Object} transaction - The transaction object containing title, category, amount, and date.
 */
function addTransaction(transaction) {
    // Check if the user is signed in
    if (!user) {
        console.error("User is not signed in."); // Log an error if no user is signed in
        return; // Exit the function early
    }

    // Reference to the user's transactions in the Firebase database
    const transactionsRef = ref(db, `users/${uid}/transactions`);

    // Create a new transaction reference (generates a unique ID for the transaction)
    const newTransactionRef = push(transactionsRef);

    // Save the transaction data to the database
    set(newTransactionRef, transaction)
        .then(() => {
            // Log a success message when the transaction is added successfully
            console.log("Transaction added:", transaction);
        })
        .catch((error) => {
            // Log an error message if the transaction fails to be added
            console.error("Error adding transaction:", error.message);
        });
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
                const filteredTransactions = filterTransactions(transactionArray);
                const sortedTransactions = sortTransactions(filteredTransactions, currentSortType);
                try {
                    displayTransactionCards(sortedTransactions); 
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
let chart; // Declare a global variable to store the chart instance

function plotTransactions(transactionArray) {
    const ctx = document.getElementById('transactionsChart').getContext('2d');
    const choice = document.getElementById('chartSelector').value;

    console.log(choice);

    // Destroy any existing chart before creating a new one
    if (chart) {
        chart.destroy();
    }

    if (choice == "daysVsTransactionAmount") {
        const dates = transactionArray.map(transaction => transaction.date); 
        const amounts = transactionArray.map(transaction => transaction.amount); 
        
        const sortedData = dates.map((date, index) => ({ date, amount: amounts[index] }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const sortedDates = sortedData.map(item => item.date);
        const sortedAmounts = sortedData.map(item => item.amount);

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedDates,
                datasets: [{
                    label: 'Transaction Amount',
                    data: sortedAmounts,
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
                        },
                        grid: {
                            display: false 
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            display: false 
                        }
                    }
                }
            }
        });
        
    } else if (choice == "spendingPerCategory") {
        const categoryCounts = transactionArray.reduce((counts, transaction) => {
            counts[transaction.category] = (counts[transaction.category] || 0) + 1;
            return counts;
        }, {});

        const categories = Object.keys(categoryCounts);
        const counts = Object.values(categoryCounts);

        chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: categories,
                datasets: [{
                    label: 'Number of Transactions',
                    data: counts,
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.2)',
                        'rgba(255, 99, 132, 0.2)',
                        'rgba(54, 162, 235, 0.2)',
                        'rgba(255, 206, 86, 0.2)',
                        'rgba(153, 102, 255, 0.2)',
                    ],
                    borderColor: [
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(153, 102, 255, 1)',
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Transactions'
                        },
                        grid: {
                            display: false 
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Categories'
                        },
                        grid: {
                            display: false 
                        }
                    }
                }
            }
        });
        
    }else if (choice == "incomeVsExpense") {
    // Separate transactions into income and expense
    const income = transactionArray
        .filter(transaction => transaction.amount > 0) // Income: amount > 0
        .reduce((total, transaction) => total + transaction.amount, 0);

    const expense = transactionArray
        .filter(transaction => transaction.amount <= 0) // Expense: amount <= 0
        .reduce((total, transaction) => total + Math.abs(transaction.amount), 0); // Use absolute value for expense

    // Create a pie chart 
    chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Income', 'Expense'],
            datasets: [{
                label: 'Income vs Expense',
                data: [income, expense],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.2)', 
                    'rgba(255, 99, 132, 0.2)'  
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)', 
                    'rgba(255, 99, 132, 1)'  
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            return `${label}: $${value.toFixed(2)}`;
                        }
                    }
                }
            }
        }
    });
} else if (choice == "daysVsBalance") {

    const sortedData = transactionArray
        .map(transaction => ({
            date: new Date(transaction.date), 
            amount: transaction.amount
        }))
        .sort((a, b) => a.date - b.date);


    let cumulativeBalance = 0;
    const dates = [];
    const balances = [];

    sortedData.forEach(({ date, amount }) => {
        cumulativeBalance += amount; 
        dates.push(date.toISOString().split('T')[0]); // Format date as YYYY-MM-DD
        balances.push(cumulativeBalance);
    });

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates, 
            datasets: [{
                label: 'Balance',
                data: balances, 
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    },
                    type: 'time',
                    time: {
                        unit: 'day' 
                    },
                    grid: {
                        display: false 
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Cumulative Balance ($)'
                    },
                    beginAtZero: true,
                    grid: {
                        display: false 
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const value = context.raw || 0;
                            return `$${value.toFixed(2)}`;
                        }
                    }
                }
            }
        }
    });
    
}


}
function levenshteinDistance(s1, s2) {
    const len1 = s1.length;
    const len2 = s2.length;
    
    let dp = Array.from(Array(len1 + 1), () => Array(len2 + 1).fill(0));
    
    for (let i = 0; i <= len1; i++) dp[i][0] = i;
    for (let j = 0; j <= len2; j++) dp[0][j] = j;
    
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            let cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1,dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
    }
    
    return dp[len1][len2] / Math.max(len1, len2);
}

function filterTransactions(transactions) {
    if (!searchQuery) {
        return transactions;
    }

    return transactions.sort((a, b) => {
        const distanceA = levenshteinDistance(a.title.toLowerCase(), searchQuery.toLowerCase());
        const distanceB = levenshteinDistance(b.title.toLowerCase(), searchQuery.toLowerCase());
        return distanceA - distanceB;
    });
}

function sortTransactions(transactions, sortType) {
    if (sortType === "alphabetical") {
        return transactions.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortType === "recency") {
        return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (sortType === "value") {
        return transactions.sort((a, b) => b.amount - a.amount);
    } else if (sortType === "alphabetical-backwards") {
        return transactions.sort((a, b) => b.title.localeCompare(a.title));
    } else if (sortType === "oldest") {
        return transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (sortType === "least-value") {
        return transactions.sort((a, b) => a.amount - b.amount);
    } else if (sortType === "category") {
        return transactions.sort((a, b) => a.category.localeCompare(b.category)); // Sort by category
    } else {
        return transactions; // Default: no sorting
    }
}
function displayTransactionCards(transactions) {
    try {
        const table = document.getElementById("transaction-table");
        const tbody = document.getElementById("transaction-table-body");
        const noTransactionsMessage = document.getElementById("no-transactions-message");

        if (!transactions || transactions.length === 0) {
            if (noTransactionsMessage) noTransactionsMessage.style.display = "block";
            if (table) table.style.display = "none";
            return;
        }

        if (noTransactionsMessage) noTransactionsMessage.style.display = "none";
        if (table) table.style.display = "table";

        tbody.innerHTML = ""; // Clear previous rows

        transactions.forEach((transaction) => {
            const { transactionId, title, category, amount, date } = transaction;

            const row = document.createElement("tr");

            const amountClass = amount >= 0 ? 'amount-positive' : 'amount-negative';

row.innerHTML = `
    <td><h3 class="transaction-title">${title}</h3></td>
    <td><p class="transaction-text">${category}</p></td>
    <td><p class="transaction-text ${amountClass}">$${amount.toFixed(2)}</p></td>
    <td><p class="transaction-text">${date}</p></td>
    <td><button class="update-btn" data-id="${transactionId}">Update</button></td>
    <td><button class="remove-btn" data-id="${transactionId}">Remove</button></td>
`;



            tbody.appendChild(row);
        });

        // Attach event listeners
        tbody.querySelectorAll(".remove-btn").forEach((btn) =>
            btn.addEventListener("click", (e) => {
                const transactionId = e.target.dataset.id;
                removeTransaction(transactionId);
                fetchTransactions();
            })
        );

        tbody.querySelectorAll(".update-btn").forEach((btn) =>
            btn.addEventListener("click", (e) => {
                const transactionId = e.target.dataset.id;
                const transaction = transactions.find((t) => t.transactionId === transactionId);
                openUpdateModal(transactionId, transaction);
            })
        );
    } catch (error) {
        console.error("Error displaying transaction table:", error);
    }

    // Keep your stats code untouched
    try {
        const balanceValue = document.getElementById("balanceValue");
        const totalIncomeValue = document.getElementById("totalIncome");
        const totalExpenseValue = document.getElementById("totalExpense");
        const numTransactionsValue = document.getElementById("numTransactions");
        const avgTransactionValue = document.getElementById("avgTransactionValue");
        const highestTransactionValue = document.getElementById("highestTransaction");
        const lowestTransactionValue = document.getElementById("lowestTransaction");

        let highestTransaction = -Infinity; 
        let lowestTransaction = Infinity;
        let balance = 0;
        let totalIncome = 0;
        let totalExpense = 0;
        let numTransactions = 0;
    
        if (transactions && transactions.length > 0) {
            transactions.forEach((transaction) => {
                const { amount } = transaction;
                balance += amount;
                if (amount > 0) totalIncome += amount;
                else totalExpense += amount;
                if (amount > highestTransaction) highestTransaction = amount;
                if (amount < lowestTransaction) lowestTransaction = amount;
                numTransactions++; 
            });
        }

        balanceValue.textContent = `$${balance.toFixed(2)}`;
        totalIncomeValue.textContent = `$${totalIncome.toFixed(2)}`;
        totalExpenseValue.textContent = `$${totalExpense.toFixed(2)}`;
        numTransactionsValue.textContent = numTransactions;
        highestTransactionValue.textContent = `$${highestTransaction.toFixed(2)}`;
        lowestTransactionValue.textContent = `$${lowestTransaction.toFixed(2)}`;
        const avgValue = numTransactions > 0 ? balance / numTransactions : 0;
        avgTransactionValue.textContent = `$${avgValue.toFixed(2)}`;        
    } catch (error) {
        console.error("Error updating display:", error);
    }
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
try {
    document.getElementById('chartSelector').addEventListener('change', fetchTransactions);
}catch{
    console.log("oh no an eror!1111!")
}
try{
    document.querySelectorAll(".sort-button").forEach((button) => {
        button.addEventListener("click", (e) => {
            const sortType = e.target.textContent.trim();
   /* <button class="sort-button">A - Z</button>
        <button class="sort-button">Z - As/button>
        <button class="sort-button">Newest</button>
        <button class="sort-button">Oldest</button>
        <button class="sort-button">Ascending</button>
        <button class="sort-button">Descending</button>
        <button class="sort-button">Category</button>
        */
            if (sortType === "A - Z") {
                currentSortType = "alphabetical";
            } else if (sortType === "Newest") {
                currentSortType = "recency";
            } else if (sortType === "Descending") {
                currentSortType = "value";
            } else if (sortType === "Z - A") {
                currentSortType = "alphabetical-backwards";
            } else if (sortType === "Oldest") {
                currentSortType = "oldest";
            } else if (sortType === "Ascending") {
                currentSortType = "least-value";
            } else if (sortType === "Category") {
                currentSortType = "category";
            } else {
                currentSortType = "default";
            }

            document.getElementById("search-bar").value = "";
            searchQuery = ""; // Reset search query
            console.log("Current sort type:", currentSortType);
            fetchTransactions();
        });
    });
}catch{
    console.log("another error womp womp!!!");
}
try{
    document.getElementById("search-bar").addEventListener("input", (e) => {
        searchQuery = e.target.value.toLowerCase(); 
        currentSortType = "default"; // Reset the sort type when searching
        console.log("Search query:", searchQuery);
        fetchTransactions(); 
    });
}catch{
    console.log("a third error, wow i bet richard wrote this");
}
function updateUserProfile(user) {
  const nameElement = document.getElementById('user-name');
  const emailElement = document.getElementById('user-email');
  const pfpElement = document.getElementById('user-pfp');

  if (user) {
    nameElement.textContent = user.displayName || "User";
    emailElement.textContent = user.email || "No email";
    pfpElement.src = user.photoURL || "https://via.placeholder.com/48";
  } else {
    nameElement.textContent = "Not signed in";
    emailElement.textContent = "";
    pfpElement.src = "https://via.placeholder.com/48";
  }
}

onAuthStateChanged(auth, (user) => {
  updateUserProfile(user);
});
document.querySelectorAll('.faq-question').forEach(button => {
    button.addEventListener('click', () => {
        const currentItem = button.closest('.faq-item');
        document.querySelectorAll('.faq-item.open').forEach(item => {
            if (item !== currentItem) {
                item.classList.remove('open');
            }
        });
        currentItem.classList.toggle('open');
    });
});

// Attach functions to the window object for global access
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
window.addTransaction = addTransaction;
window.removeTransaction = removeTransaction;
window.updateTransaction = updateTransaction;
window.fetchTransactions = fetchTransactions;
window.displayTransactionCards = displayTransactionCards;
