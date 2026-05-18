export function validateCPF(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 11) return false
  if (/^(\d)\1+$/.test(digits)) return false

  const sum1 = digits.slice(0, 9).split('').reduce((acc, d, i) => acc + +d * (10 - i), 0)
  const r1 = (sum1 * 10) % 11
  const d1 = r1 >= 10 ? 0 : r1
  if (d1 !== +digits[9]) return false

  const sum2 = digits.slice(0, 10).split('').reduce((acc, d, i) => acc + +d * (11 - i), 0)
  const r2 = (sum2 * 10) % 11
  const d2 = r2 >= 10 ? 0 : r2
  return d2 === +digits[10]
}

function charVal(c: string): number {
  const code = c.toUpperCase().charCodeAt(0)
  if (code >= 48 && code <= 57) return code - 48      // '0'-'9'
  if (code >= 65 && code <= 90) return code - 65 + 10 // 'A'-'Z'
  return -1
}

// Validates both old numeric and new alphanumeric CNPJ (RFB IN 2.229/2024, effective July 2026)
export function validateCNPJ(value: string): boolean {
  const cleaned = value.replace(/[.\-\/]/g, '').toUpperCase()
  if (cleaned.length !== 14) return false
  if (/^(.)\1+$/.test(cleaned)) return false

  const base = cleaned.slice(0, 12)
  const check = cleaned.slice(12)

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const sum1 = base.split('').reduce((acc, c, i) => acc + charVal(c) * weights1[i], 0)
  const rem1 = sum1 % 11
  const d1 = rem1 < 2 ? 0 : 11 - rem1
  if (d1 !== +check[0]) return false

  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const sum2 = (base + check[0]).split('').reduce((acc, c, i) => acc + charVal(c) * weights2[i], 0)
  const rem2 = sum2 % 11
  const d2 = rem2 < 2 ? 0 : 11 - rem2
  return d2 === +check[1]
}

export function validatePhone(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  // (XX) XXXX-XXXX = 10 digits, (XX) 9XXXX-XXXX = 11 digits
  if (digits.length === 10) return /^\d{2}[2-9]\d{7}$/.test(digits)
  if (digits.length === 11) return /^\d{2}9\d{8}$/.test(digits)
  return false
}
