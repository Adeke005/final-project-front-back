import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import App from "./App.jsx";
import { store } from "./app/store.js";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { ThemeProvider } from "./theme/ThemeProvider.jsx";
import "./styles/app.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
          <ToastContainer position="top-right" />
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
