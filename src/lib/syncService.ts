// src/lib/syncService.ts
// Motor de sincronização offline-first entre IndexedDB e PocketBase

import pb from '@/lib/pocketbase/client'
import {
  localGetAll,
  localPut,
  localDelete,
  getPendingSyncQueue,
  markSyncItemStatus,
  enqueueSyncOperation,
  SyncQueueItem,
} from './localDB'

export interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  lastSyncTime: string | null
  pendingCount: number
}

type SyncListener = (status: SyncStatus) => void
const listeners = new Set<SyncListener>()

let currentStatus: SyncStatus = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  lastSyncTime: localStorage.getItem('ajudante_last_sync'),
  pendingCount: 0,
}

function notifyListeners() {
  for (const l of listeners) {
    try {
      l({ ...currentStatus })
    } catch {
      /* intentionally ignored */
    }
  }
}

export function subscribeSyncStatus(listener: SyncListener): () => void {
  listeners.add(listener)
  listener({ ...currentStatus })
  return () => {
    listeners.delete(listener)
  }
}

// Atualiza o estado da conexão
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    currentStatus.isOnline = true
    notifyListeners()
    syncNow()
  })

  window.addEventListener('offline', () => {
    currentStatus.isOnline = false
    notifyListeners()
  })
}

/**
 * Puxa dados remotos do PocketBase e atualiza a base local
 */
export async function pullRemoteData(): Promise<void> {
  if (!pb.authStore.isValid || !currentStatus.isOnline) return

  const collections = [
    'clientes',
    'obras',
    'orcamentos',
    'financeiro',
    'materiais_estoque',
    'diario_obra',
    'documentos',
    'configuracoes',
    'tarefas_obra',
    'lembretes_obra',
    'equipe_membros',
  ]

  for (const col of collections) {
    try {
      const records = await pb.collection(col).getFullList({
        sort: '-updated',
        requestKey: null,
      })

      for (const rec of records) {
        await localPut(col, rec, true)
      }
    } catch (err) {
      console.warn(`[Sync] Erro ao puxar ${col}:`, err)
    }
  }
}

/**
 * Processa a fila de mutações offline e envia para o PocketBase
 */
export async function pushSyncQueue(): Promise<{ processed: number; errors: number }> {
  if (!pb.authStore.isValid || !currentStatus.isOnline) {
    return { processed: 0, errors: 0 }
  }

  const queue = await getPendingSyncQueue()
  currentStatus.pendingCount = queue.length
  notifyListeners()

  let processed = 0
  let errors = 0

  for (const item of queue) {
    try {
      await processQueueItem(item)
      await markSyncItemStatus(item.id, 'processado')
      processed++
    } catch (err) {
      errors++
      const msg = err instanceof Error ? err.message : String(err)
      await markSyncItemStatus(item.id, 'erro', msg)
    }
  }

  currentStatus.pendingCount = (await getPendingSyncQueue()).length
  notifyListeners()
  return { processed, errors }
}

async function processQueueItem(item: SyncQueueItem): Promise<void> {
  const { entidade, entidade_id, operacao, payload } = item

  // Garante que o owner_id seja do usuário atual
  const body = {
    ...payload,
    owner_id: pb.authStore.model?.id,
  }

  if (operacao === 'create') {
    // Se o id for temporário local (loc_...), criamos novo no servidor e atualizamos localmente
    const created = await pb.collection(entidade).create(body, { requestKey: null })
    // Substitui o registro local temporário pelo id final retornado
    if (entidade_id.startsWith('loc_') || entidade_id.startsWith('local_')) {
      await localDelete(entidade, entidade_id, false)
      await localPut(entidade, created, true)
    }
  } else if (operacao === 'update') {
    if (entidade_id.startsWith('loc_') || entidade_id.startsWith('local_')) {
      // Se era local e virou update antes de sync, cria
      const created = await pb.collection(entidade).create(body, { requestKey: null })
      await localDelete(entidade, entidade_id, false)
      await localPut(entidade, created, true)
    } else {
      const updated = await pb.collection(entidade).update(entidade_id, body, { requestKey: null })
      await localPut(entidade, updated, true)
    }
  } else if (operacao === 'delete') {
    if (!entidade_id.startsWith('loc_') && !entidade_id.startsWith('local_')) {
      try {
        await pb.collection(entidade).delete(entidade_id, { requestKey: null })
      } catch (delErr) {
        // Se já não existe no backend, ignora
      }
    }
    await localDelete(entidade, entidade_id, false)
  }
}

/**
 * Dispara uma sincronização completa (Push da fila + Pull de atualizações)
 */
export async function syncNow(): Promise<void> {
  if (currentStatus.isSyncing) return
  if (!navigator.onLine || !pb.authStore.isValid) return

  currentStatus.isSyncing = true
  notifyListeners()

  let result = { processed: 0, errors: 0 }
  try {
    result = await pushSyncQueue()
    await pullRemoteData()
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    currentStatus.lastSyncTime = nowStr
    localStorage.setItem('ajudante_last_sync', nowStr)
  } catch (err) {
    console.warn('[Sync] Falha na sincronização:', err)
  } finally {
    currentStatus.isSyncing = false
    currentStatus.pendingCount = (await getPendingSyncQueue()).length
    notifyListeners()
  }
  return result as any
}

// -------------------------------------------------------------
// HELPER PARA MUTAR REGISTRO COM GARANTIA LOCAL-FIRST
// -------------------------------------------------------------

export async function mutateEntity<T extends { id?: string }>(
  entidade: string,
  operacao: 'create' | 'update' | 'delete',
  recordData: T,
): Promise<string> {
  const id = recordData.id || `loc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const recordWithId = { ...recordData, id }

  if (operacao === 'delete') {
    await localDelete(entidade, id, true)
  } else {
    await localPut(entidade, recordWithId, false)
  }

  // Registra na fila de sincronização
  await enqueueSyncOperation(entidade, id, operacao, recordWithId as Record<string, unknown>)

  // Se online, tenta sincronizar em background
  if (navigator.onLine && pb.authStore.isValid) {
    setTimeout(() => {
      syncNow()
    }, 100)
  }

  return id
}

export async function queryEntity<T>(entidade: string): Promise<T[]> {
  return localGetAll<T>(entidade)
}
