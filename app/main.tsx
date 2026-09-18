import React from "react";
import { createRoot } from "react-dom/client";
import Home from "./page";
import "./globals.css";
import "./dialogs.css";
import "./account.css";
createRoot(document.getElementById("root")!).render(<React.StrictMode><Home/></React.StrictMode>);
