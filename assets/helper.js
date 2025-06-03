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
        if (CurrentPage == 0) {
            el.setAttribute("disabled", "");
        }
        else {
            el.removeAttribute("disabled");
        }
        return;
    }
    if (CurrentPage != 0) {
        CurrentPage--;
        switchPage(CurrentPage);
    }
}
function nextPage(reset) {
    const el = document.getElementById("nextPage");
    if (reset) {
        if (CurrentPage == MaxPages - 1) {
            el.setAttribute("disabled", "");
        }
        else {
            el.removeAttribute("disabled");
        }
    }
    else {
        if (CurrentPage != MaxPages - 1) {
            CurrentPage++;
            switchPage(CurrentPage);
        }
    }
}
class Row {
    worksheet;
    rowPosition;
    rowData;
    constructor(DATA, ROWPOSITION, WORKSHEET) {
        this.rowData = new Map(Object.entries(DATA));
        this.rowPosition = ROWPOSITION;
        this.worksheet = WORKSHEET ? WORKSHEET : -1;
    }
    getHTMLRowElement(keyset) {
        const tr = document.createElement("tr");
        tr.id = this.rowPosition;
        const defineRowIdx = document.createElement("td");
        defineRowIdx.className = "small rowIdx";
        defineRowIdx.innerHTML = `<input type="text" value="${this.rowPosition}" name="${this.rowPosition}" disabled>`;
        tr.appendChild(defineRowIdx);
        for (let i = 0; i < keyset.length; i++) {
            const td = document.createElement("td");
            const currentKey = keyset[i];
            const v = this.rowData.get(currentKey) == undefined ? "" : this.rowData.get(currentKey);
            td.className = isSmall(currentKey);
            td.innerHTML = `<input type="text" value="${v}" name="${currentKey}">`;
            tr.appendChild(td);
        }
        return tr;
    }
}
