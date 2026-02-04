import { SHARED_VERSION, type Event } from '@c123-live-mini/shared';

function App() {
  const sampleEvent: Event = {
    id: '1',
    name: 'Demo Event',
    status: 'running',
  };

  return (
    <div>
      <h1>c123-live-mini</h1>
      <p>Shared package version: {SHARED_VERSION}</p>
      <p>Sample event: {sampleEvent.name} ({sampleEvent.status})</p>
    </div>
  );
}

export default App;
