import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "test-secret";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code)

    if (!authError && authData.user) {
      // Supabase user email is verified at this point by OAuth
      const email = authData.user.email
      let displayName = authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || 'Google User'

      if (email) {
        // Find or create the user in our local Prisma database
        let localUser = await prisma.user.findUnique({
          where: { email }
        })

        if (!localUser) {
          // It's a new user signing in via Google
          localUser = await prisma.user.create({
            data: {
              email,
              name: displayName,
              passwordHash: "", // Empty string since they use Google
            }
          })
          console.log(`[AUTH] Synced new Google user to Prisma DB: ${localUser.id}`)
        } else {
             // Optional: update name if it changed
            if (localUser.name !== displayName && displayName !== 'Google User') {
                await prisma.user.update({
                    where: { email },
                    data: { name: displayName }
                })
            }
        }

        // --- SEAMLESS INTEGRATION WITH EXISTING AUTH ---
        // Instead of forcing the app to rewrite all its auth middleware to use Supabase, 
        // we mint the exact same JWT token the rest of the application expects.
        const token = jwt.sign(
          { userId: localUser.id, email: localUser.email },
          JWT_SECRET,
          { expiresIn: "7d" }
        );

        const response = NextResponse.redirect(`${origin}/`)

        response.cookies.set("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7, // 1 week
          path: "/",
        });

        return response
      }
    } else {
        console.error("[AUTH_CALLBACK_ERROR] Supabase auth exchange failed", authError)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
