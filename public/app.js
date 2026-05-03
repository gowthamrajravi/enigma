let appState = null;
let finaleShown = false;
let predictedChartObj = null;
let actualChartObj = null;
let liveStandingsChartObj = null;

const parties = ['AIADMK', 'DMK', 'NTK', 'TVK', 'OTHERS'];
const chartColors = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#94a3b8'];

async function fetchLiveResults() {
    try {
        const res = await fetch('/api/data');
        appState = await res.json();

        document.getElementById('time-display').innerText = appState.lastRefreshed;

        renderLiveStandingsChart();
        calculateFamilyInsights();
        renderLeaderboard();

        if (appState.finaleTriggered && !finaleShown) {
            triggerSpectacle();
        }
    } catch (e) {
        console.error("Waiting for server data...");
    }
}

function renderLiveStandingsChart() {
    if (!appState) return;

    const actuals = appState.liveActuals;
    let totalCounted = 0;
    parties.forEach(p => totalCounted += actuals[p]);

    // Update Counter Text
    document.getElementById('seats-counted').innerText = totalCounted;

    const waitingMsg = document.getElementById('waiting-message');
    const canvas = document.getElementById('liveStandingsChart');

    // Conditional Rendering based on 0 seats
    if (totalCounted === 0) {
        waitingMsg.style.display = 'block';
        canvas.style.display = 'none';
        return;
    } else {
        waitingMsg.style.display = 'none';
        canvas.style.display = 'block';
    }

    const ctx = canvas.getContext('2d');

    if (liveStandingsChartObj) {
        liveStandingsChartObj.data.datasets[0].data = parties.map(p => actuals[p]);
        liveStandingsChartObj.update();
        return;
    }

    liveStandingsChartObj = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: parties,
            datasets: [{
                data: parties.map(p => actuals[p]),
                backgroundColor: chartColors,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'right' }
            }
        }
    });
}

function calculateFamilyInsights() {
    if (!appState || appState.predictions.length === 0) return;

    let avg = { AIADMK: 0, DMK: 0, NTK: 0, TVK: 0, OTHERS: 0 };
    let numMembers = appState.predictions.length;

    appState.predictions.forEach(p => {
        parties.forEach(party => avg[party] += p[party] || 0);
    });

    parties.forEach(party => {
        avg[party] = Math.round(avg[party] / numMembers);
    });

    document.getElementById('family-average-text').innerText =
        `AIADMK: ${avg.AIADMK} | DMK: ${avg.DMK} | NTK: ${avg.NTK} | TVK: ${avg.TVK} | OTH: ${avg.OTHERS}`;

    let closestMember = null;
    let minDifference = Infinity;

    appState.predictions.forEach(p => {
        let diff = 0;
        parties.forEach(party => {
            diff += Math.abs(p[party] - avg[party]);
        });
        if (diff < minDifference) {
            minDifference = diff;
            closestMember = p;
        }
    });

    document.getElementById('closest-to-average').innerText =
        `${closestMember.name} (Deviated by only ${minDifference} total seats from average)`;
}

function calculateAccuracy(predicted, actual) {
    let totalPredicted = 0, totalActual = 0;
    parties.forEach(p => { totalPredicted += predicted[p]; totalActual += actual[p]; });

    let seatsOff = 0;
    parties.forEach(p => {
        seatsOff += Math.abs(predicted[p] - actual[p]);
    });

    if (totalActual === 0) return { score: 0, seatsOff: seatsOff };

    let variance = 0;
    parties.forEach(p => {
        let pPct = (predicted[p] / totalPredicted) * 100 || 0;
        let aPct = (actual[p] / totalActual) * 100 || 0;
        variance += Math.abs(pPct - aPct);
    });

    return {
        score: Math.max(0, 100 - (variance / 2)).toFixed(2),
        seatsOff: seatsOff
    };
}

