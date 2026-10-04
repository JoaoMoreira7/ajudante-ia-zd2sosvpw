// Tipos completos das entidades do Ajudante IA

export type UserRole = 'admin' | 'dono' | 'operador'

export type StatusConta =
  | 'ativo'
  | 'trial'
  | 'atrasado'
  | 'bloqueado_manual'
  | 'bloqueado_inadimplencia'
  | 'cancelado'

export type PlanoTipo = 'essencial' | 'profissional' | 'empresa'
export type CicloTipo = 'mensal' | 'trimestral' | 'semestral' | 'anual'
export type OrigemVenda = 'direta' | 'internet'
export type FormaPagamentoVenda =
  | 'pix'
  | 'dinheiro'
  | 'boleto'
  | 'transferencia'
  | 'cartao_credito'
  | 'outro'

export interface UserProfile {
  id: string
  email: string
  name: string
  perfil?: UserRole
  status_conta?: StatusConta
  motivo_bloqueio?: string
  bloqueado_em?: string
  bloqueado_por_nome?: string
  modulos_liberados?: Record<string, boolean>
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
  cliente_id?: string
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
  recorrente?: boolean
  dia_vencimento?: number
  parcela_atual?: number
  total_parcelas?: number
  grupo_parcelamento_id?: string
  credor_nome?: string // Terceiro a quem se deve (ex: "Zé", "Depósito Alvorada")
  criado_por_nome?: string
  criado_por_id?: string
  created?: string
  updated?: string
}

export interface TarefaObra {
  id: string
  owner_id: string
  obra_id?: string
  titulo: string
  descricao?: string
  prazo?: string // yyyy-mm-dd
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
  status: 'pendente' | 'concluida' | 'cancelada'
  origem_fala?: string
  concluida_em?: string
  criado_por_nome?: string
  criado_por_id?: string
  created?: string
  updated?: string
}

export interface LembreteObra {
  id: string
  owner_id: string
  titulo: string
  horario?: string // ex: "06:00"
  frequencia: 'uma_vez' | 'diaria' | 'semanal' | 'mensal'
  dia_semana?: number // 0-6
  dia_mes?: number // 1-31
  proximo_disparo?: string // ISO
  ativo: boolean
  ultimo_disparo?: string
  created?: string
  updated?: string
}

export interface TetoCategoriaConfig {
  categoria: string
  limiteMensal: number
  mesAnoReferencia?: string // "yyyy-mm"
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
  criado_por_nome?: string
  criado_por_id?: string
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
  criado_por_nome?: string
  criado_por_id?: string
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
  etapa_index?: number
  etapa_nome?: string
  data_foto?: string
  geolocalizacao?: string
  criado_por_nome?: string
  criado_por_id?: string
  created?: string
  updated?: string
}

export interface ConfiguracoesApp {
  id?: string
  owner_id?: string
  modo: 'simples' | 'profissional' | 'economico'
  perfil?: UserRole
  fonte_tamanho: 'p' | 'm' | 'g'
  alto_contraste: boolean
  voz_respostas: boolean
  som_ativo?: boolean
  tema?: 'claro' | 'escuro'
  nome_profissional?: string
  nome_empresa?: string
  empresa?: string
  telefone?: string
  apelido_usuario?: string
  tom_conversa?: 'padrao' | 'curto' | 'sem_emoji'
  notas_contexto?: Array<{ id: string; texto: string; data: string }>
  teto_categorias?: Record<string, number> // { material: 800, cimento: 1200, ... }
  resumo_manha_hora?: number // padrão: 6
  ultimo_resumo_manha_data?: string // yyyy-mm-dd do último disparo exibido
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
    | 'documentos'
    | 'configuracoes'
    | 'tarefas_obra'
    | 'lembretes_obra'
    | 'equipe_membros'
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

export interface Assinatura {
  id: string
  user_id: string
  plano: PlanoTipo
  ciclo: CicloTipo
  valor_recorrente: number
  status: StatusConta
  origem: OrigemVenda
  data_inicio: string
  proximo_vencimento?: string
  bloqueio_manual?: boolean
  motivo_bloqueio?: string
  bloqueado_em?: string
  bloqueado_por_id?: string
  bloqueado_por_nome?: string
  modulos_liberados?: Record<string, boolean>
  observacoes?: string
  created?: string
  updated?: string
  expand?: {
    user_id?: UserProfile
  }
}

export interface FaturaVenda {
  id: string
  user_id: string
  assinatura_id?: string
  descricao: string
  valor: number
  status: 'pago' | 'pendente' | 'atrasado' | 'cancelado'
  origem: OrigemVenda
  forma_pagamento: FormaPagamentoVenda
  data_vencimento: string
  data_pagamento?: string
  comprovante_ref?: string
  observacoes?: string
  created?: string
  updated?: string
  expand?: {
    user_id?: UserProfile
  }
}

export interface AuditoriaAdmin {
  id: string
  admin_id: string
  admin_nome: string
  alvo_user_id: string
  alvo_user_nome?: string
  alvo_user_email?: string
  acao: 'bloquear' | 'liberar' | 'venda_direta' | 'liberar_modulos' | 'atualizar_plano'
  motivo?: string
  detalhes?: Record<string, unknown>
  ip?: string
  created?: string
  updated?: string
}

export interface NotificacaoSistema {
  id: string
  user_id: string
  titulo: string
  mensagem: string
  tipo: 'bloqueio' | 'liberacao' | 'venda_ativada' | 'fatura_vencida' | 'aviso_geral'
  lida: boolean
  created?: string
  updated?: string
}

export interface LimitesPlano {
  maxClientes: number // -1 = ilimitado
  maxObrasSimultaneas: number // 2 no essencial, 10 ou ilimitado nos superiores (-1)
  maxOrcamentosMes: number // -1 = ilimitado
  maxMinutosAudioMes: number // 60 no essencial, 300 no profissional, -1 no empresa (ilimitado)
  permitePdfDocumentos: boolean // recibos, OS, orçamentos timbrados
  permiteDiarioVoz: boolean
  permiteFotosObra: boolean
  permiteEstoqueCompras: boolean
  permiteRelatorioWhatsApp: boolean
  permiteAlertasPrazos: boolean
  maxUsuariosEquipe: number // 1 no essencial/profissional, até 5 no empresa
  relatoriosAvancados: boolean
  suportePrioritario: boolean
  modulosSobMedida: boolean
}

export interface CatalogoPlano {
  id: PlanoTipo
  nome: string
  badge?: string
  descricao: string
  precoMensal: number
  precoAnual: number
  limites: LimitesPlano
  recursos: string[]
  destaque?: boolean
}

export interface EquipeMembro {
  id: string
  owner_id: string
  operador_user_id?: string
  nome: string
  email?: string
  telefone?: string
  cargo?: 'operador' | 'encarregado' | 'pedreiro' | 'ajudante'
  status?: 'ativo' | 'convidado' | 'inativo'
  obras_permitidas?: string[]
  created?: string
  updated?: string
}
