import * as React from 'react'
import { Input } from './input'
import type { InputProps } from './input'

interface MaskedInputProps extends Omit<InputProps, 'onChange' | 'value'> {
  value: string
  onChange: (masked: string, raw: string) => void
  mask: (value: string) => string
  rawValue?: (masked: string) => string
}

export const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ value, onChange, mask, rawValue, ...props }, ref) => {
    function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
      const masked = mask(e.target.value)
      const raw = rawValue ? rawValue(masked) : masked.replace(/\D/g, '')
      onChange(masked, raw)
    }

    return <Input ref={ref} value={value} onChange={handleChange} {...props} />
  }
)
MaskedInput.displayName = 'MaskedInput'
