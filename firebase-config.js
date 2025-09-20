// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBQvr257MnUMdv-i4VkgjaGUPnSho3F_x0",
    authDomain: "minehead-badminton-tournament.firebaseapp.com",
    projectId: "minehead-badminton-tournament",
    storageBucket: "minehead-badminton-tournament.firebasestorage.app",
    messagingSenderId: "237720155580",
    appId: "1:237720155580:web:8faed76ef425f262d727b9",
    measurementId: "G-RG7J53MLE2"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics();
const auth = firebase.auth();
const db = firebase.firestore();

// Export for use in other files
window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDb = db;
