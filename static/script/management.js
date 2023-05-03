let new_marking = {};

async function newSessionPanel() {
    const page_id = createPage('new-marking-panel')
    if(!page_id) return

    new_marking = {
        current_index: 0,
        password: '',
        peers: []
    }

    document.body.insertAdjacentHTML("beforeend", 
    `<div class="basic-panel init-page-${page_id}" id="new-marking-panel">
        ${closeButton('new-marking-panel')}
        <span class="plaintext">Step 1:<br>Management Password</span>
        <input id="manage-password" class="enter-field" placeholder="Password for management" type="text"
         oninput='inputManagePassword(event)'>
        <div class='info'>If no password set, everyone can log into management panel.</div>
        <span class="plaintext">Step 2:<br>Waiting for Marking</span>
        <div class="peers">
            <div class="block-btn" onclick="addNewMarkingTarget(event)">Add New Peer</div>
            <div class='info'>You can add peers anytime in management panel.</div>
        </div>
        <span class="plaintext">Submit</span>
        <div class="block-btn blue" onclick="confirmCreation()">Confirm Creation</div>
        <span class="plaintext">Step 2 Alternative:<br>Restore Session</span>
        <div class='block-btn upload-file orange'>
            <input type="file" class='clickable' onchange='uploadSettingFile(event)'>
            <span>Upload Setting File</span>
        </div>
    </div>`)

    const newMarkingPanel = document.getElementById("new-marking-panel")
    await new Promise(s=>setTimeout(s, 1))
    newMarkingPanel.classList.add(`page-${page_id}`)
}

function inputManagePassword(event) {
    new_marking.password = event.target.value
}

function renamePeer(event, peer_index) {
    new_marking.peers[peer_index] = event.target.value;
}

function removePeer(event, peer_index) {
    new_marking.peers[peer_index] = undefined;
    event.target.parentNode.remove()
}

function uploadSettingFile(event) {
    if(event.target.files.length) {
        const file_reader = new FileReader()
        file_reader.readAsText(event.target.files[0])
        file_reader.onload = () => {
            request('POST', '/restore-session', async res=>{
                closePage('new-marking-panel')
                await new Promise(s=>setTimeout(s, 600))
                openManagementPanel(res.session_id, new_marking.password)
            }, {password: new_marking.password, setting: file_reader.result})
        }
    }
}

function addNewMarkingTarget(event) {
    new_marking.peers.push('')
    event.target.insertAdjacentHTML("beforebegin", 
    `<div class="peer">
        <input class="enter-field" placeholder="Please enter peer's name"
        oninput='renamePeer(event, ${new_marking.current_index})'>
        <div class="block-btn red" onclick='removePeer(event, ${new_marking.current_index})'>Remove</div>
    </div>`)
    new_marking.current_index ++
}

function confirmCreation() {
    request('POST', '/create-session', async res=>{
        closePage('new-marking-panel')
        await new Promise(s=>setTimeout(s, 600))
        document.getElementById("show-session-id").textContent = `Last Session ID: ${res.session_id}`
        managementPanel(res.session_id, new_marking.password)
    }, {password: new_marking.password, peers: new_marking.peers.filter(e=>e)})
}

