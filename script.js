class ParkingLotSystem {
    constructor() {
        this.lots = {
            A: this.generateRandomParkingLot('A', 34),
            B: this.generateRandomParkingLot('B', 100)
        };
        this.currentLot = 'A';
        this.autoUpdateEnabled = false;
        this.autoUpdateInterval = null;
        this.selectedSlot = null;

        // save data sa local storage para hindi mawala pag na refresh
        this.registeredVehicles = JSON.parse(localStorage.getItem('vp_registeredVehicles')) || [];
        this.parkingLog        = JSON.parse(localStorage.getItem('vp_parkingLog'))        || [];

        // restore occupied slots based on registered vehicles
        this.restoreOccupiedSlots();
        this.init();
    }

    /* example cars (random) */
    carModels = [
        'Toyota Vios', 'Honda City', 'Mitsubishi Mirage', 'Suzuki Dzire', 'Hyundai Accent',
        'Toyota Innova', 'Ford Ranger', 'Nissan Navara', 'Honda Civic', 'Kia Stonic',
        'Yamaha Mio', 'Honda Click', 'Suzuki Raider', 'TVS Apache', 'Kawasaki Barako'
    ];

    carColors = [
        { name: 'Black', hex: '#111111' }, { name: 'White', hex: '#FFFFFF' },
        { name: 'Silver', hex: '#C0C0C0' }, { name: 'Gray', hex: '#808080' },
        { name: 'Red', hex: '#CC0000' },   { name: 'Blue', hex: '#1a56db' },
        { name: 'Green', hex: '#15803d' }, { name: 'Yellow', hex: '#ca8a04' },
        { name: 'Orange', hex: '#ea580c' }, { name: 'Maroon', hex: '#800000' }
    ];

    /* generate slots */
    generateRandomParkingLot(lotName, slotCount) {
        const slots = [];
        for (let i = 1; i <= slotCount; i++) {
            slots.push({
                id:          `${lotName}-${i}`,
                number:       i,
                status:       'available',
                lot:          lotName,
                vehicle:      null,
                carColor:     null,
                carColorHex:  null,
                userType:     null,
                occupiedTime: null
            });
        }
        return slots;
    }

    generateOwnerName() {
        const first = ['Jeia', 'Jane', 'Jay-Ar', 'Charles', 'Keeone', 'Patrick', 'Tayshaun', 'John', 'Maria', 'Anna'];
        const last  = ['Galing', 'Tanawan', 'Tacaisan', 'Villanueva', 'Lumaoeg', 'Garcia', 'Ruiz', 'Miranda', 'Reyes', 'Cruz'];
        return `${first[Math.floor(Math.random() * first.length)]} ${last[Math.floor(Math.random() * last.length)]}`;
    }

    /* restore data */
    restoreOccupiedSlots() {
        this.registeredVehicles.forEach(v => {
            if (!v.timeOut && this.lots[v.parkingLot]) {
                const slot = this.lots[v.parkingLot].find(s => s.number === v.slotNumber);
                if (slot) {
                    slot.status       = 'occupied';
                    slot.vehicle      = v.stiCode;
                    slot.userType     = v.userType;
                    slot.occupiedTime = v.registrationDate ? new Date(v.registrationDate) : new Date();
                }
            }
        });
    }

    /* uhm innit.? */
    init() {
        this.setupClock();
        this.setupTabs();
        this.setupEventListeners();
        this.setupModalListeners();
        this.setupExitModal();
        this.setupReportListeners();
        this.setupAdminAccess();
        this.render();
    }

    /* ── real time clock to ── */
    setupClock() {
        const tick = () => {
            const now = new Date();
            const timeEl = document.getElementById('liveClock');
            const dateEl = document.getElementById('liveDate');
            if (timeEl) timeEl.textContent = now.toLocaleTimeString('en-PH');
            if (dateEl) dateEl.textContent = now.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        };
        tick();
        setInterval(tick, 1000);
    }

    /* tab */
    setupTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Guard: admin tab requires login
                if (btn.dataset.tab === 'admin' && !this.isAdminLoggedIn) {
                    this.toast('🔐 Admin access required.', 'error');
                    return;
                }
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
                btn.classList.add('active');
                const tab = document.getElementById(`tab-${btn.dataset.tab}`);
                if (tab) tab.classList.add('active');
                if (btn.dataset.tab === 'vehicles') this.renderVehicleTable();
                if (btn.dataset.tab === 'admin')    this.renderReports();
            });
        });
    }

    /* ADMIN ACCEss*/
    setupAdminAccess() {
        this.isAdminLoggedIn = false;

        const loginModal   = document.getElementById('adminLoginModal');
        const adminLoginBtn  = document.getElementById('adminLoginBtn');
        const adminLogoutBtn = document.getElementById('adminLogoutBtn');
        const closeAdminLogin = document.querySelector('.close-admin-login');
        const submitBtn    = document.getElementById('submitAdminLogin');
        const passwordInput = document.getElementById('adminLoginPassword');

        // Open login
        adminLoginBtn.addEventListener('click', () => {
            document.getElementById('adminLoginPassword').value = '';
            document.getElementById('adminLoginError').textContent = '';
            loginModal.classList.add('show');
            setTimeout(() => passwordInput.focus(), 200);
        });

        // Close login 
        closeAdminLogin.addEventListener('click', () => loginModal.classList.remove('show'));
        loginModal.addEventListener('click', e => { if (e.target === loginModal) loginModal.classList.remove('show'); });

        // Enter key 
        passwordInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') submitBtn.click();
        });

        // admin login
        submitBtn.addEventListener('click', () => {
            const entered = passwordInput.value.trim();
            const errEl   = document.getElementById('adminLoginError');
            if (!entered) {
                errEl.textContent = '⚠️ Please enter the admin password.';
                return;
            }
            if (entered !== this.ADMIN_PASSWORD) {
                errEl.textContent = '❌ Incorrect password. Access denied.';
                passwordInput.value = '';
                passwordInput.focus();
                return;
            }
            // SUCCESS YEEEEEEEEEAAAAAAAAAAAAAAAAAAAAAAA
            this.isAdminLoggedIn = true;
            loginModal.classList.remove('show');
            adminLoginBtn.style.display  = 'none';
            adminLogoutBtn.style.display = '';
            document.getElementById('adminTabBtn').style.display = '';
            this.toast('🛡️ Admin access granted. Welcome!', 'success');
        });

        // Logout pls
        adminLogoutBtn.addEventListener('click', () => {
            if (!confirm('Log out of Admin Panel?')) return;
            this.isAdminLoggedIn = false;
            adminLoginBtn.style.display  = '';
            adminLogoutBtn.style.display = 'none';
            document.getElementById('adminTabBtn').style.display = 'none';
            // Switch to parking tab if currently on admin tab
            const activeTab = document.querySelector('.tab-btn.active');
            if (activeTab && activeTab.dataset.tab === 'admin') {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
                document.querySelector('[data-tab="parking"]').classList.add('active');
                document.getElementById('tab-parking').classList.add('active');
            }
            this.toast('🔓 Admin session ended.', 'warning');
        });

        // sub-nav tabs
        document.querySelectorAll('.admin-sub-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.admin-sub-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.admin-sub-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                const sub = document.getElementById(`admintab-${btn.dataset.admintab}`);
                if (sub) sub.classList.add('active');
                if (btn.dataset.admintab === 'reports') this.renderReports();
            });
        });
    }

    /* main!!!!!!!!!!!!!!!!!!!!!!!! pls wala ng gagalawin*/
    setupEventListeners() {
        document.getElementById('lotSelect').addEventListener('change', (e) => {
            this.currentLot = e.target.value;
            this.selectedSlot = null;
            this.render();
        });

        document.getElementById('toggleAutoBtn').addEventListener('click', () => this.toggleAutoUpdate());
        document.getElementById('refreshBtn').addEventListener('click',    () => this.refreshParkingLot());
        document.getElementById('resetBtn').addEventListener('click',      () => this.resetLayout());
    }

    /*vehicle registration*/
    setupModalListeners() {
        const modal       = document.getElementById('registrationModal');
        const registerBtn = document.getElementById('registerBtn');
        const closeBtn    = document.querySelector('.close');
        const cancelBtn   = document.getElementById('cancelBtn');
        const form        = document.getElementById('vehicleForm');

        registerBtn.addEventListener('click', () => {
            document.getElementById('parkingLot').value = this.currentLot;
            document.getElementById('slotNumber').value = this.selectedSlot ? this.selectedSlot.number : '';
            modal.classList.add('show');
        });

        closeBtn.addEventListener('click',   () => modal.classList.remove('show'));
        cancelBtn.addEventListener('click',  () => modal.classList.remove('show'));
        modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });
        form.addEventListener('submit', e => { e.preventDefault(); this.registerVehicle(); });
    }

    registerVehicle() {
        const phone      = document.getElementById('phone').value.trim();
        const stiCode    = document.getElementById('licensePlate').value.trim().toUpperCase();
        const parkingLot = document.getElementById('parkingLot').value;
        const slotPref   = document.getElementById('slotNumber').value;
        const userType   = document.getElementById('userType').value;
        const exitPin    = document.getElementById('exitPin').value.trim();

        if (!exitPin || exitPin.length < 4) { this.toast('Please set an Exit PIN of at least 4 characters.', 'error'); return; }
        if (!parkingLot || !this.lots[parkingLot]) { this.toast('Please select a valid parking lot.', 'error'); return; }

        // pag may nag duplicate na sti code na naka park, wag payagan mag register
        const alreadyParked = this.registeredVehicles.find(v => v.stiCode === stiCode && !v.timeOut);
        if (alreadyParked) {
            this.toast(`${stiCode} is already parked in Lot ${alreadyParked.parkingLot}, Slot ${alreadyParked.slotNumber}.`, 'error');
            return;
        }

        let assignedSlot = null;
        if (slotPref) {
            assignedSlot = this.lots[parkingLot].find(s => s.number === parseInt(slotPref));
            if (!assignedSlot)                    { this.toast('Slot not found in selected lot.', 'error'); return; }
            if (assignedSlot.status !== 'available') { this.toast('That slot is not available.', 'error'); return; }
        } else {
            assignedSlot = this.lots[parkingLot].find(s => s.status === 'available');
            if (!assignedSlot) { this.toast('No available slots in this lot!', 'error'); return; }
        }

        const now = new Date();

        // Update slot
        assignedSlot.status       = 'occupied';
        assignedSlot.vehicle      = stiCode;
        assignedSlot.userType     = userType;
        assignedSlot.occupiedTime = now;

        // Save record
        const record = {
            id:               Date.now(),
            phone, stiCode, exitPin,
            parkingLot,
            slotNumber:       assignedSlot.number,
            userType,
            registrationDate: now.toISOString(),
            timeOut:          null
        };
        this.registeredVehicles.push(record);
        this.parkingLog.push({ ...record, event: 'ENTRY', eventTime: now.toISOString() });
        this.saveData();

        this.toast(`✅ Vehicle registered! Slot: ${parkingLot}-${assignedSlot.number}`);
        document.getElementById('vehicleForm').reset();
        document.getElementById('registrationModal').classList.remove('show');
        this.render();
    }

    /* exit */
    setupExitModal() {
        const modal = document.getElementById('exitModal');
        document.querySelector('.close-exit').addEventListener('click',  () => modal.classList.remove('show'));
        document.getElementById('cancelExitBtn').addEventListener('click', () => modal.classList.remove('show'));
        modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });
    }

    /* admin password (JUST INCASE MAKALIMUTAN NG USER UNG PIN NILA)*/
    ADMIN_PASSWORD = 'VPforgotpass123';

    promptExit(stiCode) {
        const record = this.registeredVehicles.find(v => v.stiCode === stiCode && !v.timeOut);
        if (!record) { this.toast('No active parking record found.', 'error'); return; }

        const timeIn = new Date(record.registrationDate);
        const now    = new Date();
        const dur    = this.getDuration(timeIn, now);

        document.getElementById('exitSlotInfo').innerHTML = `
            <p><strong>STI Code:</strong> ${record.stiCode}</p>
            <p><strong>Lot / Slot:</strong> Lot ${record.parkingLot} — Slot ${record.slotNumber}</p>
            <p><strong>User Type:</strong> ${record.userType.toUpperCase()}</p>
            <p><strong>Time In:</strong> ${timeIn.toLocaleTimeString('en-PH')}</p>
            <p><strong>Time Out:</strong> ${now.toLocaleTimeString('en-PH')}</p>
            <p><strong>Duration:</strong> <span style="color:#fbbf24;font-weight:700">${dur}</span></p>
            <div class="pin-group">
                <label for="exitPinInput"> Enter your Exit PIN to confirm:</label>
                <input type="password" id="exitPinInput" maxlength="20" placeholder="Enter your PIN" autocomplete="off">
                <span id="pinError" class="pin-error"></span>
                <button type="button" class="forgot-pin-btn" id="forgotPinBtn">🔑 Forgot your PIN?</button>
            </div>
            <div id="adminOverrideGroup" class="admin-override" style="display:none;">
                <label for="adminPinInput"> Admin Master Password:</label>
                <p class="admin-hint">Contact the parking administrator or ask staff on duty to enter the master password below.</p>
                <input type="password" id="adminPinInput" placeholder="Enter admin password" autocomplete="off">
                <span id="adminPinError" class="pin-error"></span>
                <button type="button" class="btn btn-secondary" id="submitAdminPin" style="margin-top:8px;width:100%;">Verify Admin Password</button>
            </div>
        `;

        /* confirm btn */
        const confirmBtn = document.getElementById('confirmExitBtn');
        const newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
        newBtn.addEventListener('click', () => {
            const entered = document.getElementById('exitPinInput').value.trim();
            if (!entered) {
                document.getElementById('pinError').textContent = '⚠️ Please enter your PIN.';
                return;
            }
            if (entered !== record.exitPin) {
                document.getElementById('pinError').textContent = '❌ Incorrect PIN. Exit denied.';
                document.getElementById('exitPinInput').value = '';
                document.getElementById('exitPinInput').focus();
                return;
            }
            this.processExit(record);
        });

        /* forgot PIN toggle */
        document.getElementById('forgotPinBtn').addEventListener('click', () => {
            const adminGroup = document.getElementById('adminOverrideGroup');
            const isHidden = adminGroup.style.display === 'none';
            adminGroup.style.display = isHidden ? 'block' : 'none';
            if (isHidden) setTimeout(() => document.getElementById('adminPinInput').focus(), 100);
        });

        /* admin override */
        document.getElementById('submitAdminPin').addEventListener('click', () => {
            const adminInput = document.getElementById('adminPinInput').value.trim();
            const adminError = document.getElementById('adminPinError');
            if (!adminInput) {
                adminError.textContent = '⚠️ Please enter the admin password.';
                return;
            }
            if (adminInput !== this.ADMIN_PASSWORD) {
                adminError.textContent = '❌ Incorrect admin password.';
                document.getElementById('adminPinInput').value = '';
                document.getElementById('adminPinInput').focus();
                return;
            }
            /* admin bypass PIN and process exit */
            adminError.textContent = '';
            this.toast('🛡️ Admin override accepted. Processing exit...');
            setTimeout(() => this.processExit(record), 600);
        });

        document.getElementById('exitModal').classList.add('show');
        setTimeout(() => { const inp = document.getElementById('exitPinInput'); if (inp) inp.focus(); }, 200);
    }

    processExit(record) {
        const now = new Date();
        record.timeOut = now.toISOString();

        // Free the slott
        const slot = this.lots[record.parkingLot].find(s => s.number === record.slotNumber);
        if (slot) {
            slot.status       = 'available';
            slot.vehicle      = null;
            slot.userType     = null;
            slot.occupiedTime = null;
        }

        this.parkingLog.push({ ...record, event: 'EXIT', eventTime: now.toISOString() });
        this.saveData();
        this.toast(`🚗 ${record.stiCode} has exited. Duration: ${this.getDuration(new Date(record.registrationDate), now)}`);
        document.getElementById('exitModal').classList.remove('show');
        this.render();
        this.renderVehicleTable();
    }

    getDuration(timeIn, timeOut) {
        const ms = timeOut - timeIn;
        const h  = Math.floor(ms / 3600000);
        const m  = Math.floor((ms % 3600000) / 60000);
        const s  = Math.floor((ms % 60000) / 1000);
        return `${h}h ${m}m ${s}s`;
    }

    /* parking slots render*/
    render() {
        this.renderParkingSlots();
        this.updateStatistics();
        if (this.selectedSlot) {
            const updated = this.lots[this.currentLot].find(s => s.id === this.selectedSlot.id);
            if (updated) this.displaySlotInfo(updated);
        }
    }

    renderParkingSlots() {
        const container = document.getElementById('parkingLot');
        container.innerHTML = '';
        const slots = this.lots[this.currentLot];

        slots.forEach(slot => {
            const el = document.createElement('div');
            el.className = `parking-slot ${slot.status}-slot`;
            el.setAttribute('data-slot', slot.number);
            el.id = slot.id;

            let content = `<div class="slot-header">${slot.lot}-${slot.number}</div>`;
            if (slot.status === 'occupied') {
                content += `<div class="slot-indicator occupied-indicator">●</div>`;
                content += `<div class="slot-plate">${slot.vehicle || 'N/A'}</div>`;
            } else if (slot.status === 'available') {
                content += `<div class="slot-indicator">✓</div>`;
            }
            el.innerHTML = content;
            el.addEventListener('click', () => this.selectSlot(slot));
            container.appendChild(el);
        });
    }

    selectSlot(slot) {
        this.selectedSlot = slot;
        this.displaySlotInfo(slot);
        document.querySelectorAll('.parking-slot').forEach(el => el.style.outline = '');
        const el = document.getElementById(slot.id);
        if (el) el.style.outline = '3px solid #fff';
    }

    displaySlotInfo(slot) {
        const panel = document.getElementById('slotInfo');
        const statusColors = { available: '#22c55e', occupied: '#f87171' };
        const color = statusColors[slot.status] || '#fff';

        let html = `
            <p><strong>Slot:</strong> ${slot.lot}-${slot.number}</p>
            <p><strong>Lot:</strong> Lot ${slot.lot} — ${slot.lot === 'A' ? 'Cars' : 'Motorcycles'}</p>
            <p><strong>Status:</strong> <span style="color:${color};font-weight:700;">${slot.status.toUpperCase()}</span></p>
        `;

        if (slot.status === 'occupied') {
            const timeIn = slot.occupiedTime ? new Date(slot.occupiedTime) : null;
            html += `
                <p><strong>STI Code:</strong> ${slot.vehicle}</p>
                <p><strong>User Type:</strong> ${slot.userType ? slot.userType.toUpperCase() : '—'}</p>
                <p><strong>Parked Since:</strong> ${timeIn ? timeIn.toLocaleTimeString('en-PH') : '—'}</p>
                <p><strong>Duration:</strong> ${timeIn ? this.getDuration(timeIn, new Date()) : '—'}</p>
            `;
            html += `<button class="btn btn-danger exit-btn-inline" onclick="parkingSystem.promptExit('${slot.vehicle}')">🚗 Process Exit for ${slot.vehicle}</button>`;
        } else if (slot.status === 'available') {
            html += `<p style="color:#22c55e;font-weight:600;">✓ This slot is available</p>`;
        }

        html += `<p><strong>Last Updated:</strong> ${new Date().toLocaleTimeString('en-PH')}</p>`;
        panel.innerHTML = html;
    }

    /* stats */
    updateStatistics() {
        const slots     = this.lots[this.currentLot];
        const total     = slots.length;
        const available = slots.filter(s => s.status === 'available').length;
        const occupied  = slots.filter(s => s.status === 'occupied').length;
        document.getElementById('totalSlots').textContent     = total;
        document.getElementById('availableSlots').textContent = available;
        document.getElementById('occupiedSlots').textContent  = occupied;
    }

    /* auto update */
    toggleAutoUpdate() {
        const btn = document.getElementById('toggleAutoBtn');
        if (this.autoUpdateEnabled) {
            this.autoUpdateEnabled = false;
            clearInterval(this.autoUpdateInterval);
            btn.textContent = '⏱ Enable Auto-Update';
            btn.classList.remove('active');
        } else {
            this.autoUpdateEnabled = true;
            btn.textContent = '⏱ Disable Auto-Update ✓';
            btn.classList.add('active');
            this.autoUpdateInterval = setInterval(() => this.refreshParkingLot(), 5000);
        }
    }

    refreshParkingLot() {
        this.render();
        this.toast('Parking layout refreshed.');
    }

    resetLayout() {
        if (!confirm('Reset the parking layout? Registered vehicle data will be kept.')) return;
        this.lots = {
            A: this.generateRandomParkingLot('A', 34),
            B: this.generateRandomParkingLot('B', 100)
        };
        this.selectedSlot = null;
        this.restoreOccupiedSlots();
        this.render();
        document.getElementById('slotInfo').innerHTML = '<p class="placeholder-text">Click on a parking slot to view details</p>';
        this.toast('Layout has been reset.');
    }

    /* vehicle table */
    renderVehicleTable(searchQuery = '') {
        const wrapper = document.getElementById('vehicleTable');
        let data = [...this.registeredVehicles].reverse();

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            data = data.filter(v =>
                v.stiCode.toLowerCase().includes(q) ||
                v.parkingLot.toLowerCase().includes(q) ||
                v.userType.toLowerCase().includes(q)
            );
        }

        if (!data.length) {
            wrapper.innerHTML = '<p class="placeholder-text" style="padding:30px;text-align:center;">No vehicles found.</p>';
            return;
        }

        const rows = data.map(v => {
            const timeIn  = new Date(v.registrationDate);
            const timeOut = v.timeOut ? new Date(v.timeOut) : null;
            const dur     = timeOut ? this.getDuration(timeIn, timeOut) : `<span style="color:#fbbf24">${this.getDuration(timeIn, new Date())} ⬤</span>`;
            const status  = timeOut
                ? `<span class="badge badge-exited">Exited</span>`
                : `<span class="badge badge-parked">Parked</span>`;
            const exitBtn = !timeOut
                ? `<button class="exit-row-btn" onclick="parkingSystem.promptExit('${v.stiCode}')">Exit</button>`
                : `<button class="exit-row-btn" disabled>Exited</button>`;

            return `
                <tr>
                    <td><strong>${v.stiCode}</strong></td>
                    <td><span class="badge badge-${v.userType}">${v.userType.toUpperCase()}</span></td>
                    <td><span class="badge badge-lot-${v.parkingLot.toLowerCase()}">Lot ${v.parkingLot}</span></td>
                    <td>Slot ${v.slotNumber}</td>
                    <td>${timeIn.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td>${timeOut ? timeOut.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td>${dur}</td>
                    <td>${status}</td>
                    <td>${exitBtn}</td>
                </tr>
            `;
        }).join('');

        wrapper.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>STI Code</th>
                        <th>Type</th>
                        <th>Lot</th>
                        <th>Slot</th>
                        <th>Time In</th>
                        <th>Time Out</th>
                        <th>Duration</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    }

    /* report tasble */
    setupReportListeners() {
        document.getElementById('vehicleSearch').addEventListener('input', e => {
            this.renderVehicleTable(e.target.value);
        });

        document.getElementById('reportFilterLot').addEventListener('change', () => this.renderReports());
        document.getElementById('reportFilterStatus').addEventListener('change', () => this.renderReports());

        document.getElementById('exportCSVBtn').addEventListener('click', () => this.exportCSV());
        document.getElementById('printReportBtn').addEventListener('click', () => {
            // printing the report content
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.querySelector('[data-tab="admin"]').classList.add('active');
            document.getElementById('tab-admin').classList.add('active');
            this.renderReports();
            setTimeout(() => window.print(), 300);
        });
    }

    renderReports() {
        const today  = new Date().toDateString();
        const active = this.registeredVehicles.filter(v => !v.timeOut);
        const exited = this.registeredVehicles.filter(v => v.timeOut);
        const todayR = this.registeredVehicles.filter(v => new Date(v.registrationDate).toDateString() === today);
        const todayE = this.registeredVehicles.filter(v => v.timeOut && new Date(v.timeOut).toDateString() === today);

        const lotAOcc = this.lots['A'].filter(s => s.status === 'occupied').length;
        const lotBOcc = this.lots['B'].filter(s => s.status === 'occupied').length;

        // Summary
        document.getElementById('rpt-total-registered').textContent = this.registeredVehicles.length;
        document.getElementById('rpt-active').textContent            = active.length;
        document.getElementById('rpt-lot-a').textContent             = lotAOcc;
        document.getElementById('rpt-lot-b').textContent             = lotBOcc;
        document.getElementById('rpt-today').textContent             = todayR.length;
        document.getElementById('rpt-exited').textContent            = todayE.length;

        // Occupancy
        const barA = Math.round((lotAOcc / 34) * 100);
        const barB = Math.round((lotBOcc / 100) * 100);
        document.getElementById('barLotA').style.width      = barA + '%';
        document.getElementById('barLotB').style.width      = barB + '%';
        document.getElementById('barLotALabel').textContent = `${lotAOcc} / 34`;
        document.getElementById('barLotBLabel').textContent = `${lotBOcc} / 100`;

        // Full log table
        const filterLot    = document.getElementById('reportFilterLot').value;
        const filterStatus = document.getElementById('reportFilterStatus').value;

        let data = [...this.registeredVehicles].reverse();
        if (filterLot !== 'all')    data = data.filter(v => v.parkingLot === filterLot);
        if (filterStatus === 'active') data = data.filter(v => !v.timeOut);
        if (filterStatus === 'exited') data = data.filter(v => !!v.timeOut);

        const wrapper = document.getElementById('reportTable');
        if (!data.length) {
            wrapper.innerHTML = '<p class="placeholder-text" style="padding:30px;text-align:center;">No records match the selected filters.</p>';
            return;
        }

        const rows = data.map((v, i) => {
            const timeIn  = new Date(v.registrationDate);
            const timeOut = v.timeOut ? new Date(v.timeOut) : null;
            const dur     = timeOut ? this.getDuration(timeIn, timeOut) : '—';
            const status  = timeOut
                ? `<span class="badge badge-exited">Exited</span>`
                : `<span class="badge badge-parked">Currently Parked</span>`;

            return `
                <tr>
                    <td>${data.length - i}</td>
                    <td><strong>${v.stiCode}</strong></td>
                    <td>${v.phone}</td>
                    <td><span class="badge badge-${v.userType}">${v.userType.toUpperCase()}</span></td>
                    <td><span class="badge badge-lot-${v.parkingLot.toLowerCase()}">Lot ${v.parkingLot}</span></td>
                    <td>Slot ${v.slotNumber}</td>
                    <td>${timeIn.toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td>${timeOut ? timeOut.toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td>${dur}</td>
                    <td>${status}</td>
                </tr>
            `;
        }).join('');

        wrapper.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>STI Code</th>
                        <th>Phone</th>
                        <th>Type</th>
                        <th>Lot</th>
                        <th>Slot</th>
                        <th>Time In</th>
                        <th>Time Out</th>
                        <th>Duration</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    }

    /* CSV PARANG DATABASE TO */
    exportCSV() {
        if (!this.registeredVehicles.length) { this.toast('No data to export.', 'warning'); return; }

        const headers = ['#', 'STI Code', 'Phone', 'User Type', 'Parking Lot', 'Slot Number', 'Time In', 'Time Out', 'Duration', 'Status'];
        const rows = this.registeredVehicles.map((v, i) => {
            const timeIn  = new Date(v.registrationDate);
            const timeOut = v.timeOut ? new Date(v.timeOut) : null;
            const dur     = timeOut ? this.getDuration(timeIn, timeOut) : 'Still Parked';
            const status  = timeOut ? 'Exited' : 'Currently Parked';
            return [
                i + 1,
                v.stiCode,
                v.phone,
                v.userType,
                `Lot ${v.parkingLot}`,
                v.slotNumber,
                `"${timeIn.toLocaleString('en-PH')}"`,
                timeOut ? `"${timeOut.toLocaleString('en-PH')}"` : '',
                dur,
                status
            ].join(',');
        });

        const csv  = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `VP_Parking_Report_${new Date().toLocaleDateString('en-PH').replace(/\//g, '-')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.toast('✅ CSV report exported successfully!');
    }

    /* notif */
    toast(msg, type = 'success') {
        const el = document.getElementById('toast');
        el.textContent = msg;
        el.className = `toast show ${type}`;
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => { el.classList.remove('show'); }, 4000);
    }

    /* save ung mga data para once na accidentally exit, naka  record pa rin */
    saveData() {
        localStorage.setItem('vp_registeredVehicles', JSON.stringify(this.registeredVehicles));
        localStorage.setItem('vp_parkingLog',         JSON.stringify(this.parkingLog));
    }
}

let parkingSystem;
document.addEventListener('DOMContentLoaded', () => {
    parkingSystem = new ParkingLotSystem();
});
