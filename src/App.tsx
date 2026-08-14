import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import SmsGateway from './components/SmsGateway';

// 👇 Replace this with your actual main page component
function Home() {
  return (
    <div>
      <h1>Your Main Page</h1>
      <Link to="/sms-gateway">📡 Open SMS Gateway</Link>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sms-gateway" element={<SmsGateway />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
