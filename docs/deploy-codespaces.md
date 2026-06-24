# Temporary live demo via GitHub Codespaces

GitHub **Pages** can't host this app (it only serves static files; there's no place
to run the NestJS API or PostgreSQL). **Codespaces** runs the whole stack on a cloud
Linux box and gives you a temporary public URL — the right GitHub-native option.

## Launch (one time, ~2–3 min to build)

1. On the repo page: **Code ▸ Codespaces ▸ Create codespace on `feat/provider-seams`**.
2. Wait for the container to build (`.devcontainer/setup.sh` installs deps, generates
   the Prisma client, and writes dev `.env` files with fresh JWT secrets).
3. In the Codespace terminal, run:

   ```bash
   bash scripts/codespace-start.sh
   ```

   This starts Postgres, applies migrations, seeds demo data, starts the API on
   `:4000`, then serves the web app on `:5173`.

## Share the URL

- Open the **Ports** tab, find port **5173**, right-click ▸ **Port Visibility ▸ Public**.
- Open/share that `https://…-5173.app.github.dev` URL.

The browser only ever talks to the `:5173` origin — Vite proxies `/api` to the backend
server-side, so auth cookies stay first-party (no CORS / SameSite changes needed).

## Demo logins (seeded)

| Role   | Email                  | Password    |
| ------ | ---------------------- | ----------- |
| Client | client@27markets.io    | Client123!  |
| Admin  | admin@27markets.io     | Admin123!   |
| Agent  | agent@27markets.io     | Agent123!   |

## Notes

- The platform stays in **`TRADING_MODE=SIMULATION`** — no real funds move.
- A public port means anyone with the link can use the demo; stop the Codespace
  (or set the port back to Private) when you're done.
- Codespaces has a monthly free-hours quota; an idle Codespace auto-suspends.

## Alternative (more durable shareable URL)

For a longer-lived demo, deploy the **frontend** to Vercel/Netlify and the
**backend + Postgres** to Railway/Render. That path needs cross-domain auth tweaks
(`SameSite=None; Secure` cookies + `CORS` set to the frontend origin +
`VITE_API_URL` pointed at the deployed API).
