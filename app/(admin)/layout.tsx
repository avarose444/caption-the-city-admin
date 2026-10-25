import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import { displayName, requireAdmin } from "@/lib/admin";

export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const { profile } = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex flex-col gap-4 bg-black p-4 text-white md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0">
        <Link href="/" className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/60">Caption the City</span>
          <span className="block font-display text-2xl uppercase leading-none">
            Salle <span className="text-rouge">de</span> Montage
          </span>
        </Link>
        <AdminNav />
        <form action="/auth/signout" method="post" className="font-mono text-xs md:hidden">
          <button className="underline underline-offset-4">Sign out ({displayName(profile)})</button>
        </form>
        <div className="mt-auto hidden border-t border-white/20 pt-4 font-mono text-xs md:block">
          <p className="text-white/60">Superadmin</p>
          <p className="truncate">{displayName(profile)}</p>
          <form action="/auth/signout" method="post" className="mt-2">
            <button className="underline underline-offset-4 hover:text-rouge">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-10">{children}</main>
    </div>
  );
}
