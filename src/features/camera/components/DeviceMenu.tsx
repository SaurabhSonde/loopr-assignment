import { CameraIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { MainBackCamera } from '../cameraStore'
import { describeCamera } from '../lib/mainCamera'

const AUTOMATIC = 'automatic'

type DeviceMenuProps = {
  devices: MediaDeviceInfo[]
  activeDeviceId: string | null
  /** No camera picked by hand: the main back camera is chosen automatically. */
  automatic: boolean
  mainBackCamera: MainBackCamera | null
  /** A device id, or null for automatic. */
  onSelect: (deviceId: string | null) => void
}

/** Lets users pick a specific lens or webcam when there are more than two. */
export const DeviceMenu = ({
  devices,
  activeDeviceId,
  automatic,
  mainBackCamera,
  onSelect,
}: DeviceMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger
      render={
        <Button
          variant="ghost"
          className="size-11"
          aria-label="Choose camera"
        />
      }
    >
      <CameraIcon className="size-5" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-auto min-w-64">
      <DropdownMenuGroup>
        <DropdownMenuLabel>Camera</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={automatic ? AUTOMATIC : (activeDeviceId ?? '')}
          onValueChange={(value) =>
            onSelect(value === AUTOMATIC ? null : String(value))
          }
        >
          <DropdownMenuRadioItem value={AUTOMATIC}>
            Automatic (main back camera)
          </DropdownMenuRadioItem>
          <DropdownMenuSeparator />
          {devices.map((device, index) => (
            <DropdownMenuRadioItem
              key={device.deviceId}
              value={device.deviceId}
            >
              {describeCamera(
                device,
                index,
                mainBackCamera?.summaries[device.deviceId],
                mainBackCamera?.deviceId === device.deviceId,
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>
)
