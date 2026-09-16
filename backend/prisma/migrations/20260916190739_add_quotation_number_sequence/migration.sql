-- Create a database sequence for quotation numbers.
--
-- PostgreSQL sequences are concurrency-safe, so simultaneous
-- quotation requests receive different numbers.
CREATE SEQUENCE IF NOT EXISTS quotation_number_seq;

-- Synchronize the sequence with existing quotation numbers.
--
-- If quotations already exist:
--   QT-000003 -> sequence current value becomes 3
--   nextval()  -> 4
--
-- If no quotations exist:
--   sequence starts at 1.
DO $$
DECLARE
    max_quotation_number INTEGER;
BEGIN
    SELECT MAX(
        CAST(
            REPLACE("quotationNumber", 'QT-', '')
            AS INTEGER
        )
    )
    INTO max_quotation_number
    FROM "Quotation";

    IF max_quotation_number IS NULL THEN
        PERFORM setval(
            'quotation_number_seq',
            1,
            false
        );
    ELSE
        PERFORM setval(
            'quotation_number_seq',
            max_quotation_number,
            true
        );
    END IF;
END $$;