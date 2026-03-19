import { compare } from "bcryptjs";
import type { UserRole } from "@prisma/client";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { allowedRoles, type AppPermission } from "@/lib/permissions";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);

        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user) {
          return null;
        }

        if (!user.isActive) {
          return null;
        }

        const valid = await compare(parsed.data.password, user.passwordHash);

        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          studioId: user.studioId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: UserRole }).role;
        token.studioId = (user as { studioId: string }).studioId;
      } else if (token.id && !token.studioId) {
        const existingUser = await prisma.user.findUnique({
          where: { id: String(token.id) },
          select: { studioId: true, role: true, isActive: true },
        });

        if (existingUser?.isActive) {
          token.studioId = existingUser.studioId;
          token.role = existingUser.role;
        } else {
          delete token.id;
          delete token.role;
          delete token.studioId;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        let studioId = token.studioId ? String(token.studioId) : "";
        let resolvedRole = token.role as UserRole;

        if (!studioId && token.id) {
          try {
            const existingUser = await prisma.user.findUnique({
              where: { id: String(token.id) },
              select: { studioId: true, role: true, isActive: true },
            });

            if (existingUser?.isActive) {
              studioId = existingUser.studioId;
              resolvedRole = existingUser.role;
            } else {
              console.warn(
                `[Auth] User not found during session hydration: ${token.id}`
              );
            }
          } catch (error) {
            console.error(
              "[Auth] Error hydrating studio ID from database:",
              error
            );
          }
        }

        session.user.id = String(token.id ?? "");
        session.user.role = resolvedRole;
        session.user.studioId = studioId;
      }

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET ?? "inkflow-local-dev-secret-change-me",
};

export function auth() {
  return getServerSession(authOptions);
}

export async function requireUser() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      studioId: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    redirect("/login");
  }

  return user;
}

export async function requireRole(roles: UserRole[]) {
  const user = await requireUser();

  if (!roles.includes(user.role)) {
    redirect("/consultations");
  }

  return user;
}

export async function requirePermission(permission: AppPermission) {
  const user = await requireUser();
  const roles = allowedRoles(permission);

  if (!roles.includes(user.role)) {
    redirect("/consultations");
  }

  return user;
}