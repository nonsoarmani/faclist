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

## Claims, quote requests and Featured listings
Pages: /claim/<company>, /quote/<company>, /manage/<private link>, /pricing, /admin (your private dashboard).

One-time setup (after pushing the code):
1. Run once:  npm run db:migrate6:remote
2. Set your admin password (a long one, 16+ characters). In the terminal:
       npx wrangler pages secret put ADMIN_PASSWORD --project-name=faclist
   and type the password when asked. Then open https://faclist.com/admin and log in.
3. Optional alerts on your phone: create a Telegram bot with @BotFather, then set two more secrets the same way:
       TELEGRAM_BOT_TOKEN   and   TELEGRAM_CHAT_ID
4. Optional email (owner edit links, leads forwarded to verified suppliers): make a free account at resend.com,
   verify faclist.com there, then set the secrets RESEND_API_KEY, MAIL_FROM (for example  FacList <hello@faclist.com>)
   and ADMIN_EMAIL (where you want alerts).
5. Optional "Get a Featured listing" button for verified owners: create a checkout link (Paystack, Flutterwave,
   Gumroad...) and set the secret FEATURED_CHECKOUT_URL.
Without 3 to 5 everything still works: you see claims and requests in /admin and send links yourself.

Day to day:  /admin > Claims > Approve  (gives you the owner's private edit link)
             /admin > Quote requests     (forward them, mark them done)
             /admin > Featured           (switch a paid listing on or off)
