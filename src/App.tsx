import { Scene, SceneOverlay } from './components/Game/Scene';
import { StartMenu } from './components/UI/StartMenu';
import './App.css';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <Scene />
      <SceneOverlay />
      <StartMenu />
    </div>
  );
}

export default App;