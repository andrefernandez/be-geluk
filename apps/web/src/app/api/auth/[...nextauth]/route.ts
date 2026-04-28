import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: AuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "admin@begeluk.com" },
                password: { label: "Senha", type: "password" }
            },
            async authorize(credentials) {
                console.log("LOGIN INTENT:", credentials?.email);
                if (!credentials?.email || !credentials?.password) {
                    console.log("No credentials provided");
                    return null;
                }

                let user: any;
                try {
                    user = await prisma.user.findUnique({
                        where: { email: credentials.email }
                    });
                } catch (e: any) {
                    console.error("PRISMA ERROR IN AUTH:", e?.message || e);
                    throw e;
                }

                if (!user) {
                    console.log("Usuário não encontrado:", credentials.email);
                    return null;
                }

                const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
                console.log("Senha válida para", credentials.email, "?", isPasswordValid);

                if (!isPasswordValid) {
                    return null;
                }

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    investorId: user.investorId,
                };
            }
        })
    ],
    session: {
        strategy: "jwt"
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role;
                token.id = user.id;
                token.investorId = (user as any).investorId;
            }
            return token;
        },
        async session({ session, token }) {
            if (session?.user) {
                (session.user as any).role = token.role;
                (session.user as any).id = token.id;
                (session.user as any).investorId = token.investorId;
            }
            return session;
        }
    },
    pages: {
        signIn: "/login",
    }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
