ALTER TABLE "user"
    ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(32),
    ADD COLUMN IF NOT EXISTS google_subject VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_google_subject
    ON "user" (google_subject)
    WHERE google_subject IS NOT NULL;
