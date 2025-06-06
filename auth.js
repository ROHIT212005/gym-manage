// Get current member's name from Firebase Auth
function getCurrentMemberName() {
  const user = firebase.auth().currentUser;
  if (!user) {
      console.error("No user logged in");
      return null;
  }
  if (user.displayName) return user.displayName;
  
}

// Check if user is admin
function isAdminUser() {
  const user = firebase.auth().currentUser;
  if (!user) return false;
  
  // Option 1: Check custom claims (recommended)
  return user.getIdTokenResult()
      .then((idTokenResult) => {
          return !!idTokenResult.claims.admin;
      })
      .catch(() => false);
  
}

// Login function
function login(email, password, role) {
  console.log(`Attempting login for ${email} as ${role}`);
  return auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      console.log(`User ${email} logged in successfully`);
      localStorage.setItem('currentUser', JSON.stringify({
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        role: role
      }));
      return role;
    })
    .catch((error) => {
      console.error(`Login failed for ${email}:`, error);
      throw error;
    });
}

// Logout function
function logout() {
  const user = JSON.parse(localStorage.getItem('currentUser'));
  if (user) {
    console.log(`Logging out user ${user.email}`);
    localStorage.removeItem('currentUser');
  } else {
    console.warn('No user is currently logged in.');
  }
  return auth.signOut();
}

// Check auth state
auth.onAuthStateChanged((user) => {
  if (!user) {
    console.log('No user is logged in. Redirecting to login page.');
    window.location.href = 'index.html';
  } else {
    console.log(`User is logged in: ${user.email}`);
  }
});


