-- Split user_library.status into independent is_saved + reading_status columns.

ALTER TABLE "user_library" ADD COLUMN IF NOT EXISTS "is_saved" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_library" ADD COLUMN IF NOT EXISTS "reading_status" text;
--> statement-breakpoint
UPDATE "user_library" SET
  "is_saved" = ("status" = 'saved'),
  "reading_status" = CASE "status"
    WHEN 'saved' THEN 'not_started'
    WHEN 'in_progress' THEN 'in_progress'
    WHEN 'completed' THEN 'completed'
  END
WHERE "reading_status" IS NULL;
--> statement-breakpoint
ALTER TABLE "user_library" ALTER COLUMN "reading_status" SET DEFAULT 'not_started';
--> statement-breakpoint
ALTER TABLE "user_library" ALTER COLUMN "reading_status" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_library" DROP CONSTRAINT IF EXISTS "user_library_status_check";
--> statement-breakpoint
ALTER TABLE "user_library" DROP COLUMN IF EXISTS "status";
--> statement-breakpoint
ALTER TABLE "user_library" ADD CONSTRAINT "user_library_reading_status_check"
  CHECK ("reading_status" in ('not_started', 'in_progress', 'completed'));
