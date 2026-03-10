"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "ルーレット" },
  { href: "/dolls", label: "かぞく一覧" },
  { href: "/outings", label: "お出かけ日記" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-stone-200 bg-white shadow-sm">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="flex gap-4 py-3">
          {links.map(({ href, label }) => {
            const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-300 focus:ring-offset-2 ${
                  isActive ? "bg-violet-50 text-violet-600" : "text-stone-600 hover:bg-stone-50"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
