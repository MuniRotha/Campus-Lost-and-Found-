# Testing

Tested on Node 22 with MariaDB 10.11 (MySQL-compatible).

- Rows 1 to 9 and P1 to P6 are covered by `npm run test:smoke` (39 checks, all passing). Start the app, then run it in a second terminal.
- Row 10 was checked by restarting the server.
- Rows 11 to 14 were run in Chromium with Playwright against the running app.

| # | Action / input | Expected result | Actual result | Pass/Fail |
|---|----------------|-----------------|---------------|-----------|
| 1a | Register with a new username, email and 8+ char password | Account created, redirected to login with success message | Redirected to /login | Pass |
| 1b | Register with an existing username | Rejected with "username already taken" | 400 and message shown | Pass |
| 1c | Register with an existing email | Rejected with "email already registered" | 400 and message shown | Pass |
| 2a | Log in with a wrong password | "Incorrect username or password", stays on login | 401 and message shown | Pass |
| 2b | Log in with correct credentials | Logged in, redirected to board, welcome message | Redirected, session set | Pass |
| 3a | Create a post with valid title, description, category, type, status | Post saved and detail page shown | Redirected to new post | Pass |
| 3b | Create a post with an empty title | Rejected with "Title is required" | 400 and message shown | Pass |
| 3c | Create a post with a nonexistent category id | Rejected with "category does not exist" | 400 and message shown | Pass |
| 3d | Create a post with an invalid status value | Rejected with "Invalid status" | 400 and message shown | Pass |
| 4a | Visitor opens /items | Board lists posts | 200, 11 sample posts | Pass |
| 4b | Search keyword matching a post | Only matching posts shown | Post found | Pass |
| 4c | Search keyword with no matches | "No items match" message | Message shown | Pass |
| 4d | Filter by category | Only that category shown | Other categories hidden | Pass |
| 4e | Visitor opens a detail page | Full details shown | 200 with description | Pass |
| 5a/5b | Owner edits own post | Changes saved and shown | Title updated | Pass |
| 5c/5d | Owner deletes own post | Post removed; opening it gives 404 | Redirected; 404 afterwards | Pass |
| 6a | Second user opens edit form of first user's post | 403 Not allowed | 403 | Pass |
| 6b | Second user sends direct POST to edit | 403, data unchanged | 403, unchanged | Pass |
| 6c | Second user sends direct POST to delete | 403, post still exists | 403, still exists | Pass |
| 7a | Upload a valid PNG | Accepted, saved with random filename | Stored as `<hex>.png` | Pass |
| 7b | Upload a .txt file | Rejected with type message | 400 and message shown | Pass |
| 7c | Upload a text file renamed to .png | Rejected (signature check) | 400 and message shown | Pass |
| 7d | Upload an image larger than 2 MB | Rejected with size message | 400 and message shown | Pass |
| 8a-c | Anonymous user opens create form / posts / deletes | Redirected to login | 302 to /login | Pass |
| 8d | Log out, then open My posts | Redirected to login | 302 to /login | Pass |
| 9a | Open /items/999999 | Friendly "could not be found" page | 404 page | Pass |
| 9b | Open /items/abc | Friendly 404 page | 404 page | Pass |
| P1 | Search a term that matches 13 posts | Page 1 shows 12 posts and "Showing 1–12 of 13" | 12 cards, correct text | Pass |
| P2 | Look at the Next link on that search | Link keeps the search term and adds page=2 | `?q=...&page=2` | Pass |
| P3 | Open page 2 | Shows post 13, page 2 marked current | "Showing 13–13 of 13" | Pass |
| P4 | Open page=999 | Shows the last page instead of an error | Last page shown | Pass |
| P5 | Open page=abc | Falls back to page 1 | Page 1 shown | Pass |
| P6 | Send the q parameter twice | Page still loads | 200 | Pass |
| 10 | Stop and restart the server, reload the board | Records still present | 11 sample posts after restart | Pass |
| 11 (UI) | Browser: register, log in, create a post with a photo, search for it, edit it, delete it, log out | Every step works, with labels and messages visible | Each step passed; toasts shown after register, create, edit, delete and logout | Pass |
| 12 (UI) | Click Delete on a post | A confirmation dialog opens first; Cancel keeps the post, Delete removes it | Dialog opened; Cancel kept the post; Delete removed it (404 afterwards) | Pass |
| 13 (UI) | Toggle dark mode, reload the page | Theme switches and stays after reload | Switched from light to dark and stayed dark after reload | Pass |
| 14 (UI) | Open the site at phone width (390 px) | Menu collapses to a button; filters and cards stack; no sideways scrolling | Board, login, register and detail pages fit with no horizontal scroll; menu button opens the mobile menu | Pass |
