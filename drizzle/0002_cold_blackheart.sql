CREATE TABLE "user_memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"key" varchar(64) NOT NULL,
	"fact" text NOT NULL,
	"category" varchar(16) DEFAULT 'personal' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_memories_user_key_unique" UNIQUE("user_id","key")
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "topic" varchar(32);--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "turns_since_assessment" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "english_level" varchar(4) DEFAULT 'A2' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_memories" ADD CONSTRAINT "user_memories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_memories_user_idx" ON "user_memories" USING btree ("user_id","updated_at");