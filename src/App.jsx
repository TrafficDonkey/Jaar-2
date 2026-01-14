import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AuctionClock from "./Veilingsklok/AuctionClock";


function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<AuctionClock />} />
                <Route path="/VeilingKlok" element={< AuctionClock/>} />
            </Routes>
        </Router>
    );
}

export default App





