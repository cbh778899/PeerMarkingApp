let passcode = ""

function passcodeInput(event) {
    const value = event.target.value;
    const submitBtn = document.getElementById("submit-code")

    if(/^\d{4}$/g.test(value)) {
        submitBtn.style.display = 'block'
    } else {
        submitBtn.style.display = 'none'
    }
    passcode = value
}

function checkPasscodeLogin(event) {
    const session_id = passcode.substring(0, 4)
    request('POST', '/check-session', res=>{
        if(res.exist_session) {
            event.target.nextElementSibling.textContent = ''
            markingPanel(session_id, 1)
        } else {
            event.target.nextElementSibling.textContent = 
            "This session ID doesn't exists!"
        }
    }, {session_id: session_id})
}