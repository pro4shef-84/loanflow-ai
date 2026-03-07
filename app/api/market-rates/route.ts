import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";
const CACHE_SECONDS = 60 * 60 * 24; // 24 hours — PMMS updates weekly

async function fetchFredSeries(seriesId: string, apiKey: string) {
  const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&sort_order=desc&limit=3&file_type=json`;
  const res = await fetch(url, { next: { revalidate: CACHE_SECONDS } });
  if (!res.ok) throw new Error(`FRED ${seriesId} ${res.status}`);
  const json = await res.json();
  const obs = (json.observations as Array<{ date: string; value: string }>)
    .filter((o) => o.value !== ".");
  const latest = obs[0] ? { date: obs[0].date, value: parseFloat(obs[0].value) } : null;
  const prior = obs[1] ? parseFloat(obs[1].value) : null;
  return { latest, prior };
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ configured: false, message: "Add FRED_API_KEY to enable live market rates" });
  }

  try {
    const [s30, s15] = await Promise.all([
      fetchFredSeries("MORTGAGE30US", apiKey),
      fetchFredSeries("MORTGAGE15US", apiKey),
    ]);

    return NextResponse.json({
      configured: true,
      week: s30.latest?.date ?? null,
      rate30yr: s30.latest?.value ?? null,
      rate15yr: s15.latest?.value ?? null,
      change30yr: s30.latest && s30.prior !== null
        ? parseFloat((s30.latest.value - s30.prior).toFixed(3)) : null,
      change15yr: s15.latest && s15.prior !== null
        ? parseFloat((s15.latest.value - s15.prior).toFixed(3)) : null,
      source: "Freddie Mac PMMS via FRED",
    });
  } catch (err) {
    return NextResponse.json(
      { configured: true, error: err instanceof Error ? err.message : "Failed to fetch" },
      { status: 502 }
    );
  }
}
