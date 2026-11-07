import { useRef, type ComponentProps } from 'react'
import { Button } from '@/components/ui/button'

type UploadButtonProps = Omit<ComponentProps<typeof Button>, 'onClick'> & {
  onFile: (file: File) => void
}

/** A button that opens the system photo/file picker for a single image. */
export const UploadButton = ({ onFile, ...buttonProps }: UploadButtonProps) => {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          // Allow picking the same file again later.
          event.target.value = ''
          if (file) onFile(file)
        }}
      />
      <Button {...buttonProps} onClick={() => inputRef.current?.click()} />
    </>
  )
}
