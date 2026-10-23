# Campus Lost-and-Found Board

A small database-driven website built with Node.js, Express, EJS and MySQL. Users post lost or found items, browse and search the board, and manage their own posts.

## Features

- Register, log in, log out (sessions; passwords hashed with bcrypt)
- Browse all posts and view a detail page (no login needed)
- Create, edit, delete posts (logged-in owners only; ownership checked on the server)
- Mark your own post as resolved
- Keyword search plus category and lost/found filters
- One optional JPEG/PNG image per post (max 2 MB, server-generated filename, placeholder when missing)
- Success messages, validation errors, empty-result message, 403/404/500 pages
- "My posts" page with edit and delete (delete asks for confirmation)

## Tech stack

Node.js 18+, Express 4, EJS templates, MySQL 8 (or MariaDB 10.5+) via `mysql2`, `express-session`, `bcryptjs`, `multer`.

## Setup

1. Install Node.js 18+ and MySQL 8.
2. Install dependencies:
   ```
   npm install
   ```
3. Create your environment file and fill in your own MySQL user and password:
   ```
   cp .env.example .env
   ```
4. Create the database, tables and sample data (either way works):
   - **Option A (script):** `npm run db:setup`
   - **Option B (MySQL client):**
     ```
     mysql -u <user> -p < db/schema.sql
     mysql -u <user> -p < db/seed.sql
     ```
     `schema.sql` drops and recreates the tables, so running it again resets the data.
5. Start the site and open http://localhost:3000
   ```
   npm start
   ```

## Demo accounts

`seed.sql` creates two fictional users. Their passwords are stored only as bcrypt hashes.

| Username | Password  |
| -------- | --------- |
| demo1    | Demo1234! |
| demo2    | Demo1234! |

To create another account, either use the **Register** page, or run:

```
npm run create-user -- <username> <email> <password>
```

## Database design

Three tables: `users`, `categories`, `posts`. `posts.user_id` references `users.id` (ON DELETE CASCADE) and `posts.category_id` references `categories.id` (ON DELETE RESTRICT).

```
users 1 ──< posts >── 1 categories
```

Post status values: `open` / `resolved`. Post type values: `lost` / `found`.

## Project structure

```
app.js                 Express setup, sessions, error handlers
db.js                  MySQL connection pool (reads .env)
routes/auth.js         register, login, logout
routes/items.js        browse, details, create, edit, delete, resolve, my posts
middleware/            login check, multer upload config, image signature check
views/                 EJS templates
public/style.css       styling; public/uploads/ holds uploaded images
db/schema.sql, seed.sql
scripts/               setup-db.js, create-user.js
tests/smoke-test.js    optional automated check of the test scenarios
```

## Security notes

- All SQL that includes user input uses parameterized queries (`?` placeholders).
- Server validates required fields, IDs, status/type values and that the category exists.
- Every edit, delete and resolve action loads the post and compares `user_id` with the session user, and the SQL also filters on `user_id`.
- Uploads: multer file filter (JPEG/PNG), 2 MB limit, random server-generated filenames, and a file-signature check.
- Errors are logged on the server only; users see a generic message with no stack trace or credentials.
- Session is regenerated at login; cookies are `httpOnly` and `sameSite=lax`.

## Testing

See [TESTING.md](TESTING.md). To re-run the automated checks, start the app and run `npm run test:smoke` in another terminal (it creates and removes its own test records).

## Known limitations

- Sessions use the default in-memory store, so users are logged out when the server restarts (records stay in MySQL).
- No CSRF tokens, password reset, email verification, pagination or admin dashboard (not required).
- Uploaded images are stored on local disk in `public/uploads/`.
- Intended to run locally.
