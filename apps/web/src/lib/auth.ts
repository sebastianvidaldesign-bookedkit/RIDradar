import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

/** Parse AUTH_USERS env var: "email:hash,email2:hash2" */
function parseAuthUsers(): { email: string; hash: string }[] {
  const raw = process.env.AUTH_USERS || "";
  if (!raw.trim()) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const colonIdx = entry.indexOf(":");
      if (colonIdx < 1) return null;
      return { email: entry.slice(0, colonIdx).trim(), hash: entry.slice(colonIdx + 1).trim() };
    })
    .filter((u): u is { email: string; hash: string } => u !== null && u.hash.length > 0);
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const users = parseAuthUsers();
        const user = users.find(
          (u) => u.email.toLowerCase() === credentials.email.toLowerCase()
        );
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.hash);
        if (!valid) return null;

        return { id: user.email, email: user.email, name: user.email.split("@")[0] };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
};
