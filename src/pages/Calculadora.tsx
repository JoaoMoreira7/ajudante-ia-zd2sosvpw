import React, { useState } from 'react'
import * as MathEngine from '@/lib/mathEngine'
import {
  Calculator,
  Square,
  Box,
  Layers,
  Paintbrush,
  BrickWall,
  Home,
  CheckCircle,
  AlertTriangle,
  Info,
  ShoppingCart,
  Share2,
  FileText,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { mutateEntity } from '@/lib/syncService'
import { pb } from '@/lib/pocketbase/client'

export const Calculadora: React.FC = () => {
  // 1. ÁREA
  const [areaComp, setAreaComp] = useState('8')
  const [areaLarg, setAreaLarg] = useState('3')
  const [descontarPorta, setDescontarPorta] = useState(false)
  const [portaLarg, setPortaLarg] = useState('0.80')
  const [portaAlt, setPortaAlt] = useState('2.10')

  // 2. VOLUME
  const [volComp, setVolComp] = useState('10')
  const [volLarg, setVolLarg] = useState('4')
  const [volAlt, setVolAlt] = useState('0.15')

  // 3. ALVENARIA
  const [alvArea, setAlvArea] = useState('24')
  const [alvPerda, setAlvPerda] = useState('10')

  // 4. REBOCO
  const [rebArea, setRebArea] = useState('24')
  const [rebEsp, setRebEsp] = useState('2')

  // 5. CONTRAPISO
  const [cpArea, setCpArea] = useState('30')
  const [cpEsp, setCpEsp] = useState('4')

  // 6. CONCRETO
  const [concVol, setConcVol] = useState('5')

  // 7. PISO
  const [pisoArea, setPisoArea] = useState('30')
  const [pisoPerda, setPisoPerda] = useState('10')

  // 8. PINTURA
  const [pintArea, setPintArea] = useState('50')
  const [pintDemaos, setPintDemaos] = useState('2')

  // 9. TELHADO
  const [telhArea, setTelhArea] = useState('60')
  const [telhInc, setTelhInc] = useState('30')

  // Estado para modal "Gerar lista de materiais"
  const [listaMateriaisModal, setListaMateriaisModal] =
    useState<MathEngine.ListaMateriaisEstimativa | null>(null)
  const [salvandoLista, setSalvandoLista] = useState(false)
  const [listaSalvaSucesso, setListaSalvaSucesso] = useState(false)

  // Execuções determinísticas puras
  const resArea = descontarPorta
    ? MathEngine.calcularAreaComDesconto(parseFloat(areaComp) || 0, parseFloat(areaLarg) || 0, [
        {
          largura: parseFloat(portaLarg) || 0,
          altura: parseFloat(portaAlt) || 0,
          descricao: 'Porta',
        },
      ])
    : MathEngine.calcularAreaRetangulo(parseFloat(areaComp) || 0, parseFloat(areaLarg) || 0)

  const resVol = MathEngine.calcularVolume(
    parseFloat(volComp) || 0,
    parseFloat(volLarg) || 0,
    parseFloat(volAlt) || 0,
  )

  const resAlv = MathEngine.calcularAlvenaria({
    areaM2: parseFloat(alvArea) || 0,
    perdaPct: parseFloat(alvPerda) || 10,
  })

  const resReb = MathEngine.calcularReboco({
    areaM2: parseFloat(rebArea) || 0,
    espessuraCm: parseFloat(rebEsp) || 2,
  })

  const resCp = MathEngine.calcularContrapiso({
    areaM2: parseFloat(cpArea) || 0,
    espessuraCm: parseFloat(cpEsp) || 4,
  })

  const resConc = MathEngine.calcularConcreto({
    volumeM3: parseFloat(concVol) || 0,
  })

  const resPiso = MathEngine.calcularPiso({
    areaM2: parseFloat(pisoArea) || 0,
    perdaPct: parseFloat(pisoPerda) || 10,
  })

  const resPint = MathEngine.calcularPintura({
    areaM2: parseFloat(pintArea) || 0,
    demaos: parseFloat(pintDemaos) || 2,
  })

  const resTelh = MathEngine.calcularTelhado({
    areaPlantaM2: parseFloat(telhArea) || 0,
    inclinacaoPct: parseFloat(telhInc) || 30,
  })

  const abrirListaMateriais = (
    servico: 'alvenaria' | 'reboco' | 'contrapiso' | 'concreto' | 'piso' | 'pintura' | 'telhado',
    medida: number,
    perda = 10,
  ) => {
    const res = MathEngine.gerarEstimativaMateriais(servico, medida, perda)
    setListaMateriaisModal(res.valor)
    setListaSalvaSucesso(false)
  }

  const salvarListaNosDocumentos = async () => {
    if (!listaMateriaisModal) return
    setSalvandoLista(true)
    try {
      const conteudoTexto =
        `LISTA DE MATERIAIS (${listaMateriaisModal.tipoServico.toUpperCase()})\n` +
        `Medida: ${listaMateriaisModal.areaOuVolume} ${listaMateriaisModal.unidadeMedida} (+${listaMateriaisModal.perdaPct}% perda)\n\n` +
        listaMateriaisModal.itens
          .map(
            (it) =>
              `• ${it.nome}: ${it.quantidade} ${it.unidade}${it.observacao ? ` (${it.observacao})` : ''}`,
          )
          .join('\n') +
        `\n\nAVISO: ${listaMateriaisModal.avisoLegal}`

      await mutateEntity('documentos', 'create', {
        id: 'doc_mat_' + Date.now(),
        owner_id: pb.authStore.model?.id || 'local_user',
        tipo: 'lista_materiais',
        titulo: `Lista de Materiais - ${listaMateriaisModal.tipoServico.toUpperCase()} (${listaMateriaisModal.areaOuVolume} ${listaMateriaisModal.unidadeMedida})`,
        conteudo_texto: conteudoTexto,
      })
      setListaSalvaSucesso(true)
    } finally {
      setSalvandoLista(false)
    }
  }

  const compartilharListaWhatsApp = () => {
    if (!listaMateriaisModal) return
    const texto =
      `*ESTIMATIVA DE MATERIAIS — ${listaMateriaisModal.tipoServico.toUpperCase()}*\n` +
      `Para ${listaMateriaisModal.areaOuVolume} ${listaMateriaisModal.unidadeMedida} (com ${listaMateriaisModal.perdaPct}% folga):\n\n` +
      listaMateriaisModal.itens
        .map((it) => `• ${it.nome}: ${it.quantidade} ${it.unidade}`)
        .join('\n') +
      `\n\n⚠️ _${listaMateriaisModal.avisoLegal}_\n\nGerado por Ajudante IA`

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Calculator className="w-6 h-6 text-primary" />
            CALCULADORA DE OBRA
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cálculos matemáticos determinísticos exatos e estimativas para construção civil.
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-emerald-600 text-emerald-600 font-bold text-xs uppercase px-2.5 py-1"
        >
          Motor Puro Ativo
        </Badge>
      </div>

      <Tabs defaultValue="area" className="w-full">
        <TabsList className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 h-auto p-1.5 gap-1 bg-muted/60 rounded-xl">
          <TabsTrigger value="area" className="text-xs font-bold py-2">
            Área
          </TabsTrigger>
          <TabsTrigger value="volume" className="text-xs font-bold py-2">
            Volume
          </TabsTrigger>
          <TabsTrigger value="alvenaria" className="text-xs font-bold py-2">
            Alvenaria
          </TabsTrigger>
          <TabsTrigger value="reboco" className="text-xs font-bold py-2">
            Reboco
          </TabsTrigger>
          <TabsTrigger value="contrapiso" className="text-xs font-bold py-2">
            Contrapiso
          </TabsTrigger>
          <TabsTrigger value="concreto" className="text-xs font-bold py-2">
            Concreto
          </TabsTrigger>
          <TabsTrigger value="piso" className="text-xs font-bold py-2">
            Piso
          </TabsTrigger>
          <TabsTrigger value="pintura" className="text-xs font-bold py-2">
            Pintura
          </TabsTrigger>
          <TabsTrigger value="telhado" className="text-xs font-bold py-2">
            Telhado
          </TabsTrigger>
        </TabsList>

        {/* 1. ABA ÁREA */}
        <TabsContent value="area" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Square className="w-5 h-5 text-primary" />
                  Cálculo de Área e Desconto de Vãos
                </CardTitle>
                <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                  CÁLCULO EXATO
                </Badge>
              </div>
              <CardDescription>
                Multiplicação direta de comprimento × altura/largura.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Comprimento (m)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={areaComp}
                    onChange={(e) => setAreaComp(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Altura ou Largura (m)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={areaLarg}
                    onChange={(e) => setAreaLarg(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg border bg-muted/30 flex items-center justify-between">
                <div className="text-xs font-semibold">Descontar vão de porta ou janela?</div>
                <Button
                  size="sm"
                  variant={descontarPorta ? 'default' : 'outline'}
                  onClick={() => setDescontarPorta(!descontarPorta)}
                >
                  {descontarPorta ? 'Desconto Ativo' : 'Adicionar Desconto'}
                </Button>
              </div>

              {descontarPorta && (
                <div className="grid grid-cols-2 gap-4 p-3 rounded-lg border bg-card">
                  <div>
                    <Label>Largura da Porta (m)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={portaLarg}
                      onChange={(e) => setPortaLarg(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Altura da Porta (m)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={portaAlt}
                      onChange={(e) => setPortaAlt(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 space-y-2">
                <div className="text-xs font-bold text-primary uppercase">Resultado do Motor:</div>
                <div className="text-2xl font-black text-foreground">
                  {typeof resArea.valor === 'number'
                    ? `${resArea.valor} m²`
                    : `${resArea.valor.areaLiquida} m² (líquida)`}
                </div>
                <div className="text-xs font-mono font-semibold text-muted-foreground">
                  {resArea.formula}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. ABA VOLUME */}
        <TabsContent value="volume" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Box className="w-5 h-5 text-primary" />
                  Cálculo de Volume (m³ e Litros)
                </CardTitle>
                <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                  CÁLCULO EXATO
                </Badge>
              </div>
              <CardDescription>Para sapatas, vigas, lajes e caixas d’água.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Comprimento (m)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={volComp}
                    onChange={(e) => setVolComp(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Largura (m)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={volLarg}
                    onChange={(e) => setVolLarg(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Altura/Espessura (m)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={volAlt}
                    onChange={(e) => setVolAlt(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 space-y-2">
                <div className="text-xs font-bold text-primary uppercase">Volume Total:</div>
                <div className="text-2xl font-black text-foreground">{resVol.valor} m³</div>
                <p className="text-xs text-muted-foreground">
                  Equivalente a {(resVol.valor * 1000).toLocaleString('pt-BR')} litros
                </p>
                <div className="text-xs font-mono font-semibold text-muted-foreground">
                  {resVol.formula}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. ABA ALVENARIA */}
        <TabsContent value="alvenaria" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <BrickWall className="w-5 h-5 text-primary" />
                  Alvenaria e Blocos
                </CardTitle>
                <Badge className="bg-amber-600 text-white font-bold text-[10px]">ESTIMATIVA</Badge>
              </div>
              <CardDescription>
                Blocos cerâmicos 14x19x29 + argamassa de assentamento e perdas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Área da Parede (m²)</Label>
                  <Input
                    type="number"
                    value={alvArea}
                    onChange={(e) => setAlvArea(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Margem de Perda (%)</Label>
                  <Input
                    type="number"
                    value={alvPerda}
                    onChange={(e) => setAlvPerda(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase">
                  Material Estimado:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-card rounded-lg border">
                    <span className="text-xs text-muted-foreground block">Blocos Cerâmicos</span>
                    <span className="text-xl font-black text-foreground">
                      {resAlv.valor.quantidadeBlocos} un
                    </span>
                  </div>
                  <div className="p-3 bg-card rounded-lg border">
                    <span className="text-xs text-muted-foreground block">Cimento (~50kg)</span>
                    <span className="text-xl font-black text-foreground">
                      ~{Math.ceil(resAlv.valor.cimentoKg / 50)} sacos
                    </span>
                  </div>
                  <div className="p-3 bg-card rounded-lg border">
                    <span className="text-xs text-muted-foreground block">Areia Média</span>
                    <span className="text-xl font-black text-foreground">
                      ~{resAlv.valor.areiaM3} m³
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground italic pt-2">⚠️ {resAlv.aviso}</p>
              </div>

              <Button
                onClick={() =>
                  abrirListaMateriais(
                    'alvenaria',
                    parseFloat(alvArea) || 0,
                    parseFloat(alvPerda) || 10,
                  )
                }
                className="w-full font-bold gap-2 bg-primary text-primary-foreground h-11 rounded-xl shadow-xs"
              >
                <ShoppingCart className="w-4 h-4" />
                Gerar Lista de Materiais da Alvenaria
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. ABA REBOCO */}
        <TabsContent value="reboco" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  Reboco e Emboço
                </CardTitle>
                <Badge className="bg-amber-600 text-white font-bold text-[10px]">ESTIMATIVA</Badge>
              </div>
              <CardDescription>
                Espessura média de 1.5 a 2.5 cm com cimento, cal e areia.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Área a Rebocar (m²)</Label>
                  <Input
                    type="number"
                    value={rebArea}
                    onChange={(e) => setRebArea(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Espessura da Camada (cm)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={rebEsp}
                    onChange={(e) => setRebEsp(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase">
                  Material Estimado:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-card rounded-lg border">
                    <span className="text-xs text-muted-foreground block">Cimento (50kg)</span>
                    <span className="text-xl font-black text-foreground">
                      ~{resReb.valor.cimentoSacos50kg} sacos
                    </span>
                  </div>
                  <div className="p-3 bg-card rounded-lg border">
                    <span className="text-xs text-muted-foreground block">
                      Cal Hidratada (20kg)
                    </span>
                    <span className="text-xl font-black text-foreground">
                      ~{resReb.valor.calSacos20kg} sacos
                    </span>
                  </div>
                  <div className="p-3 bg-card rounded-lg border">
                    <span className="text-xs text-muted-foreground block">Areia Peneirada</span>
                    <span className="text-xl font-black text-foreground">
                      ~{resReb.valor.areiaM3} m³
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground italic pt-2">⚠️ {resReb.aviso}</p>
              </div>

              <Button
                onClick={() => abrirListaMateriais('reboco', parseFloat(rebArea) || 0, 10)}
                className="w-full font-bold gap-2 bg-primary text-primary-foreground h-11 rounded-xl shadow-xs"
              >
                <ShoppingCart className="w-4 h-4" />
                Gerar Lista de Materiais do Reboco
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        {/* 5. ABA CONTRAPISO */}
        <TabsContent value="contrapiso" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  Contrapiso (Farofa)
                </CardTitle>
                <Badge className="bg-amber-600 text-white font-bold text-[10px]">ESTIMATIVA</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Área do Piso (m²)</Label>
                  <Input type="number" value={cpArea} onChange={(e) => setCpArea(e.target.value)} />
                </div>
                <div>
                  <Label>Espessura (cm)</Label>
                  <Input type="number" value={cpEsp} onChange={(e) => setCpEsp(e.target.value)} />
                </div>
              </div>
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-card rounded-lg border">
                    <span className="text-xs text-muted-foreground block">Cimento (50kg)</span>
                    <span className="text-xl font-black text-foreground">
                      ~{resCp.valor.cimentoSacos50kg} sacos
                    </span>
                  </div>
                  <div className="p-3 bg-card rounded-lg border">
                    <span className="text-xs text-muted-foreground block">Areia Lavada</span>
                    <span className="text-xl font-black text-foreground">
                      ~{resCp.valor.areiaM3} m³
                    </span>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => abrirListaMateriais('pintura', parseFloat(pintArea) || 0, 10)}
                className="w-full font-bold gap-2 bg-primary text-primary-foreground h-11 rounded-xl shadow-xs"
              >
                <ShoppingCart className="w-4 h-4" />
                Gerar Lista de Materiais da Pintura
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. ABA CONCRETO */}
        <TabsContent value="concreto" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Box className="w-5 h-5 text-primary" />
                  Concreto Convencional (Traço 1:2:3)
                </CardTitle>
                <Badge className="bg-amber-600 text-white font-bold text-[10px]">ESTIMATIVA</Badge>
              </div>
              <CardDescription>
                Aviso estrutural: Peças estruturais exigem projeto de engenheiro habilitado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Volume de Concreto (m³)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={concVol}
                  onChange={(e) => setConcVol(e.target.value)}
                />
              </div>
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-card rounded-lg border">
                    <span className="text-xs text-muted-foreground block">Cimento (50kg)</span>
                    <span className="text-xl font-black text-foreground">
                      ~{resConc.valor.cimentoSacos50kg} sacos
                    </span>
                  </div>
                  <div className="p-3 bg-card rounded-lg border">
                    <span className="text-xs text-muted-foreground block">Areia Média</span>
                    <span className="text-xl font-black text-foreground">
                      ~{resConc.valor.areiaM3} m³
                    </span>
                  </div>
                  <div className="p-3 bg-card rounded-lg border">
                    <span className="text-xs text-muted-foreground block">Brita nº 1</span>
                    <span className="text-xl font-black text-foreground">
                      ~{resConc.valor.britaM3} m³
                    </span>
                  </div>
                  <div className="p-3 bg-card rounded-lg border">
                    <span className="text-xs text-muted-foreground block">Água</span>
                    <span className="text-xl font-black text-foreground">
                      ~{resConc.valor.aguaLitros} L
                    </span>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-900 dark:text-blue-300 text-xs font-semibold">
                  ⚠️ {resConc.aviso}
                </div>
              </div>

              <Button
                onClick={() => abrirListaMateriais('concreto', parseFloat(concVol) || 0, 10)}
                className="w-full font-bold gap-2 bg-primary text-primary-foreground h-11 rounded-xl shadow-xs"
              >
                <ShoppingCart className="w-4 h-4" />
                Gerar Lista de Materiais do Concreto
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. ABA PISO */}
        <TabsContent value="piso" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Square className="w-5 h-5 text-primary" />
                  Revestimento Cerâmico e Piso
                </CardTitle>
                <Badge className="bg-amber-600 text-white font-bold text-[10px]">ESTIMATIVA</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Área do Piso (m²)</Label>
                  <Input
                    type="number"
                    value={pisoArea}
                    onChange={(e) => setPisoArea(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Perda para Recortes (%)</Label>
                  <Input
                    type="number"
                    value={pisoPerda}
                    onChange={(e) => setPisoPerda(e.target.value)}
                  />
                </div>
              </div>
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-card rounded-lg border">
                    <span className="text-xs text-muted-foreground block">Área com perda</span>
                    <span className="text-xl font-black text-foreground">
                      {resPiso.valor.areaTotalComPerda} m²
                    </span>
                  </div>
                  <div className="p-3 bg-card rounded-lg border">
                    <span className="text-xs text-muted-foreground block">Caixas (2m²/cx)</span>
                    <span className="text-xl font-black text-foreground">
                      {resPiso.valor.caixasPiso} caixas
                    </span>
                  </div>
                  <div className="p-3 bg-card rounded-lg border">
                    <span className="text-xs text-muted-foreground block">Argamassa Colante</span>
                    <span className="text-xl font-black text-foreground">
                      ~{resPiso.valor.argamassaColanteSacos20kg} sacos
                    </span>
                  </div>
                </div>
              </div>

              <Button
                onClick={() =>
                  abrirListaMateriais(
                    'piso',
                    parseFloat(pisoArea) || 0,
                    parseFloat(pisoPerda) || 10,
                  )
                }
                className="w-full font-bold gap-2 bg-primary text-primary-foreground h-11 rounded-xl shadow-xs"
              >
                <ShoppingCart className="w-4 h-4" />
                Gerar Lista de Materiais do Piso
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 8. ABA PINTURA */}
        <TabsContent value="pintura" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Paintbrush className="w-5 h-5 text-primary" />
                  Pintura e Rendimento
                </CardTitle>
                <Badge className="bg-amber-600 text-white font-bold text-[10px]">ESTIMATIVA</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Área de Parede (m²)</Label>
                  <Input
                    type="number"
                    value={pintArea}
                    onChange={(e) => setPintArea(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Quantidade de Demãos</Label>
                  <Input
                    type="number"
                    value={pintDemaos}
                    onChange={(e) => setPintDemaos(e.target.value)}
                  />
                </div>
              </div>
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-card rounded-lg border">
                    <span className="text-xs text-muted-foreground block">Litros de Tinta</span>
                    <span className="text-xl font-black text-foreground">
                      ~{resPint.valor.litrosTinta} L
                    </span>
                  </div>
                  <div className="p-3 bg-card rounded-lg border">
                    <span className="text-xs text-muted-foreground block">
                      Embalagens Sugeridas
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {resPint.valor.latas18L} latas (18L) + {resPint.valor.galoes3_6L} galões
                      (3,6L)
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 9. ABA TELHADO */}
        <TabsContent value="telhado" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Home className="w-5 h-5 text-primary" />
                  Telhado e Inclinação
                </CardTitle>
                <Badge className="bg-amber-600 text-white font-bold text-[10px]">ESTIMATIVA</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Área da Projeção Horizontal (m²)</Label>
                  <Input
                    type="number"
                    value={telhArea}
                    onChange={(e) => setTelhArea(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Inclinação (%)</Label>
                  <Input
                    type="number"
                    value={telhInc}
                    onChange={(e) => setTelhInc(e.target.value)}
                  />
                </div>
              </div>
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-card rounded-lg border">
                    <span className="text-xs text-muted-foreground block">Área Real Inclinada</span>
                    <span className="text-xl font-black text-foreground">
                      {resTelh.valor.areaInclinadaM2} m²
                    </span>
                  </div>
                  <div className="p-3 bg-card rounded-lg border">
                    <span className="text-xs text-muted-foreground block">Telhas Cerâmicas</span>
                    <span className="text-xl font-black text-foreground">
                      ~{resTelh.valor.quantidadeTelhas} un
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground italic pt-2">⚠️ {resTelh.aviso}</p>
              </div>

              <Button
                onClick={() => abrirListaMateriais('telhado', parseFloat(telhArea) || 0, 10)}
                className="w-full font-bold gap-2 bg-primary text-primary-foreground h-11 rounded-xl shadow-xs"
              >
                <ShoppingCart className="w-4 h-4" />
                Gerar Lista de Materiais do Telhado
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIÁLOGO / MODAL DE LISTA DE MATERIAIS */}
      <Dialog
        open={!!listaMateriaisModal}
        onOpenChange={(open) => !open && setListaMateriaisModal(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Lista de Materiais Estimada
            </DialogTitle>
          </DialogHeader>

          {listaMateriaisModal && (
            <div className="space-y-4 mt-2">
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
                <strong>ATENÇÃO:</strong> {listaMateriaisModal.avisoLegal}
              </div>

              <div className="text-xs text-muted-foreground">
                Serviço:{' '}
                <strong className="text-foreground capitalize">
                  {listaMateriaisModal.tipoServico}
                </strong>{' '}
                • Medida:{' '}
                <strong className="text-foreground">
                  {listaMateriaisModal.areaOuVolume} {listaMateriaisModal.unidadeMedida}
                </strong>{' '}
                (+{listaMateriaisModal.perdaPct}% perda)
              </div>

              <div className="border rounded-xl divide-y max-h-60 overflow-y-auto">
                {listaMateriaisModal.itens.map((it, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-foreground block">{it.nome}</span>
                      {it.observacao && (
                        <span className="text-[11px] text-muted-foreground">{it.observacao}</span>
                      )}
                    </div>
                    <Badge variant="outline" className="font-mono font-bold text-primary">
                      {it.quantidade} {it.unidade}
                    </Badge>
                  </div>
                ))}
              </div>

              {listaSalvaSucesso && (
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold text-center">
                  ✓ Lista salva com sucesso em Documentos!
                </div>
              )}

              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={compartilharListaWhatsApp}
                  className="font-bold text-xs gap-1.5 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                >
                  <Share2 className="w-4 h-4" />
                  WhatsApp
                </Button>
                <Button
                  size="sm"
                  onClick={salvarListaNosDocumentos}
                  disabled={salvandoLista || listaSalvaSucesso}
                  className="font-bold text-xs gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  {listaSalvaSucesso ? 'Salvo em Documentos' : 'Salvar em Documentos'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Calculadora
