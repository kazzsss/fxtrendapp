/* ============================
   為替データ取得（USDJPY）
============================ */
async function fetchRate() {
  const res = await fetch("https://api.exchangerate.host/latest?base=USD&symbols=JPY");
  const data = await res.json();
  return data.rates.JPY;
}

/* ============================
   ニュース取得（3件）
============================ */
async function fetchNews() {
  const res = await fetch("https://finnhub.io/api/v1/news?category=forex&token=YOUR_API_KEY");
  const data = await res.json();
  return data.slice(0, 3);
}

function getImportance(title) {
  if (title.match(/金利|利上げ|日銀|FRB|CPI|雇用統計/)) return "高";
  if (title.match(/PMI|見通し|発言|市場/)) return "中";
  return "低";
}

function displayNews(newsList) {
  const container = document.getElementById("news-list");
  container.innerHTML = newsList.map(n => {
    const imp = getImportance(n.headline);
    return `<div class="news-item">● ${n.headline}（${imp}）</div>`;
  }).join("");
}

/* ============================
   ローソク足生成（5分足）
============================ */
let candles = [];

function updateCandles(rate) {
  const last = candles[candles.length - 1];

  if (!last || Date.now() - last.time > 5 * 60 * 1000) {
    candles.push({
      time: Date.now(),
      open: rate,
      high: rate,
      low: rate,
      close: rate
    });
  } else {
    last.high = Math.max(last.high, rate);
    last.low  = Math.min(last.low, rate);
    last.close = rate;
  }
}

/* ============================
   MA20
============================ */
function calcMA20(candles) {
  if (candles.length < 20) return null;
  const slice = candles.slice(-20);
  const sum = slice.reduce((a, c) => a + c.close, 0);
  return sum / 20;
}

function getMASlope(candles) {
  if (candles.length < 21) return 0;
  const maPrev = calcMA20(candles.slice(0, -1));
  const maNow  = calcMA20(candles);
  return maNow - maPrev;
}

/* ============================
   ボリンジャーバンド（±1σ）
============================ */
function calcBB(candles) {
  if (candles.length < 20) return null;
  const slice = candles.slice(-20);
  const ma = calcMA20(candles);
  const variance = slice.reduce((a, c) => a + Math.pow(c.close - ma, 2), 0) / 20;
  const sd = Math.sqrt(variance);

  return {
    ma,
    upper1: ma + sd,
    lower1: ma - sd
  };
}

/* ============================
   高値・安値更新
============================ */
function getHighLowUpdate(candles) {
  if (candles.length < 3) return null;
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];

  return {
    highBreak: last.high > prev.high,
    lowBreak:  last.low  < prev.low
  };
}

/* ============================
   トレンド方向判定
============================ */
function getTrendDirection(candles) {
  const slope = getMASlope(candles);
  if (slope > 0.02) return "long";
  if (slope < -0.02) return "short";
  return "range";
}

/* ============================
   強度計算
============================ */
function calcStrength(candles) {
  const slope = getMASlope(candles);
  const bb = calcBB(candles);
  const hl = getHighLowUpdate(candles);

  let score = 0;

  if (slope > 0.02) score += 2;
  if (slope < -0.02) score -= 2;

  if (hl?.highBreak) score += 1;
  if (hl?.lowBreak)  score -= 1;

  if (bb) {
    const last = candles[candles.length - 1].close;
    if (last > bb.upper1) score += 1;
    if (last < bb.lower1) score -= 1;
  }

  return score;
}

/* ============================
   逆行警告
============================ */
function getReversalWarning(candles) {
  const bb = calcBB(candles);
  if (!bb) return null;

  const last = candles[candles.length - 1].close;

  if (last > bb.upper1) return "long_reversal";
  if (last < bb.lower1) return "short_reversal";

  return null;
}

/* ============================
   トレンド総合ステータス
============================ */
function getTrendStatus(candles) {
  return {
    direction: getTrendDirection(candles),
    strength: calcStrength(candles),
    warning: getReversalWarning(candles)
  };
}

/* ============================
   UI更新
============================ */
function updateUI(status) {
  document.getElementById("trend-direction").innerText =
    status.direction === "long" ? "トレンド方向：ロング優勢" :
    status.direction === "short" ? "トレンド方向：ショート優勢" :
    "トレンド方向：レンジ";

  document.getElementById("trend-strength").innerText =
    `強度：${status.strength}`;

  document.getElementById("warning").innerText =
    status.warning === "long_reversal" ? "⚠️ ロング逆行注意" :
    status.warning === "short_reversal" ? "⚠️ ショート逆行注意" : "";
}

/* ============================
   自動更新（為替5秒・ニュース30秒）
============================ */
setInterval(async () => {
  const rate = await fetchRate();
  updateCandles(rate);
  const status = getTrendStatus(candles);
  updateUI(status);
}, 5000);

setInterval(async () => {
  const news = await fetchNews();
  displayNews(news);
}, 30000);
