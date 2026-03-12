import {
    HelpCircle,
    ChevronDown,
    LayoutDashboard,
    Package,
    ArrowLeftRight,
    Settings2,
    Mail,
    Wrench,
} from "lucide-react";
import { useState } from "react";

const SUPPORT_EMAIL = "simploucomvc@gmail.com";

interface AccordionItem {
    title: string;
    content: string;
}

interface AccordionSection {
    module: string;
    Icon: React.ElementType;
    items: AccordionItem[];
}

const helpSections: AccordionSection[] = [
    {
        module: "Dashboard",
        Icon: LayoutDashboard,
        items: [
            {
                title: "O que é o Dashboard?",
                content:
                    "O Dashboard é a página principal do Simplou. Nele você encontra um resumo do seu negócio: total de receitas, despesas, lucro estimado e gráficos de evolução financeira.",
            },
            {
                title: "Como interpretar os gráficos?",
                content:
                    "Os gráficos mostram a evolução financeira ao longo do tempo. A linha verde representa receitas e a vermelha despesas. Passe o mouse sobre os pontos para ver os valores detalhados.",
            },
        ],
    },
    {
        module: "Produtos e Serviços",
        Icon: Package,
        items: [
            {
                title: "Como cadastrar um produto ou serviço?",
                content:
                    "Acesse 'Produtos e Serviços' e clique em '+ Novo'. Selecione se é um Produto ou Serviço, preencha o nome, custo e preço de venda. O sistema calcula automaticamente o lucro estimado.",
            },
            {
                title: "O que é Preço Sugerido (markup 100%)?",
                content:
                    "O preço sugerido é calculado como: (Custo + Custos Fixos + Custos Variáveis Vinculados) × 2. Isso garante que você cubra todos os custos e ainda obtenha 100% de margem sobre o custo total.",
            },
            {
                title: "O que são Custos Fixos e Variáveis?",
                content:
                    "Custos Fixos são aplicados automaticamente em todos os produtos (ex: embalagem, energia). Custos Variáveis podem ser vinculados a produtos específicos (ex: taxa de marketplace).",
            },
            {
                title: "Qual a diferença entre Produto e Serviço?",
                content:
                    "Produtos são itens físicos que você fabrica ou revende. Serviços são trabalhos executados (ex: instalação, consultoria). A distinção ajuda a organizar melhor seu catálogo.",
            },
        ],
    },
    {
        module: "Operações (Transações)",
        Icon: ArrowLeftRight,
        items: [
            {
                title: "Como registrar uma transação?",
                content:
                    "Na tela de Operações, clique em '+ Nova transação'. Defina se é Receita ou Despesa, adicione descrição, valor e data. Você pode também vincular a um produto cadastrado.",
            },
            {
                title: "Posso anexar comprovantes?",
                content:
                    "Sim! Ao criar ou editar uma transação, você pode anexar até 3 arquivos (PDF ou imagem) como comprovantes da operação.",
            },
            {
                title: "Como exportar as transações?",
                content:
                    "Use os botões 'Exportar CSV' ou 'Gerar PDF' na tela de Operações para baixar suas transações. O CSV é ideal para importar em planilhas e o PDF para relatórios impressos.",
            },
            {
                title: "O que são transações recorrentes?",
                content:
                    "Transações recorrentes são lançamentos que se repetem mensalmente. Ao criar uma transação, ative a opção de recorrência e informe quantos meses repetir. O sistema cria automaticamente todos os lançamentos futuros.",
            },
        ],
    },
    {
        module: "Configurações",
        Icon: Settings2,
        items: [
            {
                title: "Como atualizar meu perfil?",
                content:
                    "Acesse Configurações > Perfil. Você pode alterar seu nome, telefone, foto de perfil (com ajuste de enquadramento circular) e os dados da sua empresa.",
            },
            {
                title: "Como ajustar a foto de perfil?",
                content:
                    "Clique na foto no menu da sidebar ou em Configurações. Selecione uma imagem, use o zoom e arraste para ajustar o enquadramento. O resultado será uma imagem circular.",
            },
        ],
    },
];

function AccordionItemComponent({ item }: { item: AccordionItem }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="border border-border rounded-lg overflow-hidden">
            <button
                className="w-full flex items-center justify-between px-4 py-3 text-left bg-card hover:bg-accent/50 transition-colors"
                onClick={() => setOpen((v) => !v)}
            >
                <span className="text-sm font-medium">{item.title}</span>
                <ChevronDown
                    size={16}
                    className={`text-muted-foreground transition-transform duration-200 shrink-0 ml-2 ${open ? "rotate-180" : ""
                        }`}
                />
            </button>
            {open && (
                <div className="px-4 py-3 bg-muted/40 border-t border-border">
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.content}</p>
                </div>
            )}
        </div>
    );
}

export default function HelpPage() {
    return (
        <div className="space-y-6 max-w-2xl">
            <h1 className="text-xl font-bold flex items-center gap-2">
                <HelpCircle size={20} /> Ajuda &amp; Documentação
            </h1>
            <p className="text-muted-foreground text-sm">
                Aprenda a usar cada módulo do Simplou. Clique em uma pergunta para ver a resposta.
            </p>

            <div className="space-y-6">
                {helpSections.map((section) => (
                    <div key={section.module} className="space-y-2">
                        <h2 className="text-base font-bold flex items-center gap-2">
                            <section.Icon size={16} className="text-brand-hover" />
                            {section.module}
                        </h2>
                        <div className="space-y-2">
                            {section.items.map((item) => (
                                <AccordionItemComponent key={item.title} item={item} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer card */}
            <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-3">
                <div className="flex justify-center">
                    <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center">
                        <Mail size={18} className="text-brand-hover" />
                    </div>
                </div>
                <p className="font-semibold">Ainda com dúvidas?</p>
                <p className="text-sm text-muted-foreground">
                    Entre em contato com nossa equipe de suporte.
                </p>
                <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="inline-flex items-center gap-1.5 mt-1 text-sm text-brand-hover font-medium hover:underline"
                >
                    <Mail size={14} />
                    {SUPPORT_EMAIL}
                </a>
            </div>
        </div>
    );
}
