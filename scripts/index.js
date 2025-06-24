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
const modal = document.getElementById("chatModal");
const openBtn = document.getElementById("openModalBtn");
const closeBtn = document.getElementById("closeModalBtn");
const chatbox = document.getElementById("chatbox");
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const dataToggle = document.getElementById("dataToggle");
let user;
let uid;
let currentSortType = "alphabetical";
let searchQuery = "";
let displayedName = "";
let userFinancialData = {};
onAuthStateChanged(auth, (u) => {
    user = u;
    uid = user ? user.uid : null;
    
    if (u) {
        console.log("User authenticated:", u.uid);
        fetchTransactions();
        fetchGoals();
    } else {
        console.log("No user logged in");
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
            fetchTransactions(); 
        } catch (error) {
            console.error(
                "Error in the proecess of adding transaction:",
                error.message
            );
        }
    });
}


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
                displayTransactionCards([]); //  empty UI when no transactions exist
            }
        })
        .catch((error) => {
            console.error("Error fetching transactions:", error);
        });
}
let chart; // global variable to store the chart instance
function plotTransactions(transactionArray) {
    const ctx = document.getElementById('transactionsChart').getContext('2d');
    const choice = document.getElementById('chartSelector').value;

    console.log(choice);

    // destroy any existing chart before creating a new one
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
    // Separate 
    const income = transactionArray
        .filter(transaction => transaction.amount > 0) // Income: amount > 0
        .reduce((total, transaction) => total + transaction.amount, 0);

    const expense = transactionArray
        .filter(transaction => transaction.amount <= 0) // Expense: amount <= 0
        .reduce((total, transaction) => total + Math.abs(transaction.amount), 0); // Use absolute value for expense

    //pie chart 
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
        dates.push(date.toISOString().split('T')[0]); // YYYY-MM-DD
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
        return transactions.sort((a, b) => a.category.localeCompare(b.category)); 
    } else {
        return transactions; // Default none
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

        tbody.innerHTML = ""; // Clear prev

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

        //  event listeners
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

        const avgValue = numTransactions > 0 ? balance / numTransactions : 0;
        balanceValue.textContent = `$${balance.toFixed(2)}`;
        totalIncomeValue.textContent = `$${totalIncome.toFixed(2)}`;
        totalExpenseValue.textContent = `$${totalExpense.toFixed(2)}`;
        numTransactionsValue.textContent = numTransactions;
        highestTransactionValue.textContent = `$${highestTransaction.toFixed(2)}`;
        lowestTransactionValue.textContent = `$${lowestTransaction.toFixed(2)}`;
        avgTransactionValue.textContent = `$${avgValue.toFixed(2)}`;

        
        highestTransactionValue.style.color = highestTransaction >= 0 ? "#16a34a" : "#dc2626";
        lowestTransactionValue.style.color = lowestTransaction >= 0 ? "#16a34a" : "#dc2626";
        totalExpenseValue.style.color = "#dc2626"; 
        totalIncomeValue.style.color = "#16a34a"; 

    } catch (error) {
        console.error("Error updating display:", error);
    }
}

