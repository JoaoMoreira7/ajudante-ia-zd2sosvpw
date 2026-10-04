import { mutateEntity } from './syncService'
import pb from './pocketbase/client'

export interface DadosRecibo {
  profissionalNome: string
  empresaNome?: string
  cpfCnpj?: string
  telefone?: string
  clienteNome: string
  clienteDocumento?: string
  obraTitulo?: string
  valor: number
  referenteA: string
  data?: string
  formaPagamento?: string
  observacoes?: string
}

export interface DadosOrdemServico {
  profissionalNome: string
  empresaNome?: string
  telefone?: string
  clienteNome: string
  clienteTelefone?: string
  clienteEndereco?: string
  obraTitulo: string
  obraEndereco?: string
  dataEmissao?: string
  previsaoTermino?: string
  servicosEtapas: Array<{
    descricao: string
    quantidade?: string | number
    valor?: number
  }>
  valorTotal: number
  condicoesPagamento?: string
  observacoes?: string
}

/**
 * Abre janela de impressão formatada em folha A4 limpa e registra na coleção documentos
 */
export async function gerarEImprimirRecibo(dados: DadosRecibo, obraId?: string): Promise<void> {
  const dataHoje = dados.data || new Date().toLocaleDateString('pt-BR')
  const valorFormatado = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(dados.valor)

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Recibo - ${dados.clienteNome}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; margin: 0; padding: 24px; line-height: 1.5; }
    .recibo-box { border: 2px solid #0284c7; border-radius: 8px; padding: 24px; max-width: 760px; margin: 0 auto; background: #ffffff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
    .header h1 { margin: 0 0 4px 0; font-size: 24px; color: #0369a1; text-transform: uppercase; letter-spacing: 0.5px; }
    .empresa { font-size: 13px; color: #475569; }
    .valor-badge { background: #f0f9ff; border: 2px solid #0284c7; border-radius: 8px; padding: 10px 18px; text-align: right; }
    .valor-badge span { display: block; font-size: 11px; text-transform: uppercase; color: #0369a1; font-weight: bold; }
    .valor-badge strong { font-size: 22px; color: #0f172a; }
    .corpo { font-size: 15px; margin: 24px 0; line-height: 1.8; text-align: justify; }
    .detalhes { background: #f8fafc; border-radius: 6px; padding: 12px 16px; margin: 16px 0; font-size: 13px; }
    .detalhes-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .assinaturas { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; gap: 40px; }
    .assinatura-campo { flex: 1; text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 13px; color: #334155; }
    .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #94a3b8; }
    @media print {
      body { padding: 0; }
      .recibo-box { border: 2px solid #333; }
    }
  </style>
</head>
<body>
  <div class="recibo-box">
    <div class="header">
      <div>
        <h1>Recibo de Pagamento</h1>
        <div class="empresa">
          <strong>${dados.empresaNome || dados.profissionalNome}</strong>
          ${dados.cpfCnpj ? `<br>CPF/CNPJ: ${dados.cpfCnpj}` : ''}
          ${dados.telefone ? `<br>Telefone/WhatsApp: ${dados.telefone}` : ''}
        </div>
      </div>
      <div class="valor-badge">
        <span>Valor Recebido</span>
        <strong>${valorFormatado}</strong>
      </div>
    </div>

    <div class="corpo">
      Recebi(emos) de <strong>${dados.clienteNome}</strong>${dados.clienteDocumento ? ` (Doc: ${dados.clienteDocumento})` : ''},
      a quantia de <strong>${valorFormatado}</strong>, referente a <strong>${dados.referenteA}</strong>${dados.obraTitulo ? ` na obra <em>${dados.obraTitulo}</em>` : ''}.
    </div>

    <div class="detalhes">
      <div class="detalhes-row">
        <span><strong>Forma de pagamento:</strong> ${dados.formaPagamento || 'À vista / Dinheiro ou PIX'}</span>
        <span><strong>Data de emissão:</strong> ${dataHoje}</span>
      </div>
      ${dados.observacoes ? `<div style="margin-top: 6px;"><strong>Observações:</strong> ${dados.observacoes}</div>` : ''}
    </div>

    <div class="assinaturas">
      <div class="assinatura-campo">
        <strong>${dados.profissionalNome}</strong><br>
        Emitente / Responsável
      </div>
      <div class="assinatura-campo">
        <strong>${dados.clienteNome}</strong><br>
        Cliente
      </div>
    </div>

    <div class="footer">
      Documento gerado pelo aplicativo Ajudante IA • Construção Civil
    </div>
  </div>
  <script>
    window.addEventListener('load', function() {
      window.print();
    });
  </script>
</body>
</html>`

  abrirJanelaImpressao(html)

  // Registro na coleção documentos com tipo 'recibo'
  try {
    const autorNome = dados.profissionalNome || (pb.authStore.model as any)?.name || 'Responsável'
    const autorId = pb.authStore.model?.id || 'local_user'
    await mutateEntity('documentos', 'create', {
      id: 'doc_recibo_' + Date.now(),
      owner_id: pb.authStore.model?.id || 'local_user',
      obra_id: obraId,
      titulo: `Recibo - ${dados.clienteNome} (${valorFormatado})`,
      tipo: 'recibo',
      conteudo_texto: `Recibo emitido para ${dados.clienteNome} no valor de ${valorFormatado} referente a: ${dados.referenteA}. Data: ${dataHoje}.`,
      criado_por_nome: autorNome,
      criado_por_id: autorId,
    })
  } catch (err) {
    console.warn('Erro ao salvar documento de recibo:', err)
  }
}

/**
 * Abre janela de impressão formatada de Ordem de Serviço e registra na coleção documentos
 */
export async function gerarEImprimirOrdemServico(
  dados: DadosOrdemServico,
  obraId?: string,
): Promise<void> {
  const dataEmissao = dados.dataEmissao || new Date().toLocaleDateString('pt-BR')
  const valorTotalFormatado = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(dados.valorTotal)

  const servicosHtml = dados.servicosEtapas
    .map(
      (s, idx) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">${idx + 1}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px;"><strong>${s.descricao}</strong></td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: center;">${s.quantidade || '-'}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right;">${
        s.valor
          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.valor)
          : '-'
      }</td>
    </tr>
  `,
    )
    .join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Ordem de Serviço - ${dados.obraTitulo}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 24px; line-height: 1.4; }
    .os-container { max-width: 800px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px; }
    .os-header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px; }
    .os-title { font-size: 22px; font-weight: bold; text-transform: uppercase; color: #0f172a; }
    .os-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .os-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; font-size: 13px; }
    .os-card h4 { margin: 0 0 8px 0; color: #0369a1; text-transform: uppercase; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
    th { background: #0f172a; color: #ffffff; padding: 10px; font-size: 12px; text-align: left; text-transform: uppercase; }
    .total-box { display: flex; justify-content: flex-end; margin-top: 10px; margin-bottom: 24px; }
    .total-card { background: #f0fdf4; border: 2px solid #16a34a; border-radius: 6px; padding: 10px 20px; text-align: right; }
    .total-card span { font-size: 11px; text-transform: uppercase; color: #15803d; font-weight: bold; }
    .total-card strong { display: block; font-size: 20px; color: #166534; }
    .assinaturas { display: flex; justify-content: space-between; margin-top: 50px; gap: 40px; }
    .assinatura-campo { flex: 1; text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 12px; }
    .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #94a3b8; }
    @media print {
      body { padding: 0; }
      .os-container { border: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="os-container">
    <div class="os-header">
      <div>
        <div class="os-title">Ordem de Serviço (O.S.)</div>
        <div style="font-size: 13px; color: #475569; margin-top: 4px;">
          <strong>${dados.empresaNome || dados.profissionalNome}</strong>
          ${dados.telefone ? ` • Tel: ${dados.telefone}` : ''}
        </div>
      </div>
      <div style="text-align: right; font-size: 12px; color: #475569;">
        <strong>Emissão:</strong> ${dataEmissao}<br>
        <strong>Previsão de Término:</strong> ${dados.previsaoTermino || 'A combinar'}
      </div>
    </div>

    <div class="os-grid">
      <div class="os-card">
        <h4>Dados do Cliente</h4>
        <strong>Nome:</strong> ${dados.clienteNome}<br>
        ${dados.clienteTelefone ? `<strong>Telefone:</strong> ${dados.clienteTelefone}<br>` : ''}
        ${dados.clienteEndereco ? `<strong>Endereço:</strong> ${dados.clienteEndereco}` : ''}
      </div>

      <div class="os-card">
        <h4>Local da Obra / Serviço</h4>
        <strong>Obra:</strong> ${dados.obraTitulo}<br>
        <strong>Endereço:</strong> ${dados.obraEndereco || 'Mesmo endereço do cliente'}<br>
        <strong>Responsável Técnico:</strong> ${dados.profissionalNome}
      </div>
    </div>

    <h4 style="margin: 0 0 4px 0; color: #0f172a; text-transform: uppercase; font-size: 13px;">Serviços e Etapas a Executar</h4>
    <table>
      <thead>
        <tr>
          <th style="width: 40px;">#</th>
          <th>Descrição do Serviço</th>
          <th style="width: 100px; text-align: center;">Qtd / Medida</th>
          <th style="width: 130px; text-align: right;">Valor</th>
        </tr>
      </thead>
      <tbody>
        ${servicosHtml}
      </tbody>
    </table>

    <div class="total-box">
      <div class="total-card">
        <span>Valor Total da O.S.</span>
        <strong>${valorTotalFormatado}</strong>
      </div>
    </div>

    ${
      dados.condicoesPagamento || dados.observacoes
        ? `
      <div style="background: #f8fafc; border-left: 4px solid #0284c7; padding: 12px; margin-bottom: 24px; font-size: 13px;">
        ${dados.condicoesPagamento ? `<div><strong>Condições de Pagamento:</strong> ${dados.condicoesPagamento}</div>` : ''}
        ${dados.observacoes ? `<div style="margin-top: 4px;"><strong>Observações:</strong> ${dados.observacoes}</div>` : ''}
      </div>
    `
        : ''
    }

    <div class="assinaturas">
      <div class="assinatura-campo">
        <strong>${dados.profissionalNome}</strong><br>
        Prestador / Empreiteiro
      </div>
      <div class="assinatura-campo">
        <strong>${dados.clienteNome}</strong><br>
        De acordo do Cliente
      </div>
    </div>

    <div class="footer">
      Documento gerado pelo aplicativo Ajudante IA • Construção Civil
    </div>
  </div>
  <script>
    window.addEventListener('load', function() {
      window.print();
    });
  </script>
</body>
</html>`

  abrirJanelaImpressao(html)

  // Registro na coleção documentos com tipo 'ordem_servico'
  try {
    const autorNome = dados.profissionalNome || (pb.authStore.model as any)?.name || 'Responsável'
    const autorId = pb.authStore.model?.id || 'local_user'
    await mutateEntity('documentos', 'create', {
      id: 'doc_os_' + Date.now(),
      owner_id: pb.authStore.model?.id || 'local_user',
      obra_id: obraId,
      titulo: `Ordem de Serviço - ${dados.obraTitulo}`,
      tipo: 'ordem_servico',
      conteudo_texto: `Ordem de Serviço emitida para ${dados.clienteNome} na obra ${dados.obraTitulo}. Total: ${valorTotalFormatado}. Emissão: ${dataEmissao}.`,
      criado_por_nome: autorNome,
      criado_por_id: autorId,
    })
  } catch (err) {
    console.warn('Erro ao salvar documento de ordem de serviço:', err)
  }
}

function abrirJanelaImpressao(conteudoHtml: string) {
  const win = window.open('', '_blank')
  if (!win) {
    alert('Por favor, permita pop-ups para abrir a impressão do documento.')
    return
  }
  win.document.open()
  win.document.write(conteudoHtml)
  win.document.close()
}
