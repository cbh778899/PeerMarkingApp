let new_marking = {};
let passcode = ""
const pages = {
    page_1: undefined,
    page_2: undefined
}

async function closePage(page_id) {
    const page_n = searchPage(page_id)
    if(page_n === 1) {
        pages.page_1 = undefined;
        if(pages.page_2) {
            const page_2 = document.getElementById(pages.page_2)
            page_2.style.transform = 'translateX(100%)'
            page_2.style.zIndex = '2'
            pages.page_1 = pages.page_2
            pages.page_2 = undefined
        }
    }
    else if(page_n === 2) pages.page_2 = undefined;

    const newMarkingPanel = document.getElementById(page_id)
    newMarkingPanel.style.transform = page_n === 2 ? 'translateX(100%)' : 'unset'
    await new Promise(s=>setTimeout(s, 500))
    newMarkingPanel.remove()
}

function createPage(page_id) {
    var page = 0
    if(searchPage(page_id)) return page

    if(pages.page_1 === undefined) {
        pages.page_1 = page_id
        page = 1;
    } else if(pages.page_2 === undefined) {
        pages.page_2 = page_id;
        page = 2;
    }
    return page;
}

function searchPage(page_id) {
    return pages.page_1 === page_id ? 1 : pages.page_2 === page_id ? 2 : 0
}

function request(method, url, callback, body = undefined) {
    const XHR = new XMLHttpRequest()
    XHR.open(method, url)
    XHR.responseType = 'json'
    XHR.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    XHR.onreadystatechange = () => {
        if(XHR.readyState === 4 && XHR.status === 200) {
            const res = XHR.response
            callback(res)
        }
    }
    XHR.send(JSON.stringify(body))
}

function passcodeInput(event) {
    const value = event.target.value;
    const submitBtn = document.getElementById("submit-code")

    if(/^\d{4}[sp]$/g.test(value)) {
        submitBtn.style.display = 'block'
    } else {
        submitBtn.style.display = 'none'
    }
    passcode = value
}

function closeButton(page_id) {
    return (
    `<svg onclick='closePage("${page_id}")' class='close-panel-btn clickable'
        xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-lg" viewBox="0 0 16 16">
        <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
    </svg>`)
}

function round2(num) {
    const int = parseInt(num)
    return int + (num - int).toPrecision(2).substring(1)
}

async function newMarking() {
    const page_id = createPage('new-marking-panel')
    if(!page_id) return

    new_marking = {
        current_index: 0,
        password: '',
        peers: []
    }

    document.body.insertAdjacentHTML("beforeend", 
    `<div class="basic-panel" style="z-index: ${3-page_id};" id="new-marking-panel">
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
        <input class="enter-field" placeholder="Upload Setting file" type="file"
         onchange='uploadSettingFile(event)'>
    </div>`)

    const newMarkingPanel = document.getElementById("new-marking-panel")
    await new Promise(s=>setTimeout(s, 1))
    newMarkingPanel.style.transform = `translateX(${page_id}00%)`
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
        openManagementPanel(res.session_id, new_marking.password)
    }, {password: new_marking.password, peers: new_marking.peers.filter(e=>e)})
}

