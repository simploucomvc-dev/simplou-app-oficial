import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const STORAGE_KEY = "simplou_onboarding_completed";

const icons = {
  welcome: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="onboarding-icon"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  income: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="onboarding-icon"><path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></svg>',
  expense: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="onboarding-icon"><path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/></svg>',
  profit: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="onboarding-icon"><path d="M12 2v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="M22 12h-4"/><path d="m19.07 19.07-2.83-2.83"/><path d="M12 22v-4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M2 12h4"/><path d="m7.76 7.76-2.83-2.83"/></svg>',
  chart: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="onboarding-icon"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>',
  barChart: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="onboarding-icon"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>',
  package: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="onboarding-icon"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.27 6.96 8.73 5.05 8.73-5.05"/><path d="M12 22.08V12"/></svg>',
  finance: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="onboarding-icon"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>',
  zap: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="onboarding-icon"><path d="M4 14.71 13.43 3.51a1 1 0 0 1 1.7.9l-2.51 8.3h7.4l-9.43 11.2a1 1 0 0 1-1.7-.9l2.51-8.3z"/></svg>',
  success: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="onboarding-icon"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
};

const tourSteps = [
  {
    element: "#dashboard-header",
    popover: {
      title: `${icons.welcome} Bem-vindo ao Simplou!`,
      description:
        "Vamos fazer um tour rápido para você conhecer as principais funcionalidades do app.",
      side: "bottom" as const,
      align: "start" as const,
    },
  },
  {
    element: "#card-receita",
    popover: {
      title: `${icons.income} Receita Total`,
      description:
        "Total de todas as suas ENTRADAS de dinheiro. Apenas valores já recebidos são contabilizados.",
      side: "bottom" as const,
      align: "center" as const,
    },
  },
  {
    element: "#card-despesa",
    popover: {
      title: `${icons.expense} Despesas`,
      description: "Total de todas as SAÍDAS de dinheiro do seu negócio.",
      side: "bottom" as const,
      align: "center" as const,
    },
  },
  {
    element: "#card-lucro",
    popover: {
      title: `${icons.profit} Lucro Líquido`,
      description:
        "A diferença entre suas receitas e despesas. Este é o dinheiro que realmente sobrou!",
      side: "bottom" as const,
      align: "center" as const,
    },
  },
  {
    element: "#grafico-evolucao",
    popover: {
      title: `${icons.chart} Evolução Mensal`,
      description:
        "Acompanhe o crescimento do seu negócio mês a mês. A linha mostra como suas finanças evoluem ao longo do ano.",
      side: "top" as const,
      align: "center" as const,
    },
  },
  {
    element: "#grafico-composicao",
    popover: {
      title: `${icons.barChart} Receitas vs Despesas`,
      description:
        "Visualize a proporção entre o que entra e o que sai do seu negócio.",
      side: "top" as const,
      align: "center" as const,
    },
  },
  {
    element: "#nav-produtos",
    popover: {
      title: `${icons.package} Produtos e Serviços`,
      description:
        "Cadastre seus produtos, defina preços e calcule automaticamente o lucro de cada item.",
      side: "right" as const,
      align: "start" as const,
    },
  },
  {
    element: "#nav-financeiro",
    popover: {
      title: `${icons.finance} Financeiro`,
      description:
        "Registre todas as suas entradas e saídas de dinheiro. Aqui você mantém o controle do fluxo de caixa.",
      side: "right" as const,
      align: "start" as const,
    },
  },
  {
    element: "#quick-action-button",
    popover: {
      title: `${icons.zap} Atalho Rápido`,
      description:
        "Este botão está sempre disponível em todas as telas. Clique aqui para registrar uma nova operação rapidamente!",
      side: "left" as const,
      align: "center" as const,
    },
  },
  {
    popover: {
      title: `${icons.success} Tudo pronto!`,
      description:
        "Agora você já conhece as principais funcionalidades do Simplou. Comece organizando suas finanças! Se precisar rever este tour, clique no ícone de capelo (🎓) no canto superior direito.",
    },
  },
];

export function createOnboardingTour(onComplete?: () => void) {
  return driver({
    showProgress: true,
    steps: tourSteps,
    popoverClass: "simplou-tour-popover",
    nextBtnText: "Próximo →",
    prevBtnText: "← Anterior",
    doneBtnText: "Finalizar ✓",
    onDestroyed: () => {
      localStorage.setItem(STORAGE_KEY, "true");
      if (onComplete) onComplete();
    },
  });
}

export function isFirstTimeUser(): boolean {
  return !localStorage.getItem(STORAGE_KEY);
}

export function startOnboarding(onComplete?: () => void) {
  const tour = createOnboardingTour(onComplete);
  tour.drive();
}

export function resetOnboarding() {
  localStorage.removeItem(STORAGE_KEY);
}
