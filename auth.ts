import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isAdminEmail } from "@/lib/admin";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  pages: { signIn: "/leads", error: "/leads" },
  callbacks: {
    // Only allowlisted, Google-verified emails may sign in at all.
    signIn({ account, profile }) {
      if (account?.provider !== "google") return false;
      return Boolean(profile?.email_verified) && isAdminEmail(profile?.email);
    },
  },
});

/** Server-side admin check. Re-checks the allowlist on every request so removing an email revokes access. */
export async function getAdmin() {
  const session = await auth();
  const email = session?.user?.email;
  return { signedIn: Boolean(email), isAdmin: isAdminEmail(email), email: email ?? null };
}
