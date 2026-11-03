/* Einfache Flaggen als SVG (für Flaggen-Fragen; Flaggen-Emojis zeigen unter Windows nur Buchstaben) */
const DDF_FLAGS = (() => {
  const svg = (w, h, body) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Flagge">${body}</svg>`;
  const stripes = (dir, colors, w, h, weights) => {
    weights = weights || colors.map(() => 1);
    const total = weights.reduce((a, b) => a + b, 0);
    let pos = 0, out = '';
    colors.forEach((c, i) => {
      const size = (dir === 'h' ? h : w) * weights[i] / total;
      out += dir === 'h'
        ? `<rect x="0" y="${pos}" width="${w}" height="${size + 0.02}" fill="${c}"/>`
        : `<rect x="${pos}" y="0" width="${size + 0.02}" height="${h}" fill="${c}"/>`;
      pos += size;
    });
    return svg(w, h, out);
  };
  const hs = (colors, w, h, weights) => stripes('h', colors, w, h, weights);
  const vs = (colors, w, h, weights) => stripes('v', colors, w, h, weights);
  // Skandinavisches Kreuz: crosses = [[farbe, x0, x1, y0, y1], ...]
  const nordic = (w, h, bg, crosses) => {
    let out = `<rect width="${w}" height="${h}" fill="${bg}"/>`;
    crosses.forEach(([c, x0, x1, y0, y1]) => {
      out += `<rect x="${x0}" y="0" width="${x1 - x0}" height="${h}" fill="${c}"/>`;
      out += `<rect x="0" y="${y0}" width="${w}" height="${y1 - y0}" fill="${c}"/>`;
    });
    return svg(w, h, out);
  };
  const sunRays = (cx, cy, r0, r1, n, color) => {
    let out = '';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, d = Math.PI / n * 0.55;
      const p = [
        [cx + Math.cos(a - d) * r0, cy + Math.sin(a - d) * r0],
        [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1],
        [cx + Math.cos(a + d) * r0, cy + Math.sin(a + d) * r0]
      ].map(q => q.map(v => v.toFixed(3)).join(',')).join(' ');
      out += `<polygon points="${p}" fill="${color}"/>`;
    }
    return out;
  };
  const F = {
    de: () => hs(['#000000', '#DD0000', '#FFCE00'], 5, 3),
    fr: () => vs(['#0055A4', '#FFFFFF', '#EF4135'], 3, 2),
    it: () => vs(['#009246', '#FFFFFF', '#CE2B37'], 3, 2),
    ie: () => vs(['#169B62', '#FFFFFF', '#FF883E'], 2, 1),
    be: () => vs(['#000000', '#FAE042', '#ED2939'], 15, 13),
    nl: () => hs(['#AE1C28', '#FFFFFF', '#21468B'], 3, 2),
    lu: () => hs(['#EA141D', '#FFFFFF', '#51ADDA'], 5, 3),
    at: () => hs(['#ED2939', '#FFFFFF', '#ED2939'], 3, 2),
    pl: () => hs(['#FFFFFF', '#DC143C'], 8, 5),
    ua: () => hs(['#0057B7', '#FFD700'], 3, 2),
    ru: () => hs(['#FFFFFF', '#0039A6', '#D52B1E'], 3, 2),
    hu: () => hs(['#CE2939', '#FFFFFF', '#477050'], 2, 1),
    bg: () => hs(['#FFFFFF', '#00966E', '#D62612'], 5, 3),
    lt: () => hs(['#FDB913', '#006A44', '#C1272D'], 5, 3),
    ee: () => hs(['#0072CE', '#000000', '#FFFFFF'], 11, 7),
    ro: () => vs(['#002B7F', '#FCD116', '#CE1126'], 3, 2),
    ml: () => vs(['#14B53A', '#FCD116', '#CE1126'], 3, 2),
    ng: () => vs(['#008751', '#FFFFFF', '#008751'], 2, 1),
    co: () => hs(['#FCD116', '#003893', '#CE1126'], 6, 4, [2, 1, 1]),
    th: () => hs(['#A51931', '#F4F5F8', '#2D2A4A', '#F4F5F8', '#A51931'], 9, 6, [1, 1, 2, 1, 1]),
    lv: () => hs(['#9E3039', '#FFFFFF', '#9E3039'], 10, 5, [2, 1, 2]),
    jp: () => svg(3, 2, '<rect width="3" height="2" fill="#FFFFFF"/><circle cx="1.5" cy="1" r="0.6" fill="#BC002D"/>'),
    bd: () => svg(10, 6, '<rect width="10" height="6" fill="#006A4E"/><circle cx="4.5" cy="3" r="2" fill="#F42A41"/>'),
    fi: () => nordic(18, 11, '#FFFFFF', [['#002F6C', 5, 8, 4, 7]]),
    se: () => nordic(16, 10, '#006AA7', [['#FECC02', 5, 7, 4, 6]]),
    dk: () => nordic(37, 28, '#C8102E', [['#FFFFFF', 12, 16, 12, 16]]),
    no: () => nordic(22, 16, '#BA0C2F', [['#FFFFFF', 6, 10, 6, 10], ['#00205B', 7, 9, 7, 9]]),
    is: () => nordic(25, 18, '#02529C', [['#FFFFFF', 7, 11, 7, 11], ['#DC1E35', 8, 10, 8, 10]]),
    ch: () => svg(32, 32, '<rect width="32" height="32" fill="#DA291C"/><rect x="13" y="6" width="6" height="20" fill="#FFFFFF"/><rect x="6" y="13" width="20" height="6" fill="#FFFFFF"/>'),
    cz: () => svg(30, 20, '<rect width="30" height="10" fill="#FFFFFF"/><rect y="10" width="30" height="10" fill="#D7141A"/><polygon points="0,0 15,10 0,20" fill="#11457E"/>'),
    gr: () => {
      let out = '';
      for (let i = 0; i < 9; i++) out += `<rect x="0" y="${i * 2}" width="27" height="2.02" fill="${i % 2 ? '#FFFFFF' : '#0D5EAF'}"/>`;
      out += '<rect width="10" height="10" fill="#0D5EAF"/><rect x="4" width="2" height="10" fill="#FFFFFF"/><rect y="4" width="10" height="2" fill="#FFFFFF"/>';
      return svg(27, 18, out);
    },
    ar: () => {
      const base = '<rect width="8" height="5" fill="#74ACDF"/><rect y="1.6667" width="8" height="1.6667" fill="#FFFFFF"/>';
      return svg(8, 5, base + sunRays(4, 2.5, 0.36, 0.74, 16, '#F6B40E') + '<circle cx="4" cy="2.5" r="0.38" fill="#F6B40E" stroke="#85340A" stroke-width="0.03"/>');
    }
  };
  return { get: code => (F[code] ? F[code]() : ''), has: code => !!F[code] };
})();
