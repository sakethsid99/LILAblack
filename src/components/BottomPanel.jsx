import MatchSummary from './MatchSummary'
import Timeline from './Timeline'
import EventFilters from './EventFilters'

export default function BottomPanel({
  summary, filters, onToggleFilter, eventTypes,
  timeRange, currentGameTime, playbackTime, setPlaybackTime,
  playing, setPlaying, matchEvents,
}) {
  return (
    <div style={{
      display: 'flex',
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border-color)',
      flexShrink: 0,
    }}>
      {/* Match Summary — left */}
      <div style={{
        borderRight: '1px solid var(--border-color)',
        minWidth: 160,
      }}>
        <MatchSummary summary={summary} />
      </div>

      {/* Right section: Timeline on top, Filters on bottom */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Timeline */}
        <div style={{ borderBottom: '1px solid var(--border-color)' }}>
          <Timeline
            timeRange={timeRange}
            currentGameTime={currentGameTime}
            playbackTime={playbackTime}
            setPlaybackTime={setPlaybackTime}
            playing={playing}
            setPlaying={setPlaying}
            matchEvents={matchEvents}
          />
        </div>

        {/* Event Filters */}
        <EventFilters filters={filters} onToggleFilter={onToggleFilter} />
      </div>
    </div>
  )
}
