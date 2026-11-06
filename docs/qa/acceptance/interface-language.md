# Acceptance — interface language

Run against an isolated QA instance with synthetic data. The language preference belongs to the
profile; user-created names, document contents and Lucius conversation text remain unchanged.
The browser fixture uses synthetic responses for failure cases and a separately attested, explicitly
synthetic QA book for real profile persistence. The fixture expects the project demo seed built offline with `--as-of 2026-11-05`; the report aggregate itself is a fixed synthetic API response, while account, transaction and position data come from the isolated backend. Desktop-native menus require their own tests.

### LANG-PROFILE
- GIVEN an English-language browser and a profile whose language is Simplified Chinese
- WHEN the app loads Settings → Currency & format
- THEN the interface and the language selector use Chinese, because the profile wins.

### LANG-SAVE
- GIVEN the language selector and a successful profile response
- WHEN I select English, reload, then select Simplified Chinese and reload again
- THEN the interface follows each selection and the saved preference survives each reload.

### LANG-BROWSER
- GIVEN a profile with no language preference and a Simplified Chinese browser
- WHEN the app and the language settings load
- THEN the interface uses Simplified Chinese and the selector says Follow browser.

### LANG-SAVE-FAIL
- GIVEN an English profile and a failed language-save response
- WHEN I select Simplified Chinese
- THEN the existing English choice remains selected, an error appears and the saved value stays English.

### LANG-LOAD-FAIL
- GIVEN a failed profile read
- WHEN the language settings load and I retry after the server recovers
- THEN the interface initially follows the browser, selection is disabled without writing a preference, and retry restores the saved selection.

### LANG-REAL-PERSIST
- GIVEN an isolated synthetic QA book and an English browser
- WHEN I choose Simplified Chinese and reload the app
- THEN the backend profile and the reloaded interface both retain Simplified Chinese.

### LANG-CORE-PAGES
- GIVEN the saved Simplified Chinese preference in an isolated synthetic QA book
- WHEN I visit Dashboard, Accounts, Plan and Investments
- THEN each page renders Chinese labels and real synthetic values, preserving the account, merchant and instrument names, amounts and date; the dashboard history chart is loaded, the budget month fits without truncation, and the populated reports view is captured for review.
- AND changing base currency opens a Chinese confirmation that can be canceled without a write.

### LANG-MOBILE
- GIVEN a 390 × 844 browser with a Simplified Chinese browser preference
- WHEN I open the language settings
- THEN the selector and labels are usable in Chinese without horizontal page overflow.

### LANG-MARKET
- GIVEN a Chinese interface and a dot-grouped number preference
- WHEN the market strip displays marked built-in commodities and an unmarked external name
- THEN the built-in names are Chinese, the external name is unchanged, and prices and percentage changes follow the number preference.
