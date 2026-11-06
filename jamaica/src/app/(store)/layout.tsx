import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/CartDrawer";
import { getUser, isStaff } from "@/lib/auth";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-white focus:p-3">
        Skip to content
      </a>
      <Header signedIn={!!user} staff={isStaff(user)} />
      <main id="main">{children}</main>
      <CartDrawer />
    </>
  );
}
