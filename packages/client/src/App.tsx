import { SHARED_VERSION } from '@c123-live-mini/shared';
import { PageLayout, Header } from '@czechcanoe/rvp-design-system';
import { Route, Switch, Router } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { EventListPage } from './pages/EventListPage';
import { EventDetailPage } from './pages/EventDetailPage';

function App() {
  const headerContent = (
    <Header variant="satellite" appName="c123-live-mini" />
  );

  const footerContent = (
    <div
      style={{
        padding: '1rem',
        textAlign: 'center',
        fontSize: '0.875rem',
        color: 'var(--csk-color-text-tertiary)',
      }}
    >
      Powered by c123-live-mini (shared v{SHARED_VERSION})
    </div>
  );

  return (
    <Router hook={useHashLocation}>
      <PageLayout variant="satellite" header={headerContent} footer={footerContent}>
        <Switch>
          <Route path="/">
            <EventListPage />
          </Route>
          <Route path="/events/:eventId/race/:raceId">
            {(params) => (
              <EventDetailPage
                eventId={params.eventId}
                raceId={params.raceId}
              />
            )}
          </Route>
          <Route path="/events/:eventId">
            {(params) => <EventDetailPage eventId={params.eventId} />}
          </Route>
        </Switch>
      </PageLayout>
    </Router>
  );
}

export default App;