function openUpdateModal(transactionId, transaction) {
    const transactionDialog = document.getElementById(
        "transaction-dialog-update"
    );
    const transactionForm = document.getElementById("transaction-form-update");
    document.getElementById("transaction-title-update").value =
        transaction.title;
    document.getElementById("transaction-category-update").value =
        transaction.category;
    document.getElementById("transaction-amount-update").value =
        transaction.amount;
    document.getElementById("transaction-date-update").value = transaction.date;
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
        fetchTransactions(); 
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
            searchQuery = ""; 
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
        currentSortType = "default"; 
        console.log("Search query:", searchQuery);
        fetchTransactions(); 
    });
}catch{
    console.log("a third error, wow i bet richard wrote this");
}
function updateUserProfile(user) {
  try {
    // Safely get all elements with null checks
    const nameElement = document.getElementById('user-name');
    const emailElement = document.getElementById('user-email');
    const pfpElement = document.getElementById('user-pfp');

    // Verify elements exist before proceeding
    if (!nameElement || !emailElement || !pfpElement) {
      const missingElements = [];
      if (!nameElement) missingElements.push('user-name');
      if (!emailElement) missingElements.push('user-email');
      if (!pfpElement) missingElements.push('user-pfp');
      console.warn(`Profile elements missing: ${missingElements.join(', ')}`);
      return;
    }

    try {
      if (user) {
        // Update profile for signed-in user
        try {
          nameElement.textContent = user.displayName || "User";
        } catch (nameError) {
          console.error("Failed to update name:", nameError);
        }

        try {
          emailElement.textContent = user.email || "No email";
        } catch (emailError) {
          console.error("Failed to update email:", emailError);
        }

        try {
          // Handle profile picture with fallbacks
          const photoURL = user.photoURL || "";
          if (photoURL && pfpElement.tagName === 'IMG') {
            pfpElement.src = photoURL;
            pfpElement.onerror = () => {
              pfpElement.src = ""; // Clear if image fails to load
            };
          } else {
            pfpElement.src = "";
          }
        } catch (pfpError) {
          console.error("Failed to update profile picture:", pfpError);
        }
      } else {
        // Handle signed-out state
        try {
          nameElement.textContent = "Not signed in";
        } catch (nameError) {
          console.error("Failed to reset name:", nameError);
        }

        try {
          emailElement.textContent = "";
        } catch (emailError) {
          console.error("Failed to reset email:", emailError);
        }

        try {
          pfpElement.src = "";
        } catch (pfpError) {
          console.error("Failed to reset profile picture:", pfpError);
        }
      }
    } catch (profileError) {
      console.error("Error updating user profile:", profileError);
    }
  } catch (error) {
    console.error("Unexpected error in profile update:", error);
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

function downloadCSVFromTransactions(transactions, filename = "fintrack_data.csv") {
    try {
        if (!transactions || transactions.length === 0) {
            alert("No transactions to download.");
            return;
        }

        try {
            const headers = Object.keys(transactions[0]);
            const csvRows = [headers.join(",")];

            transactions.forEach(txn => {
                try {
                    const values = headers.map(header => `"${(txn[header] || "").toString().replace(/"/g, '""')}"`);
                    csvRows.push(values.join(","));
                } catch (mapError) {
                    console.error("Error mapping transaction data:", mapError);
                    throw new Error("Failed to process transaction data");
                }
            });

            try {
                const csvContent = csvRows.join("\n");
                const blob = new Blob([csvContent], { type: "text/csv" });
                const url = URL.createObjectURL(blob);

                try {
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = filename;
                    a.click();

                    // Clean up after a small delay to ensure download starts
                    setTimeout(() => {
                        try {
                            URL.revokeObjectURL(url);
                        } catch (revokeError) {
                            console.error("Error revoking object URL:", revokeError);
                        }
                    }, 100);
                } catch (downloadError) {
                    console.error("Error triggering download:", downloadError);
                    throw new Error("Failed to initiate download");
                }
            } catch (blobError) {
                console.error("Error creating CSV blob:", blobError);
                throw new Error("Failed to create downloadable file");
            }
        } catch (csvError) {
            console.error("Error generating CSV:", csvError);
            throw new Error("Failed to generate CSV data");
        }
    } catch (error) {
        console.error("Error in CSV download process:", error);
        alert("Failed to download CSV. Please try again.");
    }
}

function downloadJSONFromTransactions(transactions, filename = "fintrack_data.json") {
    try {
        if (!transactions || transactions.length === 0) {
            alert("No transactions to download.");
            return;
        }

        try {
            const jsonContent = JSON.stringify(transactions, null, 2);
            const blob = new Blob([jsonContent], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            try {
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                a.click();

                // Clean up after a small delay
                setTimeout(() => {
                    try {
                        URL.revokeObjectURL(url);
                    } catch (revokeError) {
                        console.error("Error revoking object URL:", revokeError);
                    }
                }, 100);
            } catch (downloadError) {
                console.error("Error triggering download:", downloadError);
                throw new Error("Failed to initiate download");
            }
        } catch (jsonError) {
            console.error("Error generating JSON:", jsonError);
            throw new Error("Failed to generate JSON data");
        }
    } catch (error) {
        console.error("Error in JSON download process:", error);
        alert("Failed to download JSON. Please try again.");
    }
}

try {
    const downloadBtn = document.getElementById("download-data-btn");
    if (downloadBtn) {
        downloadBtn.addEventListener("click", () => {
            try {
                if (!user) {
                    alert("Please sign in to download your data.");
                    return;
                }

                try {
                    const userTransactionsRef = ref(db, `users/${uid}/transactions`);
                    get(userTransactionsRef)
                        .then((snapshot) => {
                            try {
                                if (snapshot.exists()) {
                                    try {
                                        const transactions = Object.entries(snapshot.val()).map(
                                            ([transactionId, transaction]) => ({
                                                transactionId,
                                                ...transaction,
                                            })
                                        );
                                        downloadCSVFromTransactions(transactions);
                                    } catch (processError) {
                                        console.error("Error processing transactions:", processError);
                                        alert("Error preparing your data for download.");
                                    }
                                } else {
                                    alert("No transactions found to download.");
                                }
                            } catch (snapshotError) {
                                console.error("Error handling snapshot:", snapshotError);
                                alert("Error reading your transaction data.");
                            }
                        })
                        .catch((error) => {
                            console.error("Database error:", error);
                            alert("Failed to access your data. Please try again.");
                        });
                } catch (refError) {
                    console.error("Error creating database reference:", refError);
                    alert("System error. Please refresh the page and try again.");
                }
            } catch (eventError) {
                console.error("Error in download handler:", eventError);
                alert("An unexpected error occurred. Please try again.");
            }
        });
    }
} catch (error) {
    console.error("Download button initialization error:", error);
}

try {
    const downloadJsonBtn = document.getElementById("download-json-btn");
    if (downloadJsonBtn) {
        downloadJsonBtn.addEventListener("click", () => {
            try {
                if (!user) {
                    alert("Please sign in to download your data.");
                    return;
                }

                try {
                    const userTransactionsRef = ref(db, `users/${uid}/transactions`);
                    get(userTransactionsRef)
                        .then((snapshot) => {
                            try {
                                if (snapshot.exists()) {
                                    try {
                                        const transactions = Object.entries(snapshot.val()).map(
                                            ([transactionId, transaction]) => ({
                                                transactionId,
                                                ...transaction,
                                            })
                                        );
                                        downloadJSONFromTransactions(transactions);
                                    } catch (processError) {
                                        console.error("Error processing transactions:", processError);
                                        alert("Error preparing your data for download.");
                                    }
                                } else {
                                    alert("No transactions found to download.");
                                }
                            } catch (snapshotError) {
                                console.error("Error handling snapshot:", snapshotError);
                                alert("Error reading your transaction data.");
                            }
                        })
                        .catch((error) => {
                            console.error("Database error:", error);
                            alert("Failed to access your data. Please try again.");
                        });
                } catch (refError) {
                    console.error("Error creating database reference:", refError);
                    alert("System error. Please refresh the page and try again.");
                }
            } catch (eventError) {
                console.error("Error in JSON download handler:", eventError);
                alert("An unexpected error occurred. Please try again.");
            }
        });
    }
} catch (error) {
    console.error("JSON download button initialization error:", error);
}

function addGoal(goal) {
    if (!user) {
        console.error("User is not signed in.");
        return;
    }

    const goalsRef = ref(db, `users/${uid}/goals`);
    const newGoalRef = push(goalsRef);

    set(newGoalRef, goal)
        .then(() => console.log("Goal added:", goal))
        .catch((error) => console.error("Error adding goal:", error.message));
}

function removeGoal(goalId) {
    if (!user) {
        console.error("User is not signed in.");
        return;
    }

    const goalRef = ref(db, `users/${uid}/goals/${goalId}`);
    remove(goalRef)
        .then(() => console.log("Goal removed:", goalId))
        .catch((error) => console.error("Error removing goal:", error.message));
}

function updateGoal(goalId, updatedData) {
    if (!user) {
        console.error("User is not signed in.");
        return;
    }

    const goalRef = ref(db, `users/${uid}/goals/${goalId}`);
    update(goalRef, updatedData)
        .then(() => console.log("Goal updated:", updatedData))
        .catch((error) => console.error("Error updating goal:", error.message));
}

function fetchGoals() {
    console.log("[DEBUG] fetchGoals() triggered");
    if (!user) {
        console.error("User is not signed in.");
        return;
    }

    const goalsRef = ref(db, `users/${uid}/goals`);
    get(goalsRef)
        .then((snapshot) => {
            console.log("[DEBUG] Firebase goals data:", snapshot.exists() ? snapshot.val() : "No data");
            if (snapshot.exists()) {
                const goals = Object.entries(snapshot.val()).map(
                    ([goalId, goal]) => ({
                        goalId,
                        ...goal,
                    })
                );
                const sortedGoals = goals.sort((a, b) => {
                    if (!a.targetDate) return 1;
                    if (!b.targetDate) return -1;
                    
                    const dateA = new Date(a.targetDate);
                    const dateB = new Date(b.targetDate);
                    return dateA - dateB;
                });
                
                console.log("[DEBUG] Sorted goals:", sortedGoals);
                displayGoalCards(sortedGoals);
            } else {
                console.log("[DEBUG] No goals found in database");
                displayGoalCards([]);
            }
        })
        .catch((error) => console.error("Error fetching goals:", error));
}

function displayGoalCards(goals) {
    console.log("[DEBUG] displayGoalCards() called with:", goals);
    
    const goalContainer = document.getElementById("goal-table-body");
    if (!goalContainer) {
        console.error("goal-table-body element not found!");
        return;
    }

    goalContainer.innerHTML = "";

    if (!goals || goals.length === 0) {
        console.log("[DEBUG] No goals to display, showing empty state");
        goalContainer.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #666;">
                    No goals found. Add your first goal!
                </td>
            </tr>
        `;
        return;
    }

    goals.forEach((goal) => {
        console.log(`[DEBUG] Rendering goal: ${goal.title} ($${goal.amount})`);
        let formattedDate = 'No date set';
        if (goal.targetDate) {
            const dateObj = new Date(goal.targetDate);
            formattedDate = dateObj.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            const today = new Date();
            const timeDiff = dateObj - today;
            const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
            
            let dateClass = '';
            if (daysDiff <= 7 && daysDiff >= 0) {
                dateClass = 'goal-soon';
            } else if (daysDiff < 0) {
                dateClass = 'goal-past';
            }
            
            formattedDate = `<span class="${dateClass}">${formattedDate}</span>`;
        }
        
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${goal.title || 'Untitled Goal'}</td>
            <td>$${goal.amount ? goal.amount.toFixed(2) : '0.00'}</td>
            <td>${formattedDate}</td>
            <td><button class="update-goal-btn" data-id="${goal.goalId}">Update</button></td>
            <td><button class="remove-goal-btn" data-id="${goal.goalId}">Remove</button></td>
        `;
        goalContainer.appendChild(row);
    });

    attachGoalButtonListeners(goals);
}

function attachGoalButtonListeners(goals) {
    document.querySelectorAll(".remove-goal-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const goalId = e.target.dataset.id;
            
                removeGoal(goalId);
                fetchGoals();
            
        });
    });

    document.querySelectorAll(".update-goal-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const goalId = e.target.dataset.id;
            const goal = goals.find(g => g.goalId === goalId);
            openGoalUpdateModal(goalId, goal);
        });
    });
}

