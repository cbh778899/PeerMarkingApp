const pages = {
    page_1: undefined,
    page_2: undefined
}
let peer_info = undefined

async function closePage(page_id) {
    const page_n = searchPage(page_id)
    if(page_n === 1) {
        pages.page_1 = undefined;
        if(pages.page_2) {
            const page_2 = document.getElementById(pages.page_2)
            page_2.classList.remove('page-2')
            page_2.classList.remove('init-page-2')
            page_2.classList.add('page-1')
            page_2.classList.add('init-page-1')
            pages.page_1 = pages.page_2
            pages.page_2 = undefined
        }
    }
    else if(page_n === 2) pages.page_2 = undefined;

    const closing_page = document.getElementById(page_id)
    closing_page.classList.remove(`page-${page_n}`)
    await new Promise(s=>setTimeout(s, 500))
    closing_page.remove()
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

async function markingPanel(session_id, peer_type) {

    function getPeerMarkingDetails() {
        request('POST', '/peer-mark-info', res=>{
            const marks = {}
            res.groups.forEach(group=>{
                marks[group.name] = {}
                group.peers.forEach(peer=>{
                    marks[group.name][peer] = {mark: '', comment: ''}
                    let current_mark = res.marks.filter(e=>(e[4] === peer && e[5] === group.name))
                    if(current_mark.length) {
                        current_mark = current_mark[0]
                        marks[group.name][peer] = {
                            mark: current_mark[6],
                            comment: current_mark[7]
                        }
                    }
                })
            })
            marking({groups: res.groups, marks: marks})
        }, {session_id: session_id, peer_name: peer_info.peer_name, 
            peer_id: peer_info.peer_id, peer_type: peer_type})
    }

    function marking(info) {
        marking_panel.innerHTML = 
        `${closeButton('do-marking-panel')}
        <span id='refresh-peer-list' class='info clickable'>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-repeat" viewBox="0 0 16 16">
                <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
                <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
            </svg>
            <span>Click here to refresh</span>
        </span>
        <div id='peer-mark-main'></div>
        `
        document.getElementById("refresh-peer-list").onclick = getPeerMarkingDetails
        const peer_mark_main = document.getElementById("peer-mark-main")

        function inputMarkValid(value) {
            if(/^[0-9]{0,3}(?:\.(?:[0-9]{1,2})?)?$/.test(value)) {
                if(value) {
                    const float_value = parseFloat(value)
                    if(float_value >= 0 && float_value <= 100)
                        return true
                } else return true
            }
            return false
        }

        info.groups.forEach(group=>{
            peer_mark_main.insertAdjacentHTML("beforeend", 
            `<span class='plaintext'>Group: ${group.name}</span>
            <span class='title'>Mark as group</span>`)
            const mark_as_group = document.createElement("input")
            mark_as_group.placeholder = 'Mark of group'
            mark_as_group.className ='enter-field input-mark'
            let group_mark = ''
            mark_as_group.oninput = e => {
                const value = e.target.value
                if(!inputMarkValid(value)) {
                    e.target.value = group_mark
                } else group_mark = value
            }
            peer_mark_main.insertAdjacentElement("beforeend", mark_as_group)
            peer_mark_main.insertAdjacentHTML("beforeend", "<span class='title'>OR Mark individually</span>")
            const individuals = group.peers.map(()=>{return {}})

            group.peers.forEach((peer, i)=>{
                peer_mark_main.insertAdjacentHTML("beforeend", 
                    `<span class='title'>Mark and/or comment ${peer}</span>`)
                
                individuals[i].peer_mark = info.marks[group.name][peer].mark
                const mark_peer = document.createElement("input")
                mark_peer.placeholder = 'Input mark'
                mark_peer.className ='enter-field input-mark'
                mark_peer.value = individuals[i].peer_mark
                mark_peer.oninput = e => {
                    const value = e.target.value
                    if(!inputMarkValid(value)) {
                        e.target.value = individuals[i].peer_mark
                    } else individuals[i].peer_mark = value
                }

                const comment_peer = document.createElement("textarea")
                comment_peer.placeholder = 'Input comment if you have any'
                comment_peer.className = 'enter-field input-comment'
                individuals[i].comment = info.marks[group.name][peer].comment
                comment_peer.textContent = individuals[i].comment
                comment_peer.oninput = e => {individuals[i].comment = e.target.value}

                individuals[i].mark_elem = mark_peer
                individuals[i].comment_elem = comment_peer

                peer_mark_main.insertAdjacentElement("beforeend", mark_peer)
                peer_mark_main.insertAdjacentElement("beforeend", comment_peer)
            })
            const submit_marking_group = document.createElement("div")
            submit_marking_group.className = 'block-btn'
            submit_marking_group.textContent = 'Submit Marking'

            const marking_alert_info = document.createElement("span")
            
            submit_marking_group.onclick = () => {
                const updates = []
                const number_group_mark = group_mark ? parseFloat(group_mark) : 0
                let got_error = false
                group.peers.forEach((e, i)=>{
                    if(got_error) return

                    // mark is not empty
                    if(individuals[i].peer_mark) {
                        const number_mark = parseFloat(individuals[i].peer_mark)
                        // mark changed
                        if(number_mark !== info.marks[group.name][e].mark) {
                            info.marks[group.name][e].mark = number_mark
                            updates.push({...info.marks[group.name][e], peer: e})
                        }
                        // mark not changed but got group mark
                        else if(group_mark) {
                            info.marks[group.name][e].mark = number_group_mark
                            individuals[i].mark_elem.value = group_mark
                            individuals[i].peer_mark = group_mark
                            updates.push({...info.marks[group.name][e], peer: e})
                        }
                        // mark not changed, no group mark, but got comment changed
                        else if(individuals[i].comment !== info.marks[group.name][e].comment) {
                            info.marks[group.name][e].comment = individuals[i].comment
                            updates.push({...info.marks[group.name][e], peer: e})
                        }
                        // else, mark not changed, no group mark, dismiss change
                    }
                    // mark is empty but got group mark
                    else if(group_mark) {
                        info.marks[group.name][e].mark = number_group_mark
                        individuals[i].mark_elem.value = group_mark
                        individuals[i].peer_mark = group_mark
                        updates.push({...info.marks[group.name][e], peer: e})
                    }
                    // mark is empty, no group mark, error
                    else {
                        got_error = true
                        marking_alert_info.textContent = 'Please check if every mark is valid.'
                        marking_alert_info.className = 'alert'
                    }
                })
                if(!got_error) {
                    request("POST", 'update-marking', async res=>{
                        mark_as_group.value = ''
                        group_mark = ''

                        marking_alert_info.textContent = 'Successfully marked this group.'
                        marking_alert_info.className = 'info'
                        await new Promise(s=>setTimeout(s, 3000))
                        marking_alert_info.textContent = ''
                    }, {
                        ...peer_info,
                        peer_type, session_id,
                        target_group: group.name,
                        updates
                    })
                }
            }
            peer_mark_main.insertAdjacentElement("beforeend", submit_marking_group)
            peer_mark_main.insertAdjacentElement("beforeend", marking_alert_info)
        })
    }

    function login() {
        marking_panel.innerHTML = 
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
                peer_info = {
                    peer_name: peer_name,
                    peer_id: peer_id
                }
                if(save_info)
                    localStorage.setItem('peer-info', JSON.stringify(peer_info))

                getPeerMarkingDetails()
            }
        }
    }
    
    const page_id = createPage('do-marking-panel')
    if(!page_id) return

    document.body.insertAdjacentHTML("beforeend",
    `<div class='basic-panel init-page-${page_id}' id='do-marking-panel'>
    </div>`)

    const marking_panel = document.getElementById("do-marking-panel")
    const stored_peer_info = localStorage.getItem("peer-info")
    if(stored_peer_info) {
        peer_info = JSON.parse(stored_peer_info)
        getPeerMarkingDetails()
    } else login()

    await new Promise(s=>setTimeout(s, 1))
    marking_panel.classList.add(`page-${page_id}`)
}