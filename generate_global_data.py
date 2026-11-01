import csv
import os
import random

# Ensure data directory exists
os.makedirs('data', exist_ok=True)

# Markets and realistic regional cities
regions = {
    "Nigeria": ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Kano"],
    "United Kingdom": ["Birmingham", "Manchester", "Leeds", "Sheffield", "Coventry", "Glasgow"],
    "China": ["Shenzhen", "Guangzhou", "Dongguan", "Foshan", "Ningbo", "Wuxi"]
}

company_prefixes = ["Apex", "Vanguard", "Global", "Zenith", "Horizon", "Sino", "Euro", "Afri", "Matrix", "Quantum", "Dynamic", "Atlas", "Omega", "Beacon"]
company_roots = ["Precision", "Machining", "Manufacturing", "Engineering", "Fabricators", "Industries", "Components", "Molding", "Forge", "Tek"]
company_suffixes = ["Ltd", "Inc.", "LLC", "Corp", "Co."]

capabilities = [
    {"cats": "CNC Machining;Precision Milling;Turning", "certs": "ISO-9001", "desc": "High-tolerance precision CNC milling, multi-axis turning, and heavy equipment parts fabrication."},
    {"cats": "Injection Molding;Plastic Components", "certs": "ISO-9001", "desc": "Custom plastic injection molding and high-volume component production for consumer electronics and automotive assemblies."},
    {"cats": "Sheet Metal Fabrication;Laser Cutting;Welding", "certs": "ISO-9001", "desc": "Full-service contract manufacturing, precision fiber laser cutting, CNC bending, and robotic welding."},
    {"cats": "Die Casting;Metal Forging", "certs": "ISO-9001", "desc": "Industrial aluminum, zinc, and magnesium die casting solutions with custom tooling engineering."},
    {"cats": "CNC Machining;Sheet Metal Fabrication", "certs": "ISO-9001;ISO-14001", "desc": "Sustainable, certified contract manufacturing offering tight-tolerance machining and sheet metal stampings."}
]

revenue_tiers = ["$500K - $2M", "$2M - $5M", "$5M - $10M", "$10M - $25M", "$25M+"]

generated_names = set()
rows = []

print("Generating 1,200 international manufacturing profiles (Nigeria, UK, China)...")

while len(rows) < 1200:
    country = random.choice(list(regions.keys()))
    city = random.choice(regions[country])
    
    # Pick descriptive state/province metadata based on country
    if country == "Nigeria":
        state = f"{city} State"
    elif country == "United Kingdom":
        state = "West Midlands" if city in ["Birmingham", "Coventry"] else "Greater Manchester" if city == "Manchester" else "Yorkshire"
    else:  # China
        state = "Guangdong Province" if city in ["Shenzhen", "Guangzhou", "Dongguan", "Foshan"] else "Zhejiang Province" if city == "Ningbo" else "Jiangsu Province"

    prefix = random.choice(company_prefixes)
    root = random.choice(company_roots)
    suffix = random.choice(company_suffixes)
    
    # Structure names uniquely so it looks authentic across global regions
    name_style = random.randint(1, 3)
    if name_style == 1:
        comp_name = f"{prefix} {root} {suffix}"
    elif name_style == 2:
        comp_name = f"{city} {root} {suffix}"
    else:
        comp_name = f"{prefix} {city} {root}"
        
    if comp_name in generated_names:
        continue
    generated_names.add(comp_name)
    
    cap = random.choice(capabilities)
    emp_count = random.randint(20, 450)
    rev = random.choice(revenue_tiers)
    
    rows.append({
        "name": comp_name,
        "description": cap["desc"],
        "city": city,
        "state": state,
        "country": country,
        "employee_count": emp_count,
        "revenue_tier": rev,
        "categories": cap["cats"],
        "certifications": cap["certs"]
    })

# Output cleanly to data/my-companies.csv
output_path = 'data/my-companies.csv'
with open(output_path, mode='w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=["name", "description", "city", "state", "country", "employee_count", "revenue_tier", "categories", "certifications"])
    writer.writeheader()
    writer.writerows(rows)

print(f"🎉 Success! Created exactly {len(rows)} entries and saved to: '{output_path}'")
