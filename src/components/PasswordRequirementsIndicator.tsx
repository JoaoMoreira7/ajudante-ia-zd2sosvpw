import React from 'react'
import { CheckCircle2 } from 'lucide-react'

export interface PasswordValidationRules {
  temOitoCaracteres: boolean
  temNumero: boolean
  senhasConferem: boolean
  isValid: boolean
}

export function validarRegrasSenha(
  password: string,
  passwordConfirm: string,
): PasswordValidationRules {
  const temOitoCaracteres = password.length >= 8
  const temNumero = /\d/.test(password)
  const senhasConferem = password.length > 0 && password === passwordConfirm
  const isValid = temOitoCaracteres && temNumero && senhasConferem

  return {
    temOitoCaracteres,
    temNumero,
    senhasConferem,
    isValid,
  }
}

export function validarEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

interface PasswordRequirementsIndicatorProps {
  password: string
  passwordConfirm: string
  className?: string
}

export const PasswordRequirementsIndicator: React.FC<PasswordRequirementsIndicatorProps> = ({
  password,
  passwordConfirm,
  className = '',
}) => {
  const { temOitoCaracteres, temNumero, senhasConferem } = validarRegrasSenha(
    password,
    passwordConfirm,
  )

  return (
    <div
      className={`p-3 rounded-xl bg-muted/40 border border-border text-xs space-y-1.5 ${className}`}
    >
      <span className="font-bold text-muted-foreground block text-[11px] uppercase">
        Requisitos da Senha:
      </span>
      <div className="flex flex-wrap gap-3">
        <span
          className={`flex items-center gap-1.5 ${
            temOitoCaracteres ? 'text-emerald-600 font-bold' : 'text-muted-foreground'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Mínimo de 8 caracteres
        </span>
        <span
          className={`flex items-center gap-1.5 ${
            temNumero ? 'text-emerald-600 font-bold' : 'text-muted-foreground'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Contém números
        </span>
        {passwordConfirm.length > 0 && (
          <span
            className={`flex items-center gap-1.5 ${
              senhasConferem ? 'text-emerald-600 font-bold' : 'text-destructive font-bold'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {senhasConferem ? 'Senhas conferem' : 'As senhas não conferem'}
          </span>
        )}
      </div>
    </div>
  )
}
