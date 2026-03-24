import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { candidatesApi } from '@/api/candidates'
import { scorecardsApi } from '@/api/scorecards'
import type { KanbanCard, Scorecard } from '@/types'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { Skeleton } from '@/components/ui/Skeleton'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { formatDate, timeAgo } from '@/utils/formatters'
import { EmptyState } from '@/components/ui/EmptyState'

function ScorecardItem({ scorecard }: { scorecard: Scorecard }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar name={scorecard.submitted_by_name ?? 'Reviewer'} size="sm" />
          <div>
            <span className="text-sm font-bold text-gray-900 dark:text-white block leading-tight">
              {scorecard.submitted_by_name ?? 'Anonymous'}
            </span>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest">{formatDate(scorecard.submitted_at)}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex text-amber-400">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg
                key={i}
                className={`w-3.5 h-3.5 ${i < scorecard.overall_rating ? 'fill-current' : 'fill-gray-200 dark:fill-gray-800'}`}
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border border-current bg-opacity-10 uppercase ${scorecard.recommendation.includes('yes') ? 'text-emerald-600 bg-emerald-50' :
            scorecard.recommendation === 'maybe' ? 'text-amber-600 bg-amber-50' : 'text-red-500 bg-red-50'
            }`}>
            {scorecard.recommendation.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {scorecard.summary && (
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed italic border-l-2 border-violet-100 dark:border-violet-900/40 pl-3">
          "{scorecard.summary}"
        </p>
      )}

      {scorecard.criteria_scores && Array.isArray(scorecard.criteria_scores) && scorecard.criteria_scores.length > 0 && (
        <div className="grid grid-cols-2 gap-2 py-1">
          {scorecard.criteria_scores.map((s, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/30 px-2 py-1.5 rounded-xl border border-gray-100 dark:border-gray-800/50">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight truncate mr-2">{s.criterion}</span>
              <div className="flex text-amber-400 flex-shrink-0">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className={`text-[10px] ${star <= s.score ? 'opacity-100' : 'opacity-20 text-gray-300 dark:text-gray-700'}`}>★</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CardDetailModal({ card, onClose }: { card: KanbanCard; onClose: () => void }) {
  const { data: scorecards, isLoading: scLoading } = useQuery({
    queryKey: ['scorecards', 'candidate', card.id],
    queryFn: () => scorecardsApi.getForApplication(card.id).then(r => r.data).catch(() => []), // Fallback to card ID as global view doesn't have application IDs yet
    refetchInterval: 30_000,
  })

  return (
    <Modal open onClose={onClose} title="Candidate Details" size="lg">
      <div className="space-y-6">
        {/* Profile Section */}
        <div className="flex items-center gap-5 p-1">
          <div className="relative">
            <Avatar name={card.candidate_name} src={card.avatar_url} size="xl" />
            <div className="absolute -bottom-1 -right-1">
              <ScoreRing score={card.match_score} size={48} strokeWidth={4} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate">{card.candidate_name}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{card.current_title || 'Software Engineer'}</p>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 font-medium tracking-tight">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {card.candidate_email}
              </span>
              <span>•</span>
              <span>Applied {formatDate(card.applied_at)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</p>
            <p className="text-sm font-bold text-violet-600 dark:text-violet-400">Active</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Last Activity</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{timeAgo(card.stage_changed_at || card.applied_at)}</p>
          </div>
        </div>

        {/* Evaluation Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-500 shadow-sm shadow-violet-200"></span>
              Interview Evaluations
            </h4>
            <span className="text-[10px] bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full font-bold">
              {scorecards?.length || 0} Submitted
            </span>
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
            {scLoading ? (
              [1, 2].map(i => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)
            ) : !scorecards || scorecards.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                <p className="text-sm text-gray-400 italic">No evaluations submitted yet.</p>
              </div>
            ) : (
              scorecards.map((sc) => <ScorecardItem key={sc.id} scorecard={sc} />)
            )}
          </div>
        </div>

        {card.recruiter_notes && (
          <div className="bg-violet-50 dark:bg-violet-950/20 rounded-2xl p-5 border border-violet-100 dark:border-violet-900/30">
            <h4 className="text-[10px] font-bold text-violet-700 dark:text-violet-400 uppercase tracking-widest mb-2">AI Summary</h4>
            <p className="text-sm text-violet-900 dark:text-violet-200 leading-relaxed font-medium">
              {card.recruiter_notes}
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}

function BoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="w-72 flex-shrink-0 space-y-3">
          <Skeleton className="h-6 w-24 rounded-lg" />
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 space-y-2 bg-white dark:bg-gray-900/50">
              <div className="flex items-center gap-2">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default function PipelinePage() {
  const [selectedCard, setSelectedCard] = useState<KanbanCard | null>(null)

  const { data: pipelineStages, isLoading } = useQuery({
    queryKey: ['candidates_pipeline'],
    queryFn: () => candidatesApi.getPipeline().then((r) => r.data),
    refetchInterval: 30_000,
  })

  const mapCandidateToCard = useCallback((c: any): KanbanCard => {
    return {
      id: c.id,
      application_id: c.application_id || c.id, // Ensure application_id is present
      candidate_name: c.full_name,
      candidate_email: c.email,
      avatar_url: c.avatar_url,
      match_score: c.match_score,
      applied_at: c.created_at,
      stage_changed_at: c.updated_at,
      recruiter_notes: c.summary,
      skills: c.skills || [],
      current_title: c.current_title,
    }
  }, [])

  const pipelineData = pipelineStages ? {
    stages: {
      applied: (pipelineStages.applied || []).map(mapCandidateToCard),
      screening: (pipelineStages.screening || []).map(mapCandidateToCard),
      interview: (pipelineStages.interview || []).map(mapCandidateToCard),
      interviewed: (pipelineStages.interviewed || []).map(mapCandidateToCard),
      offer: (pipelineStages.offer || []).map(mapCandidateToCard),
      rejected: (pipelineStages.rejected || []).map(mapCandidateToCard),
      inactive: (pipelineStages.inactive || []).map(mapCandidateToCard),
    }
  } : null

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'Fraunces', serif" }}>Pipeline</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Drag candidates across stages — Hireon AI updates probabilities automatically.</p>
      </div>

      <div className="flex-1 min-h-0 pt-4 border-t border-gray-200 dark:border-gray-800">
        {isLoading ? (
          <BoardSkeleton />
        ) : pipelineData ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full"
          >
            <KanbanBoard
              data={pipelineData}
              onCardClick={(card) => {
                setSelectedCard(card)
              }}
            />
          </motion.div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              title="No candidates in pipeline"
              description="Candidates will appear here as they move through the recruitment stages."
            />
          </div>
        )}
      </div>

      {selectedCard && (
        <CardDetailModal card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </div>
  )
}
