import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

const USERS = [
  {
    email: "sebastian@bookedkit.com",
    name: "Sebastian",
    passwordEnvKey: "AUTH_PASSWORD_SEBASTIAN",
  },
  {
    email: "julian@bookedkit.com",
    name: "Julian",
    passwordEnvKey: "AUTH_PASSWORD_JULIAN",
  },
];

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

        const user = USERS.find(
          (u) => u.email.toLowerCase() === credentials.email.toLowerCase()
        );
        if (!user) return null;

        const hash = process.env[user.passwordEnvKey];
        if (!hash) return null;

        const valid = await bcrypt.compare(credentials.password, hash);
        if (!valid) return null;

        return { id: user.email, email: user.email, name: user.name };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
};
