"use strict";
const TitleWrapper = document.getElementById("titles");
const DataWrapper = document.getElementById("dataWrapper");
const DialogueFilterWrapper = document.getElementById("listWrapper");
const SectionsWrapper = document.getElementById("sections");
const SearchBox = document.getElementById("searchBox");
const SearchButton = document.getElementById("searchButton");
const PageCounter = document.getElementById("pageCounter");
const SectionCheckBox = document.getElementById("sectionCheckBox");
const MaxRowPerPage = 150;
let MaxPages = 0;
let CurrentPage = 0;
let Keys = [];
let LoadedRows = [];
let SavedRows = [];
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
        SectionCheckBox?.appendChild(el);
    }
    function getAllSearchParams() {
        let checkedSections = new Map();
        for (let i of SectionCheckBox.children) {
            let checkbox = i.children[0];
            checkedSections.set(checkbox.id, checkbox.checked);
        }
        return [SearchBox.value, checkedSections, makeFiltersMap(DialogueFilterWrapper)];
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
async function search(searchString, tickedSections, filters) {
    try {
        const resp = await fetch("http://localhost:8080/search/", {
            method: "POST",
            body: JSON.stringify({
                search: searchString,
                checkedSectons: JSON.stringify(tickedSections.entries),
                filters: JSON.stringify(Object.fromEntries(filters)),
            }),
            headers: {
                "Content-type": "application/json; charset=UTF-8",
            },
        });
        const responseText = await resp.text();
        const json = JSON.parse(responseText);
        const ImportedData = new Map(Object.entries(json["Data"]));
        Keys = json["Keyset"];
        let el = SectionCheckBox.children[0].children[0];
        console.log(el.checked);
        drawTitleRow();
        CurrentPage = 0;
        switchPage(0);
        return ImportedData;
    }
    catch (err) {
        console.log(err);
        return new Map();
    }
}
function loadRowsAsObjects(ROWDATA, WORKSHEET) {
    ROWDATA.forEach((rowData, rowPosition) => {
        LoadedRows[WORKSHEET].push(new Row(rowData, rowPosition));
    });
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
    for (let i = 0; i < Math.max(...columns); i++) {
        idxArray.push([]);
    }
    for (const [key, _] of elements.entries()) {
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
function switchPage(page) {
    prevPage(true);
    nextPage(true);
    PageCounter.innerHTML = `${page + 1}/${MaxPages}`;
}
