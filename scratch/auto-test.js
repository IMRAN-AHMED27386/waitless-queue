process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const app = initializeApp({
  projectId: "waitless-online-token",
  apiKey: "AIzaSyAJDyIH-OBbVRSKYxmRDX50S7vkbqY8hrc",
  authDomain: "waitless-online-token.firebaseapp.com"
});
const db = getFirestore(app);

async function runTest() {
  try {
    // Get Service ID
    const servicesSnap = await getDocs(collection(db, "services"));
    if (servicesSnap.empty) {
      console.log("No services found in emulator.");
      return;
    }
    const serviceId = servicesSnap.docs[0].id;
    console.log("Found Service ID:", serviceId);

    // Get API Key
    const keysSnap = await getDocs(collection(db, "api_keys"));
    if (keysSnap.empty) {
      console.log("No API keys found in emulator.");
      return;
    }
    const apiKey = keysSnap.docs[0].data().key;
    console.log("Found API Key:", apiKey.substring(0, 15) + "...");

    // Make the API Call
    console.log("\nMaking API Call...");
    const response = await fetch("http://localhost:3000/api/v1/tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        serviceId: serviceId,
        name: "Auto-Test Patient",
        phone: "+1234567890",
        priority: "regular"
      })
    });

    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Response:", data);

  } catch (e) {
    console.error("Test Error:", e);
  }
}

runTest();
