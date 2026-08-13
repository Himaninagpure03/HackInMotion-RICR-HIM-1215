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
          colorPrimary: "#34d399",
          colorBackground: "#12151c",
          colorText: "#e9ecf2",
          colorTextSecondary: "#9aa3b2",
          colorInputBackground: "#181c25",
          colorInputText: "#e9ecf2",
          colorTextOnPrimaryBackground: "#05231a",
          borderRadius: "10px",
        },
        elements: {
          card: {
            boxShadow: "none",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          },
          footerActionLink: { color: "#34d399" },
          formButtonPrimary: {
            background: "#34d399",
            color: "#05231a",
          },
          socialButtonsBlockButton__google: {
            backgroundColor: "#ffffff",
            color: "#202124",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            "&:hover": {
              backgroundColor: "#f1f3f4",
            },
          },
          socialButtonsBlockButtonText__google: {
            color: "#202124",
          },
          userButtonPopoverCard: {
            backgroundColor: "#12151c",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 20px 50px -20px rgba(0, 0, 0, 0.6)",
          },
          userButtonPopoverActionButton: {
            color: "#e9ecf2",
            "&:hover": {
              backgroundColor: "#181c25",
            },
          },
          userButtonPopoverActionButtonIcon: {
            color: "#9aa3b2",
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
