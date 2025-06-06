// Define all functions 
function searchRecords() {
    const searchTerm = document.getElementById('searchRecords').value.trim();
    loadUserRecords(searchTerm);
}

function loadUserRecords(searchTerm = '') {
    const recordsTableBody = document.getElementById('recordsTableBody');
    const noRecordsMessage = document.getElementById('noRecordsMessage');
    const recordsTable = document.querySelector('.records-table');

    // Mock data - in real app
    let records = [
        { date: '2023-07-15', activity: 'Weight Training', duration: '45 mins', notes: 'Focused on upper body' },
        { date: '2023-07-14', activity: 'Cardio', duration: '30 mins', notes: 'Treadmill interval training' },
        { date: '2023-07-12', activity: 'Yoga Class', duration: '60 mins', notes: 'Beginner level' },
        { date: '2023-07-10', activity: 'Personal Training', duration: '60 mins', notes: 'Strength assessment' },
        { date: '2023-07-08', activity: 'Swimming', duration: '45 mins', notes: 'Freestyle laps' }
    ];

    // Filter records if search term exists
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        records = records.filter(record =>
            record.date.toLowerCase().includes(term) ||
            record.activity.toLowerCase().includes(term) ||
            record.duration.toLowerCase().includes(term) ||
            record.notes.toLowerCase().includes(term)
        );
    }

    // Clear previous results
    recordsTableBody.innerHTML = '';

    if (records.length === 0) {
        recordsTable.style.display = 'none';
        noRecordsMessage.style.display = 'block';
        noRecordsMessage.textContent = searchTerm ? 'No matching records found' : 'No records available';
    } else {
        recordsTable.style.display = 'table';
        noRecordsMessage.style.display = 'none';

        // Create table rows for each record
        records.forEach(record => {
            const row = document.createElement('tr');
            
            const dateCell = document.createElement('td');
            dateCell.textContent = record.date;
            row.appendChild(dateCell);
            
            const activityCell = document.createElement('td');
            activityCell.textContent = record.activity;
            row.appendChild(activityCell);
            
            const durationCell = document.createElement('td');
            durationCell.textContent = record.duration;
            row.appendChild(durationCell);
            
            const notesCell = document.createElement('td');
            notesCell.textContent = record.notes;
            row.appendChild(notesCell);
            
            recordsTableBody.appendChild(row);
        });
    }
}
//load gym information
function loadGymInfo() {
    db.collection('gymInfo').doc('main').get()
        .then(doc => {
            if (doc.exists) {
                const gymInfo = doc.data();
                if (gymInfo.address) document.getElementById('gymAddress').textContent = gymInfo.address;
                if (gymInfo.phone) document.getElementById('gymPhone').textContent = gymInfo.phone;
                if (gymInfo.email) document.getElementById('gymEmail').textContent = gymInfo.email;
                if (gymInfo.weekdayHours) document.getElementById('weekdayHours').textContent = gymInfo.weekdayHours;
                if (gymInfo.saturdayHours) document.getElementById('saturdayHours').textContent = gymInfo.saturdayHours;
                if (gymInfo.sundayHours) document.getElementById('sundayHours').textContent = gymInfo.sundayHours;
            }
        })
        .catch(error => {
            console.error('Error loading gym information:', error);
        });

    // Load announcements
    db.collection('announcements')
        .orderBy('date', 'desc')
        .limit(5)
        .get()
        .then(querySnapshot => {
            const announcementsList = document.getElementById('announcementsList');
            announcementsList.innerHTML = '';

            if (querySnapshot.empty) {
                announcementsList.innerHTML = '<div class="info-item">No recent announcements</div>';
                return;
            }

            querySnapshot.forEach(doc => {
                const announcement = doc.data();
                const announcementItem = `
                    <div class="info-item">
                        <span class="info-label">${announcement.date.toDate().toLocaleDateString()}:</span>
                        <span class="info-value">${announcement.message}</span>
                    </div>
                `;
                announcementsList.innerHTML += announcementItem;
            });
        })
        .catch(error => {
            console.error('Error loading announcements:', error);
        });
}

// Load user data when page loads
document.addEventListener('DOMContentLoaded', function () {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || currentUser.role !== 'user') {
        window.location.href = 'index.html';
        return;
    }

    // Set user name
    document.getElementById('userName').textContent = currentUser.email.split('@')[0];

    // Load gym information
    loadGymInfo();
    
    // Load records
    loadUserRecords();
    
    // Add event listener for search button
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', searchRecords);
    } else {
        console.error('Search button not found');
    }
});