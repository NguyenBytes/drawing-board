# Drawing Board

A collaborative pixel drawing board with a Node/Express backend and a MySQL database.

## Architecture

- **Frontend**: Static files served from `server/src/`
- **Backend**: Express 5 (ES modules) in `server/`
- **Database**: MySQL via `mysql2/promise` connection pool
- **Infra**: Two Express instances behind nginx, deployed via Docker Compose

## Server Structure

```
server/
├── index.js                  # App entry point
├── db.js                     # MySQL connection pool
├── models/coordinate.js      # DB queries
├── controllers/coordinateController.js
└── routes/coordinates.js
```

## Running Locally

```bash
cd server
npm run dev     # nodemon, watches js/html/css
npm start       # plain node
```

## Environment Variables

Defined in `.env` (not committed). Required vars:

| Var        | Description              |
|------------|--------------------------|
| `host`     | MySQL host               |
| `username` | MySQL user               |
| `password` | MySQL password           |
| `database` | Database name            |
| `port`     | MySQL port               |

SSL cert expected at `../cert/ca-certificate.crt` relative to `server/`.

## Docker

```bash
docker compose up --build
```

Two Express containers (`express1`, `express2`) load-balanced by nginx on ports 80/443.

## API

All routes are under `/api/coordinates`.

| Method   | Description                              |
|----------|------------------------------------------|
| `GET`    | Fetch coordinates; optional `?x=&y=` for a 100x100 tile |
| `POST`   | Upsert `{ data: [{x, y, color}] }`      |
| `DELETE` | Delete `{ data: [{x, y}] }`             |
