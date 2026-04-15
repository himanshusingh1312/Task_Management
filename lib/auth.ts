import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

interface JwtPayload {
  id: string;
}

export function getAuthUser(request: NextRequest): JwtPayload | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}
