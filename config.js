/**
 * Firebase Configuration for MyToDoList
 * Project ID: my-to-do-list-fd68c
 */

// Default configuration with official Firebase credentials
export const defaultFirebaseConfig = {
  apiKey: "AIzaSyBLDN3dD-oSGHXLTHBHGdizpIWPRfvFJbE",
  authDomain: "my-to-do-list-fd68c.firebaseapp.com",
  projectId: "my-to-do-list-fd68c",
  storageBucket: "my-to-do-list-fd68c.firebasestorage.app",
  messagingSenderId: "44306189243",
  appId: "1:44306189243:web:374112914c05803951d29e",
  measurementId: "G-X9R96WBC5B"
};

/**
 * Retrieve active Firebase config, checking localStorage first for user override
 */
export function getFirebaseConfig() {
  const stored = localStorage.getItem("my_todo_firebase_config");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return { ...defaultFirebaseConfig, ...parsed };
    } catch (e) {
      console.warn("Failed to parse stored Firebase config", e);
    }
  }
  return defaultFirebaseConfig;
}

/**
 * Save user Firebase config override to localStorage
 */
export function saveFirebaseConfig(config) {
  localStorage.setItem("my_todo_firebase_config", JSON.stringify(config));
}

/**
 * Reset Firebase config override
 */
export function resetFirebaseConfig() {
  localStorage.removeItem("my_todo_firebase_config");
}
