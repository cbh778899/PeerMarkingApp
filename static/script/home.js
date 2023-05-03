let passcode = ""

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
            <span class='save-to-localstorage'>
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
    `<div class='basic-panel init-page-${page_id}' id='do-marking-panel'>
    </div>`)

    const makring_panel = document.getElementById("do-marking-panel")
    let peer_info = localStorage.getItem("peer-info")
    if(peer_info) {
        peer_info = JSON.parse(peer_info)
        getPeerMarkingDetails(peer_info)
    } else login()

    await new Promise(s=>setTimeout(s, 1))
    makring_panel.classList.add(`page-${page_id}`)
}