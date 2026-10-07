import { LogIn } from "lucide-react";
import { signIn, signOut } from "@/auth";

export function SignInButton({ redirectTo }: { redirectTo: string }) {
  return (
    <form action={async () => { "use server"; await signIn("google", { redirectTo }); }}>
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
