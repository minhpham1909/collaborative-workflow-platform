import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App.jsx";
import "./styles.css";
import "./studio.css";
import "./foundation.css";
import "./features/workspaces/home.css";
import "./features/organizations/organizations.css";
import NotificationProvider from "./components/NotificationProvider.jsx";
createRoot(document.getElementById("root")).render(
  <NotificationProvider>
    <App />
  </NotificationProvider>,
);
