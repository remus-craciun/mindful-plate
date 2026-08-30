CREATE TABLE "foods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"brand" varchar(255),
	"serving_size" double precision DEFAULT 100 NOT NULL,
	"serving_unit" varchar(50) DEFAULT 'g' NOT NULL,
	"calories" integer NOT NULL,
	"protein" double precision DEFAULT 0 NOT NULL,
	"carbs" double precision DEFAULT 0 NOT NULL,
	"fat" double precision DEFAULT 0 NOT NULL,
	"fiber" double precision DEFAULT 0,
	"is_custom" boolean DEFAULT false NOT NULL,
	"user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meal_log_id" uuid NOT NULL,
	"food_id" uuid,
	"name" varchar(255) NOT NULL,
	"quantity" double precision NOT NULL,
	"unit" varchar(50) NOT NULL,
	"calories" integer NOT NULL,
	"protein" double precision DEFAULT 0 NOT NULL,
	"carbs" double precision DEFAULT 0 NOT NULL,
	"fat" double precision DEFAULT 0 NOT NULL,
	"fiber" double precision DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "meal_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"meal_type" varchar(20) NOT NULL,
	"date" date NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"food_id" uuid,
	"name" varchar(255) NOT NULL,
	"quantity" double precision NOT NULL,
	"unit" varchar(50) NOT NULL,
	"calories" integer NOT NULL,
	"protein" double precision DEFAULT 0 NOT NULL,
	"carbs" double precision DEFAULT 0 NOT NULL,
	"fat" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"instructions" text,
	"servings" integer DEFAULT 1 NOT NULL,
	"calories_per_serving" integer DEFAULT 0 NOT NULL,
	"protein_per_serving" double precision DEFAULT 0 NOT NULL,
	"carbs_per_serving" double precision DEFAULT 0 NOT NULL,
	"fat_per_serving" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sex" varchar(10) NOT NULL,
	"age" integer NOT NULL,
	"height_cm" double precision NOT NULL,
	"weight_kg" double precision NOT NULL,
	"activity_level" varchar(30) NOT NULL,
	"goal" varchar(20) NOT NULL,
	"daily_calories_target" integer NOT NULL,
	"daily_protein_target_g" integer NOT NULL,
	"daily_carbs_target_g" integer NOT NULL,
	"daily_fat_target_g" integer NOT NULL,
	"daily_water_target_ml" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "water_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"amount_ml" integer NOT NULL,
	"logged_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "foods" ADD CONSTRAINT "foods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_meal_log_id_meal_logs_id_fk" FOREIGN KEY ("meal_log_id") REFERENCES "public"."meal_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "water_logs" ADD CONSTRAINT "water_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;