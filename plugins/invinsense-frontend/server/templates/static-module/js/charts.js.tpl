/* Inline SVG charts for static modules. Colours come from tokens (never hex).
   React and Next.js modules use reaviz (Law 18). */
function sparkline(values, opts) {
  opts = opts || {};
  var w = opts.width || 240, h = opts.height || 56, pad = 4;
  var max = Math.max.apply(null, values), min = Math.min.apply(null, values);
  var span = max - min || 1;
  var step = (w - pad * 2) / (values.length - 1);
  var pts = values.map(function (v, i) {
    return (pad + i * step).toFixed(1) + "," + (h - pad - ((v - min) / span) * (h - pad * 2)).toFixed(1);
  }).join(" ");
  return '<svg class="spark" viewBox="0 0 ' + w + " " + h + '" width="100%" height="' + h + '" preserveAspectRatio="none" role="img" aria-label="' + (opts.label || "Trend") + '">' +
    '<polyline points="' + pts + '" fill="none" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" style="stroke:var(--primary)"/></svg>';
}