function openGoalUpdateModal(goalId, goal) {
    const dialog = document.getElementById("goal-dialog-update");
    const form = document.getElementById("goal-form-update");

    document.getElementById("goal-title-update").value = goal.title;
    document.getElementById("goal-amount-update").value = goal.amount;
    document.getElementById("goal-date-update").value = goal.targetDate;

    form.onsubmit = (e) => {
        e.preventDefault();
        const updatedGoal = {
            title: document.getElementById("goal-title-update").value,
            amount: parseFloat(document.getElementById("goal-amount-update").value),
            targetDate: document.getElementById("goal-date-update").value
        };
        updateGoal(goalId, updatedGoal);
        dialog.close();
        fetchGoals();
    };

    dialog.showModal();
}

const openGoalModalBtn = document.getElementById("open-goal-modal-btn");
const goalDialog = document.getElementById("goal-dialog");
const goalForm = document.getElementById("goal-form");
const goalCancelBtn = document.getElementById("cancel-goal-btn");


if (goalCancelBtn && goalDialog) {
    goalCancelBtn.addEventListener("click", () => {
        goalDialog.close();
    });
}
if (openGoalModalBtn && goalDialog && goalForm) {
    openGoalModalBtn.addEventListener("click", () => {
        goalDialog.showModal();
    });

    goalForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const title = document.getElementById("goal-title").value;
        const amount = parseFloat(document.getElementById("goal-amount").value);
        const targetDate = document.getElementById("goal-date").value;
        const goal = { title, amount, targetDate };
        addGoal(goal);
        goalForm.reset();
        goalDialog.close();
        fetchGoals();
    });
}

