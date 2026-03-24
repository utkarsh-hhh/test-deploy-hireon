import { Draggable } from '@hello-pangea/dnd'
import type { KanbanCard as KanbanCardType } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { Badge } from '@/components/ui/Badge'
import { timeAgo } from '@/utils/formatters'

interface KanbanCardProps {
  card: KanbanCardType
  index: number
  onClick?: () => void
}

export function KanbanCard({ card, index, onClick }: KanbanCardProps) {
  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`
            bg-white dark:bg-[var(--card-bg)] rounded-xl p-4 border border-gray-100 dark:border-[var(--card-border)]
            cursor-pointer select-none transition-all duration-200 shadow-sm
            ${snapshot.isDragging
              ? 'shadow-xl scale-105 border-violet-300 dark:border-violet-600'
              : 'hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600'
            }
          `}
        >
          <div className="mb-4">
            <p className="text-[15px] font-bold text-gray-900 dark:text-white truncate">
              {card.candidate_name}
            </p>
            {card.current_title && (
              <p className="text-[13px] text-gray-400 dark:text-gray-500 truncate mt-0.5 font-medium">
                {card.current_title}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div 
              className="bg-[#6c47ff]/10 text-[#6c47ff] px-2 py-1 rounded-lg text-[11px] font-bold"
              style={{ letterSpacing: '0.2px' }}
            >
              {card.match_score}%
            </div>
            <div className="opacity-80">
              <Avatar name={card.candidate_name} size="xs" />
            </div>
          </div>
        </div>
      )}
    </Draggable>
  )
}
