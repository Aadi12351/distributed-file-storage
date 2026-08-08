import api from "./axios";

export async function loginUser(email, password) {
  const response = await api.post(
    "/auth/login",
    new URLSearchParams({
      username: email,
      password: password,
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return response.data;
}

export async function getCurrentUser() {
  const response = await api.get("/me");
  return response.data;
}