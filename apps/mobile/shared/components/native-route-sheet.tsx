import type { ReactNode } from "react";

type NativeRouteSheetProps = {
  children: ReactNode;
  heightFraction?: number;
};

export function NativeRouteSheet({ children }: NativeRouteSheetProps) {
  return children;
}
