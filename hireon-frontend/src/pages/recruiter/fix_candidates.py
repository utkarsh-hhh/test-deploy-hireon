import re

with open('CandidatesPage.tsx', 'r') as f:
    content = f.read()

# Replace the data.items.map loop start
old_map = """          <div className="space-y-3 pb-24">
            {data.items.map((candidate, i) => {
              // Map API status -> UI Status
              const statusLabel = candidate.status === 'offer' ? 'Shortlisted' :
                candidate.status === 'interviewing' ? 'Scheduled' : 'In Review'
              const statusColor = statusLabel === 'Shortlisted' ? '#10b981' :
                statusLabel === 'Scheduled' ? '#3b82f6' : '#f59e0b'
              const statusBg = statusLabel === 'Shortlisted' ? 'rgba(16,185,129,0.12)' :
                statusLabel === 'Scheduled' ? 'rgba(59,130,246,0.12)' : 'rgba(245,158,11,0.12)'

              // Map UI Stage
              let uiStage = 'Applied'
              if (candidate.status === 'offer') uiStage = 'Offer Sent'
              else if (candidate.status === 'hired') uiStage = 'Hired'
              else if (candidate.status === 'interviewing') uiStage = 'Technical Round Sel.'
              else if (candidate.status === 'screening') uiStage = 'Pre-screening Selected'"""

new_map = """          <div className="space-y-3 pb-24">
            {data.items.map((candidate, i) => {
              const score = candidate.match_score ?? 0
              const isHighMatch = score >= 85
              const isMidMatch = score >= 75
              
              const statusLabel = isHighMatch ? 'Shortlisted' : isMidMatch ? 'Scheduled' : 'In Review'
              const statusColor = statusLabel === 'Shortlisted' ? '#10b981' : statusLabel === 'Scheduled' ? '#3b82f6' : '#f59e0b'
              const statusBg = statusLabel === 'Shortlisted' ? 'rgba(16,185,129,0.12)' : statusLabel === 'Scheduled' ? 'rgba(59,130,246,0.12)' : 'rgba(245,158,11,0.12)'

              const uiStage = isHighMatch ? 'Pre-screening Selected' : isMidMatch ? 'Technical Round Sel.' : 'Applied'"""

if old_map in content:
    content = content.replace(old_map, new_map)
    with open('CandidatesPage.tsx', 'w') as f:
        f.write(content)
    print("Fixed TS errors in CandidatesPage.tsx successfully!")
else:
    print("Could not find block to replace.")
