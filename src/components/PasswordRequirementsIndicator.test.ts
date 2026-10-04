import { describe, it, expect } from 'vitest'
import { validarRegrasSenha, validarEmail } from './PasswordRequirementsIndicator'

describe('Validação de Recuperação e Redefinição de Senha', () => {
  describe('Validação de E-mail', () => {
    it('deve aceitar e-mails válidos padrão', () => {
      expect(validarEmail('mestre@obra.com.br')).toBe(true)
      expect(validarEmail('carlos.silva@gmail.com')).toBe(true)
      expect(validarEmail('ajudante+teste@empresa.com')).toBe(true)
    })

    it('deve rejeitar e-mails mal formatados ou vazios', () => {
      expect(validarEmail('')).toBe(false)
      expect(validarEmail('   ')).toBe(false)
      expect(validarEmail('sem_arroba.com')).toBe(false)
      expect(validarEmail('usuario@')).toBe(false)
      expect(validarEmail('@dominio.com')).toBe(false)
      expect(validarEmail('usuario@dominio')).toBe(false)
    })
  })

  describe('Validação de Senha Forte e Confirmação', () => {
    it('deve rejeitar senhas com menos de 8 caracteres', () => {
      const res = validarRegrasSenha('1234567', '1234567')
      expect(res.temOitoCaracteres).toBe(false)
      expect(res.temNumero).toBe(true)
      expect(res.senhasConferem).toBe(true)
      expect(res.isValid).toBe(false)
    })

    it('deve rejeitar senhas sem nenhum dígito numérico', () => {
      const res = validarRegrasSenha('senhasemnumero', 'senhasemnumero')
      expect(res.temOitoCaracteres).toBe(true)
      expect(res.temNumero).toBe(false)
      expect(res.senhasConferem).toBe(true)
      expect(res.isValid).toBe(false)
    })

    it('deve rejeitar quando a confirmação for diferente da nova senha', () => {
      const res = validarRegrasSenha('SenhaObra2025', 'OutraSenha2025')
      expect(res.temOitoCaracteres).toBe(true)
      expect(res.temNumero).toBe(true)
      expect(res.senhasConferem).toBe(false)
      expect(res.isValid).toBe(false)
    })

    it('deve aprovar quando tem pelo menos 8 dígitos, contém número e senhas conferem', () => {
      const res = validarRegrasSenha('ObraSegura123', 'ObraSegura123')
      expect(res.temOitoCaracteres).toBe(true)
      expect(res.temNumero).toBe(true)
      expect(res.senhasConferem).toBe(true)
      expect(res.isValid).toBe(true)
    })

    it('deve lidar corretamente com senhas vazias', () => {
      const res = validarRegrasSenha('', '')
      expect(res.temOitoCaracteres).toBe(false)
      expect(res.temNumero).toBe(false)
      expect(res.senhasConferem).toBe(false)
      expect(res.isValid).toBe(false)
    })
  })
})
