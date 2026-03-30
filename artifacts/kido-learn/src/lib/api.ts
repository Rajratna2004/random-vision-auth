import { getAuthHeader } from "./store";

const BASE = "/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getAuthHeader(),
    ...(options.headers as Record<string, string> ?? {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || "Request failed");
  }

  return res.json();
}

export const api = {
  auth: {
    register: (data: object) => request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    login: (data: object) => request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
    logout: () => request("/auth/logout", { method: "POST" }),
    me: () => request("/auth/me"),
  },
  face: {
    register: (descriptor: number[]) => request("/face/register", { method: "POST", body: JSON.stringify({ descriptor }) }),
    verify: (descriptor: number[]) => request("/face/verify", { method: "POST", body: JSON.stringify({ descriptor }) }),
  },
  courses: {
    list: () => request<any[]>("/courses"),
    get: (id: string) => request<any>(`/courses/${id}`),
  },
  progress: {
    list: () => request<any[]>("/progress"),
    update: (courseId: string, lessonId: string, completed: boolean) =>
      request(`/progress/${courseId}`, { method: "POST", body: JSON.stringify({ lessonId, completed }) }),
  },
  ai: {
    quiz: (data: object) => request("/ai/quiz", { method: "POST", body: JSON.stringify(data) }),
    recommend: () => request<any>("/ai/recommend"),
  },
};
