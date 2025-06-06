//  show the selected section and hide others
function showSection(sectionId) {
    // Hide all sections
    document.getElementById('billReceipts').style.display = 'none';
    document.getElementById('billNotifications').style.display = 'none';
    document.getElementById('profile-section').style.display = 'none';
    
    // Show the selected section
    document.getElementById(sectionId).style.display = 'block';
    
    // Update active state in navigation
    const navLinks = document.querySelectorAll('.member-nav a');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-section') === sectionId) {
            link.classList.add('active');
        }
    });

    // Load receipts when bills section is shown
    if (sectionId === 'billReceipts') {
        loadReceipts();
    }
}

// bills section visible
document.addEventListener('DOMContentLoaded', function() {
    showSection('billReceipts');
});

// Load member data 
document.addEventListener('DOMContentLoaded', function() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || currentUser.role !== 'member') {
        window.location.href = 'index.html';
    }
    
    loadMemberData(currentUser.uid);
    setupNotificationListener(currentUser.uid); 
});

// Setup notification listener for the member
function setupNotificationListener(uid) {
    return db.collection('notifications')
        .where('recipientType', '==', 'all')
        .orderBy('timestamp', 'desc')
        .limit(20)
        .onSnapshot(snapshot => {
            loadNotifications(); 
        }, error => {
            console.error('Error in notification listener:', error);
        });
}

// Load notifications for the member
function loadNotifications() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const notificationsList = document.getElementById('notificationsList');
    notificationsList.innerHTML = '<div class="loading">Loading notifications...</div>';

    const allNotificationsPromise = db.collection('notifications')
        .where('recipientType', '==', 'all')
        .orderBy('timestamp', 'desc')
        .limit(20)
        .get();

    // Get notifications specifically sent to this member
    const specificNotificationsPromise = db.collection('notifications')
        .where('recipientType', '==', 'selected')
        .where('recipients', 'array-contains', currentUser.uid)
        .orderBy('timestamp', 'desc')
        .limit(20)
        .get();

    Promise.all([allNotificationsPromise, specificNotificationsPromise])
        .then(([allSnap, specificSnap]) => {
            const notifications = [];
            
            allSnap.forEach(doc => {
                notifications.push({
                    id: doc.id,
                    ...doc.data(),
                    isPersonal: false
                });
            });

            // Process personal notifications
            specificSnap.forEach(doc => {
                notifications.push({
                    id: doc.id,
                    ...doc.data(),
                    isPersonal: true
                });
            });

            // Sort all notifications
            notifications.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());

            // Display notifications
            displayNotifications(notifications);
        })
        .catch(error => {
            console.error('Error loading notifications:', error);
            notificationsList.innerHTML = '<div class="error">Error loading notifications</div>';
        });
}

// Display notifications in the UI
function displayNotifications(notifications) {
    const notificationsList = document.getElementById('notificationsList');
    
    if (notifications.length === 0) {
        notificationsList.innerHTML = '<div class="no-notifications">No notifications found</div>';
        return;
    }

    notificationsList.innerHTML = '';
    
    notifications.forEach(notification => {
        const notificationElement = document.createElement('div');
        notificationElement.className = `notification ${notification.isPersonal ? 'personal' : ''}`;
        
        const date = notification.timestamp.toDate().toLocaleString();
        const personalBadge = notification.isPersonal ? '<span class="personal-badge">Personal</span>' : '';
        
        notificationElement.innerHTML = `
            <div class="notification-header">
                <span class="notification-sender">From: ${escapeHtml(notification.sentBy || 'System')}</span>
                <span class="notification-date">${date}</span>
                ${personalBadge}
            </div>
            <div class="notification-message">${escapeHtml(notification.message)}</div>
        `;
        
        notificationsList.appendChild(notificationElement);
    });
}

// Load member data
function loadMemberData(uid) {
    db.collection('members').doc(uid).get()
        .then(doc => {
            if (doc.exists) {
                const memberData = doc.data();
                document.getElementById('memberName').textContent = memberData.name;
                document.getElementById('profileName').textContent = memberData.name;
                document.getElementById('profileEmail').textContent = memberData.email;
                document.getElementById('profilePhone').textContent = memberData.phone || 'Not provided';
                document.getElementById('memberPackage').textContent = memberData.package ? memberData.package.charAt(0).toUpperCase() + memberData.package.slice(1) + ' Member' : 'Member';
                document.getElementById('profilePackage').textContent = memberData.package ? 
                    `${memberData.package.charAt(0).toUpperCase() + memberData.package.slice(1)} (${getPackagePrice(memberData.package)})` : 
                    'Not specified';
                document.getElementById('profileJoinDate').textContent = memberData.joinDate ? 
                    new Date(memberData.joinDate).toLocaleDateString() : 'Not available';
                
                // Set form values
                document.getElementById('updateName').value = memberData.name;
                document.getElementById('updatePhone').value = memberData.phone || '';
                document.getElementById('updatePackage').value = memberData.package || 'basic';
            }
        })
        .catch(error => {
            console.error('Error loading member data:', error);
        });
}

