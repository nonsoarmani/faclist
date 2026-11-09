-- US: AL -> Alabama
UPDATE companies SET state = 'Alabama', state_slug = 'alabama' WHERE country_slug = 'united-states' AND state_slug = 'al';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'alabama', 'Alabama', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'alabama');
DELETE FROM locations WHERE slug = 'al' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'al');
-- US: AK -> Alaska
UPDATE companies SET state = 'Alaska', state_slug = 'alaska' WHERE country_slug = 'united-states' AND state_slug = 'ak';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'alaska', 'Alaska', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'alaska');
DELETE FROM locations WHERE slug = 'ak' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'ak');
-- US: AZ -> Arizona
UPDATE companies SET state = 'Arizona', state_slug = 'arizona' WHERE country_slug = 'united-states' AND state_slug = 'az';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'arizona', 'Arizona', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'arizona');
DELETE FROM locations WHERE slug = 'az' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'az');
-- US: AR -> Arkansas
UPDATE companies SET state = 'Arkansas', state_slug = 'arkansas' WHERE country_slug = 'united-states' AND state_slug = 'ar';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'arkansas', 'Arkansas', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'arkansas');
DELETE FROM locations WHERE slug = 'ar' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'ar');
-- US: CA -> California
UPDATE companies SET state = 'California', state_slug = 'california' WHERE country_slug = 'united-states' AND state_slug = 'ca';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'california', 'California', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'california');
DELETE FROM locations WHERE slug = 'ca' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'ca');
-- US: CO -> Colorado
UPDATE companies SET state = 'Colorado', state_slug = 'colorado' WHERE country_slug = 'united-states' AND state_slug = 'co';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'colorado', 'Colorado', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'colorado');
DELETE FROM locations WHERE slug = 'co' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'co');
-- US: CT -> Connecticut
UPDATE companies SET state = 'Connecticut', state_slug = 'connecticut' WHERE country_slug = 'united-states' AND state_slug = 'ct';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'connecticut', 'Connecticut', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'connecticut');
DELETE FROM locations WHERE slug = 'ct' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'ct');
-- US: DE -> Delaware
UPDATE companies SET state = 'Delaware', state_slug = 'delaware' WHERE country_slug = 'united-states' AND state_slug = 'de';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'delaware', 'Delaware', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'delaware');
DELETE FROM locations WHERE slug = 'de' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'de');
-- US: DC -> District of Columbia
UPDATE companies SET state = 'District of Columbia', state_slug = 'district-of-columbia' WHERE country_slug = 'united-states' AND state_slug = 'dc';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'district-of-columbia', 'District of Columbia', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'district-of-columbia');
DELETE FROM locations WHERE slug = 'dc' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'dc');
-- US: FL -> Florida
UPDATE companies SET state = 'Florida', state_slug = 'florida' WHERE country_slug = 'united-states' AND state_slug = 'fl';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'florida', 'Florida', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'florida');
DELETE FROM locations WHERE slug = 'fl' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'fl');
-- US: GA -> Georgia
UPDATE companies SET state = 'Georgia', state_slug = 'georgia-us' WHERE country_slug = 'united-states' AND state_slug = 'ga';
UPDATE companies SET state_slug = 'georgia-us' WHERE country_slug = 'united-states' AND state_slug = 'georgia';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'georgia-us', 'Georgia', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'georgia-us');
DELETE FROM locations WHERE slug = 'ga' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'ga');
-- US: HI -> Hawaii
UPDATE companies SET state = 'Hawaii', state_slug = 'hawaii' WHERE country_slug = 'united-states' AND state_slug = 'hi';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'hawaii', 'Hawaii', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'hawaii');
DELETE FROM locations WHERE slug = 'hi' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'hi');
-- US: ID -> Idaho
UPDATE companies SET state = 'Idaho', state_slug = 'idaho' WHERE country_slug = 'united-states' AND state_slug = 'id';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'idaho', 'Idaho', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'idaho');
DELETE FROM locations WHERE slug = 'id' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'id');
-- US: IL -> Illinois
UPDATE companies SET state = 'Illinois', state_slug = 'illinois' WHERE country_slug = 'united-states' AND state_slug = 'il';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'illinois', 'Illinois', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'illinois');
DELETE FROM locations WHERE slug = 'il' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'il');
-- US: IN -> Indiana
UPDATE companies SET state = 'Indiana', state_slug = 'indiana' WHERE country_slug = 'united-states' AND state_slug = 'in';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'indiana', 'Indiana', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'indiana');
DELETE FROM locations WHERE slug = 'in' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'in');
-- US: IA -> Iowa
UPDATE companies SET state = 'Iowa', state_slug = 'iowa' WHERE country_slug = 'united-states' AND state_slug = 'ia';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'iowa', 'Iowa', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'iowa');
DELETE FROM locations WHERE slug = 'ia' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'ia');
-- US: KS -> Kansas
UPDATE companies SET state = 'Kansas', state_slug = 'kansas' WHERE country_slug = 'united-states' AND state_slug = 'ks';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'kansas', 'Kansas', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'kansas');
DELETE FROM locations WHERE slug = 'ks' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'ks');
-- US: KY -> Kentucky
UPDATE companies SET state = 'Kentucky', state_slug = 'kentucky' WHERE country_slug = 'united-states' AND state_slug = 'ky';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'kentucky', 'Kentucky', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'kentucky');
DELETE FROM locations WHERE slug = 'ky' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'ky');
-- US: LA -> Louisiana
UPDATE companies SET state = 'Louisiana', state_slug = 'louisiana' WHERE country_slug = 'united-states' AND state_slug = 'la';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'louisiana', 'Louisiana', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'louisiana');
DELETE FROM locations WHERE slug = 'la' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'la');
-- US: ME -> Maine
UPDATE companies SET state = 'Maine', state_slug = 'maine' WHERE country_slug = 'united-states' AND state_slug = 'me';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'maine', 'Maine', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'maine');
DELETE FROM locations WHERE slug = 'me' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'me');
-- US: MD -> Maryland
UPDATE companies SET state = 'Maryland', state_slug = 'maryland' WHERE country_slug = 'united-states' AND state_slug = 'md';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'maryland', 'Maryland', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'maryland');
DELETE FROM locations WHERE slug = 'md' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'md');
-- US: MA -> Massachusetts
UPDATE companies SET state = 'Massachusetts', state_slug = 'massachusetts' WHERE country_slug = 'united-states' AND state_slug = 'ma';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'massachusetts', 'Massachusetts', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'massachusetts');
DELETE FROM locations WHERE slug = 'ma' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'ma');
-- US: MI -> Michigan
UPDATE companies SET state = 'Michigan', state_slug = 'michigan' WHERE country_slug = 'united-states' AND state_slug = 'mi';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'michigan', 'Michigan', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'michigan');
DELETE FROM locations WHERE slug = 'mi' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'mi');
-- US: MN -> Minnesota
UPDATE companies SET state = 'Minnesota', state_slug = 'minnesota' WHERE country_slug = 'united-states' AND state_slug = 'mn';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'minnesota', 'Minnesota', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'minnesota');
DELETE FROM locations WHERE slug = 'mn' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'mn');
-- US: MS -> Mississippi
UPDATE companies SET state = 'Mississippi', state_slug = 'mississippi' WHERE country_slug = 'united-states' AND state_slug = 'ms';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'mississippi', 'Mississippi', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'mississippi');
DELETE FROM locations WHERE slug = 'ms' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'ms');
-- US: MO -> Missouri
UPDATE companies SET state = 'Missouri', state_slug = 'missouri' WHERE country_slug = 'united-states' AND state_slug = 'mo';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'missouri', 'Missouri', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'missouri');
DELETE FROM locations WHERE slug = 'mo' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'mo');
-- US: MT -> Montana
UPDATE companies SET state = 'Montana', state_slug = 'montana' WHERE country_slug = 'united-states' AND state_slug = 'mt';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'montana', 'Montana', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'montana');
DELETE FROM locations WHERE slug = 'mt' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'mt');
-- US: NE -> Nebraska
UPDATE companies SET state = 'Nebraska', state_slug = 'nebraska' WHERE country_slug = 'united-states' AND state_slug = 'ne';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'nebraska', 'Nebraska', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'nebraska');
DELETE FROM locations WHERE slug = 'ne' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'ne');
-- US: NV -> Nevada
UPDATE companies SET state = 'Nevada', state_slug = 'nevada' WHERE country_slug = 'united-states' AND state_slug = 'nv';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'nevada', 'Nevada', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'nevada');
DELETE FROM locations WHERE slug = 'nv' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'nv');
-- US: NH -> New Hampshire
UPDATE companies SET state = 'New Hampshire', state_slug = 'new-hampshire' WHERE country_slug = 'united-states' AND state_slug = 'nh';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'new-hampshire', 'New Hampshire', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'new-hampshire');
DELETE FROM locations WHERE slug = 'nh' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'nh');
-- US: NJ -> New Jersey
UPDATE companies SET state = 'New Jersey', state_slug = 'new-jersey' WHERE country_slug = 'united-states' AND state_slug = 'nj';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'new-jersey', 'New Jersey', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'new-jersey');
DELETE FROM locations WHERE slug = 'nj' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'nj');
-- US: NM -> New Mexico
UPDATE companies SET state = 'New Mexico', state_slug = 'new-mexico' WHERE country_slug = 'united-states' AND state_slug = 'nm';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'new-mexico', 'New Mexico', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'new-mexico');
DELETE FROM locations WHERE slug = 'nm' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'nm');
-- US: NY -> New York
UPDATE companies SET state = 'New York', state_slug = 'new-york' WHERE country_slug = 'united-states' AND state_slug = 'ny';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'new-york', 'New York', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'new-york');
DELETE FROM locations WHERE slug = 'ny' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'ny');
-- US: NC -> North Carolina
UPDATE companies SET state = 'North Carolina', state_slug = 'north-carolina' WHERE country_slug = 'united-states' AND state_slug = 'nc';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'north-carolina', 'North Carolina', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'north-carolina');
DELETE FROM locations WHERE slug = 'nc' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'nc');
-- US: ND -> North Dakota
UPDATE companies SET state = 'North Dakota', state_slug = 'north-dakota' WHERE country_slug = 'united-states' AND state_slug = 'nd';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'north-dakota', 'North Dakota', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'north-dakota');
DELETE FROM locations WHERE slug = 'nd' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'nd');
-- US: OH -> Ohio
UPDATE companies SET state = 'Ohio', state_slug = 'ohio' WHERE country_slug = 'united-states' AND state_slug = 'oh';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'ohio', 'Ohio', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'ohio');
DELETE FROM locations WHERE slug = 'oh' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'oh');
-- US: OK -> Oklahoma
UPDATE companies SET state = 'Oklahoma', state_slug = 'oklahoma' WHERE country_slug = 'united-states' AND state_slug = 'ok';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'oklahoma', 'Oklahoma', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'oklahoma');
DELETE FROM locations WHERE slug = 'ok' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'ok');
-- US: OR -> Oregon
UPDATE companies SET state = 'Oregon', state_slug = 'oregon' WHERE country_slug = 'united-states' AND state_slug = 'or';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'oregon', 'Oregon', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'oregon');
DELETE FROM locations WHERE slug = 'or' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'or');
-- US: PA -> Pennsylvania
UPDATE companies SET state = 'Pennsylvania', state_slug = 'pennsylvania' WHERE country_slug = 'united-states' AND state_slug = 'pa';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'pennsylvania', 'Pennsylvania', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'pennsylvania');
DELETE FROM locations WHERE slug = 'pa' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'pa');
-- US: RI -> Rhode Island
UPDATE companies SET state = 'Rhode Island', state_slug = 'rhode-island' WHERE country_slug = 'united-states' AND state_slug = 'ri';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'rhode-island', 'Rhode Island', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'rhode-island');
DELETE FROM locations WHERE slug = 'ri' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'ri');
-- US: SC -> South Carolina
UPDATE companies SET state = 'South Carolina', state_slug = 'south-carolina' WHERE country_slug = 'united-states' AND state_slug = 'sc';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'south-carolina', 'South Carolina', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'south-carolina');
DELETE FROM locations WHERE slug = 'sc' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'sc');
-- US: SD -> South Dakota
UPDATE companies SET state = 'South Dakota', state_slug = 'south-dakota' WHERE country_slug = 'united-states' AND state_slug = 'sd';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'south-dakota', 'South Dakota', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'south-dakota');
DELETE FROM locations WHERE slug = 'sd' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'sd');
-- US: TN -> Tennessee
UPDATE companies SET state = 'Tennessee', state_slug = 'tennessee' WHERE country_slug = 'united-states' AND state_slug = 'tn';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'tennessee', 'Tennessee', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'tennessee');
DELETE FROM locations WHERE slug = 'tn' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'tn');
-- US: TX -> Texas
UPDATE companies SET state = 'Texas', state_slug = 'texas' WHERE country_slug = 'united-states' AND state_slug = 'tx';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'texas', 'Texas', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'texas');
DELETE FROM locations WHERE slug = 'tx' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'tx');
-- US: UT -> Utah
UPDATE companies SET state = 'Utah', state_slug = 'utah' WHERE country_slug = 'united-states' AND state_slug = 'ut';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'utah', 'Utah', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'utah');
DELETE FROM locations WHERE slug = 'ut' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'ut');
-- US: VT -> Vermont
UPDATE companies SET state = 'Vermont', state_slug = 'vermont' WHERE country_slug = 'united-states' AND state_slug = 'vt';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'vermont', 'Vermont', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'vermont');
DELETE FROM locations WHERE slug = 'vt' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'vt');
-- US: VA -> Virginia
UPDATE companies SET state = 'Virginia', state_slug = 'virginia' WHERE country_slug = 'united-states' AND state_slug = 'va';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'virginia', 'Virginia', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'virginia');
DELETE FROM locations WHERE slug = 'va' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'va');
-- US: WA -> Washington
UPDATE companies SET state = 'Washington', state_slug = 'washington' WHERE country_slug = 'united-states' AND state_slug = 'wa';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'washington', 'Washington', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'washington');
DELETE FROM locations WHERE slug = 'wa' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'wa');
-- US: WV -> West Virginia
UPDATE companies SET state = 'West Virginia', state_slug = 'west-virginia' WHERE country_slug = 'united-states' AND state_slug = 'wv';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'west-virginia', 'West Virginia', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'west-virginia');
DELETE FROM locations WHERE slug = 'wv' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'wv');
-- US: WI -> Wisconsin
UPDATE companies SET state = 'Wisconsin', state_slug = 'wisconsin' WHERE country_slug = 'united-states' AND state_slug = 'wi';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'wisconsin', 'Wisconsin', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'wisconsin');
DELETE FROM locations WHERE slug = 'wi' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'wi');
-- US: WY -> Wyoming
UPDATE companies SET state = 'Wyoming', state_slug = 'wyoming' WHERE country_slug = 'united-states' AND state_slug = 'wy';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'wyoming', 'Wyoming', 'state', 'US', 'United States' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'wyoming');
DELETE FROM locations WHERE slug = 'wy' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'wy');
-- CA: AB -> Alberta
UPDATE companies SET state = 'Alberta', state_slug = 'alberta' WHERE country_slug = 'canada' AND state_slug = 'ab';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'alberta', 'Alberta', 'state', 'CA', 'Canada' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'alberta');
DELETE FROM locations WHERE slug = 'ab' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'ab');
-- CA: BC -> British Columbia
UPDATE companies SET state = 'British Columbia', state_slug = 'british-columbia' WHERE country_slug = 'canada' AND state_slug = 'bc';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'british-columbia', 'British Columbia', 'state', 'CA', 'Canada' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'british-columbia');
DELETE FROM locations WHERE slug = 'bc' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'bc');
-- CA: MB -> Manitoba
UPDATE companies SET state = 'Manitoba', state_slug = 'manitoba' WHERE country_slug = 'canada' AND state_slug = 'mb';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'manitoba', 'Manitoba', 'state', 'CA', 'Canada' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'manitoba');
DELETE FROM locations WHERE slug = 'mb' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'mb');
-- CA: NB -> New Brunswick
UPDATE companies SET state = 'New Brunswick', state_slug = 'new-brunswick' WHERE country_slug = 'canada' AND state_slug = 'nb';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'new-brunswick', 'New Brunswick', 'state', 'CA', 'Canada' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'new-brunswick');
DELETE FROM locations WHERE slug = 'nb' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'nb');
-- CA: NL -> Newfoundland and Labrador
UPDATE companies SET state = 'Newfoundland and Labrador', state_slug = 'newfoundland-and-labrador' WHERE country_slug = 'canada' AND state_slug = 'nl';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'newfoundland-and-labrador', 'Newfoundland and Labrador', 'state', 'CA', 'Canada' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'newfoundland-and-labrador');
DELETE FROM locations WHERE slug = 'nl' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'nl');
-- CA: NS -> Nova Scotia
UPDATE companies SET state = 'Nova Scotia', state_slug = 'nova-scotia' WHERE country_slug = 'canada' AND state_slug = 'ns';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'nova-scotia', 'Nova Scotia', 'state', 'CA', 'Canada' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'nova-scotia');
DELETE FROM locations WHERE slug = 'ns' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'ns');
-- CA: NT -> Northwest Territories
UPDATE companies SET state = 'Northwest Territories', state_slug = 'northwest-territories' WHERE country_slug = 'canada' AND state_slug = 'nt';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'northwest-territories', 'Northwest Territories', 'state', 'CA', 'Canada' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'northwest-territories');
DELETE FROM locations WHERE slug = 'nt' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'nt');
-- CA: NU -> Nunavut
UPDATE companies SET state = 'Nunavut', state_slug = 'nunavut' WHERE country_slug = 'canada' AND state_slug = 'nu';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'nunavut', 'Nunavut', 'state', 'CA', 'Canada' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'nunavut');
DELETE FROM locations WHERE slug = 'nu' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'nu');
-- CA: ON -> Ontario
UPDATE companies SET state = 'Ontario', state_slug = 'ontario' WHERE country_slug = 'canada' AND state_slug = 'on';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'ontario', 'Ontario', 'state', 'CA', 'Canada' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'ontario');
DELETE FROM locations WHERE slug = 'on' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'on');
-- CA: PE -> Prince Edward Island
UPDATE companies SET state = 'Prince Edward Island', state_slug = 'prince-edward-island' WHERE country_slug = 'canada' AND state_slug = 'pe';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'prince-edward-island', 'Prince Edward Island', 'state', 'CA', 'Canada' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'prince-edward-island');
DELETE FROM locations WHERE slug = 'pe' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'pe');
-- CA: QC -> Quebec
UPDATE companies SET state = 'Quebec', state_slug = 'quebec' WHERE country_slug = 'canada' AND state_slug = 'qc';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'quebec', 'Quebec', 'state', 'CA', 'Canada' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'quebec');
DELETE FROM locations WHERE slug = 'qc' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'qc');
-- CA: SK -> Saskatchewan
UPDATE companies SET state = 'Saskatchewan', state_slug = 'saskatchewan' WHERE country_slug = 'canada' AND state_slug = 'sk';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'saskatchewan', 'Saskatchewan', 'state', 'CA', 'Canada' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'saskatchewan');
DELETE FROM locations WHERE slug = 'sk' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'sk');
-- CA: YT -> Yukon
UPDATE companies SET state = 'Yukon', state_slug = 'yukon' WHERE country_slug = 'canada' AND state_slug = 'yt';
INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) SELECT 'yukon', 'Yukon', 'state', 'CA', 'Canada' WHERE EXISTS (SELECT 1 FROM companies WHERE state_slug = 'yukon');
DELETE FROM locations WHERE slug = 'yt' AND type = 'state' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'yt');
DELETE FROM locations WHERE slug = 'georgia' AND type = 'state' AND country_code = 'US' AND NOT EXISTS (SELECT 1 FROM companies WHERE state_slug = 'georgia');
UPDATE company_search SET state = (SELECT c.state FROM companies c WHERE c.id = company_search.rowid)
 WHERE rowid IN (SELECT id FROM companies WHERE state_slug IN ('alabama','alaska','arizona','arkansas','california','colorado','connecticut','delaware','district-of-columbia','florida','georgia-us','hawaii','idaho','illinois','indiana','iowa','kansas','kentucky','louisiana','maine','maryland','massachusetts','michigan','minnesota','mississippi','missouri','montana','nebraska','nevada','new-hampshire','new-jersey','new-mexico','new-york','north-carolina','north-dakota','ohio','oklahoma','oregon','pennsylvania','rhode-island','south-carolina','south-dakota','tennessee','texas','utah','vermont','virginia','washington','west-virginia','wisconsin','wyoming','alberta','british-columbia','manitoba','new-brunswick','newfoundland-and-labrador','nova-scotia','northwest-territories','nunavut','ontario','prince-edward-island','quebec','saskatchewan','yukon'))
   AND state <> (SELECT c.state FROM companies c WHERE c.id = company_search.rowid);
-- merge electronics-and-electrical into electrical-and-electronics
INSERT OR IGNORE INTO company_categories (category_id, company_id) SELECT (SELECT id FROM categories WHERE slug = 'electrical-and-electronics'), company_id FROM company_categories WHERE category_id = (SELECT id FROM categories WHERE slug = 'electronics-and-electrical') AND (SELECT id FROM categories WHERE slug = 'electrical-and-electronics') IS NOT NULL;
DELETE FROM company_categories WHERE category_id = (SELECT id FROM categories WHERE slug = 'electronics-and-electrical') AND (SELECT id FROM categories WHERE slug = 'electrical-and-electronics') IS NOT NULL;
DELETE FROM categories WHERE slug = 'electronics-and-electrical' AND (SELECT id FROM categories WHERE slug = 'electrical-and-electronics') IS NOT NULL;
