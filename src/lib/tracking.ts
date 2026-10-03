declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const ADS_ID = "AW-11345739897";
const SIGNUP_LABEL = "HjhHCKzXiY4dEPmAiaIq";
const SUBSCRIPTION_LABEL = "bpcfCK6kjY4dEPmAiaIq";
const SEND_TIMEOUT_MS = 1000;

// Resolve quando o Google confirma o envio (ou após o timeout), pra dar tempo
// do hit sair antes de um redirecionamento
function sendConversion(params: Record<string, unknown>): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window.gtag !== "function") return resolve();
    const timeout = setTimeout(resolve, SEND_TIMEOUT_MS);
    window.gtag("event", "conversion", {
      ...params,
      event_callback: () => {
        clearTimeout(timeout);
        resolve();
      },
    });
  });
}

export function trackSignup(): Promise<void> {
  return sendConversion({ send_to: `${ADS_ID}/${SIGNUP_LABEL}` });
}

export function trackSubscription(checkoutSessionId: string): Promise<void> {
  // Evita disparo duplicado se o usuário recarregar a página
  const key = `conv_sub_${checkoutSessionId}`;
  try {
    if (localStorage.getItem(key)) return Promise.resolve();
    localStorage.setItem(key, "1");
  } catch {
    // sem localStorage: o transaction_id ainda deduplica no Google Ads
  }
  return sendConversion({
    send_to: `${ADS_ID}/${SUBSCRIPTION_LABEL}`,
    transaction_id: checkoutSessionId,
  });
}
