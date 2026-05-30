
// ==========================================
// 1. STATE & COMPLEX LAYOUT CONFIGURATION
// ==========================================
let currentDataArray = [];

// The physical architecture of The Enigma hall
const layoutConfig = [
    { id: 'V1', left: 4, right: 2 },
    { id: 'V2', left: 4, right: 2 },
    { id: 'A', left: 7, right: 6 },
    { id: 'B', left: 7, right: 6 },
    { id: 'C', left: 7, right: 6 },
    { id: 'D', left: 7, right: 6 },
    { id: 'E', left: 6, right: 6 },  // Exception Row
    { id: 'F', left: 7, right: 6 },
    { id: 'G', left: 7, right: 6 },
    { id: 'H', left: 7, right: 6 },
    { id: 'I', left: 7, right: 6 },
    { id: 'J', left: 7, right: 6 },
    { id: 'K', left: 6, right: 6 },  // Exception Row
    { id: 'L', left: 7, right: 6 },
    { id: 'M', left: 5, right: 6 },  // Exception Row

    // N row is split into two halves, rendered entirely on the right side
    { id: 'N1', rowId: 'N', offset: 0, layout: 'n_row' },
    { id: 'N2', rowId: 'N', offset: 6, layout: 'n_row' }
];

// Calculate total capacity dynamically based on the layout
const TOTAL_CAPACITY = layoutConfig.reduce((acc, row) => acc + row.left + row.right + (row.layout === 'n_row' ? 6 : 0), 0);

// ==========================================
// 2. INITIALIZATION & SYNC
// ==========================================
db.ref('/').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        currentDataArray = Object.keys(data).map(key => ({ dbKey: key, ...data[key] }));
        updateConnectionStatus(true);
        renderApp();
    } else {
        currentDataArray = [];
        updateConnectionStatus(false);
    }
});

function renderApp() {
    updateStats();
    renderMap();
    renderList();
}

function updateStats() {
    const assigned = currentDataArray.length;
    const checked = currentDataArray.filter(s => s.checkedIn).length;

    document.getElementById('stat-total').innerText = 189; // Hardcoded based on your exact math
    document.getElementById('stat-assigned').innerText = assigned;
    document.getElementById('stat-checked').innerText = checked;
}

// ==========================================
// 3. MAP VIEW (DYNAMIC ARCHITECTURE)
// ==========================================
function renderMap() {
    const grid = document.getElementById('seatingGrid');
    grid.innerHTML = '';

    layoutConfig.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'flex items-center gap-2 md:gap-4 w-max relative';

        const rowLabel = row.rowId || row.id;
        const displayLabel = rowLabel.replace('1', '').replace('2', ''); // Clean up V1->V and N1->N for UI

        // STICKY ROW LABEL (Stays visible on the left when panning horizontally)
        rowDiv.innerHTML += `
            <div class="sticky left-0 z-10 bg-gray-950 py-1 pr-2">
                <div class="w-10 h-10 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center font-bold text-purple-300 text-sm shadow-[4px_0_10px_rgba(0,0,0,0.5)]">
                    ${displayLabel}
                </div>
            </div>
        `;

        const seatContainer = document.createElement('div');
        seatContainer.className = 'flex gap-2 sm:gap-3 items-center';

        // Helper function to build a physical seat block
        const createSeat = (seatId) => {
            const occupant = currentDataArray.find(s => s.seat_no === seatId);
            let statusClass = 'seat-empty';
            let tooltip = `Empty (${seatId})`;
            let occupantData = null;

            if (occupant) {
                statusClass = occupant.checkedIn ? 'seat-checked-in' : 'seat-assigned';
                tooltip = `${occupant.name} | Tkt: ${occupant.ticket_no}`;
                occupantData = encodeURIComponent(JSON.stringify(occupant));
            }

            // Extract just the number for the visual seat (e.g., "12" from "A-12")
            const visualNumber = seatId.split('-')[1] || seatId.replace(/[A-Za-z]/g, '');

            return `
                <div onclick="openActionModal('${seatId}', '${occupantData}')" 
                     class="seat-chair shrink-0 w-11 h-11 sm:w-12 sm:h-12 ${statusClass}" title="${tooltip}">
                    <span class="text-xs font-bold text-white/90 drop-shadow-md">${visualNumber}</span>
                </div>
            `;
        };

        // --- RENDER LOGIC BASED ON ROW TYPE ---

        if (row.layout === 'n_row') {
            // N-Row Special Layout: 
            // 1. LED Container on Left (7 seats wide) 
            // 2. Aisle 
            // 3. N Seats (Right Side)
            if (row.id === 'N1') {
                seatContainer.innerHTML += `
                    <div class="relative shrink-0 led-container">
                        <div class="led-box absolute top-0 left-0 w-full flex items-center justify-center bg-gray-800/80 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 font-bold text-[10px] uppercase tracking-widest text-center leading-tight z-20">
                            <span>LED & Speaker<br>Control Space</span>
                        </div>
                    </div>
                `;
            } else {
                seatContainer.innerHTML += `<div class="led-container shrink-0"></div>`;
            }

            seatContainer.innerHTML += `<div class="w-8 shrink-0"></div>`;

            for (let i = 1; i <= 6; i++) {
                seatContainer.innerHTML += createSeat(`${row.rowId}-${i + row.offset}`);
            }
        }

        else {
            // Standard Rows (Left Block + Aisle + Right Block)
            const missingLeft = 7 - row.left;
            for (let s = 0; s < missingLeft; s++) {
                seatContainer.innerHTML += `<div class="seat-spacer shrink-0"></div>`;
            }

            for (let i = 1; i <= row.left; i++) {
                seatContainer.innerHTML += createSeat(`${row.id}-${i}`);
            }

            // Visual Aisle Divider
            seatContainer.innerHTML += `
                <div class="w-8 shrink-0 flex items-center justify-center">
                    <div class="w-px h-8 bg-gray-700/50"></div>
                </div>
            `;

            for (let i = 1; i <= row.right; i++) {
                seatContainer.innerHTML += createSeat(`${row.id}-${i + row.left}`);
            }
        }

        rowDiv.appendChild(seatContainer);
        grid.appendChild(rowDiv);
    });

    // Auto-scroll map to the center aisle on load
    setTimeout(() => {
        const scrollContainer = document.getElementById('map-scroll-container');
        if (scrollContainer && scrollContainer.scrollWidth > scrollContainer.clientWidth) {
            scrollContainer.scrollLeft = (scrollContainer.scrollWidth - scrollContainer.clientWidth) / 2;
        }
    }, 100);
}

