import { randomFillSync } from 'crypto'

Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: (buffer: any) => randomFillSync(buffer),
  },
})
