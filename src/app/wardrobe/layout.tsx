import type { ReactNode } from "react";

import "./wardrobe.css";

type WardrobeLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function WardrobeLayout({ children }: WardrobeLayoutProps) {
  return children;
}
