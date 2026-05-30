let currentDataArray = [];
let layoutRows = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','V','Misc'];
const SEATS_PER_ROW = 12;

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
    const estimatedCapacity = (15 * 12) + 10; 
    const assigned = currentDataArray.length;
    const checked = currentDataArray.filter(s => s.checkedIn).length;
    
    document.getElementById('stat-total').innerText = estimatedCapacity;
    document.getElementById('stat-assigned').innerText = assigned;
    document.getElementById('stat-checked').innerText = checked;
}

function renderMap() {
    const grid = document.getElementById('seatingGrid');
    grid.innerHTML = '';
    
    layoutRows.forEach(rowLetter => {
        // Container must be w-max to prevent flexbox from squishing contents
        const rowDiv = document.createElement('div');
        rowDiv.className = 'flex items-center gap-4 w-max relative'; 
        
        // STICKY ROW LABEL: Stays visible on the left when panning horizontally
        rowDiv.innerHTML += `
            <div class="sticky left-0 z-10 bg-gray-950 py-1 pr-2">
                <div class="w-10 h-10 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center font-bold text-purple-300 text-sm shadow-[4px_0_10px_rgba(0,0,0,0.5)]">
                    ${rowLetter === 'Misc' ? '★' : rowLetter}
                </div>
            </div>
        `;
        
        const seatContainer = document.createElement('div');
        seatContainer.className = 'flex gap-2 sm:gap-3 items-center';
        
        const slotsToRender = rowLetter === 'Misc' ? 10 : SEATS_PER_ROW;
        
        for (let i = 1; i <= slotsToRender; i++) {
            const seatId = rowLetter === 'Misc' ? `${i}` : `${rowLetter}-${i}`;
            const occupant = currentDataArray.find(s => s.seat_no === seatId);
            
            let statusClass = 'seat-empty';
            let tooltip = `Empty (${seatId})`;
            let occupantData = null;

            if (occupant) {
                statusClass = occupant.checkedIn ? 'seat-checked-in' : 'seat-assigned';
                tooltip = `${occupant.name} | Tkt: ${occupant.ticket_no}`;
                occupantData = encodeURIComponent(JSON.stringify(occupant));
            }

            // Fixed size seats (w-11 h-11) that do not shrink
            seatContainer.innerHTML += `
                <div onclick="openActionModal('${seatId}', '${occupantData}')" 
                     class="seat-chair shrink-0 w-11 h-11 sm:w-12 sm:h-12 ${statusClass}" title="${tooltip}">
                    <span class="text-xs font-bold text-white/90 drop-shadow-md">${i}</span>
                </div>
            `;
            
            // Large visual aisle gap
            if (i === 6 && rowLetter !== 'Misc') {
                seatContainer.innerHTML += `<div class="w-8 shrink-0"></div>`; 
            }
        }
        
        rowDiv.appendChild(seatContainer);
        grid.appendChild(rowDiv);
    });

    // Automatically scroll the map to the middle so the user sees the center aisle on load
    setTimeout(() => {
        const scrollContainer = document.getElementById('map-scroll-container');
        if (scrollContainer && scrollContainer.scrollWidth > scrollContainer.clientWidth) {
            scrollContainer.scrollLeft = (scrollContainer.scrollWidth - scrollContainer.clientWidth) / 2;
        }
    }, 100);
}

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

    filtered.sort((a, b) => (a.seat_no || '').localeCompare(b.seat_no || ''));

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
                <button onclick="openActionModal('${seat.seat_no}', '${occData}')" class="bg-gray-700 hover:bg-gray-600 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
                    ✎
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

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

function toggleCheckIn(dbKey, currentlyCheckedIn) {
    db.ref('/' + dbKey).update({ checkedIn: !currentlyCheckedIn });
    closeModal();
}

function saveSeatEdits(autoCheckIn = false) {
    const dbKey = document.getElementById('modalDbKey').value;
    const newName = document.getElementById('modalName').value;
    const newTicket = document.getElementById('modalTicket').value;
    const targetSeat = document.getElementById('modalNewSeat').value;

    if(!newName || !targetSeat) {
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
    
    if(confirm("Are you sure you want to clear this seat? The guest data will be removed.")) {
        db.ref('/' + dbKey).remove();
        closeModal();
    }
}

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