import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "./context/AuthContext.tsx";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <StrictMode>
      <GoogleOAuthProvider clientId={clientId}>
        <App />
      </GoogleOAuthProvider>
    </StrictMode>
  </AuthProvider>
);
