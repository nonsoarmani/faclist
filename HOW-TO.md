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
