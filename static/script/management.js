let new_marking = {};
let session_info = undefined;

async function newSessionPanel() {
    const page_id = createPage('new-marking-panel')
    if(!page_id) return

    new_marking = {
        current_index: 0,
        password: '',
        groups: []
    }

    document.body.insertAdjacentHTML("beforeend", 
    `<div class="basic-panel init-page-${page_id}" id="new-marking-panel">
        ${closeButton('new-marking-panel')}
        <span class="plaintext">Step 1:<br>Management Password</span>
        <input id="manage-password" class="enter-field" placeholder="Password for management" type="text"
         oninput='inputManagePassword(event)'>
        <div class='info'>If no password set, everyone can log into management panel.</div>
        <span class="plaintext">Step 2:<br>Waiting for Marking</span>
        <div class="block-btn" onclick="addNewGroup(event)">Add New Group</div>
        <div class='info'>You can add groups and peers anytime in management panel.</div>
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

function uploadSettingFile(event) {
    if(event.target.files.length) {
        const file_reader = new FileReader()
        file_reader.readAsText(event.target.files[0])
        file_reader.onload = () => {
            request('POST', '/restore-session', async res=>{
                closePage('new-marking-panel')
                await new Promise(s=>setTimeout(s, 600))
                session_info = {id: res.session_id, password: new_marking.password}
                await afterLoginSession(true)
                managementPanel()
            }, {password: new_marking.password, setting: file_reader.result})
        }
    }
}

function addNewGroup(event) {
    new_marking.groups.push({
        name: `Group ${new_marking.current_index + 1}`,
        peers: []
    })
    event.target.insertAdjacentHTML("beforebegin",
    `<div class='group'>
        <div class='group-item'>
            <input class='enter-field' value='Group ${new_marking.current_index + 1}' oninput='renameGroup(event, ${new_marking.current_index})'>
            <svg onclick='removeGroup(event, ${new_marking.current_index})' class='clickable'
                xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-circle-fill" viewBox="0 0 16 16">
                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/>
            </svg>
        </div>
        <div class='block-btn orange' onclick='addNewMember(event, ${new_marking.current_index})'>Add New Member</div>
    </div>
    `)
    new_marking.current_index ++;

}

function addNewMember(event, group_index) {
    const this_index = new_marking.groups[group_index].peers.length
    new_marking.groups[group_index].peers.push('')
    event.target.insertAdjacentHTML("beforebegin",
    `<div class='group-item peer-in-group'>
        <input class='enter-field' placeholder='Input peer name' oninput='renamePeer(event, ${group_index}, ${this_index})'>
        <svg onclick='removePeer(event, ${group_index}, ${this_index})' class='clickable'
            xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-circle-fill" viewBox="0 0 16 16">
            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/>
        </svg>
    </div>`)
}

function renameGroup(event, group_index) {
    new_marking.groups[group_index].name = event.target.value;
}

function renamePeer(event, group_index, peer_index) {
    new_marking.groups[group_index].peers[peer_index] = event.target.value;
}

function removeGroup(event, group_index) {
    new_marking.groups[group_index] = undefined;
    let remove_node = event.target.parentNode.parentNode
    if(event.target.tagName.toUpperCase() === 'PATH')
        remove_node = remove_node.parentNode

    remove_node.remove()
}

function removePeer(event, group_index, peer_index) {
    new_marking.groups[group_index].peers[peer_index] = undefined;
    let remove_node = event.target.parentNode
    if(event.target.tagName.toUpperCase() === 'PATH')
        remove_node = remove_node.parentNode

    remove_node.remove()
}

async function afterLoginSession(from_create_new = false) {
    document.getElementById("show-session-id").textContent = `Last Session ID: ${session_info.id}`
    const let_marking = document.getElementById("let-marking")
    let_marking.style.display = 'unset'
    let_marking.lastElementChild.onclick = ()=>markingPanel(session_info.id, 0)

    if(from_create_new && searchPage('management-panel'))
        await closePage('management-panel')
}

function confirmCreation() {
    const filtered_groups = new_marking.groups.map(e=>{
        if(e) {
            return {
                ...e,
                peers: e.peers.filter(entry=>entry)
            }
        } else return undefined
    }).filter(e=>e)

    request('POST', '/create-session', async res=>{
        closePage('new-marking-panel')
        await new Promise(s=>setTimeout(s, 600))
        session_info = {id: res.session_id, password: new_marking.password}
        await afterLoginSession(true)
        managementPanel()
    }, {password: new_marking.password, groups: filtered_groups})
}

async function managementPanel() {
    function knownInfo(info) {
        managementPanel.innerHTML = 
        `${closeButton('management-panel')}
        <span class="plaintext" style='margin-bottom: 30px;'>Session ID: ${session_info.id}</span>
        <span class='plaintext'>Change Group for Marking</span>
        <select class='select-group-peer' id='select-marking-group'></select>
        <span class='info'></span>
        <span class="plaintext">Refresh For Updates</span>
        <div id='refresh' class="block-btn">Refresh</div>
        <span class="info">Auto refresh every 1 minute</span>
        <span class="plaintext">Peers and Results</span>
        <div id='peers-and-results'></div>
        <span class="plaintext">Add Peers and Groups</span>
        <select class='select-group-peer' id='select-edit-group'>
            <option value='-1' selected>Create New Group</option>
        </select>
        <input id="edit-group-input" class="enter-field" 
            placeholder="Input group name" type="text">
        <select class='select-group-peer' id='select-edit-peer'>
            <option value='-1' selected>Add New Peer</option>
        </select>
        <input id="edit-peer-input" class="enter-field" 
            placeholder="Input peer name" type="text">
        <div class="block-btn blue" id='submit-group-peer'>Submit</div>
        <span class='alert'></span>
        <span class="plaintext">Latest Marks</span>
        <div id='mark-log'></div>
        <span class="plaintext">Save</span>
        <div class="block-btn" id='save-csv'>Save Marks As CSV</div>
        <div class="block-btn orange" id='save-setting'>Save This Session</div>`

        // results
        const peer_elems = {}, group_elems = {}
        const peers_and_results = document.getElementById("peers-and-results")

        function updateResults() {
            let last_elem = undefined
            info.groups.forEach(group => {
                const group_name = group.name
                if(!peer_elems[group_name])
                    peer_elems[group_name] = {}

                if(!group_elems[group_name]) {
                    group_elems[group_name] = document.createElement("span")
                    group_elems[group_name].className = 'group-name'
                    group_elems[group_name].textContent = `Group: ${group_name}`

                    if(!last_elem) peers_and_results.appendChild(group_elems[group_name])
                    else last_elem.insertAdjacentElement("afterend", group_elems[group_name])
                }
                last_elem = group_elems[group_name]

                group.peers.forEach(peer => {
                    let superpeer_total = 0, superpeers_num = 0
                    info.all_marks.filter(entry=>(entry[1] === 0 && entry[4] === peer && entry[5] === group.name))
                    .forEach(entry=>{
                        superpeer_total += entry[6]
                        superpeers_num ++
                    })
    
                    let peer_total = 0, peers_num = 0
                    info.all_marks.filter(entry=>(entry[1] === 1 && entry[4] === peer && entry[5] === group.name))
                    .forEach(entry=>{
                        peer_total += entry[6]
                        peers_num ++
                    })
    
                    const superpeer_avg = superpeers_num ? 
                        (superpeer_total / superpeers_num) * (peer_total ? .5 : 1) : 0
                    const peer_avg = peers_num ? 
                        (peer_total / peers_num) * (superpeer_total ? .5 : 1) : 0
    
                    const result = round2(superpeer_avg + peer_avg)
    
                    if(!peer_elems[group_name][peer]) {
                        peer_elems[group_name][peer] = document.createElement("div")
                        peer_elems[group_name][peer].className = 'peer'
                        last_elem.insertAdjacentElement("afterend", peer_elems[group_name][peer])
                    }
                    peer_elems[group_name][peer].textContent = `${peer}: ${result}%`
                    peer_elems[group_name][peer].style.background = `linear-gradient(to right, limegreen, white ${result}%)`
                    last_elem = peer_elems[group_name][peer]
                })
            })
        }

        // log
        const mark_log = document.getElementById("mark-log")
        let latest = 0

        function updateLog() {
            info.all_marks.filter(e=>e[8] > latest).forEach(e=>{
                mark_log.insertAdjacentHTML("afterbegin",
                `<span>${e[1] ? 'Peer' : 'Superpeer'} ${e[3]} (${e[2]}) marked ${e[4]} in group "${e[5]}" ${round2(e[6])}%${e[7] ? 
                ` and leave comment "${e[7]}."` : '.'}</span>`)
                latest = e[8]
            })
        }

        // change selected marking group
        const marking_group_selector = document.getElementById("select-marking-group")
        marking_group_selector.insertAdjacentHTML("beforeend",
            `<option value=''${
                info.current_group ? '' : ' selected'
                }>All Peers</option>`)
        info.groups.forEach(e=>{
            marking_group_selector.insertAdjacentHTML("beforeend",
            `<option value='${e.name}'${
                info.current_group === e.name ? 
                ' selected' : ''}>Group: ${e.name}</option>`)
        })
        marking_group_selector.onchange = event => {
            info.current_group = event.target.value
            request("POST", "/update-current-group", async res=>{
                if(info.current_group) {
                event.target.nextElementSibling.textContent = 
                    `Successfully set current group to ${info.current_group}.`
                } else {
                    event.target.nextElementSibling.textContent = 'Successfully set to all peers.'
                }
                await new Promise(s=>setTimeout(s, 3000))
                event.target.nextElementSibling.textContent = ''
            }, {session_id: session_info.id, current_group: info.current_group})
        }

        // edit groups and peers
        let peer_name = '', group_name = '', selected_group_index=-1, selected_peer_index=-1
        
        const edit_peer_input = document.getElementById('edit-peer-input')
        edit_peer_input.oninput = e => {peer_name = e.target.value}

        const edit_group_input = document.getElementById('edit-group-input')
        edit_group_input.oninput = e => {group_name = e.target.value}

        const group_selector = document.getElementById("select-edit-group")
        const peer_selector = document.getElementById("select-edit-peer")

        function changePeerOptions() {
            peer_name = ''
            edit_peer_input.value = peer_name
            selected_peer_index = -1

            peer_selector.innerHTML = 
            `<option value='-1' selected>Add New Peer</option>
            ${selected_group_index >= 0 ? info.groups[selected_group_index].peers.map((e, i) => {
                return `<option value='${i}'>${e}</option>`
            }).join('') : ''}
            `
        }

        group_selector.onchange = event => {
            const group_index = parseInt(event.target.value)
            selected_group_index = group_index
            changePeerOptions()

            group_name = group_index >= 0 ? info.groups[group_index].name : ''
            edit_group_input.value = group_name
        }

        peer_selector.onchange = event => {
            const peer_index = parseInt(event.target.value)
            selected_peer_index = peer_index

            peer_name = peer_index >= 0 ? info.groups[selected_group_index].peers[peer_index] : ''
            edit_peer_input.value = peer_name
        }

        document.getElementById('submit-group-peer').onclick = event => {
            if(!group_name) {
                event.target.nextElementSibling.textContent = 'Please input a valid group name!'
            } else if(!peer_name) {
                event.target.nextElementSibling.textContent = 'Please input a valid peer name!'
            } else {
                event.target.nextElementSibling.textContent = ''
                let update_group_name = false
                let update_peer_name = false
                // add new group & peer
                if(selected_group_index === -1) {
                    group_selector.insertAdjacentHTML("beforeend", 
                    `<option value='${info.groups.length}'>${group_name}</option>`)
                    marking_group_selector.insertAdjacentHTML("beforeend", 
                    `<option value='${group_name}'>Group: ${group_name}</option>`)

                    info.groups.push({
                        name: group_name,
                        peers: [peer_name]
                    })
                // add new peer to group
                } else if(selected_peer_index === -1) {
                    info.groups[selected_group_index].peers.push(peer_name)
                }
                else {
                    const old_group_name = info.groups[selected_group_index].name
                    const old_peer_name = info.groups[selected_group_index].peers[selected_peer_index]
                    // rename group
                    if(old_group_name !== group_name) {
                        update_group_name = [old_group_name, group_name]
                        info.groups[selected_group_index].name = group_name

                        group_selector.children[selected_group_index + 1].textContent = group_name
                        group_elems[group_name] = group_elems[old_group_name]
                        group_elems[group_name].textContent = `Group: ${group_name}`
                        group_elems[old_group_name] = undefined

                        peer_elems[group_name] = {...peer_elems[old_group_name]}
                        peer_elems[old_group_name] = undefined
                    }
                    // rename peer
                    if(old_peer_name !== peer_name) {
                        update_peer_name = [old_peer_name, peer_name]
                        info.groups[selected_group_index].peers[selected_peer_index] = peer_name

                        peer_elems[group_name][peer_name] = peer_elems[group_name][old_peer_name]
                        peer_elems[group_name][old_peer_name] = undefined
                    }
                }
                request('POST', '/update-session', res=>{
                    group_name = ''
                    edit_group_input.value = group_name
                    selected_group_index = -1
                    group_selector.firstElementChild.selected = true
                    changePeerOptions()
                    update()
                }, {session_id: session_info.id, groups: info.groups, update_group_name, update_peer_name})
            }
        }

        info.groups.forEach((e, i) => {
            group_selector.insertAdjacentHTML("beforeend", 
            `<option value='${i}'>${e.name}</option>`)
        })

        // updates
        function update() {
            request('POST', '/session-info', res=>{
                info = res
                updateResults()
                updateLog()
            }, {session_id: session_info.id, password: session_info.password})
        }

        updateResults()
        updateLog()

        document.getElementById("refresh").onclick = update
        document.getElementById("save-csv").onclick = () => {
            const download = document.createElement("a")
            download.href = `/save/csv?session_id=${
                encodeURIComponent(session_info.id)}&password=${
                encodeURIComponent(session_info.password)}`
            download.download = `${session_info.id}.csv`
            download.click()
            download.remove()
        }
        document.getElementById("save-setting").onclick = () => {
            const download = document.createElement("a")
            download.href = `/save/setting?session_id=${
                encodeURIComponent(session_info.id)}&password=${
                encodeURIComponent(session_info.password)}`
            download.download = `${session_info.id}_settings.txt`
            download.click()
            download.remove()
        }
        const updateInterval = setInterval(() => {
            if(!managementPanel.parentNode) {
                clearInterval(updateInterval)
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
        let session_id='', password=''
        
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
            } else {
                if(!session_info) {
                    session_info = {
                        id: session_id,
                        password: password
                    }
                    afterLoginSession()
                }
                knownInfo(res)
            }
        }, {session_id: session_id, password: password})
    }

    const page_id = createPage('management-panel')
    if(!page_id) return

    document.body.insertAdjacentHTML("beforeend", 
        `<div class="basic-panel init-page-${page_id}" id="management-panel">
        </div>`)

    const managementPanel = document.getElementById("management-panel")

    session_info ? login(session_info.id, session_info.password) : unknown()

    await new Promise(s=>setTimeout(s, 1))
    managementPanel.classList.add(`page-${page_id}`)
}