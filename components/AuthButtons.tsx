import { LogIn } from "lucide-react";
import { redirect, unstable_rethrow } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { missingAuthSettings } from "@/lib/config-check";

export function SignInButton({ redirectTo }: { redirectTo: string }) {
  return (
    <form action={async () => {
      "use server";
      // Fail with a clear message instead of a blank error page when sign-in is not configured.
      if (missingAuthSettings().length) redirect("/leads?error=Configuration");
      try {
        await signIn("google", { redirectTo });
      } catch (error) {
        unstable_rethrow(error);
        console.error("sign-in failed", error instanceof Error ? error.name : "unknown");
        redirect("/leads?error=Configuration");
      }
    }}>
      <button className="primary-button" type="submit"><LogIn size={18} /> Sign in with Google</button>
    </form>
  );
}

export function SignOutButton() {
  return (
    <form className="signout-form" action={async () => { "use server"; await signOut({ redirectTo: "/leads" }); }}>
      <button type="submit">Sign out</button>
    </form>
  );
}