const apiKey = "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";

//Set FinBot's tone and give it rules.
const systemMessage = {
  role: "system",
  content:
    "You are FinBot, a concise and helpful financial assistant for FinTrack.\n\nONLY give financial advice if the user asks for it. If the message is unrelated to finance (e.g., a greeting), respond casually.\n\nRespond in simple, friendly English. Keep responses short unless asked to explain more.\n\nDo not mention financial data unless asked directly.\n\nBe concise.",
};

// Create modal, and hide it once the page loads.
// Safe initialization with comprehensive error handling
function initializeChatModal() {
  try {
    // First try to hide the modal if it exists
    try {
      if (modal) {
        modal.style.display = 'none';
      } else {
        console.warn('Chat modal not found during initial hide attempt');
      }
    } catch (hideError) {
      console.error('Failed to initially hide modal:', hideError);
    }

    // Only proceed if essential elements exist
    if (modal && openBtn) {
      // Set up open button handler
      openBtn.onclick = async () => {
        try {
          if (modal.style.display === "flex") {
            modal.style.display = "none";
          } else {
            modal.style.display = "flex";
            if (input) input.focus();
          }
        } catch (toggleError) {
          console.error('Error toggling modal:', toggleError);
        }
      };

      // Set up close button if exists
      if (closeBtn) {
        closeBtn.onclick = () => {
          try {
            if (modal) modal.style.display = "none";
          } catch (closeError) {
            console.error('Error closing modal:', closeError);
          }
        };
      }

      // Set up outside click handler
      document.addEventListener('click', (e) => {
        try {
          if (modal && e.target === modal) {
            modal.style.display = "none";
          }
        } catch (clickError) {
          console.error('Error handling outside click:', clickError);
        }
      });

      // Initialize chat functionality if components exist
      if (input && sendBtn && chatbox) {
        try {
          sendBtn.onclick = () => {
            try {
              if (typeof sendMessage === 'function') sendMessage();
            } catch (sendError) {
              console.error('Error in send handler:', sendError);
            }
          };

          input.addEventListener("keydown", (e) => {
            try {
              if (e.key === "Enter" && typeof sendMessage === 'function') {
                sendMessage();
              }
            } catch (keyError) {
              console.error('Error in key handler:', keyError);
            }
          });
        } catch (initError) {
          console.error('Error initializing chat controls:', initError);
        }
      }
    }
  } catch (globalError) {
    console.error('Failed to initialize chat modal system:', globalError);
  }
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeChatModal);
} else {
  initializeChatModal();}

