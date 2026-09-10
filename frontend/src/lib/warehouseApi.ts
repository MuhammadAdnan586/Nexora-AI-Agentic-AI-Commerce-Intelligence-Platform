import axios from "axios";

export const warehouseApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

warehouseApi.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? sessionStorage.getItem("warehouse_token") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});