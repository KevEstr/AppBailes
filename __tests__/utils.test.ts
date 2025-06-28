import { cn, generateId, formatCurrency } from '../lib/utils'

describe('Utilidades del Sistema', () => {
  describe('Función cn', () => {
    test('debe combinar clases correctamente', () => {
      const result = cn('class1', 'class2')
      expect(result).toContain('class1')
      expect(result).toContain('class2')
    })

    test('debe manejar clases condicionales', () => {
      const result = cn('base', true && 'show', false && 'hidden')
      expect(result).toContain('base')
      expect(result).toContain('show')
      expect(result).not.toContain('hidden')
    })
  })

  describe('Generación de IDs', () => {
    test('debe generar un ID único', () => {
      const id = generateId()
      expect(id).toBeDefined()
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(5)
    })

    test('debe generar IDs diferentes', () => {
      const id1 = generateId()
      const id2 = generateId()
      expect(id1).not.toBe(id2)
    })
  })

  describe('Formateo de moneda', () => {
    test('debe formatear números correctamente', () => {
      const result = formatCurrency(1000)
      expect(result).toMatch(/\$/)
      expect(result).toContain('1')
    })

    test('debe manejar cero', () => {
      const result = formatCurrency(0)
      expect(result).toContain('0')
      expect(result).toContain('$')
    })

    test('debe formatear números grandes', () => {
      const result = formatCurrency(1000000)
      expect(result).toContain('1.000.000')
    })
  })
}) 