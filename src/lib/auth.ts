import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        },
    },
    emailAndPassword: {
        enabled: true,
    },
});

export async function getSession() {
    return await auth.api.getSession({
        headers: await headers(),
    });
}

export async function getUserFromRequest(req: NextRequest) {
    const session = await auth.api.getSession({
        headers: req.headers,
    });
    if (!session) return null;
    return { userId: session.user.id, email: session.user.email };
}

export function withAuth(
    handler: (req: NextRequest, user: { userId: string; email: string }, params?: any) => Promise<NextResponse>
) {
    return async (req: NextRequest, context?: any) => {
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        return handler(req, { userId: session.user.id, email: session.user.email }, context?.params);
    };
}
