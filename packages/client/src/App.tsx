import { SHARED_VERSION, type Event } from '@c123-live-mini/shared';

function App() {
  // Sample event data matching the shared Event type
  const sampleEvent: Event = {
    id: 1,
    eventId: 'CZE2.2024062500',
    mainTitle: 'Demo Event',
    subTitle: 'Canoe Slalom Series',
    location: 'Prague',
    facility: 'Troja Water Sports Centre',
    startDate: '2024-06-25',
    endDate: '2024-06-25',
    discipline: 'Slalom',
    status: 'running',
    createdAt: new Date().toISOString(),
  };

  const isLive = sampleEvent.status === 'running';

  return (
    <div className="page-layout">
      <header className="header">
        <div className="header-content">
          <span className="header-title">c123-live-mini</span>
          {isLive && (
            <div className="live-indicator">
              <span className="live-indicator-dot" />
              <span>Live</span>
            </div>
          )}
        </div>
      </header>

      <main className="main-content">
        <section className="section">
          <div className="card">
            <div className="card-header">
              <h1 className="card-title">{sampleEvent.mainTitle}</h1>
              {sampleEvent.subTitle && (
                <p className="card-subtitle">{sampleEvent.subTitle}</p>
              )}
            </div>
            <div className="info-list">
              <div className="info-item">
                <span className="info-label">Location:</span>
                <span className="info-value">
                  {sampleEvent.location}
                  {sampleEvent.facility && ` - ${sampleEvent.facility}`}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Date:</span>
                <span className="info-value">{sampleEvent.startDate}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Discipline:</span>
                <span className="info-value">{sampleEvent.discipline}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Status:</span>
                <span className="info-value">
                  <span className={`status-badge status-badge--${sampleEvent.status}`}>
                    {sampleEvent.status}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <h2 className="section-header">Results</h2>
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <h3 className="empty-state-title">No results available yet</h3>
              <p className="empty-state-description">
                Results will appear here when the race starts.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        Powered by c123-live-mini (shared v{SHARED_VERSION})
      </footer>
    </div>
  );
}

export default App;
