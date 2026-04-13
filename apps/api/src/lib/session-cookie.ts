/** HttpOnly oturum çerezi — Bearer ile birlikte veya tek başına (credentials ile) kullanılabilir. */
export const SESSION_COOKIE_NAME = "pointmor_session";

export function sessionCookieOptions(): {
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  maxAge: number;
} {
  const prod = process.env.NODE_ENV === "production";
  return {
    path: "/",
    httpOnly: true,
    secure: prod,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  };
}
