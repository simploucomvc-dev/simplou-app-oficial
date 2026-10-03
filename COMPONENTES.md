# Índice de Componentes — Simplou App

Todos os componentes disponíveis em `src/components/ui/` e `src/components/`. Consulte este arquivo antes de criar qualquer componente novo — o que você precisa provavelmente já existe.

---

## Regra geral

- **Desktop:** Dialog, Popover, Command, Sheet, Drawer
- **Mobile:** BottomSheet (vaul), Dialog (funciona nos dois)
- Seletores com lista longa → **Popover + Command** no desktop, **BottomSheet** no mobile
- Confirmação de exclusão → sempre **SafeDeleteDialog**
- Toasts → sempre `toast` de `'sonner'`, nunca `useToast`

---

## shadcn/ui (base)

### Formulários e Inputs

| Componente | Uso | Desktop | Mobile |
|---|---|---|---|
| `Input` | Campo de texto simples | ✅ | ✅ |
| `Textarea` | Área de texto multilinha | ✅ | ✅ |
| `ExpandableInput` | Textarea com botão de expandir em modal — para descrições longas | ✅ | ✅ |
| `Label` | Label de formulário | ✅ | ✅ |
| `Select` | Dropdown de seleção simples | ✅ | ✅ |
| `Checkbox` | Caixa de seleção. Usar `bg-success border-success` para verde | ✅ | ✅ |
| `RadioGroup` | Grupo de opções exclusivas | ✅ | ✅ |
| `Switch` | Toggle on/off | ✅ | ✅ |
| `Slider` | Controle deslizante numérico | ✅ | ✅ |
| `InputOTP` + `InputOTPGroup` + `InputOTPSlot` | Input de código de 6 dígitos (verificação de email) | ✅ | ✅ |
| `Calendar` | Seletor de data visual | ✅ | ✅ |
| `Form` + hooks | Formulário com validação via react-hook-form | ✅ | ✅ |

### Botões e Ações

| Componente | Uso | Desktop | Mobile |
|---|---|---|---|
| `Button` | Botão padrão. Variantes: `default`, `outline`, `ghost`, `destructive`, `link` | ✅ | ✅ |
| `Toggle` | Botão com estado ativo/inativo | ✅ | ✅ |
| `ToggleGroup` | Grupo de toggles exclusivos (ex: tipo de visualização) | ✅ | ✅ |

### Overlays e Modais

| Componente | Uso | Desktop | Mobile |
|---|---|---|---|
| `Dialog` | Modal centralizado. Usar para formulários e detalhes | ✅ | ✅ |
| `AlertDialog` | Modal de confirmação bloqueante. Usar via `SafeDeleteDialog` para exclusões | ✅ | ✅ |
| `Sheet` | Painel lateral que desliza (esquerda/direita/baixo) | ✅ | ✅ |
| `Drawer` | Painel inferior (Radix). Base do BottomSheet | ✅ | ✅ |
| `BottomSheet` | **Wrapper customizado do Drawer para mobile.** Tem título, busca opcional e footer. Para seletores e listas em mobile | ❌ | ✅ |
| `Popover` | Flutuante ancorado a um elemento. Para seletores desktop | ✅ | ❌ |
| `HoverCard` | Card que aparece ao hover | ✅ | ❌ |
| `Tooltip` | Dica de texto ao hover | ✅ | ❌ |

### Seleção com busca

| Componente | Uso | Desktop | Mobile |
|---|---|---|---|
| `Command` + `CommandInput` + `CommandList` + `CommandItem` | Lista filtrável com busca. Usar dentro de `Popover` no desktop | ✅ | ❌ |
| `Popover` + `Command` | Combo padrão para selects com busca no desktop | ✅ | ❌ |
| `BottomSheet` + lista filtrável | Equivalente mobile do Popover+Command | ❌ | ✅ |

### Navegação

| Componente | Uso | Desktop | Mobile |
|---|---|---|---|
| `Tabs` + `TabsList` + `TabsTrigger` + `TabsContent` | Abas de navegação interna | ✅ | ✅ |
| `Breadcrumb` | Trilha de navegação | ✅ | ❌ |
| `NavigationMenu` | Menu de navegação horizontal | ✅ | ❌ |
| `Menubar` | Barra de menu estilo desktop | ✅ | ❌ |
| `Pagination` | Paginação de listas | ✅ | ✅ |

### Menus

| Componente | Uso | Desktop | Mobile |
|---|---|---|---|
| `DropdownMenu` | Menu suspenso ao clicar. Para ações contextuais | ✅ | ✅ |
| `ContextMenu` | Menu ao clicar com botão direito | ✅ | ❌ |

### Layout e Estrutura

| Componente | Uso | Desktop | Mobile |
|---|---|---|---|
| `Card` + `CardHeader` + `CardContent` + `CardFooter` | Container com borda e sombra leve | ✅ | ✅ |
| `Separator` | Linha divisória horizontal ou vertical | ✅ | ✅ |
| `ScrollArea` | Área com scrollbar customizada | ✅ | ✅ |
| `Collapsible` | Seção que expande/colapsa | ✅ | ✅ |
| `Accordion` | Grupo de colapsáveis exclusivos | ✅ | ✅ |
| `Resizable` | Painéis redimensionáveis por drag | ✅ | ❌ |
| `AspectRatio` | Wrapper que mantém proporção (ex: 16/9) | ✅ | ✅ |
| `Sidebar` | Sidebar completa do shadcn/ui (não usada — app tem sidebar própria) | — | — |

