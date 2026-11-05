# FacList cheat sheet

## Add a country (the only thing you need to repeat)
Open the project in VS Code, open the Terminal, and run:

    npm run add -- NG "Nigeria"

Replace NG and Nigeria with another country. Wait for "All done". That's it.
New pages show up on the site within about an hour. You do NOT need to bump any numbers.

Country codes: NG Nigeria, GH Ghana, KE Kenya, ZA South Africa, GB United Kingdom, US United States,
CA Canada, AU Australia, DE Germany, IN India, CN China.

Big countries (US, China, India, GB) can time out. Do them one region at a time:

    npm run add -- US "United States" --region "Texas"

Optional: add --dry to check without loading anything.

## After you change any code file
    git add .
    git commit -m "update"
    git push

## Extra company details (optional CSV columns)
The importer also understands these columns: year_founded, company_type (Manufacturer, Distributor,
Service Company, Custom Manufacturer), sales_range (any text, e.g. "$5M - $25M"), industries, capabilities,
products (separate several items with a semicolon). Leave them empty if you don't know. Empty fields show
"Not provided" on the profile instead of a guess.

## One-time upgrade for the search + richer profiles update
1. Run ONCE:  npm run db:migrate:remote
   (if it says a column already exists, it was already done, ignore it)
2. Then:  git add .   git commit -m "richer profiles and search"   git push
