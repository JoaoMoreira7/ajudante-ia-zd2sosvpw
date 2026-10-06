import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  ShieldCheck,
  Building2,
  Mail,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  CreditCard,
  Scale,
  ArrowLeft,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export const Termos: React.FC = () => {
  useEffect(() => {
    document.title = 'Termos de Uso — Ajudante IA'
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-8 space-y-6">
      {/* Botão de retorno e identificador de documento */}
      <div className="flex items-center justify-between gap-3">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-2 font-bold text-xs">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Início
          </Button>
        </Link>
        <Badge variant="outline" className="text-xs font-semibold">
          Última atualização: Outubro de 2026
        </Badge>
      </div>

      {/* Cartão Cabeçalho Principal */}
      <Card className="border-primary/20 bg-card shadow-sm">
        <CardContent className="p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-primary">
                Documento Legal Oficial
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                Termos de Uso
              </h1>
            </div>
          </div>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Bem-vindo ao <strong>Ajudante IA</strong>, o assistente digital feito especialmente para
            quem constrói. Este documento explica de forma direta e sem rodeios as regras para você
            usar o aplicativo com segurança e tranquilidade na sua obra.
          </p>

          {/* Dados do Titular em destaque no topo */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-2 text-xs sm:text-sm">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Building2 className="w-4 h-4 text-primary shrink-0" />
              <span>Titular e Responsável pelo Aplicativo:</span>
            </div>
            <p className="text-muted-foreground leading-relaxed pl-6">
              <strong className="text-foreground">QUEVRON TECNOLOGIA INOVA SIMPLES (I.S.)</strong>
              <br />
              CNPJ:{' '}
              <span className="font-mono text-foreground font-semibold">69.482.315/0001-19</span>
              <br />
              Endereço: R MOGI MIRIM, S/N — CH São José, Bairro Bela Vista, Águas de Lindoia/SP, CEP
              13.942-190
              <br />
              Contato por e-mail:{' '}
              <a
                href="mailto:jaocarloss@gmail.com"
                className="text-primary font-semibold hover:underline"
              >
                jaocarloss@gmail.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Seção 1: O que é o Ajudante IA */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-black text-sm">
              1
            </div>
            <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              O que é o Ajudante IA
            </h2>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            O <strong>Ajudante IA</strong> é um aplicativo PWA (que funciona no celular e no
            computador) criado para ajudar pedreiros, mestres de obras, empreiteiros e construtores
            a organizar o canteiro de obras.
          </p>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Com o aplicativo você pode:
          </p>

          <ul className="space-y-2 text-sm text-foreground">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Fazer perguntas e dar comandos por <strong>voz ou texto</strong> direto da obra.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Calcular materiais de construção (tijolos, cimento, areia, brita, argamassa,
                contrapiso, reboco, pintura e telhado).
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>Montar orçamentos, emitir recibos e ordens de serviço.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>Controlar entradas, saídas e saldo financeiro de cada obra.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>Registrar diário de obra com fotos, tarefas e lembretes da equipe.</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Seção 2: Período de Avaliação (Trial) e Planos de Assinatura */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-black text-sm">
              2
            </div>
            <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              Avaliação Gratuita e Planos
            </h2>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Todo novo cadastro tem direito a <strong>7 dias de teste grátis (trial)</strong>, sem
            compromisso, para você experimentar os recursos na sua obra.
          </p>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Após o período de teste, você pode escolher o plano que melhor atende ao seu momento:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                Para Começar
              </span>
              <h3 className="font-black text-base text-foreground">Plano Essencial</h3>
              <p className="text-lg font-black text-primary">
                R$ 29,90 <span className="text-xs font-normal text-muted-foreground">/mês</span>
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Até 5 clientes, 2 obras simultâneas, 10 orçamentos/mês e 60 minutos de voz/mês.
              </p>
            </div>

            <div className="p-4 rounded-xl border-2 border-primary bg-primary/5 space-y-1.5 relative">
              <span className="text-[10px] font-black uppercase tracking-wider text-primary block">
                Mais Popular
              </span>
              <h3 className="font-black text-base text-foreground">Plano Profissional</h3>
              <p className="text-lg font-black text-primary">
                R$ 49,90 <span className="text-xs font-normal text-muted-foreground">/mês</span>
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Até 10 obras simultâneas, clientes ilimitados, 300 minutos de voz/mês, PDFs e fotos
                com geolocalização.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                Completo
              </span>
              <h3 className="font-black text-base text-foreground">Plano Empresa</h3>
              <p className="text-lg font-black text-primary">
                R$ 79,90 <span className="text-xs font-normal text-muted-foreground">/mês</span>
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Obras e áudio ilimitados, equipe com até 5 pessoas (dono + encarregados) e suporte
                prioritário.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs sm:text-sm text-emerald-950 dark:text-emerald-200 leading-relaxed font-medium">
            <strong>Regra importante:</strong> Os cálculos determinísticos da calculadora de
            construção <em>nunca são bloqueados</em>, mesmo se o seu período de assinatura vencer.
          </div>
        </CardContent>
      </Card>

      {/* Seção 3: Conta, Senha e Responsabilidade */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-black text-sm">
              3
            </div>
            <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              Sua Conta e Senha
            </h2>
          </div>

          <ul className="space-y-2.5 text-sm text-muted-foreground leading-relaxed">
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                Para usar o Ajudante IA, você cria uma conta com seu nome, e-mail e uma senha forte.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                <strong>Guarde sua senha com cuidado:</strong> você é responsável por qualquer ação
                realizada a partir da sua conta. Não empreste sua senha para terceiros.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                Se você esquecer sua senha, use a opção de recuperação pelo e-mail cadastrado ou
                fale com nosso suporte.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                Você pode escolher o perfil de trabalho <em>Dono / Empreiteiro</em> (com acesso
                total ao financeiro) ou <em>Operador / Encarregado</em> (que protege valores e
                custos da visualização na obra).
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Seção 4: Uso Adequado e Regras de Convivência */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-black text-sm">
              4
            </div>
            <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              Uso Adequado do Serviço
            </h2>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Você concorda em usar o Ajudante IA exclusivamente para a finalidade profissional a que
            se destina: gerenciar obras e serviços de construção civil de forma lícita e honesta.
          </p>

          <p className="text-sm text-muted-foreground leading-relaxed">
            É terminantemente proibido:
          </p>

          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc list-inside">
            <li>
              Tentar invadir o sistema, burlar limitações ou aplicar engenharia reversa no software.
            </li>
            <li>
              Usar o sistema para fraudes, emissão de documentos falsificados ou cobranças
              indevidas.
            </li>
            <li>
              Subir conteúdos ilegais, ofensivos ou que desrespeitem a privacidade de terceiros.
            </li>
            <li>Compartilhar acessos fora do limite contratado pelo seu plano.</li>
          </ul>
        </CardContent>
      </Card>

      {/* Seção 5: Os cálculos são ferramenta de apoio (Responsabilidade Técnica) */}
      <Card className="border-amber-500/30 bg-amber-500/5 shadow-sm">
        <CardContent className="p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              Cálculos como Ferramenta de Apoio
            </h2>
          </div>

          <div className="space-y-3 text-sm text-foreground leading-relaxed">
            <p>
              O Ajudante IA utiliza fórmulas matemáticas consagradas da construção civil brasileira
              para calcular materiais, rendimentos, áreas e volumes.
            </p>
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              Atenção: o aplicativo é uma <em>ferramenta de apoio e auxílio diário</em>. Ele não
              substitui o julgamento profissional, a vistoria do canteiro, os projetos de engenharia
              e as decisões do responsável técnico pela obra.
            </p>
            <p className="text-muted-foreground">
              Variações de marcas de materiais, umidade da areia, qualidade da mão de obra, perdas
              no corte e particularidades do terreno podem alterar o consumo real. O profissional
              que executa a obra continua sendo o responsável final pela conferência das quantidades
              antes da compra e pela segurança da construção.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Seção 6: Dados no aparelho (offline-first) e nuvem */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <WifiOff className="w-5 h-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              Funcionamento Offline e Sincronização em Nuvem
            </h2>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Sabemos que canteiro de obras muitas vezes fica sem sinal de internet. Por isso, o
            Ajudante IA é <strong>100% Offline-First</strong>:
          </p>

          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                Seus clientes, obras, contas e anotações são guardados prioritariamente na memória
                do seu próprio aparelho (navegador/celular).
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                Assim que o aparelho encontrar conexão com a internet (Wi-Fi ou dados móveis), as
                informações são sincronizadas com a nuvem segura do sistema, garantindo backup dos
                seus dados.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>Você não perde seus lançamentos ao ficar sem sinal no meio do dia.</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Seção 7: Assinatura, Vencimento e Cancelamento */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              Assinatura, Vencimento e Cancelamento
            </h2>
          </div>

          <ul className="space-y-2.5 text-sm text-muted-foreground leading-relaxed">
            <li className="flex items-start gap-2.5">
              <span className="font-black text-foreground shrink-0">•</span>
              <span>
                <strong>Ciclo de Cobrança:</strong> As mensalidades vencem a cada 30 dias após o
                término do período de testes ou da última renovação.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="font-black text-foreground shrink-0">•</span>
              <span>
                <strong>Formas de Pagamento:</strong> O pagamento pode ser feito via Pix, boleto
                bancário ou outros meios disponibilizados na ativação.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="font-black text-foreground shrink-0">•</span>
              <span>
                <strong>Cancelamento Simples:</strong> Você pode cancelar sua assinatura a qualquer
                momento, sem multa e sem fidelidade obrigatória, bastando solicitar ao suporte por
                e-mail ou WhatsApp.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="font-black text-foreground shrink-0">•</span>
              <span>
                <strong>Vencimento:</strong> Caso a mensalidade não seja renovada, os recursos
                avançados de nuvem e inteligência de voz podem ser suspensos temporariamente,
                mantendo-se sempre livre o acesso à calculadora básica e aos seus dados salvos no
                aparelho.
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Seção 8: Alterações nestes Termos */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-6 sm:p-8 space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
            Alterações destes Termos
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Podemos atualizar estes termos para refletir melhorias no aplicativo ou mudanças na
            legislação brasileira. Quando houver qualquer alteração importante, você receberá um
            aviso visível dentro do próprio aplicativo. Continuar usando o Ajudante IA após o aviso
            significa que você está ciente e de acordo com as melhorias.
          </p>
        </CardContent>
      </Card>

      {/* Seção 9: Legislação e Foro */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-6 sm:p-8 space-y-3">
          <div className="flex items-center gap-2.5">
            <Scale className="w-5 h-5 text-primary" />
            <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              Legislação e Foro
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Estes Termos são regidos pelas leis da República Federativa do Brasil, em especial pelo
            Código de Defesa do Consumidor e pelo Marco Civil da Internet. Fica eleito o Foro da
            Comarca de Águas de Lindoia/SP para dirimir eventuais dúvidas ou controvérsias
            decorrentes deste contrato, com renúncia a qualquer outro, por mais privilegiado que
            seja.
          </p>
        </CardContent>
      </Card>

      {/* Bloco Final de Contato e Identificação Completa */}
      <Card className="border-primary/30 bg-primary/5 shadow-sm">
        <CardContent className="p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                Dúvidas ou Fale Conosco
              </h2>
              <p className="text-xs text-muted-foreground">
                Estamos prontos para atender você de forma rápida e transparente.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs sm:text-sm">
            <div className="p-3.5 rounded-xl bg-background/80 border border-border space-y-1">
              <span className="text-[10px] font-black uppercase text-muted-foreground block">
                Razão Social
              </span>
              <p className="font-bold text-foreground">QUEVRON TECNOLOGIA INOVA SIMPLES (I.S.)</p>
              <p className="text-xs text-muted-foreground">
                CNPJ:{' '}
                <span className="font-mono font-semibold text-foreground">69.482.315/0001-19</span>
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-background/80 border border-border space-y-1">
              <span className="text-[10px] font-black uppercase text-muted-foreground block">
                Canal Oficial de Atendimento
              </span>
              <a
                href="mailto:jaocarloss@gmail.com"
                className="font-bold text-primary hover:underline flex items-center gap-1.5"
              >
                <Mail className="w-4 h-4 shrink-0" />
                jaocarloss@gmail.com
              </a>
              <p className="text-xs text-muted-foreground">
                Atendimento de segunda a sexta-feira em horário comercial
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-background/80 border border-border space-y-1 sm:col-span-2">
              <span className="text-[10px] font-black uppercase text-muted-foreground block">
                Endereço Sede
              </span>
              <p className="text-foreground flex items-start gap-2">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>
                  R MOGI MIRIM, S/N — CH São José, Bairro Bela Vista, Águas de Lindoia/SP, CEP
                  13.942-190
                </span>
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t text-xs text-muted-foreground">
            <span>Ajudante IA — Feito para quem constrói</span>
            <Link to="/privacidade" className="text-primary font-bold hover:underline">
              Ler a Política de Privacidade →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Termos
