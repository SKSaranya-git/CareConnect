import axios from "axios";
import { API_BASE_URL } from "../config/env";
import { getToken, clearToken } from "../lib/storage";

export const http = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" }
});

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearToken();
    }
    return Promise.reject(err);
  }
);
