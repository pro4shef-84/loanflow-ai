import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 3) {
    return NextResponse.json({ data: [] });
  }

  // Proxy to Nominatim so we control the User-Agent and rate limit on the server
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("limit", "6");
  url.searchParams.set("featureType", "house");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "LoanFlowAI/1.0 (loanflow-ai-six.vercel.app)",
      "Accept-Language": "en-US,en",
    },
    next: { revalidate: 60 }, // cache identical queries for 60s
  });

  if (!res.ok) {
    return NextResponse.json({ data: [] });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any[] = await res.json();

  const suggestions = raw.map((item) => {
    const a = item.address ?? {};
    const streetNumber = a.house_number ?? "";
    const street = a.road ?? a.pedestrian ?? "";
    const streetLine = [streetNumber, street].filter(Boolean).join(" ");
    const city = a.city ?? a.town ?? a.village ?? a.hamlet ?? a.county ?? "";
    const state = a.state ?? "";
    const zip = a.postcode?.split("-")[0] ?? "";

    return {
      display: item.display_name,
      street: streetLine,
      city,
      state: STATE_ABBR[state] ?? state,
      zip,
    };
  }).filter((s) => s.street && s.city);

  return NextResponse.json({ data: suggestions });
}

// Map full state names → 2-letter abbreviations
const STATE_ABBR: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA",
  Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
  Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS",
  Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH",
  "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY", "North Carolina": "NC",
  "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA",
  "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN",
  Texas: "TX", Utah: "UT", Vermont: "VT", Virginia: "VA", Washington: "WA",
  "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY", "District of Columbia": "DC",
};
