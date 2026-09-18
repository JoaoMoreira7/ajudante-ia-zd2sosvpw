// Tipos completos das entidades do Ajudante IA

export interface UserProfile {
  id: string
  email: string
  name: string
  avatar?: string
  created?: string
  updated?: string
}

export interface Cliente {
  id: string
  owner_id: string
  nome: string
  telefone?: string
  whatsapp?: string
  endereco?: string
  observacoes?: string
  created?: string
  updated?: string
}

export interface ObraEtapa {
  nome: string
  concluido?: boolean
  concluida?: boolean
  progresso?: number
}

export interface Obra {
  id: string
  owner_id: string
  cliente_id?: string
  titulo: string
  endereco?: string
  data_inicio?: string
  previsao_termino?: string
  valor_contratado?: number
  valor_recebido?: number
  valor_pendente?: number
  status: 'em_andamento' | 'orcada' | 'concluida' | 'parada'
  etapas?: ObraEtapa[]
  created?: string
  updated?: string
}

export interface OrcamentoItem {
  descricao: string
  quantidade: number
  unidade: string
  preco_unitario: number
  total: number
  categoria?: string
}

export interface OrcamentoParcela {
  numero: number
  valor: number
  vencimento: string
  status: 'pendente' | 'pago'
}

export interface Orcamento {
  id: string
  owner_id: string
  cliente_id?: string
  obra_id?: string
  titulo: string
  itens: OrcamentoItem[]
  subtotal: number
  desconto: number
  total: number
  status:
    | 'criado'
    | 'enviado'
    | 'aguardando_resposta'
    | 'aprovado'
    | 'recusado'
    | 'em_execucao'
    | 'concluido'
  sinal?: number
  parcelas?: OrcamentoParcela[]
  observacoes?: string
  created?: string
  updated?: string
}

export interface FinanceiroLancamento {
  id: string
  owner_id: string
  obra_id?: string
  tipo: 'entrada' | 'saida'
  categoria:
    | 'pagamento'
    | 'sinal'
    | 'parcela'
    | 'recebimento'
    | 'cimento'
    | 'areia'
    | 'bloco'
    | 'combustivel'
    | 'ferramenta'
    | 'alimentacao'
    | 'ajudante'
    | 'transporte'
    | 'outros'
  descricao: string
  valor: number
  data: string
  status: 'pendente' | 'pago' | 'vencido'
  created?: string
  updated?: string
}

export interface MaterialEstoque {
  id: string
  owner_id: string
  nome: string
  quantidade: number
  unidade: 'saco' | 'un' | 'kg' | 'L' | 'm2'
  preco?: number
  fornecedor?: string
  estoque_minimo?: number
  created?: string
  updated?: string
}

export interface DiarioObra {
  id: string
  owner_id: string
  obra_id: string
  data: string
  servico: string
  quantidade?: number
  material?: string
  observacoes?: string
  created?: string
  updated?: string
}

export interface DocumentoObra {
  id: string
  owner_id: string
  obra_id?: string
  cliente_id?: string
  tipo:
    | 'orcamento'
    | 'recibo'
    | 'ordem_servico'
    | 'relatorio'
    | 'lista_materiais'
    | 'resumo_financeiro'
    | 'foto'
    | 'outro'
  arquivo?: string
  descricao?: string
  created?: string
  updated?: string
}

export interface ConfiguracoesApp {
  id?: string
  owner_id?: string
  modo: 'simples' | 'profissional' | 'economico'
  fonte_tamanho: 'p' | 'm' | 'g'
  alto_contraste: boolean
  voz_respostas: boolean
  som_ativo?: boolean
  tema?: 'claro' | 'escuro'
  nome_profissional?: string
  nome_empresa?: string
  empresa?: string
  telefone?: string
  created?: string
  updated?: string
}

export interface SyncQueueItem {
  id: string
  owner_id: string
  entidade:
    | 'clientes'
    | 'obras'
    | 'orcamentos'
    | 'financeiro'
    | 'materiais_estoque'
    | 'diario_obra'
    | 'configuracoes'
  entidade_id: string
  operacao: 'create' | 'update' | 'delete'
  payload: Record<string, unknown>
  status: 'pendente' | 'processado' | 'erro'
  created?: string
}

export interface ReversibleAction {
  id: string
  descricao: string
  timestamp: number
  desfazer: () => Promise<void>
}