/**
 * Combines user data to format it properly to pass it into FinBot.
 * 
 * @param {string} uid - The user's unique ID.
 * @param {string} displayName - The user's display name.
 * @returns {Promise<Object>} - An object containing name, goals, and transactions.
 */
async function buildUserFinancialData(uid, displayName) {
  // Fetch goals from Firebase.
  const goalsSnap = await get(ref(db, `users/${uid}/goals`));
  const transactionsSnap = await get(ref(db, `users/${uid}/transactions`));
  const goals = goalsSnap.exists() ? Object.values(goalsSnap.val()) : [];
  const transactions = transactionsSnap.exists() ? Object.values(transactionsSnap.val()) : [];

  // Return everything in a structured object.
  return {
    name: displayName,
    goals,
    transactions
  };
}

//Handles opening the chat modal and loading necessary data
// First check if the element exists


if (openBtn) {
    openBtn.onclick = async () => {
        try {
            if (!modal) {
                console.error("Chat modal element not found");
                alert("Chat feature is currently unavailable.");
                return;
            }

            if (modal.style.display === "flex") {
                try {
                    modal.style.display = "none";
                } catch (error) {
                    console.error("Error hiding modal:", error);
                }
                return;
            }

            if (!user || !uid) {
                alert("Please sign in to use the chat feature.");
                return;
            }

            try {
                userFinancialData = await buildUserFinancialData(uid, user.displayName);
                modal.style.display = "flex";
                
                try {
                    if (input) input.focus();
                } catch (focusError) {
                    console.error("Error focusing input:", focusError);
                }

                try {
                    if (chatbox && chatbox.innerHTML.trim() === "") {
                        appendMessage("FinBot", "Hi! How can I help you today? 😊");
                    }
                } catch (messageError) {
                    console.error("Error displaying welcome message:", messageError);
                }
            } catch (dataError) {
                console.error("Error loading financial data:", dataError);
                modal.style.display = "flex";
                appendMessage("FinBot", "I'm having trouble accessing your data, but you can still ask general questions.");
                userFinancialData = { 
                    name: user?.displayName || "User",
                    goals: [],
                    transactions: [] 
                };
            }
        } catch (error) {
            console.error("Unexpected error in chat modal toggle:", error);
            alert("Something went wrong. Please refresh the page and try again.");
            try { if (modal) modal.style.display = "none"; } catch {}
        }
    };
} else {
    console.warn("Chat open button not found - chat feature disabled");
    // Optionally hide chat-related UI elements if the button is missing
    try {
        const chatFeatureElements = document.querySelectorAll(".chat-feature");
        chatFeatureElements.forEach(el => el.style.display = "none");
    } catch {}
}
let isSending = false; 
// Modal closing logic.
// Safely handle close button click
if (closeBtn) {
    closeBtn.onclick = () => {
        try {
            if (modal) {
                modal.style.display = "none";
            } else {
                console.warn("Modal element not found when trying to close");
            }
        } catch (error) {
            console.error("Error while closing modal via button:", error);
        }
    };
} else {
    console.warn("Close button not found - modal close functionality may be limited");
}

