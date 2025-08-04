import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { getAuth } from "firebase-admin/auth";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function verifyFirebaseToken(req: Request) {
  const token = req.headers.get('Authorization')?.split(' ')[1];
  if (!token) throw new Error('No auth token provided');

  const decoded = await getAuth().verifyIdToken(token);
  return {
    userId: decoded.uid,
    role: decoded.role,
    landlordId: decoded.landlordId || null
  };
}
