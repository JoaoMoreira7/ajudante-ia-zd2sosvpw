/**
 * Gerador Determinístico Local de Relatório PDF da Obra para o Cliente
 *
 * Funciona 100% offline no navegador:
 * - Gera documento A4 limpo e profissional
 * - Resumo da obra (nome, endereço, período, status e etapas)
 * - Diário de obra consolidado com termos técnicos normalizados do glossário
 * - Fotos com legendas, datas e geolocalização
 * - Gastos por categoria e orçamento vinculado (APENAS se o usuário for Dono/Admin;
 *   se for Operador, a seção financeira é completamente omitida).
 * - Suporta impressão direta, salvar como PDF e compartilhamento no WhatsApp.
 */

import { DiarioObra, DocumentoObra, FinanceiroLancamento, Obra, Orcamento } from '@/types/database'
import { mutateEntity } from './syncService'
import pb from './pocketbase/client'

export interface DadosRelatorioObraPDF {
  obra: Obra
  clienteNome?: string
  clienteTelefone?: string
  diarios: DiarioObra[]
  fotos: DocumentoObra[]
  gastos?: FinanceiroLancamento[]
  orcamento?: Orcamento | null
  empresaNome?: string
  responsavelNome: string
  telefoneContato?: string
  isDono: boolean // true = Dono/Admin (inclui financeiro); false = Operador (sem valores)
}

