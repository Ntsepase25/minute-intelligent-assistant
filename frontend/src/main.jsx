import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import SignIn from "./pages/sign-in.jsx";
import DashBoard from "./pages/dashboard.jsx";
import RecordingPage from "./pages/recordingPage.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route index element={<App />} />
        <Route path="sign-in" element={<SignIn />} />
        <Route path="dashboard" element={<DashBoard />} />
        <Route path="dashboard/recording/:id" element={<RecordingPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
