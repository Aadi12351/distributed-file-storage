import api from "./axios";

export async function getDashboardStats() {
  const response = await api.get("/dashboard/stats");
  return response.data;
}

export async function getDashboardFiles() {
  const response = await api.get("/files");
  return response.data;
}