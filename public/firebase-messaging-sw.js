/* Background push handler. Shows "your turn" notifications when the tab is closed. */
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyC6j-YXhHMzuVsw-5Na9u7bB90X7uzLM6M",
  authDomain: "waitless-online.firebaseapp.com",
  projectId: "waitless-online",
  messagingSenderId: "347219606371",
  appId: "1:347219606371:web:fd3033c83d8612874ab156",
});

// With a `notification` payload, the SW auto-displays it in the background.
firebase.messaging();
