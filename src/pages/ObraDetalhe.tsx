import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { localDB } from '@/lib/localDB'
import { Obra, DiarioObra, Orcamento, DocumentoObra } from '@/types/database'
import { mutateEntity } from '@/lib/syncService'
import { useAuth } from '@/contexts/AuthContext'
import {
  verificarPermissaoDocumentosPdf,
  verificarPermissaoDiarioVozEFotos,
} from '@/lib/planLimits'
import PlanUpgradeModal from '@/components/PlanUpgradeModal'
import {
  HardHat,
  MapPin,
  Calendar,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Plus,
  BookOpen,
  Camera,
  Share2,
  Printer,
  Trash2,
  FileText,
  Navigation,
  Receipt,
  FileCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { gerarEImprimirRecibo, gerarEImprimirOrdemServico } from '@/lib/documentGenerator'

export const ObraDetalhe: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { isDono, config, planoAtivo, user, isTrial } = useAuth()
  const [obra, setObra] = useState<Obra | null>(null)
  const [clienteObra, setClienteObra] = useState<any>(null)
  const [diarios, setDiarios] = useState<DiarioObra[]>([])
  const [fotos, setFotos] = useState<DocumentoObra[]>([])
  const [carregando, setCarregando] = useState(true)
  const [dialogDiarioAberto, setDialogDiarioAberto] = useState(false)
  const [dialogFotoAberto, setDialogFotoAberto] = useState(false)
  const [capturandoGeo, setCapturandoGeo] = useState(false)

  // Upgrade Modal
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [upgradeTitulo, setUpgradeTitulo] = useState('Recurso Disponível no Plano Profissional')
  const [upgradeMensagem, setUpgradeMensagem] = useState('')

  // Modais de Recibo e Ordem de Serviço
  const [modalReciboOpen, setModalReciboOpen] = useState(false)
  const [reciboValor, setReciboValor] = useState('')
  const [reciboReferente, setReciboReferente] = useState('')
  const [reciboObs, setReciboObs] = useState('')

  const [modalOsOpen, setModalOsOpen] = useState(false)
  const [osPrevisao, setOsPrevisao] = useState('')
  const [osValor, setOsValor] = useState('')
  const [osObs, setOsObs] = useState('')

  // Novo lançamento de diário de obra
  const [servico, setServico] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [material, setMaterial] = useState('')
  const [observacoes, setObservacoes] = useState('')

  // Formulário de captura de foto
  const [fotoBase64, setFotoBase64] = useState<string | null>(null)
  const [fotoDescricao, setFotoDescricao] = useState('')
  const [fotoEtapaIndex, setFotoEtapaIndex] = useState<number | ''>('')
  const [fotoGeo, setFotoGeo] = useState<string>('')
  const [fotoDataHora, setFotoDataHora] = useState<string>('')

  const carregarDados = async () => {
    if (!id) {
      setCarregando(false)
      return
    }
    try {
      const ob = await localDB.getById('obras', id)
      setObra(ob || null)
      if (ob?.cliente_id) {
        const cli = await localDB.getById('clientes', ob.cliente_id)
        setClienteObra(cli)
      } else {
        setClienteObra(null)
      }
      const todosDiarios = await localDB.getAll('diario_obra')
      setDiarios(todosDiarios.filter((d) => d?.obra_id === id))
      const todosDocs = await localDB.getAll('documentos')
      setFotos(
        todosDocs
          .filter((d) => d?.obra_id === id && d?.tipo === 'foto')
          .sort(
            (a, b) => new Date(b?.created || 0).getTime() - new Date(a?.created || 0).getTime(),
          ),
      )
    } catch (err) {
      console.warn('Erro ao carregar obra:', err)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [id])

  if (carregando) {
    return (
      <div className="p-12 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-muted-foreground">
          Carregando detalhes da obra...
        </p>
      </div>
    )
  }

  if (!obra) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Obra não encontrada.</p>
        <Link to="/obras">
          <Button variant="outline">Voltar para Obras</Button>
        </Link>
      </div>
    )
  }

  const handleSalvarDiario = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!servico.trim()) return

    const validacao = verificarPermissaoDiarioVozEFotos(
      planoAtivo,
      'diario',
      user?.modulos_liberados,
      isTrial,
    )
    if (!validacao.permitido) {
      setDialogDiarioAberto(false)
      setUpgradeTitulo('Diário de Obra Avançado')
      setUpgradeMensagem(validacao.mensagemBloqueio || 'Disponível no Plano Profissional.')
      setUpgradeModalOpen(true)
      return
    }

    const novoDiario: DiarioObra = {
      id: 'dia_' + Date.now(),
      owner_id: obra.owner_id || 'local_user',
      obra_id: obra.id,
      data: new Date().toISOString().split('T')[0],
      servico: servico.trim(),
      quantidade: parseFloat(quantidade) || undefined,
      material: material.trim() || undefined,
      observacoes: observacoes.trim() || undefined,
      created: new Date().toISOString(),
    }

    await mutateEntity('diario_obra', 'create', novoDiario)
    setDialogDiarioAberto(false)
    setServico('')
    setQuantidade('')
    setMaterial('')
    setObservacoes('')
    carregarDados()
  }

  const handleToggleEtapa = async (index: number) => {
    if (!obra.etapas) return
    const novasEtapas = [...obra.etapas]
    const atual = novasEtapas[index]
    const novoStatus = !(atual.concluida || atual.concluido)
    novasEtapas[index] = {
      ...atual,
      concluida: novoStatus,
      concluido: novoStatus,
      progresso: novoStatus ? 100 : 0,
    }

    const atualizada = { ...obra, etapas: novasEtapas }
    await mutateEntity('obras', 'update', atualizada)
    setObra(atualizada)
  }

  // Captura foto pelo input file (capture="environment" para compatibilidade com celulares antigos)
  const handleCapturarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validacao = verificarPermissaoDiarioVozEFotos(
      planoAtivo,
      'fotos',
      user?.modulos_liberados,
      isTrial,
    )
    if (!validacao.permitido) {
      setUpgradeTitulo('Registro Fotográfico por Obra')
      setUpgradeMensagem(validacao.mensagemBloqueio || 'Disponível no Plano Profissional.')
      setUpgradeModalOpen(true)
      return
    }

    const now = new Date()
    const dataHoraFormatada = now.toLocaleString('pt-BR')
    setFotoDataHora(dataHoraFormatada)

    // Tenta geolocalização com degradação graciosa (se não suportada ou recusada, segue sem travar)
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      setCapturandoGeo(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(6)
          const lon = pos.coords.longitude.toFixed(6)
          setFotoGeo(`${lat}, ${lon}`)
          setCapturandoGeo(false)
        },
        (_err) => {
          // Fallback gracioso: sem coordenadas
          setFotoGeo('')
          setCapturandoGeo(false)
        },
        { timeout: 7000, enableHighAccuracy: false },
      )
    }

    // Leitura do arquivo para Base64 (salva offline em IndexedDB de imediato)
    const reader = new FileReader()
    reader.onload = () => {
      setFotoBase64(reader.result as string)
      setDialogFotoAberto(true)
    }
    reader.readAsDataURL(file)
  }

  const handleSalvarFoto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fotoBase64 || !obra) return

    let etapaNome: string | undefined
    if (fotoEtapaIndex !== '' && obra.etapas && obra.etapas[Number(fotoEtapaIndex)]) {
      etapaNome = obra.etapas[Number(fotoEtapaIndex)].nome
    }

    const novaFoto: DocumentoObra = {
      id: 'doc_foto_' + Date.now(),
      owner_id: obra.owner_id || 'local_user',
      obra_id: obra.id,
      cliente_id: obra.cliente_id,
      tipo: 'foto',
      arquivo: fotoBase64,
      descricao: fotoDescricao.trim() || `Registro fotográfico - ${etapaNome || obra.titulo}`,
      etapa_index: fotoEtapaIndex === '' ? undefined : Number(fotoEtapaIndex),
      etapa_nome: etapaNome,
      data_foto: fotoDataHora || new Date().toLocaleString('pt-BR'),
      geolocalizacao: fotoGeo || undefined,
      created: new Date().toISOString(),
    }

    await mutateEntity('documentos', 'create', novaFoto)
    setDialogFotoAberto(false)
    setFotoBase64(null)
    setFotoDescricao('')
    setFotoEtapaIndex('')
    setFotoGeo('')
    setFotoDataHora('')
    carregarDados()
  }

  const handleExcluirFoto = async (fotoId: string) => {
    const confirmou = window.confirm('Tem certeza que deseja apagar esta foto do registro da obra?')
    if (!confirmou) return
    await mutateEntity('documentos', 'delete', { id: fotoId })
    carregarDados()
  }

  // GERAÇÃO E COMPARTILHAMENTO DE RELATÓRIO DA OBRA VIA WHATSAPP E IMPRESSÃO / PDF
  const etapaAtual =
    obra.etapas?.find((e) => !(e.concluida || e.concluido)) || obra.etapas?.[obra.etapas.length - 1]
  const etapasConcluidasCount = obra.etapas?.filter((e) => e.concluida || e.concluido).length || 0
  const totalEtapas = obra.etapas?.length || 0
  const fotoMaisRecente = fotos[0]

  const textoRelatorio =
    `*RELATÓRIO DE ACOMPANHAMENTO DA OBRA*\n` +
    `🏗️ *${obra.titulo.toUpperCase()}*\n` +
    (obra.endereco ? `📍 Local: ${obra.endereco}\n` : '') +
    `📅 Data do relatório: ${new Date().toLocaleDateString('pt-BR')}\n\n` +
    `*SITUAÇÃO GERAL:*\n` +
    `• Status: ${obra.status.replace('_', ' ').toUpperCase()}\n` +
    `• Progresso: ${etapasConcluidasCount} de ${totalEtapas} etapas concluídas\n` +
    (etapaAtual
      ? `• Etapa em andamento: ${etapaAtual.nome} (${etapaAtual.progresso || 0}%)\n`
      : '') +
    (isDono
      ? `\n*STATUS FINANCEIRO:*\n` +
        `• Contratado: R$ ${obra.valor_contratado?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}\n` +
        `• Recebido: R$ ${obra.valor_recebido?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}\n` +
        `• Saldo pendente: R$ ${obra.valor_pendente?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}\n`
      : '') +
    (diarios.length > 0
      ? `\n*ÚLTIMO REGISTRO DO DIÁRIO (${diarios[0].data}):*\n• ${diarios[0].servico}` +
        (diarios[0].material ? `\n• Materiais: ${diarios[0].material}` : '') +
        (diarios[0].observacoes ? `\n• Obs: ${diarios[0].observacoes}` : '') +
        `\n`
      : '') +
    (fotoMaisRecente
      ? `\n📸 *REGISTRO FOTOGRÁFICO MAIS RECENTE:*\n• ${fotoMaisRecente.descricao || 'Foto da obra'}` +
        (fotoMaisRecente.etapa_nome ? ` (Etapa: ${fotoMaisRecente.etapa_nome})` : '') +
        (fotoMaisRecente.data_foto ? `\n• Data: ${fotoMaisRecente.data_foto}` : '') +
        (fotoMaisRecente.geolocalizacao
          ? `\n• Geolocalização: ${fotoMaisRecente.geolocalizacao}`
          : '') +
        `\n`
      : '') +
    `\nEnviado por: ${config.nome_empresa || config.nome_profissional || 'Ajudante IA'}`

  const handleCompartilharWhatsApp = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: `Relatório da Obra - ${obra.titulo}`,
          text: textoRelatorio,
        })
        return
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          // segue para fallback do whatsapp
        } else {
          return
        }
      }
    }
    // Fallback: abrir link WhatsApp wa.me
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(textoRelatorio)}`
    window.open(url, '_blank')
  }

  const handleImprimirRelatorio = () => {
    window.print()
  }

  const handleGerarRecibo = async () => {
    const validacao = verificarPermissaoDocumentosPdf(planoAtivo, user?.modulos_liberados, isTrial)
    if (!validacao.permitido) {
      setModalReciboOpen(false)
      setUpgradeTitulo('Emissão de Recibos em PDF')
      setUpgradeMensagem(validacao.mensagemBloqueio || 'Disponível no Plano Profissional.')
      setUpgradeModalOpen(true)
      return
    }

    const val =
      parseFloat(reciboValor.replace(',', '.')) || obra.valor_recebido || obra.valor_contratado || 0
    await gerarEImprimirRecibo(
      {
        profissionalNome: config.nome_profissional || 'Profissional da Construção',
        empresaNome: config.nome_empresa || undefined,
        telefone: clienteObra?.telefone || undefined,
        clienteNome: clienteObra?.nome || 'Cliente',
        obraTitulo: obra.titulo,
        valor: val,
        referenteA: reciboReferente || `Serviços na obra ${obra.titulo}`,
        observacoes: reciboObs || undefined,
      },
      obra.id,
    )
    setModalReciboOpen(false)
    setReciboValor('')
    setReciboReferente('')
    setReciboObs('')
  }

  const handleGerarOS = async () => {
    const validacao = verificarPermissaoDocumentosPdf(planoAtivo, user?.modulos_liberados, isTrial)
    if (!validacao.permitido) {
      setModalOsOpen(false)
      setUpgradeTitulo('Ordem de Serviço em PDF')
      setUpgradeMensagem(validacao.mensagemBloqueio || 'Disponível no Plano Profissional.')
      setUpgradeModalOpen(true)
      return
    }

    const val = parseFloat(osValor.replace(',', '.')) || obra.valor_contratado || 0
    const servicosEtapas = (obra.etapas || []).map((et) => ({
      descricao: et.nome,
      quantidade: et.concluida || et.concluido ? 'Concluída' : `${et.progresso || 0}%`,
      valor: undefined,
    }))

    if (servicosEtapas.length === 0) {
      servicosEtapas.push({
        descricao: 'Serviços de construção civil / reforma',
        quantidade: 'Global',
        valor: val,
      })
    }

    await gerarEImprimirOrdemServico(
      {
        profissionalNome: config.nome_profissional || 'Profissional da Construção',
        empresaNome: config.nome_empresa || undefined,
        telefone: clienteObra?.telefone || undefined,
        clienteNome: clienteObra?.nome || 'Cliente',
        obraTitulo: obra.titulo,
        obraEndereco: obra.endereco || undefined,
        previsaoTermino:
          osPrevisao ||
          (obra.previsao_termino
            ? new Date(obra.previsao_termino).toLocaleDateString('pt-BR')
            : 'A combinar'),
        servicosEtapas,
        valorTotal: val,
        observacoes: osObs || undefined,
      },
      obra.id,
    )
    setModalOsOpen(false)
    setOsPrevisao('')
    setOsValor('')
    setOsObs('')
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/obras">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">{obra.titulo}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              {obra.endereco || 'Sem endereço informado'}
            </p>
          </div>
        </div>

        {/* Botões de Ação Rápida no Topo da Obra */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botão Recibo */}
          <Button
            variant="outline"
            onClick={() => {
              setReciboValor(
                obra.valor_recebido
                  ? String(obra.valor_recebido)
                  : obra.valor_contratado
                    ? String(obra.valor_contratado)
                    : '',
              )
              setReciboReferente(`Serviços executados na obra ${obra.titulo}`)
              setModalReciboOpen(true)
            }}
            className="font-bold text-xs gap-1.5 h-9 rounded-xl border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
          >
            <Receipt className="w-4 h-4" />
            Recibo
          </Button>

          {/* Botão Ordem de Serviço */}
          <Button
            variant="outline"
            onClick={() => {
              setOsValor(obra.valor_contratado ? String(obra.valor_contratado) : '')
              setModalOsOpen(true)
            }}
            className="font-bold text-xs gap-1.5 h-9 rounded-xl border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30"
          >
            <FileCheck className="w-4 h-4" />
            Ordem de serviço
          </Button>

          {/* Botão Câmera Rápida (capture="environment") */}
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleCapturarFoto}
            />
            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 active:scale-95 transition-all shadow-xs cursor-pointer">
              <Camera className="w-4 h-4" />
              Tirar Foto
            </span>
          </label>

          {/* Botão Enviar Relatório (WhatsApp / Compartilhar) */}
          <Button
            onClick={handleCompartilharWhatsApp}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 h-9 rounded-xl shadow-xs"
          >
            <Share2 className="w-4 h-4" />
            Enviar Relatório
          </Button>

          {/* Botão Imprimir / Salvar PDF */}
          <Button
            variant="outline"
            onClick={handleImprimirRelatorio}
            className="font-bold text-xs gap-1.5 h-9 rounded-xl"
          >
            <Printer className="w-4 h-4" />
            PDF / Imprimir
          </Button>
        </div>
      </div>

      {/* Resumo Financeiro da Obra (Visível apenas para perfil Dono; Operador vê progresso físico) */}
      {isDono ? (
        <Card className="shadow-xs border-border">
          <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
            <div>
              <span className="text-xs text-muted-foreground block font-semibold mb-0.5">
                Valor Contratado
              </span>
              <div className="text-xl font-black text-foreground">
                R$ {obra.valor_contratado?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block font-semibold mb-0.5">
                Valor Recebido
              </span>
              <div className="text-xl font-black text-emerald-600">
                R$ {obra.valor_recebido?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block font-semibold mb-0.5">
                Pendente a Receber
              </span>
              <div className="text-xl font-black text-primary">
                R$ {obra.valor_pendente?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-xs border-border bg-muted/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block font-semibold">
                Progresso da Obra
              </span>
              <span className="text-lg font-black text-foreground">
                {etapasConcluidasCount} de {totalEtapas} etapas concluídas
              </span>
            </div>
            <Badge variant="outline" className="text-xs font-bold">
              Modo Operador (sem valores financeiros)
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* REGISTRO FOTOGRÁFICO DA OBRA */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Registro Fotográfico ({fotos.length})
          </h2>
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleCapturarFoto}
            />
            <span className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer">
              <Plus className="w-3.5 h-3.5" />
              Nova Foto
            </span>
          </label>
        </div>

        {fotos.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed text-center space-y-2 bg-card">
            <Camera className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-xs text-muted-foreground font-medium">
              Nenhuma foto registrada nesta obra ainda. Use o botão acima para fotografar o
              andamento e comprovar o serviço para o dono da obra.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {fotos.map((f) => (
              <div
                key={f.id}
                className="group relative rounded-2xl overflow-hidden border border-border bg-card shadow-xs flex flex-col"
              >
                <div className="aspect-video bg-muted relative overflow-hidden">
                  <img
                    src={f.arquivo}
                    alt={f.descricao || 'Foto da obra'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {f.etapa_nome && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold">
                      {f.etapa_nome}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleExcluirFoto(f.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive/90 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                    title="Excluir foto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="p-3 text-xs space-y-1 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="font-bold text-foreground text-xs line-clamp-2">
                      {f.descricao || 'Registro fotográfico'}
                    </p>
                  </div>
                  <div className="space-y-0.5 pt-1 border-t text-[11px] text-muted-foreground font-mono">
                    <p className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-primary" />
                      {f.data_foto || new Date(f.created || 0).toLocaleString('pt-BR')}
                    </p>
                    {f.geolocalizacao && (
                      <p className="flex items-center gap-1 text-[10px] truncate text-emerald-600 dark:text-emerald-400">
                        <Navigation className="w-3 h-3 shrink-0" />
                        {f.geolocalizacao}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para Confirmar / Descrever Foto */}
      <Dialog open={dialogFotoAberto} onOpenChange={setDialogFotoAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Salvar Foto da Obra
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSalvarFoto} className="space-y-3 mt-2">
            {fotoBase64 && (
              <div className="aspect-video w-full rounded-xl overflow-hidden border bg-muted">
                <img src={fotoBase64} alt="Prévia" className="w-full h-full object-cover" />
              </div>
            )}

            <div>
              <Label>Descrição da Foto *</Label>
              <Input
                required
                placeholder="Ex: Parede da sala pronta, assentamento de piso..."
                value={fotoDescricao}
                onChange={(e) => setFotoDescricao(e.target.value)}
              />
            </div>

            <div>
              <Label>Vincular à Etapa Correspondente</Label>
              <select
                value={fotoEtapaIndex}
                onChange={(e) =>
                  setFotoEtapaIndex(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">Geral da Obra (sem etapa específica)</option>
                {obra.etapas?.map((etp, idx) => (
                  <option key={idx} value={idx}>
                    Etapa {idx + 1}: {etp.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-2.5 rounded-lg bg-muted/40 text-xs space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Data/Hora:</span>
                <span className="font-semibold text-foreground">{fotoDataHora}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Geolocalização:</span>
                <span className="font-semibold text-foreground">
                  {capturandoGeo
                    ? 'Localizando GPS...'
                    : fotoGeo || 'Não detectada (dispositivo sem GPS)'}
                </span>
              </div>
            </div>

            <Button type="submit" className="w-full font-bold h-11 mt-2">
              Salvar Registro Fotográfico
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO / MODAL DE RECIBO */}
      <Dialog open={modalReciboOpen} onOpenChange={setModalReciboOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Receipt className="w-5 h-5 text-amber-600" />
              Gerar Recibo de Pagamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Cliente</Label>
              <Input value={clienteObra?.nome || 'Cliente da Obra'} disabled />
            </div>
            <div>
              <Label>Valor Recebido (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Ex: 1500.00"
                value={reciboValor}
                onChange={(e) => setReciboValor(e.target.value)}
              />
            </div>
            <div>
              <Label>Referente a *</Label>
              <Input
                placeholder="Ex: Execução de alvenaria e reboco"
                value={reciboReferente}
                onChange={(e) => setReciboReferente(e.target.value)}
              />
            </div>
            <div>
              <Label>Observações (opcional)</Label>
              <Textarea
                placeholder="Ex: Pago via PIX"
                value={reciboObs}
                onChange={(e) => setReciboObs(e.target.value)}
                rows={2}
              />
            </div>
            <DialogFooter className="mt-4 gap-2">
              <Button variant="outline" onClick={() => setModalReciboOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleGerarRecibo}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                <Printer className="w-4 h-4 mr-1.5" />
                Imprimir Recibo (PDF)
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO / MODAL DE ORDEM DE SERVIÇO */}
      <Dialog open={modalOsOpen} onOpenChange={setModalOsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-sky-600" />
              Gerar Ordem de Serviço
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Obra</Label>
              <Input value={obra.titulo} disabled />
            </div>
            <div>
              <Label>Cliente</Label>
              <Input value={clienteObra?.nome || 'Cliente da Obra'} disabled />
            </div>
            <div>
              <Label>Valor Total da O.S. (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Ex: 5000.00"
                value={osValor}
                onChange={(e) => setOsValor(e.target.value)}
              />
            </div>
            <div>
              <Label>Previsão de Término</Label>
              <Input
                placeholder="Ex: 30 dias ou 20/03/2025"
                value={osPrevisao}
                onChange={(e) => setOsPrevisao(e.target.value)}
              />
            </div>
            <div>
              <Label>Observações / Condições</Label>
              <Textarea
                placeholder="Ex: Pagamento na conclusão de cada etapa"
                value={osObs}
                onChange={(e) => setOsObs(e.target.value)}
                rows={2}
              />
            </div>
            <DialogFooter className="mt-4 gap-2">
              <Button variant="outline" onClick={() => setModalOsOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleGerarOS}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold"
              >
                <Printer className="w-4 h-4 mr-1.5" />
                Imprimir O.S. (PDF)
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Etapas da Obra */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          Etapas da Obra (Toque para marcar como concluída)
        </h2>
        <div className="space-y-2">
          {obra.etapas?.map((etapa, idx) => {
            const isDone = etapa.concluida || etapa.concluido
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleToggleEtapa(idx)}
                className={`w-full p-4 rounded-xl border flex items-center justify-between text-left transition-colors ${
                  isDone
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-card border-border hover:bg-muted/50 text-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border font-bold text-xs ${
                      isDone
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-muted-foreground/40 text-muted-foreground'
                    }`}
                  >
                    {isDone ? '✓' : idx + 1}
                  </div>
                  <span
                    className={`text-sm font-semibold ${isDone ? 'line-through opacity-80' : ''}`}
                  >
                    {etapa.nome}
                  </span>
                </div>
                <Badge variant={isDone ? 'default' : 'outline'} className="text-[10px]">
                  {isDone ? 'Concluída' : `${etapa.progresso || 0}%`}
                </Badge>
              </button>
            )
          })}
        </div>
      </div>

      {/* Diário de Obra (Anotações do Dia a Dia) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Diário de Obra ({diarios.length})
          </h2>
          <Dialog open={dialogDiarioAberto} onOpenChange={setDialogDiarioAberto}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1 font-bold">
                <Plus className="w-4 h-4" />
                Novo Registro
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base font-bold">Anotar Diário de Obra</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSalvarDiario} className="space-y-3 mt-2">
                <div>
                  <Label>Serviço Executado Hoje *</Label>
                  <Input
                    required
                    placeholder="Ex: Alvenaria do quarto ou reboco da fachada"
                    value={servico}
                    onChange={(e) => setServico(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Quantidade Produzida (m² ou metros)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 28"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Materiais Utilizados</Label>
                  <Input
                    placeholder="Ex: 280 blocos e 4 sacos de cimento"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Observações / Clima</Label>
                  <Input
                    placeholder="Ex: Dia firme sem chuva, equipe com 2 ajudantes"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full font-bold h-11 mt-2">
                  Salvar Diário
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {diarios.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed text-center text-xs text-muted-foreground">
            Nenhuma anotação de diário nesta obra ainda.
          </div>
        ) : (
          <div className="space-y-2.5">
            {diarios.map((d) => (
              <div
                key={d.id}
                className="p-3.5 rounded-xl bg-card border border-border text-sm space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-sm">{d.servico}</span>
                  <span className="text-[11px] text-muted-foreground font-mono">{d.data}</span>
                </div>
                {d.quantidade && (
                  <p className="text-xs font-semibold text-primary">Produção: {d.quantidade} m²</p>
                )}
                {d.material && (
                  <p className="text-xs text-muted-foreground">Materiais: {d.material}</p>
                )}
                {d.observacoes && (
                  <p className="text-xs italic text-muted-foreground pt-1 border-t">
                    "{d.observacoes}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Modal de Upgrade Amigável */}
      <PlanUpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        titulo={upgradeTitulo}
        mensagem={upgradeMensagem}
        planoSugerido="profissional"
      />
    </div>
  )
}

export default ObraDetalhe
