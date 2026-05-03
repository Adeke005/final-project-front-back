import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../features/authSlice.js";
import courseReducer from "../features/courseSlice.js";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    course: courseReducer,
  },
});