async function openManagementPanel(session_id = '', password = '') {
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
        <div class="block-btn" id='save-setting'>Save This Session</div>`

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
        `<div class="basic-panel" style="z-index: ${3-page_id};" id="management-panel">
        </div>`)

    const managementPanel = document.getElementById("management-panel")

    session_id ? login(session_id, password) : unknown()

    await new Promise(s=>setTimeout(s, 1))
    managementPanel.style.transform = `translateX(${page_id}00%)`
}

function checkPasscodeLogin(event) {
    const session_id = passcode.substring(0, 4)
    const peer_type = (passcode[4] === 's' ? 0 : 1)
    request('POST', '/check-session', res=>{
        if(res.exist_session) {
            event.target.nextElementSibling.textContent = ''
            markingPanel(session_id, peer_type)
        } else {
            event.target.nextElementSibling.textContent = 
            "This session ID doesn't exists!"
        }
    }, {session_id: session_id})
}

async function markingPanel(session_id, peer_type) {

    function getPeerMarkingDetails(peer_info) {
        request('POST', '/peer-mark-info', res=>{
            const info = {
                ...peer_info,
                peers: res.peers,
                marks: {}
            }
            res.peers.forEach(e=>{
                let target_mark = res.marks.filter(m=>m[4] === e)
                target_mark = target_mark.length ? target_mark[0] : undefined

                info.marks[e] = target_mark ? {
                    target: e,
                    mark: target_mark[5],
                    comment: target_mark[6]

                } : {}
            })
            marking(info)
        }, {session_id: session_id, peer_name: peer_info.peer_name, 
            peer_id: peer_info.peer_id, peer_type: peer_type})
    }

    function marking(info) {
        makring_panel.innerHTML = 
        `${closeButton('do-marking-panel')}
        <span class='plaintext'>Please select a peer to mark</span>
        <select id='select-peer'>
            <option value='-1' selected>Please select a peer to mark</option>
            ${info.peers.map((e, i) => {
                return `<option value='${i}'>${e}</option>`
            }).join('')}
        </select>
        <span id='refresh-peer-list' class='info clickable'>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-repeat" viewBox="0 0 16 16">
                <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
                <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
            </svg>
            <span>Click here to refresh</span>
        </span>
        <div id='peer-mark-main'>
            <span class='plaintext'>Peer Marking</span>
            <span class='title'>Please mark this peer (0 - 100)</span>
            <input id='input-mark' class='enter-field'>
            <span class='title'>Leave this peer a comment if you have any</span>
            <textarea id='input-comment' class='enter-field'></textarea>
            <div id='submit-mark' class='block-btn'>Confirm Mark</div>
            <span class='alert'></span>
        </div>
        `

        const peer_mark_main = document.getElementById("peer-mark-main")
        const input_mark = document.getElementById("input-mark")
        const input_comment = document.getElementById("input-comment")
        const refresh = document.getElementById("refresh-peer-list")
        const submit_mark = document.getElementById("submit-mark")

        let peer_index, mark, comment

        input_mark.oninput = e => {
            const value = e.target.value
            let need_reset = true
            if(/^[0-9]{0,3}(?:\.(?:[0-9]{1,2})?)?$/.test(value)) {
                if(value) {
                    const float_value = parseFloat(value)
                    if(float_value >= 0 && float_value <= 100)
                        need_reset = false
                } else need_reset = false
            }
            if(need_reset) e.target.value = mark
            else mark = value
        }

        input_comment.oninput = e => {comment = e.target.value}

        document.getElementById("select-peer").onchange = e => {
            peer_index = parseInt(e.target.value)
            const current_mark = info.marks[info.peers[peer_index]]
            if(peer_index >= 0) {
                peer_mark_main.style.display = 'block'

                mark = current_mark.mark || '0'
                comment = current_mark.comment || ''

                input_mark.value = mark
                input_comment.textContent = comment
            } else {
                peer_mark_main.style.display = 'none'
            }
        }

        refresh.onclick = () => getPeerMarkingDetails({
            peer_name: info.peer_name,
            peer_id: info.peer_id
        })

        submit_mark.onclick = e => {
            if(!mark) {
                e.target.nextElementSibling.textContent = 
                'Please input a valid mark between 0 - 100!'
            } else {
                e.target.nextElementSibling.textContent = ''
                info.marks[info.peers[peer_index]].mark = parseFloat(mark)
                info.marks[info.peers[peer_index]].comment = comment
                request("POST", '/update-marking', async res=>{
                    const success = document.createElement("span")
                    success.className = 'info'
                    success.textContent = `Successfully marked for ${info.peers[peer_index]}.`
                    e.target.insertAdjacentElement("afterend", success)
                    await new Promise(s=>setTimeout(s, 3000))
                    success.remove()
                }, {
                    session_id: session_id,
                    peer_type: peer_type,
                    peer_id: info.peer_id,
                    peer_name: info.peer_name,
                    target: info.peers[peer_index],
                    mark: parseFloat(mark),
                    comment: comment
                })
            }
        }
    }

    function login() {
        makring_panel.innerHTML = 
        `${closeButton('do-marking-panel')}
        <span class='plaintext'>Peer Details</span>
        <form id='confirm-login'>
            <input class='enter-field' placeholder='Please input your name here' name='peer_name'>
            <input class='enter-field' placeholder='Please input your ID here' name='peer_id'>
            <input type='checkbox' name='check_save_localstorage'>
            <span style='font-size: small;'>
                Save this peer info to LocalStorage
            </span>
            <button class='block-btn' type='submit'>Continue</button>
            <span class='alert'></span>
        </form>`

        const confirm_login = document.getElementById("confirm-login")
        confirm_login.onsubmit = e => {
            e.preventDefault()
            const peer_name = e.target.peer_name.value
            const peer_id = e.target.peer_id.value
            const save_info = e.target.check_save_localstorage.checked
            
            if(!peer_name) {
                confirm_login.lastElementChild.textContent = 'Please input a valid peer name!'
            } else if(!peer_id) {
                confirm_login.lastElementChild.textContent = 'Please input a valid peer ID!'
            } else {
                const peer_info = {
                    peer_name: peer_name,
                    peer_id: peer_id
                }
                if(save_info)
                    localStorage.setItem('peer-info', JSON.stringify(peer_info))

                getPeerMarkingDetails(peer_info)
            }
        }
    }
    
    const page_id = createPage('do-marking-panel')
    if(!page_id) return

    document.body.insertAdjacentHTML("beforeend",
    `<div class='basic-panel' id='do-marking-panel' style="z-index: ${3-page_id};">
    </div>`)

    const makring_panel = document.getElementById("do-marking-panel")
    let peer_info = localStorage.getItem("peer-info")
    if(peer_info) {
        peer_info = JSON.parse(peer_info)
        getPeerMarkingDetails(peer_info)
    } else login()

    await new Promise(s=>setTimeout(s, 1))
    makring_panel.style.transform = `translateX(${page_id}00%)`
}