// ==========================================
// 4. LIST VIEW & SEARCH
// ==========================================
document.getElementById('listSearch').addEventListener('input', renderList);

function renderList() {
    const tbody = document.getElementById('listTableBody');
    const query = document.getElementById('listSearch').value.toLowerCase();
    tbody.innerHTML = '';

    const filtered = currentDataArray.filter(s =>
        (s.name && s.name.toLowerCase().includes(query)) ||
        (s.seat_no && s.seat_no.toLowerCase().includes(query)) ||
        (s.ticket_no && String(s.ticket_no).toLowerCase().includes(query))
    );

    // Natural sort for seat numbers (so A-2 comes before A-10)
    filtered.sort((a, b) => {
        const [aRow, aNum] = (a.seat_no || '').split('-');
        const [bRow, bNum] = (b.seat_no || '').split('-');
        if (aRow !== bRow) return (aRow || '').localeCompare(bRow || '');
        return parseInt(aNum || 0) - parseInt(bNum || 0);
    });

    filtered.forEach(seat => {
        const tr = document.createElement('tr');
        const badgeColor = seat.checkedIn ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400';
        const badgeText = seat.checkedIn ? 'Arrived' : 'Waiting';
        const occData = encodeURIComponent(JSON.stringify(seat));

        tr.innerHTML = `
            <td class="p-4 font-bold text-purple-300 w-16">${seat.seat_no}</td>
            <td class="p-4 pr-1">
                <div class="text-white font-medium text-sm leading-tight">${seat.name}</div>
                <div class="text-gray-500 text-xs mt-0.5">Tkt: ${seat.ticket_no || 'N/A'}</div>
            </td>
            <td class="p-4 text-right w-24">
                <span class="px-2.5 py-1 rounded-md text-[11px] font-bold ${badgeColor}">${badgeText}</span>
            </td>
            <td class="p-4 text-center w-16">
                <button onclick="openActionModal('${seat.seat_no}', '${occData}')" class="bg-gray-700 hover:bg-gray-600 w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm">
                    ✎
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// 5. MODAL & CRUD LOGIC
// ==========================================
function openActionModal(seatId, encodedOccupant) {
    const modal = document.getElementById('actionModal');
    const content = document.getElementById('actionModalContent');
    const checkBtn = document.getElementById('modalCheckInBtn');

    document.getElementById('modalSeatNo').innerText = seatId;
    document.getElementById('modalNewSeat').value = seatId;

    if (encodedOccupant !== 'null' && encodedOccupant) {
        const occupant = JSON.parse(decodeURIComponent(encodedOccupant));
        document.getElementById('modalDbKey').value = occupant.dbKey;
        document.getElementById('modalName').value = occupant.name;
        document.getElementById('modalTicket').value = occupant.ticket_no;

        checkBtn.onclick = () => toggleCheckIn(occupant.dbKey, occupant.checkedIn);

        if (occupant.checkedIn) {
            checkBtn.innerText = "Undo Check-in";
            checkBtn.className = "w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-colors bg-gray-700 hover:bg-gray-600 text-white";
        } else {
            checkBtn.innerText = "MARK AS ARRIVED";
            checkBtn.className = "w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-colors bg-green-600 hover:bg-green-500 text-white";
        }
    } else {
        document.getElementById('modalDbKey').value = 'NEW';
        document.getElementById('modalName').value = '';
        document.getElementById('modalTicket').value = 'WALK-IN';

        checkBtn.innerText = "Assign & Check In";
        checkBtn.className = "w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-colors bg-blue-600 hover:bg-blue-500 text-white";
        checkBtn.onclick = () => saveSeatEdits(true);
    }

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.add('modal-show');
        content.classList.add('modal-content-show');
    }, 10);
}

function closeModal() {
    const modal = document.getElementById('actionModal');
    const content = document.getElementById('actionModalContent');

    modal.classList.remove('modal-show');
    content.classList.remove('modal-content-show');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function openWalkInModal() {
    openActionModal('', 'null');
    document.getElementById('modalSeatNo').innerText = "Walk-in";
    document.getElementById('modalNewSeat').placeholder = "Assign empty seat (e.g. A-1)";
    document.getElementById('modalNewSeat').value = "";
}

// ==========================================
// 6. FIREBASE OPERATIONS
// ==========================================
function toggleCheckIn(dbKey, currentlyCheckedIn) {
    db.ref('/' + dbKey).update({ checkedIn: !currentlyCheckedIn });
    closeModal();
}

function saveSeatEdits(autoCheckIn = false) {
    const dbKey = document.getElementById('modalDbKey').value;
    const newName = document.getElementById('modalName').value;
    const newTicket = document.getElementById('modalTicket').value;
    const targetSeat = document.getElementById('modalNewSeat').value;

    if (!newName || !targetSeat) {
        alert("Name and Seat are required.");
        return;
    }

    const payload = {
        name: newName,
        ticket_no: newTicket,
        seat_no: targetSeat
    };

    if (dbKey === 'NEW') {
        payload.checkedIn = autoCheckIn;
        db.ref('/').push(payload);
    } else {
        db.ref('/' + dbKey).update(payload);
    }
    closeModal();
}

function deleteSeat() {
    const dbKey = document.getElementById('modalDbKey').value;
    if (dbKey === 'NEW') {
        closeModal();
        return;
    }

    if (confirm("Are you sure you want to clear this seat? The guest data will be removed.")) {
        db.ref('/' + dbKey).remove();
        closeModal();
    }
}

// ==========================================
// 7. UI TABS & HELPERS
// ==========================================
function switchTab(tab) {
    document.getElementById('view-map').classList.toggle('hidden', tab !== 'map');
    document.getElementById('view-list').classList.toggle('hidden', tab !== 'list');

    document.getElementById('tab-map').className = tab === 'map' ? 'pb-3 border-b-2 border-purple-500 text-purple-400 whitespace-nowrap' : 'pb-3 border-b-2 border-transparent text-gray-400 hover:text-gray-200 whitespace-nowrap';
    document.getElementById('tab-list').className = tab === 'list' ? 'pb-3 border-b-2 border-purple-500 text-purple-400 whitespace-nowrap' : 'pb-3 border-b-2 border-transparent text-gray-400 hover:text-gray-200 whitespace-nowrap';
}

function updateConnectionStatus(isConnected) {
    const dot = document.getElementById('connection-dot');
    const text = document.getElementById('connection-status');
    if (isConnected) {
        dot.className = "w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]";
        text.className = "text-[10px] sm:text-xs text-green-400";
        text.innerText = "Live";
    } else {
        dot.className = "w-2 h-2 rounded-full bg-red-500";
        text.className = "text-[10px] sm:text-xs text-red-500";
        text.innerText = "Offline";
    }
}

