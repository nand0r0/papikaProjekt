"use strict";
const TitleWrapper = document.getElementById("titles");
const DataWrapper = document.getElementById("dataWrapper");
const DialogueFilterWrapper = document.getElementById("listWrapper");
const SectionsWrapper = document.getElementById("sections");
const SearchBox = document.getElementById("searchBox");
const SearchButton = document.getElementById("searchButton");
const PageCounter = document.getElementById("pageCounter");
const sectionCheckBox = document.getElementById("sectionCheckBox");
const MaxRowPerPage = 150;
let MaxPages = 0;
let PageData = [];
let CurrentPage = 0;
let Keys = [];
fetch("http://localhost:8080/base/")
    .then((resp) => resp.json())
    .then((json) => main(json));
function main(json) {
    const Filters = json[0];
    const Sections = json[1];
    for (let i = 0; i < Filters.length; i++) {
        const el = document.createElement("tr");
        el.className = "inputForCat";
        el.innerHTML = `
		<td class="text">${Filters[i]}</td>
		<td><input class="filterClass" type="text" name="${Filters[i]}"></input></td>
		`;
        DialogueFilterWrapper?.appendChild(el);
    }
    for (let i = 0; i < Sections.length; i++) {
        const el = document.createElement("option");
        el.value = Sections[i];
        el.innerHTML = Sections[i];
        SectionsWrapper?.appendChild(el);
    }
    for (let i = 0; i < Sections.length; i++) {
        const el = document.createElement("div");
        el.innerHTML = `
			<input type="checkbox" name="${Sections[i]}" id="${Sections[i]}">
			<label for="${Sections[i]}">${Sections[i]}</label><br>
		`;
        sectionCheckBox?.appendChild(el);
    }
    function getAllSearchParams() {
        return [SearchBox.value, SectionsWrapper.value, makeFiltersMap(DialogueFilterWrapper)];
    }
    SearchBox?.addEventListener("keydown", (keypress) => {
        if (keypress.key == "Enter") {
            search(...getAllSearchParams());
        }
    });
    SearchButton.onclick = function () {
        search(...getAllSearchParams());
    };
}
function isSmall(name) {
    const smallRows = ["betű", "látva"];
    if (smallRows.includes(name)) {
        return "small";
    }
    return "";
}
function makeRowElement(rowidx, rowdata, keys) {
    const row = document.createElement("tr");
    row.id = rowidx;
    const mapRowidx = new Map(Object.entries(rowdata));
    const defineRowIdx = document.createElement("td");
    defineRowIdx.className = "small rowIdx";
    defineRowIdx.innerHTML = `<input type="text" value="${rowidx}" name="${rowidx}" disabled>`;
    row.appendChild(defineRowIdx);
    for (let i = 0; i < keys.length; i++) {
        const td = document.createElement("td");
        const v = mapRowidx.get(keys[i]) == undefined ? "" : mapRowidx.get(keys[i]);
        td.className = isSmall(keys[i]);
        td.innerHTML = `<input type="text" value="${v}" name="${keys[i]}">`;
        row.appendChild(td);
    }
    return row;
}
async function search(searchString, searchSection, filters) {
    try {
        const resp = await fetch("http://localhost:8080/search/", {
            method: "POST",
            body: JSON.stringify({
                search: searchString,
                section: searchSection,
                filters: JSON.stringify(Object.fromEntries(filters)),
            }),
            headers: {
                "Content-type": "application/json; charset=UTF-8",
            },
        });
        const responseText = await resp.text();
        const json = JSON.parse(responseText);
        const rowData = new Map(Object.entries(json["Data"]));
        Keys = json["Keyset"];
        drawTitleRow();
        CurrentPage = 0;
        PageData = makePages(rowData);
        switchPage(0);
        return rowData;
    }
    catch (err) {
        console.log(err);
        return new Map();
    }
}
function makeFiltersMap(Filters) {
    let idx = new Map();
    const filterElements = Filters.children;
    for (let i = 0; i < filterElements.length; i++) {
        const key = filterElements[i].querySelector(".text")?.innerHTML;
        const valueEl = filterElements[i].querySelector(".filterClass");
        const value = valueEl.value;
        idx.set(key, value);
    }
    return idx;
}
function drawTitleRow() {
    TitleWrapper.innerHTML = `
	<!-- <th scope="col">munkafüzet</th> -->
	<th scope="col">oszlop, sor</th>
	`;
    Keys.forEach((key) => {
        const el = document.createElement("th");
        el.innerHTML = key;
        el.setAttribute("scope", "col");
        TitleWrapper?.appendChild(el);
    });
}
function drawDataInTable(data, keys) {
    DataWrapper.innerHTML = ``;
    for (let row = 0; row < data.length; row++) {
        if (data[row] == undefined)
            continue;
        const rowIdx = data[row].keys().next().value;
        const el = makeRowElement(rowIdx, data[row].get(rowIdx), keys);
        DataWrapper.appendChild(el);
    }
}
function getSortedElementsList(elements) {
    let returnArray = [];
    let idxArray = [];
    let columns = [];
    for (const [key, _] of elements.entries()) {
        const idx = key.split(", ");
        columns.push(parseInt(idx[0]));
    }
    for (let i = 0; i < max(columns); i++) {
        idxArray.push([]);
    }
    for (const [key, value] of elements.entries()) {
        const idx = key.split(", ");
        idxArray[parseInt(idx[0]) - 1].push(parseInt(idx[1]));
    }
    for (let i = 0; i < idxArray.length; i++) {
        idxArray[i].sort((a, b) => a - b);
    }
    for (let i = 0; i < idxArray.length; i++) {
        if (idxArray[i].length == 0) {
            continue;
        }
        for (let l = 0; l < idxArray[i].length; l++) {
            returnArray.push(`${i + 1}, ${idxArray[i][l]}`);
        }
    }
    return returnArray;
}
function switchPage(page) {
    drawDataInTable(PageData[page], Keys);
    prevPage(true);
    nextPage(true);
    PageCounter.innerHTML = `${page + 1}/${MaxPages}`;
}
function makePages(data) {
    let returnData = [];
    const sortedElementList = getSortedElementsList(data);
    MaxPages = Math.ceil(sortedElementList.length / MaxRowPerPage);
    for (let i = 0; i < MaxPages; i++) {
        returnData.push([]);
        for (let l = 0; l < MaxRowPerPage; l++) {
            const elIdx = sortedElementList[i * MaxRowPerPage + l];
            if (elIdx == undefined) {
                continue;
            }
            let idxMap = new Map();
            idxMap.set(elIdx, data.get(elIdx));
            returnData[i].push(idxMap);
        }
    }
    return returnData;
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
