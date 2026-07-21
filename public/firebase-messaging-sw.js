/* Background push handler. Shows "your turn" notifications when the tab is closed. */
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAJDyIH-OBbVRSKYxmRDX50S7vkbqY8hrc",
  authDomain: "waitless-online-token.firebaseapp.com",
  projectId: "waitless-online-token",
  messagingSenderId: "679602602855",
  appId: "1:679602602855:web:80d795df85cf1dc9dc25c2",
});

// With a `notification` payload, the SW auto-displays it in the background.
firebase.messaging();