### Exibição de dados

| Componente | Uso | Desktop | Mobile |
|---|---|---|---|
| `Table` + `TableHeader` + `TableBody` + `TableRow` + `TableCell` | Tabela de dados | ✅ | ❌ |
| `Badge` | Etiqueta de status ou categoria. Variantes: `default`, `secondary`, `destructive`, `outline` | ✅ | ✅ |
| `Avatar` + `AvatarImage` + `AvatarFallback` | Foto de perfil com fallback em iniciais | ✅ | ✅ |
| `Skeleton` | Placeholder de loading (forma cinza animada) | ✅ | ✅ |
| `Progress` | Barra de progresso | ✅ | ✅ |
| `Chart` | Gráficos via Recharts. Wrapper do shadcn/ui | ✅ | ✅ |
| `Carousel` | Carrossel de itens | ✅ | ✅ |

### Feedback

| Componente | Uso | Desktop | Mobile |
|---|---|---|---|
| `Sonner` (provider) + `toast` de `'sonner'` | **Sistema de toasts. Sempre usar este.** `toast.success()`, `toast.error()` | ✅ | ✅ |
| `Alert` + `AlertDescription` | Mensagem de alerta inline (não toast) | ✅ | ✅ |

---

## Componentes customizados (src/components/ui/)

### `BottomSheet`
```tsx
import { BottomSheet } from "@/components/ui/bottom-sheet"

<BottomSheet
  open={open}
  onOpenChange={setOpen}
  title="Selecionar produto"
  searchValue={search}
  onSearchChange={setSearch}
  searchPlaceholder="Buscar..."
  footer={<Button>Confirmar</Button>}
>
  {/* lista de itens */}
</BottomSheet>
```
**Somente mobile.** Painel que sobe de baixo com título, campo de busca opcional e área de footer. Usa vaul internamente. No desktop, usar `Popover + Command`.

---

### `ExpandableInput`
```tsx
import { ExpandableInput } from "@/components/ui/expandable-input"

<ExpandableInput
  placeholder="Descrição..."
  modalTitle="Editar descrição"
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```
Textarea com ícone de expandir no canto. Ao clicar, abre um modal com área de texto maior. Útil para campos de descrição ou observações. Desktop e mobile.

---

### `SafeDeleteDialog`
```tsx
import { SafeDeleteDialog } from "@/components/ui/safe-delete-dialog"

<SafeDeleteDialog
  open={open}
  onOpenChange={setOpen}
  onConfirm={handleDelete}
  title="Excluir produto"
  itemName={produto.name}
/>
```
**Sempre usar para confirmações de exclusão.** Exibe o nome do item que será excluído e botão vermelho de confirmação. Não criar AlertDialogs de exclusão avulsos.

---

### `clickup-datepicker`
Datepicker customizado no estilo ClickUp. Para campos de data em formulários.

---

## Componentes de app (src/components/)

> Estes são específicos do `simplou-app-oficial`. Não copiar para o admin dashboard.

| Componente | Descrição |
|---|---|
| `AppLayout` | Layout base com sidebar fixa, topbar e área de conteúdo. Usado em todas as rotas protegidas via `ProtectedRoute` |
| `NavLink` | Link da sidebar com estado ativo baseado na rota atual |
| `ProductModal` | Modal de criação e edição de produto. Inclui icon picker no header via Popover |
| `ProductDetailModal` | Detalhe de produto: BottomSheet no mobile, modal no desktop |
| `TransactionDetailModal` | Detalhe de transação financeira |
| `FixedCostsModal` | Gestão de custos fixos vinculados ao usuário |
| `ChangelogModal` | Modal de patch notes (novidades do sistema). Abre automaticamente para usuários que não viram a versão mais recente |
| `TrialExpiredScreen` | Tela bloqueante full-screen para assinaturas inativas (`canceled`, `past_due`, etc.) |
| `AvatarCropModal` | Modal de crop de foto de perfil com canvas |
| `OnboardingButton` | Botão de fluxo de onboarding |
| `QuickActionButton` | Botão de ação rápida para criar transações/produtos |

---

## Tokens de cor (Tailwind)

Usar sempre os tokens do design system, nunca cores hardcoded:

| Token | Uso |
|---|---|
| `bg-brand-primary` / `text-brand-primary` | Verde principal (botões primários, links ativos) |
| `bg-brand-hover` / `hover:bg-brand-hover` | Verde escuro (hover de botões) |
| `bg-brand-light` | Verde bem claro (backgrounds sutis) |
| `bg-success` / `text-success` | Verde de sucesso (checkboxes, status ativo) |
| `text-muted-foreground` | Cinza para textos secundários |
| `bg-destructive` | Vermelho para ações destrutivas |
| `border-border` | Borda padrão |
| `bg-background` | Background da página |
| `bg-card` | Background de cards |
