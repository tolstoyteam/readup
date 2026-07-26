import * as React from "react"

const MOBILE_BREAKPOINT = 768
const SERVER_SNAPSHOT = false

function getIsMobile() {
  if (typeof window === "undefined") return SERVER_SNAPSHOT
  return window.innerWidth < MOBILE_BREAKPOINT
}

function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getIsMobile, () => SERVER_SNAPSHOT)
}
