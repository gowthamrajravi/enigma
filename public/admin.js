let adminState = null;
const parties = ['AIADMK', 'DMK', 'NTK', 'TVK', 'OTHERS'];

async function loadAdminData() {
    const res = await fetch('/api/data');
    adminState = await res.json();
    renderLiveInputs();
    renderPredictionsEditor();
}

function renderLiveInputs() {
    const container = document.getElementById('live-inputs');
    container.innerHTML = '';
    parties.forEach(p => {
        container.innerHTML += `
            <div>
                <label><b>${p}</b></label>
                <input type="number" id="actual-${p}" value="${adminState.liveActuals[p]}" />
            </div>
        `;
    });
}

function renderPredictionsEditor() {
    const container = document.getElementById('predictions-editor');
    container.innerHTML = `
        <div class="member-row" style="font-weight:bold; margin-top:1rem; padding-bottom: 0; border: none;">
            <div class="name-input">Name</div>
            ${parties.map(p => `<div>${p}</div>`).join('')}
            <div>Total</div>
        </div>
    `;

    adminState.predictions.forEach((member, i) => {
        let total = 0;
        parties.forEach(p => total += (member[p] || 0));

        let row = `<div class="member-row" id="member-${i}">`;
        row += `<input type="text" class="name-input" value="${member.name}" data-field="name" data-index="${i}">`;

        parties.forEach(p => {
            // Added oninput event to recalculate live
            row += `<input type="number" value="${member[p]}" data-field="${p}" data-index="${i}" oninput="updateTotal(${i})">`;
        });

        // Dynamic Total Display
        row += `<div id="total-${i}" class="${total !== 234 ? 'warning-text' : 'success-text'}">${total}</div>`;
        row += `</div>`;
        container.innerHTML += row;
    });
}

// NEW FUNCTION: Live Math Checker
window.updateTotal = function (index) {
    let total = 0;
    const inputs = document.querySelectorAll(`#member-${index} input[type="number"]`);
    inputs.forEach(input => {
        total += parseInt(input.value) || 0;
    });
    const totalDiv = document.getElementById(`total-${index}`);
    totalDiv.innerText = total;
    totalDiv.className = total !== 234 ? 'warning-text' : 'success-text';
};

function addNewMember() {
    adminState.predictions.push({
        id: Date.now(), name: "New Member", AIADMK: 0, DMK: 0, NTK: 0, TVK: 0, OTHERS: 0
    });
    renderPredictionsEditor();
}

async function saveAdminData() {
    parties.forEach(p => {
        adminState.liveActuals[p] = parseInt(document.getElementById(`actual-${p}`).value) || 0;
    });

    const inputs = document.querySelectorAll('#predictions-editor input');
    inputs.forEach(input => {
        const index = input.getAttribute('data-index');
        const field = input.getAttribute('data-field');
        if (field === 'name') {
            adminState.predictions[index][field] = input.value;
        } else if (field) {
            adminState.predictions[index][field] = parseInt(input.value) || 0;
        }
    });

    await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminState)
    });
    alert('Data Saved Successfully!');
}

document.getElementById('declare-results-btn').addEventListener('click', async () => {
    if (confirm("Are you sure? This will trigger fireworks on everyone's screen!")) {
        adminState.finaleTriggered = true;
        await saveAdminData();
    }
});

document.getElementById('reset-finale-btn').addEventListener('click', async () => {
    if (confirm("This will turn off the fireworks for everyone. Are you sure?")) {
        adminState.finaleTriggered = false;
        await saveAdminData();
        // Optional: Alert to confirm it worked
        alert('Finale reset! Fireworks will no longer trigger when the page is reloaded.');
    }
});
loadAdminData();