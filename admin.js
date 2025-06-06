document.addEventListener('DOMContentLoaded', function () {
  //check admin role
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (!currentUser || currentUser.role !== 'admin') {
    window.location.href = 'index.html';
    return;
  }

  // Initialize Firestore
  const db = firebase.firestore();

  // Navigation functionality
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const navMenu = document.getElementById('navMenu');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section');

  //For mobile menu
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', function () {
      navMenu.classList.toggle('active');
    });
  }

  // navigation link clicks
  if (navLinks.length > 0) {
    navLinks.forEach(link => {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        const sectionId = this.getAttribute('data-section');

        // Hide all sections
        sections.forEach(section => {
          section.classList.remove('active');
        });

        // Show selected section
        document.getElementById(sectionId).classList.add('active');

        // Update active nav link
        navLinks.forEach(link => link.classList.remove('active'));
        this.classList.add('active');

        // Close mobile menu if open
        if (navMenu) {
          navMenu.classList.remove('active');
        }
      });
    });
  }

  // Show members section by default 
  const membersSection = document.getElementById('membersSection');
  if (membersSection) {
    membersSection.classList.add('active');
  }

  // Diet Plan 
  const dietPlanForm = document.getElementById('addDietPlanForm');
  const dietPlansTable = document.getElementById('dietPlansTable');

  if (dietPlanForm) {
    dietPlanForm.addEventListener('submit', handleAddDietPlan);
  }

  async function fetchPlans() {
    if (!dietPlansTable) return;

    dietPlansTable.innerHTML = "";
    const snapshot = await db.collection("dietPlans").get();

    if (snapshot.empty) {
      dietPlansTable.innerHTML = '<tr><td colspan="5" class="no-data">No diet plans found</td></tr>';
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data();
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${escapeHtml(data.name)}</td>
        <td>${escapeHtml(data.description)}</td>
        <td>${data.calories}</td>
        <td>${escapeHtml(data.duration)}</td>
        <td>${escapeHtml(data.difficulty)}</td>
        <td class="actions">
          <button data-id="${doc.id}" class="btn-edit">Edit</button>
          <button data-id="${doc.id}" class="btn-delete">Delete</button>
        </td>
      `;
      dietPlansTable.appendChild(row);
    });
  }

  if (dietPlansTable) {
    dietPlansTable.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      if (!id) return;

      if (e.target.classList.contains('btn-edit')) {
        handleEditDietPlan(id);
      } else if (e.target.classList.contains('btn-delete')) {
        handleDeleteDietPlan(id);
      }
    });
  }
  //diet plan edit and delete
  async function handleEditDietPlan(id) {
    try {
      const doc = await db.collection('dietPlans').doc(id).get();
      if (!doc.exists) {
        throw new Error('Diet plan not found');
      }

      const plan = doc.data();
      const form = document.getElementById('addDietPlanForm');

      form.querySelector('[name="name"]').value = plan.name || '';
      form.querySelector('[name="description"]').value = plan.description || '';
      form.querySelector('[name="calories"]').value = plan.calories || 0;
      form.querySelector('[name="duration"]').value = plan.duration || '';
      form.querySelector('[name="difficulty"]').value = plan.difficulty || 'beginner';

      form.dataset.editId = id;
      form.querySelector('button[type="submit"]').textContent = 'Update Diet Plan';
      form.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.error('Error loading diet plan for edit:', error);
      showAlert(`Error: ${error.message}`, 'error');
    }
  }

  async function handleDeleteDietPlan(id) {
    if (!confirm('Are you sure you want to delete this diet plan? This action cannot be undone.')) return;

    try {
      await db.collection('dietPlans').doc(id).delete();
      showAlert('Diet plan deleted successfully!', 'success');
      fetchPlans();
    } catch (error) {
      console.error('Error deleting diet plan:', error);
      showAlert('Error deleting diet plan', 'error');
    }
  }

  // bill preview display
  function displayBillPreview(bill) {
    const generatedBill = document.getElementById('generatedBill');
    if (!generatedBill) return;

    document.getElementById('displayMemberName').textContent = bill.memberName;
    document.getElementById('displayPackage').textContent = bill.package;
    document.getElementById('displayDate').textContent = bill.date;

    const tableBody = document.getElementById('billItemsTable');
    tableBody.innerHTML = '';

    bill.items.forEach(item => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${escapeHtml(item.name)}</td>
        <td>${item.qty}</td>
        <td>₹${item.price.toFixed(2)}</td>
        <td>₹${item.total.toFixed(2)}</td>
      `;
      tableBody.appendChild(row);
    });

    document.getElementById('displayTotalAmount').textContent = bill.totalAmount.toFixed(2);
    generatedBill.style.display = 'block';
  }

  // Billing functionality
  function loadMembersForBilling() {
    const memberSelect = document.getElementById('billMemberSelect');
    db.collection("members").get().then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const member = doc.data();
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = member.name;
        memberSelect.appendChild(option);
      });
    });
  }

  function createBill() {
    const memberId = document.getElementById('billMemberSelect').value;
    const package = document.getElementById('billPackage').value;
    const date = document.getElementById('billDate').value;

    // Get all bill items
    const items = [];
    const itemElements = document.querySelectorAll('.billItem');
    let totalAmount = 0;

    itemElements.forEach(item => {
      const name = item.querySelector('.itemName').value;
      const qty = parseFloat(item.querySelector('.itemQty').value);
      const price = parseFloat(item.querySelector('.itemPrice').value);
      const total = qty * price;

      items.push({ name, qty, price, total });
      totalAmount += total;
    });

    // Get member name
    const memberName = document.getElementById('billMemberSelect').options[document.getElementById('billMemberSelect').selectedIndex].text;

    // Save to Firestore
    db.collection("bills").add({
      memberId: memberId,
      memberName: memberName,
      package: package,
      date: date,
      items: items,
      totalAmount: totalAmount,
      status: 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      showAlert('Bill created successfully!', 'success');
      document.getElementById('createBillForm').reset();
      document.getElementById('billItemsContainer').innerHTML = `
        <div class="billItem">
          <input type="text" class="itemName" placeholder="Item Name" required>
          <input type="number" class="itemQty" placeholder="Quantity" required>
          <input type="number" class="itemPrice" placeholder="Price" required>
        </div>
      `;

      // Display the generated bill
      displayBillPreview({
        memberName,
        package,
        date,
        items,
        totalAmount
      });
    }).catch(error => {
      console.error("Error creating bill: ", error);
      showAlert("Failed to create bill.", 'error');
    });
  }

  function addBillItem() {
    const container = document.getElementById('billItemsContainer');
    const newItem = document.createElement('div');
    newItem.className = 'billItem';
    newItem.innerHTML = `
      <input type="text" class="itemName" placeholder="Item Name" required>
      <input type="number" class="itemQty" placeholder="Quantity" required>
      <input type="number" class="itemPrice" placeholder="Price" required>
      <button type="button" class="remove-item-btn" onclick="removeBillItem(this)">×</button>
    `;
    container.appendChild(newItem);
  }

  function removeBillItem(button) {
    const items = document.querySelectorAll('.billItem');
    if (items.length > 1) {
      button.parentElement.remove();
    } else {
      showAlert("At least one item is required", 'error');
    }
  }


  // Initialize billing functionality
  if (document.getElementById('createBillForm')) {
    loadMembersForBilling();
    document.getElementById('createBillForm').addEventListener('submit', function (e) {
      e.preventDefault();
      createBill();
    });
  }

  const membersUnsubscribe = db.collection('members')
    .orderBy('createdAt', 'desc')
    .onSnapshot(handleMembersUpdate, handleError);

  const notificationsUnsubscribe = db.collection('notifications')
    .orderBy('timestamp', 'desc')
    .limit(5)
    .onSnapshot(handleNotificationsUpdate, handleError);

  const supplementsUnsubscribe = db.collection('supplements')
    .orderBy('createdAt', 'desc')
    .onSnapshot(handleSupplementsUpdate, handleError);


  const addMemberForm = document.getElementById('addMemberForm');
  if (addMemberForm) {
    addMemberForm.addEventListener('submit', handleAddMember);
  }

  const sendNotificationForm = document.getElementById('sendNotificationForm');
  if (sendNotificationForm) {
    sendNotificationForm.addEventListener('submit', handleSendNotification);
  }

  const addSupplementForm = document.getElementById('addSupplementForm');
  if (addSupplementForm) {
    addSupplementForm.addEventListener('submit', handleAddSupplement);
  }

  // Add recipient type change listener
  const recipientType = document.getElementById('recipientType');
  if (recipientType) {
    recipientType.addEventListener('change', function () {
      const memberSelectionGroup = document.getElementById('memberSelectionGroup');
      memberSelectionGroup.style.display = this.value === 'selected' ? 'block' : 'none';
      if (this.value === 'selected') {
        loadMembersForSelection();
      }
    });
  }

  // Add logout button event listener
  const logoutBtn = document.querySelector('button[onclick="logout()"]');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  // Clean up listeners when page unloads
  window.addEventListener('beforeunload', () => {
    membersUnsubscribe();
    notificationsUnsubscribe();
    supplementsUnsubscribe();
  });

  // Load members for notification 
  function loadMembersForSelection() {
    const membersCheckboxList = document.getElementById('membersCheckboxList');
    if (!membersCheckboxList) return;

    membersCheckboxList.innerHTML = '<div class="loading">Loading members...</div>';

    db.collection('members').get()
      .then((querySnapshot) => {
        membersCheckboxList.innerHTML = '';

        if (querySnapshot.empty) {
          membersCheckboxList.innerHTML = '<div class="loading">No members found</div>';
          return;
        }

        querySnapshot.forEach((doc) => {
          const member = doc.data();
          const checkboxDiv = document.createElement('div');
          checkboxDiv.className = 'member-checkbox';
          checkboxDiv.innerHTML = `
            <input type="checkbox" id="member_${doc.id}" name="members" value="${doc.id}">
            <label for="member_${doc.id}">${escapeHtml(member.name || member.email)}</label>
          `;
          membersCheckboxList.appendChild(checkboxDiv);
        });
      })
      .catch((error) => {
        console.error("Error loading members: ", error);
        membersCheckboxList.innerHTML = '<div class="loading">Error loading members</div>';
      });
  }

  // notifications update
  function handleNotificationsUpdate(snapshot) {
    const notificationsList = document.getElementById('notificationsList');
    if (!notificationsList) return;

    notificationsList.innerHTML = '';

    if (snapshot.empty) {
      notificationsList.innerHTML = '<li class="no-data">No notifications found</li>';
      return;
    }

    snapshot.forEach(doc => {
      const notification = doc.data();
      const li = document.createElement('li');

      let recipientsInfo = '';
      if (notification.recipientType === 'selected') {
        recipientsInfo = ` (Sent to ${notification.recipients ? notification.recipients.length : 0} members)`;
      }

      li.innerHTML = `
        <div class="notification-message">${escapeHtml(notification.message)}</div>
        <div class="notification-meta">
          Sent by ${escapeHtml(notification.sentBy || 'System')} on 
          ${notification.timestamp?.toDate().toLocaleString()}${recipientsInfo}
        </div>
      `;
      notificationsList.appendChild(li);
    });
  }

  //send notification function
  async function handleSendNotification(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const sendBtn = form.querySelector('button[type="submit"]');

    try {
      const message = formData.get('message')?.toString().trim();
      const recipientType = formData.get('recipientType')?.toString();

      if (!message) throw new Error('Notification message is required');
      if (!recipientType) throw new Error('Recipient type is required');

      sendBtn.disabled = true;
      sendBtn.textContent = 'Sending...';

      const notificationData = {
        message,
        recipientType,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        sentBy: currentUser.name || currentUser.email
      };

      if (recipientType === 'selected') {
        const selectedMembers = Array.from(document.querySelectorAll('#memberSelectionGroup input[type="checkbox"]:checked'))
          .map(checkbox => checkbox.value);

        if (selectedMembers.length === 0) {
          throw new Error('Please select at least one member');
        }

        notificationData.recipients = selectedMembers;
      }

      await db.collection('notifications').add(notificationData);
      showAlert('Notification sent successfully!', 'success');
      form.reset();
      document.getElementById('memberSelectionGroup').style.display = 'none';
    } catch (error) {
      console.error('Error sending notification:', error);
      showAlert(`Error: ${error.message}`, 'error');
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send Notification';
    }
  }
  //Update members and supplements
  function handleMembersUpdate(snapshot) {
    const membersTable = document.getElementById('membersTable');
    if (!membersTable) return;

    membersTable.innerHTML = '';

    if (snapshot.empty) {
      membersTable.innerHTML = '<tr><td colspan="6" class="no-data">No members found</td></tr>';
      return;
    }

    snapshot.forEach(doc => {
      const member = doc.data();
      membersTable.appendChild(createMemberRow(doc.id, member));
    });
  }

  function handleSupplementsUpdate(snapshot) {
    const supplementsTable = document.getElementById('supplementsTable');
    if (!supplementsTable) return;

    supplementsTable.innerHTML = '';

    if (snapshot.empty) {
      supplementsTable.innerHTML = '<tr><td colspan="5" class="no-data">No supplements found</td></tr>';
      return;
    }

    snapshot.forEach(doc => {
      const supplement = doc.data();
      supplementsTable.appendChild(createSupplementRow(doc.id, supplement));
    });
  }
  //show table data

  function createMemberRow(id, member) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td data-label="Name">${escapeHtml(member.name)}</td>
      <td data-label="Email">${escapeHtml(member.email)}</td>
      <td data-label="Phone">${formatPhone(member.phone)}</td>
      <td data-label="Package" class="package ${member.package}">${formatPackage(member.package)}</td>
      <td data-label="Join Date">${formatDate(member.joinDate)}</td>
      <td data-label="Actions" class="actions">
        <button data-id="${id}" class="btn-edit">Edit</button>
        <button data-id="${id}" class="btn-delete">Delete</button>
      </td>
    `;
    return row;
  }

  function createSupplementRow(id, supplement) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td data-label="Name">${escapeHtml(supplement.name)}</td>
      <td data-label="Description">${escapeHtml(supplement.description)}</td>
      <td data-label="Price">$${(supplement.price || 0).toFixed(2)}</td>
      <td data-label="Stock">${supplement.stock || 0}</td>
      <td data-label="Actions" class="actions">
        <button data-id="${id}" class="btn-edit">Edit</button>
        <button data-id="${id}" class="btn-delete">Delete</button>
      </td>
    `;
    return row;
  }
  //add member function
  async function handleAddMember(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const isEditMode = form.dataset.editId;

    try {
      const memberData = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        package: formData.get('package'),
        joinDate: new Date(formData.get('joinDate')).toISOString(),
        status: 'active'
      };

      if (!memberData.name || !memberData.email) {
        throw new Error('Name and email are required');
      }

      if (isEditMode) {
        await db.collection('members').doc(form.dataset.editId).update(memberData);
        showAlert('Member updated successfully!', 'success');
      } else {
        memberData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('members').add(memberData);
        showAlert('Member added successfully!', 'success');
      }

      form.reset();
      delete form.dataset.editId;
      form.querySelector('button[type="submit"]').textContent = 'Add Member';
    } catch (error) {
      console.error(isEditMode ? 'Error updating member:' : 'Error adding member:', error);
      showAlert(`Error: ${error.message}`, 'error');
    }
  }

  const membersTable = document.getElementById('membersTable');
  if (membersTable) {
    membersTable.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      if (!id) return;

      if (e.target.classList.contains('btn-edit')) {
        handleEditMember(id);
      } else if (e.target.classList.contains('btn-delete')) {
        handleDeleteMember(id);
      }
    });
  }

  function handleEditMember(id) {
    db.collection('members').doc(id).get()
      .then(doc => {
        if (!doc.exists) {
          throw new Error('Member not found');
        }

        const member = doc.data();
        const form = document.getElementById('addMemberForm');

        form.querySelector('[name="name"]').value = member.name || '';
        form.querySelector('[name="email"]').value = member.email || '';
        form.querySelector('[name="phone"]').value = member.phone || '';
        form.querySelector('[name="package"]').value = member.package || 'basic';

        const joinDate = member.joinDate ? new Date(member.joinDate) : new Date();
        const formattedDate = joinDate.toISOString().split('T')[0];
        form.querySelector('[name="joinDate"]').value = formattedDate;

        form.dataset.editId = id;
        form.querySelector('button[type="submit"]').textContent = 'Update Member';
        form.scrollIntoView({ behavior: 'smooth' });
      })
      .catch(error => {
        console.error('Error loading member for edit:', error);
        showAlert(`Error: ${error.message}`, 'error');
      });
  }

  async function handleDeleteMember(id) {
    if (!confirm('Are you sure you want to delete this member? This action cannot be undone.')) return;

    try {
      await db.collection('members').doc(id).delete();
      showAlert('Member deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting member:', error);
      showAlert('Error deleting member', 'error');
    }
  }

  function handleError(error) {
    console.error('Error in Firestore listener:', error);
    showAlert('Error loading data', 'error');
  }

  // Utility functions
  function formatPackage(pkg) {
    const packageNames = {
      'basic': 'Basic',
      'premium': 'Premium',
      'platinum': 'Platinum'
    };
    return packageNames[pkg] || pkg;
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatPhone(phone) {
    return phone ? phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3') : 'N/A';
  }

  function escapeHtml(unsafe) {
    if (!unsafe) return 'N/A';
    return unsafe.toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
  }

  function logout() {
    localStorage.removeItem('currentUser');

    firebase.auth().signOut()
      .then(() => {
        window.location.href = 'index.html';
      })
      .catch(error => {
        console.error('Logout error:', error);
        showAlert('Error during logout', 'error');
      });
  }
  //add supplement function
  async function handleAddSupplement(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const isEditMode = form.dataset.editId;

    try {
      const name = formData.get('name')?.toString().trim();
      const description = formData.get('description')?.toString().trim();
      const price = parseFloat(formData.get('price')) || 0;
      const stock = parseInt(formData.get('stock')) || 0;

      if (!name) throw new Error('Supplement name is required');
      if (isNaN(price) || price < 0) throw new Error('Price must be a positive number');
      if (isNaN(stock) || stock < 0) throw new Error('Stock must be a positive integer');

      const supplementData = {
        name,
        description: description || 'No description provided',
        price,
        stock
      };

      if (isEditMode) {
        await db.collection('supplements').doc(form.dataset.editId).update(supplementData);
        showAlert('Supplement updated successfully!', 'success');
      } else {
        supplementData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('supplements').add(supplementData);
        showAlert('Supplement added successfully!', 'success');
      }

      form.reset();
      delete form.dataset.editId;
      form.querySelector('button[type="submit"]').textContent = 'Add Supplement';
    } catch (error) {
      console.error(isEditMode ? 'Error updating supplement:' : 'Error adding supplement:', error);
      showAlert(`Error: ${error.message}`, 'error');
    }
  }

  const supplementsTable = document.getElementById('supplementsTable');
  if (supplementsTable) {
    supplementsTable.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      if (!id) return;

      if (e.target.classList.contains('btn-edit')) {
        handleEditSupplement(id);
      } else if (e.target.classList.contains('btn-delete')) {
        handleDeleteSupplement(id);
      }
    });
  }

  function handleEditSupplement(id) {
    db.collection('supplements').doc(id).get()
      .then(doc => {
        if (!doc.exists) {
          throw new Error('Supplement not found');
        }

        const supplement = doc.data();
        const form = document.getElementById('addSupplementForm');

        form.querySelector('[name="name"]').value = supplement.name || '';
        form.querySelector('[name="description"]').value = supplement.description || '';
        form.querySelector('[name="price"]').value = supplement.price || 0;
        form.querySelector('[name="stock"]').value = supplement.stock || 0;

        form.dataset.editId = id;
        form.querySelector('button[type="submit"]').textContent = 'Update Supplement';
        form.scrollIntoView({ behavior: 'smooth' });
      })
      .catch(error => {
        console.error('Error loading supplement for edit:', error);
        showAlert(`Error: ${error.message}`, 'error');
      });
  }

  async function handleDeleteSupplement(id) {
    if (!confirm('Are you sure you want to delete this supplement? This action cannot be undone.')) return;

    try {
      await db.collection('supplements').doc(id).delete();
      showAlert('Supplement deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting supplement:', error);
      showAlert('Error deleting supplement', 'error');
    }
  }
  async function handleAddDietPlan(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const isEditMode = form.dataset.editId;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
  
    try {
      // Disable submit button during processing
      submitBtn.disabled = true;
      submitBtn.textContent = isEditMode ? 'Updating...' : 'Adding...';
  
      // Get and validate form values
      const name = document.getElementById('name').value.trim();
      const description = document.getElementById('description').value.trim();
      const calories = parseInt(document.getElementById('calories').value);
      const duration = document.getElementById('duration').value.trim();
      const difficulty = document.getElementById('difficulty').value.trim() || 'beginner';
  
      // Validate required fields with specific error messages
      if (!name) {
        throw new Error('Please select a diet plan');
      }
      if (!description) {
        throw new Error('Please enter a description');
      }
      if (isNaN(calories)) {
        throw new Error('Please enter a valid number for calories');
      }
      if (calories < 0) {
        throw new Error('Calories cannot be negative');
      }
      if (!duration) {
        throw new Error('Please specify the duration');
      }
  
      // Prepare diet plan data
      const dietPlan = {
        name,
        description,
        calories,
        duration,
        difficulty
      };
      
      // Add/update to Firestore
      if (isEditMode) {
        await db.collection('dietPlans').doc(form.dataset.editId).update(dietPlan);
        showAlert('Diet plan updated successfully!', 'success');
      } else {
        dietPlan.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('dietPlans').add(dietPlan);
        showAlert('Diet plan added successfully!', 'success');
      }
  
      // Reset form
      form.reset();
      delete form.dataset.editId;
      submitBtn.textContent = 'Add Diet Plan';
      fetchPlans();
    } catch (error) {
      console.error(isEditMode ? 'Error updating diet plan:' : 'Error adding diet plan:', error);
      showAlert(error.message, 'error');
  
      // Highlight problematic fields
      if (error.message.includes('plan')) {
        document.getElementById('name').focus();
      } else if (error.message.includes('description')) {
        document.getElementById('description').focus();
      } else if (error.message.includes('calories')) {
        document.getElementById('calories').focus();
      } else if (error.message.includes('duration')) {
        document.getElementById('duration').focus();
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  }
  async function handleEditDietPlan(id) {
    try {
      const doc = await db.collection('dietPlans').doc(id).get();
      if (!doc.exists) {
        throw new Error('Diet plan not found');
      }
  
      const plan = doc.data();
      const form = document.getElementById('addDietPlanForm');
  
      // Set form values using the IDs from HTML
      document.getElementById('name').value = plan.name || '';
      document.getElementById('description').value = plan.description || '';
      document.getElementById('calories').value = plan.calories || 0;
      document.getElementById('duration').value = plan.duration || '';
      document.getElementById('difficulty').value = plan.difficulty || 'Beginner';
  
      form.dataset.editId = id;
      form.querySelector('button[type="submit"]').textContent = 'Update Diet Plan';
      
      // Scroll to form and focus on first field
      form.scrollIntoView({ behavior: 'smooth' });
      document.getElementById('name').focus();
    } catch (error) {
      console.error('Error loading diet plan for edit:', error);
      showAlert(`Error: ${error.message}`, 'error');
    }
  }


  // Initialize data fetching
  fetchPlans();
});

// Make billing functions globally available
window.addBillItem = function () {
  const container = document.getElementById('billItemsContainer');
  const newItem = document.createElement('div');
  newItem.className = 'billItem';
  newItem.innerHTML = `
    <input type="text" class="itemName" placeholder="Item Name" required>
    <input type="number" class="itemQty" placeholder="Quantity" required>
    <input type="number" class="itemPrice" placeholder="Price" required>
    <button type="button" class="remove-item-btn" onclick="removeBillItem(this)">×</button>
  `;
  container.appendChild(newItem);
}

window.removeBillItem = function (button) {
  const items = document.querySelectorAll('.billItem');
  if (items.length > 1) {
    button.parentElement.remove();
  } else {
    alert("At least one item is required");
  }
}

window.printBill = function () {
  window.print();
}