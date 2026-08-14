import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      appearance={{
        variables: {
          colorPrimary: "#2f5d8c",
          colorBackground: "#ffffff",
          colorText: "#0b1f3b",
          colorTextSecondary: "#4a5b75",
          colorInputBackground: "#ffffff",
          colorInputText: "#0b1f3b",
          colorTextOnPrimaryBackground: "#ffffff",
          borderRadius: "10px",
        },
        elements: {
          card: {
            boxShadow: "0 1px 2px rgba(11, 31, 59, 0.05), 0 8px 24px -12px rgba(11, 31, 59, 0.12)",
            border: "1px solid rgba(18, 58, 99, 0.14)",
          },
          footerActionLink: { color: "#2f5d8c" },
          formButtonPrimary: {
            background: "#2f5d8c",
            color: "#ffffff",
          },
          socialButtonsBlockButton__google: {
            backgroundColor: "#ffffff",
            color: "#202124",
            border: "1px solid rgba(18, 58, 99, 0.2)",
            "&:hover": {
              backgroundColor: "#f1f3f4",
            },
          },
          socialButtonsBlockButtonText__google: {
            color: "#202124",
          },
          userButtonPopoverCard: {
            backgroundColor: "#ffffff",
            border: "1px solid rgba(18, 58, 99, 0.14)",
            boxShadow: "0 20px 50px -20px rgba(11, 31, 59, 0.25)",
          },
          userButtonPopoverActionButton: {
            color: "#0b1f3b",
            "&:hover": {
              backgroundColor: "#e9eff6",
            },
          },
          userButtonPopoverActionButtonIcon: {
            color: "#4a5b75",
          },
        },
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </React.StrictMode>
);
