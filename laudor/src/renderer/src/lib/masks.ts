export function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

// CNPJ: supports both numeric (old) and alphanumeric (new format, July 2026)
export function maskCNPJ(value: string): string {
  const cleaned = value.replace(/[^0-9A-Za-z]/g, '').toUpperCase().slice(0, 14)
  if (cleaned.length <= 2) return cleaned
  if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`
  if (cleaned.length <= 8) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`
  if (cleaned.length <= 12)
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8)}`
  return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`
}

export function maskCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits.length ? `(${digits}` : ''
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  // Mobile: 9 digits after DDD → (XX) 9XXXX-XXXX
  // Landline: 8 digits after DDD → (XX) XXXX-XXXX
  const ddd = digits.slice(0, 2)
  const rest = digits.slice(2)
  const isMobile = rest.length > 8 || rest[0] === '9'
  if (isMobile) {
    if (rest.length <= 5) return `(${ddd}) ${rest}`
    return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`
  } else {
    if (rest.length <= 4) return `(${ddd}) ${rest}`
    return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`
  }
}
