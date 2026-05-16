'use client'

import { Toaster as SonnerToaster } from 'sonner'

export function Toaster({ position = 'top-right', theme = 'dark', ...props }: React.ComponentProps<typeof SonnerToaster>) {
  return <SonnerToaster position={position} theme={theme} {...props} />
}

export { toast } from 'sonner'

export default Toaster
