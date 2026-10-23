"use client";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./GlobalToast.css";

export default function GlobalToast() {
  return (
    <ToastContainer
      position="top-right"
      autoClose={3500}
      newestOnTop
      closeOnClick
      pauseOnHover
      draggable
      theme="colored"
      limit={4}
      role="status"
      toastClassName="app-toast"
      bodyClassName="app-toast-body"
      closeButton
    />
  );
}
