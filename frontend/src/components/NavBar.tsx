"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { clearToken } from "@/lib/auth";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/billing", label: "Billing" },
  { href: "/admin", label: "Admin" }
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <header className="topbar">
      <div className="topbar-content">
        <Link href="/dashboard" className="brand">
          ClinicalMind
        </Link>
        <nav className="nav-links">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={pathname === link.href ? "active" : ""}>
              {link.label}
            </Link>
          ))}
        </nav>
        <button type="button" className="button button-muted" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </header>
  );
}
