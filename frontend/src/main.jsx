import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./lib/queryClient.ts";
import "./index.css";
import App from "./App.jsx";
import SignIn from "./pages/sign-in.jsx";
import RecordingPage from "./pages/recordingPage.jsx";
import DashBoard from "./pages/dashboard.tsx";
import { Toaster } from "sonner";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route index element={<App />} />
          <Route path="sign-in" element={<SignIn />} />
          <Route path="dashboard" element={<DashBoard />} />
          {/* <Route path="dashboard/recording/:id" element={<RecordingPage />} /> */}
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right"/>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
);
