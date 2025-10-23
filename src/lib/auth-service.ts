import { auth } from "./firebase-admin";

export async function authenticateUser(email: string, password: string) {
  // Implement authentication logic
  return null;
}

export async function createUser(email: string, password: string) {
  try {
    const user = await auth.createUser({
      email,
      password,
    });
    return user;
  } catch (error) {
    throw error;
  }
}
