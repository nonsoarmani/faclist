INSERT OR IGNORE INTO categories (id, name, slug, meta_title_template, description_template) VALUES
 (1, 'CNC Machining', 'cnc-machining',
  '{{category}} Suppliers{{place}}{{certified}} ({{count}} Verified) | FacList',
  'Compare {{count}} {{category_lower}} {{noun}}{{place}}{{certified}}. Browse capabilities, certifications and company size, then request a quote.'),
 (2, 'Sheet Metal Fabrication', 'sheet-metal-fabrication',
  '{{category}} Companies{{place}}{{certified}} - {{count}} Listed | FacList',
  'Find {{count}} {{category_lower}} {{noun}}{{place}}{{certified}}. Compare shops by location, size and credentials.'),
 (3, 'Injection Molding', 'injection-molding',
  '{{category}} Manufacturers{{place}}{{certified}} ({{count}}) | FacList',
  'Directory of {{count}} {{category_lower}} {{noun}}{{place}}{{certified}} with capabilities and credentials.');

INSERT OR IGNORE INTO certifications (id, name, code, slug, authority, description) VALUES
 (1, 'ISO 9001 Quality Management', 'ISO-9001', 'iso-9001', 'International Organization for Standardization', 'ISO 9001 is a widely adopted quality management system standard that audits how a manufacturer controls processes and corrects defects.'),
 (2, 'AS9100 Aerospace Quality', 'AS9100', 'as9100', 'International Aerospace Quality Group', 'AS9100 extends ISO 9001 with additional requirements for aviation, space and defense suppliers.'),
 (3, 'IATF 16949 Automotive Quality', 'IATF-16949', 'iatf-16949', 'International Automotive Task Force', 'IATF 16949 is the automotive sector quality management standard used by OEM supply chains.');

INSERT OR IGNORE INTO locations (slug, name, type, country_code, country_name) VALUES
 ('united-states', 'United States', 'country', 'US', 'United States'),
 ('ohio', 'Ohio', 'state', 'US', 'United States'),
 ('texas', 'Texas', 'state', 'US', 'United States'),
 ('germany', 'Germany', 'country', 'DE', 'Germany'),
 ('bavaria', 'Bavaria', 'state', 'DE', 'Germany');

INSERT OR IGNORE INTO companies (id, slug, name, description, address, city, state, state_slug, country, country_code, country_slug, lat, lng, website, employee_count, revenue_tier, claimed_status) VALUES
 (1, 'buckeye-precision-machining', 'Buckeye Precision Machining', 'Family-owned job shop producing tight-tolerance milled and turned components for aerospace and medical customers.', '1200 Industrial Pkwy', 'Cleveland', 'Ohio', 'ohio', 'United States', 'US', 'united-states', 41.4993, -81.6944, 'https://buckeye-precision.example.com', 85, 'mid', 1),
 (2, 'lakeshore-cnc-works', 'Lakeshore CNC Works', 'High-mix CNC milling and turning with 5-axis capability for prototype and low-volume production runs.', '88 Harbor St', 'Toledo', 'Ohio', 'ohio', 'United States', 'US', 'united-states', 41.6528, -83.5379, 'https://lakeshore-cnc.example.com', 32, 'small', 0),
 (3, 'miami-valley-fabrication', 'Miami Valley Fabrication', 'Laser cutting, press brake forming and welding for industrial equipment manufacturers.', '455 Commerce Dr', 'Dayton', 'Ohio', 'ohio', 'United States', 'US', 'united-states', 39.7589, -84.1916, 'https://mv-fab.example.com', 140, 'mid', 1),
 (4, 'lone-star-machine-co', 'Lone Star Machine Co', 'Oil and gas component machining with in-house inspection and heat treat coordination.', '9020 Refinery Rd', 'Houston', 'Texas', 'texas', 'United States', 'US', 'united-states', 29.7604, -95.3698, 'https://lonestar-machine.example.com', 210, 'large', 1),
 (5, 'alamo-molding-solutions', 'Alamo Molding Solutions', 'Thermoplastic injection molding from 50 to 500 ton presses for consumer and medical packaging.', '310 Polymer Way', 'San Antonio', 'Texas', 'texas', 'United States', 'US', 'united-states', 29.4241, -98.4936, 'https://alamo-molding.example.com', 60, 'small', 0),
 (6, 'bayern-praezisionsteile', 'Bayern Präzisionsteile GmbH', 'Precision CNC machining for automotive and mechanical engineering customers across Europe.', 'Werkstrasse 14', 'Munich', 'Bavaria', 'bavaria', 'Germany', 'DE', 'germany', 48.1351, 11.5820, 'https://bayern-praezision.example.com', 320, 'large', 1);

INSERT OR IGNORE INTO company_categories (category_id, company_id) VALUES
 (1,1),(1,2),(2,3),(1,3),(1,4),(3,5),(1,6);

INSERT OR IGNORE INTO company_certifications (certification_id, company_id) VALUES
 (1,1),(2,1),(1,2),(1,3),(1,4),(2,4),(1,5),(1,6),(3,6);
