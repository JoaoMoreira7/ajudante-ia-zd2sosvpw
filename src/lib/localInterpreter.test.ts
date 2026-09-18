// src/lib/localInterpreter.test.ts
// Testes unitários do interpretador local de intenções offline do Ajudante IA

import { interpretCommandLocally } from './localInterpreter'

export function runInterpreterTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0
  let failed = 0
  const errors: string[] = []

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++
    } else {
      failed++
      errors.push(`INTERPRET FAILED: ${msg}`)
    }
  }

  // 1. "Calcula uma parede de 10 por 3."
  const t1 = interpretCommandLocally('Calcula uma parede de 10 por 3.')
  assert(t1.intent === 'calc_area', 'Parede 10 por 3 deve ser calc_area')
  assert(t1.params.comprimento === 10, 'Comprimento 10')
  assert(t1.params.larguraOuAltura === 3, 'Altura 3')

  // 2. "Quanto de piso preciso para 30 metros?"
  const t2 = interpretCommandLocally('Quanto de piso preciso para 30 metros?')
  assert(t2.intent === 'calc_piso', 'Piso 30 metros deve ser calc_piso')
  assert(t2.params.areaM2 === 30, 'Área piso 30')

  // 3. "Acrescenta 10% de perda."
  const t3 = interpretCommandLocally('Acrescenta 10% de perda.')
  assert(t3.intent === 'aplicar_perda', 'Acrescenta 10% de perda deve ser aplicar_perda')
  assert(t3.params.perdaPct === 10, 'Perda 10%')

  // 4. "Tira a porta de 80 por 210."
  const t4 = interpretCommandLocally('Tira a porta de 80 por 210.')
  assert(t4.intent === 'descontar_abertura', 'Tira porta de 80 por 210')
  assert(t4.params.largura === 0.8, 'Largura 80cm convertida para 0.8m')
  assert(t4.params.altura === 2.1, 'Altura 210cm convertida para 2.1m')

  // 5. "Quanto vou gastar?" / "Faz o orçamento."
  const t5 = interpretCommandLocally('Faz o orçamento.')
  assert(t5.intent === 'criar_orcamento', 'Faz orçamento')

  // 6. "Manda para o cliente."
  const t6 = interpretCommandLocally('Manda para o cliente.')
  assert(t6.intent === 'enviar_cliente', 'Mandar para o cliente')

  // 7. "Registra o pagamento."
  const t7 = interpretCommandLocally('Registra o pagamento de 1500 reais')
  assert(t7.intent === 'registrar_entrada', 'Registrar pagamento')

  // 8. "Quanto falta receber?"
  const t8 = interpretCommandLocally('Quanto falta receber?')
  assert(t8.intent === 'consultar_a_receber', 'Quanto falta receber')

  // 9. "Registra essa despesa."
  const t9 = interpretCommandLocally('Registra essa despesa de 350')
  assert(t9.intent === 'registrar_saida', 'Registrar despesa')

  // 10. "Mostra minhas obras."
  const t10 = interpretCommandLocally('Mostra minhas obras.')
  assert(t10.intent === 'listar_obras', 'Mostra minhas obras')

  // 11. "Abre a obra do Carlos."
  const t11 = interpretCommandLocally('Abre a obra do Carlos.')
  assert(t11.intent === 'abrir_obra_nome', 'Abre obra do Carlos')
  assert(t11.params.nomeObraOuCliente === 'carlos.', 'Nome da obra carlos')

  // 12. "O que está acabando?" / "Faz uma lista de material."
  const t12 = interpretCommandLocally('O que está acabando?')
  assert(t12.intent === 'estoque_consultar_acabando', 'Estoque acabando')

  const t13 = interpretCommandLocally('Faz uma lista de material.')
  assert(t13.intent === 'gerar_lista_compras', 'Lista de compras')

  // 13. "Desfaz."
  const t14 = interpretCommandLocally('Desfaz.')
  assert(t14.intent === 'acao_desfazer', 'Desfazer comando')

  // 14. "Tenho 15 sacos de cimento"
  const t15 = interpretCommandLocally('Tenho 15 sacos de cimento')
  assert(t15.intent === 'estoque_adicionar', 'Tenho 15 sacos')
  assert(t15.params.quantidade === 15, 'Quantidade 15')

  // 15. "Baixa 5 sacos de cimento"
  const t16 = interpretCommandLocally('Baixa 5 sacos de cimento')
  assert(t16.intent === 'estoque_baixar', 'Baixa 5 sacos')
  assert(t16.params.quantidade === 5, 'Quantidade 5')

  return { passed, failed, errors }
}
