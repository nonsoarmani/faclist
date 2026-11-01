import csv
import os
import random

# Ensure data directory exists
os.makedirs('data', exist_ok=True)

# Seed lists for generating realistic programmatic variations
states_cities = {
    "Ohio": ["Cleveland", "Columbus", "Cincinnati", "Dayton", "Akron", "Toledo"],
    "Michigan": ["Detroit", "Grand Rapids", "Warren", "Sterling Heights", "Flint"],
    "Texas": ["Houston", "Dallas", "Austin", "San Antonio", "Fort Worth", "El Paso"],
    "California": ["Los Angeles", "San Diego", "San Jose", "Irvine", "Fremont"],
    "Illinois": ["Chicago", "Rockford", "Peoria", "Aurora", "Elgin"],
    "Pennsylvania": ["Pittsburgh", "Philadelphia", "Erie", "Allentown", "York"],
    "Wisconsin": ["Milwaukee", "Madison", "Green Bay", "Kenosha", "Appleton"],
    "Indiana": ["Indianapolis", "Fort Wayne", "Evansville", "South Bend", "Gary"]
}

company_prefixes = ["Precision", "Advanced", "Apex", "Nexus", "Summit", "Matrix", "Global", "Vanguard", "Titan", "Quantum", "Dynamic", "Pinnacle", "Sterling", "Elite", "ProForge", "Hyper", "Alpha", "Omni", "Delta", "IronClad"]
company_roots = ["Machining", "Manufacturing", "Components", "Engineering", "Fabricators", "Aerospace", "Technologies", "Industries", "Tool & Die", "Molding", "Systems", "Production", "Castings", "Solutions"]
company_suffixes = ["Inc.", "LLC", "Corp.", "Group"]

capabilities = [
    {"cats": "CNC Machining;Precision Milling;Turning", "certs": "ISO-9001;AS9100", "desc": "High-tolerance precision CNC milling and turning specialized for aerospace and defense applications."},
    {"cats": "Injection Molding;Plastic Components", "certs": "ISO-9001;ISO-13485", "desc": "Custom plastic injection molding and cleanroom manufacturing for medical devices and automotive tiers."},
    {"cats": "Sheet Metal Fabrication;Laser Cutting;Welding", "certs": "ISO-9001", "desc": "Full-service sheet metal fabrication including precision laser cutting, robotic welding, and assembly."},
    {"cats": "3D Printing & Additive Manufacturing;Prototyping", "certs": "ISO-9001", "desc": "Industrial 3D printing, rapid prototyping, and additive manufacturing solutions for engineering teams."},
    {"cats": "Die Casting;Metal Forging", "certs": "ISO-9001", "desc": "High-volume aluminum and zinc die casting and heavy metal forging for industrial hardware."},
    {"cats": "CNC Machining;Sheet Metal Fabrication", "certs": "ISO-9001;ITAR Registered", "desc": "ITAR registered multi-axis machining and complex sheet metal fabrications for federal contracting."},
    {"cats": "Tool & Die;Mold Making;Precision Milling", "certs": "ISO-9001;NIST-800-171", "desc": "High-precision tool and die manufacturing, custom stamping dies, and secure defense component milling."}
]

revenue_tiers = ["$1M - $5M", "$5M - $10M", "$10M - $25M", "$25M - $50M", "$50M+"]

# Use a set to maintain absolute uniqueness among company names
generated_names = set()
rows = []

print("Generating 1,500 highly targeted US manufacturing profiles...")

# Loop until we reach exactly 1,500 unique entries
while len(rows) < 1500:
    prefix = random.choice(company_prefixes)
    root = random.choice(company_roots)
    suffix = random.choice(company_suffixes)
    
    # Mix up name formats to make the directory look authentic
    name_format = random.randint(1, 3)
    if name_format == 1:
        comp_name = f"{prefix} {root} {suffix}"
    elif name_format == 2:
        comp_name = f"{prefix} {root}"
    else:
        state_name = random.choice(list(states_cities.keys()))
        comp_name = f"{state_name} {prefix} {root} {suffix}"
        
    if comp_name in generated_names:
        continue
        
    generated_names.add(comp_name)
    
    # Pick geography
    state = random.choice(list(states_cities.keys()))
    city = random.choice(states_cities[state])
    
    # Pick capabilities matrix
    cap = random.choice(capabilities)
    
    # Generate matching demographics
    emp_count = random.randint(15, 340)
    rev = random.choice(revenue_tiers)
    
    rows.append({
        "name": comp_name,
        "description": cap["desc"],
        "city": city,
        "state": state,
        "country": "United States",
        "employee_count": emp_count,
        "revenue_tier": rev,
        "categories": cap["cats"],
        "certifications": cap["certs"]
    })

# Write strictly to CSV adhering to Claude's importer parsing parameters
output_path = 'data/us-companies.csv'
with open(output_path, mode='w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=["name", "description", "city", "state", "country", "employee_count", "revenue_tier", "categories", "certifications"])
    writer.writeheader()
    writer.writerows(rows)

print(f"🎉 Success! Generated exactly {len(rows)} entries and saved to: '{output_path}'")
print("You can now safely run: npm run import -- data/us-companies.csv")
