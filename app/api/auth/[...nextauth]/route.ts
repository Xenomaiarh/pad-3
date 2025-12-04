import NextAuth from "next-auth/next";
import type { User } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const authOptions = {
  // Configure one or more authentication providers
  providers: [
      CredentialsProvider({
          id: "credentials",
          name: "Credentials",
          credentials: {
              email: { label: "Email", type: "text" },
              password: { label: "Password", type: "password" },
          },
          async authorize(credentials: any) {
              try {
                  const res = await fetch(
                      `${process.env.AUTH_SERVICE_URL}/auth/login`,
                      {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                              email: credentials.email,
                              password: credentials.password,
                          }),
                      }
                  );

                  if (!res.ok) {
                      return null;
                  }

                  const user = await res.json(); // { id, email, role }

                  return {
                      id: user.id,
                      email: user.email,
                      role: user.role,
                  };
              } catch (err: any) {
                  throw new Error(err);
              }
          },
      }),
    // Uncomment and configure these providers as needed
    // GithubProvider({
    //   clientId: process.env.GITHUB_ID!,
    //   clientSecret: process.env.GITHUB_SECRET!,
    // }),
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // }),
  ],
  callbacks: {
    async signIn({ user, account }: { user: User; account: any }) {
      if (account?.provider === "credentials") {
        return true;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.iat = Math.floor(Date.now() / 1000); // Issued at time
      }
      
      // Check if token is expired (15 minutes)
      const now = Math.floor(Date.now() / 1000);
      const tokenAge = now - (token.iat as number);
      const maxAge = 15 * 60; // 15 minutes
      
      if (tokenAge > maxAge) {
        // Token expired, return empty object to force re-authentication
        return {};
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login', // Redirect to login page on auth errors
  },
  session: {
    strategy: 'jwt',
    maxAge: 15 * 60, // 15 minutes in seconds
    updateAge: 5 * 60, // Update session every 5 minutes
  },
  jwt: {
    maxAge: 15 * 60, // 15 minutes in seconds
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
