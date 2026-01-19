import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AuctionClock from "./Veilingsklok/AuctionClock";
import { useEffect, useState } from "react";
import "./AppShell.css";
import { applyTheme, getInitialTheme, persistTheme } from "./theme";


function App() {
    const [theme, setTheme] = useState(() => getInitialTheme());

    useEffect(() => {
        applyTheme(theme);
        persistTheme(theme);
    }, [theme]);

    return (
        <Router>
            <div className="app-shell">
                <header className="app-topbar">
                    <div className="app-topbar__title">Veilingklok</div>

                    <label className="theme-toggle">
                        <span className="theme-toggle__label">Dark mode</span>
                        <input
                            className="theme-toggle__input"
                            type="checkbox"
                            role="switch"
                            aria-label="Toggle dark mode"
                            checked={theme === "dark"}
                            onChange={(e) => setTheme(e.target.checked ? "dark" : "light")}
                        />
                        <span className="theme-toggle__track" aria-hidden="true">
                            <span className="theme-toggle__thumb" />
                        </span>
                    </label>
                </header>

                <main className="app-content">
                    <Routes>
                        <Route path="/" element={<AuctionClock />} />
                        <Route path="/VeilingKlok" element={<AuctionClock />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App





