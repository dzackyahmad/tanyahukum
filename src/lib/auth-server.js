import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export function verifyToken(token) {
  try {
    // Kunci algoritma ke HS256 (sama dengan token yang dibuat lib/auth.js)
    return jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    throw new Error("Invalid token");
  }
}

export function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}