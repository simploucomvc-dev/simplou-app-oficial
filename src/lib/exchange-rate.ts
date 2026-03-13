export async function getUSDRate(): Promise<number> {
  const res = await fetch("https://economia.awesomeapi.com.br/last/USD-BRL");
  if (!res.ok) throw new Error("API error");
  const data = await res.json();
  return parseFloat(data.USDBRL.bid);
}
