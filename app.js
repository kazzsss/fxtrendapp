/* ============================
   グローバル変数
============================ */
let candles = [];

/* ============================
   レート取得（USDJPY）
============================ */
async function fetchPrice() {
  const url = "https://query1.finance.yahoo.com/v8/finance/chart/USDJPY=X";
  const res = await fetch(url);
  const data = await res.json();
  const price = data.chart.result[0].meta.regularMarketPrice;
  console.log("USDJPY:", price);
}

setInterval(fetchPrice, 5000); // 5秒ごとに更新

/* ============================
   ローソク足更新（簡易）
============================ */
function updateCandles(rate) {
  const now = Date.now();

  candles.push({
    time: now,
    close: rate
  });

  if (candles.length > 200) candles.shift();
}

/* ============================
   トレンド方向判定
============================ */
function getTrendDirection(candles) {
  if (candles.length < 2) return "range";

  const first = candles[0].close;
  const last = candles[candles.length - 1].close;

  if (last > first + 0.1) return "long";
  if (last < first - 0.1) return "short";
  return "range";
}

/* ============================
   強度計算
============================ */
function calcStrength(candles) {
  if (candles.length < 2) return 0;

  const first = candles[0].close;
  const last = candles[candles.length - 1].close;

  return (last - first).toFixed(2);
}

/* ============================
   逆行警告
============================ */
function getReversalWarning(candles) {
  if (candles.length < 20) return null;

  const last = candles[candles.length - 1].close;

  const bb = {
    upper1: candles[candles.length - 1].close + 0.2,
    lower1: candles[candles.length - 1].close - 0.2
  };

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
   ニュース（簡易）
============================ */
async function fetchNews() {
  document.getElementById("news-area").textContent =
    "ニュース機能は準備中です。";
}

/* ============================
   自動更新（5秒）
============================ */
setInterval(async () => {
  const rate = await fetchRate();
  updateCandles(rate);
  const status = getTrendStatus(candles);
  updateUI(status);

  document.getElementById("current-rate").textContent =
      `現在のレート：${rate.toFixed(3)}`;
}, 5000); // ← 5秒に変更

let lastRate = null;  // 前回のレートを保存する

async function fetchRate() {
  try {
    const url = "https://api.fxratesapi.com/latest?base=USD&symbols=JPY";
    const res = await fetch(url);

    // 429 や 500 などエラー時は前回レートを返す
    if (!res.ok) {
      console.warn("APIエラー発生、前回レートを使用:", res.status);
      return lastRate;
    }

    const data = await res.json();

    // JPY が undefined の場合も前回レートを返す
    if (!data?.rates?.JPY) {
      console.warn("JPYが取得できず、前回レートを使用");
      return lastRate;
    }

    // 正常時は lastRate を更新
    lastRate = data.rates.JPY;
    return lastRate;

  } catch (error) {
    console.error("fetchRate エラー:", error);
    return lastRate;  // ネットワークエラー時も前回レート
  }
}

/* ============================
   初期化
============================ */
(async () => {
  const rate = await fetchRate();
  updateCandles(rate);
  updateUI(getTrendStatus(candles));

  document.getElementById("current-rate").textContent =
    `現在のレート：${rate.toFixed(3)}`;

  fetchNews();
})();
