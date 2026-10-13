"use client";

import Link from "next/link";
import { type ReactNode } from "react";

export function ActionLink({ href, children }: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link className="button" href={href}>
      {children}
    </Link>
  );
}