// Safely handle outside click to close
if (modal) {
    window.onclick = (e) => {
        try {
            if (e.target === modal) {
                modal.style.display = "none";
            }
        } catch (error) {
            console.error("Error handling outside click to close modal:", error);
        }
    };
} else {
    console.warn("Modal element not found - outside click close disabled");
}
// Safely set up send functionality
try {
    // Check if send button exists
    if (sendBtn) {
        sendBtn.onclick = () => {
            try {
                if (typeof sendMessage === 'function') {
                    sendMessage();
                } else {
                    console.error('sendMessage function not defined');
                }
            } catch (error) {
                console.error('Error in send button handler:', error);
            }
        };
    } else {
        console.warn('Send button not found in DOM');
    }

    // Check if input exists
    if (input) {
        input.addEventListener("keydown", (e) => {
            try {
                if (e.key === "Enter") {
                    try {
                        if (typeof sendMessage === 'function') {
                            sendMessage();
                        } else {
                            console.error('sendMessage function not defined');
                        }
                    } catch (error) {
                        console.error('Error processing Enter key:', error);
                    }
                }
            } catch (eventError) {
                console.error('Error in keydown handler:', eventError);
            }
        });
    } else {
        console.warn('Chat input not found in DOM');
    }

} catch (setupError) {
    console.error('Error setting up send handlers:', setupError);
}

// Ensure isSending flag exists
if (typeof isSending === 'undefined') {
    let isSending = false;
    console.warn('isSending flag was not defined - initialized to false');
}


/**
 * Sends the user's message to FinBot and appends the bot's response to the chatbox.
 * 
 * @returns {Promise<void>}
 */
