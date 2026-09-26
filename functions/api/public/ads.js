// Public, read-only endpoint. Ad markup is entered only through the protected admin dashboard.
export async function onRequestGet(context) {
  if (!context.env.ANALYTICS_DB) return Response.json({ left: '', right: '', beforeCountries: '', topHeader: '', bottom: '' }, { status: 503 });
  var result = await context.env.ANALYTICS_DB.prepare("SELECT placement, ad_code FROM ad_placements WHERE placement IN ('left', 'right', 'beforeCountries', 'topHeader', 'bottom')").all();
  var ads = { left: '', right: '', beforeCountries: '', topHeader: '', bottom: '' };
  result.results.forEach(function (row) { ads[row.placement] = row.ad_code || ''; });
  return Response.json(ads, { headers: { 'Cache-Control': 'no-store' } });
}
