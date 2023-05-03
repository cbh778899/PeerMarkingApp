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