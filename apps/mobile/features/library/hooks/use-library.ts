import { useLibraryContext } from "@/features/library/context/library-provider";

export function useLibrary() {
  return useLibraryContext();
}
