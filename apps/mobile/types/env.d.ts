declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_URL: string;
    /** Legacy JWT anon key (works with @supabase/supabase-js). */
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    /** Newer Supabase publishable key; used if anon key is unset. */
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?: string;
    /** Bucket name for book cover objects (must be EXPO_PUBLIC_* for reliable native builds). */
    EXPO_PUBLIC_SUPABASE_BOOK_COVERS_BUCKET?: string;
    EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET?: string;
    /** RevenueCat Test Store fallback or a shared public SDK key. */
    EXPO_PUBLIC_REVENUECAT_API_KEY?: string;
    /** RevenueCat Test Store public SDK key (`test_...`) for development builds only. */
    EXPO_PUBLIC_REVENUECAT_TEST_API_KEY?: string;
    /** RevenueCat public Apple SDK key (`appl_...`) for production iOS builds. */
    EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?: string;
    /** RevenueCat public Google SDK key (`goog_...`) for production Android builds. */
    EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?: string;
    EXPO_PUBLIC_PRIVACY_POLICY_URL?: string;
    /** Server-side / scripts only; not available in the app bundle unless duplicated as EXPO_PUBLIC_*. */
    SUPABASE_BOOK_COVERS_BUCKET?: string;
    /** Server-only — never import into React Native screens. */
    SUPABASE_SERVICE_ROLE_KEY?: string;
  }
}
