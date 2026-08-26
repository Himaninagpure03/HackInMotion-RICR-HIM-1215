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
          colorPrimary: "#2D6A4F",
          colorBackground: "#FFFFFF",
          colorText: "#1C1917",
          colorTextSecondary: "#78716C",
          colorInputBackground: "#FFFFFF",
          colorInputText: "#1C1917",
          colorTextOnPrimaryBackground: "#FFFFFF",
          borderRadius: "10px",
        },
        elements: {
          card: {
            boxShadow: "0 2px 8px rgba(28, 25, 23, 0.06)",
            border: "1px solid #E7E0D6",
          },
          footerActionLink: { color: "#2D6A4F" },
          formButtonPrimary: {
            background: "#2D6A4F",
            color: "#FFFFFF",
          },
          socialButtonsBlockButton__google: {
            backgroundColor: "#FFFFFF",
            color: "#202124",
            border: "1px solid #E7E0D6",
            "&:hover": {
              backgroundColor: "#F3EFE8",
            },
          },
          socialButtonsBlockButtonText__google: {
            color: "#202124",
          },
          userButtonPopoverCard: {
            backgroundColor: "#FFFFFF",
            border: "1px solid #E7E0D6",
            boxShadow: "0 8px 30px rgba(28, 25, 23, 0.12)",
          },
          userButtonPopoverActionButton: {
            color: "#1C1917",
            "&:hover": {
              backgroundColor: "#F3EFE8",
            },
          },
          userButtonPopoverActionButtonIcon: {
            color: "#78716C",
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
