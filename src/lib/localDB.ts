/**
 * BANCO LOCAL-FIRST (INDEXEDDB COM FALLBACK EM MEMÓRIA/LOCALSTORAGE)
 *
 * Princípio do Ajudante IA:
 * 1. Todos os dados vivem no aparelho primeiro.
 * 2. Funciona 100% offline para consulta, adição, edição, cálculo.
 * 3. Fila de mutações assíncronas (SyncQueue) para enviar ao backend quando online.
 * 4. Carrega seeds brasileiros padrão no primeiro acesso se o banco estiver vazio.
 */

import {
  Cliente,
  Obra,
  Orcamento,
  FinanceiroLancamento,
  MaterialEstoque,
  DiarioObra,
  ConfiguracoesApp,
  SyncQueueItem,
} from '@/types/database'

const DB_NAME = 'ajudante_ia_local_v1'
const DB_VERSION = 2

export interface DBStores {
  clientes: Cliente
  obras: Obra
  orcamentos: Orcamento
  financeiro: FinanceiroLancamento
  materiais_estoque: MaterialEstoque
  diario_obra: DiarioObra
  configuracoes: ConfiguracoesApp
  sync_queue: SyncQueueItem
}

export type StoreName = keyof DBStores

class LocalDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null
  private memoryFallback: Map<string, Map<string, unknown>> = new Map()
  private isIndexedDBAvailable: boolean = typeof indexedDB !== 'undefined'

  constructor() {
    if (!this.isIndexedDBAvailable) {
      this.initMemoryFallback()
    }
  }

  private initMemoryFallback() {
    const stores: StoreName[] = [
      'clientes',
      'obras',
      'orcamentos',
      'financeiro',
      'materiais_estoque',
      'diario_obra',
      'configuracoes',
      'sync_queue',
    ]
    stores.forEach((st) => {
      this.memoryFallback.set(st, new Map())
    })
  }

  private getDB(): Promise<IDBDatabase> {
    if (!this.isIndexedDBAvailable) {
      return Promise.reject(new Error('IndexedDB indisponível'))
    }
    if (this.dbPromise) return this.dbPromise

    this.dbPromise = new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION)
        req.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result
          const storeNames: StoreName[] = [
            'clientes',
            'obras',
            'orcamentos',
            'financeiro',
            'materiais_estoque',
            'diario_obra',
            'configuracoes',
            'sync_queue',
          ]
          storeNames.forEach((name) => {
            if (!db.objectStoreNames.contains(name)) {
              db.createObjectStore(name, { keyPath: 'id' })
            }
          })
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => {
          this.isIndexedDBAvailable = false
          this.initMemoryFallback()
          reject(req.error)
        }
      } catch (err) {
        this.isIndexedDBAvailable = false
        this.initMemoryFallback()
        reject(err)
      }
    })

    return this.dbPromise
  }

  public async getAll<T extends StoreName>(storeName: T): Promise<DBStores[T][]> {
    if (!this.isIndexedDBAvailable) {
      const map = this.memoryFallback.get(storeName) || new Map()
      return Array.from(map.values()) as DBStores[T][]
    }
    try {
      const db = await this.getDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly')
        const store = tx.objectStore(storeName)
        const req = store.getAll()
        req.onsuccess = () => resolve((req.result || []) as DBStores[T][])
        req.onerror = () => reject(req.error)
      })
    } catch {
      const map = this.memoryFallback.get(storeName) || new Map()
      return Array.from(map.values()) as DBStores[T][]
    }
  }

  public async getById<T extends StoreName>(storeName: T, id: string): Promise<DBStores[T] | null> {
    if (!this.isIndexedDBAvailable) {
      const map = this.memoryFallback.get(storeName)
      return (map?.get(id) as DBStores[T]) || null
    }
    try {
      const db = await this.getDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly')
        const store = tx.objectStore(storeName)
        const req = store.get(id)
        req.onsuccess = () => resolve((req.result as DBStores[T]) || null)
        req.onerror = () => reject(req.error)
      })
    } catch {
      const map = this.memoryFallback.get(storeName)
      return (map?.get(id) as DBStores[T]) || null
    }
  }

  public async put<T extends StoreName>(storeName: T, item: DBStores[T]): Promise<DBStores[T]> {
    const raw = item as unknown as Record<string, unknown>
    if (!raw.id) {
      raw.id = 'local_' + Math.random().toString(36).substring(2, 10)
    }
    if (!raw.created) {
      raw.created = new Date().toISOString()
    }
    raw.updated = new Date().toISOString()

    if (!this.isIndexedDBAvailable) {
      const map = this.memoryFallback.get(storeName) || new Map()
      map.set(String(raw.id), raw)
      this.memoryFallback.set(storeName, map)
      return raw as unknown as DBStores[T]
    }
    try {
      const db = await this.getDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        const req = store.put(raw)
        req.onsuccess = () => resolve(raw as unknown as DBStores[T])
        req.onerror = () => reject(req.error)
      })
    } catch {
      const map = this.memoryFallback.get(storeName) || new Map()
      map.set(String(raw.id), raw)
      this.memoryFallback.set(storeName, map)
      return raw as unknown as DBStores[T]
    }
  }

  public async delete<T extends StoreName>(storeName: T, id: string): Promise<boolean> {
    if (!this.isIndexedDBAvailable) {
      const map = this.memoryFallback.get(storeName)
      return map ? map.delete(id) : false
    }
    try {
      const db = await this.getDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        const req = store.delete(id)
        req.onsuccess = () => resolve(true)
        req.onerror = () => reject(req.error)
      })
    } catch {
      const map = this.memoryFallback.get(storeName)
      return map ? map.delete(id) : false
    }
  }

  public async clearAll(): Promise<void> {
    const stores: StoreName[] = [
      'clientes',
      'obras',
      'orcamentos',
      'financeiro',
      'materiais_estoque',
      'diario_obra',
      'configuracoes',
      'sync_queue',
    ]
    for (const st of stores) {
      if (this.isIndexedDBAvailable) {
        try {
          const db = await this.getDB()
          await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(st, 'readwrite')
            const store = tx.objectStore(st)
            const req = store.clear()
            req.onsuccess = () => resolve()
            req.onerror = () => reject(req.error)
          })
        } catch {
          // fallback
        }
      }
      this.memoryFallback.get(st)?.clear()
    }
  }

  // Inicializa seeds realistas caso o banco local esteja vazio
  public async seedDefaultIfEmpty(userId: string = 'local_user'): Promise<void> {
    const clientes = await this.getAll('clientes')
    if (clientes.length > 0) return

    // Configurações
    await this.put('configuracoes', {
      id: 'cfg_default',
      owner_id: userId,
      modo: 'profissional',
      fonte_tamanho: 'm',
      alto_contraste: false,
      voz_respostas: true,
      tema: 'claro',
      nome_profissional: 'João Carlos Mestre de Obras',
      nome_empresa: 'JC Construções e Reformas',
      telefone: '(35) 99876-5432',
    })

    // 2 Clientes
    const c1: Cliente = {
      id: 'cli_1',
      owner_id: userId,
      nome: 'Carlos Eduardo Silva',
      telefone: '(35) 98765-4321',
      whatsapp: '5535987654321',
      endereco: 'Rua das Flores, 142 - Monte Sião, MG',
      observacoes: 'Construção da casa de campo. Contato no WhatsApp.',
      created: new Date().toISOString(),
    }
    const c2: Cliente = {
      id: 'cli_2',
      owner_id: userId,
      nome: 'Dona Maria Oliveira',
      telefone: '(35) 99123-8877',
      whatsapp: '5535991238877',
      endereco: 'Av. Central, 520 - Águas de Lindóia, SP',
      observacoes: 'Reforma da cozinha e troca de piso.',
      created: new Date().toISOString(),
    }
    await this.put('clientes', c1)
    await this.put('clientes', c2)

    // 2 Obras
    const o1: Obra = {
      id: 'obra_1',
      owner_id: userId,
      cliente_id: 'cli_1',
      titulo: 'Casa de Campo - Monte Sião',
      endereco: 'Rua das Flores, 142 - Monte Sião, MG',
      data_inicio: '2025-01-15',
      previsao_termino: '2025-06-30',
      valor_contratado: 45000,
      valor_recebido: 20000,
      valor_pendente: 25000,
      status: 'em_andamento',
      etapas: [
        { nome: 'Fundação e Alvenaria', concluida: true, progresso: 100 },
        { nome: 'Reboco e Contrapiso', concluida: false, progresso: 60 },
        { nome: 'Instalações e Telhado', concluida: false, progresso: 20 },
        { nome: 'Acabamentos e Pintura', concluida: false, progresso: 0 },
      ],
      created: new Date().toISOString(),
    }
    const o2: Obra = {
      id: 'obra_2',
      owner_id: userId,
      cliente_id: 'cli_2',
      titulo: 'Reforma Cozinha e Banheiro',
      endereco: 'Av. Central, 520 - Águas de Lindóia, SP',
      data_inicio: '2025-02-01',
      previsao_termino: '2025-03-20',
      valor_contratado: 18500,
      valor_recebido: 10000,
      valor_pendente: 8500,
      status: 'em_andamento',
      etapas: [
        { nome: 'Demolição e Limpeza', concluida: true, progresso: 100 },
        { nome: 'Encanamento e Elétrica', concluida: true, progresso: 100 },
        { nome: 'Assentamento de Porcelanato', concluida: false, progresso: 70 },
        { nome: 'Pintura final', concluida: false, progresso: 0 },
      ],
      created: new Date().toISOString(),
    }
    await this.put('obras', o1)
    await this.put('obras', o2)

    // 3 Orçamentos
    const orc1: Orcamento = {
      id: 'orc_1',
      owner_id: userId,
      cliente_id: 'cli_1',
      obra_id: 'obra_1',
      titulo: 'Orçamento Alvenaria e Reboco - Carlos',
      itens: [
        {
          descricao: 'Mão de obra alvenaria (120 m²)',
          quantidade: 120,
          unidade: 'm²',
          preco_unitario: 55,
          total: 6600,
          categoria: 'mão de obra',
        },
        {
          descricao: 'Mão de obra reboco (240 m²)',
          quantidade: 240,
          unidade: 'm²',
          preco_unitario: 35,
          total: 8400,
          categoria: 'mão de obra',
        },
        {
          descricao: 'Argamassa e cimento para assentamento',
          quantidade: 40,
          unidade: 'saco',
          preco_unitario: 38,
          total: 1520,
          categoria: 'materiais',
        },
      ],
      subtotal: 16520,
      desconto: 520,
      total: 16000,
      status: 'em_execucao',
      sinal: 5000,
      parcelas: [
        { numero: 1, valor: 5000, vencimento: '2025-01-20', status: 'pago' },
        { numero: 2, valor: 5500, vencimento: '2025-02-20', status: 'pago' },
        { numero: 3, valor: 5500, vencimento: '2025-03-20', status: 'pendente' },
      ],
      observacoes: 'Materiais pesados por conta do cliente.',
      created: new Date().toISOString(),
    }
    const orc2: Orcamento = {
      id: 'orc_2',
      owner_id: userId,
      cliente_id: 'cli_2',
      obra_id: 'obra_2',
      titulo: 'Orçamento Troca de Piso - Dona Maria',
      itens: [
        {
          descricao: 'Colocação de piso porcelanato (45 m²)',
          quantidade: 45,
          unidade: 'm²',
          preco_unitario: 65,
          total: 2925,
          categoria: 'mão de obra',
        },
        {
          descricao: 'Revestimento parede cozinha (28 m²)',
          quantidade: 28,
          unidade: 'm²',
          preco_unitario: 60,
          total: 1680,
          categoria: 'mão de obra',
        },
        {
          descricao: 'Argamassa ACIII 20kg (12 sacos)',
          quantidade: 12,
          unidade: 'saco',
          preco_unitario: 42,
          total: 504,
          categoria: 'materiais',
        },
        {
          descricao: 'Rejunte epóxi (4 caixas)',
          quantidade: 4,
          unidade: 'cx',
          preco_unitario: 85,
          total: 340,
          categoria: 'materiais',
        },
      ],
      subtotal: 5449,
      desconto: 149,
      total: 5300,
      status: 'aprovado',
      sinal: 2000,
      parcelas: [
        { numero: 1, valor: 2000, vencimento: '2025-02-05', status: 'pago' },
        { numero: 2, valor: 3300, vencimento: '2025-03-05', status: 'pendente' },
      ],
      observacoes: 'Inclui nivelamento do contrapiso.',
      created: new Date().toISOString(),
    }
    const orc3: Orcamento = {
      id: 'orc_3',
      owner_id: userId,
      cliente_id: 'cli_1',
      titulo: 'Orçamento Muro de Fechamento',
      itens: [
        {
          descricao: 'Muro em bloco de concreto (77 m²)',
          quantidade: 77,
          unidade: 'm²',
          preco_unitario: 70,
          total: 5390,
          categoria: 'mão de obra',
        },
        {
          descricao: 'Sapata corrida e brocas a cada 2,5m',
          quantidade: 35,
          unidade: 'm',
          preco_unitario: 40,
          total: 1400,
          categoria: 'mão de obra',
        },
        {
          descricao: 'Chapisco e reboco paulista',
          quantidade: 154,
          unidade: 'm²',
          preco_unitario: 30,
          total: 4620,
          categoria: 'mão de obra',
        },
      ],
      subtotal: 11410,
      desconto: 410,
      total: 11000,
      status: 'aguardando_resposta',
      sinal: 3000,
      parcelas: [
        { numero: 1, valor: 3000, vencimento: '2025-04-01', status: 'pendente' },
        { numero: 2, valor: 4000, vencimento: '2025-05-01', status: 'pendente' },
        { numero: 3, valor: 4000, vencimento: '2025-06-01', status: 'pendente' },
      ],
      observacoes: 'Validade de 15 dias corridos.',
      created: new Date().toISOString(),
    }
    await this.put('orcamentos', orc1)
    await this.put('orcamentos', orc2)
    await this.put('orcamentos', orc3)

    // 4 Financeiro
    const f1: FinanceiroLancamento = {
      id: 'fin_1',
      owner_id: userId,
      obra_id: 'obra_1',
      tipo: 'entrada',
      categoria: 'sinal',
      descricao: 'Sinal da Obra Casa de Campo',
      valor: 5000,
      data: '2025-01-20',
      status: 'pago',
    }
    const f2: FinanceiroLancamento = {
      id: 'fin_2',
      owner_id: userId,
      obra_id: 'obra_1',
      tipo: 'entrada',
      categoria: 'pagamento',
      descricao: 'Medição da primeira etapa alvenaria',
      valor: 3500,
      data: '2025-02-10',
      status: 'pago',
    }
    const f3: FinanceiroLancamento = {
      id: 'fin_3',
      owner_id: userId,
      obra_id: 'obra_1',
      tipo: 'saida',
      categoria: 'cimento',
      descricao: 'Compra de cimento e areia lavada',
      valor: 1850,
      data: '2025-01-25',
      status: 'pago',
    }
    const f4: FinanceiroLancamento = {
      id: 'fin_4',
      owner_id: userId,
      obra_id: 'obra_1',
      tipo: 'saida',
      categoria: 'ajudante',
      descricao: 'Diária do Ajudante Tião (semana 1)',
      valor: 1350,
      data: '2025-02-01',
      status: 'pago',
    }
    await this.put('financeiro', f1)
    await this.put('financeiro', f2)
    await this.put('financeiro', f3)
    await this.put('financeiro', f4)

    // 5 Materiais
    const mats: MaterialEstoque[] = [
      {
        id: 'mat_1',
        owner_id: userId,
        nome: 'Cimento CP II 50kg',
        quantidade: 14,
        unidade: 'saco',
        preco: 38.5,
        fornecedor: 'Depósito Alvorada',
        estoque_minimo: 10,
      },
      {
        id: 'mat_2',
        owner_id: userId,
        nome: 'Areia Média Lavada',
        quantidade: 4,
        unidade: 'm2',
        preco: 140,
        fornecedor: 'Areeiro Rio Claro',
        estoque_minimo: 3,
      },
      {
        id: 'mat_3',
        owner_id: userId,
        nome: 'Bloco Cerâmico 14x19x29',
        quantidade: 450,
        unidade: 'un',
        preco: 2.8,
        fornecedor: 'Olaria Paulistana',
        estoque_minimo: 500,
      },
      {
        id: 'mat_4',
        owner_id: userId,
        nome: 'Argamassa AC-II 20kg',
        quantidade: 6,
        unidade: 'saco',
        preco: 27.9,
        fornecedor: 'Depósito Alvorada',
        estoque_minimo: 12,
      },
      {
        id: 'mat_5',
        owner_id: userId,
        nome: 'Tinta Látex Branco Neve 18L',
        quantidade: 3,
        unidade: 'un',
        preco: 260,
        fornecedor: 'Tintas & Cores',
        estoque_minimo: 2,
      },
    ]
    for (const m of mats) {
      await this.put('materiais_estoque', m)
    }

    // 3 Diário
    const d1: DiarioObra = {
      id: 'dia_1',
      owner_id: userId,
      obra_id: 'obra_1',
      data: '2025-02-12',
      servico: 'Alvenaria do quarto e sala',
      quantidade: 28,
      material: '280 blocos cerâmicos e 4 sacos de cimento',
      observacoes: 'Dia produtivo, tempo firme sem chuva.',
    }
    const d2: DiarioObra = {
      id: 'dia_2',
      owner_id: userId,
      obra_id: 'obra_1',
      data: '2025-02-13',
      servico: 'Chapisco e preparação para reboco',
      quantidade: 35,
      material: '3 sacos de cimento e 6 latas de areia grossa',
      observacoes: 'Paredes niveladas e prontas para emboço.',
    }
    const d3: DiarioObra = {
      id: 'dia_3',
      owner_id: userId,
      obra_id: 'obra_1',
      data: '2025-02-14',
      servico: 'Reboco paulista parede externa',
      quantidade: 30,
      material: '8 sacos de cimento e 1 caminhão pequeno de areia fina',
      observacoes: 'Feito com acabamento desempenado.',
    }
    await this.put('diario_obra', d1)
    await this.put('diario_obra', d2)
    await this.put('diario_obra', d3)
  }
}

export const localDB = new LocalDatabase()