async function managementPanel(session_id = '', password = '') {
    function knownInfo(info) {
        managementPanel.innerHTML = 
        `${closeButton('management-panel')}
        <span class="plaintext" style='margin-bottom: 30px;'>Session ID: ${session_id}</span>
        <span class="info">Use ${session_id}p as peer passcode</span>
        <span class="info">Use ${session_id}s as superpeer passcode</span>
        <span class="plaintext">Refresh For Updates</span>
        <div id='refresh' class="block-btn">Refresh</div>
        <span class="info">Auto refresh every 1 minute</span>
        <span class="plaintext">Peers and Results</span>
        <div id='peers-and-results'></div>
        <span class="plaintext">Add Peer</span>
        <input id="add-peer-input" class="enter-field" 
        placeholder="Input peer name to add" type="text">
        <div class="block-btn blue" id='add-peer'>Submit</div>
        <span class="plaintext">Latest Marks</span>
        <div id='mark-log'></div>
        <span class="plaintext">Save</span>
        <div class="block-btn" id='save-csv'>Save Marks As CSV</div>
        <div class="block-btn orange" id='save-setting'>Save This Session</div>`

        const peer_elems = {}
        const peers_and_results = document.getElementById("peers-and-results")

        function updateResults() {
            info.peers.forEach(e => {
                let superpeer_total = 0, superpeers_num = 0
                info.all_marks.filter(entry=>(entry[1] === 0 && entry[4] === e))
                .forEach(entry=>{
                    superpeer_total += entry[5]
                    superpeers_num ++
                })

                let peer_total = 0, peers_num = 0
                info.all_marks.filter(entry=>(entry[1] === 1 && entry[4] === e))
                .forEach(entry=>{
                    peer_total += entry[5]
                    peers_num ++
                })

                const superpeer_avg = superpeers_num ? 
                    (superpeer_total / superpeers_num) * (peer_total ? .5 : 1) : 0
                const peer_avg = peers_num ? 
                    (peer_total / peers_num) * (superpeer_total ? .5 : 1) : 0

                const result = round2(superpeer_avg + peer_avg)

                if(!peer_elems[e]) {
                    peer_elems[e] = document.createElement("div")
                    peer_elems[e].className = 'peer'
                    peers_and_results.appendChild(peer_elems[e])
                }
                peer_elems[e].textContent = `${e}: ${result}%`
                peer_elems[e].style.background = `linear-gradient(to right, limegreen, white ${result}%)`
            })
        }

        const mark_log = document.getElementById("mark-log")
        let latest = 0

        function updateLog() {
            info.all_marks.filter(e=>e[7] > latest).forEach(e=>{
                mark_log.insertAdjacentHTML("afterbegin",
                `<span>${e[1] ? 'Peer' : 'Superpeer'} ${e[3]} (${e[2]}) marked ${e[4]} ${round2(e[5])}%${e[6] ? 
                ` and leave comment "${e[6]}."` : '.'}</span>`)
                latest = e[7]
            })
        }

        let new_peer_name = ''
        
        document.getElementById('add-peer-input').oninput = e => {new_peer_name = e.target.value}
        document.getElementById('add-peer').onclick = () => {
            request('POST', '/update-session', res=>{
                new_peer_name = ''
                document.getElementById('add-peer-input').value = ''
                update()
            }, {session_id: session_id, peers: [...info.peers, new_peer_name]})
        }

        function update() {
            request('POST', '/session-info', res=>{
                info = res
                updateResults()
                updateLog()
            }, {session_id: session_id, password: password})
        }

        updateResults()
        updateLog()

        document.getElementById("refresh").onclick = update
        document.getElementById("save-csv").onclick = () => {
            const download = document.createElement("a")
            download.href = `/save/csv?session_id=${encodeURIComponent(session_id)}&password=${encodeURIComponent(password)}`
            download.download = `${session_id}.csv`
            download.click()
            download.remove()
        }
        document.getElementById("save-setting").onclick = () => {
            const download = document.createElement("a")
            download.href = `/save/setting?session_id=${encodeURIComponent(session_id)}&password=${encodeURIComponent(password)}`
            download.download = `${session_id}_settings.txt`
            download.click()
            download.remove()
        }
        const updateIterval = setInterval(() => {
            if(!managementPanel.parentNode) {
                clearInterval(updateIterval)
                return
            }
            update()
        }, 60000);
    }

    function unknown() {
        managementPanel.innerHTML = 
        `${closeButton('management-panel')}
        <span class="plaintext" style='margin-bottom: 30px;'>Login to<br>Management Panel</span>
        `

        const enter_session_id = document.createElement('input')
        enter_session_id.type = 'text'
        enter_session_id.placeholder = 'Please enter session id'
        enter_session_id.className = 'enter-field'
        enter_session_id.oninput = e => {session_id = e.target.value}

        
        const enter_password = document.createElement('input')
        enter_password.type = 'text'
        enter_password.placeholder = 'Please enter password'
        enter_password.className = 'enter-field'
        enter_password.oninput = e => {password = e.target.value}
        
        const login_btn = document.createElement('div')
        login_btn.className = 'block-btn'
        login_btn.textContent = 'Login'
        login_btn.onclick = e => {login(session_id, password, e.target)}

        managementPanel.appendChild(enter_session_id)
        managementPanel.appendChild(enter_password)
        managementPanel.appendChild(login_btn)
    }

    function login(session_id, password, button_elem = undefined) {
        function outputAlert(msg) {
            if(button_elem.nextElementSibling)
                button_elem.nextElementSibling.textContent = msg
            else
                button_elem.insertAdjacentHTML("afterend", `<div class='alert'>${msg}</div>`)
        }
        if(!session_id || !/^\d{4}$/.test(session_id)) {
            outputAlert('Session ID is invalid!')
            return
        }
        request('POST', '/session-info', res=>{
            if(res.failed) {
                outputAlert('Session ID not exists or password incorrect!')
            } else knownInfo(res)
        }, {session_id: session_id, password: password})
    }

    const page_id = createPage('management-panel')
    if(!page_id) return

    document.body.insertAdjacentHTML("beforeend", 
        `<div class="basic-panel init-page-${page_id}" id="management-panel">
        </div>`)

    const managementPanel = document.getElementById("management-panel")

    session_id ? login(session_id, password) : unknown()

    await new Promise(s=>setTimeout(s, 1))
    managementPanel.classList.add(`page-${page_id}`)
}