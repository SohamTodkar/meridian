export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get("title") ?? "Ideas").replace(/[<>&]/g, "").slice(0, 90);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#101112"/><path d="M0 470C250 360 390 630 650 490S980 360 1200 430V630H0Z" fill="#ff5638" opacity=".85"/><text x="72" y="120" fill="#a8aaa7" font-family="monospace" font-size="22" letter-spacing="5">IDEAS / FIELD JOURNAL</text><foreignObject x="72" y="180" width="1000" height="270"><div xmlns="http://www.w3.org/1999/xhtml" style="font: 700 72px Arial,sans-serif;letter-spacing:-4px;line-height:1.03;color:#f3f0e9">${title}</div></foreignObject></svg>`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" } });
}
