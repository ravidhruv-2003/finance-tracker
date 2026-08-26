const firebaseConfig = {
  apiKey: "AIzaSyB6HT3nzFf720YLwL8Vw4t89gkVlSFqsa4",
  authDomain: "finance-tracker-2-a8bf3.firebaseapp.com",
  projectId: "finance-tracker-2-a8bf3",
  storageBucket: "finance-tracker-2-a8bf3.firebasestorage.app",
  messagingSenderId: "450726255472",
  appId: "1:450726255472:web:86fdd6e8367950e1408db5",
  measurementId: "G-591SMR6C39"
};

// Initialise Firebase
firebase.initializeApp(firebaseConfig);

// Export services (used by app.js)
const auth = firebase.auth();
const db   = firebase.firestore();