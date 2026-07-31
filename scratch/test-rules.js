const { initializeApp } = require('firebase/app');
const { getFirestore, connectFirestoreEmulator, collection, addDoc, serverTimestamp } = require('firebase/firestore');
const { getAuth, connectAuthEmulator, signInWithEmailAndPassword } = require('firebase/auth');

const app = initializeApp({ projectId: "demo-waitless", apiKey: "demo-key", authDomain: "demo-waitless.firebaseapp.com" });
const db = getFirestore(app);
connectFirestoreEmulator(db, '127.0.0.1', 8080);
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });

async function run() {
  try {
    // We don't have the password, so we can't easily sign in as the user.
    // Instead we can try to add without auth to see if it's PERMISSION_DENIED.
    await addDoc(collection(db, "api_keys"), {
      businessId: "test",
      name: "test",
      key: "test",
      createdAt: serverTimestamp()
    });
    console.log("Success");
  } catch (e) {
    console.log("Error:", e.code, e.message);
  }
}
run();
