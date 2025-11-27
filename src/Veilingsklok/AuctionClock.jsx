import { useState, useEffect, useRef } from "react";
import "./AuctionClock.css";

export default function AuctionClock() {
    const [productName, setProductName] = useState("");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [duration, setDuration] = useState("");

    const [currentPrice, setCurrentPrice] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(0);

    const [auctionStarted, setAuctionStarted] = useState(false);
    const intervalRef = useRef(null);

    const startAuction = async () => {
        if (!productName || !minPrice || !maxPrice || !duration) {
            alert("Vul alle velden in!");
            return;
        }

        const response = await fetch("http://localhost:5035/auction/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ProductName: productName,
                MinPrice: parseFloat(minPrice),
                MaxPrice: parseFloat(maxPrice),
                TimeSeconds: parseInt(duration),
            }),
        });

        if (response.ok) {
            setAuctionStarted(true);
            setCurrentPrice(parseFloat(maxPrice));
            setTimeRemaining(parseInt(duration));
            startInterval();
        } else {
            alert("Veiling kon niet worden gestart");
        }
    };

    const startInterval = () => {
        intervalRef.current = setInterval(async () => {
            const statusRes = await fetch("http://localhost:5035/auction/status");
            const data = await statusRes.json();

            setCurrentPrice(parseFloat(data.currentPrice));
            setTimeRemaining(data.timeRemaining || 0);

            if (data.status === "ended") {
                clearInterval(intervalRef.current);
                setAuctionStarted(false);

                // Nieuw: correcte backend message tonen
                if (data.currentPrice === parseFloat(minPrice)) {
                    alert("Het product is niet gekocht.");
                }

                resetFields();
            }
        }, 100);
    };


    const buyProduct = async () => {
        if (!auctionStarted) return;

        const response = await fetch("http://localhost:5035/auction/buy", { method: "POST" });
        const data = await response.json();

        if (response.ok) {
            clearInterval(intervalRef.current);
            setAuctionStarted(false);
            alert(data.message);
            resetFields();
        } else {
            alert(data.message);
        }
    };

    const resetFields = () => {
        setProductName("");
        setMinPrice("");
        setMaxPrice("");
        setDuration("");
        setCurrentPrice(0);
        setTimeRemaining(0);
    };
    
    const generateTicks = (min, max, num = 10) => {
        const step = (max - min) / (num - 1);
        return Array.from({ length: num }, (_, i) => (max - i * step).toFixed(2));
    };

    return (
        <div className="auction-container">
            <div className="auction-card">
                <h1>Veilingklok</h1>
                <div className="auction-form">
                    <input placeholder="Productnaam" value={productName} onChange={(e) => setProductName(e.target.value)} />
                    <input placeholder="Minimale prijs (€)" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
                    <input placeholder="Maximale prijs (€)" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
                    <input placeholder="Duur (seconden)" value={duration} onChange={(e) => setDuration(e.target.value)} />
                    <button onClick={startAuction} disabled={auctionStarted}>Veiling starten</button>
                    <button onClick={buyProduct} disabled={!auctionStarted}>Koop nu</button>
                </div>

                <div className="auction-status">
                    <p>Huidige prijs: €{currentPrice.toFixed(2)}</p>
                    <p>Tijd resterend: {timeRemaining}s</p>
                </div>
            </div>

            <div className="auction-rectangle-container">
                <div className="price-axis">
                    {generateTicks(parseFloat(minPrice || 0), parseFloat(maxPrice || 100)).map((p, idx) => (
                        <span key={idx}>€{p}</span>
                    ))}
                </div>
                
                <div className="auction-rectangle">
                    {generateTicks(parseFloat(minPrice || 0), parseFloat(maxPrice || 100)).map((_, idx, arr) => (
                        <div
                            key={idx}
                            className="tick-line"
                            style={{ top: `${(idx / (arr.length - 1)) * 100}%` }}
                        />
                    ))}

                    <div
                        className="progress-line"
                        style={{
                            top: `${((parseFloat(maxPrice || 0) - currentPrice) / (parseFloat(maxPrice || 0) - parseFloat(minPrice || 0))) * 100}%`,
                        }}
                    />
                </div>
                
                <div className="time-axis">
                    {generateTicks(0, parseInt(duration || 60)).map((t, idx) => (
                        <span key={idx}>{t}s</span>
                    ))}
                </div>
            </div>
        </div>
    );
}
