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
function switchPage(page) {
    drawDataInTable(PageData[page], Keys);
    prevPage(true);
    nextPage(true);
    PageCounter.innerHTML = `${page + 1}/${MaxPages}`;
}
class Row {
    rowData;
    constructor(DATA) {
        this.rowData = DATA;
    }
}
