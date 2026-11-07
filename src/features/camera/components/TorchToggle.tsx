import { FlashlightIcon, FlashlightOffIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const UNSUPPORTED_REASON = 'Torch not available on this camera or browser'

type TorchToggleProps = {
  /** The camera is live; before that the torch state is unknown. */
  ready: boolean
  /** null while the camera's torch support is still being detected. */
  supported: boolean | null
  on: boolean
  pending: boolean
  onToggle: () => void
}

export const TorchToggle = ({
  ready,
  supported,
  on,
  pending,
  onToggle,
}: TorchToggleProps) => {
  if (!ready || supported === null) {
    return (
      <Button variant="ghost" className="size-11" aria-label="Torch" disabled>
        <FlashlightOffIcon className="size-5" />
      </Button>
    )
  }

  if (!supported) {
    // Stays in place and explains itself on hover (tooltip) or tap (toast),
    // rather than disappearing when switching to a camera without a torch.
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              className="size-11 opacity-50"
              aria-label="Torch unavailable"
              aria-disabled="true"
              onClick={() => toast.info(UNSUPPORTED_REASON)}
            />
          }
        >
          <FlashlightOffIcon className="size-5" />
        </TooltipTrigger>
        <TooltipContent>{UNSUPPORTED_REASON}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Button
      variant="ghost"
      aria-label="Torch"
      aria-pressed={on}
      disabled={pending}
      onClick={onToggle}
      className={cn(
        'size-11',
        on && 'bg-amber-400 text-black hover:bg-amber-300 hover:text-black',
      )}
    >
      {on ? (
        <FlashlightIcon className="size-5" />
      ) : (
        <FlashlightOffIcon className="size-5" />
      )}
    </Button>
  )
}
