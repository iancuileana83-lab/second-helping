"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Item {
  href: string;
  label: string;
  icon: string;
  children?: { href: string; label: string }[];
}

export const NAV: Item[] = [
  { href: "/", label: "Home", icon: "🏠" },
  {
    href: "/person",
    label: "Person",
    icon: "👤",
    children: [
      { href: "/person/tastes", label: "Tastes" },
      { href: "/person/medicines", label: "Medicines" },
      { href: "/person/needs", label: "Needs" },
    ],
  },
  {
    href: "/meals",
    label: "Meal ideas",
    icon: "🍽️",
    children: [
      { href: "/meals/restaurants", label: "Restaurants" },
      { href: "/meals/cook-at-home", label: "Cook at home" },
      { href: "/meals/weekly-plan", label: "Weekly plan" },
    ],
  },
  { href: "/ask", label: "Ask SafePlate", icon: "💬" },
  {
    href: "/safety",
    label: "Safety",
    icon: "🛡️",
    children: [
      { href: "/safety/by-medicine", label: "By medicine" },
      { href: "/safety/by-food", label: "By food" },
      { href: "/safety/reviewers", label: "Who reviewed the rules" },
    ],
  },
  { href: "/about", label: "About", icon: "ℹ️" },
];

function isActive(path: string, item: Item) {
  return item.href === "/" ? path === "/" : path === item.href || path.startsWith(item.href + "/");
}

export function SiteNav() {
  const path = usePathname() ?? "/";
  const section = NAV.find((i) => isActive(path, i));

  return (
    <header className="site-header">
      <a className="skip" href="#main">Skip to content</a>
      <div className="bar">
        <Link href="/" className="brand" aria-label="SafePlate home">
          <span aria-hidden="true">🍲</span> SafePlate
        </Link>
        <nav aria-label="Main">
          <ul className="topnav">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.children ? item.children[0].href : item.href}
                  aria-current={isActive(path, item) ? "page" : undefined}
                  className={isActive(path, item) ? "active" : undefined}
                >
                  <span aria-hidden="true">{item.icon}</span> {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      {section?.children && (
        <nav aria-label={`${section.label} pages`} className="subbar">
          <ul className="subnav">
            {section.children.map((c) => (
              <li key={c.href}>
                <Link href={c.href} aria-current={path === c.href ? "page" : undefined} className={path === c.href ? "active" : undefined}>
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
