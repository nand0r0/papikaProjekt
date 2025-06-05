"use strict";
function openModal() {
    const modal = document.getElementById("modal");
    modal.showModal();
}
function closeModal() {
    const modal = document.getElementById("modal");
    modal.close();
}
function prevPage(reset) {
    const el = document.getElementById("prevPage");
    if (reset) {
        if (_CurrentPage == 0) {
            el.setAttribute("disabled", "");
        }
        else {
            el.removeAttribute("disabled");
        }
        return;
    }
    if (_CurrentPage != 0) {
        _CurrentPage--;
        switchPage(_CurrentPage);
    }
}
function nextPage(reset) {
    const el = document.getElementById("nextPage");
    if (reset) {
        if (_CurrentPage == MaxPages - 1) {
            el.setAttribute("disabled", "");
        }
        else {
            el.removeAttribute("disabled");
        }
    }
    else {
        if (_CurrentPage != MaxPages - 1) {
            _CurrentPage++;
            switchPage(_CurrentPage);
        }
    }
}
class Row {
    section;
    position;
    data;
    constructor(DATA, ROWPOSITION, SECTION) {
        this.data = new Map(Object.entries(DATA));
        this.position = ROWPOSITION;
        this.section = SECTION;
    }
    getHTMLRowElement(keyset) {
        const tr = document.createElement("tr");
        tr.id = this.position;
        const defineRowSection = document.createElement("td");
        const defineRowIdx = document.createElement("td");
        defineRowSection.className = "small rowIdx";
        defineRowIdx.className = "small rowIdx";
        defineRowSection.innerHTML = `<input type="text" value="${this.section}" name="${this.section}" disabled>`;
        defineRowIdx.innerHTML = `<input type="text" value="${this.position}" name="${this.position}" disabled>`;
        tr.appendChild(defineRowSection);
        tr.appendChild(defineRowIdx);
        for (let i = 0; i < keyset.length; i++) {
            const td = document.createElement("td");
            const currentKey = keyset[i];
            if (this.data.get(currentKey) == undefined) {
                td.innerHTML = `<input type="text" disabled name="${currentKey}">`;
            }
            else {
                const v = this.data.get(currentKey) == undefined ? "" : this.data.get(currentKey);
                td.innerHTML = `<input type="text" value="${v}" name="${currentKey}">`;
            }
            td.className = isSmall(currentKey);
            tr.appendChild(td);
        }
        return tr;
    }
}
