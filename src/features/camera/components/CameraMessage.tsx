import {
  CameraIcon,
  CameraOffIcon,
  ImageUpIcon,
  RotateCcwIcon,
} from 'lucide-react'
import { UploadButton } from '@/components/UploadButton'
import { Button } from '@/components/ui/button'
import type { CameraError } from '../lib/cameraErrors'

type CameraMessageProps = {
  onUpload: (file: File) => void
} & (
  | { variant: 'prompt'; onStart: () => void }
  | { variant: 'error'; error: CameraError; onRetry: () => void }
)

/** The permission explainer and every camera error, each with a way forward. */
export const CameraMessage = (props: CameraMessageProps) => {
  const isPrompt = props.variant === 'prompt'
  const Icon = isPrompt ? CameraIcon : CameraOffIcon
  const title = isPrompt ? 'Allow camera access' : props.error.title
  const message = isPrompt
    ? 'Photos are taken and annotated on this device; nothing is uploaded anywhere.'
    : props.error.message

  return (
    <div
      role={isPrompt ? undefined : 'alert'}
      className="mx-auto flex max-w-sm flex-col items-center gap-4 p-6 text-center"
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-white/10">
        <Icon className="size-7" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-white/70">{message}</p>
      </div>
      <div className="flex w-full flex-col gap-2">
        {isPrompt && (
          <Button size="lg" className="h-11" onClick={props.onStart}>
            <CameraIcon />
            Start camera
          </Button>
        )}
        {!isPrompt && props.error.canRetry && (
          <Button size="lg" className="h-11" onClick={props.onRetry}>
            <RotateCcwIcon />
            Try again
          </Button>
        )}
        <UploadButton
          variant="outline"
          size="lg"
          className="h-11"
          onFile={props.onUpload}
        >
          <ImageUpIcon />
          Upload a photo
        </UploadButton>
      </div>
    </div>
  )
}
