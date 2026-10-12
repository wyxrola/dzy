export type PetPose = 'map' | 'together' | 'peek' | 'sleep'

interface PetPairProps {
  className?: string
  compact?: boolean
  pose?: PetPose
}

export function PetPair({ className = '', compact = false, pose = 'together' }: PetPairProps) {
  return (
    <div
      className={`pet-pair pet-pair--${pose} ${compact ? 'pet-pair--compact' : ''} ${className}`}
      role="img"
      aria-label="一起旅行的小白猫和棕白边牧"
    >
      <span className="pet-pair__sprite" aria-hidden="true" />
    </div>
  )
}