export function montarHtmlRelatorioObra(dados: DadosRelatorioObraPDF): string {
  const {
    obra,
    clienteNome,
    clienteTelefone,
    diarios,
    fotos,
    gastos = [],
    orcamento,
    empresaNome,
    responsavelNome,
    telefoneContato,
    isDono,
  } = dados

  const dataEmissao = new Date().toLocaleDateString('pt-BR')

  // Etapas
  const etapasConcluidas = obra.etapas?.filter((e) => e.concluida || e.concluido).length || 0
  const totalEtapas = obra.etapas?.length || 0
  const progressoPct = totalEtapas > 0 ? Math.round((etapasConcluidas / totalEtapas) * 100) : 0

  // Seção Financeira (apenas para Dono)
  let financeiroHtml = ''
  if (isDono) {
    const totalContratado = obra.valor_contratado || 0
    const totalRecebido = obra.valor_recebido || 0
    const saldoPendente = obra.valor_pendente || Math.max(0, totalContratado - totalRecebido)

    // Agrupa gastos por categoria
    const gastosPorCategoria: Record<string, number> = {}
    let totalGasto = 0
    for (const g of gastos) {
      if (g.tipo === 'saida') {
        const cat = g.categoria || 'outros'
        gastosPorCategoria[cat] = (gastosPorCategoria[cat] || 0) + g.valor
        totalGasto += g.valor
      }
    }

    const formatarMoeda = (val: number) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

    const linhasCategorias = Object.entries(gastosPorCategoria)
      .map(
        ([cat, val]) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-transform: capitalize; font-size: 13px;">${cat}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; font-size: 13px;">${formatarMoeda(val)}</td>
      </tr>
    `,
      )
      .join('')

    financeiroHtml = `
      <div style="margin-top: 24px; page-break-inside: avoid;">
        <h3 style="font-size: 15px; color: #0f172a; border-bottom: 2px solid #0284c7; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
          Resumo Financeiro da Obra
        </h3>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; text-align: center;">
            <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600;">Contratado</div>
            <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px;">${formatarMoeda(totalContratado)}</div>
          </div>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; text-align: center;">
            <div style="font-size: 11px; text-transform: uppercase; color: #16a34a; font-weight: 600;">Recebido</div>
            <div style="font-size: 16px; font-weight: 800; color: #15803d; margin-top: 2px;">${formatarMoeda(totalRecebido)}</div>
          </div>
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px 14px; text-align: center;">
            <div style="font-size: 11px; text-transform: uppercase; color: #0284c7; font-weight: 600;">Saldo a Receber</div>
            <div style="font-size: 16px; font-weight: 800; color: #0369a1; margin-top: 2px;">${formatarMoeda(saldoPendente)}</div>
          </div>
        </div>

        ${
          linhasCategorias
            ? `
          <div style="margin-top: 10px;">
            <h4 style="font-size: 13px; color: #334155; margin: 0 0 8px 0; font-weight: 700;">Gastos por Categoria (Total: ${formatarMoeda(totalGasto)})</h4>
            <table style="width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
              <thead>
                <tr style="background: #f1f5f9;">
                  <th style="padding: 8px 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #475569;">Categoria</th>
                  <th style="padding: 8px 12px; text-align: right; font-size: 12px; text-transform: uppercase; color: #475569;">Valor Gasto</th>
                </tr>
              </thead>
              <tbody>
                ${linhasCategorias}
              </tbody>
            </table>
          </div>
        `
            : ''
        }

        ${
          orcamento
            ? `
          <div style="margin-top: 14px; background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #581c87;">
            <strong>Orçamento Vinculado:</strong> ${orcamento.titulo} • Total: ${formatarMoeda(orcamento.total)} (Status: ${orcamento.status.toUpperCase()})
          </div>
        `
            : ''
        }
      </div>
    `
  }

  // Seção Diário de Obra
  const diariosHtml =
    diarios.length === 0
      ? '<p style="font-size: 12px; color: #64748b; font-style: italic;">Nenhum registro no diário da obra até o momento.</p>'
      : `
    <table style="width: 100%; border-collapse: collapse; margin-top: 8px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
      <thead>
        <tr style="background: #f1f5f9;">
          <th style="padding: 8px 10px; font-size: 11px; text-transform: uppercase; color: #475569; text-align: left; width: 85px;">Data</th>
          <th style="padding: 8px 10px; font-size: 11px; text-transform: uppercase; color: #475569; text-align: left;">Atividade / Serviço Executado</th>
          <th style="padding: 8px 10px; font-size: 11px; text-transform: uppercase; color: #475569; text-align: left;">Materiais / Produção</th>
        </tr>
      </thead>
      <tbody>
        ${diarios
          .slice(0, 15)
          .map(
            (d) => `
          <tr>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-mono; color: #0284c7; font-weight: bold;">${d.data}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px;">
              <strong>${d.servico}</strong>
              ${d.observacoes ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;"><em>${d.observacoes}</em></div>` : ''}
              ${(d as any).criado_por_nome ? `<div style="font-size: 10px; color: #94a3b8;">Por: ${(d as any).criado_por_nome}</div>` : ''}
            </td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #334155;">
              ${d.quantidade ? `<span>${d.quantidade} m²</span>` : ''}
              ${d.material ? `<div style="font-size: 11px; color: #475569;">${d.material}</div>` : ''}
            </td>
          </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>
  `

  // Seção de Fotos com Legenda
  const fotosHtml =
    fotos.length === 0
      ? '<p style="font-size: 12px; color: #64748b; font-style: italic;">Nenhum registro fotográfico nesta obra.</p>'
      : `
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-top: 10px; page-break-inside: auto;">
      ${fotos
        .slice(0, 10)
        .map(
          (f) => `
        <div style="border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #ffffff; page-break-inside: avoid; display: flex; flex-direction: column;">
          <div style="width: 100%; height: 190px; background: #f1f5f9; overflow: hidden; display: flex; align-items: center; justify-content: center;">
            <img src="${f.arquivo}" alt="${f.descricao || 'Foto da obra'}" style="width: 100%; height: 100%; object-fit: cover;" />
          </div>
          <div style="padding: 10px 12px; font-size: 12px; line-height: 1.4; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">${f.descricao || 'Registro fotográfico da obra'}</div>
              ${f.etapa_nome ? `<div style="font-size: 11px; color: #0284c7; font-weight: 600;">Etapa: ${f.etapa_nome}</div>` : ''}
            </div>
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #f1f5f9; font-size: 10px; color: #64748b; font-family: monospace;">
              ${f.data_foto ? `<span>📅 ${f.data_foto}</span>` : ''}
              ${f.geolocalizacao ? `<span style="margin-left: 8px;">📍 ${f.geolocalizacao}</span>` : ''}
              ${(f as any).criado_por_nome ? `<div style="margin-top: 2px;">👤 ${(f as any).criado_por_nome}</div>` : ''}
            </div>
          </div>
        </div>
      `,
        )
        .join('')}
    </div>
  `

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Relatório da Obra - ${obra.titulo}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; line-height: 1.4; background: #ffffff; }
    .report-container { max-width: 820px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0284c7; padding-bottom: 14px; margin-bottom: 18px; }
    .title-area h1 { margin: 0 0 4px 0; font-size: 22px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge-status { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; background: #e0f2fe; color: #0369a1; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px; font-size: 13px; }
    .section-title { font-size: 14px; color: #0f172a; border-bottom: 2px solid #0284c7; padding-bottom: 6px; margin: 22px 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px; }
    .etapas-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .etapa-item { font-size: 11px; padding: 4px 10px; border-radius: 6px; border: 1px solid #cbd5e1; background: #ffffff; }
    .etapa-item.done { background: #dcfce7; border-color: #86efac; color: #166534; font-weight: bold; }
    .footer { text-align: center; margin-top: 36px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Cabeçalho Oficial -->
    <div class="header">
      <div class="title-area">
        <h1>Relatório de Acompanhamento</h1>
        <div style="font-size: 14px; font-weight: 700; color: #0284c7;">${obra.titulo}</div>
        <div style="font-size: 12px; color: #475569; margin-top: 3px;">
          ${empresaNome ? `<strong>${empresaNome}</strong> • ` : ''}Responsável: ${responsavelNome}
          ${telefoneContato ? ` • Tel/WhatsApp: ${telefoneContato}` : ''}
        </div>
      </div>
      <div style="text-align: right;">
        <span class="badge-status">${obra.status.replace('_', ' ')}</span>
        <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Emissão: ${dataEmissao}</div>
      </div>
    </div>

    <!-- Metadados da Obra e Cliente -->
    <div class="meta-grid">
      <div>
        <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 2px;">Local da Obra</div>
        <strong>${obra.titulo}</strong>
        <div>${obra.endereco || 'Endereço não informado'}</div>
        <div style="margin-top: 6px; font-size: 12px; color: #475569;">
          ${obra.data_inicio ? `Início: ${obra.data_inicio}` : ''}
          ${obra.previsao_termino ? ` • Previsão: ${obra.previsao_termino}` : ''}
        </div>
      </div>
      <div>
        <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 2px;">Cliente</div>
        <strong>${clienteNome || 'Cliente não vinculado'}</strong>
        ${clienteTelefone ? `<div>Telefone: ${clienteTelefone}</div>` : ''}
        <div style="margin-top: 6px; font-size: 12px; color: #166534; font-weight: 700;">
          Progresso Físico: ${progressoPct}% (${etapasConcluidas}/${totalEtapas} etapas)
        </div>
      </div>
    </div>

    <!-- Etapas da Obra -->
    ${
      obra.etapas && obra.etapas.length > 0
        ? `
      <div style="margin-bottom: 16px;">
        <div style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px; text-transform: uppercase;">Etapas do Cronograma:</div>
        <div class="etapas-list">
          ${obra.etapas
            .map((et, idx) => {
              const isDone = et.concluida || et.concluido
              return `<span class="etapa-item ${isDone ? 'done' : ''}">${idx + 1}. ${et.nome} ${isDone ? '✓' : ''}</span>`
            })
            .join('')}
        </div>
      </div>
    `
        : ''
    }

    <!-- Diário de Obra Técnico -->
    <h3 class="section-title">Diário de Obra e Atividades Recentes</h3>
    ${diariosHtml}

    <!-- Registro Fotográfico com Legenda e Localização -->
    <h3 class="section-title" style="margin-top: 24px;">Registro Fotográfico com Legenda</h3>
    ${fotosHtml}

    <!-- Resumo Financeiro (só renderiza se isDono === true) -->
    ${financeiroHtml}

    <!-- Rodapé -->
    <div class="footer">
      Relatório gerado pelo Ajudante IA • Construção Civil e Empreiteiras • ${dataEmissao}
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      // Abre diálogo nativo de impressão que permite salvar em PDF no celular e desktop
      setTimeout(function() {
        window.print();
      }, 300);
    });
  </script>
</body>
</html>`
}

/**
 * Abre a janela formatada em A4 com o relatório pronto para imprimir ou salvar em PDF,
 * e opcionalmente registra o documento emitido na coleção documentos.
 */
export async function gerarEImprimirRelatorioObraPDF(
  dados: DadosRelatorioObraPDF,
): Promise<{ success: boolean; urlAbertura?: string }> {
  const html = montarHtmlRelatorioObra(dados)

  const win = window.open('', '_blank')
  if (win) {
    win.document.open()
    win.document.write(html)
    win.document.close()
  } else {
    // Fallback com iframe invisível se popup estiver bloqueado
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)
    const doc = iframe.contentWindow?.document
    if (doc) {
      doc.open()
      doc.write(html)
      doc.close()
      setTimeout(() => {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
        setTimeout(() => document.body.removeChild(iframe), 60000)
      }, 500)
    }
  }

  // Registra documento gerado na base local e Skip Cloud
  try {
    await mutateEntity('documentos', 'create', {
      id: 'doc_rel_' + Date.now(),
      owner_id: dados.obra.owner_id || pb.authStore.model?.id || 'local_user',
      obra_id: dados.obra.id,
      cliente_id: dados.obra.cliente_id,
      tipo: 'relatorio',
      descricao: `Relatório de Acompanhamento - ${dados.obra.titulo}`,
      data_foto: new Date().toLocaleDateString('pt-BR'),
    })
  } catch (err) {
    console.warn('Erro ao salvar registro do relatório gerado:', err)
  }

  return { success: true }
}
