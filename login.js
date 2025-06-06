const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const registerRole = document.getElementById('registerRole');
const memberFields = document.getElementById('memberFields');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');
const loader = document.getElementById('loader');
const currentYear = document.getElementById('currentYear');

// Default admin 
const DEFAULT_ADMIN = {
    email: "admin@gmail.com",
    password: "Admin@123",
    role: "admin",
    name: "System Administrator"
};
currentYear.textContent = new Date().getFullYear();

// Switch login and register 
function switchTab(tab) {
    if (tab === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    } else {
        loginTab.classList.remove('active');
        registerTab.classList.add('active');
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
    }
}

// Show/hide member fields
registerRole.addEventListener('change', function () {
    memberFields.style.display = this.value === 'member' ? 'block' : 'none';
});

function calculateExpiryDate() {
    try {
        const date = new Date();
        date.setDate(date.getDate() + 30);

        if (isNaN(date.getTime())) {
            console.error("Invalid date created - falling back to default expiry");
            // Fallback: 30 days from now using a different approach
            const fallbackDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            return fallbackDate.toISOString();
        }

        return date.toISOString();
    } catch (error) {
        console.error("Error calculating expiry date:", error);
     
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }
}

//  Loader Functions
function showLoader(message = 'Processing, please wait...') {
    const loaderContent = loader.querySelector('.loader-content p');
    loaderContent.textContent = message;
    loader.classList.add('active');

    document.querySelectorAll('form input, form select, form button').forEach(element => {
        element.disabled = true;
        element.style.cursor = 'not-allowed';
        element.style.opacity = '0.7';
    });

    // Add overlay 
    const overlay = document.createElement('div');
    overlay.className = 'loader-overlay';
    document.body.appendChild(overlay);
}

function hideLoader() {
    loader.classList.remove('active');

    document.querySelectorAll('form input, form select, form button').forEach(element => {
        element.disabled = false;
        element.style.cursor = '';
        element.style.opacity = '';
    });

    const overlay = document.querySelector('.loader-overlay');
    if (overlay) {
        overlay.remove();
    }
}

//show error
function showError(element, message, duration = 5000) {
    element.textContent = message;
    element.classList.add('show');
 //auto hide
    const timer = setTimeout(() => {
        element.classList.remove('show');
    }, duration);
    return timer;
}

function hideError(element) {
    element.classList.remove('show');
}

// Event listeners for tab switching
loginTab.addEventListener('click', () => switchTab('login'));
registerTab.addEventListener('click', () => switchTab('register'));

// Login Form 
loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    hideError(loginError);

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const role = document.getElementById('loginRole').value;

    if (!email || !password || !role) {
        showError(loginError, 'Please fill in all fields');
        return;
    }

    showLoader('Authenticating...');

    try {
        if (email === DEFAULT_ADMIN.email && password === DEFAULT_ADMIN.password && role === 'admin') {
            showLoader('Setting up admin session...');

            // Store admin data in localStorage
            localStorage.setItem('currentUser', JSON.stringify({
                uid: 'default-admin-uid',
                email: DEFAULT_ADMIN.email,
                role: DEFAULT_ADMIN.role,
                name: DEFAULT_ADMIN.name
            }));

            await new Promise(resolve => setTimeout(resolve, 1000));
            window.location.href = 'admin.html';
            return;
        }

        showLoader('Signing in...');
        // Sign in with Firebase Auth 
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);

        showLoader('Loading user data...');
        // Get user document from Firestore
        let userDoc;
        if (role === 'member') {
            userDoc = await firebase.firestore().collection('members').doc(userCredential.user.uid).get();
        } else {
            userDoc = await firebase.firestore().collection('users').doc(userCredential.user.uid).get();
        }

        if (!userDoc.exists) {
            throw new Error('User not found in database');
        }

        // Verify role matches
        if (userDoc.data().role !== role) {
            throw new Error('Invalid role for this user');
        }

        // Store user data in localStorage
        localStorage.setItem('currentUser', JSON.stringify({
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            role: role,
            name: userDoc.data().name
        }));

        showLoader('Redirecting...');
        // Add slight delay for better UX
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Redirect based on role
        switch (role) {
            case 'admin':
                window.location.href = 'admin.html';
                break;
            case 'member':
                window.location.href = 'member.html';
                break;
            case 'user':
                window.location.href = 'user.html';
                break;
            default:
                throw new Error('Unknown role');
        }
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Login failed. Please try again.';

        if (error.code) {
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    errorMessage = 'Invalid email or password';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many attempts. Try again later.';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'This account has been disabled';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Please enter a valid email address';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Network error. Please check your connection.';
                    break;
                default:
                    errorMessage = error.message || errorMessage;
            }
        }

        showError(loginError, errorMessage);
    } finally {
        hideLoader();
    }
});

// Registration Form
registerForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    hideError(registerError);

    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const role = document.getElementById('registerRole').value;
    const phone = document.getElementById('registerPhone')?.value.trim() || '';
    const package = document.getElementById('registerPackage')?.value || '';

    if (!name || !email || !password || !confirmPassword || !role) {
        showError(registerError, 'Please fill in all required fields');
        return;
    }

    if (password !== confirmPassword) {
        showError(registerError, 'Passwords do not match');
        return;
    }

    if (password.length < 6) {
        showError(registerError, 'Password must be at least 6 characters');
        return;
    }

    if (role === 'member' && (!phone || !package)) {
        showError(registerError, 'Please fill in all member fields');
        return;
    }

    // registration of admin accounts
    if (role === 'admin') {
        showError(registerError, 'Admin accounts cannot be created through registration');
        return;
    }

    showLoader('Creating account...');
    try {
        // Create user with Firebase Auth
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        console.log('User created:', userCredential.user.uid);

        showLoader('Setting up your profile...');
        // Prepare user data for Firestore
        const userData = {
            name: name,
            email: email,
            role: role,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Add member-specific fields if needed
        if (role === 'member') {
            userData.phone = phone;
            userData.package = package;
            userData.status = 'active';
            userData.joinDate = new Date().toISOString().split('T')[0];
            userData.membershipExpires = calculateExpiryDate();
        }
        const collectionName = role === 'member' ? 'members' : 'users';

        showLoader('Finalizing registration...');
        // Add user to Firestore
        await firebase.firestore()
            .collection(collectionName)
            .doc(userCredential.user.uid)
            .set(userData);

        await new Promise(resolve => setTimeout(resolve, 1000));
        showError(registerError, 'Registration successful! Please login with your new account.');
        switchTab('login');
        registerForm.reset();
        memberFields.style.display = 'none';

    } catch (error) {
        console.error('Registration error:', error);
        let errorMessage = 'Registration failed. Please try again.';

        if (error.code) {
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'This email is already registered.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Please enter a valid email address.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password should be at least 6 characters.';
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = 'Registration is currently disabled.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Network error. Please check your connection.';
                    break;
                default:
                    errorMessage = error.message || errorMessage;
            }
        }
        showError(registerError, errorMessage);
    } finally {
        hideLoader();
    }
});