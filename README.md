# -GYM-Management-System
The GYM Management System is a web-based application designed to modernize and streamline the operations of fitness centers. It provides a digital platform for managing gym members, tracking payments, sending notifications, handling supplements and diet plans, and maintaining personalized user portals.


🔗 Live Project: https://rohit212005.github.io/gym-manage/

✨ Problem Statement

Paper-based gym receipts are prone to loss and are hard to manage. Additionally, gym owners face difficulty communicating timely updates manually. This project solves these issues by digitizing receipts and automating notifications.


## 💡 Features
- 🔐 Secure Login/Register (Admin, Member, User)
- 👤 Member Management (CRUD)
- 💳 Bill Generation & Receipt Viewing
- 📢 Notification System (All/Selected Members)
- 🛒 Supplement Store
- 🥗 Diet Plan Management
- 📁 Data stored securely in Firebase
- 🧪 Modular, Testable, Maintainable, Portable Code

## 🛠️ Technologies
- HTML, CSS, JavaScript
- Firebase Auth, Firestore, Realtime Database, Storage

## 🔗 Modules
🔍 Modules Overview

Admin
 - Add/Update/Delete Members
 - Create and manage Bills
 - Assign Fee Packages
 - Manage Supplements and Diet Plans
 - Send Notifications

   
Member
 - View Bill Receipts
 - Receive Notifications
 - Manage Profile

   
User
 - View Gym Info
 - Search Records

## 📊 Project Evaluation Metrics
- Modular code with proper logging
- Firebase for authentication and data
- CRUD operations for members, supplements, diet plans, bills
- Notifications with filtering
- Export-ready structure and workflow

## 🔒 Safe, Testable, Portable
- Code follows best practices (form validations, role checks, localStorage/sessionStorage use)
- Can be tested easily using mock Firebase data
- Compatible across browsers and platforms

## 🧪 Testing
- Unit tests for major functions (if applicable)
- Manual validation for UI interactions

## 🚀 How to Run
1. Clone the repo
2. Open `login.html` in a browser
3. Use default admin:  
   - Email: `admin@example.com`  
   - Password: `Admin@123`

📑 Project Structure
   / (Root)
    - index.html
    - admin.html
    - member.html
    - user.html
    - firebase-config.js
    - login.js
    - admin.js
    - member.js
    - user.js
    - auth.js
    - style.css
    - admin.css
    - member.css
    - user.css
