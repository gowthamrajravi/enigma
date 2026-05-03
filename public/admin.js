let adminState = null;
const parties = ['AIADMK', 'DMK', 'NTK', 'TVK', 'OTHERS'];

async function loadAdminData() {
    try {
        const res = await fetch('/api/data');
        adminState = await res.json();
        
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';

        renderLiveInputs();
        renderPredictionsEditor();
    } catch (e) {
        console.error("Error loading admin data:", e);
    }
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
        <div class="member-row header-row" style="font-weight:bold; margin-top:1rem; padding-bottom: 0; border: none;">
            <div class="name-input">Name</div>
            ${parties.map(p => `<div>${p}</div>`).join('')}
            <div>Total</div>
            <div>Action</div>
        </div>
    `;

    adminState.predictions.forEach((member, i) => {
        let total = 0;
        parties.forEach(p => total += (member[p] || 0));

        let row = `<div class="member-row" id="member-${i}">`;
        row += `<input type="text" class="name-input" value="${member.name}" data-field="name" data-index="${i}" placeholder="Name">`;

        parties.forEach(p => {
            // Added oninput event to recalculate live
            row += `<div class="input-wrapper">
                        <span class="mobile-label">${p}</span>
                        <input type="number" value="${member[p]}" data-field="${p}" data-index="${i}" oninput="updateTotal(${i})">
                    </div>`;
        });

        // Dynamic Total Display
        row += `<div class="input-wrapper">
                    <span class="mobile-label">Total</span>
                    <div id="total-${i}" class="${total !== 234 ? 'warning-text' : 'success-text'}">${total}</div>
                </div>`;
                
        // Delete button
        row += `<div class="input-wrapper">
                    <span class="mobile-label">Delete</span>
                    <button class="danger-btn" style="padding: 0.5rem; margin:0; width:100%;" onclick="deleteMember(${i})">🗑️</button>
                </div>`;
                
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
    
    // Scroll to the bottom to show the new member
    setTimeout(() => {
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
        });
    }, 100);
}

window.deleteMember = function(index) {
    if (confirm("Are you sure you want to remove this member?")) {
        adminState.predictions.splice(index, 1);
        renderPredictionsEditor();
    }
};

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