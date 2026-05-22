CREATE TABLE "auth"."users" (
	"id" uuid PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"selected_interests" text[] DEFAULT '{}'::text[] NOT NULL,
	"reading_goal" text,
	"interests_step_done" boolean DEFAULT false NOT NULL,
	"goal_step_done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_library" (
	"user_id" uuid NOT NULL,
	"book_id" text NOT NULL,
	"status" text NOT NULL,
	"progress" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_library_user_id_book_id_pk" PRIMARY KEY("user_id","book_id"),
	CONSTRAINT "user_library_status_check" CHECK ("user_library"."status" in ('saved', 'in_progress', 'completed'))
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_library" ADD CONSTRAINT "user_library_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;