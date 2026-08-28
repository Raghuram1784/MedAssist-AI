import axios from "axios";
import type { AnalyzeRequest, AnalyzeResponse } from "../types";

const API_BASE_URL = "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const checkHealth = async (): Promise<{ status: string; service: string }> => {
  const response = await api.get("/health");
  return response.data;
};

export const analyzeCase = async (requestData: AnalyzeRequest): Promise<AnalyzeResponse> => {
  const response = await api.post<AnalyzeResponse>("/api/analyze", requestData);
  return response.data;
};
