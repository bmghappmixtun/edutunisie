-- Add index on schoolType (no new column - schoolType already exists with values PUBLIC/PILOTE)
CREATE INDEX IF NOT EXISTS idx_resource_school_type ON "Resource"("schoolType");

-- Backfill: mark as PILOTE any Resource whose title mentions "Collège pilote" / "Lycée pilote" / "النموذجي"
-- and that isn't already PILOTE. Other values (PUBLIC, LYCEE) are kept untouched.
UPDATE "Resource" SET "schoolType" = 'PILOTE'
WHERE "schoolType" != 'PILOTE'
  AND (
    title ~* 'Coll[eè]ge pilote'
    OR title ~* 'Lycée pilote'
    OR title ~* 'lycée pilote'
    OR title LIKE '%النموذجي%'
    OR title LIKE '%النموذجية%'
    OR title LIKE '%college pilote%'
    OR title LIKE '%lycee pilote%'
  );
