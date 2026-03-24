import { Droppable } from '@hello-pangea/dnd'
import { KanbanCard } from './KanbanCard'
import type { KanbanCard as KanbanCardType, ApplicationStage } from '@/types'
import { clsx } from 'clsx'

interface KanbanColumnProps {
  stage: ApplicationStage
  cards: KanbanCardType[]
  onCardClick?: (card: KanbanCardType) => void
}

const stageConfig: Partial<Record<ApplicationStage, { label: string; color: string }>> = {
  applied: { label: 'Applied', color: '#6c47ff' },
  screening: { label: 'Shortlisted', color: '#f59e0b' },
  interview: { label: 'In Interview', color: '#00d4c8' },
  interviewed: { label: 'Interviewed', color: '#8b5cf6' },
  offer: { label: 'Offer / Hired', color: '#10b981' },
  rejected: { label: 'Rejected', color: '#ef4444' },
}

export function KanbanColumn({ stage, cards, onCardClick }: KanbanColumnProps) {
  const config = stageConfig[stage] || { label: stage, color: '#ccc' }

  return (
    <div 
      className="flex flex-col flex-1 min-w-[200px] rounded-xl bg-[var(--bg2)] dark:bg-[var(--glass)] border border-gray-200 dark:border-[var(--glass-border)]"
      style={{ borderTop: `4px solid ${config.color}` }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200 dark:border-[var(--glass-border)]">
        <div 
          className="w-2 h-2 rounded-full" 
          style={{ backgroundColor: config.color }} 
        />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{config.label}</span>
        <span className="ml-auto text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full px-2 py-0.5 font-medium">
          {cards.length}
        </span>
      </div>

      {/* Droppable area */}
      <Droppable droppableId={stage}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={clsx(
              'flex-1 p-2 space-y-2 min-h-24 transition-colors duration-150',
              snapshot.isDraggingOver && 'bg-violet-50 dark:bg-violet-900/10'
            )}
          >
            {cards.map((card, idx) => (
              <KanbanCard
                key={card.id}
                card={card}
                index={idx}
                onClick={() => onCardClick?.(card)}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}
