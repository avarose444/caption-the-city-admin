import SignInButton from "@/components/SignInButton";
import { eyebrowClass, ghostButtonClass } from "@/components/styles";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const forbidden = user && error === "forbidden";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg border-2 border-black bg-card p-8 shadow-[8px_8px_0_0_#111]">
        <p className={eyebrowClass}>Caption the City · Accès réservé</p>
        <h1 className="mt-3 font-display text-5xl uppercase leading-none">
          La Salle <span className="text-rouge">de</span> Montage
        </h1>
        <p className="mt-4 font-mono text-sm text-muted">
          The editing room. Superadmins only: sign in with Google, and your profile must have{" "}
          <code className="bg-white px-1">is_superadmin = true</code>.
        </p>

        {forbidden ? (
          <div className="mt-6 border-l-4 border-rouge bg-white p-4 font-mono text-sm">
            <p className="font-bold">Fin. You&apos;re signed in as {user.email}, but that account isn&apos;t a superadmin.</p>
            <p className="mt-2 text-muted">Ask the project owner to set your profile&apos;s is_superadmin flag.</p>
            <form action="/auth/signout" method="post" className="mt-4">
              <button className={ghostButtonClass}>Sign out</button>
            </form>
          </div>
        ) : (
          <div className="mt-8">
            {error === "auth" && (
              <p className="mb-4 font-mono text-sm text-rouge">Sign-in didn&apos;t complete. Try again.</p>
            )}
            <SignInButton />
          </div>
        )}
      </div>
    </main>
  );
}
