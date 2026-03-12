# Exemplo de Uso: ClickUpDatePicker (Modal de OS)

Aqui está o código exato de como o `ClickUpDatePicker` foi implementado no formulário de Ordem de Serviço, onde ele funciona apenas como "Data de Vencimento" (ou prazo de entrega), sem a barra lateral e sem o campo de "Data Inicial".

Ele é usado em conjunto com o componente `Popover` do Shadnc/ui.

## Código:

```tsx
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import ClickUpDatePicker from '@/components/ui/clickup-datepicker';
import { Calendar } from 'lucide-react';

// ... 

<Popover>
    <PopoverTrigger asChild>
        <button
            type="button"
            className={`w-full flex items-center justify-between text-sm bg-gray-50 border rounded-xl px-4 py-3 outline-none transition-all ${errors.prazo ? 'border-red-500' : 'border-gray-200 hover:border-orange-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'}`}
        >
            <span className={prazo ? "text-gray-900" : "text-gray-400"}>
                {prazo ? new Date(prazo + 'T12:00:00').toLocaleDateString('pt-BR') : "Selecione uma data..."}
            </span>
            <Calendar className="w-4 h-4 text-gray-500" />
        </button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
        <ClickUpDatePicker
            hideSidebar
            hideStartDate
            dueDate={prazo ? new Date(prazo + 'T12:00:00') : undefined}
            onDueDateChange={(date) => {
                if (date) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    setPrazo(`${year}-${month}-${day}`);
                } else {
                    setPrazo('');
                }
                setErrors(prev => ({ ...prev, prazo: undefined }));
            }}
        />
    </PopoverContent>
</Popover>
```

### Explicação das props usadas:

- `hideSidebar`: Remove a barra lateral esquerda responsável pelos atalhos rápidos e recorrência, pois no formulário precisamos apenas do calendário.
- `hideStartDate`: Remove a caixa de input "Data Inicial" no cabeçalho do `ClickUpDatePicker`, pois estamos selecionando apenas a data de entrega final.
- `dueDate`: É a data escolhida. O script de `+ 'T12:00:00'` é usado no frontend para garantir que a data selecionada renderize no mesmo dia por causa do fuso horário brasileiro em certos navegadores.
- `onDueDateChange`: Ação que é disparada ao clicar em um dia, convertendo-o de volta ao formato `YYYY-MM-DD` esperado pelo banco de dados ou estado (`prazo`).
