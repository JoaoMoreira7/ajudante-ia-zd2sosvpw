import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  Building2,
  Mail,
  MapPin,
  Lock,
  Database,
  EyeOff,
  UserCheck,
  HardHat,
  ArrowLeft,
  CheckCircle2,
  Mic,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export const Privacidade: React.FC = () => {
  useEffect(() => {
    document.title = 'Política de Privacidade — Ajudante IA'
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
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Privacidade & Proteção de Dados (LGPD)
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                Política de Privacidade
              </h1>
            </div>
          </div>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            No <strong>Ajudante IA</strong>, nós respeitamos o seu trabalho e a sua privacidade.
            Esta política foi escrita em português simples e direto, para que você entenda
            exatamente quais dados coletamos, por que precisamos deles e como os protegemos no seu
            dia a dia de obra.
          </p>

          {/* Dados do Titular em destaque no topo */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-2 text-xs sm:text-sm">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Building2 className="w-4 h-4 text-primary shrink-0" />
              <span>Controlador dos Dados Pessoais (Titular):</span>
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
              Encarregado de Dados (DPO) / Contato:{' '}
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

      {/* Seção 1: Quais dados são coletados */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-black text-sm">
              1
            </div>
            <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              Quais Dados Nós Coletamos
            </h2>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Coletamos apenas o que é estritamente necessário para o aplicativo funcionar e ajudar
            você no canteiro:
          </p>

          <div className="space-y-3 text-sm text-foreground">
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-1">
              <strong className="text-foreground block">a) Dados de Cadastro</strong>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Seu nome completo ou nome profissional, endereço de e-mail e uma senha protegida
                (criptografada) para você acessar sua conta.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-1">
              <strong className="text-foreground block">
                b) Conteúdo Criado por Você no Trabalho
              </strong>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Dados das suas obras, cadastro dos seus clientes (nome, telefone e endereço da
                obra), orçamentos gerados, lançamentos financeiros (gastos com material, mão de obra
                e recebimentos), tarefas da equipe, fotos com legenda do canteiro e anotações do
                diário de obra.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-1">
              <strong className="text-foreground block">c) Voz e Mensagens com o Assistente</strong>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                O áudio que você grava pelo microfone e os comandos de texto que você envia ao
                assistente para registrar contas, calcular materiais ou pedir resumos do dia.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-1">
              <strong className="text-foreground block">d) Dados Básicos de Uso</strong>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Informações técnicas do aparelho (tipo de navegador, resolução da tela e registros
                de erros) para manter o sistema estável e corrigir falhas rapidamente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção 2: Para que servem esses dados */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-black text-sm">
              2
            </div>
            <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              Para Que Servem os Seus Dados
            </h2>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Usamos as informações cadastradas para finalidades claras e legítimas:
          </p>

          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Fazer o app funcionar:</strong> permitir que você consulte suas obras, edite
                orçamentos e veja quanto tem a receber de cada cliente.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Histórico buscável:</strong> guardar seus registros para você encontrar na
                hora qualquer cálculo ou nota antiga quando precisar.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Resumos e relatórios de obra:</strong> gerar relatórios em PDF, recibos e
                ordens de serviço prontos para enviar pelo WhatsApp aos seus clientes.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Atendimento e suporte:</strong> resolver dúvidas e problemas técnicos que
                você solicitar por e-mail ou WhatsApp.
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Seção 3: Onde ficam os dados e processamento de voz */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              Onde Ficam os Dados e Processamento de Voz
            </h2>
          </div>

          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-1.5">
              <span className="font-bold text-foreground flex items-center gap-2">
                📱 Prioritariamente no seu aparelho (Offline-First)
              </span>
              <p className="text-xs sm:text-sm">
                A maior parte dos seus registros fica salva diretamente na memória local do seu
                celular ou computador. Se você estiver num subsolo ou canteiro sem internet, você
                continua trabalhando normalmente. Quando o aparelho reconecta, os dados são
                sincronizados com a nuvem do nosso provedor seguro de hospedagem para não haver
                perda caso você troque de celular.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-1.5">
              <span className="font-bold text-foreground flex items-center gap-2">
                <Mic className="w-4 h-4 text-primary" /> Processamento de Áudio e Voz
              </span>
              <p className="text-xs sm:text-sm">
                Quando você aperta o botão de microfone, o áudio é processado para interpretar o seu
                pedido (ex: &ldquo;comprei 10 sacos de cimento na obra do Marcos&rdquo;). Sempre que
                possível, o reconhecimento é feito de forma local e rápida no próprio aparelho.
                Apenas interpretações complexas de linguagem são enviadas aos modelos de
                inteligência artificial na nuvem para extrair os itens com precisão. O áudio não é
                utilizado para espionagem ou anúncios.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção 4: O que NUNCA acontece (Garantia ao Usuário) */}
      <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-sm">
        <CardContent className="p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <EyeOff className="w-5 h-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              O Que NUNCA Acontece com Seus Dados
            </h2>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Compromisso ético e inegociável da{' '}
            <strong>QUEVRON TECNOLOGIA INOVA SIMPLES (I.S.)</strong>:
          </p>

          <ul className="space-y-2.5 text-sm text-foreground font-medium">
            <li className="flex items-start gap-2.5">
              <span className="text-emerald-600 dark:text-emerald-400 font-black">✕</span>
              <span>
                <strong>NUNCA vendemos nem alugamos</strong> seus dados, seus orçamentos ou a lista
                dos seus clientes para ninguém.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-emerald-600 dark:text-emerald-400 font-black">✕</span>
              <span>
                <strong>NUNCA fazemos publicidade para terceiros</strong> usando os dados das suas
                obras ou conversas.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-emerald-600 dark:text-emerald-400 font-black">✕</span>
              <span>
                <strong>NUNCA repassamos informações financeiras</strong> (valores de obras, custos
                e saldos) para seus ajudantes se você definir a conta como perfil Operador.
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Seção 5: Seus Direitos pela LGPD */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              Seus Direitos pela Lei Geral de Proteção de Dados (LGPD)
            </h2>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            A Lei Brasileira nº 13.709/2018 (LGPD) garante a você o controle total sobre seus dados
            pessoais. A qualquer momento você pode:
          </p>

          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                <strong>Acessar e consultar:</strong> ver todos os dados guardados em sua conta.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                <strong>Corrigir e atualizar:</strong> mudar nomes, telefones ou informações
                incorretas diretamente pelo aplicativo.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                <strong>Exportar seus dados:</strong> exportar suas vendas, orçamentos e planilhas
                em formato aberto.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                <strong>Apagar ou excluir sua conta:</strong> solicitar a exclusão definitiva dos
                seus dados dos nossos servidores a qualquer momento.
              </span>
            </li>
          </ul>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Para exercer qualquer um desses direitos, basta enviar uma mensagem direta para o e-mail{' '}
            <a
              href="mailto:jaocarloss@gmail.com"
              className="font-bold text-primary hover:underline"
            >
              jaocarloss@gmail.com
            </a>{' '}
            com o assunto <em>&ldquo;Direitos LGPD — Ajudante IA&rdquo;</em>, e responderemos em
            prazo rápido.
          </div>
        </CardContent>
      </Card>

      {/* Seção 6: Menores de Idade */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-6 sm:p-8 space-y-3">
          <div className="flex items-center gap-2.5">
            <HardHat className="w-5 h-5 text-primary" />
            <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              Menores de Idade
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O <strong>Ajudante IA</strong> é uma ferramenta profissional voltada ao mercado da
            construção civil e não é destinada a menores de 16 anos. Não coletamos intencionalmente
            dados de crianças ou adolescentes. Caso você tome conhecimento de que um menor de 16
            anos realizou cadastro sem supervisão, entre em contato conosco para que possamos
            remover o registro imediatamente.
          </p>
        </CardContent>
      </Card>

      {/* Seção 7: Segurança da Informação */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-6 sm:p-8 space-y-3">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              Segurança da Informação
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Suas senhas são guardadas de forma criptografada por meio de algoritmos de mão única
            (hashing seguro), o que significa que nem mesmo nossa equipe consegue ver a sua senha em
            texto puro. O tráfego de dados entre seu aparelho e a nuvem utiliza protocolo seguro
            HTTPS/TLS. Além disso, nosso sistema possui isolamento por usuário: cada profissional só
            acessa exclusivamente as suas próprias obras e dados.
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
                Canal do Titular e Encarregado de Dados
              </h2>
              <p className="text-xs text-muted-foreground">
                Fale conosco para qualquer dúvida sobre sua privacidade ou solicitação da LGPD.
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
                E-mail de Contato (Encarregado / DPO)
              </span>
              <a
                href="mailto:jaocarloss@gmail.com"
                className="font-bold text-primary hover:underline flex items-center gap-1.5"
              >
                <Mail className="w-4 h-4 shrink-0" />
                jaocarloss@gmail.com
              </a>
              <p className="text-xs text-muted-foreground">
                Resposta rápida para dúvidas sobre privacidade e solicitações LGPD
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
            <Link to="/termos" className="text-primary font-bold hover:underline">
              Ler os Termos de Uso →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Privacidade
