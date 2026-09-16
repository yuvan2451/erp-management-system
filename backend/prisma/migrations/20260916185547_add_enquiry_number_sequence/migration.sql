-- Create a database sequence for enquiry numbers.
--
-- PostgreSQL sequences are concurrency-safe, so simultaneous
-- enquiry requests receive different numbers.
CREATE SEQUENCE IF NOT EXISTS enquiry_number_seq;

-- Synchronize the sequence with the existing enquiry numbers.
--
-- If enquiries already exist:
--   ENQ-000005 -> sequence current value becomes 5
--   nextval()  -> 6
--
-- If no enquiries exist:
--   sequence starts at 1
DO $$
DECLARE
    max_enquiry_number INTEGER;
BEGIN
    SELECT MAX(
        CAST(
            REPLACE("enquiryNumber", 'ENQ-', '')
            AS INTEGER
        )
    )
    INTO max_enquiry_number
    FROM "Enquiry";

    IF max_enquiry_number IS NULL THEN
        PERFORM setval(
            'enquiry_number_seq',
            1,
            false
        );
    ELSE
        PERFORM setval(
            'enquiry_number_seq',
            max_enquiry_number,
            true
        );
    END IF;
END $$;