-- Run ONCE on an existing database: adds employee size bands such as '11-50'.
ALTER TABLE companies ADD COLUMN employee_range TEXT;
