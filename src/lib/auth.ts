import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function getCurrentUserId(): Promise<string | null> {
  const store = await cookies();
  return store.get("auth")?.value ?? null;
}
