/**
 * Compressão de imagens localmente no navegador (Canvas HTML5)
 * Funciona 100% offline antes de qualquer salvamento no IndexedDB ou envio à nuvem.
 */

export interface OpcoesCompressao {
  maxWidth?: number
  maxHeight?: number
  quality?: number // 0.1 a 1.0
  mimeType?: 'image/jpeg' | 'image/webp'
}

export interface ResultadoCompressao {
  base64: string
  tamanhoOriginalBytes: number
  tamanhoComprimidoBytes: number
  largura: number
  altura: number
}

/**
 * Comprime um File de imagem retornando a string base64 e métricas de redução
 */
export async function comprimirImagemOffline(
  arquivo: File | Blob,
  opcoes: OpcoesCompressao = {},
): Promise<ResultadoCompressao> {
  const { maxWidth = 1280, maxHeight = 1280, quality = 0.75, mimeType = 'image/jpeg' } = opcoes

  const tamanhoOriginalBytes = arquivo.size

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        let largura = img.width
        let altura = img.height

        // Redimensionamento proporcional respeitando limites máximos
        if (largura > maxWidth || altura > maxHeight) {
          const ratioLargura = maxWidth / largura
          const ratioAltura = maxHeight / altura
          const ratio = Math.min(ratioLargura, ratioAltura)

          largura = Math.round(largura * ratio)
          altura = Math.round(altura * ratio)
        }

        const canvas = document.createElement('canvas')
        canvas.width = largura
        canvas.height = altura

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Não foi possível obter contexto do canvas'))
          return
        }

        // Fundo branco caso haja transparência (PNG convertido para JPEG)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, largura, altura)

        ctx.drawImage(img, 0, 0, largura, altura)

        const base64Comprimido = canvas.toDataURL(mimeType, quality)
        // Estima tamanho em bytes a partir da string base64
        const tamanhoComprimidoBytes = Math.round(
          (base64Comprimido.length - (base64Comprimido.indexOf(',') + 1)) * 0.75,
        )

        resolve({
          base64: base64Comprimido,
          tamanhoOriginalBytes,
          tamanhoComprimidoBytes,
          largura,
          altura,
        })
      }

      img.onerror = () => {
        reject(new Error('Falha ao processar arquivo de imagem'))
      }

      img.src = e.target?.result as string
    }

    reader.onerror = () => {
      reject(new Error('Falha ao ler arquivo de imagem'))
    }

    reader.readAsDataURL(arquivo)
  })
}