function getPackagePrice(packageType) {
    switch(packageType) {
        case 'basic': return '$50/month';
        case 'premium': return '$80/month';
        case 'platinum': return '$120/month';
        default: return '';
    }
}

// Show update profile form
function showUpdateProfileForm() {
    document.getElementById('updateProfileForm').style.display = 'block';
}

// Cancel profile update
function cancelUpdateProfile() {
    document.getElementById('updateProfileForm').style.display = 'none';
}

// Update profile
function updateProfile() {
    const uid = JSON.parse(localStorage.getItem('currentUser')).uid;
    const name = document.getElementById('updateName').value;
    const phone = document.getElementById('updatePhone').value;
    const package = document.getElementById('updatePackage').value;
    
    db.collection('members').doc(uid).update({
        name: name,
        phone: phone,
        package: package
    })
    .then(() => {
        alert('Profile updated successfully!');
        loadMemberData(uid);
        document.getElementById('updateProfileForm').style.display = 'none';
    })
    .catch(error => {
        console.error('Error updating profile:', error);
        alert('Error updating profile. Please try again.');
    });
}

// Utility function to escape HTML
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ---------------- BILLING RELATED FUNCTIONS--------------------  //

// Load receipts for the member
function loadReceipts(filter = 'all', searchTerm = '') {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    const receiptsList = document.getElementById('receiptsList');
    receiptsList.innerHTML = '<div class="loading">Loading receipts...</div>';

    let query = db.collection('bills')
                .where('memberId', '==', currentUser.uid)
                .orderBy('createdAt', 'desc');

    // Apply filter if not 'all'
    if (filter !== 'all') {
        query = query.where('status', '==', filter);
    }

    query.get().then((querySnapshot) => {
        receiptsList.innerHTML = '';

        if (querySnapshot.empty) {
            receiptsList.innerHTML = '<div class="no-receipts">No receipts found</div>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const receipt = doc.data();
            const receiptId = doc.id;

            // Apply search filter if term exists
            if (searchTerm &&
                !receipt.memberName.toLowerCase().includes(searchTerm.toLowerCase()) &&
                !receipt.package.toLowerCase().includes(searchTerm.toLowerCase())) {
                return; 
            }

            const date = receipt.date || (receipt.createdAt ? receipt.createdAt.toDate().toLocaleDateString() : 'N/A');
            const statusClass = receipt.status.toLowerCase();

            const receiptCard = document.createElement('div');
            receiptCard.className = `receipt-card ${statusClass}`;
            receiptCard.innerHTML = `
                <div class="receipt-header">
                    <h3>${escapeHtml(receipt.memberName)}</h3>
                    <span class="status-badge ${statusClass}">${receipt.status}</span>
                </div>
                <div class="receipt-details">
                    <p><strong>Package:</strong> ${escapeHtml(receipt.package)}</p>
                    <p><strong>Date:</strong> ${date}</p>
                    <p><strong>Total:</strong> ₹${receipt.totalAmount.toFixed(2)}</p>
                </div>
                <div class="receipt-actions">
                    <button class="view-btn" onclick="viewReceiptDetail('${receiptId}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    ${receipt.status.toLowerCase() === 'pending' ?
                        `<button class="pay-btn" onclick="markAsPaid('${receiptId}')">
                            <i class="fas fa-check"></i> Mark Paid
                        </button>` : ''}
                </div>
            `;

            receiptsList.appendChild(receiptCard);
        });
    }).catch((error) => {
        console.error("Error loading receipts: ", error);
        receiptsList.innerHTML = '<div class="error">Failed to load receipts. Please try again.</div>';
    });
}

// View receipt details
function viewReceiptDetail(receiptId) {
    db.collection('bills').doc(receiptId).get().then((doc) => {
        if (doc.exists) {
            const receipt = doc.data();
            let itemsText = '';
            
            receipt.items.forEach(item => {
                itemsText += `
${item.name} - Qty: ${item.qty}, Price: ₹${item.price.toFixed(2)}, Total: ₹${item.total.toFixed(2)}\n`;
            });
            
            const alertText = `
Receipt Details
----------------
Member: ${receipt.memberName}
Package: ${receipt.package}
Date: ${receipt.date || 'N/A'}
Status: ${receipt.status}

Items:
${itemsText}
----------------
Total Amount: ₹${receipt.totalAmount.toFixed(2)}
`;
            alert(alertText);
        }
    });
}

// Mark receipt as paid
function markAsPaid(receiptId) {
    if (confirm("Are you sure you want to mark this receipt as paid?")) {
        db.collection('bills').doc(receiptId).update({
            status: 'paid',
            updatedAt: new Date()
        }).then(() => {
            loadReceipts(); // Refresh the list
        }).catch((error) => {
            console.error("Error updating receipt: ", error);
            alert("Failed to update receipt status.");
        });
    }
}

// Event listeners for receipt search and filter
document.getElementById('receiptSearch')?.addEventListener('input', (e) => {
    const filter = document.getElementById('receiptFilter').value;
    loadReceipts(filter, e.target.value);
});

document.getElementById('receiptFilter')?.addEventListener('change', (e) => {
    const searchTerm = document.getElementById('receiptSearch').value;
    loadReceipts(e.target.value, searchTerm);
});