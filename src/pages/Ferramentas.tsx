import React, { useState } from 'react'
import * as MathEngine from '@/lib/mathEngine'
import { Wrench, Divide, Percent, ArrowLeftRight, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

export const Ferramentas: React.FC = () => {
  // Regra de três: A está para B assim como C está para X
  const [ra, setRa] = useState('10')
  const [rb, setRb] = useState('5')
  const [rc, setRc] = useState('20')

  // Porcentagem: X% de Y
  const [pctValor, setPctValor] = useState('1500')
  const [pctPorcento, setPctPorcento] = useState('15')

  // Margem e Desconto
  const [custoBase, setCustoBase] = useState('1000')
  const [margemPct, setMargemPct] = useState('30')

  // Conversão de unidades
  const [convVal, setConvVal] = useState('2500')
  const [convDe, setConvDe] = useState<MathEngine.UnidadeComprimento>('mm')
  const [convPara, setConvPara] = useState<MathEngine.UnidadeComprimento>('m')

  const resRegra = MathEngine.calcularRegraDeTres(
    parseFloat(ra) || 1,
    parseFloat(rb) || 0,
    parseFloat(rc) || 0,
  )

  const resPct = MathEngine.calcularPorcentagem(
    parseFloat(pctValor) || 0,
    parseFloat(pctPorcento) || 0,
  )

  const resMargem = MathEngine.calcularMargemLucro(
    parseFloat(custoBase) || 0,
    parseFloat(margemPct) || 0,
  )

  const resConv = MathEngine.converterComprimento(parseFloat(convVal) || 0, convDe, convPara)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Wrench className="w-6 h-6 text-primary" />
            FERRAMENTAS MATEMÁTICAS RÁPIDAS
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Regra de três, porcentagem, margem sobre custo e conversões métricas.
          </p>
        </div>
      </div>

      <Tabs defaultValue="regra" className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-12 p-1 bg-muted/60 rounded-xl">
          <TabsTrigger value="regra" className="font-bold text-xs">
            Regra de Três
          </TabsTrigger>
          <TabsTrigger value="porcentagem" className="font-bold text-xs">
            Porcentagem
          </TabsTrigger>
          <TabsTrigger value="margem" className="font-bold text-xs">
            Margem de Lucro
          </TabsTrigger>
          <TabsTrigger value="conversor" className="font-bold text-xs">
            Conversor Métrico
          </TabsTrigger>
        </TabsList>

        {/* 1. Regra de três */}
        <TabsContent value="regra" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Divide className="w-5 h-5 text-primary" />
                  Regra de Três Direta
                </CardTitle>
                <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                  CÁLCULO EXATO
                </Badge>
              </div>
              <CardDescription>
                Ex: Se 10 m² gastam 5 sacos de cimento, quanto gastarão 20 m²?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Se Valor A:</Label>
                  <Input type="number" value={ra} onChange={(e) => setRa(e.target.value)} />
                </div>
                <div>
                  <Label>Equivale a B:</Label>
                  <Input type="number" value={rb} onChange={(e) => setRb(e.target.value)} />
                </div>
                <div>
                  <Label>Então C:</Label>
                  <Input type="number" value={rc} onChange={(e) => setRc(e.target.value)} />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
                <span className="text-xs font-bold text-primary block uppercase">Resultado X:</span>
                <span className="text-3xl font-black text-foreground">{resRegra.valor}</span>
                <p className="text-xs text-muted-foreground mt-1 font-mono">{resRegra.formula}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Porcentagem */}
        <TabsContent value="porcentagem" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Percent className="w-5 h-5 text-primary" />
                  Cálculo de Porcentagem Simples
                </CardTitle>
                <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                  CÁLCULO EXATO
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor Base (R$ ou unidades)</Label>
                  <Input
                    type="number"
                    value={pctValor}
                    onChange={(e) => setPctValor(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Porcentagem (%)</Label>
                  <Input
                    type="number"
                    value={pctPorcento}
                    onChange={(e) => setPctPorcento(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
                <span className="text-xs font-bold text-primary block uppercase">Resultado:</span>
                <span className="text-3xl font-black text-foreground">{resPct.valor}</span>
                <p className="text-xs text-muted-foreground mt-1 font-mono">{resPct.formula}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Margem de lucro */}
        <TabsContent value="margem" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Percent className="w-5 h-5 text-primary" />
                  Margem de Lucro sobre Custo
                </CardTitle>
                <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                  CÁLCULO EXATO
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Custo dos Serviços e Materiais (R$)</Label>
                  <Input
                    type="number"
                    value={custoBase}
                    onChange={(e) => setCustoBase(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Margem de Lucro Desejada (%)</Label>
                  <Input
                    type="number"
                    value={margemPct}
                    onChange={(e) => setMargemPct(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-muted/50 border">
                  <span className="text-xs text-muted-foreground block">Lucro Bruto Adicional</span>
                  <span className="text-xl font-bold text-emerald-600">
                    R$ {resMargem.valor.lucro.toFixed(2)}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
                  <span className="text-xs text-primary font-bold block">Preço Final Sugerido</span>
                  <span className="text-2xl font-black text-foreground">
                    R$ {resMargem.valor.precoVenda.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Conversor métrico */}
        <TabsContent value="conversor" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-primary" />
                  Conversor de Medidas
                </CardTitle>
                <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                  CÁLCULO EXATO
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Valor</Label>
                  <Input
                    type="number"
                    value={convVal}
                    onChange={(e) => setConvVal(e.target.value)}
                  />
                </div>
                <div>
                  <Label>De</Label>
                  <select
                    value={convDe}
                    onChange={(e) => setConvDe(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="mm">Milímetros (mm)</option>
                    <option value="cm">Centímetros (cm)</option>
                    <option value="m">Metros (m)</option>
                    <option value="km">Quilômetros (km)</option>
                  </select>
                </div>
                <div>
                  <Label>Para</Label>
                  <select
                    value={convPara}
                    onChange={(e) => setConvPara(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="mm">Milímetros (mm)</option>
                    <option value="cm">Centímetros (cm)</option>
                    <option value="m">Metros (m)</option>
                    <option value="km">Quilômetros (km)</option>
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
                <span className="text-xs font-bold text-primary block uppercase">Conversão:</span>
                <span className="text-3xl font-black text-foreground">
                  {resConv.valor} {convPara}
                </span>
                <p className="text-xs text-muted-foreground mt-1 font-mono">{resConv.formula}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Ferramentas
