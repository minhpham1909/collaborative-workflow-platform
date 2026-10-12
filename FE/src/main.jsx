import React from "react";
import { ThemeProvider } from "./components/ThemeProvider.jsx";
import { createRoot } from "react-dom/client";
import App from "./app/App.jsx";
import "./utilities.css";
import "./styles.css";
import "./studio.css";
import "./foundation.css";
import "./theme.css";
import "./features/workspaces/home.css";
import "./density.css";
import "./project-pins.css";
import "./collection-view.css";
import "./features/organizations/organizations.css";
import NotificationProvider from "./components/NotificationProvider.jsx";
import {AuthLocaleProvider} from './features/auth/AuthLocale.jsx';
createRoot(document.getElementById("root")).render(
  <ThemeProvider><AuthLocaleProvider>
    <NotificationProvider><App /></NotificationProvider>
  </AuthLocaleProvider></ThemeProvider>,
);
