ALTER TABLE wardrobe_items
  ADD COLUMN acquisition_cost_minor bigint NULL,
  ADD COLUMN acquisition_currency text NULL;

ALTER TABLE wardrobe_items
  ADD CONSTRAINT wardrobe_items_acquisition_cost_pair CHECK (
    (acquisition_cost_minor IS NULL AND acquisition_currency IS NULL)
    OR
    (
      acquisition_cost_minor BETWEEN 1 AND 100000000000
      AND acquisition_currency ~ '^[A-Z]{3}$'
      AND ownership_status = 'owned'
    )
  );

COMMENT ON COLUMN wardrobe_items.acquisition_cost_minor IS
  'Optional user-provided acquisition cost in the smallest currency unit. Never inferred or converted.';

COMMENT ON COLUMN wardrobe_items.acquisition_currency IS
  'Three-letter uppercase currency code paired with acquisition_cost_minor.';