async function sendMessage() {
  if (isSending) return;

  const userMessage = input.value.trim();
  if (!userMessage) return; //No empty messages.

  //Format the messages.
  isSending = true;
  input.disabled = true;
  sendBtn.disabled = true;
  input.value = ""; 
  appendMessage("You", userMessage); 
  const typingIndicator = document.createElement("div");
  typingIndicator.className = "typing";
  typingIndicator.textContent = "FinBot is thinking...";
  chatbox.appendChild(typingIndicator);
  chatbox.scrollTop = chatbox.scrollHeight;

  const messages = [systemMessage];

  //Only include user data if it is allowed.
  if (dataToggle.checked) {
    messages.push({
      role: "user",
      content: `Here is my financial data:\n\n\`\`\`json\n${JSON.stringify(
        userFinancialData,
        null,
        2
      )}\n\`\`\``,
    });
  }
  messages.push({ role: "user", content: userMessage });

  try {
    //Send request to Deepseek R1 model through OpenRouter API.
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "http://localhost:5500", 
        "X-Title": "FinTrack Chatbot",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1-0528:free",
        messages: messages,
      }),
    });

    const data = await res.json();
    typingIndicator.remove();

    if (data.choices && data.choices.length > 0) {
      const rawReply = data.choices[0].message.content;

      /*
       Format Text by converting markdown to HTML.
       (*italic*, **bold**).
      */
      const formattedReply = rawReply
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>");
      const wordRegex = /(<[^>]+>|[^<>\s]+)/g;
      const words = formattedReply.match(wordRegex);
      const messageContainer = document.createElement("div");
      messageContainer.innerHTML = `
        <div class="chat-message">
            <img src="../assets/chatbot-icon.png" class="chat-avatar" />
            <div>
            <strong>FinBot:</strong><br><div class="bot-message"></div>
            </div>
        </div>
      `;
      chatbox.appendChild(messageContainer);

      const typingArea = messageContainer.querySelector(".bot-message");

      //Make FinBot type word by word for aesthetics and reenable input once it is done.
      let index = 0;
      function typeWordByWord() {
        if (index < words.length) {
          typingArea.innerHTML += words[index] + " ";
          index++;
          chatbox.scrollTop = chatbox.scrollHeight;
          setTimeout(typeWordByWord, 40); // 40 ms.
        } else {
          isSending = false;
          input.disabled = false;
          sendBtn.disabled = false;
          input.focus();
        }
      }

      typeWordByWord();
    } else {
      typingIndicator.remove();
      appendMessage("error", data.error?.message);
      isSending = false;
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    }
  } catch (err) {
    typingIndicator.remove();
    appendMessage("error", err.message);
    isSending = false;
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
  }
}

/**
 * Appends a new chat message to the chatbox.
 * 
 * @param {string} sender - The name of the sender (e.g., "You" or "FinBot").
 * @param {string} text - The message content.
 */
function appendMessage(sender, text) {
  try {
    const messageDiv = document.createElement("div");

    try {
      const isUser = sender === "You";
      const avatarUrl = isUser ? user.photoURL : "../assets/chatbot-icon.png";
      
      messageDiv.innerHTML = `
        <div class="chat-message">
          <img src="${avatarUrl}" class="chat-avatar" />
          <div>
            <strong>${sender}:</strong><br>${text}
          </div>
        </div>
      `;
    } catch (error) {
      console.error("Error creating message content:", error);
      // Fallback to simple text if HTML fails
      messageDiv.textContent = `${sender}: ${text}`;
    }

    try {
      chatbox.appendChild(messageDiv);
      chatbox.scrollTop = chatbox.scrollHeight;
    } catch (error) {
      console.error("Error appending message to chatbox:", error);
    }
    
  } catch (error) {
    console.error("General error in appendMessage:", error);
  }
}

//Initialize tour using Intro.js.
try{
document.getElementById("start-tour-btn").addEventListener("click", () => {
    try{
  introJs()
    .setOptions({
      steps: [
        {
          intro: "Welcome to FinTrack! Let’s take a quick tour of the app."
        },
        {
          element: document.querySelector('.nav-link-item[href="home.html"]'),
          intro: "This is your Dashboard where you'll see your balance, totals, and goals."
        },
        {
          element: document.querySelector('#open-modal-btn'),
          intro: "Click here to add a new transaction — income or expense."
        },
        {
          element: document.querySelector('.nav-link-item[href="summary.html"]'),
          intro: "See visual breakdowns of your spending and income on the Visualization page."
        },
        {
          element: document.querySelector('.nav-link-item[href="history.html"]'),
          intro: "Check your full transaction history here. You can filter, sort, and edit past entries."
        },
        {
          element: document.querySelector('#openModalBtn'),
          intro: "Need help or tips? Use our AI Assistant here to get guidance!"
        },
        {
          intro: "That's it! You’re now ready to track your finances like a pro 🎉"
        }
      ],
      showProgress: true,
      nextLabel: "Next",
      prevLabel: "Back",
      doneLabel: "Finish"
    })
    .start();
}catch{
    console.log("Tour had an error!");
}
});
}catch{
    console.log("Tour did not load!");
}

// Attach functions to the window object for global access.
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
window.addTransaction = addTransaction;
window.removeTransaction = removeTransaction;
window.updateTransaction = updateTransaction;
window.fetchTransactions = fetchTransactions;
window.displayTransactionCards = displayTransactionCards;
window.addGoal = addGoal;
window.removeGoal = removeGoal;
window.updateGoal = updateGoal;
window.fetchGoals = fetchGoals;
window.displayGoalCards = displayGoalCards;