function renderLeaderboard() {
    if (!appState) return;
    const container = document.getElementById('leaderboard');
    container.innerHTML = '';

    const scoredPredictions = appState.predictions.map(p => {
        const calc = calculateAccuracy(p, appState.liveActuals);
        p.score = calc.score;
        p.seatsOff = calc.seatsOff;
        return p;
    }).sort((a, b) => b.score - a.score);

    scoredPredictions.forEach((member, displayIndex) => {
        const div = document.createElement('div');
        const originalIndex = appState.predictions.findIndex(p => p.id === member.id);

        let totalSeats = 0;
        parties.forEach(p => totalSeats += (member[p] || 0));

        let warningBadge = '';
        let invalidClass = '';
        if (totalSeats !== 234) {
            warningBadge = `<br><span class="warning-badge">⚠️ Invalid Total: ${totalSeats}/234 Seats</span>`;
            invalidClass = 'invalid-total';
        }

        div.className = `card ${displayIndex === 0 && member.score > 0 ? 'rank-1' : ''} ${invalidClass}`;
        div.onclick = () => showChart(originalIndex);

        div.innerHTML = `
            <div>
                <h3>${displayIndex === 0 && member.score > 0 ? '👑 ' : ''}${member.name}</h3>
                <small>AIADMK:${member.AIADMK} | DMK:${member.DMK} | NTK:${member.NTK} | TVK:${member.TVK} | OTH:${member.OTHERS}</small>
                ${warningBadge}
            </div>
            <div style="text-align: right;">
                <div class="score">${member.score}%</div>
                <span class="score-details">Seat Diff: ${member.seatsOff}</span>
            </div>
        `;
        container.appendChild(div);
    });
}

function showChart(memberIndex) {
    const member = appState.predictions[memberIndex];
    const actuals = appState.liveActuals;

    document.getElementById('chart-title').innerText = `${member.name}'s Analytics`;
    document.getElementById('chart-subtitle').innerText = `Comparing the predicted ratio of seats vs the actual live ratio.`;
    document.getElementById('chart-modal').classList.add('show');

    let totalActuals = 0;
    parties.forEach(p => totalActuals += actuals[p]);

    const predContainer = document.getElementById('predicted-chart-container');
    const actContainer = document.getElementById('actual-chart-container');

    // 1. Predicted Chart (Always shows)
    predContainer.innerHTML = '<canvas id="predictedChart"></canvas>';
    const ctxPred = document.getElementById('predictedChart').getContext('2d');
    predictedChartObj = new Chart(ctxPred, {
        type: 'pie',
        data: {
            labels: parties,
            datasets: [{
                data: parties.map(p => member[p]),
                backgroundColor: chartColors,
                borderWidth: 2
            }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });

    // 2. Actuals Chart (Conditional Zero-State)
    if (totalActuals === 0) {
        actContainer.innerHTML = '<p style="color:#64748b; font-style:italic; margin-top:50px;">Waiting for actual results...</p>';
    } else {
        actContainer.innerHTML = '<canvas id="actualChart"></canvas>';
        const ctxAct = document.getElementById('actualChart').getContext('2d');
        actualChartObj = new Chart(ctxAct, {
            type: 'pie',
            data: {
                labels: parties,
                datasets: [{
                    data: parties.map(p => actuals[p]),
                    backgroundColor: chartColors,
                    borderWidth: 2
                }]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });
    }
}

function triggerSpectacle() {
    finaleShown = true;
    const winner = appState.predictions.map(p => {
        p.score = calculateAccuracy(p, appState.liveActuals).score;
        return p;
    }).sort((a, b) => b.score - a.score)[0];

    document.getElementById('winner-name').innerText = winner.name;
    document.getElementById('winner-score').innerText = `Accuracy: ${winner.score}%`;
    document.getElementById('spectacle-modal').classList.add('show');

    var duration = 15 * 1000;
    var animationEnd = Date.now() + duration;
    var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 101 };

    function randomInRange(min, max) { return Math.random() * (max - min) + min; }
    var interval = setInterval(function () {
        var timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        var particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);
}

setInterval(fetchLiveResults, 5000);
fetchLiveResults();