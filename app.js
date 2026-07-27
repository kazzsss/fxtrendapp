/* ============================
   グローバル変数
============================ */
let candles = [];

/* ============================
   レート取得（USDJPY）
============================ */
async function fetchRate() {
  const url = "https://api.exchangerate-api.com/v4/latest/USD";
  const res = await fetch(url);
  const data = await res.json();
  return data.rates.JPY;
}

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
   現在のレート表示
============================ */
async function fetchCurrentRate() {
    try {
        const url = "https://open.er-api.com/v6/latest/USD";
        const response = await fetch(url);
        const data = await response.json();   // ← これが必須！

        const rate = data.rates.JPY.toFixed(3);
        document.getElementById("current-rate").textContent =
            `現在のレート：${rate}`;
    } catch (error) {
        document.getElementById("current-rate").textContent =
            "現在のレート：取得失敗";
        console.error(error);
    }
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

  fetchCurrentRate();   
}, 5000);

/* ============================
   初期化
============================ */
(async () => {
  const rate = await fetchRate();
  updateCandles(rate);
  updateUI(getTrendStatus(candles));
  fetchCurrentRate();
  fetchNews();
})();
