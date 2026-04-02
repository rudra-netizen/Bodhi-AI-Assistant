/*import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

const AppRoutes = () => {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

export default AppRoutes;
*/

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Pages import
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

const AppRoutes = () => {
  return (
    <Routes>
      {/* Default path ko Login par redirect kar diya */}
      <Route path="/" element={<Navigate to="/login" />} />

      {/* Auth Pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Main Content Page (Iska logic baad mein auth state se connect karenge) */}
      <Route path="/home" element={<Home />} />

      {/* Galat URL handle karne ke liye */}
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
};

export default AppRoutes;
