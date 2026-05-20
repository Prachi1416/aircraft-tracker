from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx
import time
import io
import csv
from typing import Optional

OPENSKY_BASE = "https://opensky-network.org/api"
AIRPORTS_URL = "https://davidmegginson.github.io/ourairports-data/airports.csv"

_airports: list[dict] = []
_states_cache: dict = {"data": None, "timestamp": 0.0}
CACHE_TTL = 10  # seconds — matches the 10s frontend refresh


def parse_state(s: list) -> dict:
    return {
        "icao24": s[0],
        "callsign": (s[1] or "").strip() or None,
        "origin_country": s[2],
        "longitude": s[5],
        "latitude": s[6],
        "baro_altitude": s[7],
        "on_ground": s[8],
        "velocity": s[9],
        "true_track": s[10],
        "vertical_rate": s[11],
        "geo_altitude": s[13] if len(s) > 13 else None,
        "squawk": s[14] if len(s) > 14 else None,
    }


async def fetch_all_states() -> dict:
    now = time.time()
    if _states_cache["data"] and (now - _states_cache["timestamp"]) < CACHE_TTL:
        return _states_cache["data"]

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{OPENSKY_BASE}/states/all")
        resp.raise_for_status()
        data = resp.json()

    _states_cache["data"] = data
    _states_cache["timestamp"] = time.time()
    return data


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _airports
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(AIRPORTS_URL)
            reader = csv.DictReader(io.StringIO(resp.text))
            _airports = [
                {
                    "ident": row["ident"],
                    "name": row["name"],
                    "iso_country": row["iso_country"],
                    "municipality": row["municipality"],
                    "iata_code": row["iata_code"],
                    "icao_code": row["ident"],
                    "latitude": row["latitude_deg"],
                    "longitude": row["longitude_deg"],
                }
                for row in reader
                if row.get("iata_code")
                and row.get("type") in ("large_airport", "medium_airport")
            ]
        print(f"Loaded {len(_airports)} airports")
    except Exception as e:
        print(f"Warning: Could not load airports — {e}")
    yield


app = FastAPI(title="Aircraft Tracker API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Scenario 1 — all aircraft grouped by origin country
@app.get("/api/states/grouped")
async def get_states_grouped():
    data = await fetch_all_states()
    states = data.get("states") or []

    grouped: dict = {}
    for s in states:
        country = s[2] or "Unknown"
        grouped.setdefault(country, []).append(parse_state(s))

    sorted_grouped = dict(
        sorted(grouped.items(), key=lambda x: len(x[1]), reverse=True)
    )
    return {"time": data.get("time"), "total": len(states), "countries": sorted_grouped}


# Scenario 2 — airborne count for a specific country
@app.get("/api/states/airborne")
async def get_airborne_by_country(country: str = Query(...)):
    data = await fetch_all_states()
    states = data.get("states") or []

    country_states = [s for s in states if s[2] == country]
    airborne = [s for s in country_states if not s[8]]

    return {
        "country": country,
        "total_tracked": len(country_states),
        "airborne_count": len(airborne),
        "aircrafts": [parse_state(s) for s in airborne],
    }


# Scenario 3 — departures from airport in last 20 minutes
@app.get("/api/departures")
async def get_departures(airport: str = Query(...)):
    end_time = int(time.time())
    begin_time = end_time - 20 * 60

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{OPENSKY_BASE}/flights/departure",
                params={"airport": airport, "begin": begin_time, "end": end_time},
            )
            if resp.status_code in (404, 204):
                return {"airport": airport, "departures": [], "window_minutes": 20}
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError:
        return {"airport": airport, "departures": [], "window_minutes": 20}

    return {"airport": airport, "departures": data or [], "window_minutes": 20}


# Scenario 4 — live position of a specific aircraft
@app.get("/api/aircraft/{icao24}")
async def get_aircraft_position(icao24: str):
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{OPENSKY_BASE}/states/all",
            params={"icao24": icao24.lower()},
        )
        resp.raise_for_status()
        data = resp.json()

    states = data.get("states") or []
    if not states:
        raise HTTPException(
            status_code=404, detail="Aircraft not found or not currently tracked"
        )
    return parse_state(states[0])


# Airport list endpoint (used by Scenario 3 search)
@app.get("/api/airports")
async def list_airports(q: Optional[str] = None, country: Optional[str] = None):
    result = _airports
    if country:
        result = [a for a in result if a["iso_country"] == country]
    if q:
        q_lower = q.lower()
        result = [
            a
            for a in result
            if q_lower in a["name"].lower()
            or q_lower in (a["iata_code"] or "").lower()
            or q_lower in (a["municipality"] or "").lower()
        ]
    return result[:200]


# Country list (used by Scenario 2 dropdown)
@app.get("/api/countries")
async def list_countries():
    data = await fetch_all_states()
    states = data.get("states") or []
    countries = sorted({s[2] for s in states if s[2]})
    return countries
