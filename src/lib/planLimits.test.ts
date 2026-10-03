import { describe, it, expect } from 'vitest'
import {
  verificarLimiteClientes,
  verificarLimiteObras,
  verificarLimiteOrcamentos,
  verificarPermissaoDocumentosPdf,
  verificarPermissaoDiarioVozEFotos,
  verificarPermissaoRelatoriosAvancados,
  verificarLimiteAudioMinutos,
  obterLimitesPlano,
} from './planLimits'

describe('planLimits - Regras e Aplicação de Limites dos Planos', () => {
  describe('Plano Essencial (R$ 29,90)', () => {
    it('deve ter os limites exatos do plano essencial', () => {
      const limites = obterLimitesPlano('essencial')
      expect(limites.maxClientes).toBe(5)
      expect(limites.maxObrasSimultaneas).toBe(2)
      expect(limites.maxOrcamentosMes).toBe(10)
      expect(limites.maxMinutosAudioMes).toBe(60)
      expect(limites.permitePdfDocumentos).toBe(false)
      expect(limites.permiteDiarioVoz).toBe(false)
      expect(limites.permiteFotosObra).toBe(false)
      expect(limites.maxUsuariosEquipe).toBe(1)
    })

    it('deve permitir criar clientes abaixo do limite de 5 e bloquear ao atingir', () => {
      expect(verificarLimiteClientes('essencial', 4).permitido).toBe(true)
      const bloqueio = verificarLimiteClientes('essencial', 5)
      expect(bloqueio.permitido).toBe(false)
      expect(bloqueio.planoRequerido).toBe('profissional')
      expect(bloqueio.mensagemBloqueio).toContain('limite de 5 clientes')
    })

    it('deve permitir até 2 obras simultâneas e bloquear a 3ª', () => {
      expect(verificarLimiteObras('essencial', 1).permitido).toBe(true)
      const bloqueio = verificarLimiteObras('essencial', 2)
      expect(bloqueio.permitido).toBe(false)
      expect(bloqueio.planoRequerido).toBe('profissional')
      expect(bloqueio.mensagemBloqueio).toContain('limite de 2 obras simultâneas')
    })

    it('deve permitir até 10 orçamentos por mês e bloquear o 11º', () => {
      expect(verificarLimiteOrcamentos('essencial', 9).permitido).toBe(true)
      const bloqueio = verificarLimiteOrcamentos('essencial', 10)
      expect(bloqueio.permitido).toBe(false)
      expect(bloqueio.planoRequerido).toBe('profissional')
      expect(bloqueio.mensagemBloqueio).toContain('10 orçamentos')
    })

    it('deve bloquear PDF, diário avançado e fotos no essencial, sugerindo profissional', () => {
      const pdf = verificarPermissaoDocumentosPdf('essencial')
      expect(pdf.permitido).toBe(false)
      expect(pdf.planoRequerido).toBe('profissional')

      const diario = verificarPermissaoDiarioVozEFotos('essencial', 'diario')
      expect(diario.permitido).toBe(false)
      expect(diario.planoRequerido).toBe('profissional')

      const fotos = verificarPermissaoDiarioVozEFotos('essencial', 'fotos')
      expect(fotos.permitido).toBe(false)
      expect(fotos.planoRequerido).toBe('profissional')
    })
  })

  describe('Plano Profissional (R$ 49,90)', () => {
    it('deve ter até 10 obras ativas, 300 min de áudio e orçamentos/clientes ilimitados', () => {
      const limites = obterLimitesPlano('profissional')
      expect(limites.maxClientes).toBe(-1)
      expect(limites.maxObrasSimultaneas).toBe(10)
      expect(limites.maxOrcamentosMes).toBe(-1)
      expect(limites.maxMinutosAudioMes).toBe(300)
      expect(limites.permitePdfDocumentos).toBe(true)
      expect(limites.permiteDiarioVoz).toBe(true)
      expect(limites.permiteFotosObra).toBe(true)
      expect(limites.permiteEstoqueCompras).toBe(true)
      expect(limites.permiteRelatorioWhatsApp).toBe(true)
    })

    it('deve permitir criar até 10 obras no profissional e bloquear a 11ª sugerindo empresa', () => {
      expect(verificarLimiteClientes('profissional', 150).permitido).toBe(true)
      expect(verificarLimiteObras('profissional', 9).permitido).toBe(true)
      const bloqObras = verificarLimiteObras('profissional', 10)
      expect(bloqObras.permitido).toBe(false)
      expect(bloqObras.planoRequerido).toBe('empresa')
      expect(bloqObras.mensagemBloqueio).toContain('10 obras simultâneas')
      expect(verificarLimiteOrcamentos('profissional', 200).permitido).toBe(true)
      expect(verificarPermissaoDocumentosPdf('profissional').permitido).toBe(true)
      expect(verificarPermissaoDiarioVozEFotos('profissional', 'diario').permitido).toBe(true)
    })

    it('deve bloquear relatórios executivos de empresa no profissional', () => {
      const rel = verificarPermissaoRelatoriosAvancados('profissional')
      expect(rel.permitido).toBe(false)
      expect(rel.planoRequerido).toBe('empresa')
    })
  })

  describe('Plano Empresa (R$ 79,90)', () => {
    it('deve liberar todos os recursos e até 5 usuários de equipe e áudio ilimitado', () => {
      const limites = obterLimitesPlano('empresa')
      expect(limites.maxUsuariosEquipe).toBe(5)
      expect(limites.maxObrasSimultaneas).toBe(-1)
      expect(limites.maxMinutosAudioMes).toBe(-1)
      expect(limites.relatoriosAvancados).toBe(true)
      expect(limites.suportePrioritario).toBe(true)
      expect(limites.modulosSobMedida).toBe(true)
      expect(verificarPermissaoRelatoriosAvancados('empresa').permitido).toBe(true)
    })
  })

  describe('Regras de Exceção: Trial e Módulos Liberados sob Medida', () => {
    it('se estiver em trial de 7 dias, deve liberar recursos mesmo no plano essencial', () => {
      expect(verificarLimiteClientes('essencial', 20, undefined, true).permitido).toBe(true)
      expect(verificarPermissaoDocumentosPdf('essencial', undefined, true).permitido).toBe(true)
    })

    it('se o admin tiver liberado módulo individual sob medida, deve autorizar', () => {
      const modulos = { clientes_ilimitados: true, documentos_personalizados: true }
      expect(verificarLimiteClientes('essencial', 25, modulos).permitido).toBe(true)
      expect(verificarPermissaoDocumentosPdf('essencial', modulos).permitido).toBe(true)
    })
  })

  describe('Limite de Áudio Mensal alinhado ao custo', () => {
    it('deve permitir no plano essencial até 60 minutos e bloquear acima', () => {
      const ok = verificarLimiteAudioMinutos('essencial', 45)
      expect(ok.permitido).toBe(true)

      const bloq = verificarLimiteAudioMinutos('essencial', 60)
      expect(bloq.permitido).toBe(false)
      expect(bloq.planoRequerido).toBe('profissional')
      expect(bloq.mensagemBloqueio).toContain('60 minutos')
      expect(bloq.mensagemBloqueio).toContain('cálculos matemáticos continuam funcionando')
    })

    it('deve permitir no plano profissional até 300 minutos e bloquear sugerindo empresa', () => {
      const ok = verificarLimiteAudioMinutos('profissional', 280)
      expect(ok.permitido).toBe(true)

      const bloq = verificarLimiteAudioMinutos('profissional', 300)
      expect(bloq.permitido).toBe(false)
      expect(bloq.planoRequerido).toBe('empresa')
      expect(bloq.mensagemBloqueio).toContain('300 minutos')
    })

    it('deve ser ilimitado no plano empresa', () => {
      const ok = verificarLimiteAudioMinutos('empresa', 9999)
      expect(ok.permitido).toBe(true)
    })
  })
})
