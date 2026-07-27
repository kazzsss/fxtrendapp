/* ============================
   グローバル変数
============================ */
let candles = [];
let lastRate = 150.000;  // 初期値（安全対策）

/* ============================
   レート取得（APIキー不要）
============================ */
async function fetchRate() {
  try {
    const url =
      "https://api.fxratesapi.com/latest?base=USD&symbols=JPY&nocache=" + Date.now();

    const res = await fetch(url);

    if (!res.ok) {
      console.warn("APIエラー発生、前回レートを使用:", res.status);
      return lastRate;
    }

    const data = await res.json();

    if (!data?.rates?.JPY) {
      console.warn("JPYが取得できず、前回レートを使用");
      return lastRate;
    }

    lastRate = data.rates.JPY;
    return lastRate;

  } catch (error) {
    console.error("fetchRate エラー:", error);
    return lastRate;
  }
}

/* ============================
   ローソク足更新（5秒足）
============================ */
function updateCandles(rate) {
  const now = Date.now();

  candles.push({
    time: now,
    close: rate
  });

  if (candles.length > 300) candles.shift();
}

/* ============================
   トレンド方向判定（強化版）
============================ */
function getTrendDirection(candles) {
  if (candles.length < 20) return "range";

  const last = candles[candles.length - 1].close;

  // 短期（直近10本）
  const shortStart = candles[candles.length - 10].close;
  const shortDiff = last - shortStart;

  // 中期（直近50本）
  const midStart = candles[candles.length - 50]?.close ?? shortStart;
  const midDiff = last - midStart;

  // ロング判定（短期・中期とも上昇）
  if (shortDiff > 0.05 && midDiff > 0.1) return "long";

  // ショート判定（短期・中期とも下降）
  if (shortDiff < -0.05 && midDiff < -0.1) return "short";

  // レンジ判定（変動幅が小さい）
  const rangeWidth = Math.abs(shortDiff);
  if (rangeWidth < 0.03) return "range";

  return "range";
}

/* ============================
   強度計算（方向性を含む）
============================ */
function calcStrength(candles) {
  if (candles.length < 20) return 0;

  const first = candles[candles.length - 20].close;
  const last = candles[candles.length - 1].close;

  return (last - first).toFixed(3);
}

/* ============================
   逆行警告（標準偏差ベース）
============================ */
function getReversalWarning(candles) {
  if (candles.length < 20) return null;

  const closes = candles.slice(-20).map(c => c.close);
  const mean = closes.reduce((a,b)=>a+b,0) / closes.length;
  const variance = closes.reduce((a,b)=>a + Math.pow(b-mean,2), 0) / closes.length;
  const std = Math.sqrt(variance); // 標準偏差（ボラ）

  const last = candles[candles.length - 1].close;

  const upper = mean + std * 2;
  const lower = mean - std * 2;

  if (last > upper) return "long_reversal";
  if (last < lower) return "short_reversal";

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
    status.direction === "
