# Historical Weather

What the weather has *actually* been like at a European location during a
given part of the year — not a forecast, a 20-year memory.

Search a place, drag a window over the calendar, and see the temperatures,
rainfall, cloud cover and risks you can reasonably expect for those days.

## Data

Everything comes from the **Copernicus ERA5 / ERA5-Land reanalysis** (ECMWF),
served by [Open-Meteo](https://open-meteo.com/):

- Archive: `https://archive-api.open-meteo.com/v1/archive`
- Geocoding: `https://geocoding-api.open-meteo.com/v1/search`

No API key, no backend. The data is CC BY 4.0 and the attribution in the app
footer is a licence requirement, not decoration. The reanalysis trails real time
by about five days, which the app accounts for.

## How it works

Selecting a location triggers **one** request covering the last 20 years
(~500 KB). The response is cached in IndexedDB, and every period selection,
drag and preset is computed locally from it — so the app is instant after the
first load and works offline for places you have already looked at.

A *period* is a calendar window (`{ startMonth, startDay, lengthDays }`), not a
date range. For each historic year it is materialised into real dates, so leap
days and windows that wrap across New Year need no special handling.

```
src/
  lib/openmeteo.js    API URLs, date range, response normalisation
  lib/aggregate.js    all statistics (pure functions, heavily tested)
  lib/cache.js        IndexedDB storage for archive responses
  lib/format.js       locale-aware units and dates
  lib/colors.js       the cold-to-hot temperature ramp
  lib/charts.js       Chart.js registration and shared options
  composables/        geocoding, archive loading, favourites, language
  components/         YearStrip (the drag selector) and the four views
  i18n/strings.js     English and German copy
```

## Development

```bash
npm install
npm run dev       # http://localhost:5173
npm run test      # 71 tests, including a real 20-year Trieste fixture
npm run build     # production build + service worker
npm run preview   # serve the build, with the PWA active
```

Icons are generated, not hand-drawn: `node scripts/generate-icons.mjs`.

## Deployment

The app is a static build served by nginx. It's a client-only PWA (no
backend, no server-side config), so the only thing you'd ever want to
change per-deployment is which host port it's published on.

### Docker Compose

```bash
docker compose up -d --build       # serves on http://localhost:8080
WEB_PORT=9000 docker compose up -d --build   # or any other free port
```

### Portainer

1. **Stacks -> Add stack -> Repository**, point it at this repo
   (`docker-compose.yml` at the root, branch `main`).
2. Under **Environment variables**, add `WEB_PORT` set to whichever host
   port is free on your server (defaults to `8080` if left unset — see
   `.env.example`).
3. Deploy the stack. Portainer builds the image from the `Dockerfile` on
   the host, no external registry needed.

To change the port later, edit the stack's environment variables and
redeploy — no file edits required.

## Notes

- Europe is a scoping choice; the data source is global, so other continents
  would work unchanged.
- Open-Meteo enforces a per-minute request limit. The app makes one request per
  location, so this only shows up when hammering the API from a script.
- The trend line over 20 years is indicative, not statistically significant, and
  the UI says so.
