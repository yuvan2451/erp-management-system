import axios from "axios";

export interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      role: "ADMIN" | "SALES_USER";
    };
  };
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const response = await axios.post<LoginResponse>(
    "http://localhost:5000/api/auth/login",
    { email, password },
  );

  return response.data;
}